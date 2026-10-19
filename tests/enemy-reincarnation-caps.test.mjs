import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {collectStats} from '../combat/collect-stats.js';
import {createBattleState,resolveBattleRound,synchronizeEnemyStatCaps} from '../combat/battle-engine.js';
const keys=['str','int','agi','dex','luc'];
const enemy=()=>({id:'test',name:'test',hp:100000,maxHp:100000,def:140,attack:1,stats:Object.fromEntries(keys.map(k=>[k,120])),actions:[{type:'wait',weight:100}]});
for(const [count,cap] of [0,1,2,3].map((n)=>[n,30+n*20])) {
 test(`enemy cap ${cap}: single, party and serialized resume`,()=>{
  const character={...createInitialCharacter({name:'test',job:'warrior'}),reincarnationCount:count};
  const original=enemy();
  for(const party of [false,true]) {
   const battle=createBattleState({character,enemy:original,...(party?{enemies:[original,enemy()]}:{})});
   for(const e of battle.enemies||[battle.enemy]) {
    for(const k of keys) assert.equal(collectStats(e)[k],cap);
    assert.equal(collectStats(e).def,140);
    assert.equal(e.hp,100000);
   }
   const saved=JSON.parse(JSON.stringify(battle));
   for(const e of [saved.enemy,...(saved.enemies||[])]) delete e.enemyPlayerReincarnationCount;
   const resolved=resolveBattleRound({battle:saved,playerCommand:{type:'guard'},rng:()=>0.5});
   assert.equal(resolved.accepted,true);
   for(const e of resolved.battle.enemies||[resolved.battle.enemy]) assert.equal(collectStats(e).str,cap);
   assert.equal(saved.enemy.enemyPlayerReincarnationCount,undefined);
  }
  assert.equal(original.enemyPlayerReincarnationCount,undefined);
 });
}
test('cap does not raise low stats, alter player caps or transfer reincarnation damage bonuses',()=>{
 const e=enemy(); e.stats.str=12;
 const player={job:'warrior',reincarnationCount:3,stats:e.stats,def:200};
 synchronizeEnemyStatCaps({player,enemy:e});
 assert.equal(collectStats(e).str,12);
 assert.equal(collectStats(e).int,90);
 assert.equal(e.reincarnationCount,undefined);
 assert.equal(collectStats(player).def,90);
 assert.equal(collectStats(enemy()).int,30);
});
