# WAS MY REST WORTH ENOUGH?
## Interactive Rest Simulation — 기획서 v0.1

> 기존 정보디자인 포스터를 인터랙티브 웹사이트로 확장하기 위한 게임/인터랙션 기획 초안  
> 핵심 메시지: **좋은 휴식은 비싸서 좋은 것이 아니라, 내가 어떻게 쉬기로 선택했는지와 어떤 공간에서 쉬었는지가 중요하다.**

---

## 1. 프로젝트 정의

### 1-1. 프로젝트 목적

기존 정보디자인 포스터를 단순히 애니메이션화하는 것이 아니라,

> **“어떤 휴식이 나를 다시 움직이게 만들었는가?”**

를 사용자가 약 4~5분 동안 직접 선택하고 경험한 뒤, 자신의 플레이 기록을 정보디자인으로 다시 확인하게 만드는 웹 경험을 제작한다.

게임의 외형은 **여행 중 지쳐가는 개복치를 돌보는 짧은 시뮬레이션**이지만, 실제 핵심 대상은 개복치가 아니라 **여행 중인 나의 몸과 정신 상태**다.

기존 Overview에서 제안했던 방향처럼, 여행 자체보다 **‘휴식’을 메인 이벤트로 만들고 여행은 변수로 뒤로 뺀다.**

---

## 2. 최종 메시지

사이트가 직접 말하려는 메시지는 다음과 같이 잡는다.

> **좋은 휴식은 비싸서 좋은 것이 아니다.  
> 내가 어떻게 쉬기로 선택했는지, 그리고 어떤 공간에서 쉬었는지가 중요하다.**

다만 게임 내부에서 처음부터 이것을 설명하지 않는다.

플레이 단계에서 사용자에게 보이는 것은:

- 발바닥 통증
- 여행 지속 의지
- 남은 예산

뿐이다.

`주도성 Agency`와 `시야의 개방성 Openness`은 **Hidden Variable**로 관리하고 결과 화면에서 처음 공개한다.

---

# 3. 개복치의 역할

## 개복치 = 여행 중인 ‘나의 상태’를 외부화한 Data Creature

개복치는 HP를 가진 펫이 아니다.

| 데이터 | 개복치/화면에서의 표현 |
|---|---|
| 발바닥 통증 | 몸이 아래로 가라앉고 움직임에 관성이 커짐 |
| 여행 지속 의지 | 자발적인 유영 속도와 반응성 |
| 주도성 | 개복치가 아니라 **사용자가 해야 하는 interaction의 적극성** |
| 시야의 개방성 | 화면 aperture / camera FOV |
| 예산 | 외부 UI의 ¥ counter |
| 비용 | 결과 분석용 정보이며 개복치 상태에 직접 적용하지 않음 |

따라서 **“돈을 많이 사용했다 → 개복치가 행복해짐”** 같은 로직은 금지한다.

---

# 4. 전체 게임 구조

최종 구조는 **3개의 여행 구간 + 3번의 휴식 기회**로 제한한다.

```text
START
  │
  ▼
INTRO
개복치 등장 / 이름 입력
상태 설명
  │
  ▼
ROUND 1 ──────── 실내·상업 공간
  │
  ├─ Travel
  ├─ Random Event
  ├─ Rest Opportunity
  │      │
  │      ├─ 휴식 선택
  │      │     ├─ 가만히 있기
  │      │     ├─ 돈을 쓰는 휴식
  │      │     └─ 주도적인 행동
  │      │
  │      └─ Continue ──┐
  │                    │ 최대 1회
  ▼                    │
ROUND 2 ◀───────────────┘
거리 / 카페
  │
  ├─ Travel
  ├─ Random Event
  ├─ Rest
  │
  ▼
ROUND 3 ──────── 강변 / 넓은 공간
  │
  ├─ Travel
  ├─ Random Event
  ├─ Final Rest
  │
  ▼
JOURNEY END
  │
  ▼
개복치 → 데이터로 해체
  │
  ▼
YOUR REST PATTERN
  │
  ├─ Physical Recovery
  ├─ Will Recovery
  ├─ Money Spent
  ├─ Agency [REVEAL]
  └─ Openness [REVEAL]
  │
  ▼
FINAL MESSAGE
```

