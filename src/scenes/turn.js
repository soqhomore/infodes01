/** 이동 → 사건 → 도착 → 머물기 / 다음 장소 / 돌아가기 */
import { ACTIONS, DAY_END, MEAL_OPTIONS, VIEW_CLIP, STAY_OPTIONS, formatTime, predictRest, getJourneyMinutes, getDayPhase, SCENE_TIMING } from '../state.js';
import { daylightHTML } from '../daylight.js';
import {
  moveToPlace, restAtPlace, eatMeal, resolveJourneyEvent, returnFromDay,
  getDayEndReason, getMoveOption, getRestOptions, isMealDue, canSpendTime,
} from '../day.js';
import { updateDebug } from '../debug.js';
import { pickEvent, downgradeView } from '../events.js';
import { showEnding } from './ending.js';

const JOURNEY_MS = SCENE_TIMING.journey;
const AUTO_NEXT_MS = SCENE_TIMING.outcome;
const SPACING_MS = SCENE_TIMING.spacing;
const REST_MINUTES = STAY_OPTIONS[0].minutes;
const budgetText = value => `¥${value.toLocaleString()}`;
const signed = value => `${value >= 0 ? '+' : ''}${value}`;
const viewText = view => ({ wide: '열린 시야', mid: '중간 시야', narrow: '좁은 시야' })[view];

function fishSVG(className = 'place-fish') {
  return `<svg class="${className}" viewBox="0 0 72 48" aria-hidden="true"><ellipse cx="38" cy="24" rx="23" ry="16" fill="#5ba3d9"/><path d="M17 24 3 10v28z" fill="#3a7cbd"/><circle cx="45" cy="19" r="3" fill="#fff"/><circle cx="46" cy="19" r="1.4" fill="#222"/></svg>`;
}

