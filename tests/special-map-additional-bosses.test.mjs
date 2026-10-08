import test from 'node:test';
import assert from 'node:assert/strict';
import {NORMAL_KARTE_BOSSES,normalBossPool,selectNormalMapBoss,createNormalMapBoss} from '../data/karte-normal-bosses.js';
import {NORMAL_MAP_THEMES} from '../data/special-map-themes.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,createEnemyAction,resolveBattleRound} from '../combat/battle-engine.js';
import {bossTestCharacter} from '../tools/simulate-map-bosses.mjs';
import {resolveEscapeAttempt} from '../combat/resolve-escape.js';
import {applyStatusApplications} from '../combat/status-lifecycle.js';
import {grantItem} from '../data/inventory.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {generateSpecialMapV2} from '../js/special-map/generator-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {prepareMapBossReward,confirmMapBossVictory,receiveMapBossReward} from '../data/special-map-rewards.js';
import {grantV2BattleRewards} from '../js/special-map/battle-rewards-v2.js';
import {createBossVariantCache} from '../js/boss-color-variant.js';
const ids=Array.from({length:7},(_,i)=>`karte_boss_${String(18+i).padStart(3,'0')}`);
function inputFor(id,level=100){
 const themeId=NORMAL_KARTE_BOSSES[id].themes[0];
 for(let seed=0;seed<65536;seed++){
  const input={seed,level,rarity:'WHITE',themeId};
  if(selectNormalMapBoss(input).id===id)return input;
 }
 throw Error('No boss seed');
}
const enemy=(n,level=100)=>createEnemyCombatant(createNormalMapBoss(inputFor(`karte_boss_0${n}`,level)));
function battle(n){const c=bossTestCharacter(100);c.cards.deckSlots=[];c.hp=c.maxHp=10000;return createBattleState({character:c,enemy:enemy(n)});}
function round(b,command={type:'wait'},rng=()=>.5){const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.equal(r.accepted,true,r.reason);return r.battle;}
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='enemy');

