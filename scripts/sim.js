/** 전략·조작 수 검증. 추정 시간은 실제 사용자 측정이 아니다. */
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { createDeck } from '../src/deck.js';
import { assignEventSlots, pickEvent } from '../src/events.js';
import { DAY_END, MEAL_OPTIONS, getRestAdvice, REST_BALANCE, STAY_OPTIONS, FORCE_REST_PAIN, DAY_PHASES, SCENE_TIMING, formatTime } from '../src/state.js';
import { createDay, moveToPlace, restAtPlace, eatMeal, resolveJourneyEvent, returnFromDay,
  getMoveOption, getRestOptions, getDayEndReason, isMealDue } from '../src/day.js';

const short = STAY_OPTIONS[0].minutes, long = STAY_OPTIONS[1].minutes;
const STRATEGIES = [
  { name: '필요한 만큼', choose: s => s.pain > REST_BALANCE.sufficientPain
    ? ['spacing', getRestAdvice({ ...s, actionId: 'spacing', card: s.currentCard }).recommendation === 'long' ? long : short] : null },
  { name: '안 쉬기', choose: () => null },
  { name: '매번 짧게', choose: (_s,c) => c === 0 ? ['phone',short] : null },
  { name: '매번 길게', choose: (_s,c) => c === 0 ? ['spacing',long] : null },
  { name: '한곳 짧게 반복', choose: () => ['phone',short] },
  { name: '한곳 길게 반복', choose: () => ['spacing',long] },
  { name: '행동 변경 반복', choose: (_s,c) => [c % 2 ? 'plan' : 'phone',short] },
  { name: '열린 곳 주도적 행동', choose: (s,c) => s.currentCard.view === 'wide' && c === 0 ? ['plan',long] : null },
  { name: '유료 행동 중심', choose: (_s,c) => c === 0 ? ['dessert',short] : null },
  { name: '조기 귀환', choose: (_s,c) => c === 0 ? ['spacing',short] : null, returnAfter: 3 },
];

