/** 하루의 진행과 기록. DOM·타이머 없이 이동/체류/식사/사건을 처리한다. */
import {
  INITIAL_PAIN, INITIAL_DRIVE, INITIAL_BUDGET, DAY_START, DAY_END,
  MOVE_PAIN, MOVE_DRIVE, FORCE_REST_PAIN, STAY_OPTIONS, MEAL_TIME, MEAL_OPTIONS,
  ACTIONS, clampStat, applyRest, applyMeal, createTimelineEntry, REST_BALANCE, preciseStat, getJourneyMinutes,
} from './state.js';
import { downgradeView } from './events.js';

export function createDay() {
  return {
    pain: INITIAL_PAIN, drive: INITIAL_DRIVE, budget: INITIAL_BUDGET,
    painExact: INITIAL_PAIN, driveExact: INITIAL_DRIVE, restSaturationMinutes: 0,
    currentTime: DAY_START, turn: 0, currentVisitId: null, currentCard: null,
    visits: [], records: [], timeline: [], mealRecords: [], eventRecords: [],
    rainNextTurn: false, endReason: null,
  };
}

export function getDayEndReason(state) {
  if (state.pain >= 100) return 'pain';
  if (state.drive <= 0) return 'drive';
  if (state.endReason) return state.endReason;
  if (state.currentTime >= DAY_END) return 'time';
  return null;
}

export function canSpendTime(state, minutes) {
  return !getDayEndReason(state) && Number.isFinite(minutes) && minutes > 0 && state.currentTime + minutes <= DAY_END;
}

export function getMoveOption(state, nextCard) {
  let reason = '';
  if (getDayEndReason(state)) reason = '오늘의 여행이 끝났다';
  else if (!nextCard) reason = '이 길의 장소를 모두 둘러봤다';
  else if (state.pain >= FORCE_REST_PAIN) reason = '발이 아프다. 먼저 쉬어야 한다';
  else if (!canSpendTime(state, getJourneyMinutes(nextCard))) reason = '돌아갈 시간까지 이동하기 어렵다';
  return { available: !reason, reason };
}

export function getRestOptions(state, actionId) {
  const action = ACTIONS[actionId];
  return STAY_OPTIONS.map(option => {
    let reason = '';
    if (!state.currentCard) reason = '먼저 장소에 도착해야 한다';
    else if (!action) reason = '알 수 없는 행동';
    else if (!canSpendTime(state, option.minutes)) reason = '돌아갈 시간까지 머물기 어렵다';
    else if (!action.condition(state.pain, state.budget, state.currentCard.indoor)) {
      reason = action.spendRange && state.budget < action.spendRange[1] ? '돈이 부족하다'
        : actionId === 'wander' && state.currentCard.indoor ? '실내에서는 돌아다닐 수 없다' : '발이 너무 아프다';
    }
    return { ...option, available: !reason, reason };
  });
}

export function moveToPlace(state, sourceCard) {
  // 기존 방문이 없는 출발도 같은 규칙을 사용한다.
  const option = getMoveOption(state, sourceCard);
  if (!option.available) throw new Error(option.reason);
  const turn = state.visits.length + 1;
  const visitId = `visit-${turn}`;
  const card = { ...sourceCard, journey: { ...sourceCard.journey }, view: state.rainNextTurn ? downgradeView(sourceCard.view) : sourceCard.view };
  const walkMinutes = getJourneyMinutes(sourceCard);
  const startTime = state.currentTime;
  const entry = { ...createTimelineEntry({ turn, type: 'walk', startTime, minutes: walkMinutes, label: card.name }), visitId };
  const painExact = Math.min(100, preciseStat(state.pain, state.painExact) + MOVE_PAIN[Math.min(turn - 1, MOVE_PAIN.length - 1)]);
  const driveExact = Math.max(0, preciseStat(state.drive, state.driveExact) + MOVE_DRIVE);
  return {
    ...state, turn, currentVisitId: visitId, currentCard: card, currentTime: entry.endTime,
    pain: clampStat(painExact), drive: clampStat(driveExact), painExact, driveExact,
    restSaturationMinutes: Math.max(0, (state.restSaturationMinutes || 0) - walkMinutes * REST_BALANCE.walkRelief), rainNextTurn: false,
    visits: [...state.visits, { visitId, turn, card, walkMinutes, walkStartTime: startTime, arrivalTime: entry.endTime, eventResolved: false }],
    timeline: [...state.timeline, entry],
  };
}

