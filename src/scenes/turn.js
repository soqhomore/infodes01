/** 한 턴: 이동 압박 → 장소 공개 → 사건/식사 → 결정 → 행동 → 결과 */
import {
  MOVE_PAIN, ACTIONS, FORCE_REST_PAIN, MAX_TURNS, MEAL_TURN, MEAL_OPTIONS,
  VIEW_CLIP, DAY_START, formatTime, clampStat, applyMeal, applyRest, applySkip, createTimelineEntry,
} from '../state.js';
import { updateDebug, DEBUG } from '../debug.js';
import { pickEvent, downgradeView } from '../events.js';
import { showEnding } from './ending.js';

const SPACING_BLUR_START = 3000;
const SPACING_TRIGGER = 6000;
const AUTO_NEXT_MS = 1250;
const formatBudget = value => `¥${value.toLocaleString()}`;
const signed = value => `${value >= 0 ? '+' : ''}${value}`;

function statsHTML(pain, drive, budget, changes = {}) {
  const delta = (key, tone) => changes[key] === undefined ? '' : `<span class="stat-delta ${tone}">${signed(changes[key])}</span>`;
  return `<div class="stats">
    <div class="stat"><span class="stat-label">통증</span><div class="stat-bar"><div class="stat-fill pain-fill" style="width:${pain}%"></div></div><span class="stat-value">${pain}</span>${delta('pain', 'delta-pain')}</div>
    <div class="stat"><span class="stat-label">의지</span><div class="stat-bar"><div class="stat-fill drive-fill" style="width:${drive}%"></div></div><span class="stat-value">${drive}</span>${delta('drive', 'delta-drive')}</div>
    <div class="stat-budget">${formatBudget(budget)}${changes.budget ? ` <span class="stat-delta delta-budget">${changes.budget < 0 ? '−' : '+'}${formatBudget(Math.abs(changes.budget))}</span>` : ''}</div>
  </div>`;
}

function fishSVG(className = 'place-fish') {
  return `<svg class="${className}" viewBox="0 0 72 48" aria-hidden="true"><ellipse cx="38" cy="24" rx="23" ry="16" fill="#5ba3d9"/><path d="M17 24 3 10v28z" fill="#3a7cbd"/><circle cx="45" cy="19" r="3" fill="#fff"/><circle cx="46" cy="19" r="1.4" fill="#222"/></svg>`;
}

