import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {normalizeNpcSystem,getNpcHireFee} from '../data/npc-party.js';
import {createBattleState} from '../combat/battle-engine.js';
import {applyNpcAfterPlayerAttack,applyNpcBattleStart,applyNpcTurnStart,applyNpcTurnEnd,applyNpcChargeSkills,applyNpcGuardSupport,getNpcSupportStatus,getNpcReincarnationPower} from '../combat/npc-support.js';

function hero(npc,reincarnationCount){
 return {...createInitialCharacter({name:'NPC',job:'warrior'}),level:197,reincarnationCount,
  npcSystem:normalizeNpcSystem({registeredIds:[npc],activeIds:[npc],records:{[npc]:{maxDepth:100}}})};
}
function battle(npc,count,extra={}){
 return createBattleState({character:hero(npc,count),enemy:{id:'dummy',name:'Dummy',hp:100000,maxHp:100000,attack:1,def:999,agi:1,alive:true,statuses:[],...extra}});
}
const fixed=()=>0.5;
test('NPC physical support follows reincarnation and status display even against high DEF',()=>{
 for(const [count,damage,hit] of [[0,38,19],[1,115,57],[2,231,114],[3,386,190]]){
  const a=battle('alec',count),r=battle('rebecca',count);
  applyNpcAfterPlayerAttack(a,fixed);assert.equal(100000-a.enemy.hp,damage);
  assert.equal(getNpcSupportStatus(a.player,'alec').rows[0][1],String(damage));
  const before=r.enemy.hp;applyNpcTurnStart(r,fixed);assert.equal(before-r.enemy.hp,hit*2);
  assert.equal(getNpcSupportStatus(r.player,'rebecca').rows[0][1],`${hit}×2`);
  assert.equal(getNpcHireFee(hero('alec',count),'alec'),10835);
 }
});
test('offensive charge, opening attack and magic scale; distant immunity remains',()=>{
 const a=battle('alec',3);a.player.npcSystem.records.alec.charge=100;
 applyNpcChargeSkills(a,fixed);assert.equal(100000-a.enemy.hp,772);
 const r=battle('rebecca',3);applyNpcBattleStart(r,fixed);assert.equal(100000-r.enemy.hp,190);
 r.player.npcSystem.records.rebecca.charge=100;
 applyNpcChargeSkills(r,fixed);assert.equal(100000-r.enemy.hp,190+213*4);
 const j0=battle('johan',0),j3=battle('johan',3);
 applyNpcTurnStart(j0,fixed);applyNpcTurnStart(j3,fixed);
 assert.ok(100000-j3.enemy.hp>9*(100000-j0.enemy.hp));
 const far=battle('alec',3,{distantTarget:true});applyNpcAfterPlayerAttack(far,fixed);assert.equal(far.enemy.hp,100000);
 const e=battle('erika',3);e.player.npcSystem.records.erika.charge=100;
 applyNpcChargeSkills(e,fixed);assert.equal(100000-e.enemy.hp,480);
 const undead=battle('erika',3,{race:'undead',isBoss:true});undead.player.npcSystem.records.erika.charge=100;
 applyNpcChargeSkills(undead,fixed);assert.equal(100000-undead.enemy.hp,1440);
});
test('percentage healing and physical protection are unchanged across reincarnations',()=>{
 const values=[];
 for(let n=0;n<=3;n++){
  const e=battle('erika',n);e.player.maxHp=10000;e.player.hp=6000;
  applyNpcTurnEnd(e,fixed);assert.equal(e.player.hp,7400);
  const a=battle('alec',n);applyNpcGuardSupport(a);values.push(a.player.statuses.at(-1).physicalDamageReduction);
 }
 assert.deepEqual(values,[.35,.35,.35,.35]);
 assert.equal(getNpcReincarnationPower({}),1);
 assert.equal(getNpcReincarnationPower({reincarnationCount:99}),10);
});
test('saved battle reload does not compound power and suppressed support stays disabled',()=>{
 let a=battle('alec',3);applyNpcAfterPlayerAttack(a,fixed);
 a=JSON.parse(JSON.stringify(a));applyNpcAfterPlayerAttack(a,fixed);
 assert.equal(100000-a.enemy.hp,386*2);
 a.npcSupportSuppressed=true;applyNpcAfterPlayerAttack(a,fixed);
 assert.equal(100000-a.enemy.hp,386*2);
});
