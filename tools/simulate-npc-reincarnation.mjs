import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {superbossCharacter,superbossCommand} from './simulate-goddess-superboss.mjs';
import {normalizeCharacter} from '../data/classes.js';
import {normalizeNpcSystem} from '../data/npc-party.js';
import {collectStats} from '../combat/collect-stats.js';
import {createEnemyCombatant,getEnemyById} from '../data/enemies.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {getItemCount} from '../data/inventory.js';
import {f2Random} from './simulate-special-map-f2.mjs';

const parties={solo:[],attack:['alec','rebecca','johan'],support:['alec','erika','johan']};
const rows=[];
for(const [party,ids] of Object.entries(parties))for(const target of ['wraith','amethyst_golem','rice','dusk','tender']){
 const slots=['libra','capricorn','taurus','pisces','sagittarius','cancer'].map(x=>'zodiac_'+x);
 let c=normalizeCharacter({...superbossCharacter(),cards:{ownedCardCounts:Object.fromEntries(slots.map(x=>[x,1])),deckSlots:slots},engravingStatBonuses:{},npcSystem:normalizeNpcSystem({registeredIds:ids,activeIds:ids,records:Object.fromEntries(ids.map(id=>[id,{maxDepth:100}]))})});
 const stats=collectStats(c);
 c.temporaryStatBonuses=Object.fromEntries(['str','int','agi','dex','luc','def'].map(k=>[k,90-stats[k]]));
 c.hp=c.maxHp;c.sp=c.maxSp;
 const runs=[];
 for(let seed=1;seed<=30;seed++){
  const enemy=['rice','dusk','tender'].includes(target)?createGoddessMapBoss({themeId:target,level:100}):getEnemyById(target);
  let b=createBattleState({character:structuredClone(c),enemy:createEnemyCombatant(enemy)}),turns=0;
  const rng=f2Random(seed);
  while(!b.outcome&&turns<500){
   const r=resolveBattleRound({battle:b,playerCommand:superbossCommand(b),rng});assert.ok(r.accepted,r.reason);b=r.battle;turns++;
  }
  runs.push({seed,outcome:b.outcome||'timeout',turns,items:30-getItemCount(b.player.inventory,'strong_healing_potion_large')});
 }
 const row={party,target,wins:runs.filter(r=>r.outcome==='victory').length,turns:runs.reduce((s,r)=>s+r.turns,0)/30,items:runs.reduce((s,r)=>s+r.items,0)/30,runs};rows.push(row);
 console.log(JSON.stringify({...row,runs:undefined}));
}
writeFileSync(process.env.NDA_REPORT||'artifacts/npc-reincarnation-after.json',JSON.stringify({conditions:'Warrior Lv197 reincarnation3; C deck; laboratory primary stats/DEF90; stage10 NPCs, charge0; no hacking device; 30 large potions; seeds1..30; normal enemies use current native stats; goddess Lv100; 500 turn cutoff',rows},null,2)+'\n');
