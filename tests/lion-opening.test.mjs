import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialCharacter} from '../data/classes.js';
import {createBossCombatant} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {applyStatusApplications} from '../combat/status-lifecycle.js';
import {clearLionOpenings} from '../combat/loewenkoenigin.js';
import {LION_JUDGMENT,LION_ACTIONS} from '../data/loewenkoenigin.js';
const ID='loewenkoenigin_b1f';
function setup(cards=['zodiac_sagittarius']) {
 const c=createInitialCharacter({name:'QA',job:'mage'});
 c.level=197;c.hp=c.maxHp=10000;c.sp=c.maxSp=1000;c.cards.deckSlots=cards;
 c.skillIds.push('power_strike','blade_dance','holy_light','lightning_bolt','flame_sweep','triage');
 const b=createBattleState({character:c,enemy:createBossCombatant(ID)});
 b.enemy.reservedEnemyAction=structuredClone(LION_ACTIONS[3]);
 return b;
}
function run(b,cmd={type:'attack'},rng=()=>.2){const r=resolveBattleRound({battle:b,playerCommand:cmd,rng});assert.equal(r.accepted,true,r.reason);return r.battle;}
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
const expose=b=>{b.enemy.lionOpening=true;return b;};
const used=b=>b.presentationEvents.filter(e=>e.type==='lionOpeningEnded'&&e.used);
test('actual judgment (including a miss) creates opening; roar and incapacitated judgment do not',()=>{
 for(const rng of [()=>.2,()=>.999]){const b=setup();b.enemy.reservedEnemyAction=LION_JUDGMENT;assert.equal(run(b,{type:'guard'},rng).enemy.lionOpening,true);}
 assert.equal(run(setup(),{type:'guard'}).enemy.lionOpening,undefined);
 const b=setup();b.enemy.reservedEnemyAction=LION_JUDGMENT;b.enemy.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);
 assert.equal(run(b,{type:'guard'}).enemy.lionOpening,undefined);
});
for(const [hp,multiplier] of [[100000,3],[50000,4],[25000,5]])test(`phase HP${hp} multiplies final damage by ${multiplier}`,()=>{
 const b=setup();b.enemy.hp=hp;const plain=hits(run(b))[0].damage;
 const r=run(expose(b));assert.equal(hits(r)[0].damage,plain*multiplier);assert.equal(used(r).length,1);assert.equal(r.enemy.lionOpening,undefined);
});
for(const skillId of ['power_strike','blade_dance','holy_light','lightning_bolt'])test(`${skillId}: every hit amplified, one action consumed`,()=>{
 const b=setup(),cmd={type:'skill',skillId};const plain=hits(run(b,cmd));const r=run(expose(b),cmd);
 assert.deepEqual(hits(r).map(e=>e.damage),plain.map(e=>e.damage*3));assert.equal(used(r).length,1);
});
test('miss uses opportunity; invalid command and incapacitation do not',()=>{
 const b=expose(setup([]));const r=run(b,{type:'attack'},()=>.999);assert.ok(hits(r).every(e=>!e.hit));assert.equal(used(r).length,1);
 const invalid=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'unknown'}});assert.equal(invalid.accepted,false);assert.equal(invalid.battle.enemy.lionOpening,true);
 b.player.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);assert.equal(run(b).enemy.lionOpening,true);
});
for(const cmd of [{type:'guard'},{type:'wait'},{type:'skill',skillId:'triage'},{type:'item',itemId:'healing_potion'}])test(`nonattack ${cmd.skillId||cmd.type} expires without use`,()=>{
 const b=expose(setup());b.player.hp=5000;b.player.inventory.counts.healing_potion=1;
 const r=run(b,cmd);assert.equal(r.enemy.lionOpening,undefined);assert.equal(used(r).length,0);
});
for(const [statusId,cap] of [['poison',250],['deadly_poison',500],['death_poison',1000],['bleeding',500]])test(`${statusId} tick unchanged by opening`,()=>{
 const b=expose(setup());b.enemy.statuses=applyStatusApplications([],[{statusId,success:true,duration:20}]);
 const r=run(b,{type:'guard'});assert.equal(r.enemy.hp,100000-cap);
});
test('Cancer counter and phase-three self cost unchanged',()=>{
 const b=setup(['zodiac_cancer']);b.enemy.hp=20000;b.enemy.reservedEnemyAction=LION_ACTIONS[0];
 const plain=run(b,{type:'guard'},()=>0),r=run(expose(b),{type:'guard'},()=>0);
 assert.equal(r.enemy.hp,plain.enemy.hp);assert.equal(r.presentationEvents.find(e=>e.type==='leoHpCost').amount,1000);
 assert.deepEqual(r.presentationEvents.filter(e=>e.type==='cancerCounterDamage'),plain.presentationEvents.filter(e=>e.type==='cancerCounterDamage'));
});
test('Gemini reruns at 50%, opening once on both; Aries only boosts original',()=>{
 const cmd={type:'skill',skillId:'lightning_bolt'};
 for(const aries of [false,true]){
 const b=setup(['zodiac_sagittarius','zodiac_gemini',...(aries?['zodiac_aries']:[])]),plain=hits(run(b,cmd)),r=run(expose(b),cmd);
 assert.equal(plain.length,2);assert.deepEqual(hits(r).map(e=>e.damage),plain.map(e=>e.damage*3));assert.equal(hits(r)[1].geminiCopy,true);assert.equal(used(r).length,1);
 }
 const base=hits(run(setup(),cmd))[0].damage,boosted=hits(run(expose(setup(['zodiac_sagittarius','zodiac_aries','zodiac_gemini'])),cmd));
 assert.equal(boosted[0].damage,base*6);assert.equal(boosted[1].damage,Math.floor(base*.5)*3);
});
test('Sagittarius ignores physical DEF; opening applied after Capricorn and Libra',()=>{
 const b=setup(['zodiac_sagittarius','zodiac_capricorn','zodiac_libra']);b.turn=20;
 const plain=hits(run(b))[0].damage;b.enemy.def=9999;
 assert.equal(hits(run(expose(b)))[0].damage,plain*3);
});
test('Libra applies 1.3 dealt and .7 received to lower-level boss',()=>{
 const b=setup([]);b.enemy.reservedEnemyAction=LION_ACTIONS[0];
 const plain=run(b);b.libraActiveAtStart=true;const boosted=run(b);
 const dealt=x=>hits(x)[0].damage,received=x=>x.presentationEvents.find(e=>e.type==='attackHit'&&e.actorSide==='enemy').damage;
 assert.equal(dealt(boosted),Math.floor(dealt(plain)*1.3));assert.equal(received(boosted),Math.floor(received(plain)*.7));
 assert.equal(b.player.level,197);assert.equal(b.enemy.level,125);
});
test('all-target spell only amplifies queen; multiple targets still consume once',()=>{
 const b=setup();const other=structuredClone(b.enemy);other.id='other';
 const multi=createBattleState({character:b.player,enemy:b.enemy,enemies:[b.enemy,other]});
 const plain=hits(run(multi,{type:'skill',skillId:'flame_sweep'}));multi.enemies[0].lionOpening=true;
 const r=run(multi,{type:'skill',skillId:'flame_sweep'}),h=hits(r);
 assert.equal(h[0].damage,plain[0].damage*3);assert.equal(h[1].damage,plain[1].damage);assert.equal(used(r).length,1);
});
test('phase transition during action keeps original opening multiplier for Gemini',()=>{
 const b=expose(setup(['zodiac_sagittarius','zodiac_gemini']));b.enemy.hp=50001;
 const r=run(b,{type:'skill',skillId:'lightning_bolt'});assert.ok(r.enemy.hp<50000);assert.ok(hits(r).every(e=>e.lionOpeningMultiplier===3));
});
test('victory and escape cleanup; fresh retry has no opening',()=>{
 const b=expose(setup());b.enemy.hp=1;assert.equal(run(b).enemy.lionOpening,undefined);
 clearLionOpenings(b);assert.equal(b.enemy.lionOpening,undefined);assert.equal(setup().enemy.lionOpening,undefined);
 assert.match(readFileSync('js/battle.js','utf8'),/outcome = "escaped";\s*clearLionOpenings/);
});
test('ordinary enemy never gains or receives opening multiplier',()=>{
 const b=setup();b.enemy.id='ordinary';const plain=hits(run(b))[0].damage;
 assert.equal(hits(run(expose(b)))[0].damage,plain);b.enemy.reservedEnemyAction=LION_JUDGMENT;delete b.enemy.lionOpening;
 assert.equal(run(b).enemy.lionOpening,undefined);
});

