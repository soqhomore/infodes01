/** 여행지 선택 뒤, 첫 이동 전의 출발 프롤로그 */
import { DAY_START, formatTime } from '../state.js';
import { showTurn } from './turn.js';

const DEPARTURE_MS = 2500;

export function showDeparture(app, ctx, goto) {
  let locked = false;
  const destination = ctx.destinationInfo;
  const wrap = document.createElement('div');
  wrap.className = 'scene departure';
  wrap.innerHTML = `
    <div class="departure-time">${formatTime(DAY_START)} · ${destination.name}</div>
    <div class="departure-fish" aria-hidden="true">◒</div>
    <p class="departure-copy">${destination.departureCopy}</p>
    <p class="departure-question">오늘은 어디에서, 어떻게 머물게 될까.</p>
  `;

  const button = document.createElement('button');
  button.className = 'departure-skip';
  button.textContent = '바로 출발';
  wrap.appendChild(button);
  app.appendChild(wrap);

  const proceed = () => {
    if (locked) return;
    locked = true;
    clearTimeout(timer);
    goto(showTurn, ctx);
  };
  const timer = setTimeout(proceed, DEPARTURE_MS);
  button.addEventListener('click', proceed);

  return () => {
    locked = true;
    clearTimeout(timer);
    button.removeEventListener('click', proceed);
  };
}
