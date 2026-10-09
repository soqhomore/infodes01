/**
 * 게임 수치 상수 + 순수 계산 함수
 * DOM 접근 금지 — Node에서 sim으로 돌아야 한다.
 */

// ── 초기값 ──
export const INITIAL_PAIN = 15;
export const INITIAL_DRIVE = 45;
export const INITIAL_BUDGET = 8000;

// ── 이동 시 통증 증가 (턴 1~7) ──
export const MOVE_PAIN = [8, 9, 11, 12, 14, 16, 18];

// ── 이동 시 의지 기본 소모 ──
export const MOVE_DRIVE = -3;

// ── 통증 효율 구간 ──
const EFFICIENCY_TABLE = [
  { max: 39, value: 1.0 },
  { max: 69, value: 0.75 },
  { max: 100, value: 0.5 },
];

// ── 통증 패널티 구간 (체류 중 구간별 적용, 30분당 값) ──
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

// ── 하루 시간과 체류 길이 (로직 검증용 임시 수치) ──
export const DAY_START = 540; // 09:00
export const DAY_END = 1260; // 21:00
export const MEAL_TIME = 720; // 12:00 이후 첫 장소 선택 전
export const STAY_OPTIONS = [
  { name: '잠깐 머문다', minutes: 30 },
  { name: '충분히 머문다', minutes: 60 },
];

export const REST_BALANCE = {
  unitMinutes: 30, fullMinutes: 30, saturatedMinutes: 60, partialFactor: 0.4,
  walkRelief: 0.5, lowPain: 10, lowRecoveryFactor: 0.25,
  mindRate: 0.35, sufficientPain: 25, worthwhileRecovery: 6,
  overstayRecoveryFactor: 0.25, overstayDriveCost: 4,
};
export const JOURNEY_TIME = { multiplier: 3, min: 45, max: 90 };
export const SCENE_TIMING = { journey: 1500, outcome: 800, spacing: 3000, departure: 2500, fade: 180 };
export const DAY_PHASES = [
  { id: 'morning', label: '아침', start: DAY_START },
  { id: 'day', label: '낮', start: 720 },
  { id: 'sunset', label: '노을', start: 1020 },
  { id: 'night', label: '밤', start: 1140 },
];
export function getDayPhase(time) { return DAY_PHASES.findLast(phase => time >= phase.start) || DAY_PHASES[0]; }
export function getJourneyMinutes(card) {
  return Math.min(JOURNEY_TIME.max, Math.max(JOURNEY_TIME.min, card.walkMinutes * JOURNEY_TIME.multiplier));
}
const EPSILON = 1e-9;
const exactClamp = value => Math.max(0, Math.min(100, value));
// 외부 사건/디버그가 표시값을 변경했다면 그 값을 새 계산 기준으로 삼는다.
export const preciseStat = (display, exact) => Number.isFinite(exact) && clampStat(exact) === display ? exact : display;

/** 분 단위 시각을 "HH:MM" 문자열로 */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ── 행동 정의 ──
export const ACTIONS = {
  spacing:  { name: '멍때리기',   initiative: 1, recovery: 12, restMinutes: 30, spendRange: null,        condition: () => true },
  phone:    { name: '스마트폰',   initiative: 0, recovery: 8, restMinutes: 30, spendRange: null,        condition: () => true },
  dessert:  { name: '디저트',     initiative: 2, recovery: 8, restMinutes: 30, spendRange: [600, 1200], condition: (pain, budget) => budget >= 1200 },
  chat:     { name: '잡담',       initiative: 4, recovery: 6, restMinutes: 30, spendRange: null,        condition: (pain) => pain < 85 },
  plan:     { name: '계획 짜기',  initiative: 6, recovery: 4, restMinutes: 30, spendRange: null,        condition: (pain) => pain < 80 },
  wander:   { name: '돌아다니기', initiative: 7, recovery: 2, restMinutes: 30, spendRange: null,        condition: (pain, _budget, indoor) => pain < 65 && !indoor },
};

// ── 정오 이후 한 번의 식사 (휴식/만족감 계산과 분리) ──
export const MEAL_OPTIONS = {
  bench: { name: '바깥 벤치에서 간단히 먹기', spend: 800, minutes: 30 },
  indoor: { name: '실내 자리에서 천천히 먹기', spend: 1800, minutes: 60 },
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
    if (pain < row.max + 1) return row.value;
  }
  return 0.5;
}

