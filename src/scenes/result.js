/**
 * 결과 화면 — §10 정적 SVG
 */

import { ACTIONS, MAX_TURNS, DAY_START, formatTime } from '../state.js';

// ── SVG 레이아웃 상수 ──

const SVG_W = 360;
const SVG_H = 420;
const BAR_W = 30;
const BAR_GAP = 14;
const CHART_LEFT = 40;
const CHART_TOP = 60;
const CHART_H = 200;
const LABEL_Y = CHART_TOP + CHART_H + 16;
const PLACE_Y = LABEL_Y + 16;
const SPEND_DOT_R = 4;
const VIEW_MARK = { narrow: '◐', mid: '◑', wide: '●' };

// ── 유틸 ──

function actionName(id) {
  if (!id) return '';
  return ACTIONS[id] ? ACTIONS[id].name : id;
}

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function barX(i) {
  return CHART_LEFT + i * (BAR_W + BAR_GAP);
}

function barColor(spend) {
  if (spend <= 0) return '#aaa';
  const opacity = 0.35 + 0.65 * Math.min(spend / 1800, 1);
  return `rgba(76, 175, 80, ${opacity.toFixed(2)})`;
}

// ── 메인 ──

export function showResult(app, ctx, goto) {
  const { records, mealRecords = [], eventRecords = [], timeline = [] } = ctx;

  // 만족감 최대값 (스케일링용)
  const maxSat = Math.max(10, ...records.map(r => r.satisfaction));
  const maxSpend = Math.max(1, ...records.map(r => r.spend));

  // ── 평균 계산 ──
  const withMoney = records.filter(r => !r.skipped && r.spend > 0);
  const withoutMoney = records.filter(r => !r.skipped && r.spend === 0);

  const avgWith = withMoney.length > 0
    ? withMoney.reduce((s, r) => s + r.satisfaction, 0) / withMoney.length
    : null;
  const avgWithout = withoutMoney.length > 0
    ? withoutMoney.reduce((s, r) => s + r.satisfaction, 0) / withoutMoney.length
    : null;

  // ── 세 휴식 강조 ──
  const rested = records.filter(r => !r.skipped);

  let bestPainRec = null;   // 통증 회복 최대
  let bestDriveRec = null;  // Δ의지 최대
  let bestSpendRec = null;  // 지출 최대

  for (const r of rested) {
    if (!bestPainRec || r.painRecovered > bestPainRec.painRecovered
        || (r.painRecovered === bestPainRec.painRecovered && r.turn > bestPainRec.turn)) {
      bestPainRec = r;
    }
    if (!bestDriveRec || r.driveDelta > bestDriveRec.driveDelta
        || (r.driveDelta === bestDriveRec.driveDelta && r.turn > bestDriveRec.turn)) {
      bestDriveRec = r;
    }
    if (r.spend > 0) {
      if (!bestSpendRec || r.spend > bestSpendRec.spend
          || (r.spend === bestSpendRec.spend && r.turn > bestSpendRec.turn)) {
        bestSpendRec = r;
      }
    }
  }

  // ── SVG 조립 ──
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" class="result-svg">`;

  // 만족감 막대
  for (let i = 0; i < MAX_TURNS; i++) {
    const r = records.find(rec => rec.turn === i + 1);
    const x = barX(i);

    if (!r) {
      // 조기 엔딩으로 빈 턴
      continue;
    }

    if (r.skipped) {
      svg += `<text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H - 4}" text-anchor="middle" class="svg-skip">지나침</text>`;
    } else {
      const h = (r.satisfaction / maxSat) * CHART_H;
      const y = CHART_TOP + CHART_H - h;
      svg += `<rect class="result-bar" data-turn="${r.turn}" x="${x}" y="${y}" width="${BAR_W}" height="${h}" rx="3" fill="${barColor(r.spend)}" />`;
      svg += `<text x="${x + BAR_W / 2}" y="${y - 4}" text-anchor="middle" class="svg-sat-label">${r.satisfaction}</text>`;
    }

    // 행동 이름
    svg += `<text x="${x + BAR_W / 2}" y="${LABEL_Y}" text-anchor="middle" class="svg-action">${r.skipped ? '' : actionName(r.action)}</text>`;
    // 장소 이름
    svg += `<text x="${x + BAR_W / 2}" y="${PLACE_Y}" text-anchor="middle" class="svg-place">${r.card.name}</text>`;
    if (!r.skipped) {
      svg += `<text x="${x + BAR_W / 2}" y="${PLACE_Y + 14}" text-anchor="middle" class="svg-marker">${VIEW_MARK[r.card.view]} 시야 · ▲${ACTIONS[r.action].initiative}</text>`;
    }
    const meal = mealRecords.find(entry => entry.turn === r.turn);
    if (meal) svg += `<text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H + 44}" text-anchor="middle" class="svg-meal">● 식사</text>`;
  }

  // 금액 점+선
  const spendPoints = [];
  for (let i = 0; i < MAX_TURNS; i++) {
    const r = records.find(rec => rec.turn === i + 1);
    if (!r || r.skipped || r.spend === 0) continue;
    const x = barX(i) + BAR_W / 2;
    const spendH = (r.spend / maxSpend) * (CHART_H * 0.8);
    const y = CHART_TOP + CHART_H - spendH;
    spendPoints.push({ x, y, spend: r.spend });
  }

  if (spendPoints.length > 1) {
    const linePath = spendPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    svg += `<path d="${linePath}" fill="none" stroke="#ff9800" stroke-width="2" stroke-dasharray="4,3" />`;
  }

  for (const p of spendPoints) {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${SPEND_DOT_R}" fill="#ff9800" />`;
    svg += `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" class="svg-spend">¥${p.spend.toLocaleString()}</text>`;
  }

  // 세 휴식 강조 라벨
  const highlights = [];
  if (bestPainRec) highlights.push({ turn: bestPainRec.turn, label: '몸을 가장 쉬게 한' });
  if (bestDriveRec) highlights.push({ turn: bestDriveRec.turn, label: '다시 걷게 한' });
  if (bestSpendRec) highlights.push({ turn: bestSpendRec.turn, label: '가장 비쌌던' });

  for (const h of highlights) {
    const i = h.turn - 1;
    const x = barX(i) + BAR_W / 2;
    svg += `<text x="${x}" y="${CHART_TOP - 8}" text-anchor="middle" class="svg-highlight">${h.label}</text>`;
  }

  svg += '</svg>';

  // ── 타임라인 SVG ──
  const TL_W = 340;
  const TL_H = 50;
  const TL_PAD = 10;
  const TL_BAR_Y = 20;
  const TL_BAR_H = 16;

  const hasTime = timeline.length > 0;
  let timelineSvg = '';

  if (hasTime) {
    const dayStart = DAY_START;
    const endTime = Math.max(dayStart, ...timeline.map(entry => entry.endTime));
    const totalSpan = Math.max(1, endTime - dayStart);
    const timelineColors = { walk: '#cde4f0', meal: '#d8ad58', rest: '#7bafd4', skip: '#e0e0e0' };

    const tX = (t) => TL_PAD + ((t - dayStart) / totalSpan) * (TL_W - TL_PAD * 2);

    timelineSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TL_W} ${TL_H}" class="result-timeline">`;
    // 배경 라인
    timelineSvg += `<line x1="${TL_PAD}" y1="${TL_BAR_Y + TL_BAR_H / 2}" x2="${TL_W - TL_PAD}" y2="${TL_BAR_Y + TL_BAR_H / 2}" stroke="#ddd" stroke-width="1"/>`;

    for (const entry of timeline) {
      const x1 = tX(entry.startTime);
      const x2 = tX(entry.endTime);
      if (x2 > x1) {
        timelineSvg += `<rect x="${x1}" y="${TL_BAR_Y}" width="${x2 - x1}" height="${TL_BAR_H}" rx="2" fill="${timelineColors[entry.type]}"/>`;
      }
    }

    for (const event of eventRecords) {
      const x = tX(event.time);
      const marker = event.type === 'purchase' ? '¥' : event.type === 'incident' ? '!' : '●';
      const fill = event.type === 'purchase' ? '#d4872d' : event.type === 'incident' ? '#d45a5a' : '#4d8da9';
      timelineSvg += `<circle cx="${x}" cy="${TL_BAR_Y + TL_BAR_H / 2}" r="5" fill="${fill}"/>`;
      timelineSvg += `<text x="${x}" y="${TL_BAR_Y + TL_BAR_H / 2 + 3}" text-anchor="middle" class="svg-tl-event">${marker}</text>`;
      if (event.type === 'purchase') timelineSvg += `<text x="${x}" y="${TL_BAR_Y - 7}" text-anchor="middle" class="svg-tl-purchase">−¥${event.spend.toLocaleString()}</text>`;
    }

    // 시작·끝 시각 레이블
    timelineSvg += `<text x="${TL_PAD}" y="${TL_BAR_Y - 4}" class="svg-tl-label">${formatTime(dayStart)}</text>`;
    timelineSvg += `<text x="${TL_W - TL_PAD}" y="${TL_BAR_Y - 4}" text-anchor="end" class="svg-tl-label">${formatTime(endTime)}</text>`;

    // 총 시간 요약
    const totalFor = type => timeline.filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.endTime - entry.startTime, 0);
    timelineSvg += `<text x="${TL_W / 2}" y="${TL_BAR_Y + TL_BAR_H + 14}" text-anchor="middle" class="svg-tl-summary">이동 ${totalFor('walk')}분 · 식사 ${totalFor('meal')}분 · 쉼 ${totalFor('rest') + totalFor('skip')}분</text>`;

    timelineSvg += '</svg>';
  }

  // ── 문구 조립 ──
  let comparisonMsg = '';
  if (avgWith === null || avgWithout === null) {
    comparisonMsg = '비교할 짝이 적다. 시야와 행동 표식을 함께 보자.';
  } else if (avgWith <= avgWithout) {
    comparisonMsg = '이번 기록에서 돈을 쓴 휴식이 더 높았던 건 아니었다.';
  } else {
    comparisonMsg = '이번에는 돈을 쓴 휴식도 높았다. 그때 공간과 행동도 함께 보자.';
  }

  // 세 휴식 코멘트
  let highlightComment = '';
  if (bestDriveRec && bestSpendRec) {
    if (bestDriveRec.turn !== bestSpendRec.turn) {
      highlightComment = '가장 비쌌던 휴식이 나를 다시 걷게 한 건 아니었다.';
    } else {
      highlightComment = `이번에는 가장 비쌌던 휴식이 가장 좋았다. 그때 시야는 ${bestDriveRec.card.view}이었다.`;
    }
  }

  // ── DOM 조립 ──
  const wideOrActive = rested.filter(r => r.card.view === 'wide' || ACTIONS[r.action].initiative >= 6);
  const other = rested.filter(r => !wideOrActive.includes(r));
  const activeAvg = wideOrActive.length ? wideOrActive.reduce((sum, r) => sum + r.satisfaction, 0) / wideOrActive.length : null;
  const otherAvg = other.length ? other.reduce((sum, r) => sum + r.satisfaction, 0) / other.length : null;
  const observation = activeAvg !== null && otherAvg !== null
    ? `이번 ${rested.length}번의 쉼에서는 열린 공간·주도적 행동 쪽이 평균 ${activeAvg.toFixed(1)}, 다른 쉼이 ${otherAvg.toFixed(1)}이었다.`
    : `이번 ${rested.length}번의 쉼에서는 금액뿐 아니라 머문 공간과 내가 고른 행동을 함께 남겼다.`;

  const wrap = document.createElement('div');
  wrap.className = 'scene result';

  const avgWithStr = avgWith !== null ? avgWith.toFixed(1) : '-';
  const avgWithoutStr = avgWithout !== null ? avgWithout.toFixed(1) : '-';
  const journeyEvents = eventRecords.map(event => {
    const spend = event.type === 'purchase' ? ` · −¥${event.spend.toLocaleString()}` : '';
    return `<li>${event.turn}턴 · ${event.description}${spend}</li>`;
  }).join('');

  wrap.innerHTML = `
    <div class="result-title">기록</div>
    ${svg}
    ${timelineSvg}
    ${hasTime ? '<div class="timeline-legend"><span>이동</span><span>식사</span><span>쉼</span><span>지나침</span><span>여행 중 만난 일</span></div>' : ''}
    ${journeyEvents ? `<div class="journey-record"><strong>여행에서 만난 것</strong><ul>${journeyEvents}</ul></div>` : ''}
    <div class="result-avg">
      돈을 쓴 휴식 평균 <strong>${avgWithStr}</strong> / 돈을 안 쓴 휴식 평균 <strong>${avgWithoutStr}</strong>
    </div>
    <div class="result-comparison">${comparisonMsg}</div>
    <div class="result-note">● 시야가 넓을수록 열림 · ▲ 숫자는 행동의 주도성 · 식사는 비교에서 제외했다.</div>
    <div class="result-observation">${observation}</div>
    <div class="record-detail" aria-live="polite">막대를 누르면 그 턴의 변화 기록을 다시 볼 수 있다.</div>
    ${highlightComment ? `<div class="result-highlight-comment">${highlightComment}</div>` : ''}
  `;

  wrap.querySelectorAll('.result-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const record = records.find(entry => entry.turn === Number(bar.dataset.turn));
      const detail = wrap.querySelector('.record-detail');
      const meal = mealRecords.find(entry => entry.turn === record.turn);
      const journey = record.card.journey || { route: '다음 장소를 향해 걸었다.', sight: '바람이 곁을 스쳤다.' };
      const events = eventRecords.filter(event => event.turn === record.turn);
      const timeStr = record.arrivalTime ? `${formatTime(record.arrivalTime)} 도착 · ` : '';
      const mealStr = meal ? `식사 ${meal.endTime - meal.startTime}분 · ` : '';
      const restStr = record.restMinutes ? ` · ${record.restMinutes}분` : '';
      const eventStr = events.length ? ` · ${events.map(event => event.type === 'purchase' ? `${event.description} (−¥${event.spend.toLocaleString()})` : event.description).join(' · ')}` : '';
      detail.textContent = `${record.turn}턴 · ${record.walkMinutes || 0}분 걸음 · ${journey.route} ${journey.sight} · ${timeStr}${mealStr}${record.card.name} · ${actionName(record.action)}${restStr}${eventStr} · 통증 ${record.painRecovered ? `−${record.painRecovered}` : `+${record.painAfter - record.painBefore}`} · 의지 ${signed(record.driveDelta)}`;
    });
  });

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = '다시 하기';
  btn.addEventListener('click', () => {
    window.location.reload();
  });
  wrap.appendChild(btn);

  app.appendChild(wrap);
  return null;
}
