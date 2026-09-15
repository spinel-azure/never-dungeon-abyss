import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getCardById} from '../data/cards.js';
import {getStatusEffect,STATUS_EFFECTS} from '../data/status-effects.js';
import {createBattleState,resolveBattleRound,resolveEnemyAmbush,resolveBattleOutcome,resolveJireneScriptedRound} from '../combat/battle-engine.js';
import {getEnemyById} from '../data/enemies.js';
import {PISCES_STATUS,PISCES_MESSAGE,isPiscesInvincible,applyCombatHpDamage,resolvePlayerSurvival} from '../combat/pisces.js';
import {applyStatus,clearBattleOnlyStatuses,resolveEndOfAction} from '../combat/status-lifecycle.js';
import {resolveInstantDeath,resolveStatusEffect} from '../combat/resolve-status-effect.js';
import {applyHpPresentationEvent} from '../js/battle.js';

const attack={id:'qa_attack',name:'検証攻撃',actionType:'physicalAttack',unavoidable:true,powerPerHit:1000,hitCount:1,speedModifier:999};
function setup({equipped=true,action=attack,multi=false}={}) {
  const c=normalizeCharacter({...createInitialCharacter({name:'QA',job:'warrior'}),level:197});
  c.hp=7;c.maxHp=101;c.sp=37;c.maxSp=100;
  c.cards.deckSlots=equipped?['zodiac_pisces']:[];
  const e=structuredClone(getEnemyById('abyss_rat'));e.hp=e.maxHp=999999;e.actions=[{weight:1,action}];
  return createBattleState({character:c,enemy:e,...(multi?{enemies:[e,structuredClone(e)]}:{})});
}
function round(b,command={type:'wait'}) {return resolveBattleRound({battle:b,playerCommand:command,rng:()=>.1});}

