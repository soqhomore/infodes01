import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { createDeck } from '../src/deck.js';
import { EVENTS, assignEventSlots, pickEvent } from '../src/events.js';
import { DAY_END, ACTIONS, applyRest } from '../src/state.js';
import { createDay, moveToPlace, restAtPlace, eatMeal, resolveJourneyEvent, getDayEndReason, getMoveOption, getRestOptions, isMealDue, returnFromDay } from '../src/day.js';

const card = { id: 'test-place', name: '강변', view: 'wide', indoor: false, walkMinutes: 20, journey: { route: '강을 따라 걸었다.', sight: '물새를 보았다.' } };
const arrived = () => moveToPlace(createDay(), card);
const rng = () => createRng(123);

test('예고 조회는 덱과 RNG를 소비하지 않고 실제 이동할 카드와 일치한다', () => {
  const previewed = createDeck('beach', rng());
  const untouched = createDeck('beach', rng());
  assert.deepEqual(previewed.peek(), previewed.peek());
  assert.deepEqual(previewed.draw(), untouched.draw());
  assert.equal(previewed.remaining().length, 8);
});

test('같은 장소에서 반복 체류하면 이동은 한 번, 휴식은 각각 기록한다', () => {
  const first = arrived();
  const second = restAtPlace(first, { actionId: 'phone', minutes: 30, rng: rng() });
  const third = restAtPlace(second, { actionId: 'phone', minutes: 60, rng: rng() });
  assert.equal(third.visits.length, 1);
  assert.equal(third.records.length, 2);
  assert.equal(third.timeline.filter(entry => entry.type === 'walk').length, 1);
  assert.equal(third.records[0].visitId, third.records[1].visitId);
  assert.notEqual(third.records[0].restId, third.records[1].restId);
  assert.equal(third.currentTime, first.currentTime + 90);
  assert.equal(first.records.length, 0);
});

test('다음 장소로 이동할 때 추가 스킵 비용 없이 이동 효과만 적용한다', () => {
  const first = arrived();
  assert.equal(first.pain, 23);
  assert.equal(first.drive, 42);
  const second = moveToPlace(first, { ...card, id: 'next' });
  assert.equal(second.pain, 32);
  assert.equal(second.drive, 39);
  assert.equal(second.currentTime, first.currentTime + 60);
  assert.equal(second.records.length, 0);
});

test('체류 길이는 회복과 시간에 반영되고 의지 기본 소모는 이동에서만 적용된다', () => {
  const args = { pain: 50, drive: 45, budget: 8000, actionId: 'phone', card, rng: rng() };
  const short = applyRest({ ...args, minutes: 30 });
  const long = applyRest({ ...args, minutes: 60 });
  assert.equal(short.painRecovered, 6);
  assert.equal(long.painRecovered, 13); // 40 미만으로 회복되면 효율도 즉시 좋아진다.
  const base = applyRest({ ...args, pain: 20, minutes: 30 });
  assert.equal(base.driveDelta, 2);
});

test('선택 가능 여부 확인은 상태를 변경하지 않는다', () => {
  const day = arrived();
  const before = structuredClone(day);
  getMoveOption(day, card);
  getRestOptions(day, 'dessert');
  assert.deepEqual(day, before);
});

test('시간이 부족한 행동은 금지하고 종료 시각에 정확히 도달하는 체류는 허용한다', () => {
  const day = { ...arrived(), currentTime: DAY_END - 30 };
  const options = getRestOptions(day, 'phone');
  assert.equal(options[0].available, true);
  assert.equal(options[1].available, false);
  assert.equal(getMoveOption(day, card).available, false);
  assert.throws(() => restAtPlace(day, { actionId: 'phone', minutes: 60, rng: rng() }));
  const ended = restAtPlace(day, { actionId: 'phone', minutes: 30, rng: rng() });
  assert.equal(getDayEndReason(ended), 'time');
  assert.equal(ended.records.length, 1);
  assert.throws(() => restAtPlace(ended, { actionId: 'phone', minutes: 30, rng: rng() }));
});

test('통증이 높으면 이동은 잠기지만 휴식과 자발적 귀환은 가능하다', () => {
  const day = { ...arrived(), pain: 80 };
  assert.equal(getMoveOption(day, card).available, false);
  assert.equal(getRestOptions(day, 'spacing')[0].available, true);
  assert.equal(getDayEndReason(returnFromDay(day)), 'returned');
});

test('9번째 이동도 유효한 통증을 기록하고 덱 소진 뒤 휴식할 수 있다', () => {
  let day = createDay();
  for (let i = 0; i < 9; i++) day = moveToPlace({ ...day, pain: 0 }, card);
  assert.equal(day.pain, 18);
  assert.equal(day.visits.length, 9);
  assert.equal(getMoveOption(day, null).available, false);
  assert.equal(restAtPlace(day, { actionId: 'spacing', minutes: 30, rng: rng() }).records.length, 1);
});

test('12시 이후 식사는 한 번만 기록되고 반복 체류해도 재발생하지 않는다', () => {
  const day = { ...arrived(), currentTime: 720 };
  assert.equal(isMealDue(day), true);
  const fed = eatMeal(day, 'bench');
  assert.equal(fed.currentTime, 750);
  assert.equal(fed.budget, day.budget - 800);
  assert.equal(fed.pain, day.pain);
  assert.equal(fed.drive, day.drive);
  assert.equal(isMealDue(fed), false);
  assert.throws(() => eatMeal(fed, 'bench'));
  const rested = restAtPlace(fed, { actionId: 'phone', minutes: 30, rng: rng() });
  assert.equal(rested.mealRecords.length, 1);
});

test('구매는 이동 구간에 한 번 기록되고 예산 외 수치는 바뀌지 않는다', () => {
  const day = arrived();
  const { state } = resolveJourneyEvent(day, { ...EVENTS.limitedDessert, id: 'limitedDessert' }, 0);
  assert.equal(state.budget, day.budget - 2500);
  assert.equal(state.pain, day.pain);
  assert.equal(state.drive, day.drive);
  assert.equal(state.currentTime, day.currentTime);
  const purchase = state.eventRecords[0];
  assert.equal(purchase.visitId, state.currentVisitId);
  assert.equal(purchase.type, 'purchase');
  assert.equal(purchase.item, '한정 디저트');
  assert.equal(purchase.spend, 2500);
  assert.ok(purchase.time > state.visits[0].walkStartTime && purchase.time < state.visits[0].arrivalTime);
  const duplicate = resolveJourneyEvent(state, { ...EVENTS.limitedDessert, id: 'limitedDessert' }, 0);
  assert.equal(duplicate.state.eventRecords.length, 1);
  assert.equal(duplicate.state.budget, state.budget);
});

test('첫 방문에는 사건이 배정되지 않고 이동 치명 상태는 즉시 종료된다', () => {
  const random = rng();
  const slots = assignEventSlots(random);
  assert.equal(pickEvent(1, slots, { pain: 50, drive: 45, budget: 8000, card, turnNum: 1 }, new Set(), random), null);
  const fatal = moveToPlace({ ...createDay(), drive: 2 }, card);
  assert.equal(getDayEndReason(fatal), 'drive');
});
