import test from 'node:test';import assert from 'node:assert/strict';
import {NORMAL_KARTE_BOSSES,normalBossPool,selectNormalMapBoss,createNormalMapBoss} from '../data/karte-normal-bosses.js';
import {NORMAL_MAP_THEMES} from '../data/special-map-themes.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {matchesV2Battle,resumeV2Encounter} from '../js/special-map/encounter-v2.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createInitialCharacter} from '../data/classes.js';
import {grantV2BattleRewards,settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
import {prepareNormalBossImage} from '../js/special-map/normal-boss-presentation.js';
import {getEquipmentAdjustedEscapeRate,resolveEscapeAttempt} from '../combat/resolve-escape.js';
import {surveyVisitV2} from '../data/special-map-survey-v2.js';
import {F3_MAP_FIXTURES} from './fixtures/special-map-f3.mjs';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
import {computeBossVariantAdjustments} from '../js/boss-color-variant.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'QA'};
const input={seed:12345,level:50,rarity:'WHITE',themeId:'crystal'};
test('device originals roundtrip to identical boss/name/color without survey',()=>{
 for(const f of F3_MAP_FIXTURES){const decoded=decodeMapCode(f.code);assert.equal(decoded.ok,true);assert.equal(encodeMapCode(decoded.map),f.code);
  assert.equal(decoded.map.surveyedMasks,undefined);assert.equal(describeV2MapName(decoded.map).name,f.name);
  const boss=selectNormalMapBoss({...decoded.map,themeId:f.themeId});assert.equal(boss.id,f.bossId);
  assert.deepEqual(computeBossVariantAdjustments({...decoded.map,bossId:boss.id}),f.adjustments);
 }
});
test('metadata pools: 20 normals, twelve exclusive, no special boss, deterministic full content',()=>{
 assert.equal(Object.keys(NORMAL_KARTE_BOSSES).length,20);
 for(const themeId of NORMAL_MAP_THEMES){const pool=normalBossPool(themeId);assert.equal(pool.length,({blue:9,red:9,torture:10,yellow:10,green:11,water:11}[themeId]||8));
  for(let seed=0;seed<100;seed++){const b=selectNormalMapBoss({...input,seed,themeId});assert.ok(pool.includes(b));assert.equal(selectNormalMapBoss({...input,seed,themeId,discovererName:'別人'}),b);}
 }
 for(const themeId of ['gold','rice','dusk','tender'])assert.throws(()=>selectNormalMapBoss({...input,themeId}));
 for(const level of [0,101,NaN])assert.throws(()=>createNormalMapBoss({...input,level}));
});
test('Lv1..100 valid, deterministic stats, only whale escape enabled, no item drop',()=>{
 for(const level of [1,5,25,50,75,100])for(const themeId of NORMAL_MAP_THEMES){
  const d=createNormalMapBoss({...input,themeId,level}),e=createEnemyCombatant(d);
  assert.deepEqual(createNormalMapBoss({...input,themeId,level}),d);
  assert.ok(e.isBoss&&e.noDrop&&e.fixedGoldPerDefeat);assert.ok(e.hp>0&&e.hp<20000);
  assert.ok(Object.values(e.stats).every(n=>Number.isInteger(n)&&n>0));
  assert.equal(getEquipmentAdjustedEscapeRate({escapeRate:e.escapeRate,isBoss:e.isBoss,weaponId:'vorpal_sword'}),e.id==='karte_boss_023'?1:0);
  assert.equal(resolveEscapeAttempt({escapeRate:e.escapeRate,rng:()=>0}).success,e.id==='karte_boss_023');
 }
});
function session(options={}){const s=createSpecialMapV2Session([map],mapOriginalId(map),options);s.currentFloor=2;Object.assign(s,s.generatedMap.bossRoom.bossCell?{playerX:s.generatedMap.bossRoom.bossCell.x,playerY:s.generatedMap.bossRoom.bossCell.y}:{});return s;}
test('boss cell: requires session key, survey flush precedes battle; special four never fight',()=>{
 const events=[];let save=true;
 const s=session({persistSurvey:()=>{events.push('save');return {ok:save};},onBossEncounter:(_,boss,c)=>events.push(c.source)});
 try{
  s.onBossCell();assert.equal(s.battleContext,null);
  s.bossKeyFound=s.bossDoorUnlocked=true;s.recordSurvey(s.playerX,s.playerY);save=false;s.onBossCell();assert.ok(s.pendingBoss);assert.equal(s.battleContext,null);
  save=true;assert.ok(s.retryBossEncounter());assert.equal(events.at(-2),'save');assert.equal(events.at(-1),'special-map-v2-boss');
  const c=s.battleContext;assert.equal(c.floorIndex,2);assert.equal(c.bossId,selectNormalMapBoss(input).id);assert.ok(matchesV2Battle(s,structuredClone(c)));
  assert.equal(matchesV2Battle(s,{...c,source:'special-map-v2'}),false);
  resumeV2Encounter(s,c);s.bossDefeated=true;s.onBossCell();assert.equal(s.battleContext,null);
  s.bossDefeated=false;for(const theme of ['gold','rice','dusk','tender']){s.generatedMap.themeId=theme;s.onBossCell();assert.equal(s.battleContext,null);}
 }finally{s.disposeSurvey();}
 const again=session();assert.equal(again.bossDefeated,false);again.disposeSurvey();
});
test('299→300 waits for committed survey notification/audio before boss; no auto-survey',()=>{
 const original={...map,surveyedMasks:Array(3).fill('f'.repeat(25))};
 const probe=session(),p=probe.generatedMap.bossRoom.bossCell;probe.disposeSurvey();
 const index=p.y*10+p.x,nibble=Math.floor(index/4),bit=index%4;
 original.surveyedMasks[2]='f'.repeat(nibble)+(15&~(1<<bit)).toString(16)+'f'.repeat(24-nibble);
 let count=0;const s=createSpecialMapV2Session([original],mapOriginalId(original),{onBossEncounter:()=>count++});
 try{s.currentFloor=2;s.playerX=p.x;s.playerY=p.y;s.bossKeyFound=s.bossDoorUnlocked=true;
  assert.equal(s.totalSurveyed,299);s.recordSurvey(p.x,p.y);assert.equal(s.totalSurveyed,300);s.onBossCell();assert.equal(count,0);
  assert.deepEqual(s.surveyNotice,{total:300,floor:2});s.surveyNotice=null;
  s.surveyCompletionPending=false;s.surveyPresentationPlaying=true;s.retryBossEncounter();assert.equal(count,0);
  s.surveyPresentationPlaying=false;s.retryBossEncounter();assert.equal(count,1);s.onBossCell();assert.equal(count,1);
 }finally{s.disposeSurvey();}
});
test('boss EXP/G enter existing return transaction once; normal carried state untouched',()=>{
 const s=session({onBossEncounter:()=>{}});try{
  s.bossKeyFound=s.bossDoorUnlocked=true;s.onBossCell();
  const enemy=createEnemyCombatant(createNormalMapBoss(input));enemy.hp=0;enemy.alive=false;
  let c=createInitialCharacter({name:'QA',job:'warrior'});c.carriedExperience=777;const before=c.experience,gold=c.gold;
  const battle={enemy,explorationContext:structuredClone(s.battleContext)};
  grantV2BattleRewards(c,battle,s);grantV2BattleRewards(c,battle,s);assert.equal(s.battleExperience,enemy.experienceReward);assert.equal(s.lootBag.gold,enemy.dropGold);assert.equal(c.experience,before);
  assert.equal(settleV2ReturnExperience(c,s,()=>false),false);assert.equal(s.battleExperience,enemy.experienceReward);
  settleV2ReturnExperience(c,s,r=>{c={...c,...r.changes};return true;});assert.equal(c.carriedExperience,777);assert.equal(c.experience,before+Math.floor(enemy.experienceReward*1.25));assert.equal(c.gold,gold+enemy.dropGold);
 }finally{s.disposeSurvey();}
});
test('presentation prepares before use, caches URL serialization, false/failure retains original',async()=>{
 const boss=createNormalMapBoss(input),context={mapLevel:50,mapSeed:12345,rarity:'WHITE',themeId:'crystal'};
 let calls=0;const canvas={toDataURL:()=>{calls++;return 'data:image/png;base64,QA';}},deps={load:async()=>({}),prepare:async()=>canvas,warn:()=>{}};
 assert.match(await prepareNormalBossImage(boss,context,deps),/^data:/);await prepareNormalBossImage(boss,context,deps);assert.equal(calls,1);
 assert.equal(await prepareNormalBossImage({...boss,allowColorVariant:false},context,{...deps,prepare:()=>assert.fail()}),boss.image);
 assert.equal(await prepareNormalBossImage(boss,context,{...deps,load:async()=>{throw Error('decode');}}),boss.image);
});

test('survey center notice fires per completed floor, not cumulative 100; never repeats on revisit',()=>{
 const masks=Array(3).fill('0'.repeat(25));let partial=masks;
 for(let i=0;i<50;i++)partial=surveyVisitV2(partial,0,i%10,Math.floor(i/10));
 for(let i=0;i<49;i++)partial=surveyVisitV2(partial,1,i%10,Math.floor(i/10));
 const original={...map,surveyedMasks:partial},s=createSpecialMapV2Session([original],mapOriginalId(original));
 try{
  s.surveyNotice=null;s.currentFloor=1;s.recordSurvey(9,4);assert.equal(s.totalSurveyed,100);assert.equal(s.surveyNotice,null);
  for(let i=50;i<100;i++)s.recordSurvey(i%10,Math.floor(i/10));
  assert.deepEqual(s.surveyNotice,{total:150,floor:1});s.surveyNotice=null;s.recordSurvey(9,9);assert.equal(s.surveyNotice,null);
  const again=createSpecialMapV2Session([{...original,surveyedMasks:s.surveyedMasks}],mapOriginalId(original));
  assert.equal(again.surveyNotice,undefined);again.disposeSurvey();
 }finally{s.disposeSurvey();}
});