export function showTurn(app, ctx, goto) {
  const nextCard = ctx.deck.peek();
  const moveOption = getMoveOption(ctx, nextCard);
  if (!moveOption.available) { goto(showEnding, returnFromDay(ctx)); return null; }
  let state = moveToPlace(ctx, ctx.deck.draw());
  const wrap = document.createElement('div');
  wrap.className = 'scene turn';
  app.appendChild(wrap);
  let locked = false;
  let disposed = false;
  let timers = [];
  let listeners = [];
  let lastRest = null;

  const clearPhase = () => {
    timers.forEach(clearTimeout);
    listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    timers = []; listeners = [];
  };
  const cleanup = () => { disposed = true; locked = true; clearPhase(); };
  const later = (fn, ms) => { timers.push(setTimeout(() => { if (!disposed) fn(); }, ms)); };
  const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push({ el, type, fn }); };
  const leave = (scene, nextState = state) => { cleanup(); goto(scene, nextState); };
  const endIfNeeded = () => {
    if (!getDayEndReason(state)) return false;
    leave(showEnding); return true;
  };

  function statsHTML(changes) {
    const delta = key => changes[key] === undefined || changes[key] === 0 ? '' : `<span class="stat-delta delta-${key}">${signed(changes[key])}</span>`;
    return `<div class="day-clock"><strong>${formatTime(state.currentTime)}</strong><span>${formatTime(DAY_END)}에 돌아간다 · 남은 ${DAY_END - state.currentTime}분</span></div><div class="stats">
      <div class="stat"><span class="stat-label">통증</span><div class="stat-bar"><div class="stat-fill pain-fill" style="width:${state.pain}%"></div></div><span class="stat-value">${state.pain}</span>${delta('pain')}</div>
      <div class="stat"><span class="stat-label">마음의 여유</span><div class="stat-bar"><div class="stat-fill drive-fill" style="width:${state.drive}%"></div></div><span class="stat-value">${state.drive}</span>${delta('drive')}</div>
      <div class="stat-budget">${budgetText(state.budget)}${changes.budget ? ` <span class="delta-budget">−${budgetText(-changes.budget)}</span>` : ''}</div></div>`;
  }

  function placeHTML() {
    const card = state.currentCard;
    return `<div class="place-stage view-${card.view}"><div class="place-density density-${card.view}"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="place-window" style="--view-width:${VIEW_CLIP[card.view]}%"><div class="place-landscape">${fishSVG()}<span class="place-horizon"></span></div></div><div class="place-caption"><strong>${card.name}</strong><span>${card.indoor ? '실내' : '실외'} · ${viewText(card.view)}</span></div></div>`;
  }

  function render(body, { journey = false, changes = {} } = {}) {
    clearPhase(); locked = false;
    const visit = state.visits.at(-1);
    const route = state.currentCard.journey;
    const stage = journey ? `<div class="journey-stage"><div class="journey-meta">${formatTime(visit.walkStartTime)} → ${formatTime(visit.arrivalTime)} · ${visit.walkMinutes}분 걸음</div><div class="journey-line"><span></span></div><p class="journey-route">${route.route}</p><p class="journey-sight">${route.sight}</p></div>` : placeHTML();
    wrap.className = `scene turn day-phase-${getDayPhase(state.currentTime).id}`;
    wrap.innerHTML = `${daylightHTML(state.currentTime)}${statsHTML(changes)}${stage}${body}`;
    updateDebug('방문', state.visits.length);
    updateDebug('쉼', state.records.length);
    updateDebug('시각', formatTime(state.currentTime));
    updateDebug('카드', `${state.currentCard.name} (${state.currentCard.view})`);
  }

  function addButton(parent, label, action, { disabled = false, className = '', detail = '' } = {}) {
    const button = document.createElement('button');
    button.className = `btn ${className}`; button.textContent = label; button.disabled = disabled;
    if (detail) {
      const description = document.createElement('span');
      description.className = 'choice-detail'; description.textContent = detail;
      button.appendChild(description);
    }
    on(button, 'click', () => { if (locked || disposed || disabled) return; locked = true; action(); });
    parent.appendChild(button); return button;
  }

  function timedOutcome(next) {
    locked = true;
    let completed = false;
    const finish = () => { if (completed || disposed) return; completed = true; next(); };
    on(wrap.querySelector('.outcome-panel'), 'click', finish);
    later(finish, AUTO_NEXT_MS);
  }

  function showJourney() {
    render('<p class="pressure-copy">탭하면 이동 장면을 넘긴다.</p>', { journey: true });
    const finish = () => {
      if (locked || disposed) return;
      locked = true;
      if (getDayEndReason(state)) return showPlace();
      const event = pickEvent(state.turn, state.eventSlots,
        { ...state, card: state.currentCard, turnNum: state.turn }, state.usedEvents, state.rng);
      if (event) { state.usedEvents.add(event.id); showEvent(event); }
      else showPlace();
    };
    on(wrap, 'click', finish);
    later(finish, JOURNEY_MS);
  }

  function showPlace() {
    render(`<div class="turn-info"><p>${state.currentCard.name}에 도착했다.</p><p class="pressure-copy">${state.visits.at(-1).walkMinutes}분 걸음 · ${state.visits.length}번째 장소</p></div>`);
    const finish = () => { if (locked || disposed) return; locked = true; proceedContext(); };
    on(wrap.querySelector('.turn-info'), 'click', finish);
    later(finish, AUTO_NEXT_MS);
  }

  function showEvent(event) {
    render(`<div class="event-box"><div class="event-kicker">여행 중 만난 일</div><div class="event-name">${event.name}</div><div class="event-desc">${event.describe()}</div></div><div class="choice-buttons"></div>`, { journey: true });
    const choices = event.hasChoice ? event.choices({ ...state, card: state.currentCard, turnNum: state.turn }) : [{ label: '계속한다' }];
    for (const [index, choice] of choices.entries()) {
      addButton(wrap.querySelector('.choice-buttons'), `${choice.label}${choice.disabledReason ? ` · ${choice.disabledReason}` : ''}`, () => {
        const before = state;
        const result = resolveJourneyEvent(state, event, event.hasChoice ? index : null);
        state = result.state;
        if (result.effect.promoteWidest) state.deck.promoteWidest();
        const changes = { pain: state.pain - before.pain, drive: state.drive - before.drive, budget: state.budget - before.budget };
        render(`<div class="outcome-panel"><strong>${event.name}</strong><p>${changes.budget ? `예산 −${budgetText(-changes.budget)}` : `통증 ${signed(changes.pain)} / 마음의 여유 ${signed(changes.drive)}`}</p></div>`, { journey: true, changes });
        timedOutcome(() => endIfNeeded() || showPlace());
      }, { disabled: choice.disabled });
    }
  }

  function proceedContext() {
    if (endIfNeeded()) return;
    if (isMealDue(state)) return showMeal();
    if (lastRest) showRestDecision();
    else showActions();
  }

  function showMeal() {
    render('<div class="meal-panel"><strong>식사 시간</strong><p>점심때가 됐다. 식사도 오늘의 시간에 남긴다.</p></div><div class="meal-choices"></div>');
    for (const [id, meal] of Object.entries(MEAL_OPTIONS)) {
      const available = state.budget >= meal.spend && canSpendTime(state, meal.minutes);
      addButton(wrap.querySelector('.meal-choices'), `${meal.name} · ${meal.minutes}분 · ${budgetText(meal.spend)}${available ? '' : ' · 시간 또는 예산 부족'}`, () => {
        state = eatMeal(state, id);
        render(`<div class="outcome-panel meal-outcome"><strong>${meal.name}</strong><p>${meal.minutes}분 · 예산 −${budgetText(meal.spend)}</p><small>식사는 휴식 비교에서 별도로 남긴다.</small></div>`);
        timedOutcome(proceedContext);
      }, { disabled: !available });
    }
    addButton(wrap, '돌아간다', () => leave(showEnding, returnFromDay(state)));
  }

  function showDecision() {
    if (lastRest) showRestDecision();
    else showActions();
  }

  function spendCopy(actionId) {
    const range = ACTIONS[actionId].spendRange;
    return range ? ` · ${budgetText(range[0])}~${budgetText(range[1])}` : '';
  }

  function addMoveButton(parent, className = '') {
    const next = state.deck.peek();
    const move = getMoveOption(state, next);
    const previewView = next && (state.rainNextTurn ? downgradeView(next.view) : next.view);
    addButton(parent, '다음 장소로 가기', () => leave(showTurn), {
      disabled: !move.available, className,
      detail: next ? `${next.name} · ${getJourneyMinutes(next)}분 이동 · ${viewText(previewView)}${move.reason ? ` · ${move.reason}` : ''}` : move.reason,
    });
  }

  function showActions() {
    render(`<div class="turn-info"><p class="action-prompt">${lastRest ? '다른 방식으로 쉬어 볼까?' : '여기에서 쉬거나, 다음 풍경을 볼까?'}</p><p class="pressure-copy">한 번에 ${REST_MINUTES}분 쉬고, 더 머물지는 쉰 뒤에 정한다.</p></div><div class="action-buttons"></div><div class="day-choices travel-choices"></div>`);
    for (const [id, action] of Object.entries(ACTIONS)) {
      const option = getRestOptions(state, id)[0];
      addButton(wrap.querySelector('.action-buttons'), `${action.name} · ${REST_MINUTES}분 쉬기${spendCopy(id)}${option.available ? '' : ` · ${option.reason}`}`, () => launchAction(id, REST_MINUTES), { disabled: !option.available, className: 'btn-action' });
    }
    const choices = wrap.querySelector('.travel-choices');
    if (lastRest) addButton(choices, '휴식 결과로 돌아가기', showRestDecision, { className: 'btn-return' });
    addMoveButton(choices);
    addButton(choices, '돌아간다', () => leave(showEnding, returnFromDay(state)), { className: 'btn-return' });
  }

  function showRestDecision() {
    const record = lastRest;
    const reason = record.overstayMinutes > 0 ? '몸이 충분히 쉰 뒤에도 머물러 마음에 체류 부담이 생겼다.'
      : record.reasons.mentalFactor < 1 ? '쉬어 온 시간이 쌓여 마음의 추가 회복 효과가 줄었다.'
      : '몸의 회복과 마음의 환기는 서로 다를 수 있다.';
    render(`<div class="outcome-panel rest-summary" role="status"><strong>${REST_MINUTES}분 쉬었어요</strong><p>${ACTIONS[record.action].name} · ${formatTime(record.startTime)} → ${formatTime(record.endTime)}</p><div class="rest-changes"><p>통증 ${record.painBefore} → ${record.painAfter} <small>(${signed(record.painAfter - record.painBefore)})</small></p><p>마음의 여유 ${record.driveBefore} → ${record.driveAfter} <small>(${signed(record.driveDelta)})</small></p></div><small>${reason}<br>이번 쉼의 마음 환기 ${record.satisfaction}/10${record.spend ? `<br>이번 지출 ${budgetText(record.spend)}` : ''}</small></div><div class="turn-info"><p class="action-prompt">지금은 더 쉬고 싶어, 다른 풍경을 보고 싶어?</p></div><div class="day-choices rest-choices"></div><div class="rest-context"></div><div class="day-choices rest-secondary"></div>`);
    const choices = wrap.querySelector('.rest-choices');
    const secondary = wrap.querySelector('.rest-secondary');
    if (isMealDue(state)) {
      addButton(choices, '식사하기', showMeal, { detail: '점심때가 됐다. 다음 선택 전에 식사한다.' });
    } else {
      const option = getRestOptions(state, record.action)[0];
      const prediction = predictRest({ ...state, actionId: record.action, card: state.currentCard, minutes: REST_MINUTES });
      addButton(choices, `${REST_MINUTES}분 더 쉬기${spendCopy(record.action)}`, () => continueRest(record.action), {
        disabled: !option.available, className: 'btn-rest-decision',
        detail: option.available ? `${formatTime(state.currentTime + REST_MINUTES)}까지 · 통증 약 −${prediction.painRecovered} · 마음 여유 약 ${signed(prediction.driveDelta)}` : option.reason,
      });
      addMoveButton(choices, 'btn-rest-decision');
      if (option.available && prediction.overstayMinutes > 0) {
        wrap.querySelector('.rest-context').innerHTML = `<p class="overstay-warning">추가 휴식 중 약 ${prediction.overstayMinutes.toFixed(0)}분은 몸이 충분히 쉰 뒤의 체류다. 마음 부담 −${prediction.overstayDriveCost.toFixed(1)}은 위 예상 변화에 포함돼 있다.</p>`;
      } else if (option.available && prediction.mentalFactor < 1) {
        wrap.querySelector('.rest-context').innerHTML = '<p class="pressure-copy">쉬어 온 시간이 쌓여 추가 휴식의 마음 회복 효과는 줄어든다.</p>';
      }
      addButton(secondary, '다른 행동으로 쉬기', showActions, { className: 'btn-return' });
    }
    addButton(secondary, '돌아간다', () => leave(showEnding, returnFromDay(state)), { className: 'btn-return' });
  }

  function continueRest(id) {
    render(`<div class="micro-task"><strong>${ACTIONS[id].name} · ${REST_MINUTES}분 더 쉬기</strong><p>개복치와 조금 더 머문다.</p><small>넘겨도 ${REST_MINUTES}분의 휴식이 적용된다.</small></div>`);
    let completed = false;
    const finish = () => {
      if (completed || disposed) return;
      completed = true; locked = true; doAction(id, REST_MINUTES);
    };
    later(finish, AUTO_NEXT_MS);
    addButton(wrap, '넘기기', finish);
  }

  function launchAction(id, minutes) {
    if (id === 'plan') return showMicroTask('지금 가장 먼저 할 일을 고른다.', ['물 마시기', '길 확인하기', '잠시 앉기'], id, minutes);
    if (id === 'chat') return showMicroTask('어떤 쪽으로 마음을 열까?', ['먼저 듣는다', '먼저 말한다'], id, minutes);
    if (id === 'spacing') {
      render(`<div class="micro-task"><strong>멍때리기 · ${minutes}분</strong><p>잠시 아무것도 하지 않기로 했다.</p><p class="spacing-hint">개복치도 함께 머문다.</p></div>`);
      later(() => doAction(id, minutes), SPACING_MS);
      addButton(wrap, '넘기기', () => doAction(id, minutes), { detail: `넘겨도 ${minutes}분의 휴식이 적용된다.` });
      addButton(wrap, '취소', showDecision, { className: 'btn-return' });
      return;
    }
    if (id === 'wander') return showWander(minutes);
    doAction(id, minutes);
  }

  function showMicroTask(copy, options, id, minutes) {
    render(`<div class="micro-task"><strong>${ACTIONS[id].name} · ${minutes}분</strong><p>${copy}</p><div class="priority-options"></div></div>`);
    for (const label of options) addButton(wrap.querySelector('.priority-options'), label, () => doAction(id, minutes));
    addButton(wrap, '취소', showDecision, { className: 'btn-return' });
  }

  function showWander(minutes) {
    render(`<div class="wander-track"><p>돌아다니기 · ${minutes}분</p><p class="spacing-hint">개복치와 함께 길 끝까지 걸어 본다.</p><div class="wander-rail">${fishSVG('wander-fish')}<b>→</b></div></div>`);
    const rail = wrap.querySelector('.wander-rail');
    const fish = wrap.querySelector('.wander-fish');
    let dragging = false; let startX = 0;
    on(fish, 'pointerdown', event => { if (locked) return; dragging = true; startX = event.clientX; fish.setPointerCapture(event.pointerId); });
    on(fish, 'pointermove', event => {
      if (!dragging || locked) return;
      const max = rail.getBoundingClientRect().width - fish.getBoundingClientRect().width;
      const distance = Math.max(0, Math.min(max, event.clientX - startX));
      fish.style.transform = `translateX(${distance}px)`;
      if (max > 0 && distance >= max - 3) { dragging = false; locked = true; doAction('wander', minutes); }
    });
    const release = () => { dragging = false; fish.style.transform = ''; };
    on(fish, 'pointerup', release); on(fish, 'pointercancel', release);
    addButton(wrap, '넘기기', () => doAction('wander', minutes), { detail: `넘겨도 ${minutes}분의 휴식이 적용된다.` });
    addButton(wrap, '취소', showDecision, { className: 'btn-return' });
  }

  function doAction(id, minutes) {
    if (disposed) return;
    const before = state;
    state = restAtPlace(state, { actionId: id, minutes, rng: state.rng });
    const record = state.records.at(-1);
    lastRest = record;
    const changes = { pain: state.pain - before.pain, drive: state.drive - before.drive, budget: state.budget - before.budget };
    updateDebug('만족감', record.satisfaction);
    if (getDayEndReason(state)) {
      render(`<div class="outcome-panel"><strong>${minutes}분 쉬었어요</strong><p>통증 ${signed(changes.pain)} / 마음의 여유 ${signed(changes.drive)}</p></div>`, { changes });
      timedOutcome(endIfNeeded);
    } else showRestDecision();
  }

  showJourney();
  return cleanup;
}
