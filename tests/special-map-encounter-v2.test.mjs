import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {actSpecialMap,updateSpecialMotion,continueSpecialAutoWalker} from '../js/special-map/session.js';
import {rollV2Species,attachV2Encounters,resumeV2Encounter,isV2EncounterCell} from '../js/special-map/encounter-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {createInitialCharacter} from '../data/classes.js';
import {grantV2BattleRewards} from '../js/special-map/battle-rewards-v2.js';
import {getPresence,restorePresence} from '../js/presence.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'試験'};
const create=options=>createSpecialMapV2Session([map],mapOriginalId(map),options);
function ordinary(s){for(let y=0;y<10;y++)for(let x=0;x<10;x++){s.playerX=x;s.playerY=y;if(isV2EncounterCell(s))return;}}
test('weighted roll preserves exact boundaries and rejects boss/invalid pools',()=>{
 const pool=[{id:'a',weight:7000},{id:'b',weight:2000},{id:'c',weight:1000}];
 assert.deepEqual([0,.6999,.7,.8999,.9,.9999].map(r=>rollV2Species(pool,()=>r)),['a','a','b','b','c','c']);
 assert.throws(()=>rollV2Species([{id:'karte_boss_lumina',weight:10000}]));
 assert.throws(()=>rollV2Species([{id:'a',weight:0}]));
 const counts={a:0,b:0,c:0};for(let n=0;n<100000;n++)counts[rollV2Species(pool,()=>n/100000)]++;
 assert.deepEqual(counts,{a:70000,b:20000,c:10000});
});
test('only completed steps advance V2 presence, events and turning do not',()=>{
 const s=create({onEncounter:()=>{},random:()=>0});
 assert.equal(s.presence,0);actSpecialMap(s,'right',0);updateSpecialMotion(s,1000);assert.equal(s.presence,0);
 const d=s.generatedMap.walls[s.playerY*10+s.playerX].findIndex(v=>!v);
 s.direction=d;s.renderState.angle=d*Math.PI/2-Math.PI/2;
 assert.ok(actSpecialMap(s,'up',2000));assert.equal(s.presence,0);updateSpecialMotion(s,3000);assert.equal(s.presence,isV2EncounterCell(s)?4:0);
 s.disposeSurvey();
});
test('stairs, opened chest and BOSS remain encounter-free; antechamber allowed',()=>{
 const s=create({onEncounter:()=>{},random:()=>0});s.currentFloor=2;
 for(const p of [s.generatedMap.stairsUp,s.generatedMap.keyChest,s.generatedMap.bossRoom.bossCell]){
  s.playerX=p.x;s.playerY=p.y;s.presence=99;s.onEncounterStep();assert.equal(s.presence,99);
 }
 const p=s.generatedMap.bossRoom.cells[0];s.playerX=p.x;s.playerY=p.y;assert.equal(isV2EncounterCell(s),true);s.disposeSurvey();
});
test('blocked steps do not charge; auto-walker uses the same arrival and stops for battle',()=>{
 let count=0;const s=create({onEncounter:()=>count++,random:()=>0});
 // A wall at the entrance cannot charge the gauge.
 const walls=s.generatedMap.walls[s.playerY*10+s.playerX];
 s.direction=walls.findIndex(Boolean);assert.equal(actSpecialMap(s,'up',0),false);assert.equal(s.presence,0);
 const d=walls.findIndex(v=>!v);s.direction=d;s.autoPath=[['N','E','S','W'][d]];s.presence=99;
 continueSpecialAutoWalker(s,100);assert.equal(count,0);updateSpecialMotion(s,1000);
 assert.equal(count,1);assert.equal(s.autoPath,null);assert.equal(s.transitioning,true);
 assert.equal(actSpecialMap(s,'up',2000),false);assert.equal(s.onEncounterStep(),false);
 resumeV2Encounter(s,s.battleContext);assert.equal(s.autoPath,null);assert.equal(s.presence,0);s.disposeSurvey();
});
test('current floor, context and session state survive resume; abyss presence unchanged',()=>{
 restorePresence(47);const calls=[];const s=create({onEncounter:(...args)=>calls.push(args),random:()=>0});
 for(let f=0;f<3;f++){
  s.currentFloor=f;ordinary(s);s.torchFuel=63;s.bossKeyFound=true;s.bossDoorUnlocked=true;s.presence=99;s.autoPath=['N'];
  const floors=s.floors,mask=[...s.surveyedMasks],position=[s.playerX,s.playerY,s.direction];
  assert.ok(s.onEncounterStep());const context=s.battleContext;
  assert.equal(context.speciesId,s.ecology.floors[f].species[0].id);assert.equal(context.floorIndex,f);assert.equal(context.source,'special-map-v2');assert.equal(context.mapLevel,50);
  assert.equal(s.onEncounterStep(),false);assert.equal(s.autoPath,null);
  assert.ok(resumeV2Encounter(s,context));assert.equal(s.presence,0);assert.equal(s.floors,floors);assert.deepEqual(s.surveyedMasks,mask);assert.deepEqual([s.playerX,s.playerY,s.direction],position);assert.equal(s.torchFuel,63);assert.equal(s.bossKeyFound,true);assert.equal(s.bossDoorUnlocked,true);
 }
 assert.equal(calls.length,3);assert.equal(getPresence(),47);s.disposeSurvey();restorePresence(0);
});
test('all special themes use C2; incomplete rare combatant is blocked, never replaced',()=>{
 for(const themeId of ['gold','rice','dusk','tender']){
  const s=create();s.level=100;s.generatedMap.themeId=themeId;let calls=0,warnings=0;
  attachV2Encounters(s,{random:()=>0,onEncounter:()=>calls++,onBlocked:()=>warnings++});ordinary(s);
  s.ecology.floors[0].species=[{id:'maikaefer_koenig',weight:10000}];s.presence=99;
  assert.equal(s.onEncounterStep(),false);assert.equal(calls,0);assert.equal(warnings,1);assert.equal(s.battleContext,null);s.disposeSurvey();
 }
});
test('V2 rewards settle only battle EXP and loot without ordinary carried settlement',()=>{
 const c=createInitialCharacter({name:'試験',job:'warrior'});c.carriedExperience=123;c.pendingExperienceSettlement={test:true};const before=structuredClone(c);
 const {character:n,exp}=grantV2BattleRewards(c,{enemy:{experienceReward:100,dropGold:20}},()=>.5);
 assert.equal(exp,100);assert.equal(n.experience,c.experience+100);assert.equal(n.gold,c.gold+20);assert.equal(n.carriedExperience,123);assert.deepEqual(n.pendingExperienceSettlement,c.pendingExperienceSettlement);assert.deepEqual(n.lootBag,c.lootBag);assert.deepEqual(c,before);
});
