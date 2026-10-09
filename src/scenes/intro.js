/**
 * 인트로 씬 — 여행지 3개 중 선택
 */

import { DESTINATIONS } from '../deck.js';
import { showDeparture } from './departure.js';
import { createRng } from '../rng.js';
import { createDeck } from '../deck.js';
import { DAY_END, formatTime } from '../state.js';
import { createDay } from '../day.js';
import { updateDebug, DEBUG } from '../debug.js';
import { assignEventSlots } from '../events.js';

export function showIntro(app, context, goto) {
  let locked = false;

  const wrap = document.createElement('div');
  wrap.className = 'scene intro';
  wrap.innerHTML = `
    <h1>개복치 휴식 시뮬레이터</h1>
    <p class="intro-sub">아침부터 밤까지 개복치와 하루를 여행합니다.<br>${formatTime(DAY_END)}까지, 어디에서 얼마나 머물까요?</p>
    <div class="intro-buttons"></div>
  `;

  const btnWrap = wrap.querySelector('.intro-buttons');

  for (const dest of DESTINATIONS) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = dest.name;
    btn.addEventListener('click', () => {
      if (locked) return;
      locked = true;

      const rng = createRng(context.seed);
      const deck = createDeck(dest.id, rng);
      const eventSlots = assignEventSlots(rng);

      updateDebug('여행지', dest.name);
      if (DEBUG) updateDebug('이벤트', `유혹T${eventSlots.temptation} 부정T${eventSlots.negative} 긍정T${eventSlots.positive}`);

      goto(showDeparture, {
        ...createDay(),
        seed: context.seed,
        rng,
        deck,
        destination: dest.id,
        eventSlots,
        usedEvents: new Set(),
        destinationInfo: dest,
      });
    });
    btnWrap.appendChild(btn);
  }

  app.appendChild(wrap);
  return null; // cleanup 불필요
}
