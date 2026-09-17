import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {getCardById} from '../data/cards.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {applyStatusApplications} from '../combat/status-lifecycle.js';
import {PISCES_STATUS} from '../combat/pisces.js';
import {magicBarrierAmount} from '../combat/aquarius.js';

const enemy = (id='dummy',hp=99999) => ({id,name:id,hp,maxHp:hp,attack:1,def:0,alive:true,statuses:[],stats:{str:1,int:1,agi:1,dex:1,luc:1},actions:[{weight:1,action:{id:'wait',actionType:'wait',speedModifier:-999}}]});
function setup(cards=[], options={}) {
  const c=createInitialCharacter({name:'QA',job:'mage'});
  c.hp=c.maxHp=100;c.sp=c.maxSp=1000;c.cards.deckSlots=cards;
  c.skillIds.push('fireball','poison_blade','flame_sweep','tunguska');
  Object.assign(c,options);
  return createBattleState({character:c,enemy:enemy()});
}
const round=(b,command={type:'attack'},rng=()=>.5)=>resolveBattleRound({battle:b,playerCommand:command,rng}).battle;
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
const costs=b=>b.presentationEvents.filter(e=>e.type==='leoHpCost');

test('Gemini duplicates every eligible cast at half damage with one SP and charge payment',()=>{
  const command={type:'skill',skillId:'fireball'};
  const plain=round(setup(),command);let b=setup(['zodiac_gemini']);
  for(let i=0;i<2;i++) {
    const before=b.player.sp;b=round(b,command);
    assert.equal(hits(b).length,2);assert.equal(hits(b)[1].damage,Math.floor(hits(plain)[0].damage*.5));
    assert.equal(before-b.player.sp,1000-plain.player.sp);
  }
  const first=round(setup(['zodiac_gemini']),command);
  assert.deepEqual(first.player.playerCharge,plain.player.playerCharge);
});
test('Gemini independently rolls poison and excludes charge, normal attacks and killed targets',()=>{
  let b=round(setup(['zodiac_gemini']),{type:'skill',skillId:'poison_blade'},()=>0);
  assert.equal(hits(b).length,2);assert.equal(b.log.filter(s=>s.includes('毒状態')).length,2);
  assert.equal(hits(round(setup(['zodiac_gemini']))).length,1);
  b=setup(['zodiac_gemini']);b.player.playerCharge.value=100;
  assert.equal(hits(round(b,{type:'skill',skillId:'tunguska'})).length,1);
  b=setup(['zodiac_gemini']);b.enemy.hp=1;
  assert.equal(hits(round(b,{type:'skill',skillId:'fireball'})).length,1);
});
test('Gemini copy does not inherit Aries opening boost and all-target copies skip dead enemies',()=>{
  const command={type:'skill',skillId:'fireball'};
  const ordinary=round(setup(),command);
  const b=round(setup(['zodiac_gemini','zodiac_aries']),command);
  assert.equal(hits(b)[0].damage,hits(ordinary)[0].damage*2);
  assert.equal(hits(b)[1].damage,Math.floor(hits(ordinary)[0].damage*.5));
  const c=setup(['zodiac_gemini']).player;const enemies=[enemy('one',1),enemy('two')];
  const multi=round(createBattleState({character:c,enemy:enemies[0],enemies}),{type:'skill',skillId:'flame_sweep'});
  assert.equal(hits(multi).filter(e=>e.targetIndex===0).length,1);
  assert.equal(hits(multi).filter(e=>e.targetIndex===1).length,2);
});
test('Leo doubles normal attacks, triples at 25%, pays rounded snapshot HP only once',()=>{
  const plain=hits(round(setup()))[0].damage;
  for(const [hp,multiplier,after] of [[100,2,90],[26,2,23],[25,3,22],[12,3,10],[1,3,1]]) {
    const b=round(setup(['zodiac_leo'],{hp}));
    assert.equal(hits(b)[0].damage,plain*multiplier);assert.equal(b.player.hp,after);
    assert.equal(costs(b).length,hp===1?0:1);
  }
});
test('Leo multi-hit and automatic weapon repeat pay only once',()=>{
  for(const weapon of ['the_five_star','katzbalger']) {
    const b=setup(['zodiac_leo'],{hp:20});b.player.equipment.weaponId=weapon;b.player.equipment.rightArmId=weapon;
    const result=round(b);assert.ok(hits(result).length>1);assert.equal(costs(result).length,1);assert.equal(costs(result)[0].amount,2);
  }
});
test('Leo costs HP on misses and out-of-range; never on skills, skipped or invalid commands',()=>{
  assert.equal(round(setup(['zodiac_leo']),{type:'attack'},()=>.999).player.hp,90);
  let b=setup(['zodiac_leo']);b.enemy.distantTarget=true;
  const distant=round(b);assert.equal(distant.player.hp,90);assert.equal(hits(distant).length,0);
  assert.equal(costs(round(setup(['zodiac_leo']),{type:'skill',skillId:'fireball'})).length,0);
  b=setup(['zodiac_leo']);b.player.statuses=applyStatusApplications([],[{statusId:'action_skip',success:true}]);assert.equal(round(b).player.hp,100);
  assert.equal(resolveBattleRound({battle:setup(['zodiac_leo']),playerCommand:{type:'skill',skillId:'missing'}}).accepted,false);
});
test('Leo HP cost bypasses Aquarius and Pisces invincibility but cannot cause death',()=>{
  const b=setup(['zodiac_leo','zodiac_aquarius','zodiac_pisces']);
  b.player.statuses.push({id:PISCES_STATUS,active:true});
  const after=round(b);assert.equal(after.player.hp,90);assert.equal(magicBarrierAmount(after.player),1000);
  assert.ok(!after.log.some(s=>s.includes('双魚の加護')));
  assert.equal(round(setup(['zodiac_leo','zodiac_pisces'],{hp:1})).player.hp,1);
});
test('Leo snapshot is fresh after healing, applies with Aries, and does not persist into another battle',()=>{
  let b=setup(['zodiac_leo'],{hp:26});b=round(b);assert.equal(b.player.hp,23);
  const low=round(b);assert.ok(low.log.includes('♌ 獅子王！'));
  b.player.hp=100;const high=round(b);assert.ok(!high.log.includes('♌ 獅子王！'));
  const ordinary=hits(round(setup()))[0].damage;
  assert.equal(hits(round(setup(['zodiac_leo','zodiac_aries'])))[0].damage,ordinary*4);
  assert.equal(setup().leoActiveAtStart,false);
});
test('card IDs, rarity, cost and copy limits remain unchanged',()=>{
  for(const id of ['zodiac_gemini','zodiac_leo']) {const c=getCardById(id);assert.equal(c.cost,8);assert.equal(c.rarity,'Z');assert.equal(c.maxOwned,1);assert.equal(c.maxCopies,1);assert.equal(c.acquisition,undefined);}
});
