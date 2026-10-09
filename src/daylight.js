import { getDayPhase } from './state.js';

/** 같은 시각을 출발·여행·귀환의 빛으로 표현한다. */
export function daylightHTML(time) {
  const phase = getDayPhase(time);
  return `<div class="day-sky" role="img" aria-label="${phase.label}의 하늘"><svg viewBox="0 0 340 62" aria-hidden="true"><path class="sky-ridge" d="M0 58 Q55 34 110 53 T220 50 T340 48 V62 H0Z"/><circle class="sky-sun" cx="${phase.id === 'sunset' ? 278 : 68}" cy="${phase.id === 'sunset' ? 48 : 22}" r="12"/><path class="sky-moon" d="M280 10a14 14 0 1 0 14 20a13 13 0 0 1-14-20Z"/><g class="sky-stars"><circle cx="38" cy="15" r="1.5"/><circle cx="90" cy="31" r="1"/><circle cx="162" cy="12" r="1.5"/><circle cx="215" cy="25" r="1"/></g></svg><span>${phase.label}</span></div>`;
}
