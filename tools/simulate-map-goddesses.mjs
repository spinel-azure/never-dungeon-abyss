import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {bossTestCommand} from './simulate-map-bosses.mjs';
import {f2Random} from './simulate-special-map-f2.mjs';
import {normalizeCharacter} from '../data/classes.js';
import {calculateDeckCost} from '../data/deck.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';
const decks={warrior:['sagittarius','leo','libra','capricorn','scorpio','taurus'],thief:['sagittarius','gemini','libra','capricorn','scorpio','pisces'],mage:['sagittarius','gemini','libra','capricorn','scorpio','virgo'],priest:['sagittarius','gemini','libra','capricorn','scorpio','taurus']};
export function goddessCharacter(job,level,variant,withNpcs=true){
 let c=createPacingCharacter({job,level:variant.startsWith('z6')?200:level,band:'B90',withNpcs});
 let slots=['legendary_mana_barrier','legendary_return_favor','sr_ability_boost','sr_ability_boost'];
 if(variant.startsWith('z6'))slots=decks[job].map(id=>'zodiac_'+(variant==='z6-no-scorpio'&&id==='scorpio'?(job==='thief'?'taurus':'pisces'):id));
 else if(variant==='standard-scorpio')slots=[...slots.slice(0,3),'zodiac_scorpio'];
 c=normalizeCharacter({...c,cards:{ownedCardCounts:slots.reduce((o,id)=>(o[id]=(o[id]||0)+1,o),{}),deckSlots:slots}});
 assert.deepEqual(c.cards.deckSlots.filter(Boolean),slots.filter(Boolean));assert.ok(calculateDeckCost(slots)<=c.deckCost);
 c.inventory=grantItem(c.inventory,'strong_healing_potion_small',20).inventory;c.hp=c.maxHp;c.sp=c.maxSp;return c;
}
export function runGoddess({theme,level,job,variant,seed=1,withNpcs=true}){
 const c=goddessCharacter(job,level,variant,withNpcs);
 let b=createBattleState({character:c,enemy:createEnemyCombatant(createGoddessMapBoss({themeId:theme,level}))});
 const rng=f2Random(seed);let turns=0,heals=0,bossHealing=0,bossBarrier=0,deathPoisonDamage=0,playerDamage=0;
 const phaseDamage={before:[],after:[]};let poisonTurns=0,oneShotHits=0;
 while(!b.outcome&&turns<220){
  let command=bossTestCommand(b,{ultimates:true});
  if(b.player.hp<b.player.maxHp*.65&&getItemCount(b.player.inventory,'strong_healing_potion_small')>0)command={type:'item',itemId:'strong_healing_potion_small'};
  if(b.player.cards.deckSlots.includes('zodiac_leo')&&command.type!=='item'&&!isPlayerChargeReady(b.player))command={type:'attack'};
  if(b.enemy.reservedEnemyAction&&command.type!=='item')command={type:'guard'};
  if(command.type==='item')heals++;
  const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(r.accepted,r.reason);b=r.battle;turns++;
  if(b.enemy.statuses.some(s=>(s.id||s.statusId)==='death_poison'))poisonTurns++;
  for(const e of b.presentationEvents||[]){
   if(e.type==='healing'&&e.targetSide==='enemy'&&!e.goddessRevival)bossHealing+=e.amount||0;
   if(e.goddessBarrierCreated)bossBarrier+=e.goddessBarrierCreated;
   if(e.type==='poisonDamage'&&e.targetSide==='enemy'&&e.message?.includes('死毒'))deathPoisonDamage+=e.amount||0;
   if(e.type==='attackHit'&&e.targetSide==='player'){playerDamage+=e.actualHpLoss||0;if((e.damage||0)>=b.player.maxHp)oneShotHits++;phaseDamage[b.enemy.goddessRuntime?.phase?'after':'before'].push(e.actualHpLoss||0);}
  }
 }
 return {outcome:b.outcome||'timeout',turns,heals,bossHealing,bossBarrier,deathPoisonDamage,poisonTurns,playerDamage,playerHp:b.player.hp,bossHp:b.enemy.hp,
  oneShotHits,statusMetrics:b.enemy.goddessRuntime?.statusMetrics||{},postReviveTurns:b.enemy.goddessRuntime?.reviveTurn?turns-b.enemy.goddessRuntime.reviveTurn:0,reviveTurn:b.enemy.goddessRuntime?.reviveTurn||0,growth:b.enemy.goddessRuntime?.growth||0,phaseDamage};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=[],trials=Number(process.env.NDA_TRIALS||10);
 for(const theme of ['rice','dusk','tender'])for(const level of [80,90,100])for(const job of Object.keys(decks))for(const variant of ['standard','standard-scorpio','z6','z6-no-scorpio']){
  const runs=Array.from({length:trials},(_,i)=>runGoddess({theme,level,job,variant,seed:i+1}));
  const statusMetrics={};for(const run of runs)for(const [key,m] of Object.entries(run.statusMetrics)){const t=statusMetrics[key] ||= {attempts:0,successes:0};t.attempts+=m.attempts;t.successes+=m.successes;}
  const phaseDamage=Object.fromEntries(['before','after'].map(key=>{const values=runs.flatMap(r=>r.phaseDamage[key]);return [key,{hits:values.length,mean:values.length?values.reduce((s,n)=>s+n,0)/values.length:0}];}));
  const avg=k=>Number((runs.reduce((s,r)=>s+r[k],0)/trials).toFixed(2));
  rows.push({theme,level,job,variant,trials,statusMetrics,phaseDamage,wins:runs.filter(r=>r.outcome==='victory').length,timeouts:runs.filter(r=>r.outcome==='timeout').length,
   meanTurns:avg('turns'),medianTurns:(()=>{const a=runs.map(r=>r.turns).sort((a,b)=>a-b);return (a[Math.floor((trials-1)/2)]+a[Math.floor(trials/2)])/2;})(),maxTurns:Math.max(...runs.map(r=>r.turns)),
   ...Object.fromEntries(['heals','bossHealing','bossBarrier','deathPoisonDamage','poisonTurns','playerDamage','playerHp','bossHp','reviveTurn','postReviveTurns','growth','oneShotHits'].map(k=>[k,avg(k)]))});
  console.log(theme,level,job,variant,rows.at(-1).wins,rows.at(-1).meanTurns);
 }
 writeFileSync(process.env.NDA_REPORT||'artifacts/special-map-goddess-pacing.json',JSON.stringify({candidate:1,trials,npcs:'Alec Rebecca Erika stage9; 40 healing potions; B90 gear+3; standard player level = map level; Z6 player level200',rows},null,2)+'\n');
}
