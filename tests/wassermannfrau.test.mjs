import {resolveEscapeAttempt} from "../combat/resolve-escape.js";
import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {createBossCombatant,applyBossVictory} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {absorbBossMagicBarrier,absorbPlayerMagic} from '../combat/boss-magic-barrier.js';
import {getSpecialRoomDefinition,rollMaikaeferNestContent} from '../data/special-rooms.js';
import {getAdventureChronicle} from '../data/adventure-records.js';
import {grantItem} from '../data/inventory.js';
const id='wassermannfrau_b18f';
function setup(){const c=createInitialCharacter({name:'QA',job:'mage'});c.hp=c.maxHp=10000;c.sp=200;c.maxSp=1000;c.skillIds.push('lightning_bolt');c.inventory=grantItem(c.inventory,'wurfmesser',3).inventory;const e=createBossCombatant(id);e.actions=[{weight:1,action:{id:'wait',actionType:'wait'}}];return createBattleState({character:c,enemy:e});}
test('B18 fixed unlocked event, assets, unique reward and achievement',()=>{
 const r=getSpecialRoomDefinition(18);assert.equal(r.content.bossId,id);assert.equal(r.lock.mode,'alwaysSuccess');assert.equal(r.content.requiredZodiacCount,undefined);assert.equal(rollMaikaeferNestContent({room:r,roll:0}),null);
 const b=setup();assert.equal(b.enemy.bossMagicBarrier,1000);assert.equal(b.enemy.image,'images/bosses/boss_26.avif');assert.equal(b.enemy.encounterImage,'images/background/dungeon_event_18.avif');
 const win=applyBossVictory(b.player,id);assert.equal(win.reward.cardId,'zodiac_aquarius');assert.equal(applyBossVictory(win.character,id).accepted,false);
 assert.equal(getAdventureChronicle(win.character).find(e=>e.id==='wassermannfrau').label,'ヴァッサーマンフラウを撃破した');
 assert.equal(getAdventureChronicle(b.player).find(e=>e.id==='wassermannfrau').label,'？？？？？？――水瓶座の守護者');
});
test('spell damages shield; overflow cannot hit HP; subsequent attack damages HP',()=>{
 let b=setup();b.enemy.bossMagicBarrier=10;
 b=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'lightning_bolt'},rng:()=>.1}).battle;
 assert.equal(b.enemy.hp,4000);assert.equal(b.enemy.bossMagicBarrier,0);assert.equal(b.presentationEvents.filter(e=>e.type==='bossMagicBarrier').length,1);
 b=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'lightning_bolt'},rng:()=>.1}).battle;assert.ok(b.enemy.hp<4000);
});
test('three thrown hits share shielding and one barrier sound',()=>{
 let b=setup();b.enemy.bossMagicBarrier=10;
 b=resolveBattleRound({battle:b,playerCommand:{type:'item',itemId:'wurfmesser'},rng:()=>.1}).battle;
 assert.equal(b.enemy.hp,4000);assert.equal(b.enemy.bossMagicBarrier,0);assert.equal(b.presentationEvents.filter(e=>e.type==='bossMagicBarrier'&&!e.silent).length,1);
});
test('absorption ceilings SP, redeploys, caps and marks full transition; AI uses action',()=>{
 let b=setup();b.enemy.bossMagicBarrier=0;absorbPlayerMagic(b,b.enemy,b.player,{});assert.equal(b.player.sp,150);assert.equal(b.enemy.bossMagicBarrier,100);
 b.player.sp=1;absorbPlayerMagic(b,b.enemy,b.player,{});assert.equal(b.player.sp,0);assert.equal(b.enemy.bossMagicBarrier,102);
 b.player.sp=200;b.enemy.bossMagicBarrier=990;absorbPlayerMagic(b,b.enemy,b.player,{});assert.equal(b.enemy.bossMagicBarrier,1000);assert.equal(b.enemy.bossMagicBarrierFilled,true);
 b=setup();b.enemy.bossMagicBarrier=0;b.enemy.actions=[{weight:1,action:{id:'absorb',actionType:'bossMagicAbsorb'}}];
 b=resolveBattleRound({battle:b,playerCommand:{type:'wait'},rng:()=>.1}).battle;assert.equal(b.player.sp,150);assert.equal(b.enemy.bossMagicBarrier,100);
});
test('escape never marks victory and fresh fight has full barrier',()=>{
 const b=setup();assert.equal(resolveEscapeAttempt({escapeRate:b.enemy.escapeRate,rng:()=>.99}).success,true);assert.equal(b.player.eventFlags.boss_wassermannfrau_b18f_defeated,undefined);assert.equal(setup().enemy.bossMagicBarrier,1000);
});
test('five-hit physical action and full misses retain HP; shield does not leak between fights',()=>{
 let b=setup();b.player.equipment.rightArmId='the_five_star';b.player.equipment.weaponId='the_five_star';b.enemy.bossMagicBarrier=1;
 let hit=resolveBattleRound({battle:b,playerCommand:{type:'attack'},rng:()=>.1}).battle;
 assert.equal(hit.enemy.hp,4000);assert.equal(hit.enemy.bossMagicBarrier,0);
 assert.equal(hit.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player').length,5);
 const miss=resolveBattleRound({battle:b,playerCommand:{type:'attack'},rng:()=>.999}).battle;
 assert.equal(miss.enemy.bossMagicBarrier,1);assert.equal(miss.presentationEvents.filter(e=>e.type==='bossMagicBarrier').length,0);
 assert.equal(setup().enemy.bossMagicBarrier,1000);
});
