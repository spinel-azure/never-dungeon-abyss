import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCharacter, normalizeCharacter } from '../data/classes.js';
import { createBossCombatant, applyBossVictory, isBossDefeated } from '../data/bosses.js';
import { ZENTAURIN_ID, ZENTAURIN } from '../data/zentaurin.js';
import { createBattleState, createPlayerAction, createEnemyAction, resolveBattleRound } from '../combat/battle-engine.js';
import { resolveSpell } from '../combat/resolve-spell.js';
import { resolvePhysicalAttack } from '../combat/resolve-physical-attack.js';
import { createPersistentBattlePlayerChanges } from '../js/battle.js';
import { getSpecialRoomDefinition } from '../data/special-rooms.js';
import { grantCard } from '../data/deck.js';
import { getAdventureChronicle } from '../data/adventure-records.js';
import { buildBoundaryWallMap, cells } from '../js/dungeon.js';

function character(deck = []) {
 const c = createInitialCharacter({name:'TEST',job:'mage'});
 c.hp=c.maxHp=5000;c.sp=c.maxSp=500;c.cards.deckSlots=deck;
 c.skillIds.push('flame_sweep');return c;
}
function battle(deck = []) { return createBattleState({character:character(deck),enemy:createBossCombatant(ZENTAURIN_ID)}); }
function round(b, command={type:'wait'}, rng=()=>.1){return resolveBattleRound({battle:b,playerCommand:command,rng}).battle;}

test('seal snapshots equipped Aries only; no opening damage or resource/charge consumption',()=>{
 const c=character();c.cards.ownedCardCounts.zodiac_aries=1;
 const b=createBattleState({character:c,enemy:createBossCombatant(ZENTAURIN_ID)});
 assert.equal(b.player.battleSkillSealed,true);assert.equal(b.player.hp,c.hp);assert.equal(b.player.sp,c.sp);
 assert.equal(createPlayerAction(b.player,{type:'skill',skillId:'flame_sweep'},b.enemy).reason,'battleSkillSealed');
 for(const type of ['attack','guard','wait']) assert.equal(createPlayerAction(b.player,{type},b.enemy).ok,true);
 const aries=battle(['zodiac_aries']);assert.equal(aries.player.battleSkillSealed,false);
 assert.equal(aries.ariesOpeningAttackAvailable,true);assert.match(aries.log.join(''),/封印の矢を破壊した/);
 const fired=round(aries,{type:'attack'});assert.equal(fired.ariesOpeningAttackAvailable,false);
 assert.match(fired.log.join(''),/エアリーズの力/);
 assert.equal('battleSkillSealed' in createPersistentBattlePlayerChanges(b.player),false);
 assert.equal(createBattleState({character:b.player,enemy:createBossCombatant('eiskrabbe_b47f')}).player.battleSkillSealed,false);
});

test('action weights and pride last three subsequent opportunities with no restacking',()=>{
 const e=createBossCombatant(ZENTAURIN_ID);
 for(const [roll,id] of [[0,'triple'],[.5999,'triple'],[.6,'pride'],[.7999,'pride'],[.8,'prepare'],[.999,'prepare']])
 assert.equal(createEnemyAction(e,()=>roll).id,'zentaurin_'+id);
 let b=round(battle(),{type:'wait'},()=>.7);assert.equal(b.enemy.zentaurinPrideActions,3);
 assert.equal(createEnemyAction(b.enemy,()=>.79).id,'zentaurin_triple');
 assert.equal(createEnemyAction(b.enemy,()=>.8).id,'zentaurin_prepare');
 for(const n of [2,1,0]){b=round(b);assert.equal(b.enemy.zentaurinPrideActions,n);}
 const base=battle();const buff=structuredClone(base);buff.enemy.zentaurinPrideActions=3;
 const normal=round(base),strong=round(buff);assert.ok(strong.player.hp<normal.player.hp);
});

test('triple bleeding is one successful after-damage application; misses and barrier absorption exclude it',()=>{
 let b=round(battle());assert.equal(b.player.statuses.filter(s=>(s.id||s.statusId)==='bleeding').length,1);
 const miss=battle();miss.enemy.actions=[miss.enemy.actions[0]];
 b=round(miss,{type:'wait'},()=>.999);assert.equal(b.player.statuses.some(s=>(s.id||s.statusId)==='bleeding'),false);
 const barrier=battle();barrier.sphinxBarrier=99999;
 b=round(barrier);assert.equal(b.player.statuses.some(s=>(s.id||s.statusId)==='bleeding'),false);
});

test('star arrow is reserved, has a fresh command opportunity, and guard reduces its damage',()=>{
 let b=round(battle(),{type:'wait'},()=>.9);
 assert.equal(b.enemy.reservedEnemyAction.id,'zentaurin_star_arrow');assert.equal(b.player.hp,5000);
 const hit=round(b);const guarded=round(b,{type:'guard'});
 assert.ok(guarded.player.hp>hit.player.hp);assert.equal(hit.enemy.reservedEnemyAction,undefined);
 const skipped=structuredClone(b);skipped.enemy.statuses=[{id:'action_skip',statusId:'action_skip',active:true,actionSkips:1}];
 const held=round(skipped);assert.equal(held.enemy.reservedEnemyAction?.id,'zentaurin_star_arrow');
});

