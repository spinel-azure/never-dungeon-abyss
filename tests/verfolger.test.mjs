import { resolveEscapeAttempt } from '../combat/resolve-escape.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { verfolger, recordVerfolgerDefeat, isVerfolgerDefeatedOnFloor, VERFOLGER_DEFEAT_MESSAGE } from '../data/verfolger.js';
import { enemies, getEnemyById, createEnemyCombatant } from '../data/enemies.js';
import { ROAMING_ENEMY_DEFINITIONS, getRoamingEnemyDefinitionForDepth } from '../data/roaming-enemies.js';
import { createInitialCharacter, normalizeCharacter } from '../data/classes.js';
import { createBattleState, createEnemyAction, resolveBattleRound, breakReservedEnemyActionOnElementHit } from '../combat/battle-engine.js';
import { resolveStatusEffect } from '../combat/resolve-status-effect.js';
import { rollEnemyDrop, calculateFixedGoldPerDefeat } from '../data/loot.js';
import { getAdventureChronicle } from '../data/adventure-records.js';
import { buildBoundaryWallMap, cells, getStartPosition } from '../js/dungeon.js';
import { getActiveRoamingEnemy, canRoamingEnemyOccupyCell, beginRoamingEnemyBattle, defeatRoamingEnemy, restoreRoamingEnemyState, serializeRoamingEnemyState, resetRoamingEnemyAfterEscape } from '../js/roaming-enemies.js';
const enemy=()=>createEnemyCombatant(getEnemyById('verfolger'));
function character(){const c=createInitialCharacter({name:'TEST',job:'priest'});c.hp=c.maxHp=5000;c.sp=c.maxSp=500;c.skillIds.push('holy_strike');return c;}
function pending(){const e=enemy();e.reservedEnemyAction=structuredClone(verfolger.actions[2].action.reservedAction);return e;}

