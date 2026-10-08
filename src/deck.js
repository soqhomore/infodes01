/**
 * 장소 카드 덱 생성 · 추출 (§8)
 * narrow = 실내, wide = 실외, mid 중 "창가 카페"만 실내
 */

const DECKS = {
  city: [
    { id: 'city-01', name: '쇼핑몰 내부',     view: 'narrow', indoor: true },
    { id: 'city-02', name: '백화점 휴게 의자', view: 'narrow', indoor: true },
    { id: 'city-03', name: '창 없는 카페',     view: 'narrow', indoor: true },
    { id: 'city-04', name: '지하 통로',        view: 'narrow', indoor: true },
    { id: 'city-05', name: '역 대합실',        view: 'narrow', indoor: true },
    { id: 'city-06', name: '창가 카페',        view: 'mid',    indoor: true },
    { id: 'city-07', name: '골목 벤치',        view: 'mid',    indoor: false },
    { id: 'city-08', name: '공원 벤치',        view: 'mid',    indoor: false },
    { id: 'city-09', name: '강변',             view: 'wide',   indoor: false },
  ],
  village: [
    { id: 'village-01', name: '작은 상점',     view: 'narrow', indoor: true },
    { id: 'village-02', name: '창 없는 카페',  view: 'narrow', indoor: true },
    { id: 'village-03', name: '역 대합실',     view: 'narrow', indoor: true },
    { id: 'village-04', name: '창가 카페',     view: 'mid',    indoor: true },
    { id: 'village-05', name: '골목',          view: 'mid',    indoor: false },
    { id: 'village-06', name: '신사 경내',     view: 'mid',    indoor: false },
    { id: 'village-07', name: '공원 벤치',     view: 'mid',    indoor: false },
    { id: 'village-08', name: '강변',          view: 'wide',   indoor: false },
    { id: 'village-09', name: '언덕 위',       view: 'wide',   indoor: false },
  ],
  beach: [
    { id: 'beach-01', name: '기념품점',           view: 'narrow', indoor: true },
    { id: 'beach-02', name: '창 없는 카페',       view: 'narrow', indoor: true },
    { id: 'beach-03', name: '창가 카페',          view: 'mid',    indoor: true },
    { id: 'beach-04', name: '골목',               view: 'mid',    indoor: false },
    { id: 'beach-05', name: '방파제 계단',        view: 'mid',    indoor: false },
    { id: 'beach-06', name: '해변',               view: 'wide',   indoor: false },
    { id: 'beach-07', name: '등대 앞',            view: 'wide',   indoor: false },
    { id: 'beach-08', name: '해안 산책로',        view: 'wide',   indoor: false },
    { id: 'beach-09', name: '바다 보이는 테라스', view: 'wide',   indoor: false },
  ],
};

/**
 * 덱을 만들어 셔플한 뒤, draw()로 한 장씩 비복원 추출하는 객체를 돌려준다.
 * @param {'city'|'village'|'beach'} destination
 * @param {object} rng - createRng()이 돌려준 객체
 */
export function createDeck(destination, rng) {
  const cards = DECKS[destination].map(c => ({ ...c }));
  rng.shuffle(cards);
  let idx = 0;

  return {
    /** 한 장 뽑기. 9장 중 7장까지 뽑을 수 있다. */
    draw() {
      if (idx >= cards.length) throw new Error('덱에 카드가 없다');
      return cards[idx++];
    },

    /** 남은 카드 중 시야가 가장 넓은 카드를 다음 순서로 끌어온다 (개복치의 제안용) */
    promoteWidest() {
      if (idx >= cards.length) return;
      let bestIdx = idx;
      const rank = { narrow: 0, mid: 1, wide: 2 };
      for (let i = idx + 1; i < cards.length; i++) {
        if (rank[cards[i].view] > rank[cards[bestIdx].view]) bestIdx = i;
      }
      if (bestIdx !== idx) {
        [cards[idx], cards[bestIdx]] = [cards[bestIdx], cards[idx]];
      }
    },

    /** 남은 카드 목록 (디버그용) */
    remaining() {
      return cards.slice(idx);
    },
  };
}

/** 여행지 목록 (인트로 선택용) */
export const DESTINATIONS = [
  { id: 'city',    name: '도시' },
  { id: 'village', name: '마을' },
  { id: 'beach',   name: '바닷가' },
];
