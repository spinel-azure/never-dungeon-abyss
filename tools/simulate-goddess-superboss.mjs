import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {normalizeCharacter} from '../data/classes.js';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {collectStats} from '../combat/collect-stats.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {bossTestCommand} from './simulate-map-bosses.mjs';
import {f2Random} from './simulate-special-map-f2.mjs';
import {isPlayerChargeReady} from '../combat/player-charge.js';

export function superbossCharacter(job='warrior',variant='base',withNpcs=false){
 let c=createPacingCharacter({job,level:197,band:'B90',withNpcs});
 const slots=['sagittarius','libra','leo','capricorn','taurus','pisces'].map(id=>'zodiac_'+id);
 if(variant==='scorpio')slots[4]='zodiac_scorpio';
 if(variant==='cancer')slots[4]='zodiac_cancer';
 if(variant==='no-libra')slots[1]='zodiac_virgo';
 c=normalizeCharacter({...c,reincarnationCount:3,cards:{ownedCardCounts:Object.fromEntries(slots.map(id=>[id,1])),deckSlots:slots},inventory:{counts:{}},playerCharge:{value:0,cooldown:0}});
 if(job==='warrior')for(const [id,slot] of [['katzbalger','rightArmId'],['amethyst_aegis','leftArmId']]){
  const g=grantEquipmentInstance(c,id,slot,{enhancement:3});assert.ok(g.accepted);
  const e=equipInstance(g.character,slot,g.instance.instanceId);assert.ok(e.accepted);c=e.character;
 }
 // Actual engraving bonuses, within the permanent base-stat cap. No HP/DEF overrides.
 c=normalizeCharacter(c);
 const stats=collectStats(c);
 c=normalizeCharacter({...c,engravingStatBonuses:Object.fromEntries(['str','int','agi','dex','luc'].map(k=>[k,Math.max(0,90-stats[k])]))});
 c.inventory=grantItem(c.inventory,'strong_healing_potion_large',30).inventory;
 c.hp=c.maxHp;c.sp=c.maxSp;return c;
}
export function superbossCommand(b,aware=true){
 const r=b.enemy.goddessRuntime||{};
 if(aware&&(b.enemy.reservedEnemyAction||b.enemy.goddessTheme==='dusk'&&r.moon===3))return {type:'guard'};
 const healingThreshold=aware&&r.healPreparation?.remaining>0?.35:.60;
 if(b.player.hp<b.player.maxHp*healingThreshold&&getItemCount(b.player.inventory,'strong_healing_potion_large'))return {type:'item',itemId:'strong_healing_potion_large'};
 let c=bossTestCommand(b,{ultimates:true});
 if(b.player.cards.deckSlots.includes('zodiac_leo')&&!isPlayerChargeReady(b.player)&&c.type!=='item')c={type:'attack'};
 return c;
}
export function superbossTrial({theme,job='warrior',variant='base',withNpcs=false,aware=true,seed=1,coefficient,defense90=false,character=null,commandPolicy=null}={}){
 const c=character?structuredClone(character):superbossCharacter(job,variant,withNpcs),enemy=createGoddessMapBoss({themeId:theme,level:100});
 if(coefficient!=null)enemy.goddessOffenseMultiplier=coefficient;
 // Explicit laboratory-only sensitivity scenario, never a claimed legal equipment build.
 if(defense90)c.temporaryStatBonuses={def:90-collectStats(c).def};
 let b=createBattleState({character:c,enemy:createEnemyCombatant(enemy)});const rng=f2Random(seed);
 const row={outcome:'timeout',turns:0,attacks:0,heals:0,guards:0,items:0,maxHit:0,bossHealing:0,barrierAbsorbed:0,revival:0,eclipses:0,eclipseGuards:0,interrupts:0,leoSelfDamage:0,deathCause:'',interruptionDamage:[]};
 while(!b.outcome&&row.turns<500){
  const command=commandPolicy?commandPolicy(b):superbossCommand(b,aware);row.turns++;row[command.type==='guard'?'guards':command.type==='item'?'heals':'attacks']++;
  const result=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(result.accepted,result.reason);b=result.battle;
  for(const e of b.presentationEvents||[]){
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
 row.playerHp=b.player.hp;row.playerSp=b.player.sp;row.bossHp=b.enemy.hp;row.runtime=b.enemy.goddessRuntime;row.piscesUsed=b.piscesUsed;row.suppliesExhausted=getItemCount(b.player.inventory,'strong_healing_potion_large')===0;
 if(row.outcome!=='defeat')row.deathCause='';return row;
}
export function summarizeSuperbossRuns(runs){
 const keys=['turns','attacks','heals','guards','items','bossHealing','barrierAbsorbed','revival','eclipses','eclipseGuards','interrupts','leoSelfDamage','playerHp','bossHp'];
 const interruptions=runs.flatMap(r=>r.interruptionDamage).sort((a,b)=>a-b);
 const deaths={};for(const r of runs)if(r.deathCause)deaths[r.deathCause]=(deaths[r.deathCause]||0)+1;
 return {mean:Object.fromEntries(keys.map(k=>[k,runs.every(r=>Number.isFinite(r[k]))?Number((runs.reduce((s,r)=>s+r[k],0)/runs.length).toFixed(2)):null])),
  maxSingleHit:Math.max(...runs.map(r=>r.maxHit)),maxTurns:Math.max(...runs.map(r=>r.turns)),deathCauses:deaths,
  suppliesExhausted:runs.filter(r=>r.suppliesExhausted??r.items===30).length,piscesUsed:runs.every(r=>typeof r.piscesUsed==='boolean')?runs.filter(r=>r.piscesUsed).length:null,
  healInterruptions:{attempts:interruptions.length,successes:runs.reduce((s,r)=>s+r.interrupts,0),damages:interruptions},
  trials:runs.map((r,i)=>({seed:i+1,outcome:r.outcome,turns:r.turns}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const trials=Number(process.env.NDA_TRIALS||10),rows=[];
 const configurations=[...['base','scorpio','cancer','no-libra'].map(variant=>({job:'warrior',variant})),...['thief','mage','priest'].map(job=>({job,variant:'base'})),{job:'warrior',variant:'base',withNpcs:true}];
 for(const config of configurations)for(const aware of [true,false])for(const theme of ['rice','dusk','tender']){
  const runs=Array.from({length:trials},(_,i)=>superbossTrial({...config,theme,aware,seed:i+1,defense90:process.env.NDA_DEFENSE90==='1',coefficient:process.env.NDA_COEFFICIENT?Number(process.env.NDA_COEFFICIENT):undefined}));
  const count=o=>runs.filter(r=>r.outcome===o).length;
  rows.push({...config,theme,aware,trials,wins:count('victory'),defeats:count('defeat'),timeouts:count('timeout'),meanTurns:runs.reduce((s,r)=>s+r.turns,0)/trials,summary:summarizeSuperbossRuns(runs),...(process.env.NDA_RAW_RUNS==='1'?{runs}:{})});
  console.log(config.job,config.variant,!!config.withNpcs,theme,aware,rows.at(-1).wins,rows.at(-1).meanTurns);
 }
 const characters=configurations.map(config=>{const c=superbossCharacter(config.job,config.variant,config.withNpcs);return {...config,hp:c.maxHp,sp:c.maxSp,stats:collectStats(c),engravings:c.engravingStatBonuses,equipment:c.equipment,deck:c.cards.deckSlots,inventory:c.inventory.counts};});
 writeFileSync(process.env.NDA_REPORT||'artifacts/goddess-superboss-candidate.json',JSON.stringify({label:process.env.NDA_LABEL||'candidate',defense90LaboratoryOverride:process.env.NDA_DEFENSE90==='1',coefficient:process.env.NDA_COEFFICIENT||'factory',trials,characters,rows},null,2)+'\n');
}
