/**
 * 엔딩 씬 — §10 엔딩 판정
 */

import { MAX_TURNS } from '../state.js';
import { showResult } from './result.js';

const ENDINGS = [
  { id: 'early-drive',  condition: (p, d, t) => d <= 0,               title: '조기 귀국',    line: '개복치는 숙소로 돌아가 버렸다.' },
  { id: 'early-pain',   condition: (p, d, t) => p >= 100,             title: '발이 먼저 끝냈다', line: '개복치는 더 걷지 못하고 주저앉았다.' },
  { id: 'good',         condition: (p, d, t) => t >= MAX_TURNS && d >= 70, title: '좋은 하루',    line: '개복치가 팔딱거린다.' },
  { id: 'normal',       condition: (p, d, t) => t >= MAX_TURNS && d >= 40, title: '무난한 하루',  line: '개복치는 평온하다.' },
  { id: 'tired',        condition: () => true,                         title: '길었던 하루',  line: '개복치는 지쳤다.' },
];

export function showEnding(app, ctx, goto) {
  let locked = false;
  const { pain, drive, turn, records } = ctx;

  const ending = ENDINGS.find(e => e.condition(pain, drive, turn));

  const wrap = document.createElement('div');
  wrap.className = 'scene ending';
  wrap.innerHTML = `
    <div class="ending-title">${ending.title}</div>
    <div class="ending-line">${ending.line}</div>
  `;

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = '결과 보기';
  btn.addEventListener('click', () => {
    if (locked) return;
    locked = true;
    goto(showResult, { ...ctx, endingId: ending.id });
  });
  wrap.appendChild(btn);

  app.appendChild(wrap);
  return null;
}
