import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {getSkill} from '../data/skills.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {applyStatus} from '../combat/status-lifecycle.js';

function setup(multi=false, action={actionType:'wait',name:'待機',speedModifier:999}) {
  const c=createInitialCharacter({name:'QA',job:'mage'});
  c.sp=c.maxSp=100;c.hp=c.maxHp=1000;c.skillIds.push('fireball','walpurgisnacht','maximal_triage');
  const e={id:'dummy',name:'DUMMY',hp:99999,maxHp:99999,str:1,int:1,agi:999,dex:1,luc:1,def:0,attack:1,alive:true,statuses:[],actions:[{weight:1,action}]};
  return createBattleState({character:c,enemy:e,...(multi?{enemies:[e,{...e,id:'second'}]}:{})});
}
function cast(b,skillId='fireball') {
  const r=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId},rng:()=>.5});
  assert.equal(r.accepted,true,r.reason);return r.battle;
}
for(const multi of [false,true]) {
  test(`SP is paid at activation after enemy actions (${multi?'party':'single'})`,()=>{
    const b=setup(multi,{actionType:'spDrain',name:'吸収',spDamage:10,speedModifier:999});
    const r=cast(b);
    const activation=r.presentationEvents.findIndex(e=>e.type==='skillActivation');
    const drains=r.presentationEvents.filter(e=>e.type==='spDamage');
    assert.equal(drains.length,multi?2:1);
    assert.ok(activation>r.presentationEvents.findIndex(e=>e.type==='spDamage'));
    assert.equal(r.presentationEvents[activation].playerSp,100-drains.length*10-getSkill('fireball').spCost);
    assert.equal(r.player.sp,r.presentationEvents[activation].playerSp);
    assert.equal(r.presentationEvents.filter(e=>e.type==='skillActivation').length,1);
  });
  test(`insufficient SP after drain cancels the cast without debt (${multi})`,()=>{
    const b=setup(multi,{actionType:'spDrain',name:'吸収',spDamage:100,speedModifier:999});
    const r=cast(b);
    assert.equal(r.player.sp,0);
    assert.ok(r.presentationEvents.some(e=>e.type==='skillUnavailable'));
    assert.ok(!r.presentationEvents.some(e=>e.type==='skillActivation'||e.actorSide==='player'&&e.hit));
    assert.equal(r.enemy.hp,b.enemy.hp);
  });
  test(`skipped and fatal actions do not spend selected skill SP (${multi})`,()=>{
    const b=setup(multi);b.player.statuses=applyStatus([],{statusId:'action_skip',success:true});
    const r=cast(b);assert.equal(r.player.sp,100);
    assert.ok(!r.presentationEvents.some(e=>e.type==='skillActivation'));
    const fatal=setup(multi,{actionType:'physicalAttack',name:'致命打',powerMultiplier:99999,unavoidable:true,speedModifier:999});
    fatal.player.hp=1;
    const dead=cast(fatal);assert.equal(dead.outcome,'defeat');assert.equal(dead.player.sp,100);
  });
  test(`priority healing spends once before its healing event (${multi})`,()=>{
    const b=setup(multi);b.player.hp=1;
    const r=cast(b,'maximal_triage');
    assert.equal(r.presentationEvents[0].type,'skillActivation');
    assert.equal(r.presentationEvents[1].type,'healing');
    assert.equal(r.player.sp,50);
  });
}
test('all-target Gemini repeat pays only once for the original cast',()=>{
  const b=setup(true);b.geminiActiveAtStart=true;
  const r=cast(b,'walpurgisnacht');
  assert.equal(r.presentationEvents.filter(e=>e.type==='skillActivation').length,1);
  assert.equal(r.player.sp,45);
  assert.equal(r.presentationEvents.filter(e=>e.actorSide==='player'&&e.hit).length,4);
});
