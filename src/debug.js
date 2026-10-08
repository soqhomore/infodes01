/**
 * 디버그 모듈 (§9)
 * ?debug=1  → 디버그 패널 표시
 * ?seed=123 → RNG 시드 고정
 * ?jump=result → 결과 화면 바로 진입
 */

const params = new URLSearchParams(window.location.search);

export const DEBUG = params.get('debug') === '1';
export const SEED_PARAM = params.get('seed');
export const JUMP = params.get('jump');

let panelEl = null;
let panelData = {};

/** 디버그 패널 생성 (debug=1일 때만) */
export function initDebugPanel() {
  if (!DEBUG) return;
  panelEl = document.createElement('div');
  panelEl.id = 'debug-panel';
  panelEl.style.cssText = `
    position: fixed; top: 8px; right: 8px; z-index: 9999;
    background: rgba(0,0,0,0.85); color: #0f0; font-size: 12px;
    font-family: monospace; padding: 8px 12px; border-radius: 6px;
    max-width: 260px; pointer-events: none; line-height: 1.6;
  `;
  document.body.appendChild(panelEl);
}

/** 디버그 패널 데이터 갱신 */
export function updateDebug(key, value) {
  if (!DEBUG) return;
  panelData[key] = value;
  if (panelEl) {
    panelEl.innerHTML = Object.entries(panelData)
      .map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`)
      .join('');
  }
}

/** 디버그 패널 데이터 초기화 */
export function clearDebug() {
  panelData = {};
  if (panelEl) panelEl.innerHTML = '';
}
