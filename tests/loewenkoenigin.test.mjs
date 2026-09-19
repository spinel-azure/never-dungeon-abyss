import {resolveEscapeAttempt} from '../combat/resolve-escape.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {normalizeCharacter} from '../data/classes.js';
import {CARDS} from '../data/cards.js';
import {createBossCombatant, applyBossVictory} from '../data/bosses.js';
import {LOEWENKOENIGIN_ID as ID, LION_CONFIG as C, LION_IMAGES, LION_JUDGMENT, LION_ACTIONS, hasLeoQualification, getLeoDoorAccess} from '../data/loewenkoenigin.js';
import {synchronizeLionQueen, selectLionAction} from '../combat/loewenkoenigin.js';
import {createBattleState, createEnemyAction, resolveBattleRound} from '../combat/battle-engine.js';
import {applyStatusApplications} from '../combat/status-lifecycle.js';
import {magicBarrierAmount} from '../combat/aquarius.js';
import {createLionIntro, createLionVictory, handleLionInput, updateLionEvent} from '../js/lion-event.js';

function setup(deck=[]) {
  const c=createInitialCharacter({name:'QA',job:'mage'});
  c.hp=c.maxHp=10000;c.sp=c.maxSp=100;c.cards.deckSlots=deck;c.skillIds.push('lightning_bolt');
  return createBattleState({character:c,enemy:createBossCombatant(ID)});
}
const round=(b,command={type:'wait'},rng=()=>.2)=>resolveBattleRound({battle:b,playerCommand:command,rng}).battle;
function forced(b,action){b.enemy.reservedEnemyAction=structuredClone(action);return b;}
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='enemy');

