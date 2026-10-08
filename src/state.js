/**
 * 게임 수치 상수 + 순수 계산 함수
 * DOM 접근 금지 — Node에서 sim으로 돌아야 한다.
 */

// ── 초기값 ──
export const INITIAL_PAIN = 15;
export const INITIAL_DRIVE = 45;
export const INITIAL_BUDGET = 8000;
export const MAX_TURNS = 7;

// ── 이동 시 통증 증가 (턴 1~7) ──
export const MOVE_PAIN = [8, 9, 11, 12, 14, 16, 18];

// ── 지나치기 추가 통증 ──
export const SKIP_PAIN = 4;

// ── 지나치기 의지 기본 감소 ──
export const SKIP_DRIVE_BASE = -3;

// ── 휴식 의지 기본 감소 ──
export const REST_DRIVE_BASE = -3;

// ── 통증 효율 구간 ──
const EFFICIENCY_TABLE = [
  { max: 39, value: 1.0 },
  { max: 69, value: 0.75 },
  { max: 100, value: 0.5 },
];

// ── 통증 패널티 구간 (휴식 후 통증 기준) ──
const PAIN_PENALTY_TABLE = [
  { max: 39, value: 0 },
  { max: 59, value: -3 },
  { max: 79, value: -6 },
  { max: 100, value: -10 },
];

// ── 시야 보너스 ──
export const VIEW_BONUS = {
  narrow: 1,
  mid: 3,
  wide: 7,
};

// ── 시야 clip-path 폭 (%) ──
export const VIEW_CLIP = {
  narrow: 40,
  mid: 70,
  wide: 100,
};

// ── 하루 시간 (서사용, 수치 영향 없음) ──
export const DAY_START = 600; // 10:00 = 600분

/** 분 단위 시각을 "HH:MM" 문자열로 */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ── 행동 정의 ──
export const ACTIONS = {
  spacing:  { name: '멍때리기',   initiative: 1, recovery: 14, restMinutes: 25, spendRange: null,        condition: () => true },
  phone:    { name: '스마트폰',   initiative: 0, recovery: 12, restMinutes: 15, spendRange: null,        condition: () => true },
  dessert:  { name: '디저트',     initiative: 2, recovery: 9,  restMinutes: 20, spendRange: [600, 1200], condition: (pain, budget) => budget >= 1200 },
  chat:     { name: '잡담',       initiative: 4, recovery: 10, restMinutes: 20, spendRange: null,        condition: (pain) => pain < 85 },
  plan:     { name: '계획 짜기',  initiative: 6, recovery: 5,  restMinutes: 15, spendRange: null,        condition: (pain) => pain < 80 },
  wander:   { name: '돌아다니기', initiative: 7, recovery: 3,  restMinutes: 25, spendRange: null,        condition: (pain, _budget, indoor) => pain < 65 && !indoor },
};

// ── 4턴 고정 식사 (휴식/만족감 계산과 분리) ──
export const MEAL_TURN = 4;
export const MEAL_OPTIONS = {
  bench: { name: '바깥 벤치에서 간단히 먹기', spend: 800, minutes: 20 },
  indoor: { name: '실내 자리에서 천천히 먹기', spend: 1800, minutes: 30 },
};

// ── 통증 80 이상이면 지나치기 불가 ──
export const FORCE_REST_PAIN = 80;

// ── 유틸 ──

/** 반올림 후 0~100 클램프 */
export function clampStat(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** 통증 구간에서 효율 조회 */
export function getEfficiency(pain) {
  for (const row of EFFICIENCY_TABLE) {
    if (pain <= row.max) return row.value;
  }
  return 0.5;
}

/** 휴식 후 통증으로 패널티 조회 */
export function getPainPenalty(painAfter) {
  for (const row of PAIN_PENALTY_TABLE) {
    if (painAfter <= row.max) return row.value;
  }
  return -10;
}

/**
 * 지출 금액 계산 (100엔 단위)
 * spendRange가 null이면 0
 */
export function rollSpend(rng, spendRange) {
  if (!spendRange) return 0;
  const [min, max] = spendRange;
  const steps = (max - min) / 100;
  return min + rng.int(0, steps) * 100;
}

/** 결과 타임라인에 남길 연속 시간 구간 */
export function createTimelineEntry({ turn, type, startTime, minutes, label }) {
  return { turn, type, startTime, endTime: startTime + minutes, label };
}

/**
 * 4턴 고정 식사. 생활 필요를 해결할 뿐 휴식 수치에는 관여하지 않는다.
 * @returns {{ budgetAfter: number, spend: number, option: string }}
 */
export function applyMeal({ budget, option }) {
  const meal = MEAL_OPTIONS[option];
  if (!meal) throw new Error(`알 수 없는 식사 선택: ${option}`);
  if (budget < meal.spend) throw new Error('식사 예산이 부족하다');
  return { budgetAfter: budget - meal.spend, spend: meal.spend, option };
}

/**
 * 휴식 실행 — 순수 함수
 * @returns {{ painAfter, driveAfter, budgetAfter, painRecovered, driveDelta, spend, satisfaction, efficiency, viewBonus, painPenalty, moneyBonus }}
 */
export function applyRest({ pain, drive, budget, actionId, card, rng }) {
  const action = ACTIONS[actionId];
  const viewBonus = VIEW_BONUS[card.view];

  // 통증 회복
  const efficiency = getEfficiency(pain);
  const painRecovered = Math.round(action.recovery * efficiency);
  const painAfter = clampStat(pain - painRecovered);

  // 지출
  const spend = rollSpend(rng, action.spendRange);
  const budgetAfter = budget - spend;
  const moneyBonus = spend > 0 ? 1 : 0;

  // 의지
  const painPenalty = getPainPenalty(painAfter);
  const driveDelta = REST_DRIVE_BASE + action.initiative + viewBonus + moneyBonus + painPenalty;
  const driveAfter = clampStat(drive + driveDelta);

  // 만족감
  const rawSat = 3 + action.initiative / 2 + viewBonus / 2 + moneyBonus + painPenalty / 2;
  const satisfaction = Math.max(0, Math.min(10, Math.round(rawSat)));

  return {
    painAfter,
    driveAfter,
    budgetAfter,
    painRecovered,
    driveDelta,
    spend,
    satisfaction,
    efficiency,
    viewBonus,
    painPenalty,
    moneyBonus,
  };
}

/**
 * 지나치기 — 순수 함수
 * @returns {{ painAfter, driveAfter }}
 */
export function applySkip({ pain, drive }) {
  const painAfter = clampStat(pain + SKIP_PAIN);
  const painPenalty = getPainPenalty(painAfter);
  const driveDelta = SKIP_DRIVE_BASE + painPenalty;
  const driveAfter = clampStat(drive + driveDelta);
  return { painAfter, driveAfter, driveDelta };
}