export function showTurn(app, ctx, goto) {
  let locked = false;
  let spacingRafId = null;
  const timers = [];
  const listeners = [];
  const { rng, deck, turn, records, eventSlots, usedEvents } = ctx;
  let { pain, drive, budget, rainNextTurn, currentTime } = ctx;
  currentTime = currentTime || DAY_START;
  const mealRecords = ctx.mealRecords || [];
  const timeline = ctx.timeline || [];
  const eventRecords = ctx.eventRecords || [];
  const turnNum = turn + 1;
  const card = deck.draw();
  const walkMin = card.walkMinutes || 20;
  const walkStartTime = currentTime;
  currentTime += walkMin;
  const arrivalTime = currentTime;
  const eventTime = walkStartTime + Math.floor(walkMin / 2);
  timeline.push(createTimelineEntry({ turn: turnNum, type: 'walk', startTime: walkStartTime, minutes: walkMin, label: card.name }));
  const painBeforeMove = pain;
  pain = clampStat(pain + MOVE_PAIN[turn]);
  if (rainNextTurn) { card.view = downgradeView(card.view); rainNextTurn = false; }
  let currentView = card.view;

  const wrap = document.createElement('div'); wrap.className = 'scene turn'; app.appendChild(wrap);
  const addTimer = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const addListener = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); listeners.push({ el, type, fn, opts }); };
  const cleanup = () => { timers.forEach(clearTimeout); listeners.forEach(({ el, type, fn, opts }) => el.removeEventListener(type, fn, opts)); if (spacingRafId) cancelAnimationFrame(spacingRafId); };
  const actionCard = () => ({ ...card, view: currentView });
  const isOver = () => drive <= 0 || pain >= 100;
  const leave = (scene, nextTurn = turn) => { cleanup(); goto(scene, { ...ctx, pain, drive, budget, records, mealRecords, eventRecords, timeline, rainNextTurn, currentTime, turn: nextTurn }); };
  const placeHTML = () => `<div class="place-stage view-${currentView}"><div class="place-density density-${currentView}"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="place-window" style="--view-width:${VIEW_CLIP[currentView]}%"><div class="place-landscape">${fishSVG()}<span class="place-horizon"></span></div></div><div class="place-caption"><strong>${card.name}</strong><span>${card.indoor ? '실내' : '실외'} · ${currentView === 'wide' ? '열린 시야' : currentView === 'mid' ? '중간 시야' : '좁은 시야'}</span></div></div>`;
  const render = (body, changes = {}) => { wrap.innerHTML = `${statsHTML(pain, drive, budget, changes)}${placeHTML()}${body}`; };
  const renderJourney = (body = '', changes = {}) => {
    const journey = card.journey || { route: '다음 장소를 향해 걸었다.', sight: '바람이 곁을 스쳤다.' };
    wrap.innerHTML = `${statsHTML(pain, drive, budget, changes)}<div class="journey-stage"><div class="journey-meta">${formatTime(walkStartTime)} · ${walkMin}분 걸음</div><div class="journey-line"><span></span></div><p class="journey-route">${journey.route}</p><p class="journey-sight">${journey.sight}</p><small>탭하면 바로 도착한다</small></div>${body}`;
  };

  updateDebug('턴', `${turnNum}/${MAX_TURNS}`); updateDebug('카드', `${card.name} (${currentView})`);

  function showJourney() {
    let journeyDone = false;
    const finishJourney = () => {
      if (journeyDone) return;
      journeyDone = true;
      const event = pickEvent(turnNum, eventSlots, { pain, drive, budget, card, turnNum }, usedEvents, rng);
      if (event) {
        usedEvents.add(event.id);
        if (DEBUG) updateDebug('이벤트', event.name);
        showEvent(event);
        return;
      }
      showPlace();
    };
    locked = false;
    renderJourney();
    addTimer(finishJourney, 1800);
    addListener(wrap, 'click', event => { if (!event.target.closest('button')) finishJourney(); });
  }

  function showPlace() {
    locked = false;
    render(`<div class="turn-info"><div class="turn-number">턴 ${turnNum} / ${MAX_TURNS} · ${formatTime(arrivalTime)}</div><p class="pressure-copy">${walkMin}분 걸어서 도착했다.</p></div><div class="change-strip">통증 ${painBeforeMove} → ${pain} <b class="delta-pain">(+${pain - painBeforeMove})</b></div>`, { pain: pain - painBeforeMove });
    addTimer(proceedContext, 900);
  }

  function proceedContext() {
    if (isOver()) return leave(showEnding);
    if (turnNum === MEAL_TURN) return showMeal();
    showDecision();
  }

  function showEvent(event) {
    locked = false; renderJourney(`<div class="event-box"><div class="event-kicker">여행 중 만난 일</div><div class="event-name">${event.name}</div><div class="event-desc">${event.describe()}</div></div>`);
    const choices = event.hasChoice ? event.choices({ pain, drive, budget, card, turnNum }) : [{ label: '그대로 받아들인다' }];
    const buttons = document.createElement('div'); buttons.className = 'choice-buttons';
    choices.forEach((choice, index) => {
      const button = document.createElement('button'); button.className = `btn${choice.disabled ? ' btn-locked' : ''}`; button.disabled = Boolean(choice.disabled); button.textContent = choice.disabledReason ? `${choice.label} · ${choice.disabledReason}` : choice.label;
      addListener(button, 'click', () => { if (!locked && !choice.disabled) { locked = true; applyEvent(event, event.hasChoice ? index : null); } }); buttons.appendChild(button);
    }); wrap.appendChild(buttons);
  }

  function applyEvent(event, choiceIndex) {
    const before = { pain, drive, budget }; const effect = event.apply({ pain, drive, budget, card, turnNum }, choiceIndex) || {};
    if (effect.pain !== undefined) pain = effect.pain; if (effect.drive !== undefined) drive = effect.drive; if (effect.budget !== undefined) budget = effect.budget;
    if (effect.rainNextTurn) rainNextTurn = true; if (effect.viewOverride) currentView = effect.viewOverride; if (effect.promoteWidest) deck.promoteWidest();
    const purchased = event.id === 'limitedDessert' && choiceIndex === 0;
    eventRecords.push({
      turn: turnNum,
      type: purchased ? 'purchase' : event.journeyType,
      name: event.name,
      description: purchased ? '한정 디저트를 샀다.' : event.describe(),
      time: eventTime,
      location: card.name,
      ...(purchased ? { item: event.name, spend: before.budget - budget } : {}),
    });
    const changes = { pain: pain - before.pain, drive: drive - before.drive, budget: budget - before.budget };
    renderJourney(`<div class="outcome-panel"><strong>${event.name}</strong><p>${purchased ? `예산 −${formatBudget(before.budget - budget)}` : `통증 ${signed(changes.pain)} / 의지 ${signed(changes.drive)}${changes.budget ? ` / 예산 ${changes.budget < 0 ? '−' : '+'}${formatBudget(Math.abs(changes.budget))}` : ''}`}</p></div>`, changes);
    addTimer(() => isOver() ? leave(showEnding) : showPlace(), AUTO_NEXT_MS);
  }

  function showMeal() {
    locked = false; render('<div class="meal-panel"><div class="event-name">식사 시간</div><p>허기는 여기서 해결한다. 이후의 쉼은 별도로 남는다.</p></div>');
    const choices = document.createElement('div'); choices.className = 'meal-choices';
    Object.entries(MEAL_OPTIONS).forEach(([id, meal]) => {
      const button = document.createElement('button'); button.className = 'btn btn-meal'; button.innerHTML = `<span>${formatBudget(meal.spend)}</span>${meal.name}`;
      addListener(button, 'click', () => {
        if (locked) return;
        locked = true;
        const mealStartTime = currentTime;
        const result = applyMeal({ budget, option: id });
        budget = result.budgetAfter;
        currentTime += meal.minutes;
        const mealEntry = createTimelineEntry({ turn: turnNum, type: 'meal', startTime: mealStartTime, minutes: meal.minutes, label: meal.name });
        timeline.push(mealEntry);
        mealRecords.push({ turn: turnNum, spend: result.spend, option: id, card: actionCard(), ...mealEntry });
        render(`<div class="outcome-panel meal-outcome"><strong>${meal.name}</strong><p>예산 −${formatBudget(result.spend)} · ${meal.minutes}분 · 허기는 해결됨</p><small>통증·의지·만족감에는 직접 영향이 없다.</small></div>`, { budget: -result.spend }); addTimer(showDecision, AUTO_NEXT_MS);
      }); choices.appendChild(button);
    }); wrap.appendChild(choices);
  }

  function showDecision() {
    locked = false; render(`<div class="turn-info"><div class="turn-number">턴 ${turnNum} / ${MAX_TURNS}</div><p class="action-prompt">이 공간에서, 지금은 어떻게 쉴까?</p></div>`);
    const choices = document.createElement('div'); choices.className = 'choice-buttons';
    if (pain < FORCE_REST_PAIN) { const skip = document.createElement('button'); skip.className = 'btn btn-skip'; skip.textContent = '지나친다'; addListener(skip, 'click', () => { if (!locked) { locked = true; doSkip(); } }); choices.appendChild(skip); } else choices.innerHTML = '<div class="force-rest">몸이 대신 정했다.</div>';
    const rest = document.createElement('button'); rest.className = 'btn btn-rest'; rest.textContent = '쉰다'; addListener(rest, 'click', () => { if (!locked) { locked = true; showActions(); } }); choices.appendChild(rest); wrap.appendChild(choices);
  }

  function doSkip() {
    const restMin = 5;
    const restStartTime = currentTime;
    currentTime += restMin;
    const before = { pain, drive }; const result = applySkip({ pain, drive }); pain = result.painAfter; drive = result.driveAfter;
    records.push({ turn: turnNum, skipped: true, card: actionCard(), action: null, spend: 0, painBefore: before.pain, painAfter: pain, painRecovered: 0, driveBefore: before.drive, driveAfter: drive, driveDelta: result.driveDelta, satisfaction: 0, walkMinutes: walkMin, restMinutes: restMin, arrivalTime });
    timeline.push(createTimelineEntry({ turn: turnNum, type: 'skip', startTime: restStartTime, minutes: restMin, label: '지나침' }));
    showTurnOutcome('지나쳤다.', { pain: pain - before.pain, drive: drive - before.drive }, '통증이 더 쌓였고, 의지가 조금 줄었다.');
  }

  function showActions() {
    locked = false; render('<div class="turn-info"><p class="action-prompt">몸을 쉬게 하는 방식도, 내가 고른다.</p></div><div class="action-area"><div class="action-buttons"></div><div class="interaction-area"></div></div>');
    const buttons = wrap.querySelector('.action-buttons');
    ['phone', 'dessert', 'chat', 'plan'].forEach(id => {
      const action = ACTIONS[id]; const available = action.condition(pain, budget, actionCard().indoor); const button = document.createElement('button'); button.className = `btn btn-action${available ? '' : ' btn-locked'}`; button.disabled = !available;
      button.innerHTML = `<span class="action-name">${action.name}</span>${action.spendRange ? `<span class="action-cost">${formatBudget(action.spendRange[0])}~${formatBudget(action.spendRange[1])}</span>` : ''}`;
      addListener(button, 'click', () => { if (!locked && available) { locked = true; launchAction(id); } }); buttons.appendChild(button);
    });
    const interaction = wrap.querySelector('.interaction-area'); addWander(interaction); beginSpacing(interaction);
  }

  function beginSpacing(area) {
    let start = Date.now(); const reset = () => { start = Date.now(); wrap.classList.remove('spacing-blur'); };
    ['pointermove', 'pointerdown', 'keydown'].forEach(type => addListener(document, type, reset));
    const tick = () => { if (locked) return; const elapsed = Date.now() - start; if (elapsed >= SPACING_TRIGGER) { locked = true; wrap.classList.remove('spacing-blur'); return doAction('spacing'); } if (elapsed >= SPACING_BLUR_START) wrap.classList.add('spacing-blur'); spacingRafId = requestAnimationFrame(tick); };
    spacingRafId = requestAnimationFrame(tick); area.insertAdjacentHTML('beforeend', '<p class="spacing-hint">아무 입력 없이 잠시 머물러도 된다.</p>');
  }

  function addWander(area) {
    const available = ACTIONS.wander.condition(pain, budget, actionCard().indoor);
    if (!available) return area.insertAdjacentHTML('beforeend', `<div class="wander-locked"><span>돌아다니기</span><small>${actionCard().indoor ? '실내에서는 길게 움직일 수 없다' : '발이 너무 아프다'}</small></div>`);
    area.insertAdjacentHTML('beforeend', `<div class="wander-track"><span>돌아다니기 · 개복치를 끝까지 끌어라</span><div class="wander-rail">${fishSVG('wander-fish')}<b>→</b></div></div>`);
    const rail = area.querySelector('.wander-rail'); const fish = area.querySelector('.wander-fish'); let dragging = false; let startX = 0;
    addListener(fish, 'pointerdown', event => { if (!locked) { dragging = true; startX = event.clientX; fish.setPointerCapture(event.pointerId); } });
    addListener(document, 'pointermove', event => { if (!dragging || locked) return; const max = rail.getBoundingClientRect().width - fish.getBoundingClientRect().width; const distance = Math.max(0, Math.min(max, event.clientX - startX)); fish.style.transform = `translateX(${distance}px)`; if (distance >= max - 3) { dragging = false; locked = true; doAction('wander'); } });
    addListener(document, 'pointerup', () => { dragging = false; });
  }

  function launchAction(id) { if (id === 'plan') return showMicroTask('계획 짜기', '지금 가장 먼저 할 일을 고른다.', ['물 마시기', '길 확인하기', '잠시 앉기'], id); if (id === 'chat') return showMicroTask('잡담', '어떤 쪽으로 마음을 열까?', ['먼저 듣는다', '먼저 말한다'], id); doAction(id); }
  function showMicroTask(title, copy, options, actionId) {
    render(`<div class="micro-task"><strong>${title}</strong><p>${copy}</p><div class="priority-options">${options.map(option => `<button class="btn">${option}</button>`).join('')}</div></div>`); locked = false;
    wrap.querySelectorAll('.priority-options button').forEach(button => addListener(button, 'click', () => { if (!locked) { locked = true; doAction(actionId); } }));
  }

  function doAction(id) {
    const restMin = ACTIONS[id].restMinutes;
    const restStartTime = currentTime;
    currentTime += restMin;
    const before = { pain, drive, budget }; const result = applyRest({ pain, drive, budget, actionId: id, card: actionCard(), rng }); pain = result.painAfter; drive = result.driveAfter; budget = result.budgetAfter;
    records.push({ turn: turnNum, skipped: false, card: actionCard(), action: id, spend: result.spend, painBefore: before.pain, painAfter: pain, painRecovered: result.painRecovered, driveBefore: before.drive, driveAfter: drive, driveDelta: result.driveDelta, satisfaction: result.satisfaction, reasons: result, walkMinutes: walkMin, restMinutes: restMin, arrivalTime }); if (DEBUG) updateDebug('만족감', result.satisfaction);
    timeline.push(createTimelineEntry({ turn: turnNum, type: 'rest', startTime: restStartTime, minutes: restMin, label: ACTIONS[id].name }));
    const viewText = currentView === 'wide' ? '열린 시야' : currentView === 'mid' ? '중간 시야' : '좁은 시야'; const reason = `${viewText}가 의지를 밀어줬다 (${signed(result.viewBonus)}) · ${result.efficiency < 1 ? `높은 통증으로 회복 효율 ${Math.round(result.efficiency * 100)}%` : '몸이 비교적 잘 회복됐다'}`;
    showTurnOutcome(id === 'spacing' ? '아무것도 안 했다. 개복치도.' : ACTIONS[id].name, { pain: pain - before.pain, drive: drive - before.drive, budget: budget - before.budget }, reason);
  }

  function showTurnOutcome(title, changes, reason) {
    render(`<div class="outcome-panel"><strong>${title}</strong><p>통증 ${changes.pain <= 0 ? '−' : '+'}${Math.abs(changes.pain)} / 의지 ${signed(changes.drive)}${changes.budget ? ` / 예산 −${formatBudget(Math.abs(changes.budget))}` : ''}</p><small>${reason}</small></div><div class="turn-log">${formatTime(arrivalTime)} 도착 · ${title} · ${formatTime(currentTime)} 출발</div>`, changes);
    addTimer(() => { if (isOver() || turn + 1 >= MAX_TURNS) return leave(showEnding, turn + 1); leave(showTurn, turn + 1); }, AUTO_NEXT_MS);
  }

  showJourney(); return cleanup;
}
