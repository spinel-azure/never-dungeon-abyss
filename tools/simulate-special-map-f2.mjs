import {pathToFileURL} from 'node:url';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {createEnemyCombatant} from '../data/enemies.js';
import {getV2CombatEnemy} from '../data/special-map-enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';

export function f2Character(id,job='warrior') {
 const c=id==='silberkaefer'
  ?normalizeCharacter({...createInitialCharacter({name:'F2試験',job}),level:10})
  :createPacingCharacter({job,level:60,band:'B60',withNpcs:false});
 c.hp=c.maxHp;c.sp=c.maxSp;return c;
}
export function f2Random(seed){let n=seed;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function simulateF2(id,job,seed){
 let battle=createBattleState({character:f2Character(id,job),enemy:createEnemyCombatant(getV2CombatEnemy(id))}),turns=0;
 const rng=f2Random(seed);
 while(!battle.outcome&&turns<60){
  const command=job==='mage'&&battle.player.sp>=3?{type:'skill',skillId:'fireball'}:{type:'attack'};
  const result=resolveBattleRound({battle,playerCommand:command,rng});
  if(!result.accepted)throw Error(result.reason);
  battle=result.battle;turns++;
 }
 return {outcome:battle.outcome||'timeout',turns,hp:battle.player.hp,battle};
}
export function pacingReport(){
 const rows=[];
 for(const id of ['silberkaefer','maikaefer_koenig'])for(const job of ['warrior','thief','priest','mage']){
  const runs=Array.from({length:100},(_,i)=>simulateF2(id,job,i+1));
  rows.push({id,job,trials:runs.length,victories:runs.filter(r=>r.outcome==='victory').length,
   playerFixture:id==='silberkaefer'?'Lv10 initial equipment, no allocated stat points/cards/NPC':'Lv60 B60 pacing equipment +3, standard cards, no NPC',
   strategy:job==='mage'?'fireball while SP >=3, then attack':'normal attack',
   averageTurns:runs.reduce((n,r)=>n+r.turns,0)/runs.length,maxTurns:Math.max(...runs.map(r=>r.turns))});
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(pacingReport(),null,2));