test('Verfolger data, approved assets and explicit B90-B98 production registry',async()=>{
 assert.equal(enemies.filter(e=>e.id==='verfolger').length,1);assert.equal(verfolger.randomEncounter,false);
 assert.deepEqual([verfolger.maxHp,verfolger.attack,verfolger.def,verfolger.experienceReward],[12000,48,40,30000]);
 for(let floor=1;floor<=101;floor++)assert.equal(Boolean(getRoamingEnemyDefinitionForDepth(floor)),floor>=90&&floor<=98);
 const d=ROAMING_ENEMY_DEFINITIONS[0];assert.equal(d.maxHeightRatio,.6);assert.equal(d.escapeRate,1);
 for(const asset of [verfolger.image,d.image,d.encounterImage,'bgm/battle-of-galfer.mp3'])await access(new URL('../'+asset,import.meta.url));
 assert.equal(verfolger.battleBgmKey,'eventBoss');
});
test('action boundaries are 40/35/25 and reservation replaces the lottery exactly once',()=>{
 for(const [r,id] of [[0,'verfolger_claw'],[.399999,'verfolger_claw'],[.4,'verfolger_bites'],[.749999,'verfolger_bites'],[.75,'verfolger_hunt'],[.999,'verfolger_hunt']])assert.equal(createEnemyAction(enemy(),()=>r).id,id);
 let b=createBattleState({character:character(),enemy:enemy()});let i=0;
 b=resolveBattleRound({battle:b,playerCommand:{type:'wait'},rng:()=>i++===0?.99:.5}).battle;
 assert.equal(b.enemy.reservedEnemyAction.id,'verfolger_rend');
 b=resolveBattleRound({battle:b,playerCommand:{type:'wait'},rng:()=>.5}).battle;
 assert.equal(b.enemy.reservedEnemyAction,undefined);assert.ok(b.log.some(s=>s.includes('獲物裂き')));
});
test('bites apply bleeding once per action and rend applies deadly poison',()=>{
 for(const [action,status] of [[verfolger.actions[1].action,'bleeding'],[verfolger.actions[2].action.reservedAction,'deadly_poison']]){
  assert.equal(action.effects.length,1);assert.equal(action.effects[0].trigger,'firstHitOnly');
  const e=enemy();e.actions=[{weight:1,action}];
  const b=resolveBattleRound({battle:createBattleState({character:character(),enemy:e}),playerCommand:{type:'wait'},rng:()=>0}).battle;
  assert.ok(b.player.statuses.some(s=>(s.id||s.statusId)===status));
 }
});
test('holy actual damage breaks stance; miss, zero damage, other elements and enemy-side damage do not',()=>{
 for(const change of [{element:'fire'},{landedHitCount:0},{actualHpLoss:0},{actorSide:'enemy'}])assert.equal(breakReservedEnemyActionOnElementHit({enemy:pending(),element:'holy',landedHitCount:1,actualHpLoss:1,...change}),false);
 const e=pending();assert.equal(breakReservedEnemyActionOnElementHit({enemy:e,element:'holy',landedHitCount:1,actualHpLoss:1}),true);assert.equal(e.reservedEnemyAction,undefined);
 const e2=pending();e2.stats.agi=1;
 const b=resolveBattleRound({battle:createBattleState({character:character(),enemy:e2}),playerCommand:{type:'skill',skillId:'holy_strike'},rng:()=>0}).battle;
 assert.ok(b.log.some(s=>s.includes('狩りの構えが崩れた')));assert.equal(b.enemy.reservedEnemyAction,undefined);
});
test('deadly/death poison remain possible at 5% for ordinary potency; element multipliers correct',()=>{
 for(const statusId of ['deadly_poison','death_poison']){
  const params={attacker:{dex:30},defender:{luc:30,statusResistances:enemy().statusResistances},effect:{statusId,statusKind:'physical',baseRate:.3}};
  assert.equal(resolveStatusEffect({...params,rng:()=>.049}).success,true);assert.equal(resolveStatusEffect({...params,rng:()=>.05}).success,false);
  assert.equal(resolveStatusEffect({...params,rng:()=>0}).rate,.05);assert.equal(resolveStatusEffect({...params,rng:()=>0}).immune,false);
 }
 assert.equal(enemy().elementMultipliers.lightning,.5);assert.equal(enemy().elementMultipliers.holy,1.5);
});
test('no gold, items, red chest or cards drop at any roll, and escaping is guaranteed',()=>{
 const e=enemy();for(let i=0;i<100;i++)assert.deepEqual(rollEnemyDrop(e,()=>i/100),{kind:'none'});
 assert.equal(calculateFixedGoldPerDefeat([{...e,hp:0}]),0);
 assert.equal(resolveEscapeAttempt({escapeRate:e.escapeRate,rng:()=>.999}).success,true);
});
test('all nine floors place one legal individual; old saves stay empty, escape resets, death persists',()=>{
 for(let depth=90;depth<=99;depth++){
  buildBoundaryWallMap(depth,()=>.5,{});const e=getActiveRoamingEnemy();
  assert.equal(Boolean(e),depth<99);if(!e)continue;assert.ok(canRoamingEnemyOccupyCell(cells[e.y][e.x]));
  const saved=serializeRoamingEnemyState();assert.equal(restoreRoamingEnemyState(null,{grid:cells}),null);
  restoreRoamingEnemyState(saved,{grid:cells});assert.equal(beginRoamingEnemyBattle(saved.instanceId),true);
  resetRoamingEnemyAfterEscape({grid:cells,player:getStartPosition(),rng:()=>.5});assert.equal(getActiveRoamingEnemy().inBattle,false);
  assert.equal(defeatRoamingEnemy(saved.instanceId),true);assert.equal(defeatRoamingEnemy(saved.instanceId),false);
  assert.equal(restoreRoamingEnemyState(serializeRoamingEnemyState(),{grid:cells}).status,'defeated');
 }
});
test('per-floor defeat and achievement survive normalization without affecting other floors',()=>{
 const old=createInitialCharacter({name:'SAVE',job:'warrior'});assert.equal(isVerfolgerDefeatedOnFloor(old,90),false);
 const c=normalizeCharacter(JSON.parse(JSON.stringify(recordVerfolgerDefeat(old,90))));assert.equal(isVerfolgerDefeatedOnFloor(c,90),true);assert.equal(isVerfolgerDefeatedOnFloor(c,91),false);
 assert.equal(getAdventureChronicle(c).find(e=>e.id==='verfolger').label,'追跡者を狩る者');
 assert.equal(VERFOLGER_DEFEAT_MESSAGE,'フェルフォルガーは「ギャギャッ！」と耳障りな叫び声を上げながら姿を消した…。');
});