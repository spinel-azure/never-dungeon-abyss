import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter, normalizeCharacter} from '../data/classes.js';
import {acceptQuest, abandonQuest, reportQuest, getQuestProgress, isQuestAvailable, isDungeonDepthUnlocked} from '../data/quests.js';
import {getEndgameQuestEvidence, getKirkeFinalDialogue} from '../data/endgame-quests.js';
import {grantKeyItem} from '../data/key-items.js';
import {grantCard, getOwnedCardCount} from '../data/deck.js';
import {getCardById} from '../data/cards.js';
import {getEquipmentItem, collectEquipmentBonuses} from '../data/equipment.js';
import {applyPlayerChargeAction, normalizePlayerCharge} from '../combat/player-charge.js';
import {advanceNpcChargeState, NPC_CHARGE_SKILLS} from '../combat/npc-support.js';
import {normalizeNpcSystem} from '../data/npc-party.js';
import {collectStats} from '../combat/collect-stats.js';
import {resolveStatusEffect, resolveInstantDeath} from '../combat/resolve-status-effect.js';
import {resolveTreasureTrap} from '../combat/resolve-trap.js';
const cardId='legendary_fighting_spirit';
function hero() {
 const c=createInitialCharacter({name:'QA',job:'mage'});
 c.quests.completedQuestIds=['guild_001_abyss_rat','guild_002_cave_slime','guild_003_b1f_survey','guild_024','guild_030'];
 c.highestDungeonDepthReached=90;
 return c;
}
function ready035(flags={}) {
 const c=hero();c.quests.completedQuestIds.push('guild_032','guild_034');c.eventFlags={...flags};return c;
}
test('032 and 034 remain available without 033 or Lichtbringer; prior shadows and depth required',()=>{
 const c=hero();assert.equal(isQuestAvailable(c,'guild_032'),true);
 for(const id of ['guild_024','guild_030']) {const d=structuredClone(c);d.quests.completedQuestIds=d.quests.completedQuestIds.filter(x=>x!==id);assert.equal(isQuestAvailable(d,'guild_032'),false);}
 c.highestDungeonDepthReached=89;assert.equal(isQuestAvailable(c,'guild_032'),false);
 c.highestDungeonDepthReached=90;c.quests.completedQuestIds.push('guild_032');
 assert.equal(isQuestAvailable(c,'guild_034'),true);assert.equal(isQuestAvailable(c,'guild_035'),false);
});
test('034 requires both kill and arrival, retroactively; reports its card exactly once',()=>{
 const c=hero();c.quests.completedQuestIds.push('guild_032');
 for(const [kill,depth,expected] of [[false,100,false],[true,99,false],[true,100,true]]) {
 const d=structuredClone(c);d.eventFlags.boss_b99f_defeated=kill;d.highestDungeonDepthReached=depth;
 const a=acceptQuest(d,'guild_034');assert.equal(a.accepted,true);assert.equal(getQuestProgress(a.character,'guild_034').readyToReport,expected);
 if(expected) {const r=reportQuest(a.character,'guild_034');assert.equal(r.accepted,true);assert.equal(getOwnedCardCount(r.character.cards,cardId),1);assert.equal(reportQuest(r.character,'guild_034').accepted,false);assert.equal(isQuestAvailable(r.character,'guild_035'),true);}
 }
});
test('035 requires final kill AND staff evidence, including return and old clear records',()=>{
 for(const [flags,expected] of [[{},false],[{boss_amayenak_b100f_defeated:true},false],[{truth_staff_obtained:true},false],[{boss_amayenak_b100f_defeated:true,truth_staff_obtained:true},true],[{michaela_restored:true},true],[{queen_regalia_returned:true},true],[{ending_story_completed:true},true]]) {
 const a=acceptQuest(ready035(flags),'guild_035');assert.equal(a.accepted,true);
 assert.equal(getQuestProgress(a.character,'guild_035').readyToReport,expected);
 if(expected) {const r=reportQuest(a.character,'guild_035');assert.equal(r.accepted,true);assert.equal(r.character.equipmentInventory.instances.filter(x=>x.equipmentId==='kirke_amulet').length,1);assert.equal(reportQuest(r.character,'guild_035').accepted,false);}
 }
 const c=ready035({boss_amayenak_b100f_defeated:true});c.keyItems=grantKeyItem(c.keyItems,'truth_staff').keyItems;
 assert.equal(getQuestProgress(acceptQuest(c,'guild_035').character,'guild_035').readyToReport,true);
 assert.equal(getEndgameQuestEvidence({...hero(),highestDungeonDepthReached:100}).soulEater,false);
});
test('035 supply survives reload and abandon/reaccept without duplicates; full storage leaves entitlement intact',()=>{
 let c=ready035();let a=acceptQuest(c,'guild_035');assert.equal(a.character.inventory.counts.allheilmittel,1);
 c=normalizeCharacter(JSON.parse(JSON.stringify(a.character)));
 c=abandonQuest(c,'guild_035').character;a=acceptQuest(c,'guild_035');assert.equal(a.accepted,true);assert.equal(a.acceptanceSupplyItemId,null);assert.equal(a.character.inventory.counts.allheilmittel,1);assert.equal(a.character.warehouse.itemStacks.length,0);
 c=ready035();c.inventory.counts.allheilmittel=1;a=acceptQuest(c,'guild_035');assert.equal(a.character.warehouse.itemStacks[0].count,1);
 c.warehouse.itemStacks=[{itemId:'allheilmittel',count:99}];a=acceptQuest(c,'guild_035');assert.equal(a.accepted,false);assert.equal(a.character.eventFlags.quest_035_supply_received,undefined);assert.equal(a.character.quests.active.guild_035,undefined);assert.equal(a.character.gold,c.gold);
});
test('final floor access does not require either new quest; cleared dialogue replaces prebattle request',()=>{
 const c=hero();c.eventFlags.boss_b99f_defeated=true;
 for(const id of ['queen_tiara','queen_earring','queen_necklace']) c.keyItems=grantKeyItem(c.keyItems,id).keyItems;
 assert.equal(isDungeonDepthUnlocked(c,100),true);
 assert.match(getKirkeFinalDialogue(c).join(''),/最後の戦い/);
 assert.doesNotMatch(getKirkeFinalDialogue(ready035({boss_amayenak_b100f_defeated:true})).join(''),/倒しておくれ|最後の戦い/);
});
function charged() {const c=hero();c.cards=grantCard(c.cards,cardId,1,100).cards;c.cards.deckSlots=[cardId];return c;}
test('charge card preserves fractional gains, caps and cooldown; only equipped card applies once',()=>{
 assert.equal(getCardById(cardId).cost,6);
 for(const [commandType,spCost,gain] of [['guard',0,1.25],['item',0,1.25],['attack',0,6.25],['skill',4,18.75],['skill',0,0]]) {
 const c=charged();assert.equal(applyPlayerChargeAction(c,{commandType,spCost}).playerCharge.value,gain);
 c.cards.deckSlots=[];assert.equal(applyPlayerChargeAction(c,{commandType,spCost}).playerCharge.value,gain/1.25);
 }
 let c=charged();c.cards.deckSlots=[cardId,cardId];c=applyPlayerChargeAction(c,{commandType:'guard'});assert.equal(c.playerCharge.value,1.25);
 assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(c))).playerCharge.value,1.25);
 c.playerCharge.value=99;assert.equal(applyPlayerChargeAction(c,{commandType:'attack'}).playerCharge.value,100);
 c=applyPlayerChargeAction(c,{chargeSkill:true});assert.equal(applyPlayerChargeAction(c,{commandType:'attack'}).playerCharge.value,0);
 assert.equal(normalizePlayerCharge({value:100}).value,100);
});
test('active NPCs receive the same multiplier once per ordinary charge tick; inactive NPC and cooldown excluded',()=>{
 for(const [id,config] of Object.entries(NPC_CHARGE_SKILLS)) {
 const c=charged();c.npcSystem=normalizeNpcSystem({registeredIds:[id],activeIds:[id],records:{[id]:{charge:0,maxDepth:40}}});
 const b={player:c};advanceNpcChargeState(b);assert.equal(c.npcSystem.records[id].charge,config.chargePerTurn*1.25);
 c.npcSystem=normalizeNpcSystem(JSON.parse(JSON.stringify(c.npcSystem)));assert.equal(c.npcSystem.records[id].charge,config.chargePerTurn*1.25);
 c.npcSystem.records[id].charge=99;advanceNpcChargeState(b);assert.equal(c.npcSystem.records[id].charge,100);
 c.npcSystem.records[id].charge=0;c.npcSystem.records[id].chargeCooldown=1;advanceNpcChargeState(b);assert.equal(c.npcSystem.records[id].charge,0);
 c.npcSystem.activeIds=[];advanceNpcChargeState(b);assert.equal(c.npcSystem.records[id].charge,0);
 }
});
test('Kirke amulet halves all six ordinary ailments after existing resistance and clamps, preserving immunity and special effects',()=>{
 const gear=getEquipmentItem('kirke_amulet');assert.equal(gear.slot,'accessoryId');assert.deepEqual(gear.statBonuses,{ordinaryStatusRateMultiplier:.5});
 const defender=collectStats({stats:{int:10,dex:10,luc:10},equipmentStatBonuses:collectEquipmentBonuses({accessoryId:gear.id})});
 for(const statusId of ['poison','deadly_poison','death_poison','bleeding','action_skip','electrified']) {
 const effect={statusId,baseRate:.6};const attacker={dex:10};
 assert.equal(resolveStatusEffect({defender,attacker,effect}).rate,.3);
 assert.equal(resolveStatusEffect({defender:{...defender,statusResistances:{[statusId]:20}},attacker,effect}).rate, .19999999999999998);
 assert.equal(resolveStatusEffect({defender:{...defender,statusResistances:{[statusId]:{immune:true}}},attacker,effect}).rate,0);
 assert.equal(resolveStatusEffect({defender,attacker,effect:{...effect,guaranteed:true}}).rate,1);
 }
 for(const statusId of ['armor_break','speed_down','action_seal']) assert.equal(resolveStatusEffect({defender,attacker:{dex:10},effect:{statusId,baseRate:.6}}).rate,.6);
 const plain={...defender,ordinaryStatusRateMultiplier:1};
 for(const baseRate of [-1,2]) assert.equal(resolveStatusEffect({defender,effect:{statusId:'poison',baseRate}}).rate,resolveStatusEffect({defender:plain,effect:{statusId:'poison',baseRate}}).rate/2);
 assert.equal(resolveInstantDeath({defender,baseRate:.5}).rate,resolveInstantDeath({defender:plain,baseRate:.5}).rate);
});
test('poison trap also respects the amulet without modifying trap damage or forced events',()=>{
 const c=hero();c.equipmentStatBonuses={ordinaryStatusRateMultiplier:.5};
 for(const [roll,poisoned] of [[.49,true],[.5,false]]) {let i=0;const r=resolveTreasureTrap({character:c,trapId:'poison_needle',rng:()=>[.99,.99,roll][i++]});assert.equal(r.character.statuses.some(x=>x.id==='poison'||x.statusId==='poison'),poisoned);}
});

