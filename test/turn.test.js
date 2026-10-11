import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneElement } from './helpers/scene-dom.js';
import { createDay } from '../src/day.js';
import { createRng } from '../src/rng.js';
import { SCENE_TIMING, DAY_END } from '../src/state.js';

globalThis.window = { location: { search: '' } };
globalThis.document = { createElement: () => new SceneElement() };
const { showTurn } = await import('../src/scenes/turn.js');

const card = { id: 'river', name: '강변', view: 'wide', indoor: false, walkMinutes: 20,
  journey: { route: '강을 따라 걸었다.', sight: '물새를 보았다.' } };
function start(t, overrides = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const app = new SceneElement();
  let nextState;
  const cleanup = showTurn(app, { ...createDay(), rng: createRng(123), usedEvents: new Set(), eventSlots: [],
    deck: { peek: () => card, draw: () => card }, ...overrides }, (_scene, state) => { nextState = state; });
  t.after(cleanup);
  const wrap = app.children[0];
  wrap.click();
  wrap.querySelector('.turn-info').click();
  return { wrap, cleanup, state: () => nextState };
}

test('첫 휴식은 30분이고 결과는 자동으로 사라지지 않는다', t => {
  const { wrap, state } = start(t);
  wrap.button('스마트폰').click();
  assert.match(wrap.innerHTML, /30분 쉬었어요/);
  t.mock.timers.tick(SCENE_TIMING.outcome + SCENE_TIMING.spacing);
  assert.match(wrap.innerHTML, /30분 쉬었어요/);
  wrap.button('돌아간다').click();
  assert.equal(state().records.length, 1);
  assert.equal(state().records[0].restMinutes, 30);
});

test('같은 행동의 추가 휴식은 과제 없이 진행되고 연타·타이머가 중복 적용하지 않는다', t => {
  const { wrap, state } = start(t);
  wrap.button('잡담').click();
  wrap.button('먼저 듣는다').click();
  const extend = wrap.button('30분 더 쉬기');
  extend.click(); extend.click();
  assert.equal(wrap.buttons().some(el => el.textContent === '먼저 듣는다'), false);
  const skip = wrap.button('넘기기');
  skip.click(); skip.click();
  t.mock.timers.tick(SCENE_TIMING.outcome);
  wrap.button('돌아간다').click();
  assert.equal(state().records.length, 2);
  assert.equal(state().records[1].action, 'chat');
  assert.equal(state().records[1].restMinutes, 30);
  assert.equal(state().restSaturationMinutes, 60);
});

test('첫 휴식의 취소와 씬 정리는 대기 타이머의 휴식 적용을 막는다', t => {
  const { wrap, state, cleanup } = start(t);
  wrap.button('멍때리기').click();
  wrap.button('취소').click();
  t.mock.timers.tick(SCENE_TIMING.spacing);
  wrap.button('돌아간다').click();
  assert.equal(state().records.length, 0);
  cleanup();
});

test('휴식 뒤 정오가 되면 추가 휴식 전에 식사를 선택한다', t => {
  const { wrap } = start(t, { currentTime: 630 });
  wrap.button('스마트폰').click();
  assert.match(wrap.innerHTML, /30분 쉬었어요/);
  assert.equal(wrap.buttons().some(el => el.textContent.startsWith('30분 더 쉬기')), false);
  wrap.button('식사하기').click();
  wrap.button('바깥 벤치').click();
  t.mock.timers.tick(SCENE_TIMING.outcome);
  assert.ok(wrap.button('30분 더 쉬기'));
});

test('휴식으로 종료 시각에 도달하면 끝낸다', t => {
  const { wrap, state } = start(t, { currentTime: DAY_END - 90, mealRecords: [{ option: 'bench' }] });
  wrap.button('스마트폰').click();
  t.mock.timers.tick(SCENE_TIMING.outcome);
  assert.equal(state().currentTime, DAY_END);
  assert.equal(state().records.length, 1);
});

test('남은 시간이 30분 미만이면 휴식을 막고 이유를 표시한다', t => {
  const { wrap, state } = start(t, { currentTime: DAY_END - 80, mealRecords: [{ option: 'bench' }] });
  const rest = wrap.button('스마트폰');
  assert.equal(rest.disabled, true);
  assert.match(rest.textContent, /돌아갈 시간까지 머물기 어렵다/);
  rest.click();
  wrap.button('돌아간다').click();
  assert.equal(state().records.length, 0);
});

test('유료 휴식 뒤 예산이 부족하면 추가 휴식을 막고 비용 범위도 표시한다', t => {
  const { wrap, state } = start(t, { budget: 1200 });
  wrap.button('디저트').click();
  const extend = wrap.button('30분 더 쉬기');
  assert.equal(extend.disabled, true);
  assert.match(extend.textContent, /¥600~¥1,200/);
  assert.equal(extend.children[0].textContent, '돈이 부족하다');
  extend.click();
  wrap.button('돌아간다').click();
  assert.equal(state().records.length, 1);
});

test('추가 휴식 예측은 포화와 체류 부담을 반영하고 행동 변경으로 초기화되지 않는다', t => {
  const { wrap, state } = start(t);
  wrap.button('스마트폰').click();
  wrap.button('30분 더 쉬기').click();
  t.mock.timers.tick(SCENE_TIMING.outcome);
  const extend = wrap.button('30분 더 쉬기');
  assert.match(extend.children[0].textContent, /마음 여유 약 -4/);
  assert.match(wrap.querySelector('.rest-context').innerHTML, /위 예상 변화에 포함/);
  wrap.button('다른 행동으로 쉬기').click();
  wrap.button('잡담').click();
  wrap.button('먼저 말한다').click();
  wrap.button('돌아간다').click();
  assert.equal(state().restSaturationMinutes, 90);
  assert.equal(state().records[2].driveDelta, -4);
});

test('추가 휴식 중 씬을 정리하면 타이머와 이전 버튼이 결과를 적용하지 않는다', t => {
  const { wrap, cleanup } = start(t);
  wrap.button('스마트폰').click();
  wrap.button('30분 더 쉬기').click();
  const pending = wrap.innerHTML;
  const skip = wrap.button('넘기기');
  cleanup();
  skip.click();
  t.mock.timers.tick(SCENE_TIMING.outcome);
  assert.equal(wrap.innerHTML, pending);
});
