/**
 * 수치 시뮬레이션 (§11)
 * 이벤트 없이, 시드 10개 평균으로 6개 경로를 돌린다.
 * 행동이 잠기면 멍때리기(spacing)로 대체한다.
 */

import { createRng } from '../src/rng.js';
import { createDeck } from '../src/deck.js';
import {
  INITIAL_PAIN, INITIAL_DRIVE, INITIAL_BUDGET, MAX_TURNS,
  MOVE_PAIN, ACTIONS, FORCE_REST_PAIN,
  MEAL_TURN, applyMeal, applyRest, clampStat,
} from '../src/state.js';

// ── 경로별 행동 선택 규칙 ──

function wanderAllIn(pain, budget, card) {
  if (ACTIONS.wander.condition(pain, budget, card.indoor)) return 'wander';
  return fallback(pain, budget, card);
}

function smartMix(pain, budget, card) {
  if (pain >= 45) return 'spacing';
  if (!card.indoor && ACTIONS.wander.condition(pain, budget, card.indoor)) return 'wander';
  if (ACTIONS.plan.condition(pain)) return 'plan';
  return fallback(pain, budget, card);
}

function planFocused(pain, budget, card) {
  if (ACTIONS.plan.condition(pain)) return 'plan';
  return fallback(pain, budget, card);
}

function spendMoney(pain, budget, card) {
  if (ACTIONS.dessert.condition(pain, budget, card.indoor)) return 'dessert';
  return 'spacing';
}

function phoneOnly() {
  return 'phone';
}

/** 선택한 행동이 잠겨 있으면 spacing으로 대체 */
function fallback(pain, budget, card) {
  return 'spacing';
}

// ── 한 판 시뮬레이션 ──

function runGame(destination, pickAction, seed) {
  const rng = createRng(seed);
  const deck = createDeck(destination, rng);

  let pain = INITIAL_PAIN;
  let drive = INITIAL_DRIVE;
  let budget = INITIAL_BUDGET;
  const records = [];

  for (let t = 0; t < MAX_TURNS; t++) {
    const turnNum = t + 1;

    // 1. 이동
    pain = clampStat(pain + MOVE_PAIN[t]);
    const card = deck.draw();

    // 4턴 식사는 생활비이며, 휴식 수치에는 영향을 주지 않는다.
    if (turnNum === MEAL_TURN) budget = applyMeal({ budget, option: 'bench' }).budgetAfter;

    // (이벤트 없음)

    // 엔딩 체크
    if (drive <= 0 || pain >= 100) break;

    // 통증 80 이상이면 강제 휴식
    const mustRest = pain >= FORCE_REST_PAIN;

    // 쉴까? — 시뮬에서는 항상 쉰다
    // (지나치기 경로가 없으므로 항상 쉰다)

    // 행동 선택
    let actionId = pickAction(pain, budget, card);

    // 선택한 행동이 잠겨 있으면 spacing
    if (!ACTIONS[actionId].condition(pain, budget, card.indoor)) {
      actionId = 'spacing';
    }

    const result = applyRest({ pain, drive, budget, actionId, card, rng });

    records.push({
      turn: t + 1,
      skipped: false,
      card,
      action: actionId,
      spend: result.spend,
      painBefore: pain,
      painAfter: result.painAfter,
      painRecovered: result.painRecovered,
      driveBefore: drive,
      driveAfter: result.driveAfter,
      driveDelta: result.driveDelta,
      satisfaction: result.satisfaction,
    });

    pain = result.painAfter;
    drive = result.driveAfter;
    budget = result.budgetAfter;

    // 엔딩 체크
    if (drive <= 0 || pain >= 100) break;
  }

  return { drive, pain, records };
}

// ── 경로 정의 ──

const ROUTES = [
  { name: '돌아다니기 올인', dest: 'beach', pick: wanderAllIn },
  { name: '영리한 혼합 (마을)', dest: 'village', pick: smartMix },
  { name: '계획 위주', dest: 'village', pick: planFocused },
  { name: '영리한 혼합 (도시)', dest: 'city', pick: smartMix },
  { name: '돈 쓰기', dest: 'city', pick: spendMoney },
  { name: '스마트폰만', dest: 'city', pick: phoneOnly },
];

const SEED_COUNT = 10;
const BASE_SEED = 1000;

// ── 실행 ──

console.log('=== 개복치 휴식 시뮬레이터 — 수치 검증 ===\n');

for (const route of ROUTES) {
  let sumDrive = 0, sumPain = 0, sumSat = 0, totalTurns = 0;

  for (let i = 0; i < SEED_COUNT; i++) {
    const { drive, pain, records } = runGame(route.dest, route.pick, BASE_SEED + i);
    sumDrive += drive;
    sumPain += pain;
    const satSum = records.reduce((s, r) => s + r.satisfaction, 0);
    const satAvg = records.length > 0 ? satSum / records.length : 0;
    sumSat += satAvg;
    totalTurns += records.length;
  }

  const avgDrive = Math.round(sumDrive / SEED_COUNT * 10) / 10;
  const avgPain = Math.round(sumPain / SEED_COUNT * 10) / 10;
  const avgSat = Math.round(sumSat / SEED_COUNT * 10) / 10;

  console.log(`• ${route.name} (${route.dest})`);
  console.log(`  의지 ${avgDrive} / 통증 ${avgPain} / 만족감 ${avgSat}`);
  console.log();
}

console.log('식사는 모든 경로에서 4턴에 ¥800으로 동일 처리되어 휴식 비교에서 제외됨');