---

# 5. 플레이타임

목표는 **평균 4분 10초, 최대 약 4분 40초**다.

| 파트 | 목표 시간 |
|---|---:|
| Intro + 이름 | 20~25초 |
| Round 1 | 45~55초 |
| Round 2 | 45~55초 |
| Round 3 | 45~55초 |
| 결과 Morph | 15~20초 |
| 결과 분석 | 35~45초 |
| Ending | 10초 |
| **예상 총합** | **3분 55초~4분 40초** |

사용자가 장시간 아무 선택도 하지 않는 경우에는 그 행동 자체를 `가만히 있기`로 해석한다.

따라서 **8초 동안 휴식 행동을 선택하지 않으면 WAIT가 자동 선택**된다.

이것은 시간 제한인 동시에 interaction이다.

---

# 6. 플레이어 상태

정신 지표는 최종적으로 **여행 지속 의지 (Will to Move)**로 확정한다.

### 시작 상태

| 변수 | 범위 | 시작값 | 의미 |
|---|---:|---:|---|
| Foot Pain `P` | 0–100 | **35** | 높을수록 몸이 힘듦 |
| Will to Move `W` | 0–100 | **62** | 높을수록 다시 움직이고 싶음 |
| Budget `B` | ¥0–¥5,000 | **¥5,000** | 행동 선택을 제한 |
| Agency `A` | 0–1 | Hidden | 내가 얼마나 의도적으로 선택했는가 |
| Openness `O` | 0–1 | Hidden | 시야가 얼마나 열려 있는가 |

### 중요한 결정

`만족도`라는 네 번째 보이는 스탯은 만들지 않는다.

사용자가 이미

- 몸은 얼마나 회복했는가
- 다시 여행하고 싶은가

를 보고 있으므로 또 하나의 추상적인 Happiness bar를 추가할 필요가 없다.

---

# 7. 여행 자체가 상태에 주는 영향

휴식 사이의 이동은 반드시 개복치를 조금씩 지치게 만든다.

| 구간 | Pain | Will |
|---|---:|---:|
| Round 1 이동 | +10 | -2 |
| Round 2 이동 | +13 | -3 |
| Round 3 이동 | +15 | -4 |

즉 여행이 진행될수록 단순히 같은 선택을 반복하기 어려워진다.

Round 3에서는 신체 상태를 고려하지 않고 계속 “가장 적극적인 선택”만 하는 전략도 위험해진다.

---

# 8. 휴식 선택 구조

행동은 **덜 주도적인 행동 → 더 주도적인 행동**의 방향으로 배열한다.

중요한 점은 아래 `Agency` 값들은 **원본 데이터가 아니라 게임 밸런싱을 위한 제안값**이라는 것이다.

---

## ROUND 1 — Commercial / Indoor

첫 휴식은 좁고 상업적인 환경이다.

| 행동 | Cost | A | O | 신체 회복 R | 정신 기본 M |
|---|---:|---:|---:|---:|---:|
| 아무것도 안 하기 | ¥0 | .10 | .25 | 16 | 1 |
| Premium Lounge | ¥2,200 | .20 | .20 | **18** | 1 |
| Dessert by Window | ¥900 | .55 | .45 | 9 | 4 |
| Plan the Next Route | ¥0 | **.85** | .35 | 8 | 3 |

### 의도

Premium Lounge는 가장 비싸고 **신체에는 매우 편안**하다.

그러나 정신적으로 반드시 가장 좋은 선택은 아니다.

반면 Planning은 무료지만 주도성이 높다.