test('all seven are selectable only in README themes and scale from Lv1 to Lv100',()=>{
 for(const id of ids){
  for(const theme of NORMAL_MAP_THEMES)assert.equal(normalBossPool(theme).some(b=>b.id===id),NORMAL_KARTE_BOSSES[id].themes.includes(theme));
  let hp=0;
  for(const level of [1,5,25,50,75,100]){
   const input=inputFor(id,level),d=createNormalMapBoss(input),e=createEnemyCombatant(d);
   assert.deepEqual(createNormalMapBoss(input),d);assert.equal(e.name,`${NORMAL_KARTE_BOSSES[id].name} Lv.${level}`);
   assert.ok(e.maxHp>hp);hp=e.maxHp;assert.ok(e.experienceReward>0&&e.dropGold>0);
  }
 }
});
test('Munter death poison unlocks at exactly half HP and never heals',()=>{
 const e=enemy(18);e.hp=e.maxHp*.5+1;assert.notEqual(createEnemyAction(e,()=>.999).id,'munter_death_poison');
 e.hp=e.maxHp*.5;assert.equal(createEnemyAction(e,()=>.999).id,'munter_death_poison');
 assert.ok(e.actions.every(a=>a.action.actionType==='physicalAttack'));assert.ok(!e.regainRate);
});
test('elite sealing arrow uses Aries opening; waits disappear at half HP; true arrow exists',()=>{
 let b=battle(19);assert.equal(b.player.battleSkillSealed,true);
 const c=bossTestCharacter(100);c.cards.deckSlots=['zodiac_aries'];
 b=createBattleState({character:c,enemy:enemy(19)});assert.equal(b.player.battleSkillSealed,false);assert.equal(b.zentaurinOpening.broken,true);
 assert.equal(createEnemyAction(b.enemy,()=>.999).actionType,'wait');
 b.enemy.hp=b.enemy.maxHp*.5;const a=createEnemyAction(b.enemy,()=>.999);assert.equal(a.unavoidable,true);
});
test('empress and arachne act twice at half HP, once above; skipped action is consumed',()=>{
 for(const n of [20,21])for(const multi of [false,true]){
  let b=battle(n);b.enemy.hp=b.enemy.maxHp*.5+1;
  if(multi){b.enemies=[b.enemy];b.targetIndex=0;}
  assert.equal(hits(round(b)).length,1);
  b.enemy.hp=b.enemy.maxHp*.5;assert.equal(hits(round(b)).length,2);
  b.enemy.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);
  const skipped=round(b);assert.ok(skipped.log.some(x=>x.includes('動けない')));
 }
});
test('flower regains five percent and both herbicides deal 500 and suppress regain',()=>{
 let b=battle(22);b.enemy.hp=1000;const regained=round(b);assert.equal(regained.enemy.hp,1000+Math.floor(b.enemy.maxHp*.05));
 for(const itemId of ['strong_herbicide','strong_herbicide_trial']){
  b=battle(22);b.enemy.hp=1000;b.player.inventory=grantItem(b.player.inventory,itemId,1).inventory;
  b.enemy.actions=[{weight:1,action:{id:'wait',actionType:'wait',speedModifier:1000}}];
  const before=round(b);const r=round(before,{type:'item',itemId});
  // Enemy acts before the item, so it regains once, then loses exactly 500.
  assert.equal(r.enemy.hp,before.enemy.hp+Math.floor(b.enemy.maxHp*.05)-500);
  assert.equal(r.enemy.regainSuppressedTurns,5);
  const hp=r.enemy.hp;assert.equal(round(r).enemy.hp,hp);
 }
});
test('whale blocks melee, permits escape, and floods only after a prior warning for 60% max HP',()=>{
 let b=battle(23);const hp=b.enemy.hp;b=round(b,{type:'attack'});assert.equal(b.enemy.hp,hp);assert.ok(b.log.some(x=>x.includes('グローサー・ヴァール')&&x.includes('届かない')));
 assert.equal(resolveEscapeAttempt({escapeRate:b.enemy.escapeRate,rng:()=>.999}).success,true);
 b=battle(23);assert.notEqual(createEnemyAction(b.enemy,()=>.999).id,'whale_flood_prepare');
 b.enemy.hp=b.enemy.maxHp*.5;const startHp=b.player.hp;
 b=round(b,{type:'wait'},()=>.999);assert.equal(b.player.hp,startHp);assert.equal(b.enemy.reservedEnemyAction.id,'whale_flood');
 assert.ok(b.presentationEvents.some(e=>e.type==='message'&&e.message.includes('大洪水')));
 b=structuredClone(b);const r=round(b,{type:'guard'},()=>.5);
 assert.equal(b.player.hp-r.player.hp,Math.floor(b.player.maxHp*.6));assert.equal(r.enemy.reservedEnemyAction,undefined);
 assert.notEqual(createEnemyAction(r.enemy,()=>.999).id,'whale_flood');
});
test('900x600 whale HSL retains dimensions and cache identity',()=>{
 const image={naturalWidth:900,naturalHeight:600},cache=createBossVariantCache({createCanvas:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([180,50,20,255])}),putImageData(){}})})});
 const options={image,bossId:'karte_boss_023',imagePath:'images/karte_bosses/karte_boss_023.avif',level:100,seed:1,rarity:'WHITE'};
 const result=cache.getBossVariantImage(options);assert.notEqual(result,image);assert.equal(result.width,900);assert.equal(result.height,600);assert.equal(cache.getBossVariantImage(options),result);
});
test('each new boss enters a real normal-theme session and grants EXP/G and one repeat-safe map reward',()=>{
 const found=new Map();
 for(let seed=0;seed<2000&&found.size<7;seed++){
  const map={rulesetVersion:'special-map-v2',seed,level:100,rarity:'WHITE',discovererName:'QA'};
  const themeId=generateSpecialMapV2({...map,ruleset:map.rulesetVersion}).themeId;
  const id=selectNormalMapBoss({...map,themeId}).id;if(ids.includes(id)&&!found.has(id))found.set(id,map);
 }
 assert.equal(found.size,7);
 for(const [id,map] of found){
  let received;const s=createSpecialMapV2Session([map],mapOriginalId(map),{onBossEncounter:(_s,e,c)=>{received={e,c};}});
  try{
   s.currentFloor=2;s.bossKeyFound=s.bossDoorUnlocked=true;const p=s.generatedMap.bossRoom.bossCell;s.playerX=p.x;s.playerY=p.y;s.onBossCell();
   assert.equal(received.e.id,id);s.onBossCell();assert.equal(s.battleContext.battleUuid,received.c.battleUuid);
   let state={registered:[map],unidentified:[],discovererName:'QA'};
   let result=prepareMapBossReward(state,received.c,{random:()=>.4});assert.ok(result.ok);state=result.state;
   result=confirmMapBossVictory(state,structuredClone(received.c));assert.ok(result.ok);state=result.state;
   assert.equal(confirmMapBossVictory(state,received.c).duplicate,true);
   result=receiveMapBossReward(state);assert.ok(result.ok);assert.equal(result.state.unidentified.length,1);assert.equal(result.map.level,100);
   const c=bossTestCharacter(100),e=createEnemyCombatant(received.e);e.hp=0;e.alive=false;const b={enemy:e,explorationContext:received.c};
   grantV2BattleRewards(c,b,s);grantV2BattleRewards(c,b,s);assert.equal(s.battleExperience,e.experienceReward);assert.equal(s.lootBag.gold,e.dropGold);
  }finally{s.disposeSurvey();}
 }
});