test('existing Pisces identity, description and limits remain one Z card',()=>{
 const c=getCardById('zodiac_pisces');assert.equal(c.cost,8);assert.equal(c.maxOwned,1);assert.equal(c.maxCopies,1);
 assert.equal(c.descriptionJa,'1戦闘に1回、戦闘不能時に最大HPの50％で復活し、通常の状態異常を解除する。さらに、次のターン終了まで完全無敵になる。');
});
for(const [name,action] of [['normal',attack],['multi',{...attack,hitCount:5}],['spell',{id:'qa_spell',name:'検証呪文',actionType:'spell',spellPower:9999,element:'dark',speedModifier:999}],['instant death',{id:'qa_death',name:'即死',actionType:'banishUndead',speedModifier:999}]]) {
 test(`${name}: death revives once, preserves SP and protects the complete next turn`,()=>{
  let b=round(setup({action})).battle;
  assert.equal(b.outcome,null);assert.equal(b.player.hp,50);assert.equal(b.player.sp,37);assert.equal(b.piscesUsed,true);
  assert.equal(b.turn,2);assert.equal(b.piscesProtectedThroughTurn,2);assert.equal(isPiscesInvincible(b.player),true);
  assert.equal(b.log.filter(x=>x===PISCES_MESSAGE).length,1);
  assert.equal(b.presentationEvents.filter(x=>x.piscesRevival).length,1);
  b=round(b).battle;assert.equal(b.player.hp,50);assert.equal(b.turn,3);assert.equal(isPiscesInvincible(b.player),false);
  b=round(b).battle;assert.equal(b.outcome,'defeat');assert.equal(b.player.hp,0);
 });
}
test('not equipped at start never revives, and later deck changes do not grant or revoke eligibility',()=>{
 let b=setup({equipped:false});b.player.cards.deckSlots=['zodiac_pisces'];assert.equal(round(b).battle.outcome,'defeat');
 b=setup();b.player.cards.deckSlots=[];assert.equal(round(b).battle.piscesUsed,true);
});
test('multi-enemy remaining actions deal zero after revival and protection expires after all actions',()=>{
 let b=round(setup({multi:true})).battle;
 assert.equal(b.player.hp,50);assert.equal(b.outcome,null);
 assert.ok(b.presentationEvents.some(e=>e.type==='attackHit' && e.targetSide==='player' && e.damage===0));
 b=round(b).battle;assert.equal(b.player.hp,50);assert.equal(isPiscesInvincible(b.player),false);
 assert.equal(round(b).battle.outcome,'defeat');
});
test('ambush protects first command turn only, invalid input does not shorten it',()=>{
 let b=resolveEnemyAmbush({battle:setup(),rng:()=>.1}).battle;
 assert.equal(b.turn,1);assert.equal(b.player.hp,50);assert.equal(b.piscesProtectedThroughTurn,1);
 const invalid=round(b,{type:'skill',skillId:'missing'});assert.equal(invalid.accepted,false);
 assert.equal(invalid.battle.piscesProtectedThroughTurn,1);assert.equal(b.player.sp,37);
 b=round(b).battle;assert.equal(b.player.hp,50);assert.equal(isPiscesInvincible(b.player),false);
 assert.equal(round(b).battle.outcome,'defeat');
});
for(const id of ['deadly_poison','death_poison'])test(`${id} on the final action revives with full next-turn protection`,()=>{
 const b=setup({action:{id:'wait',actionType:'wait',speedModifier:999}});
 b.player.hp=1;b.player.statuses=applyStatus([],{statusId:id,success:true});
 const next=round(b).battle;assert.equal(next.player.hp,50);assert.equal(next.piscesProtectedThroughTurn,2);
 assert.equal(next.player.statuses.some(s=>s.id===id),false);
});
test('ordinary poison/bleeding retain existing nonlethal rules',()=>{
 for(const id of ['poison','bleeding']){
  const b=setup({action:{id:'wait',actionType:'wait'}});b.player.hp=1;b.player.statuses=applyStatus([],{statusId:id,success:true});
  const next=round(b).battle;assert.equal(next.player.hp,1);assert.equal(next.piscesUsed,false);
 }
});
test('all registered ailments/debuffs clear, buffs and sealed-arrow gimmick survive',()=>{
 const b=setup();b.player.battleSkillSealed=true;
 b.player.statuses=Object.values(STATUS_EFFECTS).filter(s=>s.id!==PISCES_STATUS).map(s=>({...s}));
 b.player.hp=0;const charge=structuredClone(b.player.playerCharge);
 assert.equal(resolvePlayerSurvival(b),true);assert.equal(b.player.battleSkillSealed,true);
 assert.deepEqual(b.player.playerCharge,charge);assert.equal(b.player.sp,37);
 assert.ok(b.player.statuses.some(s=>s.id==='magic_focus'));
 assert.ok(b.player.statuses.every(s=>!['ailment','debuff'].includes(s.kind)));
 for(const def of Object.values(STATUS_EFFECTS)) if(['ailment','debuff'].includes(def.kind)){
  assert.equal(applyStatus(b.player.statuses,{statusId:def.id,success:true}).some(s=>s.id===def.id),false);
  assert.equal(resolveStatusEffect({defender:b.player,effect:{statusId:def.id,guaranteed:true}}).success,false);
 }
 assert.equal(resolveInstantDeath({defender:b.player,baseRate:1,minimumRate:1,maximumRate:1}).success,false);
});
test('fixed, percentage and reflection HP loss use the common gate; simultaneous death resolves before victory',()=>{
 for(const multi of [false,true]) {
  const b=setup({multi});b.turn=5;
  applyCombatHpDamage(b.player,999999);
  for(const e of b.enemies||[b.enemy]){e.hp=0;e.alive=false;}
  resolveBattleOutcome(b);assert.equal(b.outcome,'victory');assert.equal(b.player.hp,50);
  for(const damage of [1,50,999999,Math.floor(b.player.maxHp*.9)])assert.equal(applyCombatHpDamage(b.player,damage),0);
 }
});
test('Alec lethal avoidance precedes Pisces without consuming both',()=>{
 const b=setup();b.player.npcSystem={activeIds:['alec'],records:{alec:{growthStage:10}}};
 let next=round(b).battle;assert.equal(next.player.hp,1);assert.equal(next.piscesUsed,false);assert.equal(next.npcSiegfriedUsed,true);
 next=round(next).battle;assert.equal(next.piscesUsed,true);assert.equal(next.player.hp,50);
});
test('immunity persists through phase changes, allows healing and expires at turn end',()=>{
 let b=round(setup()).battle;b.phase='command';
 b.player.statuses=applyStatus(b.player.statuses,{statusId:'guardian_prayer',success:true});
 assert.ok(b.player.statuses.some(s=>s.id==='guardian_prayer'));
 const end=resolveEndOfAction({statuses:[...b.player.statuses,...['poison','bleeding','deadly_poison','death_poison'].map(getStatusEffect)],maxHp:101});
 assert.equal(end.poisonDamage+end.bleedingDamage+end.deadlyPoisonDamage+end.deathPoisonDamage,0);
 b=round(b).battle;assert.equal(isPiscesInvincible(b.player),false);
 assert.equal(resolveInstantDeath({defender:b.player,baseRate:1,minimumRate:1,maximumRate:1}).success,true);
});
test('battle-local status is removed on normalization, cleanup and a new battle',()=>{
 const b=round(setup()).battle;
 assert.equal(isPiscesInvincible({statuses:clearBattleOnlyStatuses(b.player.statuses)}),false);
 assert.equal(isPiscesInvincible(normalizeCharacter(b.player)),false);
 const next=createBattleState({character:b.player,enemy:b.enemy});assert.equal(next.piscesUsed,false);assert.equal(isPiscesInvincible(next.player),false);
});
test('scripted nonlethal event does not consume Pisces or prevent its ending',()=>{
 let b=setup();b.scriptedBattleType='jirene_first_encounter';
 for(let i=0;i<3;i++) b=resolveJireneScriptedRound({battle:b,rng:()=>.1}).battle;
 assert.equal(b.outcome,'jireneScriptedDefeat');assert.equal(b.piscesUsed,false);
});
test('HP presentation places revival after the complete multi-hit damage sequence',()=>{
 const initial=setup({action:{...attack,hitCount:5}});const b=round(initial).battle;
 let hp={player:initial.player.hp,enemy:initial.enemy.hp};
 for(const event of b.presentationEvents)hp=applyHpPresentationEvent(hp,b,event);
 assert.equal(hp.player,b.player.hp);
 assert.equal(b.presentationEvents.filter(e=>e.type==='attackHit').length,5);
 assert.ok(b.presentationEvents.findIndex(e=>e.piscesRevival)>b.presentationEvents.findLastIndex(e=>e.type==='attackHit'));
});

