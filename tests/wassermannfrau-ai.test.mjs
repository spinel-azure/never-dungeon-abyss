import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCharacter } from '../data/classes.js';
import { createBossCombatant } from '../data/bosses.js';
import { WASSERMANNFRAU_ID as ID, WASSERMANNFRAU_ACTIONS as A } from '../data/wassermannfrau.js';
import { createBattleState, createEnemyAction, resolveBattleRound, resolveBattleOutcome } from '../combat/battle-engine.js';
import { absorbBossMagicBarrier, absorbPlayerMagic } from '../combat/boss-magic-barrier.js';
import { wassermannfrauActionTable, recoverWassermannfrauBarrier, executeWassermannfrauUtility, finishWassermannfrauPlayerAction } from '../combat/wassermannfrau-ai.js';
import { applyStatusApplications } from '../combat/status-lifecycle.js';
import { drawEnemyAmbientFrame, ENEMY_AMBIENT_EFFECTS } from '../js/enemy-ambient-effects.js';
import { drawBarrierShatter } from '../js/barrier-shatter.js';

function setup() {
  const c = createInitialCharacter({name:'QA',job:'mage'});
  c.hp=c.maxHp=10000;c.sp=200;c.maxSp=1000;c.skillIds.push('lightning_bolt');
  return createBattleState({character:c,enemy:createBossCombatant(ID)});
}
const round = (b, command={type:'wait'}, rng=()=>.1) => resolveBattleRound({battle:b,playerCommand:command,rng}).battle;
const ids = (b) => wassermannfrauActionTable(b.enemy,b.player).map(e=>e.action.id);

test('opening introduces the guardian and its magic barrier on separate lines',()=>{
  assert.deepEqual(setup().log.slice(0,2),['ヴァッサーマンフラウが現れた！','魔力障壁によって護られている！']);
});

