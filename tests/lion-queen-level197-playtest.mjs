import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getExperienceForLevel} from '../data/growth.js';
import {grantEquipmentInstance,equipInstance,getEquipmentInstanceDefinition} from '../data/equipment-inventory.js';
import {ITEMS,getItem} from '../data/items.js';
import {getCardById} from '../data/cards.js';
import {calculateDeckCost} from '../data/deck.js';
import {createBossCombatant} from '../data/bosses.js';
import {collectStats} from '../combat/collect-stats.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {getItemUnavailableReason} from '../combat/resolve-item-use.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';
import {applyTaurusDepthBonus} from '../data/taurus.js';

const deck=['scorpio','libra','sagittarius','taurus','cancer','pisces'].map(id=>'zodiac_'+id);
const gear=[['rightArmId','katzbalger',0],['leftArmId','amethyst_aegis',3],['headId','amethyst_helmet',3],
  ['bodyId','amethyst_plate',3],['footId','amethyst_greaves',3],['accessoryId','frost_giant_talisman',2]];
const recoveryEffects=new Set(['heal_hp','heal_hp_rate','restore_hp_full','battle_overheal_flat']);
export const hpItems=ITEMS.filter(item=>item.id!=='allheilmittel'&&item.usableIn.includes('battle')&&item.effects.some(e=>recoveryEffects.has(e.id)));

