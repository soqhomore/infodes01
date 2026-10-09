/** 방문 수와 독립된 휴식 기록, 하루 타임라인. */
import { ACTIONS, DAY_START, DAY_END, formatTime } from '../state.js';
import { buildResultData, describeRest } from '../records.js';

const VIEW_MARK = { narrow: '◐', mid: '◑', wide: '●' };
const BAR_W = 30;
const BAR_STEP = 54;
const CHART_TOP = 30;
const CHART_H = 180;
const SVG_H = 295;
const xFor = index => 28 + index * BAR_STEP;
const money = value => `¥${value.toLocaleString()}`;

export function showResult(app, ctx) {
  const { rested, highlights, avgWith, avgWithout } = buildResultData(ctx);
  const { visits = [], mealRecords = [], eventRecords = [], timeline = [] } = ctx;
  const width = Math.max(340, 56 + BAR_STEP * rested.length);
  const maxSpend = Math.max(1, ...rested.map(record => record.spend));
  let chart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${SVG_H}" style="width:${width}px" class="result-svg" aria-label="쉼마다의 마음 환기와 지출">`;
  for (const [index, record] of rested.entries()) {
    const x = xFor(index);
    const height = record.satisfaction / 10 * CHART_H;
    const y = CHART_TOP + CHART_H - height;
    const fill = record.spend > 0 ? `rgba(76,175,80,${0.35 + 0.65 * Math.min(record.spend / 1800, 1)})` : '#aaa';
    chart += `<g class="result-bar" data-rest-id="${record.restId}" role="button" tabindex="0" aria-label="${index + 1}번째 쉼, ${record.card.name}, ${ACTIONS[record.action].name}, 마음 환기 ${record.satisfaction}, 통증 회복 ${record.painRecovered}, 마음의 여유 변화 ${record.driveDelta}"><rect x="${x}" y="${y}" width="${BAR_W}" height="${height}" rx="3" fill="${fill}"/><rect x="${x}" y="${Math.min(y, CHART_TOP + CHART_H - 12)}" width="${BAR_W}" height="${Math.max(height, 12)}" fill="transparent"/><text x="${x + BAR_W / 2}" y="${y - 5}" text-anchor="middle" class="svg-sat-label">${record.satisfaction}</text></g>`;
    chart += `<text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H + 16}" text-anchor="middle" class="svg-action">${ACTIONS[record.action].name}</text><text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H + 30}" text-anchor="middle" class="svg-place">${record.card.name}</text><text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H + 44}" text-anchor="middle" class="svg-marker">${VIEW_MARK[record.card.view]} · ${record.restMinutes}분</text><text x="${x + BAR_W / 2}" y="${CHART_TOP + CHART_H + 58}" text-anchor="middle" class="svg-marker">${index + 1}번째 쉼</text>`;
  }
  const spendPoints = rested.flatMap((record, index) => record.spend > 0 ? [{ x: xFor(index) + BAR_W / 2, y: CHART_TOP + CHART_H - record.spend / maxSpend * CHART_H * 0.8, spend: record.spend }] : []);
  if (spendPoints.length > 1) chart += `<path d="${spendPoints.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')}" fill="none" stroke="#ff9800" stroke-width="2" stroke-dasharray="4,3" pointer-events="none"/>`;
  for (const point of spendPoints) chart += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#ff9800" pointer-events="none"/><text x="${point.x}" y="${point.y - 8}" text-anchor="middle" class="svg-spend" pointer-events="none">${money(point.spend)}</text>`;
  chart += '</svg>';

  const tX = time => 10 + (time - DAY_START) / (DAY_END - DAY_START) * 320;
  const colors = { walk: '#cde4f0', meal: '#d8ad58', rest: '#7bafd4', skip: '#e0e0e0' };
  let timeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 90" class="result-timeline" aria-label="하루의 이동, 식사, 쉼과 사건">';
  timeSvg += '<line x1="10" y1="49" x2="330" y2="49" stroke="#ddd"/>';
  for (const entry of timeline) timeSvg += `<rect x="${tX(entry.startTime)}" y="41" width="${Math.max(0, tX(entry.endTime) - tX(entry.startTime))}" height="16" rx="2" fill="${colors[entry.type]}"><title>${entry.label} · ${formatTime(entry.startTime)} → ${formatTime(entry.endTime)}</title></rect>`;
  for (const event of eventRecords) {
    const x = tX(event.time);
    const marker = event.type === 'purchase' ? '¥' : event.type === 'incident' ? '!' : '●';
    const fill = event.type === 'purchase' ? '#bd7423' : event.type === 'incident' ? '#d45a5a' : '#4d8da9';
    timeSvg += `<g class="timeline-event" data-visit-id="${event.visitId}"><title>${formatTime(event.time)} ${event.description}</title><circle cx="${x}" cy="49" r="5" fill="${fill}"/><text x="${x}" y="52" text-anchor="middle" class="svg-tl-event">${marker}</text></g>`;
    if (event.type === 'purchase') timeSvg += `<text x="${x}" y="29" text-anchor="middle" class="svg-tl-purchase">−${money(event.spend)}</text>`;
  }
  const totalFor = type => timeline.filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.endTime - entry.startTime, 0);
  timeSvg += `<line x1="330" y1="35" x2="330" y2="61" stroke="#71808a" stroke-dasharray="2,2"/><text x="10" y="13" class="svg-tl-label">${formatTime(DAY_START)}</text><text x="330" y="13" text-anchor="end" class="svg-tl-label">${formatTime(DAY_END)} 돌아갈 시간</text><text x="170" y="79" text-anchor="middle" class="svg-tl-summary">이동 ${totalFor('walk')}분 · 식사 ${totalFor('meal')}분 · 쉼 ${totalFor('rest')}분</text></svg>`;

  const comparison = avgWith === null || avgWithout === null ? '비교할 짝이 적다. 머문 공간과 행동도 함께 보자.'
    : avgWith <= avgWithout ? '이번 기록에서 돈을 쓴 휴식이 더 높았던 건 아니었다.'
      : '이번에는 돈을 쓴 휴식도 높았다. 그때 공간과 행동도 함께 보자.';
  const wrap = document.createElement('div');
  wrap.className = 'scene result';
  wrap.innerHTML = `<div class="result-title">오늘 머문 곳</div><p class="result-note">${visits.length || new Set(rested.map(record => record.visitId)).size}곳 방문 · ${rested.length}번 쉼${ctx.currentTime !== undefined ? ` · ${formatTime(ctx.currentTime)} 여행 마침` : ''}</p>
    ${rested.length ? `<div class="result-chart" tabindex="0" aria-label="휴식 기록 가로 스크롤">${chart}</div>` : '<p class="result-observation">오늘은 쉼 없이 여행했다. 지나온 길은 아래에 남아 있다.</p>'}
    ${timeSvg}<div class="timeline-legend"><span>이동</span><span>식사</span><span>쉼</span><span class="event-legend">여행 중 만난 일</span></div>
    ${eventRecords.length ? `<div class="journey-record"><strong>여행에서 만난 것</strong><ul>${eventRecords.map(event => `<li>${event.turn}번째 장소로 가는 길 · ${event.description}${event.type === 'purchase' ? ` · −${money(event.spend)}` : ''}</li>`).join('')}</ul></div>` : ''}
    <div class="result-avg">돈을 쓴 휴식 평균 <strong>${avgWith?.toFixed(1) ?? '-'}</strong> / 돈을 안 쓴 휴식 평균 <strong>${avgWithout?.toFixed(1) ?? '-'}</strong></div>
    <div class="result-comparison">${comparison}</div><p class="result-note">막대는 이번 쉼의 마음 환기(만족감), 주황색 점은 지출이다. 몸의 회복과는 다르며, 연속 휴식으로 낮아질 수 있다. 식사·구매는 휴식 비교에서 제외했다.</p>
    <div class="record-detail" aria-live="polite">${rested.length ? '막대를 누르면 지나온 길과 그 쉼의 기록을 볼 수 있다.' : '남겨진 휴식 기록이 없다.'}</div>
    <div class="result-highlights">${highlights.map(item => `<button class="highlight-button" data-rest-id="${item.restId}">${item.label}<span>${item.record.card.name} · ${ACTIONS[item.record.action].name} · ${item.record.restMinutes}분</span></button>`).join('')}</div>`;

  const listeners = [];
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push({ el, type, fn }); };
  const showDetail = restId => {
    const record = rested.find(entry => entry.restId === restId);
    wrap.querySelector('.record-detail').textContent = describeRest(record, ctx);
  };
  wrap.querySelectorAll('[data-rest-id]').forEach(element => {
    on(element, 'click', () => showDetail(element.dataset.restId));
    if (element.classList.contains('result-bar')) on(element, 'keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetail(element.dataset.restId); }
    });
  });
  const button = document.createElement('button'); button.className = 'btn'; button.textContent = '다시 여행하기';
  on(button, 'click', () => window.location.reload()); wrap.appendChild(button); app.appendChild(wrap);

  return () => {
    listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
  };
}
