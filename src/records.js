/** 결과 화면의 집계와 시간순 설명. 예전 샘플도 읽을 수 있다. */
import { ACTIONS, formatTime, REST_BALANCE, STAY_OPTIONS } from './state.js';

export function buildResultData({ records = [] }) {
  const rested = records.filter(record => !record.skipped).map((record, index) => ({
    ...record, restId: record.restId || `legacy-rest-${record.turn || index + 1}`,
    visitId: record.visitId || `visit-${record.turn}`,
  }));
  const average = entries => entries.length ? entries.reduce((sum, record) => sum + record.satisfaction, 0) / entries.length : null;
  const highlights = [
    ['painRecovered', '몸을 가장 쉬게 한'], ['driveDelta', '마음을 가장 바꾼'],
    ['sufficientShort', '짧게 쉬어도 충분했던 쉼'], ['spend', '가장 돈을 많이 쓴'],
  ].flatMap(([key, label]) => {
    const candidates = key === 'spend' ? rested.filter(record => record.spend > 0)
      : key === 'sufficientShort' ? rested.filter(record => record.restMinutes === STAY_OPTIONS[0].minutes && record.painAfter <= REST_BALANCE.sufficientPain) : rested;
    const metric = key === 'sufficientShort' ? 'painRecovered' : key;
    const best = candidates.reduce((winner, record) => !winner || record[metric] > winner[metric] ? record : winner, null);
    return best ? [{ label, restId: best.restId, record: best }] : [];
  });
  return { rested, highlights,
    avgWith: average(rested.filter(record => record.spend > 0)),
    avgWithout: average(rested.filter(record => record.spend === 0)),
  };
}

export function describeRest(record, { visits = [], eventRecords = [], mealRecords = [], records = [] }) {
  const visit = visits.find(entry => entry.visitId === record.visitId);
  const sameVisit = entry => entry.visitId ? entry.visitId === record.visitId : entry.turn === record.turn;
  const journey = visit?.card.journey || record.card.journey;
  const arrival = visit?.arrivalTime ?? record.arrivalTime;
  const walk = visit?.walkMinutes ?? record.walkMinutes;
  const start = record.startTime ?? arrival;
  const end = record.endTime ?? (start === undefined ? undefined : start + record.restMinutes);
  const parts = [`${record.card.name} · ${walk || 0}분 걸음`, journey ? `${journey.route} ${journey.sight}` : ''];
  const moments = eventRecords.filter(sameVisit).map(event => ({
    time: event.time, text: `${formatTime(event.time)} ${event.description}${event.type === 'purchase' ? ` · −¥${event.spend.toLocaleString()}` : ''}`,
  }));
  if (arrival !== undefined) moments.push({ time: arrival, text: `${formatTime(arrival)} 도착` });
  for (const meal of mealRecords.filter(sameVisit)) {
    if (start !== undefined && meal.endTime > start) continue;
    moments.push({ time: meal.startTime, text: `${formatTime(meal.startTime)} → ${formatTime(meal.endTime)} 식사 · −¥${meal.spend.toLocaleString()}` });
  }
  // 같은 방문에서 앞서 머문 시간도 표시하되, 나중의 쉼은 끌어오지 않는다.
  for (const earlier of records.filter(sameVisit)) {
    if (earlier.restId === record.restId || earlier.endTime === undefined || earlier.endTime > start) continue;
    moments.push({ time: earlier.startTime, text: `${formatTime(earlier.startTime)} → ${formatTime(earlier.endTime)} 앞선 쉼 · ${ACTIONS[earlier.action].name}` });
  }
  moments.push({ time: start ?? Infinity, text: `${start === undefined ? '' : `${formatTime(start)} → ${formatTime(end)} `}이번 쉼 · ${ACTIONS[record.action].name} · ${record.restMinutes || 0}분 · 지출 ¥${record.spend.toLocaleString()} · 통증 −${record.painRecovered} · 마음의 여유 ${record.driveDelta >= 0 ? '+' : ''}${record.driveDelta}` });
  if (record.overstayMinutes > 0) moments.push({ time: end ?? Infinity,
    text: `충분히 쉰 뒤의 추가 체류 ${record.overstayMinutes.toFixed(0)}분 · 마음 부담 −${record.overstayDriveCost.toFixed(1)} (위 변화량에 포함)` });
  if (record.reasons?.mentalFactor !== undefined) moments.push({ time: end ?? Infinity,
    text: `이번 쉼의 마음 환기 ${record.satisfaction}/10 · 추가 마음 회복 효과 ${Math.round(record.reasons.mentalFactor * 100)}%${record.reasons.mentalFactor < 1 ? ' (연속 휴식으로 감소)' : ''}` });
  parts.push(...moments.sort((a, b) => a.time - b.time).map(entry => entry.text));
  return parts.filter(Boolean).join('\n');
}