function runDay(destination, strategy, seed) {
  const rng = createRng(seed), deck = createDeck(destination,rng);
  const slots = assignEventSlots(rng), used = new Set();
  let state = createDay(), steps = 0, inputs = 1, decisions = 0, eventChoices = 0;
  const move = () => {
    state = moveToPlace(state,deck.draw()); decisions++;
    if (getDayEndReason(state)) return;
    const event = pickEvent(state.turn,slots,{ ...state,card:state.currentCard,turnNum:state.turn },used,rng);
    if (!event) return;
    used.add(event.id);
    const choice = event.hasChoice ? event.choices({ ...state,card:state.currentCard,turnNum:state.turn }).findIndex(x=>!x.disabled) : null;
    inputs++; eventChoices++;
    const resolved = resolveJourneyEvent(state,event,choice);
    state = resolved.state;
    if (resolved.effect.promoteWidest) deck.promoteWidest();
  };
  move();
  while (!getDayEndReason(state)) {
    assert.ok(++steps < 100);
    if (isMealDue(state)) {
      if (state.budget >= MEAL_OPTIONS.bench.spend && state.currentTime + MEAL_OPTIONS.bench.minutes <= DAY_END) {
        state = eatMeal(state,'bench'); inputs++; decisions++;
      } else state = returnFromDay(state);
      continue;
    }
    const count = state.records.filter(r=>r.visitId === state.currentVisitId).length;
    if (strategy.returnAfter && state.visits.length >= strategy.returnAfter && count > 0) { state = returnFromDay(state); break; }
    let selection = strategy.choose(state,count);
    if (selection && !getRestOptions(state,selection[0]).some(o=>o.minutes === selection[1] && o.available)) {
      const fallback = getRestOptions(state,selection[0]).find(o=>o.available);
      selection = fallback ? [selection[0],fallback.minutes] : null;
    }
    if (!selection && state.pain >= FORCE_REST_PAIN && strategy.name !== '안 쉬기') {
      const available = getRestOptions(state,'spacing').find(o=>o.available);
      if (available) selection = ['spacing',available.minutes];
    }
    if (selection) {
      state = restAtPlace(state,{ actionId:selection[0],minutes:selection[1],rng });
      inputs += 2 + (['plan','chat','wander'].includes(selection[0]) ? 1 : 0); decisions++;
    } else if (getMoveOption(state,deck.peek()).available) { inputs++; move(); }
    else state = returnFromDay(state);
  }
  inputs += 2; // 귀환/종료 확인과 결과 보기의 보수적 입력 추정
  assert.ok(state.currentTime <= DAY_END);
  assert.equal(state.visits.length,state.timeline.filter(x=>x.type === 'walk').length);
  assert.equal(state.records.length,state.timeline.filter(x=>x.type === 'rest').length);
  assert.equal(new Set(state.records.map(r=>r.restId)).size,state.records.length);
  assert.ok(state.mealRecords.length <= 1);
  for (let i=1;i<state.timeline.length;i++) assert.equal(state.timeline[i].startTime,state.timeline[i-1].endTime);
  for (const event of state.eventRecords) {
    const visit = state.visits.find(v=>v.visitId === event.visitId);
    assert.ok(event.time >= visit.walkStartTime && event.time <= visit.arrivalTime);
  }
  for (const r of state.records) assert.ok(Number.isFinite(r.satisfaction) && Number.isFinite(r.overstayDriveCost));
  const fadeSeconds = (state.visits.length + 3) * SCENE_TIMING.fade / 1000;
  const animationSeconds = fadeSeconds + (SCENE_TIMING.departure
    + state.visits.length * (SCENE_TIMING.journey + SCENE_TIMING.outcome)
    + (state.records.length + state.mealRecords.length + eventChoices) * SCENE_TIMING.outcome
    + state.records.filter(r=>r.action === 'spacing').length * SCENE_TIMING.spacing) / 1000;
  return { state,inputs,decisions,fadeSeconds,animationSeconds };
}
function collect() {
  return ['city','village','beach'].flatMap(destination=>STRATEGIES.map(strategy=>({
    destination,strategy,runs:Array.from({length:100},(_,i)=>runDay(destination,strategy,1000+i))
  })));
}
function normalRates(runs) {
  const normal = runs.filter(r=>!['pain','drive'].includes(getDayEndReason(r.state)));
  return { forced:1-normal.length/runs.length,
    night:normal.filter(r=>r.state.currentTime >= DAY_PHASES.at(-1).start).length/Math.max(1,normal.length) };
}
const originalCost = REST_BALANCE.overstayDriveCost;
let groups, selectedCost;
for (const cost of [4,3,2]) {
  REST_BALANCE.overstayDriveCost = cost; // 승인된 후보만 메모리에서 비교하며 소스는 변경하지 않는다.
  groups = collect();
  if (groups.filter(g=>g.strategy === STRATEGIES[0]).every(g=>{
    const rates=normalRates(g.runs); return rates.forced <= 0.1 && rates.night >= 0.8;
  })) { selectedCost=cost; break; }
  console.log('追加 체류 비용 '+cost+': 정상 기준 미달');
}
REST_BALANCE.overstayDriveCost = originalCost;
assert.ok(selectedCost,'승인된 모든 비용 후보가 기준 미달. 다른 계수는 임의로 바꾸지 않는다.');
assert.equal(selectedCost,originalCost,'선택된 비용을 state.js에 반영한 뒤 다시 검증해야 한다.');
console.log('정상 기준 통과: 추가 체류 비용 '+selectedCost+'/30분');
for (const {destination,strategy,runs} of groups) {
  const avg = fn=>runs.reduce((sum,r)=>sum+fn(r),0)/runs.length;
  const endings = Object.fromEntries(['time','returned','drive','pain'].map(reason=>[reason,runs.filter(r=>getDayEndReason(r.state)===reason).length]));
  const rates = normalRates(runs);
  console.log(destination+'/'+strategy.name+': 방문 '+avg(r=>r.state.visits.length).toFixed(1)
    +' / 쉼 '+avg(r=>r.state.records.length).toFixed(1)+'회 ('+avg(r=>r.state.records.reduce((s,x)=>s+x.restMinutes,0)).toFixed(0)+'분)'
    +' / 통증 '+avg(r=>r.state.pain).toFixed(1)+' / 마음 '+avg(r=>r.state.drive).toFixed(1)
    +' / 종료 '+formatTime(Math.round(avg(r=>r.state.currentTime)))
    +' / 강제 '+(rates.forced*100).toFixed(0)+'% / 정상의 밤 도달 '+(rates.night*100).toFixed(0)+'% '+JSON.stringify(endings)
    +' / 판단 '+avg(r=>r.decisions).toFixed(1)+' / 입력 '+avg(r=>r.inputs).toFixed(1)
    +' / 연출 '+avg(r=>r.animationSeconds).toFixed(0)+'초 / 전환 '+avg(r=>r.fadeSeconds).toFixed(1)+'초'
    +' / 추정 '+(avg(r=>r.animationSeconds+r.inputs*4)/60).toFixed(1)+'~'+(avg(r=>r.animationSeconds+r.inputs*8)/60).toFixed(1)+'분');
}
let saved=0;
for (const destination of ['city','village','beach']) for (let seed=1000;seed<1100;seed++) {
  const route=createDeck(destination,createRng(seed)).remaining().slice(0,4);
  const matched=alwaysLong=>{
    let day=createDay();
    for (const card of route) {
      day=moveToPlace(day,card);
      if (isMealDue(day)) day=eatMeal(day,'bench');
      if (alwaysLong) day=restAtPlace(day,{actionId:'spacing',minutes:long,rng:createRng(seed)});
      else while(day.pain>REST_BALANCE.sufficientPain) {
        const advice=getRestAdvice({...day,actionId:'spacing',card:day.currentCard});
        day=restAtPlace(day,{actionId:'spacing',minutes:advice.recommendation==='long'?long:short,rng:createRng(seed)});
      }
      assert.ok(day.pain<40);
    }
    return day.records.reduce((s,r)=>s+r.restMinutes,0);
  };
  const needed=matched(false),always=matched(true);
  assert.ok(needed<always);saved+=always-needed;
}
console.log('3,000개 사건 포함 세션 + 300개 동일 경로/행동/사건 없음 비교 통과. 평균 '+(saved/300).toFixed(1)+'분 절약.');
console.log('입력당 4~8초와 생략하지 않은 연출을 합친 추정이다. 실제 3~5분·재미·이해도는 사용자 3명 이상의 플레이 테스트로 확인해야 한다.');
