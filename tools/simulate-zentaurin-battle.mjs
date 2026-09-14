import { createPacingCharacter } from './simulate-deep-normal-enemy-battles.mjs';
import { createBattleState, createPlayerAction, resolveBattleRound } from '../combat/battle-engine.js';
import { createBossCombatant } from '../data/bosses.js';
import { grantItem, getItemCount } from '../data/inventory.js';
import { collectCardStatBonuses } from '../data/cards.js';
import { normalizeCharacter } from '../data/classes.js';
import { grantEquipmentInstance, equipInstance } from '../data/equipment-inventory.js';

const rows=[];
const catGear = process.env.ZENTAURIN_CAT_GEAR === '1';
const level = catGear ? 130 : 110;
for(const job of ['warrior','thief','priest','mage'])for(const aries of [false,true]){
 const runs=[];
 for(const seed of [9601,9607,9613]){
  let c=createPacingCharacter({job,level,band:'B90',withNpcs:true});
  if(catGear){const id={warrior:'katzbalger',thief:'katzendolch',priest:'katzenkolben',mage:'katzenstab'}[job];
   const granted=grantEquipmentInstance(c,id,'rightArmId');if(!granted.accepted)throw Error('grant '+id);
   const equipped=equipInstance(granted.character,'rightArmId',granted.instance.instanceId);if(!equipped.accepted)throw Error('equip '+id);c=equipped.character;}
  if(aries){c.cards.ownedCardCounts.zodiac_aries=1;c.cards.deckSlots[5]='zodiac_aries';}
  c.cardStatBonuses=collectCardStatBonuses(c.cards.deckSlots);c=normalizeCharacter(c);c.hp=c.maxHp;c.sp=c.maxSp;
  for(const id of ['strong_healing_potion_medium','styptic'])c.inventory=grantItem(c.inventory,id,30).inventory;
  let b=createBattleState({character:c,enemy:createBossCombatant('zentaurin_b96f')});let turns=0;let value=seed;
  const rng=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  while(!b.outcome&&turns<400){
   let command={type:'attack'};
   if(aries){const ids=job==='mage'?['lightning_bolt','fireball']:job==='priest'?['holy_strike']:job==='thief'?['gale_blades']:['power_strike'];
    const id=ids.find(id=>createPlayerAction(b.player,{type:'skill',skillId:id},b.enemy).ok);if(id)command={type:'skill',skillId:id};}
   if(b.enemy.reservedEnemyAction)command={type:'guard'};
   if(b.player.hp<b.player.maxHp*.55&&getItemCount(b.player.inventory,'strong_healing_potion_medium')>0)command={type:'item',itemId:'strong_healing_potion_medium'};
   const r=resolveBattleRound({battle:b,playerCommand:command,rng});if(!r.accepted)throw Error(r.reason);b=r.battle;turns++;
  }
  runs.push({outcome:b.outcome||'timeout',turns,hp:b.player.hp,healingRemaining:getItemCount(b.player.inventory,'strong_healing_potion_medium')});
 }
 rows.push({job,aries,level,gear:catGear?'cat weapon, crystal armor +3, Alec/Rebecca/Erika':'existing B90 pacing fixture (crystal +3), Alec/Rebecca/Erika',runs});
}
console.log(JSON.stringify(rows,null,2));
