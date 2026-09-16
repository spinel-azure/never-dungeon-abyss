import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {createBossCombatant,applyBossVictory,isBossDefeated} from '../data/bosses.js';
import {TIEFSTROM_ID,TIEFSTROM_SECOND_ID} from '../data/tiefstrom.js';
import {createBattleState,resolveBattleRound,createEnemyAction,resolveBattleOutcome} from '../combat/battle-engine.js';
import {grantItem} from '../data/inventory.js';
import {getSpecialRoomDefinition} from '../data/special-rooms.js';
import {canPrepareWhirlpool,synchronizeTwinState} from '../combat/tiefstrom.js';
import {resolveExplorationObstacleRemoval} from '../data/exploration-obstacles.js';
import {buildBoundaryWallMap,cells,setStartPosition} from '../js/dungeon.js';
import {applyNpcTurnStart,applyNpcAfterPlayerAttack,applyNpcChargeSkills} from '../combat/npc-support.js';
import {resolveEscapeAttempt} from '../combat/resolve-escape.js';
import {getAdventureChronicle} from '../data/adventure-records.js';
test('Pisces guardian achievement reads the persisted complete-victory flag',()=>{
 const c=createInitialCharacter({name:'QA',job:'mage'});
 assert.equal(getAdventureChronicle(c).find(e=>e.id==='tiefstrom').label,'？？？？？？――魚座の守護者');
 c.eventFlags={...c.eventFlags,boss_tiefstrom_b76f_defeated:true};
 assert.equal(getAdventureChronicle(JSON.parse(JSON.stringify(c))).find(e=>e.id==='tiefstrom').label,'タイフシュトロームを倒した！');
});
function setup(){
 const c=createInitialCharacter({name:'QA',job:'mage'});c.hp=c.maxHp=10000;c.sp=c.maxSp=1000;
 c.skillIds.push('flame_sweep');c.inventory=grantItem(c.inventory,'stone',99).inventory;
 const enemies=[TIEFSTROM_ID,TIEFSTROM_SECOND_ID].map(createBossCombatant);
 return createBattleState({character:c,enemy:enemies[0],enemies});
}
function round(b,command={type:'wait'},rng=()=>.1){const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.equal(r.accepted,true);return r.battle;}
test('B76 fixed optional room preserves its content and shared zodiac gate',()=>{
 const d=getSpecialRoomDefinition(76);assert.equal(d.content.requiredZodiacCount,3);assert.equal(d.content.bossId,TIEFSTROM_ID);
 setStartPosition(0,0);buildBoundaryWallMap(76,()=>.5,{});
 assert.equal(cells.flat().find(c=>c.specialRoom).specialRoom.content.bossId,TIEFSTROM_ID);
});
test('independent twins and complete victory reward are repeat-safe',()=>{
 let b=setup();assert.notEqual(b.enemies[0].id,b.enemies[1].id);assert.equal(b.enemies.reduce((n,e)=>n+e.experienceReward,0),50000);
 b.enemies[0].hp=0;b.enemies[0].alive=false;resolveBattleOutcome(b);assert.equal(b.outcome,null);
 assert.equal(b.enemies[1].twinEnraged,true);const n=b.log.length;resolveBattleOutcome(b);assert.equal(b.log.length,n);
 b.enemies[1].hp=0;b.enemies[1].alive=false;resolveBattleOutcome(b);assert.equal(b.outcome,'victory');
 const c=createInitialCharacter({name:'QA',job:'warrior'});const v=applyBossVictory(c,TIEFSTROM_ID);
 assert.equal(v.reward.cardId,'zodiac_pisces');assert.equal(isBossDefeated(JSON.parse(JSON.stringify(v.character)),TIEFSTROM_ID),true);
 assert.equal(applyBossVictory(v.character,TIEFSTROM_ID).accepted,false);
 const fresh=setup();assert.ok(fresh.enemies.every(e=>e.hp===e.maxHp&&!e.twinEnraged&&!e.reservedEnemyAction));
});
test('melee cannot reach even with Sagittarius and follow-up; thrown item can',()=>{
 const b=setup();b.player.cards.deckSlots=['zodiac_sagittarius','common_follow_up','sr_follow_up_plus'];
 const blocked=round(b,{type:'attack'});assert.deepEqual(blocked.enemies.map(e=>e.hp),[4000,4000]);
 assert.match(blocked.log.join(''),/遠すぎて、攻撃が届かない/);
 const thrown=round(b,{type:'item',itemId:'stone'});assert.equal(thrown.enemies[0].hp,3991);assert.equal(thrown.enemies[1].hp,4000);
 const spell=round(b,{type:'skill',skillId:'flame_sweep'});assert.ok(spell.enemies[0].hp<4000);
});
test('preselection reserves only one whirlpool, alternates and allows guarding',()=>{
 let b=round(setup(),{type:'wait'},()=>.95);
 assert.equal(b.enemies.filter(e=>e.reservedEnemyAction).length,1);
 assert.ok(b.presentationEvents.some(e=>e.whirlpoolPreparing===true));
 const owner=b.enemies.find(e=>e.reservedEnemyAction);assert.equal(b.whirlpoolOwner,owner.id);
 b.player.statusResistances={bleeding:{immune:true}};
 const normal=round(b),guard=round(b,{type:'guard'});assert.ok(guard.player.hp>normal.player.hp);
 assert.equal(normal.enemies.filter(e=>e.reservedEnemyAction).length,0);
 assert.ok(normal.presentationEvents.some(e=>e.whirlpoolPreparing===false));
 assert.ok(normal.presentationEvents.some(e=>e.type==="attackHit" && e.actionName==="深淵の大渦"));
 b=round(normal,{type:'wait'},()=>.95);assert.equal(b.enemies.filter(e=>e.reservedEnemyAction).length,1);
 assert.notEqual(b.whirlpoolOwner,owner.id);
});
test('dead preparation owner releases reservation; simultaneous deaths do not enrage',()=>{
 const b=round(setup(),{type:'wait'},()=>.95);const e=b.enemies.find(e=>e.reservedEnemyAction);e.hp=0;e.alive=false;
 synchronizeTwinState(b);assert.equal(b.whirlpoolOwner,null);b.turn++;
 assert.equal(canPrepareWhirlpool(b,b.enemies.find(x=>x.alive)),true);
 const simultaneous=setup();simultaneous.enemies.forEach(e=>{e.hp=0;e.alive=false});resolveBattleOutcome(simultaneous);
 assert.ok(simultaneous.enemies.every(e=>!e.twinEnraged));
});
test('weight boundaries and fresh snapshot after escape',()=>{
 for(const [r,id] of [[0,'scale'],[.3999,'scale'],[.4,'double'],[.7,'spray'],[.9,'prepare']])
 assert.equal(createEnemyAction(createBossCombatant(TIEFSTROM_ID),()=>r).id,'tiefstrom_'+id);
});
test('crystal reports actual SP loss including low and empty SP',()=>{
 for(const [sp,lost] of [[20,10],[10,10],[7,7],[0,0]]){
 const c=createInitialCharacter({name:'QA',job:'warrior'});c.sp=sp;
 const r=resolveExplorationObstacleRemoval(c,'crystal_cluster','weapon');assert.equal(r.spLost,lost);assert.equal(r.character.sp,sp-lost);
 }
});
test('AoE damages both, melee skills including holy strike fail, ranged miracles reach',()=>{
 let b=setup();b.player.skillIds.push('wide_swing','holy_strike','holy_light');
 assert.ok(round(b,{type:'skill',skillId:'flame_sweep'}).enemies.every(e=>e.hp<4000));
 assert.ok(round(b,{type:'skill',skillId:'wide_swing'}).enemies.every(e=>e.hp===4000));
 assert.equal(round(b,{type:'skill',skillId:'holy_strike'}).enemies[0].hp,4000);
 assert.ok(round(b,{type:'skill',skillId:'holy_light'}).enemies[0].hp<4000);
 b.enemies.forEach(e=>e.hp=1);b.player.cards.deckSlots=['zodiac_sagittarius','zodiac_aries'];
 const won=round(b,{type:'skill',skillId:'flame_sweep'});assert.equal(won.outcome,'victory');assert.ok(won.enemies.every(e=>!e.twinEnraged));
});
test('stunned preparation remains reserved and excludes the other twin',()=>{
 let b=round(setup(),{type:'wait'},()=>.95);const owner=b.enemies.find(e=>e.reservedEnemyAction);
 owner.statuses=[{id:'action_skip',statusId:'action_skip',active:true,actionSkips:1}];
 b=round(b,{type:'wait'},()=>.95);assert.equal(b.enemies.filter(e=>e.reservedEnemyAction).length,1);
 assert.equal(b.whirlpoolOwner,owner.id);
});
test('bleed occurs once only on actual hits; total misses do not bleed',()=>{
 const b=setup();b.enemies.forEach(e=>e.actions=[e.actions[0]]);
 const hit=round(b);assert.equal(hit.player.statuses.filter(s=>s.id==='bleeding').length,1);
 const miss=round(b,{type:'wait'},()=>.999);assert.equal(miss.player.statuses.some(s=>s.id==='bleeding'),false);
});
test('NPC melee including Erika holy strike cannot reach; Johan magic remains effective',()=>{
 for(const npc of ['alec','johan','erika']){
 const b=setup();b.player.npcSystem={activeIds:[npc],records:{[npc]:{maxDepth:76,charge:100,chargeCooldown:0}}};
 if(npc==='alec')applyNpcAfterPlayerAttack(b,()=>0);
 else if(npc==='johan')applyNpcTurnStart(b,()=>0);
 else applyNpcChargeSkills(b,()=>0);
 assert.equal(b.enemy.hp<4000,npc==='johan');
 if(npc==='alec')assert.equal(b.enemy.statuses.length,0);
 }
});
test('escape is guaranteed even at the highest roll',()=>{
 assert.equal(resolveEscapeAttempt({escapeRate:createBossCombatant(TIEFSTROM_ID).escapeRate,rng:()=>1}).success,true);
});