처음부터 이 대비를 심는다.

---

# 9. ROUND 2 — Cafe / Street

| 행동 | Cost | A | O | R | M |
|---|---:|---:|---:|---:|---:|
| 그냥 앉아 있기 | ¥0 | .10 | .45 | **16** | 1 |
| Small Talk | ¥0 | .45 | .55 | 10 | 3 |
| Meal | ¥1,600 | .70 | .60 | 12 | 5 |
| Explore Around | ¥0 | **.90** | **.80** | 3 | 2 |

여기서는 처음으로 명확한 딜레마가 발생한다.

### Explore

정신적으로 가장 강력하지만 몸은 거의 회복하지 않는다.

### Meal

돈이 들지만 신체와 정신 양쪽을 적당히 회복한다.

### Sitting

몸은 많이 회복하지만 여행 의지를 크게 올리지는 않는다.

즉 정답이 없다.

---

# 10. ROUND 3 — Waterfront / Skyline

| 행동 | Cost | A | O | R | M |
|---|---:|---:|---:|---:|---:|
| Sit by the Water | ¥0 | .15 | **.95** | **16** | 2 |
| Sunset Dinner | ¥2,400 | .60 | .75 | 12 | 4 |
| Explore the Skyline | ¥0 | **.90** | **1.00** | 3 | 2 |

마지막 장면은 **시야의 넓이**를 가장 직접적으로 체험하게 만든다.

여기서는 `O=.95~1.0`이 실제 화면의 확장으로 나타난다.

---

# 11. 핵심 계산 로직

가격은 정신 회복 계산식에 **들어가지 않는다.**

이 원칙은 반드시 지킨다.

## 11-1. 신체 회복

```text
ΔPain
=
-R
+
E × max(P - 50, 0) × 0.12
```

`R` = 행동 기본 신체 회복량.

`E` = 신체 활동성.

대략:

```text
가만히 있기       E = 0
먹기             E = 0
Planning         E = 0.1
Small Talk       E = 0.1
Explore          E = 1.0
```

### 예시

현재 Pain = 70이고 Explore:

```text
R = 3
E = 1

ΔPain
= -3 + (70-50)×0.12
= -0.6
```

몸이 매우 지친 상황에서는 돌아다니더라도 몸이 거의 회복하지 못한다.

따라서 **“주도성이 높으면 항상 정답”**이 되지 않는다.

---

# 12. 정신 회복 로직

```text
ΔWill
=
M
+ 6A
+ (6O + 5AO)S
- 0.08 × max(P - 55, 0)
```

여기서

| 변수 | 의미 |
|---|---|
| M | 행동 자체가 주는 기본 회복 |
| A | Agency |
| O | Openness |
| S | 해당 행동이 공간에 영향을 받는 정도 |
| P | 현재 발바닥 통증 |

예를 들어 Explore는 공간을 보는 행동이므로 `S=1.0`.

Planning은 주변 시야가 크게 중요하지 않으므로 `S=.30`.

---

# 13. 왜 이런 계산식인가

이 식은 **학술적 모델이 아니다.**

이번 인터랙티브 웹의 메시지를 구현하기 위한 게임 디자인 함수다.

설계상 원하는 관계는:

```text
PRICE ──X──→ Will recovery

AGENCY ────→ Will recovery
OPENNESS ──→ Will recovery

PAIN ──────→ Agency 선택의 trade-off
```

이다.

즉,

> 돈은 선택 가능한 환경을 바꾸지만 정신 회복을 직접 구매하지 못한다.

---

# 14. 가격의 역할

Budget은 게임의 주인공이 아니다.

따라서 가격은 **선택 제한 변수**로만 작동한다.

```js
if (option.cost > currentBudget) {
  // 선택 불가능
}
```

돈이 부족하다고 Will을 자동으로 깎지 않는다.

또한 돈이 많다고 Will을 올리지 않는다.

