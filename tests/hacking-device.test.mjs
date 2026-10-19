import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantKeyItem,hasKeyItem} from '../data/key-items.js';
import {surveyOperation,transactSurvey,surveyPrizeDetails,SURVEY_PRIZES} from '../data/survey-report.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
const ready=(n=3)=>{let c=createInitialCharacter({name:'QA',job:'warrior'});c.reincarnationCount=n;c=surveyOperation(surveyOperation(c,'book').character,'intro').character;c.specialMaps.stampPoints=2000;return c;};
test('device exchange requires third reincarnation, preserves flavor and supports atomic retry and uniqueness',()=>{
 for(let n=0;n<3;n++)assert.equal(surveyOperation(ready(n),'exchange','hacking_device').ok,false);
 let c=ready(),before=structuredClone(c),fail=true;
 const api={getCharacter:()=>c,setCharacter:v=>c=v,save:()=>!fail};
 assert.equal(transactSurvey(api,'exchange','hacking_device').ok,false);assert.deepEqual(c,before);
 fail=false;assert.ok(transactSurvey(api,'exchange','hacking_device').ok);assert.equal(c.specialMaps.stampPoints,1000);assert.ok(hasKeyItem(c.keyItems,'hacking_device'));assert.equal(c.specialMaps.surveyShoesExchanged,false);
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(transactSurvey(api,'exchange','hacking_device').ok,false);assert.equal(c.specialMaps.stampPoints,1000);
 assert.ok(surveyOperation(c,'exchange','alveter_schuhe').ok);
 const info=surveyPrizeDetails(SURVEY_PRIZES.find(x=>x.id==='hacking_device'));assert.equal(info.category,'貴重品');assert.equal(info.description,'明らかにこの世界の物ではない。用途は不明。');assert.match(info.effect,/5％/);
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
