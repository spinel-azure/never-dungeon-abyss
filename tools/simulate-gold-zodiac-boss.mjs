import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGoldMapBoss} from '../data/karte-gold-boss.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {bossTestCommand} from './simulate-map-bosses.mjs';
import {f2Random} from './simulate-special-map-f2.mjs';
import {normalizeCharacter} from '../data/classes.js';
import {getCardById} from '../data/cards.js';
import {calculateDeckCost} from '../data/deck.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';

const decks={
 warrior:['sagittarius','leo','libra','capricorn','scorpio','taurus'],
 thief:['sagittarius','gemini','libra','capricorn','scorpio','pisces'],
 mage:['aquarius','gemini','libra','capricorn','scorpio','virgo'],
 priest:['aquarius','gemini','libra','capricorn','scorpio','taurus']
};
const rows=[],fixtures=[],trials=50;
for(const job of Object.keys(decks))for(const withNpcs of [false,true])for(const variant of ['standard','z6','z6-no-scorpio']){
 let c=createPacingCharacter({job,level:200,band:'B90',withNpcs});
 if(variant!=='standard'){
  const slots=decks[job].map(id=>'zodiac_'+(variant==='z6-no-scorpio'&&id==='scorpio'?(job==='thief'?'taurus':'pisces'):id));
  c=normalizeCharacter({...c,cards:{ownedCardCounts:Object.fromEntries(slots.map(id=>[id,1])),deckSlots:slots}});
  assert.deepEqual(c.cards.deckSlots,slots);assert.equal(new Set(slots).size,6);
  assert.ok(slots.every(id=>getCardById(id).rarity==='Z'));assert.equal(calculateDeckCost(slots),48);assert.ok(c.deckCost>=48);
 }
 c.inventory=grantItem(c.inventory,'strong_healing_potion_small',20).inventory;c.hp=c.maxHp;c.sp=c.maxSp;
 assert.equal(getItemCount(c.inventory,'strong_healing_potion_small'),40);
 fixtures.push({job,withNpcs,variant,playerLevel:c.level,maxHp:c.maxHp,maxSp:c.maxSp,cost:calculateDeckCost(c.cards.deckSlots),costLimit:c.deckCost,
  deck:c.cards.deckSlots.map(id=>({id,name:getCardById(id).nameJa})),equipment:c.equipment,npcSystem:c.npcSystem});
 for(const level of [60,80,100]){
  const runs=[];
  for(let seed=1;seed<=trials;seed++){
   let b=createBattleState({character:c,enemy:createEnemyCombatant(createGoldMapBoss({themeId:'gold',level}))});
   const rng=f2Random(seed);let turns=0,heals=0,deathPoisonDamage=0,deathPoisonApplied=false,playerDamage=0;
   while(!b.outcome&&turns<200){
    let command=bossTestCommand(b,{ultimates:true});
    // Leo doubles ordinary attacks; retain charge/ultimate and healing decisions.
    if(b.player.cards.deckSlots.includes('zodiac_leo')&&command.type!=='item'&&!isPlayerChargeReady(b.player))command={type:'attack'};
    if(command.type==='item')heals++;
    const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(r.accepted,r.reason);b=r.battle;turns++;
    deathPoisonApplied ||= b.enemy.statuses.some(s=>(s.id||s.statusId)==='death_poison');
    for(const e of b.presentationEvents||[]){
     if(e.type==='poisonDamage'&&e.targetSide==='enemy'&&e.message?.includes('死毒'))deathPoisonDamage+=e.amount||0;
     if(e.type==='attackHit'&&e.targetSide==='player')playerDamage+=e.actualHpLoss||0;
    }
   }
   runs.push({seed,outcome:b.outcome||'timeout',turns,heals,deathPoisonDamage,deathPoisonApplied,playerDamage,bossHp:b.enemy.hp,piscesUsed:b.piscesUsed});
  }
  const wins=runs.filter(r=>r.outcome==='victory'),avg=(list,k)=>list.length?Number((list.reduce((n,r)=>n+r[k],0)/list.length).toFixed(2)):null;
  rows.push({job,withNpcs,variant,mapLevel:level,trials,wins:wins.length,timeouts:runs.filter(r=>r.outcome==='timeout').length,
   meanTurnsAll:avg(runs,'turns'),meanVictoryTurns:avg(wins,'turns'),minVictoryTurns:wins.length?Math.min(...wins.map(r=>r.turns)):null,maxTurns:Math.max(...runs.map(r=>r.turns)),
   meanHeals:avg(runs,'heals'),meanPlayerDamage:avg(runs,'playerDamage'),meanBossHpRemaining:avg(runs,'bossHp'),meanDeathPoisonDamage:avg(runs,'deathPoisonDamage'),
   deathPoisonBattles:runs.filter(r=>r.deathPoisonApplied).length,piscesUsed:runs.filter(r=>r.piscesUsed).length});
 }
 console.log(job,withNpcs,variant,'done');
}
const report={bossCandidate:'v2-gold-boss-combat-candidate-1',playerLevel:200,trialsPerCase:trials,totalBattles:rows.length*trials,
 assumptions:'Current unchanged boss. B90 pacing equipment +3, 40 healing potions, full HP/SP at each battle. NPC comparison uses Alec/Rebecca/Erika growth stage 9, initial charge 0. Fixed seeds 1..50. Learned charge and ultimate skills enabled. Leo uses ordinary attacks between charges. Not an exhaustive deck/gear/tactics optimization.',fixtures,rows};
writeFileSync('artifacts/special-map-gold-zodiac-pacing.json',JSON.stringify(report,null,2)+'\n');
console.table(rows.map(({runs,...r})=>r));
