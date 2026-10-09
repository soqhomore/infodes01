import test from 'node:test';
import assert from 'node:assert/strict';
import { createDay, moveToPlace, restAtPlace, resolveJourneyEvent, eatMeal } from '../src/day.js';
import { createRng } from '../src/rng.js';
import { EVENTS } from '../src/events.js';
import { buildResultData, describeRest } from '../src/records.js';
import { createSampleDay } from '../src/data/fake-day.js';

const card = { id: 'river', name: '강변', view: 'wide', indoor: false, walkMinutes: 20, journey: { route: '강을 따라 걸었다.', sight: '물새를 보았다.' } };
const rng = createRng(123);

test('디버그 결과 샘플은 실제 API로 반복 체류와 구매/식사를 기록한다', () => {
  const sample = createSampleDay();
  assert.equal(sample.records.length, 9);
  assert.equal(sample.visits.length, 3);
  assert.equal(sample.mealRecords.length, 1);
  assert.equal(sample.eventRecords[0].type, 'purchase');
  assert.equal(sample.endReason, 'drive');
});

test('쉼 0개, 1개, 7개 초과를 방문 수와 무관하게 집계한다', () => {
  let state = moveToPlace(createDay(), card);
  assert.equal(buildResultData(state).rested.length, 0);
  state = restAtPlace(state, { actionId: 'phone', minutes: 30, rng });
  assert.equal(buildResultData(state).rested.length, 1);
  for (let i = 0; i < 8; i++) state = restAtPlace(state, { actionId: 'phone', minutes: 30, rng });
  const result = buildResultData(state);
  assert.equal(result.rested.length, 9);
  assert.equal(new Set(result.rested.map(record => record.restId)).size, 9);
  assert.equal(result.highlights.find(item => item.label === '짧게 쉬어도 충분했던 쉼').restId, 'rest-1');
});

test('반복 체류 상세는 선택한 쉼과 그보다 앞선 사건/식사를 시간순으로 설명한다', () => {
  let state = moveToPlace({ ...createDay(), currentTime: 700 }, card);
  state = resolveJourneyEvent(state, { ...EVENTS.limitedDessert, id: 'limitedDessert' }, 0).state;
  state = eatMeal(state, 'bench');
  state = restAtPlace(state, { actionId: 'phone', minutes: 30, rng });
  const first = state.records[0];
  state = restAtPlace(state, { actionId: 'phone', minutes: 60, rng });
  const description = describeRest(state.records[1], state);
  assert.ok(description.includes('물새를 보았다.'));
  assert.ok(description.includes('13:40 → 14:40'));
  assert.ok(description.indexOf('한정 디저트를 샀다') < description.indexOf('도착'));
  assert.ok(description.indexOf('식사') < description.indexOf('이번 쉼'));
  assert.ok(!describeRest(first, state).includes('13:40 → 14:40'));
});

test('이전 결과 샘플은 별도 휴식 ID를 부여하고 지나친 기록을 막대에서 제외한다', () => {
  const records = [
    { turn: 1, skipped: true, satisfaction: 0, spend: 0 },
    { turn: 2, action: 'phone', card, satisfaction: 5, spend: 0, driveDelta: 3, painRecovered: 4, restMinutes: 15 },
  ];
  assert.equal(buildResultData({ records }).rested.length, 1);
  assert.equal(buildResultData({ records }).rested[0].restId, 'legacy-rest-2');
  assert.equal(buildResultData({ records }).highlights.some(item => item.label === '짧게 쉬어도 충분했던 쉼'), false);
});
