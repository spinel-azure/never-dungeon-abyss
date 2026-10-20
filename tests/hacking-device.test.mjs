import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantKeyItem,hasKeyItem} from '../data/key-items.js';
import {surveyOperation,transactSurvey,surveyPrizeDetails,SURVEY_PRIZES} from '../data/survey-report.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {totalSurveyReports} from '../data/survey-report.js';
import {prepareSuperGoddessAction,executeSuperGoddessUtility,goddessState} from '../combat/goddess-superboss.js';
import {finishGoddessAction,reviveGoddess} from '../combat/karte-goddesses.js';
const ready=(n=3)=>{let c=createInitialCharacter({name:'QA',job:'warrior'});c.reincarnationCount=n;c=surveyOperation(surveyOperation(c,'book').character,'intro').character;c.specialMaps.stampPoints=2000;c.specialMaps.surveyRewardClaims=Object.fromEntries(Array.from({length:1000},(_,seed)=>[JSON.stringify(['special-map-v2',seed,1,'WHITE']),true]));return c;};

test('historical reports count independently of points and registered maps, threshold 999/1000',()=>{
 let c=ready();c.specialMaps.stampPoints=0;c.specialMaps.registered=[];
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(totalSurveyReports(c),1000);
 const key=JSON.stringify(['special-map-v2',999,1,'WHITE']);delete c.specialMaps.surveyRewardClaims[key];
 c.specialMaps.surveyRewardClaims.invalid=true;c.specialMaps.surveyRewardClaims[JSON.stringify(['special-map-v2',1001,1,'WHITE'])]=false;
 assert.equal(totalSurveyReports(c),999);assert.equal(surveyOperation(c,'exchange','hacking_device').ok,false);
 c.specialMaps.surveyRewardClaims[key]=true;
 const r=surveyOperation(c,'exchange','hacking_device');assert.ok(r.ok);assert.equal(r.character.specialMaps.stampPoints,0);
 assert.equal(surveyOperation(r.character,'exchange','hacking_device').ok,false);
});

function deviceBattle(theme,on=true){const c=ready();if(on)c.keyItems=grantKeyItem(c.keyItems,'hacking_device').keyItems;return createBattleState({character:c,enemy:createEnemyCombatant(createGoddessMapBoss({themeId:theme,level:100}))});}
test('device reduces only Lumina lightning by 10 percent in both phases',()=>{
 for(const phase of [false,true])for(const element of ['lightning','fire']){
  const values=[false,true].map(on=>{const b=deviceBattle('rice',on);if(phase)b.enemy.hp=100000;return prepareSuperGoddessAction(b,b.enemy,{actionType:'spell',element}).goddessDamageMultiplier;});
  assert.ok(Math.abs(values[1]-values[0]*(element==='lightning'?.9:1))<1e-10);
 }
});
test('device halves only the moon bonus, retaining full moon eclipse and its priority',()=>{
 for(let moon=0;moon<4;moon++)for(const on of [false,true]){
  const b=deviceBattle('dusk',on);goddessState(b.enemy).moon=moon;b.turn=2;
  const a=prepareSuperGoddessAction(b,b.enemy,{actionType:'spell',element:'dark'});
  assert.ok(Math.abs(a.goddessDamageMultiplier-10*(1+[0,.15,.25,.4][moon]*(on?.5:1)))<1e-10);
  if(moon===3){assert.equal(a.id,'noctia_eclipse');assert.equal(a.turnPriority,-1);}
 }
});
test('device reduces Zelena prepared healing and regeneration by 25 percent but not revival',()=>{
 for(const on of [false,true]){
  const b=JSON.parse(JSON.stringify(deviceBattle('tender',on))),e=b.enemy;e.hp=100000;
  goddessState(e).healPreparation={remaining:0,damage:0,name:'若葉の息吹'};
  executeSuperGoddessUtility(b,e,{goddessUtility:'preparedHeal'});assert.equal(e.hp,100000+(on?6300:8400));
  const before=e.hp;Object.assign(goddessState(e),{regen:1,executed:true,lastAction:{id:'idle',goddessUtility:'wait'}});
  finishGoddessAction(b,e);assert.equal(e.hp-before,on?1575:2100);
  e.hp=0;assert.ok(reviveGoddess(b,e));assert.equal(e.hp,63000);assert.equal(reviveGoddess(b,e),false);
 }
});
test('device exchange requires third reincarnation, preserves flavor and supports atomic retry and uniqueness',()=>{
 for(let n=0;n<3;n++)assert.equal(surveyOperation(ready(n),'exchange','hacking_device').ok,false);
 let c=ready(),before=structuredClone(c),fail=true;
 const api={getCharacter:()=>c,setCharacter:v=>c=v,save:()=>!fail};
 assert.equal(transactSurvey(api,'exchange','hacking_device').ok,false);assert.deepEqual(c,before);
 fail=false;assert.ok(transactSurvey(api,'exchange','hacking_device').ok);assert.equal(c.specialMaps.stampPoints,2000);assert.ok(hasKeyItem(c.keyItems,'hacking_device'));assert.equal(c.specialMaps.surveyShoesExchanged,false);
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(transactSurvey(api,'exchange','hacking_device').ok,false);assert.equal(c.specialMaps.stampPoints,2000);
 assert.ok(surveyOperation(c,'exchange','alveter_schuhe').ok);
 const info=surveyPrizeDetails(SURVEY_PRIZES.find(x=>x.id==='hacking_device'));assert.equal(info.category,'貴重品');assert.equal(info.description,'明らかにこの世界の物ではない。用途は不明。');assert.equal(info.effect,'効果は不明。『HACKING AURORA OS』と書かれているが…？');
});
test('only Lv100 goddesses at reincarnation3 lose starting HP, not maxHP; JSON resume does not reapply',()=>{
 for(const theme of ['rice','dusk','tender'])for(const count of [0,1,2,3])for(const level of [99,100]){
  const c=ready(count);c.keyItems=grantKeyItem(c.keyItems,'hacking_device').keyItems;
  const e=createEnemyCombatant(createGoddessMapBoss({themeId:theme,level}));const b=createBattleState({character:c,enemy:e});
  const expected=count===3&&level===100?Math.floor(e.maxHp*.95):e.maxHp;
  assert.equal(b.enemy.hp,expected);assert.equal(b.enemy.maxHp,e.maxHp);assert.equal(e.hp,e.maxHp);
  b.enemy.actions=[{weight:1,action:{id:'idle',name:'idle',actionType:'wait'}}];
  const r=resolveBattleRound({battle:JSON.parse(JSON.stringify(b)),playerCommand:{type:'guard'},rng:()=>.5}).battle;
  assert.equal(r.enemy.hp,expected);assert.equal(r.enemy.maxHp,e.maxHp);
 }
 const c=ready();const e=createEnemyCombatant(createGoddessMapBoss({themeId:'rice',level:100}));assert.equal(createBattleState({character:c,enemy:e}).enemy.hp,250000);
 c.keyItems=grantKeyItem(c.keyItems,'hacking_device').keyItems;e.id='ordinary_boss';assert.equal(createBattleState({character:c,enemy:e}).enemy.hp,250000);
});
