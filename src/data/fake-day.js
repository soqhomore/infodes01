/** ?jump=result — 실제 하루 API로 만든 반복 체류 샘플. */
import { createRng } from '../rng.js';
import { createDeck } from '../deck.js';
import { EVENTS } from '../events.js';
import { createDay, moveToPlace, restAtPlace, eatMeal, isMealDue, resolveJourneyEvent, returnFromDay } from '../day.js';

export function createSampleDay() {
  const rng = createRng(123);
  const deck = createDeck('beach', rng);
  let state = moveToPlace(createDay(), deck.draw());
  state = restAtPlace(state, { actionId: 'phone', minutes: 30, rng });
  // 쉼 없이 지나온 방문도 남긴다.
  state = moveToPlace(state, deck.draw());
  state = moveToPlace(state, deck.draw());
  state = resolveJourneyEvent(state, { ...EVENTS.limitedDessert, id: 'limitedDessert' }, 0).state;
  for (let i = 0; i < 8; i++) {
    if (isMealDue(state)) state = eatMeal(state, 'bench');
    state = restAtPlace(state, { actionId: i % 2 === 0 ? 'dessert' : 'phone', minutes: i % 2 === 0 ? 30 : 60, rng });
  }
  return returnFromDay(state);
}
