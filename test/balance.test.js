import test from 'node:test';
import assert from 'node:assert/strict';
import * as balance from '../src/state.js';
import { createDay, moveToPlace, restAtPlace, eatMeal, resolveJourneyEvent } from '../src/day.js';
import { EVENTS } from '../src/events.js';
import { createRng } from '../src/rng.js';

const card = { name: '강변', view: 'wide', indoor: false, walkMinutes: 20, journey: {} };
const rng = createRng(12);
const args = { pain: 75, drive: 45, budget: 8000, actionId: 'spacing', card, rng };

test('구간 경계와 반올림을 넘어도 분할 휴식은 연속 휴식과 동등하다', () => {
  const whole = balance.applyRest({ ...args, minutes: 60 });
  const first = balance.applyRest({ ...args, minutes: 30 });
  const split = balance.applyRest({ ...args, pain: first.painAfter, drive: first.driveAfter,
    painExact: first.painExact, driveExact: first.driveExact,
    restSaturationMinutes: first.restSaturationAfter, minutes: 30 });
  assert.ok(Math.abs(whole.painExact - split.painExact) < 1e-8);
  assert.ok(Math.abs(whole.driveExact - split.driveExact) < 1e-8);
  assert.equal(whole.painAfter, split.painAfter);
});

test('포화된 반복 휴식은 행동을 바꿔도 마음을 계속 회복하지 않는다', () => {
  let day = moveToPlace(createDay(), card);
  day = restAtPlace(day, { actionId: 'spacing', minutes: 60, rng });
  const before = day.drive;
  day = restAtPlace(day, { actionId: 'plan', minutes: 30, rng });
  assert.ok(day.drive < before);
  assert.equal(day.records.at(-1).satisfaction, 0);
  assert.equal(day.restSaturationMinutes, 90);
});

test('식사와 구매는 포화를 유지하고 이동한 시간만큼만 해소한다', () => {
  let day = moveToPlace(createDay(), card);
  day = restAtPlace(day, { actionId: 'phone', minutes: 60, rng });
  day = eatMeal({ ...day, currentTime: 720 }, 'bench');
  day = resolveJourneyEvent(day, { ...EVENTS.limitedDessert, id: 'limitedDessert' }, 0).state;
  assert.equal(day.restSaturationMinutes, 60);
  day = moveToPlace(day, { ...card, walkMinutes: 10 });
  assert.equal(day.restSaturationMinutes, 37.5);
  const rested = restAtPlace(day, { actionId: 'phone', minutes: 30, rng });
  assert.ok(rested.records.at(-1).reasons.mentalFactor <= 0.3 + 1e-8);
});

test('피로가 거의 없을 때 회복은 느리고 심한 피로는 긴 휴식으로 이동 가능해진다', () => {
  const low = balance.applyRest({ ...args, pain: 8, minutes: 30 });
  assert.equal(low.painRecovered, 3);
  const severe = balance.applyRest({ ...args, pain: 85, minutes: 60 });
  assert.ok(severe.painAfter < 80);
  assert.ok(severe.painRecovered > low.painRecovered);
});

test('예측은 RNG와 상태를 소비하지 않고 확정 효과와 같다', () => {
  assert.equal(typeof balance.predictRest, 'function');
  const day = moveToPlace(createDay(), card);
  const before = structuredClone(day);
  const prediction = balance.predictRest({ ...day, actionId: 'dessert', card, minutes: 60 });
  assert.deepEqual(day, before);
  const actual = restAtPlace(day, { actionId: 'dessert', minutes: 60, rng });
  assert.equal(prediction.painAfter, actual.pain);
  assert.equal(prediction.driveAfter, actual.drive);
});

test('휴식 안내는 가벼운 피로와 큰 피로, 마음 포화를 구분한다', () => {
  assert.equal(typeof balance.getRestAdvice, 'function');
  assert.equal(balance.getRestAdvice({ ...args, pain: 23 }).recommendation, 'short');
  assert.equal(balance.getRestAdvice({ ...args, pain: 65 }).recommendation, 'long');
  assert.equal(balance.getRestAdvice({ ...args, restSaturationMinutes: 60 }).saturated, true);
});

test('휴식 예측은 전달받은 시드 RNG도 소비하지 않는다', () => {
  const previewRng = createRng(123);
  const untouched = createRng(123);
  balance.predictRest({ ...args, actionId: 'dessert', minutes: 30, rng: previewRng });
  assert.equal(previewRng.int(0, 10000), untouched.int(0, 10000));
});

test('포화 뒤에도 통증 부담은 남고 회복량은 통증을 넘지 않는다', () => {
  const high = balance.applyRest({ ...args, pain: 90, restSaturationMinutes: 30, minutes: 30 });
  assert.ok(high.driveDelta < 0);
  const low = balance.applyRest({ ...args, pain: 1, minutes: 60 });
  assert.equal(low.painAfter, 0);
  assert.equal(low.painRecovered, 1);
});

test('회복 효율·통증 부담·포화·0/100 경계에서 분할해도 효과가 같다', () => {
  for (const pain of [0, 8, 10, 39, 40, 60, 70, 80, 99]) {
    for (const drive of [1, 45, 99]) {
      const input = { ...args, pain, drive, minutes: 60, restSaturationMinutes: 8 };
      const whole = balance.applyRest(input);
      let result = { painAfter: pain, driveAfter: drive, restSaturationAfter: 8 };
      for (const minutes of [30, 20, 10]) result = balance.applyRest({ ...input, minutes,
        pain: result.painAfter, drive: result.driveAfter, painExact: result.painExact,
        driveExact: result.driveExact, restSaturationMinutes: result.restSaturationAfter });
      assert.ok(Math.abs(result.painExact - whole.painExact) < 1e-8, `pain=${pain}`);
      assert.ok(Math.abs(result.driveExact - whole.driveExact) < 1e-8, `pain=${pain},drive=${drive}`);
    }
  }
});
