import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, getSkill } from '../data/skills.js';
import { getEffectiveSpCost } from '../combat/sp-cost.js';
import { preparePlayerSkillDamage } from '../combat/player-skill-scaling.js';
import { createInitialCharacter, normalizeCharacter } from '../data/classes.js';
import { createBattleState, resolveBattleRound } from '../combat/battle-engine.js';

test('only paid offensive skills scale SP; support, healing, charge and ultimate costs stay fixed',()=>{
 for(let n=0;n<=3;n++)for(const s of Object.values(SKILLS)){
  const eligible=['physicalAttack','spell'].includes(s.actionType)&&s.spCost>0&&!s.chargeSkill&&!s.ultimateChargeSkill;
  assert.equal(getEffectiveSpCost(s,{reincarnationCount:n}),Math.max(0,s.spCost||0)*(eligible?n+1:1),s.id);
 }
});
test('damage coefficients and priest formulas match approved progression without mutating definitions',()=>{
 for(let n=0;n<=3;n++){
  const c={level:197,reincarnationCount:n};
  const fire=getSkill('fireball'),strike=getSkill('holy_strike'),light=getSkill('holy_light');
  assert.equal(preparePlayerSkillDamage(fire,c).powerMultiplier,(fire.powerMultiplier??1)*[1,1.25,1.5,1.75][n]);
  assert.equal(preparePlayerSkillDamage(light,c).intelligenceMultiplier,[1.5,2,2.5,3][n]);
  assert.equal(preparePlayerSkillDamage(strike,c).powerPerHit,(1+.005*(196+196*n))*[1,1.25,1.5,1.75][n]);
  assert.equal(preparePlayerSkillDamage(strike,{level:1,reincarnationCount:n}).powerPerHit,(1+.98*n)*[1,1.25,1.5,1.75][n]);
  for(const id of ['healing_prayer','greater_healing','maximal_triage','tunguska','apocalypse','falcon_schnitt','guardian_prayer']){
   const s=getSkill(id);assert.equal(preparePlayerSkillDamage(s,c),s,id);
  }
 }
 const normal={id:'normal_attack',actionType:'physicalAttack'};
 assert.equal(preparePlayerSkillDamage(normal,{reincarnationCount:3}),normal);
 assert.equal(getSkill('holy_light').intelligenceMultiplier,undefined);
 assert.equal(getSkill('holy_strike').powerPerHit,1);
});
test('cost scaling precedes equipment reductions and preserves free casting',()=>{
 const skill=getSkill('fireball');
 assert.equal(getEffectiveSpCost(skill,{reincarnationCount:3,spCostMultiplier:.7,spCostReduction:2}),7);
 assert.equal(getEffectiveSpCost(skill,{reincarnationCount:3,statuses:[{id:'charge_mana_spring'}]}),0);
 assert.equal(getEffectiveSpCost(getSkill('holy_light'),{reincarnationCount:3,statuses:[{id:'charge_mana_spring'}]}),48);
 assert.equal(getEffectiveSpCost(getSkill('holy_light'),{reincarnationCount:3,statuses:[{id:'aquarius_magic_barrier',amount:1}]}),0);
});
function character(n=3,gemini=false){
 const c=normalizeCharacter({...createInitialCharacter({name:'Skill QA',job:'mage'}),level:100,reincarnationCount:n,
  ...(gemini?{cards:{ownedCardCounts:{zodiac_gemini:1},deckSlots:['zodiac_gemini']}}:{})});
 c.hp=c.maxHp;c.sp=c.maxSp;return c;
}
function dummy(id='dummy'){return {id,name:id,hp:100000,maxHp:100000,stats:{str:1,int:5,agi:1,dex:1,luc:1},def:0,attack:1,statuses:[],alive:true,actions:[{weight:1,action:{id:'wait',actionType:'wait'}}]};}
function round(c,cmd,enemy=dummy(),enemies=null){
 const b=createBattleState({character:c,enemy,enemies});
 const r=resolveBattleRound({battle:b,playerCommand:cmd,rng:()=>.5});assert.ok(r.accepted,r.reason);return r.battle;
}
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
test('Gemini copies get one power multiplier and cost is paid once',()=>{
 const c=character(),g=character(3,true),cmd={type:'skill',skillId:'fireball'};
 const a=round(c,cmd),b=round(g,cmd);
 assert.equal(c.sp-a.player.sp,12);assert.equal(g.sp-b.player.sp,12);
 assert.equal(hits(b).length,2);assert.equal(hits(b)[0].damage,hits(a)[0].damage);
 assert.ok(Math.abs(hits(b)[1].damage-hits(a)[0].damage*.5)<=1);
});
test('all-target attacks pay once while each target receives the same scaled hit',()=>{
 const c=character();const b=round(c,{type:'skill',skillId:'flame_sweep'},dummy(),[dummy('a'),dummy('b')]);
 assert.equal(c.sp-b.player.sp,32);assert.equal(hits(b).length,2);assert.equal(hits(b)[0].damage,hits(b)[1].damage);
});
test('enemy spell with a player skill ID is not given player scaling',()=>{
 const enemy=dummy();enemy.actions=[{weight:1,action:{...getSkill('fireball')}}];
 const a=round(character(0),{type:'wait'},enemy),b=round(character(3),{type:'wait'},enemy);
 const damage=x=>x.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='enemy').map(e=>e.damage);
 assert.ok(damage(a).length);assert.deepEqual(damage(a),damage(b));
});