---

# 15. 랜덤 이벤트

완전 랜덤은 사용자가 자신의 선택보다 운에 의해 결과가 정해진다고 느끼게 한다.

따라서 **Controlled Randomness**를 사용한다.

---

## 15-1. Session Pattern

게임 시작 때 다음 중 하나를 랜덤 선택한다.

```text
N N P
N P N
P N N

N P P
P N P
P P N
```

- `N` = 부정적 사건
- `P` = 긍정적/기회 사건

즉 한 판에

**최소 1번의 안 좋은 상황 + 최소 1번의 좋은 상황**

이 반드시 들어온다.

---

# 16. 이벤트 세부값

## Round 1

| Event | Type | Pain | Will | O |
|---|---|---:|---:|---:|
| Wrong Exit | N | +6 | -3 | 0 |
| Crowded Station | N | +4 | -4 | -.05 |
| Empty Seat | P | -3 | +1 | 0 |
| Easy Transfer | P | 0 | +2 | +.05 |

## Round 2

| Event | Type | Pain | Will | O |
|---|---|---:|---:|---:|
| Rain | N | +3 | -4 | -.20 |
| Crowd | N | +5 | -5 | -.05 |
| Festival | P | +2 | +5 | +.10 |
| Nice Alley | P | -1 | +3 | +.10 |

Festival이 `Pain +2`인 이유는 재미있지만 실제로 더 걷기 때문이다.

즉 긍정적 이벤트도 모든 스탯에서 무조건 긍정적이지 않다.

## Round 3

| Event | Type | Pain | Will | O |
|---|---|---:|---:|---:|
| Long Walk | N | +8 | -4 | 0 |
| Cold Wind | N | +3 | -3 | 0 |
| Skyline Appears | P | 0 | +4 | +.10 |
| Quiet Waterfront | P | -2 | +2 | +.05 |

---

# 17. Openness 최종 계산

각 휴식 후보마다 기본 공간 개방성이 있다.

이벤트는 그것을 수정한다.

```text
Final O
=
clamp(
    RestSpotBaseO + EventO,
    0,
    1
)
```

예:

```text
Explore Street
Base O = .80

Rain
Event O = -.20

Final O = .60
```

따라서 같은 Explore라도 날씨와 상황에 따라 경험이 달라진다.

---

# 18. Continue / 휴식 거부

휴식을 무조건 해야 하면 플레이어가 돌봄을 하고 있다는 느낌이 떨어진다.

따라서:

### Round 1~2

`KEEP GOING` 가능.

### 제한

한 게임에서 **최대 1회**.

Round 3에서는 반드시 휴식.

Skip 자체에 가상의 패널티를 넣지는 않는다.

단순히 이번 회복을 받지 않은 상태로 다음 이동을 수행한다.

```text
REST 선택
→ recovery
→ next travel

KEEP GOING
→ recovery 없음
→ next travel
```

---

# 19. 강제 휴식

Game Over는 사용하지 않는다.

대신 Pain이 너무 높으면:

> **YOUR BODY DECIDED FOR YOU.**

가 나타난다.

### 기준

```text
Pain >= 74
```

이면 강제 휴식 상태.

이때:

- Continue 비활성
- Explore 비활성
- 지나치게 활동적인 선택 비활성
- 앉아 있기 / 식사 / Lounge 등은 선택 가능

즉 **“몸이 선택지를 줄여버린다.”**

---

# 20. 입력이 없을 때

휴식 선택 화면에서

### 8초 이상 아무것도 선택하지 않을 경우

자동으로

`DO NOTHING`

발동.

이것은 timeout이 아니라 **실제 인터랙션**으로 보여준다.

예:

> You did nothing.  
> So did Mola.

따라서 “아무것도 하지 않는다”는 선택은 버튼을 누르는 것이 아니라 **실제로 아무것도 하지 않는 것**이 된다.

