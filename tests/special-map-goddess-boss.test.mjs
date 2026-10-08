import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {KARTE_SPECIAL_BOSSES} from '../data/karte-special-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {createBattleState,resolveBattleRound,resolveBattleOutcome,getScorpioDeathPoisonRate} from '../combat/battle-engine.js';
import {collectStats} from '../combat/collect-stats.js';
import {prepareGoddessAction,executeGoddessUtility,capGoddessDot} from '../combat/karte-goddesses.js';
import {prepareNormalBossImage} from '../js/special-map/normal-boss-presentation.js';
import {developmentMapOptions} from '../js/special-map/development-map.js';
import {setExplorerTestEnabled} from '../js/explorer-preview.js';
import {createSpecialMapV2Session,warpV2ToEntrance} from '../js/special-map/session-v2.js';
import {resumeV2Encounter} from '../js/special-map/encounter-v2.js';
import {grantV2BattleRewards,settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
const boss=(theme='tender',level=100)=>createEnemyCombatant(createGoddessMapBoss({themeId:theme,level}));
const battle=(theme='tender')=>createBattleState({character:normalizeCharacter({...createInitialCharacter({name:'QA',job:'warrior'}),level:100}),enemy:boss(theme)});
test('fixed goddess factory: identity, images, exact metadata, scaling, cap30, SP, no HSL',async()=>{
 for(const [theme,id,n,hp,exp] of [['rice','lumina','013',55000,25000],['dusk','noctia','014',48000,25000],['tender','zelena','015',60000,30000]]){
  for(const [level,s] of [[80,.9],[89,.9],[90,.95],[99,.95],[100,1]]){
   const d=createGoddessMapBoss({themeId:theme,level}),e=createEnemyCombatant(d);
   assert.equal(d.id,`karte_boss_${id}`);assert.equal(d.maxHp,Math.round(({rice:20000,dusk:18000,tender:24000}[theme])*s));assert.equal(e.sp,9999);
   assert.equal(e.experienceReward,Math.round(exp*s));assert.equal(e.noDrop,true);assert.equal(e.isBoss,true);
   assert.equal(d.actions.reduce((n,a)=>n+a.weight,0),100);
   assert.ok(Object.values(collectStats(e)).every(v=>typeof v!=='number'||Number.isFinite(v)));
   for(const key of ['str','int','agi','dex','luc'])assert.equal(collectStats(e)[key],30);
   assert.equal(d.image,`images/karte_bosses/karte_boss_${n}.avif`);
   assert.equal(await prepareNormalBossImage(d,{}, {load:async()=>({}),prepare:()=>assert.fail('HSL')}),d.image);
  }
  assert.equal(KARTE_SPECIAL_BOSSES[`karte_boss_${id}`].baseStats.maxHp,hp);
  assert.throws(()=>createGoddessMapBoss({themeId:theme,level:79}));
  assert.throws(()=>createGoddessMapBoss({themeId:theme,level:100,bossId:'karte_boss_maikaefer_koenig'}));
 }
 assert.throws(()=>createGoddessMapBoss({themeId:'gold',level:100}));
});
test('Lumina phase affects effective lightning damage and crit; Noctia growth is bounded and once per turn',()=>{
 const b=battle('rice');b.enemy.hp=b.enemy.maxHp*.5;
 const a=prepareGoddessAction(b,b.enemy,{element:'lightning',actionType:'spell'});
 assert.equal(a.goddessDamageMultiplier,1.92);assert.equal(a.criticalBonus,.08);
 const n=battle('dusk');n.enemy.hp=n.enemy.maxHp*.3;
 for(let turn=1;turn<=30;turn++){n.turn=turn;prepareGoddessAction(n,n.enemy,{actionType:'spell'});prepareGoddessAction(n,n.enemy,{actionType:'spell'});assert.ok(n.enemy.goddessRuntime.growth<=.4);}
 assert.equal(n.enemy.goddessRuntime.growth,.4);
});
test('Zelena revives before single/multi victory, exactly once, no reward at first death; fresh runtime per battle',()=>{
 for(const multi of [false,true]){
  const b=battle();if(multi)b.enemies=[b.enemy];b.enemy.hp=0;b.enemy.alive=false;
  resolveBattleOutcome(b);assert.equal(b.outcome,null);assert.equal(b.enemy.hp,7200);assert.equal(b.enemy.alive,true);
  assert.equal(b.presentationEvents.at(-1).goddessRevival,true);
  b.enemy.hp=0;resolveBattleOutcome(b);assert.equal(b.outcome,'victory');
 }
 assert.equal(battle().enemy.goddessRuntime,undefined);
});
test('goddess utilities heal/cleanse, finite barrier, finite regen and poison cannot scale with max HP',()=>{
 const b=battle();b.enemy.hp=6000;b.enemy.statuses=[{id:'death_poison'}];
 const d=createGoddessMapBoss({themeId:'tender',level:100});
 executeGoddessUtility(b,b.enemy,d.actions[1].action);assert.equal(b.enemy.hp,6960);assert.equal(b.enemy.statuses.length,0);
 executeGoddessUtility(b,b.enemy,d.actions[2].action);assert.equal(b.enemy.bossMagicBarrier,250);
 executeGoddessUtility(b,b.enemy,d.actions[4].action);assert.equal(b.enemy.goddessRuntime.regen,3);
 assert.equal(getScorpioDeathPoisonRate(b.enemy),.01);
 assert.equal(capGoddessDot(b.enemy,{deathPoisonDamage:6000}).deathPoisonDamage,80);
 const e=boss('rice');assert.equal(getScorpioDeathPoisonRate({isBoss:true}),.1);assert.equal(e.statusResistances.petrify.immune,true);
});
test('all goddess sessions: key/survey gate, context, once-only rewards, portal, independent return',()=>{
 setExplorerTestEnabled(true);
 try{for(const themeId of ['rice','dusk','tender']){
  const o=developmentMapOptions({themeId,level:100});let calls=0;
  const s=createSpecialMapV2Session(o.registered,o.mapKey,{developmentTheme:themeId,persistSurvey:()=>({ok:true}),onBossEncounter:()=>calls++});
  try{
   s.currentFloor=2;Object.assign(s,{playerX:s.generatedMap.bossRoom.bossCell.x,playerY:s.generatedMap.bossRoom.bossCell.y});
   s.onBossCell();assert.equal(calls,0);s.bossKeyFound=s.bossDoorUnlocked=true;
   s.onBossCell();assert.equal(calls,1);const ctx=s.battleContext;
   assert.equal(ctx.source,'special-map-v2-special-boss');assert.equal(ctx.themeId,themeId);
   const e=boss(themeId);e.hp=0;e.alive=false;
   const c=createInitialCharacter({name:'QA',job:'warrior'});c.carriedExperience=777;
   const b={enemy:e,explorationContext:ctx};grantV2BattleRewards(c,b,s);grantV2BattleRewards(c,b,s);
   assert.equal(s.battleExperience,e.experienceReward);assert.equal(s.lootBag.gold,e.dropGold);
   s.bossDefeated=true;resumeV2Encounter(s,ctx);s.onBossCell();assert.equal(calls,1);
   s.transitioning=false;const torch=s.torchFuel;assert.equal(warpV2ToEntrance(s),true);assert.equal(s.currentFloor,0);assert.equal(s.torchFuel,torch);
   assert.equal(settleV2ReturnExperience(c,s,()=>false),false);assert.equal(s.battleExperience,e.experienceReward);
   assert.equal(settleV2ReturnExperience(c,s,()=>true),true);assert.equal(c.carriedExperience,777);
  }finally{s.disposeSurvey();}
 }}finally{setExplorerTestEnabled(false);}
});
test('actual engine defeat remains possible; fixed boss cannot escape',()=>{
 const b=battle('rice');b.player.hp=1;b.player.statuses=[];b.enemy.actions=[{weight:1,action:{id:'qa',name:'attack',actionType:'spell',spellPower:1000,element:'lightning'}}];
 const r=resolveBattleRound({battle:b,playerCommand:{type:'guard'},rng:()=>.5});assert.equal(r.battle.outcome,'defeat');
});

import {createEnemyAction} from '../combat/battle-engine.js';
import {finishGoddessAction} from '../combat/karte-goddesses.js';
import {applyNpcAfterPlayerAttack} from '../combat/npc-support.js';
import {goddessCharacter} from '../tools/simulate-map-goddesses.mjs';
test('Lumina priority includes reserved ultimate; power persists for three following actions',()=>{
 const b=battle('rice');b.enemy.hp=b.enemy.maxHp/2;b.enemy.reservedEnemyAction={id:'qa',actionType:'spell',speedModifier:2};
 assert.equal(createEnemyAction(b.enemy,()=>0,{battle:b}).speedModifier,14);
 executeGoddessUtility(b,b.enemy,{id:'power',goddessUtility:'power'});finishGoddessAction(b,b.enemy);
 for(let i=0;i<3;i++){assert.equal(prepareGoddessAction(b,b.enemy,{actionType:'physicalAttack'}).goddessDamageMultiplier,1.7600000000000002);finishGoddessAction(b,b.enemy);}
 assert.equal(prepareGoddessAction(b,b.enemy,{actionType:'physicalAttack'}).goddessDamageMultiplier,1.6);
});
test('actual NPC lethal hit revives Zelena before victory and second lethal hit wins',()=>{
 const b=createBattleState({character:goddessCharacter('warrior',100,'standard'),enemy:boss()});
 b.enemy.hp=1;applyNpcAfterPlayerAttack(b,()=>0);assert.equal(b.outcome,null);assert.equal(b.enemy.hp,7200);
 b.enemy.hp=1;applyNpcAfterPlayerAttack(b,()=>0);assert.equal(b.outcome,'victory');
});

import {GODDESS_TV_OFF,syncGoddessBackdrop} from '../js/special-map/goddess-presentation.js';
import {screenState} from '../js/effects/effect-stage.js';
test('goddess TV off closes and backdrop leaves ordinary bosses unchanged',()=>{
 const open=screenState(GODDESS_TV_OFF.parts,0),closed=screenState(GODDESS_TV_OFF.parts,500);
 assert.equal(open.tv.close,0);assert.equal(closed.tv.close,1);assert.equal(closed.tv.line,0);
 let circle=null,enabled=false;
 const root={classList:{toggle:(c,on)=>{enabled=on;}},querySelector:()=>circle,prepend:e=>{circle=e;},ownerDocument:{createElement:()=>({setAttribute(){}})}};
 syncGoddessBackdrop(root,boss('rice'));assert.equal(enabled,true);assert.equal(circle.src,'images/battle_effects/magic_circle.avif');assert.equal(circle.hidden,false);
 syncGoddessBackdrop(root,{id:'karte_boss_001'});assert.equal(enabled,false);assert.equal(circle.hidden,true);
 assert.ok(createEnemyAction(boss('rice'),()=>0));
});
