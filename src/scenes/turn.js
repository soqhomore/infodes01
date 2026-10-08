/**
 * 턴 씬 — §4 한 턴의 순서를 그대로 따른다.
 */

import {
  MOVE_PAIN, ACTIONS, FORCE_REST_PAIN, MAX_TURNS,
  VIEW_BONUS, clampStat, applyRest, applySkip,
} from '../state.js';
import { updateDebug, DEBUG } from '../debug.js';
import { showEnding } from './ending.js';

// ── 상수 (state.js에 없는 UI 전용 값) ──

const SPACING_BLUR_START = 3000;  // 흐려지기 시작 (ms)
const SPACING_TRIGGER = 6000;     // 멍때리기 실행 (ms)

// ── 유틸 ──

function formatBudget(n) {
  return '¥' + n.toLocaleString();
}

function statsHTML(pain, drive, budget) {
  return `
    <div class="stats">
      <div class="stat">
        <span class="stat-label">통증</span>
        <div class="stat-bar"><div class="stat-fill pain-fill" style="width:${pain}%"></div></div>
        <span class="stat-value">${pain}</span>
      </div>
      <div class="stat">
        <span class="stat-label">의지</span>
        <div class="stat-bar"><div class="stat-fill drive-fill" style="width:${drive}%"></div></div>
        <span class="stat-value">${drive}</span>
      </div>
      <div class="stat-budget">${formatBudget(budget)}</div>
    </div>
  `;
}

// ── 턴 메인 ──