---

# 21. 개복치 움직임 수치

발바닥 통증은 부력으로 번역한다.

```text
Buoyancy = 1 - Pain / 100
```

Three.js 공간에서는:

```text
Fish Y position

Pain 0    → +0.35
Pain 50   → 0
Pain 100  → -0.35
```

Will은 자발적인 움직임으로 표현한다.

```text
AutonomousSpeed
=
0.25 + 0.75 × (Will / 100)
```

### Will = 20

거의 가만히 떠 있음.

### Will = 90

주변을 스스로 탐색하고 cursor에도 빠르게 반응.

따라서 수치를 읽지 않아도 상태를 알 수 있다.

---

# 22. Openness를 화면에 적용

숨은 `O` 값은 나중에 숫자로 보여주는 것보다 **플레이 중 실제 viewport로 구현**한다.

권장값:

```text
Camera FOV
=
38° + 30° × O
```

즉:

- O=.2 → 약 44°
- O=.5 → 약 53°
- O=1.0 → 68°

Aperture 역시:

```text
Aperture Radius
=
18vw + 52vw × O
```

따라서 좁은 Lounge와 강변의 Skyline은 **화면 자체가 다른 크기로 느껴진다.**

---

# 23. 행동마다 다른 Interaction

단순 버튼 클릭으로 끝내지 않는다.

| 행동 | Interaction |
|---|---|
| Do Nothing | 실제로 4초간 아무것도 하지 않음 |
| Lounge | 개복치를 좌석으로 drag |
| Dessert / Meal | 음식을 개복치 영역으로 drag |
| Small Talk | 사람/말풍선을 선택해 연결 |
| Planning | 두 개의 목적지를 이어 경로를 정함 |
| Explore | 직접 화면을 drag하여 시야를 개방 |

따라서 `Agency`는 단순 숫자가 아니라 사용자의 interaction effort와 연결된다.

---

# 24. 결과 화면에서는 점수를 만들지 않는다

`87점`, `S Rank`, `Perfect Rest` 같은 결과는 만들지 않는다.

그 순간 다시

> “어떤 휴식이 정답인가?”

라는 게임으로 바뀌기 때문이다.

대신 서로 다른 효과를 나란히 보여준다.

---

# 25. 결과 분석 구조

게임 종료 후 개복치가 해체되어 다음과 같이 재구성된다.

```text
YOUR JOURNEY

REST 01
¥ 900
Pain        ↓↓↓
Will        ↑↑
          ╲
           Dessert
             ╲
              A .55
               ╲
                O .45


REST 02
¥ 0
Pain        ↓
Will        ↑↑↑↑
          ╲
           Explore
             ╲
              A .90
               ╲
                O .80
```

즉 기존 정보디자인 포스터의 **Ribbon 구조**로 되돌아간다.

---

# 26. 결과에서 비교할 세 가지

단일 `Best Rest` 대신 세 가지를 따로 계산한다.

### BODY REST

```text
argmax(-ΔPain)
```

몸을 가장 많이 회복시킨 휴식.

### WILL REST

```text
argmax(ΔWill)
```

다시 움직이고 싶게 만든 휴식.

### MOST EXPENSIVE

```text
argmax(Cost)
```

가장 비쌌던 휴식.

그리고 나란히 비교한다.

---

# 27. 중요한 예외 처리

만약

**가장 비싼 휴식 = 가장 Will을 많이 회복시킨 휴식**

이라면 게임이 억지로

> “아니야, 돈은 의미 없어!”

라고 말하면 안 된다.

대신:

> **This time, your most expensive rest also restored you the most.**

그리고 아래:

> **But price itself was never used to calculate your recovery.**

라고 보여준다.

반대로 다르다면:

> **Your most expensive rest wasn't the one that brought you back.**

이라고 할 수 있다.

이렇게 해야 결과를 조작한다는 느낌이 없다.

