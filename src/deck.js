/**
 * 장소 카드 덱 생성 · 추출 (§8)
 * narrow = 실내, wide = 실외, mid 중 "창가 카페"만 실내
 */

const DECKS = {
  city: [
    { id: 'city-01', name: '쇼핑몰 내부', view: 'narrow', indoor: true, walkMinutes: 10, journey: { route: '에스컬레이터 곁을 따라 걸었다.', sight: '유리문 너머로 사람들이 빠르게 지나갔다.' } },
    { id: 'city-02', name: '백화점 휴게 의자', view: 'narrow', indoor: true, walkMinutes: 10, journey: { route: '층마다 다른 향을 지나 걸었다.', sight: '천장 조명이 바닥에 길게 번졌다.' } },
    { id: 'city-03', name: '창 없는 카페', view: 'narrow', indoor: true, walkMinutes: 12, journey: { route: '복도를 따라 조용히 돌아갔다.', sight: '컵 부딪히는 소리가 문틈으로 새어 나왔다.' } },
    { id: 'city-04', name: '지하 통로', view: 'narrow', indoor: true, walkMinutes: 10, journey: { route: '지하 통로의 벽을 따라 걸었다.', sight: '광고판의 빛이 발끝을 스쳤다.' } },
    { id: 'city-05', name: '역 대합실', view: 'narrow', indoor: true, walkMinutes: 12, journey: { route: '개찰구 바깥으로 천천히 걸었다.', sight: '떠나는 열차의 안내 방송이 들렸다.' } },
    { id: 'city-06', name: '창가 카페', view: 'mid', indoor: true, walkMinutes: 15, journey: { route: '창이 있는 골목으로 돌아 걸었다.', sight: '신호등 빛이 젖은 창에 비쳤다.' } },
    { id: 'city-07', name: '골목 벤치', view: 'narrow', indoor: false, walkMinutes: 15, journey: { route: '낮은 담장 옆 골목을 걸었다.', sight: '화분 사이로 작은 고양이가 숨었다.' } },
    { id: 'city-08', name: '공원 벤치', view: 'mid', indoor: false, walkMinutes: 20, journey: { route: '공원 가장자리를 따라 걸었다.', sight: '나뭇잎 그림자가 천천히 흔들렸다.' } },
    { id: 'city-09', name: '강변', view: 'wide', indoor: false, walkMinutes: 30, journey: { route: '강을 향해 난 길을 걸었다.', sight: '물 위로 자전거 벨 소리가 멀어졌다.' } },
  ],
  village: [
    { id: 'village-01', name: '작은 상점', view: 'narrow', indoor: true, walkMinutes: 10, journey: { route: '낮은 처마 아래를 걸었다.', sight: '문 앞 채소 상자가 햇빛을 받았다.' } },
    { id: 'village-02', name: '창 없는 카페', view: 'narrow', indoor: true, walkMinutes: 12, journey: { route: '조용한 골목 안쪽으로 걸었다.', sight: '커피 볶는 향이 골목에 남아 있었다.' } },
    { id: 'village-03', name: '역 대합실', view: 'narrow', indoor: true, walkMinutes: 12, journey: { route: '작은 역을 향해 걸었다.', sight: '시간표 종이가 바람에 살짝 들렸다.' } },
    { id: 'village-04', name: '창가 카페', view: 'mid', indoor: true, walkMinutes: 15, journey: { route: '담벼락을 따라 천천히 걸었다.', sight: '창문에 걸린 화분이 흔들렸다.' } },
    { id: 'village-05', name: '골목', view: 'narrow', indoor: false, walkMinutes: 15, journey: { route: '돌담 사이 좁은 길을 걸었다.', sight: '빨랫줄이 바람에 가볍게 흔들렸다.' } },
    { id: 'village-06', name: '신사 경내', view: 'mid', indoor: false, walkMinutes: 20, journey: { route: '돌계단 아래까지 걸었다.', sight: '나무 사이에서 바람 종이 울렸다.' } },
    { id: 'village-07', name: '공원 벤치', view: 'mid', indoor: false, walkMinutes: 20, journey: { route: '논둑 옆 산책길을 걸었다.', sight: '풀잎 끝에 맺힌 물방울이 반짝였다.' } },
    { id: 'village-08', name: '강변', view: 'wide', indoor: false, walkMinutes: 30, journey: { route: '강을 따라 난 둑길을 걸었다.', sight: '물새 한 마리가 낮게 날았다.' } },
    { id: 'village-09', name: '언덕 위', view: 'wide', indoor: false, walkMinutes: 35, journey: { route: '완만한 언덕길을 올랐다.', sight: '마을 지붕들이 한눈에 들어왔다.' } },
  ],
  beach: [
    { id: 'beach-01', name: '기념품점', view: 'narrow', indoor: true, walkMinutes: 10, journey: { route: '가게들이 모인 길을 걸었다.', sight: '조개껍데기 장식이 햇빛을 받았다.' } },
    { id: 'beach-02', name: '창 없는 카페', view: 'narrow', indoor: true, walkMinutes: 12, journey: { route: '바닷바람을 피해 안쪽 길로 걸었다.', sight: '문 너머에서 잔 부딪히는 소리가 났다.' } },
    { id: 'beach-03', name: '창가 카페', view: 'mid', indoor: true, walkMinutes: 15, journey: { route: '파도 소리를 따라 걸었다.', sight: '창에 비친 바다가 천천히 흔들렸다.' } },
    { id: 'beach-04', name: '골목', view: 'narrow', indoor: false, walkMinutes: 15, journey: { route: '낮은 담장 사이를 걸었다.', sight: '젖은 모래 냄새가 골목에 남아 있었다.' } },
    { id: 'beach-05', name: '방파제 계단', view: 'mid', indoor: false, walkMinutes: 25, journey: { route: '방파제 난간을 따라 걸었다.', sight: '갈매기들이 바람을 타고 있었다.' } },
    { id: 'beach-06', name: '해변', view: 'wide', indoor: false, walkMinutes: 35, journey: { route: '파도 가까운 모래길을 걸었다.', sight: '물결 끝이 발자국을 지웠다.' } },
    { id: 'beach-07', name: '등대 앞', view: 'wide', indoor: false, walkMinutes: 30, journey: { route: '등대를 향해 천천히 걸었다.', sight: '하얀 빛이 낮에도 희미하게 남아 있었다.' } },
    { id: 'beach-08', name: '해안 산책로', view: 'wide', indoor: false, walkMinutes: 30, journey: { route: '해안 산책로를 따라 걸었다.', sight: '바다와 하늘의 경계가 멀어졌다.' } },
    { id: 'beach-09', name: '바다 보이는 테라스', view: 'wide', indoor: false, walkMinutes: 25, journey: { route: '바다가 보이는 길로 올랐다.', sight: '난간 너머로 배 한 척이 지나갔다.' } },
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
  { id: 'city',    name: '도시',   departureCopy: '도시는 벌써 빠르게 움직인다. 오늘은 그 속도를 잠시 벗어나 본다.' },
  { id: 'village', name: '마을',   departureCopy: '낯선 길로 내려선다. 발은 아직 가볍다.' },
  { id: 'beach',   name: '바닷가', departureCopy: '파도 소리가 먼저 도착했다. 발걸음은 천천히 따라간다.' },
];