test('NPC charge and normal support damage do not amplify or consume the opening',async()=>{
 const {normalizeNpcSystem}=await import('../data/npc-party.js');
 const {applyNpcChargeSkills,applyNpcAfterPlayerAttack}=await import('../combat/npc-support.js');
 const b=setup();b.player.npcSystem=normalizeNpcSystem({registeredIds:['alec'],activeIds:['alec'],records:{alec:{maxDepth:60,charge:100}}});
 const plain=structuredClone(b),opened=expose(structuredClone(b));
 applyNpcChargeSkills(plain,()=>.2);applyNpcChargeSkills(opened,()=>.2);
 assert.ok(plain.enemy.hp<100000);assert.equal(opened.enemy.hp,plain.enemy.hp);assert.equal(opened.enemy.lionOpening,true);
 applyNpcAfterPlayerAttack(plain,()=>.2);applyNpcAfterPlayerAttack(opened,()=>.2);assert.equal(opened.enemy.hp,plain.enemy.hp);assert.equal(opened.enemy.lionOpening,true);
});
test('throwing item remains fixed damage and expires opening without using it',()=>{
 const b=setup();b.player.inventory.counts.stone=1;
 const plain=run(b,{type:'item',itemId:'stone'}),r=run(expose(b),{type:'item',itemId:'stone'});
 assert.equal(r.enemy.hp,plain.enemy.hp);assert.equal(r.enemy.lionOpening,undefined);assert.equal(used(r).length,0);
});
test('priority healing expires opening, and restarting with a stale enemy cannot preserve it',()=>{
 const b=expose(setup());b.player.hp=10;b.player.inventory.counts.active_healing_potion_small=1;
 const r=run(b,{type:'item',itemId:'active_healing_potion_small'});assert.equal(r.enemy.lionOpening,undefined);
 const fresh=createBattleState({character:b.player,enemy:b.enemy});assert.equal(fresh.enemy.lionOpening,undefined);
});
test('Capricorn full stacks and opening compose without changing incoming damage',()=>{
 const b=setup();b.turn=20;const plain=run(b);
 b.capricornActiveAtStart=true;const stacked=run(b),r=run(expose(b));
 assert.equal(hits(stacked)[0].damage,Math.floor(hits(plain)[0].damage*1.3));
 assert.equal(hits(r)[0].damage,hits(stacked)[0].damage*3);assert.equal(r.player.hp,stacked.player.hp);
});
