import test from 'node:test';import assert from 'node:assert/strict';
import {createGoldMapBoss} from '../data/karte-gold-boss.js';
import {KARTE_SPECIAL_BOSSES,resolveSpecialThemeBoss} from '../data/karte-special-bosses.js';
import {createSpecialMapV2Session,warpV2ToEntrance} from '../js/special-map/session-v2.js';
import {developmentMapOptions} from '../js/special-map/development-map.js';
import {setExplorerTestEnabled} from '../js/explorer-preview.js';
import {resumeV2Encounter,matchesV2Battle,isV2EncounterCell} from '../js/special-map/encounter-v2.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {getV2CombatEnemy} from '../data/special-map-enemies.js';
import {createInitialCharacter} from '../data/classes.js';
import {grantV2BattleRewards,settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
import {prepareNormalBossImage} from '../js/special-map/normal-boss-presentation.js';
import {generateV2EcologyCandidate2} from '../js/special-map/ecology-v2-candidate-2.js';
import {collectStats} from '../combat/collect-stats.js';

function session(level=60,options={}){
 setExplorerTestEnabled(true);const o=developmentMapOptions({level});
 return createSpecialMapV2Session(o.registered,o.mapKey,{developmentTheme:o.developmentTheme,persistSurvey:o.saveSurvey,...options});
}
test('gold fixed identity/stats/actions; 60..100 integer scaling; no other theme or goddess battle',async()=>{
 const baseline=structuredClone(getV2CombatEnemy('maikaefer_koenig'));
 for(const [level,p] of [[60,.7],[70,.8],[80,.9],[90,.95],[100,1]]){
  const b=createGoldMapBoss({themeId:'gold',level}),e=createEnemyCombatant(b);
  assert.equal(b.name,'デアグローセ・ケーファーケーニヒ');assert.notEqual(b.id,baseline.id);
  assert.equal(b.maxHp,Math.round(32000*p));assert.equal(e.maxSp,0);assert.equal(e.isBoss,true);
  assert.deepEqual(e.stats,Object.fromEntries(Object.entries({str:110,int:35,agi:120,dex:115,luc:130}).map(([k,v])=>[k,Math.round(v*p)])));
  assert.equal(e.def,Math.round(140*p));assert.equal(e.experienceReward,Math.round(12000*p));assert.equal(e.dropGold,Math.round(2500*p));
  // Existing engine caps primary stats at 30. Do not silently change all battles.
  assert.equal(collectStats(e).agi,30);assert.equal(collectStats(e).def,e.def);
  assert.deepEqual(b.actions.map(a=>a.weight),[35,30,25,10]);assert.ok(b.actions.every(a=>a.action.actionType!=='enemyEscape'));
  assert.ok(e.noDrop);assert.equal(e.escapeRate,0);assert.match(e.image,/karte_boss_016.avif$/);
  assert.equal(await prepareNormalBossImage(b,{}, {load:async()=>({}),prepare:()=>assert.fail('HSL forbidden')}),b.image);
 }
 for(const level of [0,1,59,101,NaN]){assert.throws(()=>createGoldMapBoss({themeId:'gold',level}));assert.equal(resolveSpecialThemeBoss('gold',level),null);}
 for(const themeId of ['slate','rice','dusk','tender'])assert.throws(()=>createGoldMapBoss({themeId,level:100}));
 for(const themeId of ['rice','dusk','tender'])assert.equal(resolveSpecialThemeBoss(themeId,100).battleEnabled,false);
 assert.deepEqual(getV2CombatEnemy('maikaefer_koenig'),baseline);
 assert.equal(KARTE_SPECIAL_BOSSES.karte_boss_maikaefer_koenig.allowColorVariant,false);
});
test('gold actual 299 to 300 commits before queued encounter and waits for the completion presentation',()=>{
 setExplorerTestEnabled(true);const o=developmentMapOptions({level:100,seed:12346});
 const probe=createSpecialMapV2Session(o.registered,o.mapKey,{developmentTheme:'gold'}),p=probe.blueprint.floors[2].bossRoom.bossCell;probe.disposeSurvey();
 const masks=Array(3).fill('f'.repeat(25)),i=p.y*10+p.x,n=Math.floor(i/4);masks[2]='f'.repeat(n)+(15&~(1<<(i%4))).toString(16)+'f'.repeat(24-n);
 const original={...o.registered[0],surveyedMasks:masks},events=[];
 const s=createSpecialMapV2Session([original],o.mapKey,{developmentTheme:'gold',persistSurvey:()=>{events.push('save');return {ok:true};},onBossEncounter:()=>events.push('boss')});
 try{
  s.currentFloor=2;s.playerX=p.x;s.playerY=p.y;s.bossKeyFound=s.bossDoorUnlocked=true;
  assert.equal(s.totalSurveyed,299);s.recordSurvey(p.x,p.y);s.onBossCell();assert.equal(s.totalSurveyed,300);assert.deepEqual(events,['save']);
  s.surveyNotice=null;s.surveyCompletionPending=false;s.surveyPresentationPlaying=true;s.retryBossEncounter();assert.deepEqual(events,['save']);
  s.surveyPresentationPlaying=false;s.retryBossEncounter();assert.deepEqual(events,['save','boss']);
 }finally{s.disposeSurvey();setExplorerTestEnabled(false);}
});
test('development maps require opt-in and never change a registered original; frozen Lv1 gold ecology remains valid',()=>{
 setExplorerTestEnabled(false);assert.throws(()=>developmentMapOptions());setExplorerTestEnabled(true);
 assert.throws(()=>developmentMapOptions({level:59}));
 const e=generateV2EcologyCandidate2({ruleset:'special-map-v2',seed:12345,level:1,rarity:'WHITE',themeId:'gold'});assert.equal(e.floors.length,3);
 const s=session();try{assert.ok(s.blueprint.floors.every(f=>f.themeId==='gold'));assert.equal(s.bossDefeated,false);
  for(const f of s.ecology.floors)assert.ok(f.species.every(x=>!x.id.startsWith('karte_boss_')));
 }finally{s.disposeSurvey();setExplorerTestEnabled(false);}
});
test('gold key/survey/save/notice precedes boss; reward once; gate retains runtime; independent return retry',()=>{
 let save=true,starts=0;const s=session(80,{persistSurvey:()=>({ok:save}),onBossEncounter:()=>starts++});
 try{
  s.currentFloor=2;const p=s.generatedMap.bossRoom.bossCell;s.playerX=p.x;s.playerY=p.y;
  assert.equal(isV2EncounterCell(s),false);s.onBossCell();assert.equal(starts,0);
  s.bossKeyFound=s.bossDoorUnlocked=true;s.recordSurvey(p.x,p.y);save=false;s.onBossCell();assert.equal(starts,0);
  save=true;s.surveyNotice={total:300};s.retryBossEncounter();assert.equal(starts,0);
  s.surveyNotice=null;s.surveyPresentationPlaying=true;s.retryBossEncounter();assert.equal(starts,0);
  s.surveyPresentationPlaying=false;s.retryBossEncounter();assert.equal(starts,1);
  const ctx=s.battleContext;assert.equal(ctx.source,'special-map-v2-special-boss');assert.equal(ctx.floorIndex,2);assert.ok(matchesV2Battle(s,ctx));
  const enemy=createEnemyCombatant(createGoldMapBoss({themeId:'gold',level:80}));enemy.hp=0;enemy.alive=false;
  let c=createInitialCharacter({name:'QA',job:'warrior'});c.carriedExperience=777;const initial=c.experience;
  const b={enemy,explorationContext:ctx};grantV2BattleRewards(c,b,s);grantV2BattleRewards(c,b,s);
  assert.equal(s.battleExperience,10800);assert.equal(s.lootBag.gold,2250);
  s.bossDefeated=true;resumeV2Encounter(s,ctx);s.onBossCell();assert.equal(starts,1);
  const masks=[...s.surveyedMasks],torch=s.torchFuel;s.transitioning=false;
  assert.equal(warpV2ToEntrance(s),true);assert.equal(s.currentFloor,0);assert.equal(s.torchFuel,torch);assert.equal(s.battleExperience,10800);assert.equal(s.lootBag.gold,2250);
  assert.deepEqual(s.surveyedMasks,masks);assert.equal(s.bossDoorUnlocked,true);
  assert.equal(settleV2ReturnExperience(c,s,()=>false),false);assert.equal(s.battleExperience,10800);
  assert.equal(settleV2ReturnExperience(c,s,r=>{c={...c,...r.changes};return true;}),true);assert.equal(c.experience,initial+15120);assert.equal(c.carriedExperience,777);
  const exp=c.experience;settleV2ReturnExperience(c,s,r=>{c={...c,...r.changes};return true;});assert.equal(c.experience,exp);
 }finally{s.disposeSurvey();setExplorerTestEnabled(false);}
 const again=session(80);assert.equal(again.bossDefeated,false);again.disposeSurvey();setExplorerTestEnabled(false);
});
