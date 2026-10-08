import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, applyMeal } from '../src/state.js';

test('식사는 휴식 행동이 아니며 예산만 바꾼다', () => {
  assert.equal('meal' in ACTIONS, false);

  const result = applyMeal({ budget: 3000, option: 'bench' });
  assert.deepEqual(result, { budgetAfter: 2200, spend: 800, option: 'bench' });
});