test('late turn and player-first ordering preserve the next full turn; minimum HP is one',()=>{
 for(const speedModifier of [-999,999]){
  let b=setup({action:{...attack,speedModifier}});b.turn=5;
  b=round(b).battle;assert.equal(b.turn,6);assert.equal(b.piscesProtectedThroughTurn,6);
  b=round(b).battle;assert.equal(b.turn,7);assert.equal(b.player.hp,50);assert.equal(isPiscesInvincible(b.player),false);
 }
 const b=setup();b.player.maxHp=1;b.player.hp=0;resolvePlayerSurvival(b);assert.equal(b.player.hp,1);
});

test('revival HP presentation is absolute even when an instant kill has no damage-number event',()=>{
 const initial=setup({action:{actionType:'banishUndead',id:'death',speedModifier:999}});
 const b=round(initial).battle;let hp={player:7,enemy:999999};
 for(const event of b.presentationEvents)hp=applyHpPresentationEvent(hp,b,event);
 assert.equal(hp.player,50);
});

test('invulnerability never triggers Cancer or consumes a damage barrier',()=>{
 let b=round(setup()).battle;b.cancerActiveAtStart=true;b.sphinxBarrier=100;
 const next=round(b).battle;assert.equal(next.sphinxBarrier,100);
 assert.equal(next.presentationEvents.some(e=>e.type==='cancerCounterDamage'),false);
});

test('fixed-damage action goes through death and immunity in the real action pipeline',()=>{
 const action={id:'qa_fixed',name:'固定攻撃',actionType:'item',speedModifier:999,
   item:{id:'qa_fixed',name:'固定攻撃',reusable:true,effects:[{id:'thrown_fixed_damage',value:10000}]}};
 let b=round(setup({action})).battle;assert.equal(b.player.hp,50);assert.equal(b.piscesUsed,true);
 b=round(b).battle;assert.equal(b.player.hp,50);assert.ok(b.presentationEvents.some(e=>e.type==='damage' && e.amount===0));
});

test('simultaneous deaths without a remaining resurrection consistently end in defeat',()=>{
 for(const multi of [false,true]) {
  const b=setup({multi});b.piscesUsed=true;b.player.hp=0;
  for(const e of b.enemies||[b.enemy]){e.hp=0;e.alive=false;}
  resolveBattleOutcome(b);assert.equal(b.outcome,'defeat');
 }
});

test('the early enemy-escape branch also removes immunity',()=>{
 let b=round(setup()).battle;b.enemy.id='maikaefer';
 b.enemy.actions=[{weight:1,action:{id:'escape',actionType:'enemyEscape'}}];
 b=round(b).battle;assert.equal(b.outcome,'enemyEscaped');assert.equal(isPiscesInvincible(b.player),false);
});
