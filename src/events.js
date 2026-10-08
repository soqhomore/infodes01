/**
 * 돌발 이벤트 — §7 세션 패턴
 * 슬롯 배정 · 이벤트 선택 · 효과 적용
 */

import { clampStat } from './state.js';

// ── 시야 하락 헬퍼 ──
const VIEW_DOWN = { wide: 'mid', mid: 'narrow', narrow: 'narrow' };

// ── 이벤트 정의 ──

export const EVENTS = {
  limitedDessert: {
    name: '한정 디저트',
    slot: 'temptation',
    journeyType: 'sighting',
    condition: () => true,
    hasChoice: true,
    describe: () => '근처 가게에서 한정 디저트를 발견했다!',
    choices: (ctx) => {
      const canBuy = ctx.budget >= 2500;
      return [
        { label: '산다', disabled: !canBuy, disabledReason: '돈이 부족하다' },
        { label: '지나친다', disabled: false },
      ];
    },
    apply: (ctx, choiceIdx) => {
      if (choiceIdx === 0) {
        return { budget: ctx.budget - 2500 };
      }
      return {};
    },
  },

  stumble: {
    name: '발을 삐끗',
    slot: 'negative',
    journeyType: 'incident',
    condition: (ctx) => ctx.pain >= 30,
    hasChoice: false,
    describe: () => '발을 삐끗했다!',
    apply: (ctx) => ({ pain: clampStat(ctx.pain + 10), drive: clampStat(ctx.drive - 5) }),
  },

  rain: {
    name: '비',
    slot: 'negative',
    journeyType: 'incident',
    condition: (ctx) => ctx.turnNum <= 4,
    hasChoice: false,
    describe: () => '비가 내리기 시작한다.',
    apply: (ctx) => ({ rainNextTurn: true }),
  },

  festival: {
    name: '축제 발견',
    slot: 'positive',
    journeyType: 'sighting',
    condition: (ctx) => !ctx.card.indoor,
    hasChoice: true,
    describe: () => '축제를 발견했다!',
    choices: () => [
      { label: '구경한다', disabled: false },
      { label: '지나친다', disabled: false },
    ],
    apply: (ctx, choiceIdx) => {
      if (choiceIdx === 0) {
        return { drive: clampStat(ctx.drive + 4), viewOverride: 'wide' };
      }
      return { drive: clampStat(ctx.drive - 2) };
    },
  },

  sunfishSuggestion: {
    name: '개복치의 제안',
    slot: 'positive',
    journeyType: 'sighting',
    condition: (ctx) => ctx.turnNum >= 3,
    hasChoice: true,
    describe: () => '개복치가 어딘가를 가리킨다.',
    choices: () => [
      { label: '따라간다', disabled: false },
      { label: '거절한다', disabled: false },
    ],
    apply: (ctx, choiceIdx) => {
      if (choiceIdx === 0) {
        return { drive: clampStat(ctx.drive + 4), promoteWidest: true };
      }
      return { drive: clampStat(ctx.drive - 2) };
    },
  },

  benchFound: {
    name: '벤치 발견',
    slot: 'positive',
    journeyType: 'sighting',
    condition: (ctx) => ctx.pain >= 50,
    hasChoice: false,
    describe: () => '그늘진 자리를 발견했다.',
    apply: (ctx) => ({ pain: clampStat(ctx.pain - 8) }),
  },
};

// ── 슬롯별 후보 ──
const SLOT_CANDIDATES = {
  temptation: ['limitedDessert'],
  negative: ['stumble', 'rain'],
  positive: ['festival', 'sunfishSuggestion', 'benchFound'],
};

// ── 슬롯 턴 범위 ──
const SLOT_RANGE = {
  temptation: [3, 5],
  negative: [2, 6],
  positive: [2, 6],
};

/**
 * 게임 시작 시 세 슬롯에 턴을 배정한다.
 * 세 슬롯은 서로 다른 턴이어야 한다.
 * @returns {{ temptation: number, negative: number, positive: number }}
 *          턴 번호 (1-based)
 */
export function assignEventSlots(rng) {
  const slots = {};
  const used = new Set();
  const order = ['temptation', 'negative', 'positive'];

  for (const slot of order) {
    const [min, max] = SLOT_RANGE[slot];
    const candidates = [];
    for (let t = min; t <= max; t++) {
      if (!used.has(t)) candidates.push(t);
    }
    const turn = rng.pick(candidates);
    slots[slot] = turn;
    used.add(turn);
  }

  return slots;
}

/**
 * 이번 턴에 발생할 이벤트를 고른다.
 * @param {number} turnNum - 1-based
 * @param {object} slots - assignEventSlots 결과
 * @param {object} ctx - { pain, drive, budget, card, turnNum }
 * @param {Set} usedEvents - 이미 발생한 이벤트 id
 * @param {object} rng
 * @returns {object|null} - EVENTS의 항목 + id, 또는 null
 */
export function pickEvent(turnNum, slots, ctx, usedEvents, rng) {
  // 이번 턴에 배정된 슬롯 찾기
  let activeSlot = null;
  for (const [slot, t] of Object.entries(slots)) {
    if (t === turnNum) { activeSlot = slot; break; }
  }
  if (!activeSlot) return null;

  // 후보 중 조건 만족 + 미사용 필터
  const candidates = SLOT_CANDIDATES[activeSlot]
    .filter(id => !usedEvents.has(id) && EVENTS[id].condition(ctx));

  if (candidates.length === 0) return null;

  const id = rng.pick(candidates);
  return { ...EVENTS[id], id };
}

/**
 * 비 이벤트로 시야 한 단계 하락
 */
export function downgradeView(view) {
  return VIEW_DOWN[view] || view;
}
