import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createBossCombatant} from '../data/bosses.js';
import {getMagicBarrier,magicBarrierAmount} from '../combat/aquarius.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {getSkill} from '../data/skills.js';
import {createPersistentBattlePlayerChanges} from '../js/battle.js';
function setup(deck=['zodiac_aquarius']){
 const c=createInitialCharacter({name:'QA',job:'mage'});c.hp=c.maxHp=10000;c.sp=0;c.maxSp=100;c.cards.deckSlots=deck;c.skillIds.push('lightning_bolt');
 const e=createBossCombatant('tiefstrom_b76f');e.actions=[{weight:1,action:{id:'strike',name:'strike',actionType:'physicalAttack',hitCount:3,powerMultiplier:10}}];
 return createBattleState({character:c,enemy:e});
}
const round=(b,cmd={type:'wait'})=>resolveBattleRound({battle:b,playerCommand:cmd,rng:()=>.1});
test('maximum SP initializes independent barrier and shared cost permits SP zero',()=>{
 const b=setup();assert.equal(magicBarrierAmount(b.player),100);
 assert.equal(getEffectiveSpCost(getSkill('lightning_bolt'),b.player),0);
 const r=round(b,{type:'skill',skillId:'lightning_bolt'});assert.equal(r.accepted,true);assert.equal(r.battle.player.sp,0);
});
test('magic barrier absorbs complete multi-hit overflow then subsequent attacks hit HP',()=>{
 let b=setup();getMagicBarrier(b.player).amount=10;
 b=round(b).battle;assert.equal(magicBarrierAmount(b.player),0);assert.equal(b.player.hp,10000);
 assert.ok(getEffectiveSpCost(getSkill('lightning_bolt'),b.player)>0);
 assert.equal(round(b,{type:'skill',skillId:'lightning_bolt'}).accepted,false);
 b=round(b).battle;assert.ok(b.player.hp<10000);
});
test('normal barrier consumes one entire attack before magic layer; unequipped overflow stays unchanged',()=>{
 let b=setup(['zodiac_aquarius','common_guard_stone']);assert.equal(b.sphinxBarrier,15);
 b=round(b).battle;assert.equal(b.sphinxBarrier,0);assert.equal(magicBarrierAmount(b.player),100);assert.equal(b.player.hp,10000);
 b=round(b).battle;assert.equal(magicBarrierAmount(b.player),0);assert.equal(b.player.hp,10000);
 const ordinary=round(setup(['common_guard_stone'])).battle;assert.ok(ordinary.player.hp<10000);
});
test('persistent changes and loaded saves remove barrier; next battle recreates from current max SP',()=>{
 const b=setup();getMagicBarrier(b.player).amount=7;
 assert.equal(magicBarrierAmount(createPersistentBattlePlayerChanges(b.player)),0);
 assert.equal(magicBarrierAmount(normalizeCharacter(JSON.parse(JSON.stringify(b.player)))),0);
 b.player.maxSp=180;assert.equal(magicBarrierAmount(createBattleState({character:b.player,enemy:b.enemy}).player),180);
 b.player.cards.deckSlots=[];assert.equal(magicBarrierAmount(createBattleState({character:b.player,enemy:b.enemy}).player),0);
});
test('victory removes battle-only magic barrier',()=>{
 const b=setup();b.enemy.hp=1;b.enemy.actions=[{weight:1,action:{id:'wait',actionType:'wait'}}];
 const r=round(b,{type:'skill',skillId:'lightning_bolt'});assert.equal(r.battle.outcome,'victory');assert.equal(magicBarrierAmount(r.battle.player),0);
});
test('all skill categories share free cost and normal reductions resume after barrier breaks',()=>{
 const b=setup();b.player.spCostReduction=3;
 for(const category of ['physical','attackSpell','miracle'])assert.equal(getEffectiveSpCost({spCost:10,category},b.player),0);
 getMagicBarrier(b.player).amount=0;assert.equal(getEffectiveSpCost({spCost:10},b.player),7);
 b.player.sp=20;b.enemy.actions=[{weight:1,action:{id:'wait',actionType:'wait'}}];
 const cost=getEffectiveSpCost(getSkill('lightning_bolt'),b.player);const r=round(b,{type:'skill',skillId:'lightning_bolt'});
 assert.equal(r.accepted,true);assert.equal(r.battle.player.sp,20-cost);
});
