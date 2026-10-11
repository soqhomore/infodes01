// 씬의 DOM 경계만 대체한다. 휴식 계산·상태 전환·타이머는 실제 코드를 실행한다.
export class SceneElement {
  constructor() { this.children = []; this.listeners = new Map(); this.className = ''; this.style = {}; }
  set innerHTML(value) { this.html = value; this.children = []; this.parts = new Map(); }
  get innerHTML() { return this.html || ''; }
  appendChild(child) { this.children.push(child); return child; }
  insertAdjacentHTML(_position, value) { this.html += value; }
  querySelector(selector) {
    if (![...this.innerHTML.matchAll(/class="([^"]*)"/g)].some(match => match[1].split(' ').includes(selector.slice(1)))) return null;
    if (!this.parts.has(selector)) {
      const part = new SceneElement();
      part.innerHTML = this.innerHTML;
      this.parts.set(selector, part);
    }
    return this.parts.get(selector);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  click() { if (!this.disabled) for (const fn of [...(this.listeners.get('click') || [])]) fn({}); }
  buttons() { return [...this.children, ...this.parts?.values() || []].flatMap(el => [
    ...(el.textContent ? [el] : []), ...el.buttons(),
  ]); }
  button(label) {
    const button = this.buttons().find(el => el.textContent.startsWith(label));
    if (!button) throw new Error(`버튼 없음: ${label}; 현재: ${this.buttons().map(el => el.textContent).join(', ')}`);
    return button;
  }
}
