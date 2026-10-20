// Reproducible laboratory comparison; does not modify game balance or saves.
import {grantKeyItem} from '../data/key-items.js';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {superbossCharacter,superbossCommand,summarizeSuperbossRuns} from './simulate-goddess-superboss.mjs';
import {normalizeCharacter} from '../data/classes.js';
import {collectStats} from '../combat/collect-stats.js';
import {getItemCount} from '../data/inventory.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {f2Random} from './simulate-special-map-f2.mjs';
const hackingDevice=process.env.NDA_HACKING_DEVICE==='1';
const reincarnationCount=Number(process.env.NDA_REINCARNATION ?? 3);
assert.ok(Number.isInteger(reincarnationCount)&&reincarnationCount>=0&&reincarnationCount<=3);
const statCap=[30,50,70,90][reincarnationCount],defenseCap=[60,70,80,90][reincarnationCount];
const common=['libra','capricorn','taurus','pisces'];
const decks={A:[...common,'sagittarius','leo'],B:[...common,'cancer','leo'],C:[...common,'sagittarius','cancer']};
function deckCharacter(id){
 const slots=decks[id].map(x=>'zodiac_'+x);
 let c=normalizeCharacter({...superbossCharacter(),reincarnationCount,cards:{ownedCardCounts:Object.fromEntries(slots.map(x=>[x,1])),deckSlots:slots},engravingStatBonuses:{}});
 const s=collectStats(c);
 // Laboratory stats at each reincarnation cap, including DEF; no HP/SP override.
 c.temporaryStatBonuses=Object.fromEntries(['str','int','agi','dex','luc','def'].map(k=>[k,(k==='def'?defenseCap:statCap)-s[k]]));
 if(hackingDevice)c.keyItems=grantKeyItem(c.keyItems,'hacking_device').keyItems;
 c.hp=c.maxHp;c.sp=c.maxSp;
 for(const k of ['str','int','agi','dex','luc','def'])assert.equal(collectStats(c)[k],k==='def'?defenseCap:statCap);
 assert.equal(getItemCount(c.inventory,'strong_healing_potion_large'),30);
 assert.equal(c.playerCharge.value,0);return c;
}
export function superbossTrial({theme,job='warrior',variant='A',withNpcs=false,aware=true,seed=1,coefficient,defense90=false}={}){
 const c=deckCharacter(variant),enemy=createGoddessMapBoss({themeId:theme,level:100});
 if(coefficient!=null)enemy.goddessOffenseMultiplier=coefficient;
 // Explicit laboratory-only sensitivity scenario, never a claimed legal equipment build.
 if(defense90)c.temporaryStatBonuses={def:90-collectStats(c).def};
 let b=createBattleState({character:c,enemy:createEnemyCombatant(enemy)});const rng=f2Random(seed);
 const row={outcome:'timeout',turns:0,damageDealt:0,damageReceived:0,attackHits:0,heals:0,attacks:0,guards:0,items:0,maxHit:0,bossHealing:0,barrierAbsorbed:0,revival:0,eclipses:0,eclipseGuards:0,interrupts:0,leoSelfDamage:0,deathCause:'',interruptionDamage:[]};
 while(!b.outcome&&row.turns<500){
  const command=superbossCommand(b,aware);row.turns++;row[command.type==='guard'?'guards':command.type==='item'?'heals':'attacks']++;
  const result=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(result.accepted,result.reason);b=result.battle;
  for(const e of b.presentationEvents||[]){
   if(e.type==='attackHit'&&e.actorSide==='player'&&e.targetSide==='enemy'){row.damageDealt+=e.actualHpLoss||0;row.attackHits++;}
   if(e.type==='attackHit'&&e.targetSide==='player')row.damageReceived+=e.actualHpLoss||0;
   if(e.type==='attackHit'&&e.targetSide==='player'){row.maxHit=Math.max(row.maxHit,e.damage||0);if(e.actualHpLoss>0)row.deathCause=e.actionName;}
   if(e.type==='leoHpCost')row.leoSelfDamage+=e.amount||0;
   if(e.type==='healing'&&e.targetSide==='enemy')row[e.goddessRevival?'revival':'bossHealing']+=e.amount||0;
   if(e.type==='bossMagicBarrier'&&e.absorbed)row.barrierAbsorbed+=e.amount||0;
   if(e.type==='attackHit'&&e.actionName==='月蝕'){row.eclipses++;if(command.type==='guard')row.eclipseGuards++;}
   if(e.goddessHealInterrupted)row.interrupts++;
   if(e.goddessHealResolved)row.interruptionDamage.push(e.interruptionDamage||0);
  }
 }
 row.outcome=b.outcome||'timeout';row.items=30-getItemCount(b.player.inventory,'strong_healing_potion_large');
 row.playerHp=b.player.hp;row.bossHp=b.enemy.hp;row.runtime=b.enemy.goddessRuntime;row.piscesUsed=b.piscesUsed;row.suppliesExhausted=getItemCount(b.player.inventory,'strong_healing_potion_large')===0;
 if(row.outcome!=='defeat')row.deathCause='';return row;
}

const rows=[];const trials=30;
for(const variant of Object.keys(decks))for(const theme of ['rice','dusk','tender']){
 const runs=Array.from({length:trials},(_,i)=>superbossTrial({variant,theme,seed:i+1}));
 const mean=k=>+(runs.reduce((s,r)=>s+r[k],0)/trials).toFixed(1);
 const row={variant,theme,wins:runs.filter(r=>r.outcome==='victory').length,defeats:runs.filter(r=>r.outcome==='defeat').length,timeouts:runs.filter(r=>r.outcome==='timeout').length,meanTurns:mean('turns'),meanItems:mean('items'),meanAttacks:mean('attacks'),meanGuards:mean('guards'),meanDamageDealt:mean('damageDealt'),meanDamageReceived:mean('damageReceived'),summary:summarizeSuperbossRuns(runs),runs};rows.push(row);
 console.log(JSON.stringify({variant,theme,wins:row.wins,defeats:row.defeats,timeouts:row.timeouts,turns:row.meanTurns,items:row.meanItems,maxHit:row.summary.maxSingleHit}));
}
const characters=Object.keys(decks).map(id=>{const c=deckCharacter(id);return {id,deck:c.cards.deckSlots,hp:c.maxHp,sp:c.maxSp,stats:collectStats(c),equipment:c.equipment,skillIds:c.skillIds,inventory:c.inventory};});
writeFileSync(process.env.NDA_REPORT || (hackingDevice?`artifacts/goddess-z-deck-hacking-device-${reincarnationCount}.json`:reincarnationCount===3?'artifacts/goddess-z-deck-comparison.json':`artifacts/goddess-z-deck-reincarnation-${reincarnationCount}.json`),JSON.stringify({hackingDevice,trials,reincarnationCount,statCap,defenseCap,characters,conditions:`Warrior Lv197 reincarnation${reincarnationCount}; laboratory STR/INT/AGI/DEX/LUC${statCap}/DEF${defenseCap}; Katzbalger, amethyst+3, masters necklace; no NPC; factory enemy stats/cap${statCap}/coefficient10; charge0; 30 strong_healing_potion_large, no refills; 500-round cutoff; guard forecast, heal below60% (35% during interruption), learned charge/ultimate skills, Leo normal attacks; seeds1..30; HP/SP generated normally; no browser timing measurement`,rows},null,2)+'\n');
console.log(JSON.stringify(characters.map(c=>({id:c.id,hp:c.hp,sp:c.sp,skills:c.skillIds}))));