---

# 28. 최종 Rest Pattern

게임에서 기록된 평균값:

```text
Mean Agency
Mean Openness
```

를 기반으로 2×2 유형을 생성한다.

| | Low O | High O |
|---|---|---|
| **High A** | Intentional Rest | Open Explorer |
| **Low A** | Sheltered Pause | Scenic Drifter |

기준:

```text
Agency High ≥ .55
Openness High ≥ .65
```

이 유형은 **등급이 아니다.**

“너는 나쁜 휴식을 했다”가 아니라

> 어떤 방식으로 쉬는 경향을 보였는가

를 설명하는 장치다.

---

# 29. 밸런스 검증 방향

현재 수치는 **설계 초안**이며, 실제 구현 전 다음 항목을 시뮬레이션/플레이테스트로 검증해야 한다.

### 검증 목표

- 가격과 `ΔWill`의 상관은 낮아야 한다.
- `Agency`와 `Openness`는 `ΔWill`과 명확한 양의 관계를 가져야 한다.
- `Explore`만 반복하는 전략이 항상 최적이 되어서는 안 된다.
- 돈을 쓰는 휴식은 신체 회복에서 일정 장점이 있을 수 있지만 정신 회복을 직접 구매하지는 않아야 한다.
- 일반 플레이에서는 강제 휴식이 드물고, 극단적으로 무리한 플레이에서만 자주 나타나야 한다.
- 일반적인 한 판에서 예산이 너무 쉽게 0이 되거나 전혀 의미가 없어져서는 안 된다.

---

# 30. 전략별 의도

### ① Passive Strategy

`Wait → Wait → Sit by Water`

- 몸은 매우 편하다.
- 정신적인 회복은 제한적이다.
- 돈은 거의 쓰지 않는다.

### ② Agency Max

`Planning → Explore → Explore`

- 여행 지속 의지는 크게 회복한다.
- 몸은 많이 지칠 수 있다.
- 예산은 보존한다.

### ③ Paid Comfort

`Premium Lounge → Meal → Sit`

- 몸은 많이 회복한다.
- 정신도 어느 정도 회복한다.
- 예산을 많이 사용한다.

### ④ Mixed Strategy

`Dessert → Meal → Sit`

- 중간 수준의 신체 회복과 정신 회복.
- 예산도 일부 남는다.

### 설계 의도

어떤 전략도 모든 스탯에서 우월하지 않아야 한다.

```text
Passive

BODY      █████████
WILL      █████
MONEY     ██████████


Agency

BODY      ███
WILL      ██████████
MONEY     ██████████


Paid Comfort

BODY      █████████
WILL      ███████
MONEY     ██


Mixed

BODY      ███████
WILL      ████████
MONEY     █████
```

즉 게임의 정답이

> `Explore만 누르세요`

도 아니고

> `비싼 것을 사세요`

도 아니다.

---

# 31. 도시 / 마을 / 바닷가 모드는 MVP에서 제거

MVP에서는 별도의 Easy–Normal–Hard 지역 선택을 제거한다.

대신 한 게임 안에

```text
실내 도시
→ 거리/카페
→ 열린 강변
```

을 모두 넣는다.

이유:

1. 사용자가 한 판만 플레이해도 **서로 다른 공간 조건을 비교**할 수 있다.
2. 세 지역을 각각 별도 게임 모드로 구현하면 asset과 밸런싱의 양이 크게 증가한다.

---

# 32. 그래픽 전환

### 여행 중

개복치 = 하나의 살아 있는 오브젝트.

### 결과 시작

몸의 halftone particle들이 흩어진다.

### 내부의 초록색 선

Three.js spline/ribbon으로 풀려나온다.

### 마지막

Ribbon들이 포스터 구조를 만든다.

```text
CHARACTER
   ↓
DATA CREATURE
   ↓
PARTICLES
   ↓
RIBBON
   ↓
INFOGRAPHIC
```