/** 휴식 후 통증으로 패널티 조회 */
export function getPainPenalty(painAfter) {
  for (const row of PAIN_PENALTY_TABLE) {
    if (painAfter < row.max + 1) return row.value;
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
 * 식사. 생활 필요를 해결할 뿐 휴식 수치에는 관여하지 않는다.
 * @returns {{ budgetAfter: number, spend: number, option: string }}
 */
export function applyMeal({ budget, option }) {
  const meal = MEAL_OPTIONS[option];
  if (!meal) throw new Error(`알 수 없는 식사 선택: ${option}`);
  if (budget < meal.spend) throw new Error('식사 예산이 부족하다');
  return { budgetAfter: budget - meal.spend, spend: meal.spend, option };
}

/**
 * 휴식 효과 예측 — RNG·지출·상태 변경 없이 실제 실행과 같은 계산을 사용한다.
 * 정밀 통증/의지와 포화량은 다음 계산으로 이어지고, 표시값만 반올림한다.
 */
export function predictRest({ pain, drive, painExact, driveExact, actionId, card,
  restSaturationMinutes = 0, minutes = ACTIONS[actionId]?.restMinutes }) {
  const action = ACTIONS[actionId];
  if (!action || !Number.isFinite(minutes) || minutes <= 0) throw new Error('유효하지 않은 휴식 선택');
  const viewBonus = VIEW_BONUS[card.view];
  let p = preciseStat(pain, painExact);
  let d = preciseStat(drive, driveExact);
  let elapsed = 0;
  let mentalMinutes = 0;
  let overstayMinutes = 0;
  let overstayDriveCost = 0;
  // 효과가 달라지는 경계까지 정확히 적분한다. 호출 분할/반올림에 영향을 받지 않는다.
  while (elapsed < minutes - EPSILON) {
    const saturation = restSaturationMinutes + elapsed;
    const factor = saturation < REST_BALANCE.fullMinutes - EPSILON ? 1
      : saturation < REST_BALANCE.saturatedMinutes - EPSILON ? REST_BALANCE.partialFactor : 0;
    const probe = Math.max(0, p - EPSILON);
    const overstay = saturation >= REST_BALANCE.saturatedMinutes - EPSILON && probe <= REST_BALANCE.sufficientPain;
    const recoveryRate = p <= EPSILON ? 0 : action.recovery / REST_BALANCE.unitMinutes
      * getEfficiency(probe) * (probe < REST_BALANCE.lowPain ? REST_BALANCE.lowRecoveryFactor : 1)
      * (overstay ? REST_BALANCE.overstayRecoveryFactor : 1);
    let duration = minutes - elapsed;
    for (const boundary of [REST_BALANCE.fullMinutes, REST_BALANCE.saturatedMinutes]) {
      if (boundary > saturation + EPSILON) duration = Math.min(duration, boundary - saturation);
    }
    for (const boundary of [0, REST_BALANCE.lowPain, REST_BALANCE.sufficientPain, 40, 60, 70, 80]) {
      if (recoveryRate && p > boundary + EPSILON) duration = Math.min(duration, (p - boundary) / recoveryRate);
    }
    const mindRate = (REST_BALANCE.mindRate * (action.initiative + viewBonus) * factor
      + getPainPenalty(probe) - (overstay ? REST_BALANCE.overstayDriveCost : 0)) / REST_BALANCE.unitMinutes;
    if (overstay) overstayDriveCost += Math.min(d, duration * REST_BALANCE.overstayDriveCost / REST_BALANCE.unitMinutes);
    p = exactClamp(p - recoveryRate * duration);
    d = exactClamp(d + mindRate * duration);
    mentalMinutes += duration * factor;
    if (overstay) overstayMinutes += duration;
    elapsed += duration;
  }
  const painAfter = clampStat(p);
  const driveAfter = clampStat(d);
  const mentalFactor = mentalMinutes / minutes;
  const painPenalty = getPainPenalty(p);
  const rawSat = 3 + action.initiative / 2 + viewBonus / 2 + painPenalty / 2;
  return {
    painAfter, driveAfter, painExact: p, driveExact: d,
    painRecovered: pain - painAfter, driveDelta: driveAfter - drive,
    satisfaction: clampStat(Math.max(0, Math.min(10, rawSat)) * mentalFactor),
    efficiency: getEfficiency(pain), viewBonus, painPenalty, moneyBonus: 0,
    mentalFactor, restSaturationBefore: restSaturationMinutes,
    overstayMinutes, overstayDriveCost,
    restSaturationAfter: restSaturationMinutes + minutes,
  };
}

export function applyRest(args) {
  const result = predictRest(args);
  const spend = rollSpend(args.rng, ACTIONS[args.actionId].spendRange);
  return { ...result, spend, budgetAfter: args.budget - spend };
}

export function getRestAdvice(args) {
  const short = predictRest({ ...args, minutes: STAY_OPTIONS[0].minutes });
  const long = predictRest({ ...args, minutes: STAY_OPTIONS[1].minutes });
  const recommendation = short.painAfter <= REST_BALANCE.sufficientPain ? 'short'
    : long.painRecovered - short.painRecovered >= REST_BALANCE.worthwhileRecovery ? 'long' : 'other';
  return { recommendation, saturated: (args.restSaturationMinutes || 0) >= REST_BALANCE.saturatedMinutes,
    text: { short: '잠깐이면 충분해', long: '이번엔 푹 쉬는 게 좋아', other: '오래 쉬는 것보다 다른 행동도 살펴보자' }[recommendation] };
}
