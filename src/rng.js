/**
 * 시드 기반 난수 생성기 (mulberry32)
 * Math.random() 대신 이것만 사용한다.
 */

export function createRng(seed) {
  let s = seed | 0;

  function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    /** 0 이상 1 미만 실수 */
    random: next,

    /** min 이상 max 이하 정수 */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },

    /** 배열에서 랜덤 하나 */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },

    /** 배열을 셔플 (원본 변경) */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    /** 현재 시드값 (디버그용) */
    get seed() { return seed; },
  };
}