test('Sagittarius preserves immunity and weaknesses while bypassing elemental resistance and DEF',()=>{
 const c=character(['zodiac_sagittarius']);const e=createBossCombatant('eiskrabbe_b47f');e.def=9999;e.actions=[];e.attack=0;
 let b=createBattleState({character:c,enemy:e});b=round(b,{type:'attack'},()=>.99);
 assert.ok(b.enemy.hp<e.hp-1);assert.equal(b.presentationEvents.filter(e=>e.actorSide==='player'&&e.type==='attackHit').every(e=>e.hit),true);
 for(const [resistance,expected] of [[0,0],[.5,1],[1,1],[1.5,1.5]]){
 const result=resolveSpell({attacker:{int:30},defender:{elementMultipliers:{fire:resistance}},spell:{element:'fire',spellPower:50,ignoresElementResistance:true},rng:()=>.5});
 assert.equal(result.elementMultiplier,expected);
 }
 const plain=resolveSpell({attacker:{int:30},defender:{elementMultipliers:{fire:.5}},spell:{element:'fire',spellPower:50},rng:()=>.5});assert.equal(plain.elementMultiplier,.5);
 const physical=resolvePhysicalAttack({attacker:{str:30},defender:{def:999},attack:{weaponAttack:50,ignoresDefense:true,unavoidable:true},rng:()=>.5});assert.equal(physical.effectiveDefense,0);
 const immune=resolvePhysicalAttack({attacker:{str:30},defender:{elementMultipliers:{holy:0}},attack:{weaponAttack:50,element:'holy',ignoresDefense:true,unavoidable:true},rng:()=>0});assert.equal(immune.totalDamage,0);
});

test('Sagittarius applies through real multi-target physical skills and spell actions',()=>{
 for(const skillId of ['wide_swing','flame_sweep']){
  const c=character(['zodiac_sagittarius']);c.skillIds.push(skillId);
  const enemies=[0,1].map(()=>{const e=createBossCombatant('eiskrabbe_b47f');e.def=9999;e.actions=[];e.attack=0;return e;});
  const b=createBattleState({character:c,enemy:enemies[0],enemies});
  const r=round(b,{type:'skill',skillId},()=>.99);
  assert.ok(r.enemies.every(e=>e.hp<e.maxHp));
  assert.ok(r.presentationEvents.filter(e=>e.actorSide==='player'&&e.type==='attackHit').every(e=>e.hit));
 }
 const c=character(['zodiac_sagittarius']);const enemy=createBossCombatant('eiskrabbe_b47f');enemy.elementMultipliers.fire=.5;
 const boosted=round(createBattleState({character:c,enemy}),{type:'skill',skillId:'flame_sweep'},()=>.5);
 c.cards.deckSlots=[];
 const normal=round(createBattleState({character:c,enemy}),{type:'skill',skillId:'flame_sweep'},()=>.5);
 assert.ok(boosted.enemy.hp<normal.enemy.hp);
});

test('B96 fixed room, neighboring rooms, first victory, old ownership and saved achievement',()=>{
 assert.equal(ZENTAURIN.maxHp,40000);
 assert.equal(getSpecialRoomDefinition(96).content.bossId,ZENTAURIN_ID);
 assert.notEqual(getSpecialRoomDefinition(95)?.content?.bossId,ZENTAURIN_ID);
 assert.notEqual(getSpecialRoomDefinition(97)?.content?.bossId,ZENTAURIN_ID);
 buildBoundaryWallMap(96,()=>.5,{});
 assert.equal(cells.flat().filter(c=>c?.specialRoom?.content?.bossId===ZENTAURIN_ID).length,1);
 const c=character();const first=applyBossVictory(c,ZENTAURIN_ID);
 assert.equal(first.reward.cardId,'zodiac_sagittarius');assert.equal(first.accepted,true);
 const restored=normalizeCharacter(JSON.parse(JSON.stringify(first.character)));
 assert.equal(isBossDefeated(restored,ZENTAURIN_ID),true);assert.equal(applyBossVictory(restored,ZENTAURIN_ID).accepted,false);
 assert.equal(getAdventureChronicle(restored).find(e=>e.id==='zentaurin').achieved,true);
 const owned=grantCard(c.cards,'zodiac_sagittarius',1,c.deckCost);
 assert.equal(grantCard(owned.cards,'zodiac_sagittarius',1,c.deckCost).gained,0);
 assert.equal(ZENTAURIN.escapeRate,1);assert.equal(createBossCombatant(ZENTAURIN_ID).hp,ZENTAURIN.maxHp);
});
