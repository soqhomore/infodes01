/** 여행지 선택 뒤, 첫 이동 전의 출발 프롤로그 */
import { DAY_START, formatTime, getDayPhase, SCENE_TIMING } from '../state.js';
import { daylightHTML } from '../daylight.js';
import { showTurn } from './turn.js';

const DEPARTURE_MS = SCENE_TIMING.departure;

export function showDeparture(app, ctx, goto) {
  let locked = false;
  const destination = ctx.destinationInfo;
  const wrap = document.createElement('div');
  wrap.className = `scene departure day-phase-${getDayPhase(ctx.currentTime).id}`;
  wrap.innerHTML = `
    ${daylightHTML(ctx.currentTime)}
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