test('whirlpool percentage, guard, fixed wall and independent magic barrier',()=>{
 const run=(maxHp,guard=false,wall=0,magic=0)=>{
  const b=setup();b.player.hp=b.player.maxHp=maxHp;b.npcSupportSuppressed=true;
  b.enemies[1].hp=0;b.enemies[1].alive=false;
  const action=structuredClone(b.enemies[0].actions[3].action.reservedAction);
  b.enemies[0].actions=[{weight:1,action}];
  if(wall)b.player.statuses.push({id:'npc_johan_wall',active:true,npcWallTurns:3,npcWallDamageThreshold:wall,npcWallStrongDamageReduction:wall===40?.2:0});
  if(magic)b.player.statuses.push({id:'aquarius_magic_barrier',active:true,amount:magic,expiresAfterBattle:true});
  return round(b,{type:guard?'guard':'wait'},()=>.1);
 };
 assert.equal(run(600).player.hp,510);
 assert.equal(run(600,true).player.hp,570);
 assert.equal(run(588).player.hp,500);
 assert.equal(run(600,false,40).player.hp,528);
 assert.equal(run(600,true,40).player.hp,600);
 assert.equal(run(600,true,20).player.hp,570);
 assert.equal(run(800,true,40).player.hp,800);
 assert.equal(run(820,true,40).player.hp,788);
 const magic=run(600,false,0,10);
 assert.equal(magic.player.hp,600);
 assert.equal(magic.player.statuses.find(s=>s.id==='aquarius_magic_barrier').amount,0);
});