export function restAtPlace(state, { actionId, minutes, rng }) {
  const option = getRestOptions(state, actionId).find(entry => entry.minutes === minutes);
  if (!option?.available) throw new Error(option?.reason || '유효하지 않은 체류 시간');
  const result = applyRest({ ...state, actionId, minutes, card: state.currentCard, rng });
  const restId = `rest-${state.records.length + 1}`;
  const visit = state.visits.find(entry => entry.visitId === state.currentVisitId);
  const entry = { ...createTimelineEntry({ turn: state.turn, type: 'rest', startTime: state.currentTime, minutes, label: ACTIONS[actionId].name }), visitId: visit.visitId, restId };
  const record = {
    restId, visitId: visit.visitId, turn: state.turn, skipped: false, card: { ...state.currentCard },
    action: actionId, spend: result.spend, painBefore: state.pain, painAfter: result.painAfter,
    painRecovered: result.painRecovered, driveBefore: state.drive, driveAfter: result.driveAfter,
    driveDelta: result.driveDelta, satisfaction: result.satisfaction, reasons: result,
    restSaturationBefore: result.restSaturationBefore, restSaturationAfter: result.restSaturationAfter,
    overstayMinutes: result.overstayMinutes, overstayDriveCost: result.overstayDriveCost,
    walkMinutes: visit.walkMinutes, arrivalTime: visit.arrivalTime, restMinutes: minutes,
    startTime: entry.startTime, endTime: entry.endTime,
  };
  return { ...state, pain: result.painAfter, drive: result.driveAfter, budget: result.budgetAfter,
    painExact: result.painExact, driveExact: result.driveExact, restSaturationMinutes: result.restSaturationAfter,
    currentTime: entry.endTime, records: [...state.records, record], timeline: [...state.timeline, entry] };
}

export function isMealDue(state) {
  return Boolean(state.currentCard) && state.currentTime >= MEAL_TIME && state.mealRecords.length === 0 && !getDayEndReason(state);
}

export function eatMeal(state, option) {
  const meal = MEAL_OPTIONS[option];
  if (!isMealDue(state) || !meal || !canSpendTime(state, meal.minutes)) throw new Error('지금은 식사할 수 없다');
  const result = applyMeal({ budget: state.budget, option });
  const entry = { ...createTimelineEntry({ turn: state.turn, type: 'meal', startTime: state.currentTime, minutes: meal.minutes, label: meal.name }), visitId: state.currentVisitId };
  return { ...state, budget: result.budgetAfter, currentTime: entry.endTime,
    mealRecords: [...state.mealRecords, { ...entry, spend: result.spend, option, card: { ...state.currentCard } }],
    timeline: [...state.timeline, entry] };
}

export function resolveJourneyEvent(state, event, choiceIndex) {
  const visit = state.visits.find(entry => entry.visitId === state.currentVisitId);
  if (!visit || visit.eventResolved || getDayEndReason(state)) return { state, effect: {} };
  const choice = event.hasChoice ? event.choices({ ...state, card: state.currentCard, turnNum: state.turn })[choiceIndex] : null;
  if (event.hasChoice && (!choice || choice.disabled)) throw new Error('선택할 수 없는 사건 응답');
  const effect = event.apply({ ...state, card: state.currentCard, turnNum: state.turn }, choiceIndex) || {};
  const purchased = event.id === 'limitedDessert' && choiceIndex === 0;
  const card = { ...state.currentCard, view: effect.viewOverride || state.currentCard.view };
  const record = {
    visitId: visit.visitId, turn: state.turn, type: purchased ? 'purchase' : event.journeyType,
    name: event.name, description: purchased ? '한정 디저트를 샀다.' : event.describe(),
    time: visit.walkStartTime + Math.floor(visit.walkMinutes / 2), location: card.name,
    ...(purchased ? { item: event.name, spend: state.budget - effect.budget } : {}),
  };
  return { effect, state: { ...state,
    pain: effect.pain ?? state.pain, drive: effect.drive ?? state.drive, budget: effect.budget ?? state.budget,
    painExact: effect.pain ?? state.painExact, driveExact: effect.drive ?? state.driveExact,
    rainNextTurn: effect.rainNextTurn ?? state.rainNextTurn, currentCard: card,
    visits: state.visits.map(entry => entry.visitId === visit.visitId ? { ...entry, card, eventResolved: true } : entry),
    eventRecords: [...state.eventRecords, record],
  } };
}

export function returnFromDay(state) {
  return { ...state, endReason: getDayEndReason(state) || 'returned' };
}
