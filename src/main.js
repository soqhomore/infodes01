import './style.css';
import { createRng } from './rng.js';
import { initDebugPanel, updateDebug, SEED_PARAM, JUMP, DEBUG } from './debug.js';
import { showIntro } from './scenes/intro.js';
import { showResult } from './scenes/result.js';

const app = document.getElementById('app');

// ── 씬 전환 ──

let currentCleanup = null;

/**
 * 씬을 전환한다. 이전 씬의 cleanup을 호출하고 새 씬을 마운트한다.
 * @param {function} sceneFn - (app, context, goto) => cleanup
 * @param {object} context - 게임 상태
 */
export function goto(sceneFn, context) {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  app.innerHTML = '';
  currentCleanup = sceneFn(app, context, goto) || null;
}

// ── 시드 결정 ──

function makeSeed() {
  if (SEED_PARAM) return parseInt(SEED_PARAM, 10);
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

// ── 시작 ──

initDebugPanel();

if (JUMP === 'result') {
  // fake-run.json으로 결과 화면 바로 진입
  import('./data/fake-run.json').then(mod => {
    const seed = makeSeed();
    updateDebug('시드', seed);
    goto(showResult, { records: mod.default, seed });
  });
} else {
  const seed = makeSeed();
  if (DEBUG) updateDebug('시드', seed);
  goto(showIntro, { seed });
}
