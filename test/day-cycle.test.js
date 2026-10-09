import test from 'node:test';
import assert from 'node:assert/strict';
import * as state from '../src/state.js';
import { createDay, moveToPlace, restAtPlace } from '../src/day.js';
import { createRng } from '../src/rng.js';
const card = { name: '강변', walkMinutes: 20, view: 'wide', indoor: false, journey: {} };
const args = { pain: 20, drive: 45, budget: 8000, actionId: 'spacing', card, rng: createRng(1) };

test('새 하루는 아침 출발하고 이동 시간은 압축된 일정으로 기록한다', () => {
  const day = moveToPlace(createDay(), card);
  assert.equal(day.visits[0].walkStartTime, 540);
  assert.equal(day.currentTime, 600);
  assert.equal(day.visits[0].walkMinutes, 60);
});

test('몸과 마음이 충분히 쉰 추가 체류는 회복이 작고 마음 부담이 생긴다', () => {
  const result = state.applyRest({ ...args, restSaturationMinutes: 60, minutes: 30 });
  assert.equal(result.painRecovered, 3);
  assert.equal(result.driveDelta, -4);
  assert.equal(result.overstayMinutes, 30);
  assert.equal(result.overstayDriveCost, 4);
});

test('몸이 지쳐 있다면 마음 포화 이후에도 필요한 회복을 벌주지 않는다', () => {
  const result = state.applyRest({ ...args, pain: 85, restSaturationMinutes: 60, minutes: 60 });
  assert.ok(result.painAfter < 80);
  assert.equal(result.overstayMinutes, 0);
  assert.equal(result.overstayDriveCost, 0);
});

test('회복 도중 통증 25에 도달한 뒤부터만 과도한 체류를 적용한다', () => {
  const result = state.applyRest({ ...args, pain: 31, restSaturationMinutes: 60, minutes: 30 });
  assert.equal(result.overstayMinutes, 15);
  assert.equal(result.overstayDriveCost, 2);
  assert.equal(result.painAfter, 24);
});

test('과도한 체류의 시작 경계를 분할해도 계산이 같다', () => {
  const whole = state.applyRest({ ...args, pain: 31, restSaturationMinutes: 45, minutes: 60 });
  const first = state.applyRest({ ...args, pain: 31, restSaturationMinutes: 45, minutes: 30 });
  const split = state.applyRest({ ...args, pain: first.painAfter, drive: first.driveAfter,
    painExact: first.painExact, driveExact: first.driveExact, restSaturationMinutes: first.restSaturationAfter, minutes: 30 });
  assert.ok(Math.abs(whole.painExact - split.painExact) < 1e-8);
  assert.ok(Math.abs(whole.driveExact - split.driveExact) < 1e-8);
  assert.equal(whole.overstayMinutes, first.overstayMinutes + split.overstayMinutes);
});

test('과도한 체류 예측을 확정 기록에서도 같은 값으로 읽는다', () => {
  const day = { ...moveToPlace(createDay(), card), pain: 20, restSaturationMinutes: 60 };
  const preview = state.predictRest({ ...day, actionId: 'phone', card, minutes: 30 });
  const result = restAtPlace(day, { actionId: 'phone', minutes: 30, rng: createRng(1) });
  assert.equal(result.records[0].overstayMinutes, preview.overstayMinutes);
  assert.equal(result.records[0].overstayDriveCost, preview.overstayDriveCost);
});

test('시각 경계에 맞춰 아침·낮·노을·밤을 선택한다', () => {
  assert.equal(typeof state.getDayPhase, 'function');
  for (const [time, phase] of [[540,'morning'],[719,'morning'],[720,'day'],[1019,'day'],[1020,'sunset'],[1139,'sunset'],[1140,'night'],[1260,'night']]) {
    assert.equal(state.getDayPhase(time).id, phase);
  }
});

test('마음의 여유가 0에 닿으면 추가 체류 부담도 실제 감소량까지만 기록한다', () => {
  const result = state.applyRest({ ...args, drive: 1, restSaturationMinutes: 60, minutes: 30 });
  assert.equal(result.driveAfter, 0);
  assert.equal(result.overstayDriveCost, 1);
});

test('통증 경계와 포화 경계가 부동소수 오차로 겹쳐도 긴 휴식 보상이 늘지 않는다', () => {
  const input = { ...args, actionId: 'chat', pain: 45, painExact: 44.5, minutes: 60 };
  const whole = state.applyRest(input);
  const first = state.applyRest({ ...input, minutes: 30 });
  const second = state.applyRest({ ...input, minutes: 30, pain: first.painAfter, painExact: first.painExact,
    drive: first.driveAfter, driveExact: first.driveExact, restSaturationMinutes: first.restSaturationAfter });
  assert.ok(Math.abs(whole.driveExact - 47.39) < 1e-8);
  assert.ok(Math.abs(whole.driveExact - second.driveExact) < 1e-8);
  assert.ok(Math.abs(whole.mentalFactor - 0.7) < 1e-8);
});
