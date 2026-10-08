/**
 * 턴 씬 — §4 한 턴의 순서를 그대로 따른다.
 * 2단계에서는 모든 행동이 버튼. 드래그/타이머는 3단계.
 */

import {
  MOVE_PAIN, ACTIONS, FORCE_REST_PAIN, MAX_TURNS,
  VIEW_BONUS, clampStat, applyRest, applySkip,
} from '../state.js';
import { updateDebug, DEBUG } from '../debug.js';
import { showEnding } from './ending.js';

// ── 유틸 ──

function formatBudget(n) {
  return '¥' + n.toLocaleString();
}

/** 스탯 바 HTML */
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

// ── 턴 진행 단계별 함수 ──

export function showTurn(app, ctx, goto) {
  let locked = false;
  const timers = [];
  const listeners = [];

  function addTimer(id) { timers.push(id); }
  function addListener(el, evt, fn) {
    el.addEventListener(evt, fn);
    listeners.push({ el, evt, fn });
  }

  function cleanup() {
    timers.forEach(id => clearTimeout(id));
    listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  }

  const { rng, deck, turn, records } = ctx;
  let { pain, drive, budget } = ctx;
  const turnNum = turn + 1; // 1-based 표시용

  // ── 1. 이동: 통증 증가 + 카드 뽑기 ──
  pain = clampStat(pain + MOVE_PAIN[turn]);
  const card = deck.draw();

  updateDebug('턴', `${turnNum}/7`);
  updateDebug('카드', `${card.name} (${card.view}, ${card.indoor ? '실내' : '실외'})`);

  // ── 2. 이벤트 (5단계) ──
  // 지금은 건너뜀

  // ── 3. 엔딩 체크 ──
  if (drive <= 0 || pain >= 100) {
    cleanup();
    goto(showEnding, { ...ctx, pain, drive, budget });
    return cleanup;
  }

  // ── 4~8. 화면 렌더링 ──
  const wrap = document.createElement('div');
  wrap.className = 'scene turn';
  app.appendChild(wrap);

  // 단계별로 화면을 교체하는 함수들
  showCardReveal();

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

    // 통증 80 이상이면 강제 휴식
    if (pain >= FORCE_REST_PAIN) {
      wrap.innerHTML += `
        <div class="force-rest">몸이 대신 정했다.</div>
      `;
      const btnContinue = document.createElement('button');
      btnContinue.className = 'btn';
      btnContinue.textContent = '쉰다';
      addListener(btnContinue, 'click', () => {
        if (locked) return;
        locked = true;
        showActionSelect();
      });
      wrap.appendChild(btnContinue);
    } else {
      // 쉴까? 버튼 2개
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

  function doSkip() {
    const result = applySkip({ pain, drive });

    records.push({
      turn: turnNum,
      skipped: true,
      card,
      action: null,
      spend: 0,
      painBefore: pain,
      painAfter: result.painAfter,
      painRecovered: 0,
      driveBefore: drive,
      driveAfter: result.driveAfter,
      driveDelta: result.driveDelta,
      satisfaction: 0,
    });

    pain = result.painAfter;
    drive = result.driveAfter;

    showTurnResult(null, result.driveDelta, true);
  }

  function showActionSelect() {
    locked = false;
    wrap.innerHTML = `
      ${statsHTML(pain, drive, budget)}
      <div class="turn-info">
        <div class="turn-number">턴 ${turnNum} / 7 — ${card.name}</div>
        <p class="action-prompt">어떻게 쉴까?</p>
      </div>
      <div class="action-buttons"></div>
    `;

    const btnWrap = wrap.querySelector('.action-buttons');

    // 멍때리기는 버튼으로 직접 고를 수 없음 (3단계에서 타이머 구현)
    // 2단계에서는 임시로 버튼으로 넣음
    const actionIds = ['spacing', 'phone', 'dessert', 'meal', 'chat', 'plan', 'wander'];

    for (const id of actionIds) {
      const action = ACTIONS[id];
      const canUse = action.condition(pain, budget, card.indoor);

      const btn = document.createElement('button');
      btn.className = 'btn btn-action' + (canUse ? '' : ' btn-locked');
      btn.innerHTML = `<span class="action-name">${action.name}</span>`;

      if (!canUse) {
        const reason = getLockReason(id, pain, budget, card.indoor);
        btn.innerHTML += `<span class="lock-reason">${reason}</span>`;
        btn.disabled = true;
      }

      if (action.spendRange) {
        btn.innerHTML += `<span class="action-cost">${formatBudget(action.spendRange[0])}~${formatBudget(action.spendRange[1])}</span>`;
      }

      addListener(btn, 'click', () => {
        if (locked || !canUse) return;
        locked = true;
        doAction(id);
      });

      btnWrap.appendChild(btn);
    }
  }

  function doAction(actionId) {
    const result = applyRest({ pain, drive, budget, actionId, card, rng: ctx.rng });

    if (DEBUG) {
      updateDebug('만족감', result.satisfaction);
    }

    records.push({
      turn: turnNum,
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

    const oldPain = pain;
    pain = result.painAfter;
    drive = result.driveAfter;
    budget = result.budgetAfter;

    showTurnResult(actionId, result.driveDelta, false, result.painRecovered, result.spend);
  }

  function showTurnResult(actionId, driveDelta, skipped, painRecovered, spend) {
    locked = false;

    let message = '';
    if (skipped) {
      message = '지나쳤다.';
    } else {
      const action = ACTIONS[actionId];
      message = `${action.name}`;
      if (spend > 0) message += ` (${formatBudget(spend)})`;
    }

    const driveSign = driveDelta >= 0 ? '+' : '';
    const painMsg = skipped
      ? `통증 +4`
      : `통증 −${painRecovered}`;

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

    // 다음 턴 또는 엔딩
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