test('exact phase boundaries, direct skip, no healing regression or extra action',()=>{
  for(const [hp,phase,def] of [[100000,1,60],[50001,1,60],[50000,2,45],[25001,2,45],[25000,3,30]]) {
    const b=setup();b.enemy.hp=hp;synchronizeLionQueen(b);
    assert.equal(b.enemy.lionPhase,phase);assert.equal(b.enemy.def,def);assert.equal(b.enemy.image,LION_IMAGES[phase-1]);
    assert.equal(b.presentationEvents.filter(e=>e.type==='lionPhase').length,phase===1?0:1);
    b.enemy.hp=100000;synchronizeLionQueen(b);assert.equal(b.enemy.lionPhase,phase);
  }
  const b=setup();b.enemy.hp=0;synchronizeLionQueen(b);assert.equal(b.presentationEvents.length,0);
});
test('all phase tables cover four actions and require ordinary action after judgment',()=>{
  for(const hp of [100000,50000,25000]) {
    const b=setup();b.enemy.hp=hp;
    const ids=new Set(Array.from({length:100},(_,i)=>selectLionAction(b.enemy,()=>i/100).id));
    assert.equal(ids.size,4);
    b.enemy.lastLionAction='lion_judgment';assert.ok(!Array.from({length:100},(_,i)=>selectLionAction(b.enemy,()=>i/100).id).includes('lion_roar'));
  }
});
test('physical and magic damage scale 1/2/3 and defense works against judgment',()=>{
  for(const action of [LION_ACTIONS[0],LION_ACTIONS[2],LION_JUDGMENT]) {
    const damage=[100000,50000,25000].map(hp=>{
      const b=setup();b.enemy.hp=hp;return 10000-round(forced(b,action)).player.hp;
    });
    assert.ok(damage[0]>0);assert.equal(damage[1],damage[0]*2);assert.equal(damage[2],damage[0]*3);
  }
  const b=forced(setup(),LION_JUDGMENT);
  assert.ok(round(b,{type:'guard'}).player.hp>round(b).player.hp);
});
test('roar has no damage, reserves one judgment and lets slow player act first',()=>{
  let b=setup();b.player.baseStats.agi=1;b.enemy.stats.agi=99;
  b=round(forced(b,LION_ACTIONS[3]));assert.equal(b.player.hp,10000);assert.equal(b.enemy.reservedEnemyAction.id,'lion_judgment');
  assert.equal(createEnemyAction(b.enemy).turnPriority,-100);
  b=round(b,{type:'skill',skillId:'lightning_bolt'});
  assert.equal(b.presentationEvents.find(e=>e.type==='attackHit').actorSide,'player');
  assert.equal(hits(b).length,1);assert.equal(b.enemy.reservedEnemyAction,undefined);
});
test('phase three self cost is once per action including multiple hits/misses, never lethal',()=>{
  for(const action of [LION_ACTIONS[0],LION_ACTIONS[1],LION_ACTIONS[2]])for(const rng of [()=>.2,()=>.999]) {
    const b=setup();b.enemy.hp=20000;
    const r=round(forced(b,action),{type:'wait'},rng);
    assert.equal(r.enemy.hp,19000);assert.equal(r.presentationEvents.filter(e=>e.type==='leoHpCost').length,1);
  }
  const b=setup();b.enemy.hp=500;assert.equal(round(forced(b,LION_ACTIONS[0])).enemy.hp,1);
  b.enemy.hp=20000;assert.equal(round(forced(b,LION_ACTIONS[3])).enemy.hp,20000);
});
test('action skip preserves judgment and never pays self cost',()=>{
  const b=forced(setup(),LION_JUDGMENT);b.enemy.hp=20000;
  b.enemy.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);
  const r=round(b);assert.equal(r.enemy.hp,20000);assert.equal(r.enemy.reservedEnemyAction.id,'lion_judgment');
});
test('normal and Aquarius barriers retain action-level protection, even against fangs',()=>{
  const b=setup(['common_guard_stone','zodiac_aquarius']);b.enemy.hp=20000;
  let r=round(forced(b,LION_ACTIONS[1]));assert.equal(r.player.hp,10000);assert.equal(r.sphinxBarrier,0);assert.equal(magicBarrierAmount(r.player),100);assert.equal(r.enemy.hp,19000);
  r=round(forced(r,LION_ACTIONS[1]));assert.equal(r.player.hp,10000);assert.equal(magicBarrierAmount(r.player),0);
  r=round(forced(r,LION_JUDGMENT));assert.ok(r.player.hp<10000);
});
test('Pisces revives against judgment and Scorpio can poison the queen',()=>{
  const b=setup(['zodiac_pisces']);b.player.hp=1;b.enemy.hp=20000;
  const r=round(forced(b,LION_JUDGMENT));assert.equal(r.piscesUsed,true);assert.ok(r.player.hp>0);assert.equal(r.outcome,null);
  const sc=setup(['zodiac_scorpio','zodiac_sagittarius']);
  const poisoned=round(forced(sc,LION_ACTIONS[3]),{type:'attack'},()=>0);
  assert.ok(poisoned.enemy.statuses.some(s=>s.id==='death_poison'));
  const ticked=round(forced(poisoned,LION_ACTIONS[3]));
  assert.ok(ticked.presentationEvents.some(e=>e.targetSide==='enemy'&&e.type==='poisonDamage'&&e.amount===1000));
});
test('queen-only damage over time caps preserve status and other enemy damage',()=>{
  for(const [statusId,amount] of [['poison',250],['deadly_poison',500],['death_poison',1000],['bleeding',500]]) {
    const b=setup();b.enemy.statuses=applyStatusApplications([],[{statusId,success:true,duration:20}]);
    const r=round(forced(b,LION_ACTIONS[3]));assert.equal(r.enemy.hp,100000-amount);assert.equal(r.enemy.statuses[0].id,statusId);
    b.enemy.id='ordinary';const other=round(forced(b,LION_ACTIONS[3]));assert.ok(other.enemy.hp<r.enemy.hp);
  }
});
test('eleven distinct owned cards qualify, but public gate stays sealed',()=>{
  const c=createInitialCharacter({name:'QA',job:'mage'});
  const cards=CARDS.filter(c=>c.rarity==='Z'&&c.id!=='zodiac_leo');assert.equal(cards.length,11);
  c.cards.ownedCardCounts=Object.fromEntries(cards.map(c=>[c.id,1]));c.cards.deckSlots=[];
  assert.equal(hasLeoQualification(c),true);assert.equal(getLeoDoorAccess(c).blocked,true);assert.equal(getLeoDoorAccess(c,true).blocked,false);
  delete c.cards.ownedCardCounts[cards[0].id];c.cards.ownedCardCounts.zodiac_leo=11;assert.equal(hasLeoQualification(c),false);
});
test('escape has no reward; retry resets state; victory flags and reward are one-time',()=>{
  const b=setup();b.enemy.hp=20000;b.enemy.lastLionAction='lion_judgment';b.enemy.reservedEnemyAction=LION_JUDGMENT;
  assert.equal(resolveEscapeAttempt({escapeRate:b.enemy.escapeRate,rng:()=>.999}).success,true);
  assert.equal(b.player.eventFlags?.boss_loewenkoenigin_b1f_defeated,undefined);
  const fresh=setup();assert.equal(fresh.enemy.hp,100000);assert.equal(fresh.enemy.reservedEnemyAction,undefined);assert.equal(fresh.enemy.image,LION_IMAGES[0]);
  const c=createInitialCharacter({name:'QA',job:'mage'});const v=applyBossVictory(c,ID);
  assert.equal(v.reward.cardId,'zodiac_leo');assert.equal(v.character.eventFlags.boss_loewenkoenigin_b1f_defeated,true);
  assert.equal(applyBossVictory(v.character,ID).reward,null);
  assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(v.character))).eventFlags.boss_loewenkoenigin_b1f_defeated,true);
});
test('intro waits five seconds on challenge, victory awaits reward then fades out',async()=>{
  const messages=[];let battles=0,closed=0,rewards=0,release;
  const h={say:m=>messages.push(m),close:()=>closed++,beginBossBattle:()=>battles++,isCurrent:()=>true,playLeoReward:()=>{rewards++;return new Promise(r=>release=r);}};
  const e=createLionIntro(1,1);handleLionInput(e,'confirm',h,0);handleLionInput(e,'confirm',h,100);
  updateLionEvent(e,5099,h);assert.equal(battles,0);updateLionEvent(e,5100,h);updateLionEvent(e,9999,h);assert.equal(battles,1);
  const v=createLionVictory(true);handleLionInput(v,'confirm',h,0);handleLionInput(v,'confirm',h,0);assert.equal(rewards,1);assert.equal(v.phase,'reward');
  release();await Promise.resolve();assert.equal(v.phase,'acquired');handleLionInput(v,'confirm',h,100);
  updateLionEvent(v,1600,h);assert.equal(v.phase,'gone');handleLionInput(v,'confirm',h,1700);assert.equal(closed,2);
});
