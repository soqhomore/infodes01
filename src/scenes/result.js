/**
 * 결과 화면 — 6단계에서 SVG로 구현
 * 지금은 텍스트 플레이스홀더
 */

export function showResult(app, ctx, goto) {
  const { records } = ctx;

  const wrap = document.createElement('div');
  wrap.className = 'scene result';
  wrap.innerHTML = `
    <div class="result-title">기록</div>
    <div class="result-placeholder">결과 화면은 6단계에서 구현됩니다.</div>
    <div class="result-records"></div>
  `;

  const list = wrap.querySelector('.result-records');

  for (const r of records) {
    const div = document.createElement('div');
    div.className = 'result-record';
    if (r.skipped) {
      div.textContent = `턴 ${r.turn}: 지나침`;
    } else {
      div.textContent = `턴 ${r.turn}: ${r.card.name} — ${r.action} (만족감 ${r.satisfaction})`;
    }
    list.appendChild(div);
  }

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = '다시 하기';
  btn.addEventListener('click', () => {
    window.location.reload();
  });
  wrap.appendChild(btn);

  app.appendChild(wrap);
  return null;
}