export function fixture({deck:activeDeck=deck,job='warrior',equipment=gear}={}) {
  const deck=activeDeck,gear=equipment;
  let c=createInitialCharacter({name:'Lv197戦士ソロ',job});
  c.level=197;c.experience=getExperienceForLevel(197);c=normalizeCharacter(c);
  for(const [slot,id,enhancement] of gear) {
    const grant=grantEquipmentInstance(c,id,slot,{enhancement});assert.equal(grant.accepted,true);
    const equipped=equipInstance(grant.character,slot,grant.instance.instanceId);assert.equal(equipped.accepted,true);
    c=normalizeCharacter(equipped.character);
  }
  c.cards.ownedCardCounts=Object.fromEntries(deck.map(id=>[id,1]));c.cards.deckSlots=deck;
  c.inventory.counts=Object.fromEntries(hpItems.map(item=>[item.id,99]));
  // The request is five, but normalization permits one carried; battle use is once.
  c.inventory.counts.allheilmittel=5;
  c=applyTaurusDepthBonus(normalizeCharacter(c),{location:'dungeon',depth:1});
  c.hp=c.maxHp;c.sp=c.maxSp;
  assert.deepEqual(c.cards.deckSlots.filter(Boolean),deck);assert.equal(calculateDeckCost(deck),48);assert.ok(c.deckCost>=48);
  assert.equal(c.inventory.counts.allheilmittel,1);assert.equal(c.taurusDepthDefBonus,0);
  for(const [slot,id,enhancement] of gear) {
    const instance=c.equipmentInventory.instances.find(e=>e.instanceId===c.equippedInstanceIds[slot]);
    assert.equal(instance.equipmentId,id);assert.equal(instance.enhancement,enhancement);
  }
  return c;
}
const character=fixture();
const requestedInventory={...character.inventory.counts,allheilmittel:5};
export function canUse(b,id){return !getItemUnavailableReason({character:b.player,itemId:id,context:'battle',enemy:b.enemy});}
export function healValue(item,p) {
  return item.effects.reduce((sum,e)=>sum+(e.id==='heal_hp'?e.value:e.id==='heal_hp_rate'?Math.floor(p.maxHp*e.value):e.id==='restore_hp_full'?p.maxHp:e.id==='battle_overheal_flat'?e.value:0),0);
}
function choose(b,policy) {
  // Decisions use only visible HP, charge, inventory and the announced attack.
  if(b.enemy.reservedEnemyAction)return {type:'guard'};
  if(b.player.hp<b.player.maxHp*.4) {
    const choices=hpItems.filter(item=>canUse(b,item.id)).sort((a,z)=>healValue(z,b.player)-healValue(a,b.player));
    if(b.player.hp<b.player.maxHp*.25&&canUse(b,'allheilmittel'))return {type:'item',itemId:'allheilmittel'};
    if(choices[0])return {type:'item',itemId:choices[0].id};
    if(canUse(b,'allheilmittel'))return {type:'item',itemId:'allheilmittel'};
  }
  if(policy==='charge'&&isPlayerChargeReady(b.player)) {
    if(b.player.sp>=100&&!b.player.statuses.some(s=>(s.id||s.statusId)==='charge_ultimate_used'))return {type:'skill',skillId:'drachen_fang'};
    return {type:'skill',skillId:'falcon_schnitt'};
  }
  return {type:'attack'};
}
function simulate(seed,policy) {
  let random=seed;const rng=()=>((random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296);
  let b=createBattleState({character,enemy:createBossCombatant('loewenkoenigin_b1f')}),turn=0,minHp=character.hp;
  let poisonDamage=0,selfDamage=0,playerDamage=0,maxEnemyActionDamage=0;
  const commands={},phaseTurns={1:1},trace=[];
  while(!b.outcome&&turn<1500) {
    const command=choose(b,policy),before={playerHp:b.player.hp,enemyHp:b.enemy.hp};
    const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.equal(r.accepted,true,JSON.stringify({command,reason:r.reason}));
    b=r.battle;turn++;minHp=Math.min(minHp,b.player.hp);phaseTurns[b.enemy.lionPhase||1]??=turn;
    const key=command.itemId||command.skillId||command.type;commands[key]=(commands[key]||0)+1;
    let enemyActionDamage=0;
    for(const event of b.presentationEvents) {
      if(event.type==='poisonDamage'&&event.targetSide==='enemy')poisonDamage+=event.amount;
      if(event.type==='leoHpCost'&&event.targetSide==='enemy')selfDamage+=event.amount;
      if(event.type==='attackHit'&&event.actorSide==='player')playerDamage+=event.damage||0;
      if(event.type==='attackHit'&&event.actorSide==='enemy')enemyActionDamage+=event.damage||0;
    }
    maxEnemyActionDamage=Math.max(maxEnemyActionDamage,enemyActionDamage);
    if(seed===1)trace.push({turn,command,before,after:{playerHp:b.player.hp,enemyHp:b.enemy.hp,phase:b.enemy.lionPhase},log:b.log});
  }
  const used=Object.fromEntries(Object.entries(character.inventory.counts).map(([id,count])=>[id,count-(b.player.inventory.counts[id]||0)]));
  assert.ok(used.allheilmittel<=1);assert.ok(used.active_healing_potion_small<=1);
  return {seed,policy,outcome:b.outcome||'limit',turns:turn,playerHp:b.player.hp,enemyHp:b.enemy.hp,minHp,phaseTurns,
    commands,used,piscesUsed:b.piscesUsed,poisonDamage,selfDamage,playerDamage,maxEnemyActionDamage,...(seed===1?{trace}:{})};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
const runs=[];
for(const policy of ['normal','charge'])for(let seed=1;seed<=100;seed++)runs.push(simulate(seed,policy));
const range=values=>[Math.min(...values),Math.max(...values)];
const summaries=['normal','charge'].map(policy=>{
  const r=runs.filter(r=>r.policy===policy);
  return {policy,runs:r.length,wins:r.filter(r=>r.outcome==='victory').length,turnRange:range(r.map(r=>r.turns)),
    meanTurns:r.reduce((sum,r)=>sum+r.turns,0)/r.length,remainingHpRange:range(r.map(r=>r.playerHp)),
    minimumRoundEndHp:Math.min(...r.map(r=>r.minHp)),revivals:r.filter(r=>r.piscesUsed).length,
    itemUsage:Object.fromEntries(Object.keys(character.inventory.counts).map(id=>[id,range(r.map(r=>r.used[id]))])),
    poisonDamageRange:range(r.map(r=>r.poisonDamage)),selfDamageRange:range(r.map(r=>r.selfDamage)),
    maxEnemyActionDamage:Math.max(...r.map(r=>r.maxEnemyActionDamage))};
});
const setup={level:character.level,hp:character.hp,sp:character.sp,baseStats:character.baseStats,effectiveStats:collectStats(character),
  deckCost:character.deckCost,deck:deck.map(id=>({id,name:getCardById(id).nameJa})),
  gear:gear.map(([slot])=>getEquipmentInstanceDefinition(character.equipmentInventory.instances.find(e=>e.instanceId===character.equippedInstanceIds[slot]))),
  requestedInventory,actualInventory:character.inventory.counts,npcSupport:false,skills:character.skillIds};
await mkdir('artifacts/lion-queen-level197',{recursive:true});
await writeFile('artifacts/lion-queen-level197/results.json',JSON.stringify({setup,summaries,runs},null,2));
console.log(JSON.stringify({setup:{hp:setup.hp,sp:setup.sp,stats:setup.effectiveStats,deck:setup.deck},summaries},null,2));

}