export function showTurn(app, ctx, goto) {
  let locked = false;
  const timers = [];
  const intervals = [];
  const listeners = [];
  let spacingRafId = null;

  function addTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function addInterval(fn, ms) {
    const id = setInterval(fn, ms);
    intervals.push(id);
    return id;
  }
  function addListener(el, evt, fn, opts) {
    el.addEventListener(evt, fn, opts);
    listeners.push({ el, evt, fn, opts });
  }

  function cleanup() {
    timers.forEach(id => clearTimeout(id));
    intervals.forEach(id => clearInterval(id));
    listeners.forEach(({ el, evt, fn, opts }) => el.removeEventListener(evt, fn, opts));
    if (spacingRafId) cancelAnimationFrame(spacingRafId);
  }

  const { rng, deck, turn, records } = ctx;
  let { pain, drive, budget } = ctx;
  const turnNum = turn + 1;

  // ── 1. 이동 ──
  pain = clampStat(pain + MOVE_PAIN[turn]);
  const card = deck.draw();

  updateDebug('턴', `${turnNum}/7`);
  updateDebug('카드', `${card.name} (${card.view}, ${card.indoor ? '실내' : '실외'})`);

  // ── 3. 엔딩 체크 ──
  if (drive <= 0 || pain >= 100) {
    cleanup();
    goto(showEnding, { ...ctx, pain, drive, budget });
    return cleanup;
  }

  // ── 화면 ──
  const wrap = document.createElement('div');
  wrap.className = 'scene turn';
  app.appendChild(wrap);

  showCardReveal();

  // ── 4. 카드 공개 + 5. 쉴까? ──

  function showCardReveal() {
    locked = false;
    wrap.innerHTML = `
      ${statsHTML(pain, drive, budget)}
      <div class="turn-info">
        <div class="turn-number">턴 ${turnNum} / 7</div>
        <div class="card-reveal">
          <div class="card-name">${card.name}</div>
          <div class="card-detail">${card.indoor ? '실내' : '실외'} · 시야 ${card.view}</div>
        </div>
      </div>
    `;

    if (pain >= FORCE_REST_PAIN) {
      wrap.innerHTML += `<div class="force-rest">몸이 대신 정했다.</div>`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = '쉰다';
      addListener(btn, 'click', () => {
        if (locked) return;
        locked = true;
        showActionSelect();
      });
      wrap.appendChild(btn);
    } else {
      const btnWrap = document.createElement('div');
      btnWrap.className = 'choice-buttons';

      const btnSkip = document.createElement('button');
      btnSkip.className = 'btn btn-skip';
      btnSkip.textContent = '지나친다';
      addListener(btnSkip, 'click', () => {
        if (locked) return;
        locked = true;
        doSkip();
      });

      const btnRest = document.createElement('button');
      btnRest.className = 'btn btn-rest';
      btnRest.textContent = '쉰다';
      addListener(btnRest, 'click', () => {
        if (locked) return;
        locked = true;
        showActionSelect();
      });

      btnWrap.appendChild(btnSkip);
      btnWrap.appendChild(btnRest);
      wrap.appendChild(btnWrap);
    }
  }

  // ── 지나치기 ──

  function doSkip() {
    const result = applySkip({ pain, drive });

    records.push({
      turn: turnNum, skipped: true, card,
      action: null, spend: 0,
      painBefore: pain, painAfter: result.painAfter, painRecovered: 0,
      driveBefore: drive, driveAfter: result.driveAfter,
      driveDelta: result.driveDelta, satisfaction: 0,
    });

    pain = result.painAfter;
    drive = result.driveAfter;
    showTurnResult(null, result.driveDelta, true);
  }

  // ── 6. 행동 선택 ──

  function showActionSelect() {
    locked = false;

    wrap.innerHTML = `
      ${statsHTML(pain, drive, budget)}
      <div class="turn-info">
        <div class="turn-number">턴 ${turnNum} / 7 — ${card.name}</div>
        <p class="action-prompt">어떻게 쉴까?</p>
      </div>
      <div class="action-area">
        <div class="action-buttons"></div>
        <div class="wander-zone" style="display:none"></div>
      </div>
      <div class="spacing-overlay" style="display:none">
        <div class="spacing-text">아무것도 안 했다. 개복치도.</div>
      </div>
    `;

    const btnWrap = wrap.querySelector('.action-buttons');
    const wanderZone = wrap.querySelector('.wander-zone');
    const spacingOverlay = wrap.querySelector('.spacing-overlay');

    // 멍때리기는 버튼으로 고를 수 없음 — 타이머로만 발동
    const buttonActions = ['phone', 'dessert', 'meal', 'chat', 'plan', 'wander'];

    const canWander = ACTIONS.wander.condition(pain, budget, card.indoor);

    for (const id of buttonActions) {
      if (id === 'wander') {
        // 돌아다니기는 드래그 영역으로 분리
        setupWander(wanderZone, canWander);
        continue;
      }

      const action = ACTIONS[id];
      const canUse = action.condition(pain, budget, card.indoor);

      const btn = document.createElement('button');
      btn.className = 'btn btn-action' + (canUse ? '' : ' btn-locked');
      btn.innerHTML = `<span class="action-name">${action.name}</span>`;

      if (!canUse) {
        btn.innerHTML += `<span class="lock-reason">${getLockReason(id, pain, budget, card.indoor)}</span>`;
        btn.disabled = true;
      }

      if (action.spendRange) {
        btn.innerHTML += `<span class="action-cost">${formatBudget(action.spendRange[0])}~${formatBudget(action.spendRange[1])}</span>`;
      }

      addListener(btn, 'click', () => {
        if (locked || !canUse) return;
        locked = true;
        stopSpacingTimer();
        doAction(id);
      });

      btnWrap.appendChild(btn);
    }

    // ── 멍때리기 타이머 ──
    let spacingStart = Date.now();

    function resetSpacingTimer() {
      spacingStart = Date.now();
      wrap.style.filter = '';
      spacingOverlay.style.display = 'none';
    }

    function onActivity() {
      if (locked) return;
      resetSpacingTimer();
    }

    // 입력 감지: 포인터, 터치, 키
    addListener(document, 'pointermove', onActivity);
    addListener(document, 'pointerdown', onActivity);
    addListener(document, 'keydown', onActivity);

    // 매 프레임 흐림 체크
    function spacingTick() {
      if (locked) return;
      const elapsed = Date.now() - spacingStart;

      if (elapsed >= SPACING_TRIGGER) {
        // 멍때리기 발동
        locked = true;
        wrap.style.filter = '';
        spacingOverlay.style.display = 'flex';
        addTimer(() => doAction('spacing'), 800);
        return;
      }

      if (elapsed >= SPACING_BLUR_START) {
        const progress = (elapsed - SPACING_BLUR_START) / (SPACING_TRIGGER - SPACING_BLUR_START);
        const blur = progress * 4; // 최대 4px blur
        wrap.style.filter = `blur(${blur.toFixed(1)}px)`;
      }

      spacingRafId = requestAnimationFrame(spacingTick);
    }

    spacingRafId = requestAnimationFrame(spacingTick);

    function stopSpacingTimer() {
      if (spacingRafId) {
        cancelAnimationFrame(spacingRafId);
        spacingRafId = null;
      }
      wrap.style.filter = '';
      spacingOverlay.style.display = 'none';
    }
  }

  // ── 돌아다니기 드래그 ──

  function setupWander(zone, canUse) {
    zone.style.display = 'block';

    if (!canUse) {
      const reason = ACTIONS.wander.condition(pain, budget, true)
        ? '실내라 돌아다닐 수 없다'
        : (pain >= 65 ? '발이 너무 아프다' : '실내라 돌아다닐 수 없다');
      zone.innerHTML = `
        <div class="wander-locked">
          <span class="action-name">돌아다니기</span>
          <span class="lock-reason">${getLockReason('wander', pain, budget, card.indoor)}</span>
        </div>
      `;
      return;
    }

    zone.innerHTML = `
      <div class="wander-track">
        <div class="wander-label">돌아다니기 — 개복치를 끝까지 끌어라</div>
        <div class="wander-rail">
          <svg class="wander-fish" width="36" height="36" viewBox="0 0 36 36"
               style="touch-action:none; user-select:none;" draggable="false">
            <circle cx="18" cy="18" r="16" fill="#5ba3d9" stroke="#3a7cbd" stroke-width="2"/>
            <circle cx="12" cy="14" r="2.5" fill="#fff"/>
            <circle cx="12" cy="14" r="1.2" fill="#222"/>
          </svg>
          <div class="wander-goal">→</div>
        </div>
      </div>
    `;

    const rail = zone.querySelector('.wander-rail');
    const fish = zone.querySelector('.wander-fish');
    let dragging = false;
    let startX = 0;
    let fishX = 0;

    function onPointerDown(e) {
      if (locked) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX - fishX;
      fish.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging || locked) return;
      e.preventDefault();
      const railRect = rail.getBoundingClientRect();
      const maxX = railRect.width - 36;
      fishX = Math.max(0, Math.min(maxX, e.clientX - startX));
      fish.style.transform = `translateX(${fishX}px)`;

      // 끝까지 도달하면 실행
      if (fishX >= maxX - 4) {
        dragging = false;
        locked = true;
        doAction('wander');
      }
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      // 스냅백
      fishX = 0;
      fish.style.transform = 'translateX(0)';
    }

    addListener(fish, 'pointerdown', onPointerDown);
    addListener(document, 'pointermove', onPointerMove);
    addListener(document, 'pointerup', onPointerUp);
  }

  // ── 행동 실행 ──

  function doAction(actionId) {
    const result = applyRest({ pain, drive, budget, actionId, card, rng: ctx.rng });

    if (DEBUG) updateDebug('만족감', result.satisfaction);

    records.push({
      turn: turnNum, skipped: false, card,
      action: actionId, spend: result.spend,
      painBefore: pain, painAfter: result.painAfter,
      painRecovered: result.painRecovered,
      driveBefore: drive, driveAfter: result.driveAfter,
      driveDelta: result.driveDelta, satisfaction: result.satisfaction,
    });

    pain = result.painAfter;
    drive = result.driveAfter;
    budget = result.budgetAfter;

    showTurnResult(actionId, result.driveDelta, false, result.painRecovered, result.spend);
  }

  // ── 7. 결과 표시 ──

  function showTurnResult(actionId, driveDelta, skipped, painRecovered, spend) {
    locked = false;

    let message = '';
    if (skipped) {
      message = '지나쳤다.';
    } else {
      const action = ACTIONS[actionId];
      message = action.name;
      if (actionId === 'spacing') message = '아무것도 안 했다. 개복치도.';
      if (spend > 0) message += ` (${formatBudget(spend)})`;
    }

    const driveSign = driveDelta >= 0 ? '+' : '';
    const painMsg = skipped ? '통증 +4' : `통증 −${painRecovered}`;

    wrap.innerHTML = `
      ${statsHTML(pain, drive, budget)}
      <div class="turn-result">
        <div class="result-action">${message}</div>
        <div class="result-changes">
          <span>${painMsg}</span>
          <span>의지 ${driveSign}${driveDelta}</span>
        </div>
      </div>
    `;

    // ── 8. 엔딩 체크 ──
    if (drive <= 0 || pain >= 100) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = '계속';
      addListener(btn, 'click', () => {
        if (locked) return;
        locked = true;
        cleanup();
        goto(showEnding, { ...ctx, pain, drive, budget, records, turn: turn + 1 });
      });
      wrap.appendChild(btn);
      return;
    }

    const nextTurn = turn + 1;
    const btn = document.createElement('button');
    btn.className = 'btn';

    if (nextTurn >= MAX_TURNS) {
      btn.textContent = '하루가 끝났다';
      addListener(btn, 'click', () => {
        if (locked) return;
        locked = true;
        cleanup();
        goto(showEnding, { ...ctx, pain, drive, budget, records, turn: nextTurn });
      });
    } else {
      btn.textContent = '다음';
      addListener(btn, 'click', () => {
        if (locked) return;
        locked = true;
        cleanup();
        goto(showTurn, { ...ctx, pain, drive, budget, records, turn: nextTurn });
      });
    }
    wrap.appendChild(btn);
  }

  return cleanup;
}

// ── 잠금 사유 ──

function getLockReason(actionId, pain, budget, indoor) {
  switch (actionId) {
    case 'dessert': return '돈이 부족하다';
    case 'meal': return '돈이 부족하다';
    case 'chat': return '발이 너무 아프다';
    case 'plan': return '발이 너무 아프다';
    case 'wander':
      if (indoor) return '실내라 돌아다닐 수 없다';
      return '발이 너무 아프다';
    default: return '';
  }
}
