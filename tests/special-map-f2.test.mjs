import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {V2_EXCLUSIVE_ENEMIES,getV2CombatEnemy} from '../data/special-map-enemies.js';
import {enemies,getEnemyById,createEnemyCombatant,getRandomEncounterEnemy,getMagicRegionEncounterFormation,getTortureRegionEncounterFormation,getWaterRegionEncounterFormation,getCrystalRegionEncounterFormation,getDarkRegionEncounterFormation} from '../data/enemies.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {attachV2Encounters,isV2EncounterCell,resumeV2Encounter} from '../js/special-map/encounter-v2.js';
import {generateV2EcologyCandidate2} from '../js/special-map/ecology-v2-candidate-2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
import {grantV2BattleRewards,settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
import {createInitialCharacter} from '../data/classes.js';
import {rollEnemyDrop} from '../data/loot.js';
import {F2_MAP_FIXTURES} from './fixtures/special-map-f2.mjs';
import {createEnemyAction} from '../combat/battle-engine.js';
import {simulateF2} from '../tools/simulate-special-map-f2.mjs';

for(const f of F2_MAP_FIXTURES){
 const map={rulesetVersion:'special-map-v2',seed:f.seed,level:f.level,rarity:'WHITE',discovererName:'†ルル'};
 test(`${f.id}: code, name, unchanged ecology and all three exact encounter rolls`,()=>{
  assert.equal(encodeMapCode(map),f.code);assert.deepEqual(decodeMapCode(f.code).map,map);
  assert.equal(describeV2MapName(map).name,f.name);
  const e=generateV2EcologyCandidate2({ruleset:map.rulesetVersion,...map,themeId:f.themeId});
  assert.deepEqual(e.floors.map(floor=>floor.species.find(s=>s.id===f.id)?.weight||0),f.weights);
  const s=createSpecialMapV2Session([map],mapOriginalId(map));
  try{for(let floor=0;floor<3;floor++){
   let calls=0,roll=0;s.currentFloor=floor;
   attachV2Encounters(s,{random:()=>roll,onBlocked:()=>assert.fail('blocked'),onEncounter:(_,enemy,context)=>{calls++;assert.equal(enemy,getV2CombatEnemy(f.id));assert.equal(context.speciesId,f.id);assert.equal(context.floorIndex,floor);}});
   const pool=s.ecology.floors[floor].species,index=pool.findIndex(row=>row.id===f.id);
   roll=(pool.slice(0,index).reduce((n,row)=>n+row.weight,0)+0.5)/10000;
   for(let i=0;i<100;i++){s.playerX=i%10;s.playerY=Math.floor(i/10);if(isV2EncounterCell(s))break;}
   s.presence=99;s.torchFuel=63;s.bossKeyFound=true;s.bossDoorUnlocked=true;
   const snapshot=JSON.stringify([s.playerX,s.playerY,s.direction,s.surveyedMasks,s.openedDoors,s.floors]);
   assert.equal(s.onEncounterStep(),true);assert.equal(calls,1);
   assert.equal(s.battleContext.mapLevel,f.level);assert.equal(s.battleContext.source,'special-map-v2');
   resumeV2Encounter(s,s.battleContext);
   assert.equal(JSON.stringify([s.playerX,s.playerY,s.direction,s.surveyedMasks,s.openedDoors,s.floors]),snapshot);
   assert.equal(s.torchFuel,63);assert.equal(s.bossKeyFound,true);assert.equal(s.bossDoorUnlocked,true);assert.equal(s.presence,0);
  }}finally{s.disposeSurvey();}
 });
 test(`${f.id}: actual combatant fields, immutable definition and independent instances`,()=>{
  const d=getV2CombatEnemy(f.id),a=createEnemyCombatant(d),b=createEnemyCombatant(d);
  assert.ok(existsSync(d.image));assert.equal(d.isBoss,false);assert.equal(a.isBoss,false);
  for(const key of ['name','image','attack','def','experienceReward','dropGold','fixedGoldPerDefeat','noDrop','escapeRate'])assert.deepEqual(a[key],d[key]);
  for(const key of ['stats','actions','statusResistances','elementMultipliers'])assert.deepEqual(a[key],d[key]);
  assert.equal(a.hp,d.maxHp);assert.equal(a.actions.reduce((n,row)=>n+row.weight,0),100);
  assert.ok(a.actions.every(row=>['physicalAttack','wait'].includes(row.actionType)));
  let weight=0;for(const row of a.actions){const action=createEnemyAction(a,()=>(weight+.5)/100);assert.equal(action.actionType,row.actionType);assert.equal(action.id,row.id);if(row.actionType==='physicalAttack')assert.equal(action.powerPerHit,row.powerPerHit);weight+=row.weight;}
  a.hp=0;a.statuses.push({id:'poison'});a.actions[0].weight=0;a.stats.str=0;
  assert.equal(b.hp,d.maxHp);assert.deepEqual(b.statuses,[]);assert.equal(b.actions[0].weight,d.actions[0].weight);assert.equal(b.stats.str,d.stats.str);
  assert.equal(getEnemyById(f.id),null);assert.equal(getV2CombatEnemy('karte_boss_maikaefer_koenig'),null);
  for(const r of [0,.5,.999])assert.deepEqual(rollEnemyDrop(a,()=>r),{kind:'none'});
 });
 test(`${f.id}: fixed EXP/G accumulate once, failed return can retry, abyss pending untouched`,()=>{
  const s=createSpecialMapV2Session([map],mapOriginalId(map));
  try{
   let c=createInitialCharacter({name:'試験',job:'warrior'});c.carriedExperience=777;c.pendingExperienceSettlement={test:true};c.lootBag={gold:888,items:{},cards:{},equipmentInstances:[]};
   const before=structuredClone(c),d=getV2CombatEnemy(f.id);
   s.battleContext={source:'special-map-v2',sessionId:s.encounterSessionId,battleId:1,mapKey:s.mapKey};
   const enemy=createEnemyCombatant(d);enemy.hp=0;enemy.alive=false;
   const battle={enemy,explorationContext:structuredClone(s.battleContext)};
   assert.equal(grantV2BattleRewards(c,battle,s).exp,d.experienceReward);assert.deepEqual(c,before);
   assert.equal(s.lootBag.gold,d.dropGold);assert.equal(grantV2BattleRewards(c,battle,s).exp,0);
   assert.equal(settleV2ReturnExperience(c,s,()=>false),false);assert.equal(s.battleExperience,d.experienceReward);assert.equal(s.lootBag.gold,d.dropGold);
   assert.equal(settleV2ReturnExperience(c,s,result=>{c={...c,...result.changes};return true;}),true);
   assert.equal(c.experience,before.experience+d.experienceReward+Math.floor(d.experienceReward*f.level/200));assert.equal(c.gold,before.gold+d.dropGold);
   assert.equal(c.carriedExperience,777);assert.deepEqual(c.pendingExperienceSettlement,before.pendingExperienceSettlement);assert.deepEqual(c.lootBag,before.lootBag);
   assert.equal(settleV2ReturnExperience(c,s,()=>assert.fail('duplicate return')),false);
  }finally{s.disposeSurvey();}
 });
}
test('Candidate combat pacing: minimum-level fixtures can win, actions execute through engine',()=>{
 for(const id of ['silberkaefer','maikaefer_koenig'])for(const job of ['warrior','thief','priest','mage']){
  const runs=Array.from({length:20},(_,i)=>simulateF2(id,job,i+1));
  assert.ok(runs.some(r=>r.outcome==='victory'),`${id} ${job} unwinnable`);
  assert.ok(runs.every(r=>r.outcome!=='timeout'));
 }
});
test('dedicated registry cannot leak into ordinary or regional encounter selection',()=>{
 const ids=new Set(V2_EXCLUSIVE_ENEMIES.map(e=>e.id));
 assert.ok(enemies.every(e=>!ids.has(e.id)));assert.equal(getV2CombatEnemy('missing'),null);assert.equal(getV2CombatEnemy(null),null);
 for(let depth=1;depth<=100;depth++)for(let i=0;i<20;i++){
  const rng=()=>i/20;
  assert.ok(!ids.has(getRandomEncounterEnemy({depth,rng})?.id));
  for(const get of [getMagicRegionEncounterFormation,getTortureRegionEncounterFormation,getWaterRegionEncounterFormation,getCrystalRegionEncounterFormation,getDarkRegionEncounterFormation]){
   const formation=get({depth,rng});assert.ok(!JSON.stringify(formation).includes('silberkaefer'));assert.ok(!JSON.stringify(formation).includes('maikaefer_koenig'));
  }
 }
});
test('special themes resolve general ecology species, never fixed bosses',()=>{
 for(const themeId of ['gold','rice','dusk','tender']){
  const e=generateV2EcologyCandidate2({ruleset:'special-map-v2',seed:22172,level:100,rarity:'GOLD',themeId});
  for(const floor of e.floors)for(const row of floor.species){assert.ok(getV2CombatEnemy(row.id));assert.equal(getV2CombatEnemy(row.id).isBoss,false);}
 }
});