test('normal and crisis tables exclude useless absorption and repeated actions',()=>{
  const b=setup();assert.ok(!ids(b).includes(A.absorb.id));
  b.enemy.bossMagicBarrier=500;assert.deepEqual(wassermannfrauActionTable(b.enemy,b.player).map(e=>e.weight),[30,40,30]);
  for(const action of [A.strike,A.spell,A.absorb]) { b.enemy.lastWassermannfrauAction=action.id;assert.ok(!ids(b).includes(action.id)); }
  b.enemy.bossMagicBarrier=250;assert.equal(wassermannfrauActionTable(b.enemy,b.player).find(e=>e.action.id===A.absorb.id).weight,50);
  assert.ok(ids(b).includes(A.absorb.id));b.player.sp=0;assert.ok(!ids(b).includes(A.absorb.id));
});
test('weighted selection covers all normal actions and ordinary enemies keep their table',()=>{
  const b=setup();b.enemy.bossMagicBarrier=500;
  assert.deepEqual([0,.4,.99].map(r=>createEnemyAction(b.enemy,()=>r,{battle:b}).id),[A.strike.id,A.spell.id,A.absorb.id]);
  const e={id:'other',attack:5,actions:[{weight:1,action:{id:'wait',actionType:'wait'}}]};
  assert.equal(createEnemyAction(e,()=>0).id,'wait');
});
test('barrier break exhausts and cancels tide; regeneration waits for next player opportunity',()=>{
  const b=setup();b.enemy.reservedEnemyAction=structuredClone(A.tide);
  absorbBossMagicBarrier(b,b.enemy,1001);
  assert.equal(b.enemy.magicExhausted,true);assert.equal(b.enemy.def,15);assert.equal(b.enemy.reservedEnemyAction,undefined);
  assert.equal(createEnemyAction(b.enemy,()=>0,{battle:b}).id,A.regenerate.id);
  executeWassermannfrauUtility(b,b.enemy,A.regenerate);finishWassermannfrauPlayerAction(b);
  assert.equal(b.enemy.bossMagicBarrier,0);
  b.turn++;finishWassermannfrauPlayerAction(b);
  assert.equal(b.enemy.bossMagicBarrier,200);assert.equal(b.enemy.def,30);assert.equal(b.enemy.magicExhausted,false);
});
test('real rounds give an exposed hit before regeneration for either action order',()=>{
  for(const agility of [1,30]) {
    let b=setup();b.player.baseStats={...b.player.baseStats,agi:agility};b.enemy.bossMagicBarrier=1;
    b=round(b,{type:'skill',skillId:'lightning_bolt'},()=>.1);
    assert.equal(b.enemy.bossMagicBarrier,0);assert.equal(b.enemy.hp,4000);
    b=round(b,{type:'skill',skillId:'lightning_bolt'},()=>.1);
    assert.ok(b.enemy.hp<4000);assert.equal(b.enemy.bossMagicBarrier,200);assert.equal(b.enemy.def,30);
  }
});
test('absorption reserves tide on recovery to max only; chip damage interrupts it',()=>{
  const b=setup();assert.equal(b.enemy.reservedEnemyAction,undefined);
  b.enemy.bossMagicBarrier=900;absorbPlayerMagic(b,b.enemy,b.player,A.absorb);
  assert.equal(b.enemy.reservedEnemyAction.id,A.tide.id);
  assert.equal(b.log.filter(s=>s.includes('水瓶が魔力で')).length,1);
  absorbPlayerMagic(b,b.enemy,b.player,A.absorb);assert.equal(b.log.filter(s=>s.includes('水瓶が魔力で')).length,1);
  absorbBossMagicBarrier(b,b.enemy,1);assert.equal(b.enemy.reservedEnemyAction,undefined);
  assert.ok(b.log.some(s=>s.includes('満潮は阻止')));
});
test('tide fires, guard reduces damage, and an earlier player hit cancels preselected tide',()=>{
  const b=setup();b.enemy.reservedEnemyAction=structuredClone(A.tide);
  const hit=round(b),guard=round(b,{type:'guard'});
  assert.ok(hit.log.some(s=>s.includes('水瓶の満潮！')));
  assert.ok(guard.player.hp>hit.player.hp);assert.equal(hit.enemy.reservedEnemyAction,undefined);
  b.player.baseStats={...b.player.baseStats,agi:30};b.enemy.stats.agi=1;
  const interrupted=round(b,{type:'skill',skillId:'lightning_bolt'});
  assert.ok(!interrupted.log.some(s=>s.includes('の水瓶の満潮！')));
});
test('half HP triggers phase two once; charge and greater spell use configured values',()=>{
  const b=setup();b.enemy.hp=2000;resolveBattleOutcome(b);resolveBattleOutcome(b);
  assert.equal(b.enemy.magicReleased,true);assert.equal(b.log.filter(s=>s.includes('魔力を解放した')).length,1);
  assert.ok(ids(b).includes(A.greaterSpell.id));assert.ok(!ids(b).includes(A.charge.id));
  b.enemy.bossMagicBarrier=800;assert.ok(ids(b).includes(A.charge.id));
  executeWassermannfrauUtility(b,b.enemy,A.charge);assert.equal(b.enemy.bossMagicBarrier,950);assert.equal(b.player.sp,200);
  executeWassermannfrauUtility(b,b.enemy,A.charge);assert.equal(b.enemy.bossMagicBarrier,1000);assert.equal(b.enemy.reservedEnemyAction.id,A.tide.id);
  absorbBossMagicBarrier(b,b.enemy,1000);assert.equal(createEnemyAction(b.enemy,()=>.99,{battle:b}).id,A.regenerate.id);
  assert.equal(A.greaterSpell.spellPower,45);
});
test('strike drains ten SP only on real HP damage, with no barrier recovery',()=>{
  let b=setup();let hit=round(b);assert.equal(hit.player.sp,190);assert.equal(hit.enemy.bossMagicBarrier,1000);
  b.player.sp=4;assert.equal(round(b).player.sp,0);
  b=setup();b.enemy.lastWassermannfrauAction=A.spell.id;
  assert.equal(round(b,{type:'wait'},()=>.999).player.sp,200);
  b=setup();b.sphinxBarrier=9999;assert.equal(round(b).player.sp,200);
});
test('new battle has no exhausted, phase-two, reservation or previous-action state',()=>{
  const b=setup();b.enemy.hp=1000;resolveBattleOutcome(b);absorbBossMagicBarrier(b,b.enemy,1000);
  const fresh=setup();for(const key of ['magicExhausted','magicReleased','reservedEnemyAction','lastWassermannfrauAction']) assert.equal(fresh.enemy[key],undefined);
  assert.equal(fresh.enemy.def,30);assert.equal(fresh.enemy.bossMagicBarrier,1000);
});
for(const statusId of ['poison','deadly_poison','death_poison']) {
  test(`${statusId} persists while exposed and is cleansed by regeneration and absorption`,()=>{
    for(const recovery of ['regen','absorb']) {
      const b=setup();absorbBossMagicBarrier(b,b.enemy,1000);
      b.enemy.statuses=applyStatusApplications(b.enemy.statuses,[{statusId,success:true},{statusId:'bleeding',success:true},{statusId:'action_skip',success:true}]);
      resolveBattleOutcome(b);assert.ok(b.enemy.statuses.some(s=>s.id===statusId));
      if(recovery==='absorb') absorbPlayerMagic(b,b.enemy,b.player,A.absorb);
      else {executeWassermannfrauUtility(b,b.enemy,A.regenerate);b.turn++;finishWassermannfrauPlayerAction(b);}
      assert.ok(!b.enemy.statuses.some(s=>s.id===statusId));
      assert.ok(b.enemy.statuses.some(s=>s.id==='bleeding'));assert.ok(b.enemy.statuses.some(s=>s.id==='action_skip'));
      assert.equal(b.log.filter(s=>s.includes('毒が浄化された')).length,1);
      const msgs=b.presentationEvents.map(e=>e.message);assert.ok(msgs.findLastIndex(s=>s.includes('毒が浄化された'))>msgs.findLastIndex(s=>s.includes(recovery==='regen'?'再展開された':'の魔力吸収')));
    }
  });
}
test('positive-to-positive recovery, opening, empty poison set and other enemies never cleanse',()=>{
  const b=setup();assert.ok(!b.log.some(s=>s.includes('浄化')));
  b.enemy.bossMagicBarrier=100;b.enemy.statuses=applyStatusApplications([],[{statusId:'death_poison',success:true}]);
  recoverWassermannfrauBarrier(b,b.enemy,150,'回復');assert.equal(b.enemy.statuses.length,1);
  b.enemy.bossMagicBarrier=0;b.enemy.statuses=[];recoverWassermannfrauBarrier(b,b.enemy,150,'回復');assert.ok(!b.log.some(s=>s.includes('浄化')));
  b.enemy.id='other';b.enemy.bossMagicBarrier=0;b.enemy.statuses=applyStatusApplications([],[{statusId:'poison',success:true}]);
  absorbPlayerMagic(b,b.enemy,b.player,A.absorb);assert.equal(b.enemy.statuses.length,1);
});
test('Scorpio can apply death poison to exposed boss; damage ticks and redeployment cleanses it',()=>{
  let b=setup();b.enemy.stats.agi=1;b.player.baseStats={...b.player.baseStats,agi:30};b.enemy.bossMagicBarrier=0;b.scorpioActiveAtStart=true;b.enemy.lastWassermannfrauAction=A.strike.id;
  b=round(b,{type:'skill',skillId:'lightning_bolt'},()=>0);
  assert.ok(b.enemy.statuses.some(s=>s.id==='death_poison'));assert.ok(b.presentationEvents.some(e=>e.type==='poisonDamage'));
  recoverWassermannfrauBarrier(b,b.enemy,200,'再展開');assert.ok(!b.enemy.statuses.some(s=>s.id==='death_poison'));
});
test('poison blade applies poison through a real attack against exposed HP',()=>{
  let b=setup();b.player.skillIds.push('poison_blade');b.enemy.bossMagicBarrier=0;
  b.player.baseStats={...b.player.baseStats,agi:30};b.enemy.stats.agi=1;
  b=round(b,{type:'skill',skillId:'poison_blade'},()=>0);
  assert.ok(b.enemy.statuses.some(s=>s.id==='poison'));assert.ok(b.presentationEvents.some(e=>e.type==='poisonDamage'));
});
test('invalid input does not advance regeneration and skipped enemy preserves tide reservation',()=>{
  const b=setup();absorbBossMagicBarrier(b,b.enemy,1000);executeWassermannfrauUtility(b,b.enemy,A.regenerate);
  const rejected=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'missing'}});
  assert.equal(rejected.accepted,false);assert.equal(rejected.battle.enemy.bossMagicBarrier,0);
  const ready=setup();ready.enemy.reservedEnemyAction=structuredClone(A.tide);
  ready.enemy.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);
  assert.equal(round(ready).enemy.reservedEnemyAction.id,A.tide.id);
});
test('body sparkle is below the shield and persists without shield; reduced motion is static',()=>{
  const calls=[];
  const ctx=new Proxy({canvas:{width:300,height:300}},{get:(obj,key)=>key in obj?obj[key]:(...args)=>calls.push([key,...args])});
  const canvas={width:300,height:300,getContext:()=>ctx};
  const entry={profile:ENEMY_AMBIENT_EFFECTS['aquarius-shield'],back:canvas,front:canvas,barrierAmount:1000};
  drawEnemyAmbientFrame(entry,1,30);
  assert.ok(calls.findIndex(c=>c[0]==='fillRect')<calls.findIndex(c=>c[0]==='ellipse'));
  calls.length=0;entry.barrierAmount=0;drawEnemyAmbientFrame(entry,1,30);
  assert.ok(calls.some(c=>c[0]==='fillRect'));assert.ok(!calls.some(c=>c[0]==='ellipse'));
  calls.length=0;drawEnemyAmbientFrame(entry,1,30,true);const first=structuredClone(calls);
  calls.length=0;drawEnemyAmbientFrame(entry,9,30,true);assert.deepEqual(calls,first);
  calls.length=0;entry.concealed=true;drawEnemyAmbientFrame(entry,1,30);assert.ok(!calls.some(c=>c[0]==='fillRect'));
  calls.length=0;drawBarrierShatter(ctx,{x:100,y:100,rx:60,ry:90},.5);
  assert.equal(calls.filter(c=>c[0]==='rotate').length,24);
});
