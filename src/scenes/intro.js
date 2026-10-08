/**
 * 인트로 씬 — 여행지 3개 중 선택
 */

import { DESTINATIONS } from '../deck.js';
import { showTurn } from './turn.js';
import { createRng } from '../rng.js';
import { createDeck } from '../deck.js';
import {
  INITIAL_PAIN, INITIAL_DRIVE, INITIAL_BUDGET, MAX_TURNS,
} from '../state.js';
import { updateDebug } from '../debug.js';

export function showIntro(app, context, goto) {
  let locked = false;

  const wrap = document.createElement('div');
  wrap.className = 'scene intro';
  wrap.innerHTML = `
    <h1>개복치 휴식 시뮬레이터</h1>
    <p class="intro-sub">개복치와 하루를 여행합니다.<br>어디로 갈까요?</p>
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

      updateDebug('여행지', dest.name);

      goto(showTurn, {
        seed: context.seed,
        rng,
        deck,
        destination: dest.id,
        turn: 0,
        pain: INITIAL_PAIN,
        drive: INITIAL_DRIVE,
        budget: INITIAL_BUDGET,
        records: [],
        eventSlots: null, // 5단계에서 구현
      });
    });
    btnWrap.appendChild(btn);
  }

  app.appendChild(wrap);
  return null; // cleanup 불필요
}