이라는 morph를 사이트의 가장 큰 클라이맥스로 삼는다.

---

# 33. 기술 범위

| 영역 | 기술 |
|---|---|
| 개복치 / scene | Three.js |
| Camera / FOV | Three.js |
| Particle / Ribbon | Three.js |
| Timeline animation | GSAP |
| Scroll transition | GSAP ScrollTrigger |
| 상태창 / 버튼 / Typography | HTML/CSS |
| 게임 상태 | Vanilla JS object |
| 랜덤 이벤트 | seeded JS RNG 또는 session seed |

React까지는 꼭 필요하지 않다.

과제의 핵심이 framework가 아니므로 **Three.js + GSAP + Vanilla JS**가 Claude vibe coding에서도 관리하기 쉽다.

---

# 34. MVP에서 반드시 구현할 것

## Must Have

1. **개복치 상태 변화**
   - Pain ↔ 부력
   - Will ↔ 움직임

2. **3 Round 구조**
   - 실내 → 거리 → 열린 공간

3. **최소 6개 이상의 행동**
   - paid / free / passive / active가 섞여 있어야 함

4. **Controlled Event**
   - 매 판 일부 결과가 달라짐

5. **Explore의 aperture interaction**
   - 시야 확장

6. **마지막 Fish → Infographic morph**
   - 프로젝트의 핵심 장면

7. **개인 플레이 결과 저장**
   - 세 번의 선택을 결과 그래프에 반영

---

# 35. 시간이 남으면 추가

## Stretch Goal

- 캐릭터 이름 입력
- 짧은 효과음
- Replay마다 새로운 Event Seed
- 개복치 성향 1개

예:

### Sensitive Feet
```text
Travel Pain ×1.15
```

### Curious
```text
Explore Will +2
```

개복치 personality는 MVP에서는 제외하고, 핵심 루프 완성 후 추가한다.

---

# 36. 구현 전에 최종 확정해야 할 사항

| 항목 | 상태 |
|---|---|
| 개복치 = 여행 중 나 | 확정 |
| 정신 스탯 = 여행 지속 의지 | 확정 |
| Foot Pain / Will / Budget | 확정 |
| Agency / Openness Hidden | 확정 |
| 3 Round | 확정 |
| 약 4~5분 | 확정 |
| 단일 점수 없음 | 확정 |
| Controlled Random | 확정 |
| 최대 1회 휴식 Skip | 확정 |
| Game Over 없음 | 확정 |
| Forced Rest | 확정 |
| Fish → Infographic | 확정 |
| 도시/마을/바닷가 모드 | MVP에서 제거 |

남은 핵심 결정은 **그래픽 아트디렉션과 각 행동의 실제 interaction gesture**다.

---

# 37. 프로젝트 시스템 원칙

이 프로젝트에서 가장 중요한 시스템 원칙은 다음 한 줄이다.

> **Price는 UI의 숫자이고, Agency는 사용자의 행동이며, Openness는 화면의 크기이고, Pain과 Will은 개복치의 움직임이 된다.**

사용자는 처음에는 개복치를 돌보는 게임을 했다고 생각하지만, 마지막 30~40초에 개복치가 데이터로 변하면서 **자신이 방금 한 모든 선택이 원래 정보디자인 포스터와 같은 구조로 재해석**된다.

최종적으로 목표하는 밸런스는 다음과 같다.

- 비용 ↔ 정신 회복: 직접적인 인과관계 없음
- 주도성 ↔ 정신 회복: 강한 양의 관계
- 시야의 개방성 ↔ 정신 회복: 강한 양의 관계
- 적극적인 행동 ↔ 신체적 비용: trade-off 발생
- 비싼 휴식 ↔ 신체적 편안함: 일부 장점 가능
- 모든 선택에는 장점과 단점이 존재
- 하나의 정답 전략은 존재하지 않음
