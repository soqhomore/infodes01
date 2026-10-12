import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, MEAL_OPTIONS, applyMeal, createTimelineEntry } from '../src/state.js';
import { EVENTS } from '../src/events.js';

test('식사는 휴식 행동이 아니며 예산만 바꾼다', () => {
  assert.equal('meal' in ACTIONS, false);

  const result = applyMeal({ budget: 3000, option: 'bench' });
  assert.deepEqual(result, { budgetAfter: 2200, spend: 800, option: 'bench' });
});

test('식사 선택은 타임라인에 쓸 체류 시간을 가진다', () => {
  assert.equal(MEAL_OPTIONS.bench.minutes, 30);
  assert.equal(MEAL_OPTIONS.indoor.minutes, 60);
});

test('시간 구간은 시작 시각과 분 단위 길이로 연속 기록된다', () => {
  assert.deepEqual(
    createTimelineEntry({ turn: 4, type: 'meal', startTime: 795, minutes: 20, label: '바깥 벤치에서 간단히 먹기' }),
    { turn: 4, type: 'meal', startTime: 795, endTime: 815, label: '바깥 벤치에서 간단히 먹기' },
  );
});

test('한정 디저트 구매는 예산만 줄이고 휴식 수치를 바꾸지 않는다', () => {
  const result = EVENTS.limitedDessert.apply({ pain: 55, drive: 40, budget: 5000 }, 0);

  assert.deepEqual(result, { budget: 2500 });
});


test('개복치 표시에서 통증은 자세만, 마음은 유영만 바꾸고 원본 상태는 유지한다', async () => {
  const { getFishAppearance } = await import('../src/state.js');
  const state = Object.freeze({ pain: 20, drive: 20, budget: 8000 });
  const calm = getFishAppearance(state);
  const sore = getFishAppearance({ ...state, pain: 80 });
  const lively = getFishAppearance({ ...state, drive: 80 });
  assert.ok(sore.dropPx > calm.dropPx);
  assert.ok(sore.tiltDeg > calm.tiltDeg);
  assert.equal(sore.swimPx, calm.swimPx);
  assert.equal(sore.swimSeconds, calm.swimSeconds);
  assert.equal(lively.dropPx, calm.dropPx);
  assert.equal(lively.tiltDeg, calm.tiltDeg);
  assert.ok(lively.swimPx > calm.swimPx);
  assert.ok(lively.swimSeconds < calm.swimSeconds);
  assert.deepEqual(state, { pain: 20, drive: 20, budget: 8000 });
});

test('개복치 표시는 0과 100의 경계를 넘어도 표현 범위를 벗어나지 않는다', async () => {
  const { getFishAppearance } = await import('../src/state.js');
  assert.deepEqual(getFishAppearance({ pain: -20, drive: -20 }), getFishAppearance({ pain: 0, drive: 0 }));
  assert.deepEqual(getFishAppearance({ pain: 120, drive: 120 }), getFishAppearance({ pain: 100, drive: 100 }));
});
