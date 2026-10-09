import { formatTime, getDayPhase } from '../state.js';
import { daylightHTML } from '../daylight.js';
import { getDayEndReason } from '../day.js';
import { showResult } from './result.js';

const ENDINGS = {
  time: { title: '돌아갈 시간', line: '오늘은 여기까지. 개복치와 하루를 돌아본다.' },
  returned: { title: '오늘은 여기까지', line: '더 걷는 대신, 오늘의 여행을 마치기로 했다.' },
  pain: { title: '발이 먼저 끝냈다', line: '개복치는 더 걷지 못하고 주저앉았다.' },
  drive: { title: '숙소로 돌아간다', line: '개복치는 이제 돌아가고 싶어 한다.' },
};

export function showEnding(app, ctx, goto) {
  let locked = false;
  const endingId = getDayEndReason(ctx) || 'returned';
  const ending = ENDINGS[endingId];
  const wrap = document.createElement('div');
  wrap.className = `scene ending day-phase-${getDayPhase(ctx.currentTime).id}`;
  wrap.innerHTML = `${daylightHTML(ctx.currentTime)}<div class="ending-title">${ending.title}</div><div class="ending-line">${ending.line}</div><p class="ending-line">${formatTime(ctx.currentTime)} · ${ctx.visits.length}곳 방문 · ${ctx.records.length}번 머묾</p>`;
  const button = document.createElement('button');
  button.className = 'btn'; button.textContent = '하루 기록 보기';
  const proceed = () => { if (locked) return; locked = true; goto(showResult, { ...ctx, endingId }); };
  button.addEventListener('click', proceed);
  wrap.appendChild(button); app.appendChild(wrap);
  return () => { locked = true; button.removeEventListener('click', proceed); };
}
