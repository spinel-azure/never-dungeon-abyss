import test from "node:test";
import assert from "node:assert/strict";
import {createInitialCharacter,normalizeCharacter} from "../data/classes.js";
import {getCardById,applyCardVitalMultipliers} from "../data/cards.js";
import {grantCard,setDeckSlot,calculateDeckCost} from "../data/deck.js";
import {addLootCard,settleLootBag,grantItem} from "../data/inventory.js";
import {getEffectiveSpCost} from "../combat/sp-cost.js";
import {getSkill} from "../data/skills.js";
import {resolveFieldSkill} from "../combat/resolve-field-skill.js";
import {createBattleState,resolveBattleRound} from "../combat/battle-engine.js";
import {createEnemyCombatant,getEnemyById} from "../data/enemies.js";

const HP="sr_vital_abundance", SP="sr_spirit_abundance", CUT="sr_sp_saver_plus", C="common_sp_saver";
function character(cards=[],job="priest") {
  let c=createInitialCharacter({name:"SR QA",job});c.level=100;c=normalizeCharacter(c);
  for(const id of cards)c.cards=grantCard(c.cards,id,1,c.deckCost).cards;
  cards.forEach((id,i)=>{c.cards=setDeckSlot(c.cards,i,id,c.deckCost);});
  return normalizeCharacter(c);
}
function enemy(){return createEnemyCombatant({...getEnemyById("abyss_rat"),hp:99999,maxHp:99999,actions:[{id:"wait",name:"待機",actionType:"wait",weight:1}]});}
function round(c,skillId){const battle=createBattleState({character:c,enemy:enemy()});return resolveBattleRound({battle,playerCommand:{type:"skill",skillId},rng:()=>0.5});}

for(const [id,key,legendary,description] of [[HP,"maxHp","legendary_vital_surge","最大HPが50上昇する。"],[SP,"maxSp","legendary_spirit_surge","最大SPが50上昇する。"]]) {
 test(`${id}: additive 1-3 copies and L stacking`,()=>{
  const base=character();assert.equal(getCardById(id).descriptionJa,description);
  assert.equal(getCardById(id).iconId,getCardById(legendary).iconId);
  for(let n=1;n<=3;n++){
   const c=character(Array(n).fill(id));assert.equal(c[key],base[key]+50*n);
   assert.equal(calculateDeckCost(c.cards.deckSlots),n*4);
  }
  assert.equal(character([id,legendary])[key],base[key]+150);
 });
 test(`${id}: existing percentage order and repeated equipment changes cannot heal`,()=>{
  const percent=key==="maxHp"?["zodiac_taurus","zodiac_cancer"]:["legendary_mana_booster"];
  const c=character([id,...percent]);
  const base=character();
  assert.equal(c[key],applyCardVitalMultipliers(c.cards.deckSlots,key,base[key]+50));
  const vital=key==="maxHp"?"hp":"sp";
  let damaged=character([id]);damaged[vital]=10;
  for(let n=0;n<5;n++){
   damaged.cards=setDeckSlot(damaged.cards,0,null,damaged.deckCost);damaged=normalizeCharacter(damaged);assert.equal(damaged[vital],10);
   damaged.cards=setDeckSlot(damaged.cards,0,id,damaged.deckCost);damaged=normalizeCharacter(damaged);assert.equal(damaged[vital],10);
  }
  damaged[vital]=damaged[key];damaged.cards=setDeckSlot(damaged.cards,0,null,damaged.deckCost);damaged=normalizeCharacter(damaged);
  assert.equal(damaged[vital],damaged[key]);
  const clamped=damaged[vital];damaged.cards=setDeckSlot(damaged.cards,0,id,damaged.deckCost);damaged=normalizeCharacter(damaged);assert.equal(damaged[vital],clamped);
 });
}

for(const [id,limit] of [[HP,3],[SP,3],[CUT,1]]) {
 test(`${id}: limits, icon, SR pricing and overflow`,()=>{
  const card=getCardById(id);assert.deepEqual([card.rarity,card.cost,card.maxOwned,card.maxCopies],["SR",4,limit,limit]);
  assert.deepEqual([card.sellPrice,card.buybackPrice,card.overflowGold],[5000,50000,5000]);
  let c=character(Array(limit).fill(id));assert.equal(grantCard(c.cards,id,1,c.deckCost).gained,0);
  assert.equal(setDeckSlot(c.cards,limit,id,c.deckCost).deckSlots[limit],null);
  c.lootBag=addLootCard(c.lootBag,id,2).lootBag;const settled=settleLootBag(c);
  assert.equal(settled.character.gold-c.gold,10000);assert.equal(settled.character.cards.ownedCardCounts[id],limit);
  assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(c))).cards,c.cards);
 });
}

test("SP Saver Plus uses C's icon and exact text",()=>{
 assert.equal(getCardById(CUT).iconId,getCardById(C).iconId);
 assert.equal(getCardById(CUT).descriptionJa,"スキル・呪文・奇蹟の消費SPを3減らす。ただし消費SPは1未満にならない。");
});
for(const [cards,reduction] of [[[CUT],3],[[CUT,C],4],[[CUT,C,C],5],[[C],1]]) {
 test(`SP reduction ${reduction}: zero/minimum and equipment multiplier order`,()=>{
  const c=character(cards);
  for(const cost of [0,1,3,5,10])assert.equal(getEffectiveSpCost({spCost:cost},c),cost===0?0:Math.max(1,cost-reduction));
  assert.equal(getEffectiveSpCost({spCost:10},{...c,spCostMultiplier:.75}),Math.max(1,8-reduction));
  assert.equal(getEffectiveSpCost({spCost:100,ignoreSpCostReduction:true},c),100);
  assert.equal(getEffectiveSpCost({spCost:10,category:"attackSpell"},{...c,statuses:[{id:"charge_mana_spring",active:true}]}),0);
 });
}
for(const [job,skillId] of [["warrior","wide_swing"],["mage","fireball"],["mage","ice_bind"],["priest","greater_healing"]]) {
 test(`${skillId}: battle SP boundary and actual payment`,()=>{
  for(const cards of [[CUT],[CUT,C]]) {
   const c=character(cards,job);assert.ok(c.skillIds.includes(skillId));c.hp=1;
   const cost=getEffectiveSpCost(getSkill(skillId),c);
   c.sp=cost-1;const refused=round(c,skillId);assert.equal(refused.accepted,false);assert.equal(refused.battle.player.sp,c.sp);
   c.sp=cost;const accepted=round(c,skillId);assert.equal(accepted.accepted,true);assert.equal(accepted.battle.player.sp,0);
  }
 });
}

test("field healing uses the same reduced cost and rejects insufficient SP",()=>{
 for(const cards of [[CUT],[CUT,C]])for(const context of ["dungeon","town"]){
  const c=character(cards);c.hp=1;const cost=getEffectiveSpCost(getSkill("greater_healing"),c);
  c.sp=cost-1;assert.equal(resolveFieldSkill({character:c,skillId:"greater_healing",context}).reason,"insufficientSp");
  c.sp=cost;const used=resolveFieldSkill({character:c,skillId:"greater_healing",context});assert.equal(used.accepted,true);assert.equal(used.character.sp,0);assert.ok(used.character.hp>1);
 }
});

test("Gemini recast remains free and normal/item actions keep zero SP payment",()=>{
 const c=character([CUT,"zodiac_gemini"],"mage");c.sp=1;
 const cast=round(c,"fireball");assert.equal(cast.accepted,true);assert.equal(cast.battle.player.sp,0);
 assert.equal(cast.battle.presentationEvents.filter(e=>e.type==="attackHit"&&e.actorSide==="player").length,2);
 for(const command of [{type:"attack"},{type:"item",itemId:"stone"}]){
  const source=character([CUT],"warrior");source.sp=0;source.inventory=grantItem(source.inventory,"stone",1).inventory;
  const result=resolveBattleRound({battle:createBattleState({character:source,enemy:enemy()}),playerCommand:command,rng:()=>.5});
  assert.equal(result.accepted,true);assert.equal(result.battle.player.sp,0);
 }
});

test("protected save roundtrip retains new cards and original C/L-only saves",async()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 globalThis.window={dispatchEvent(){}};globalThis.CustomEvent=class{constructor(type){this.type=type;}};
 try{
  const {writeGame,loadGame}=await import("../js/save-data.js");
  for(const [slot,ids] of [["auto",[HP,HP,SP,SP,CUT]],["manual1",[C,"legendary_vital_surge","legendary_spirit_surge"]]]){
   const c=character(ids);assert.equal(writeGame({character:c,player:{gridX:1,gridY:1,dir:0},dungeon:{cells:[[{type:"floor"}]],explored:[[true]]}},slot),true);
   assert.deepEqual(normalizeCharacter(loadGame(slot).character).cards,c.cards);
  }
 }finally{delete globalThis.localStorage;delete globalThis.window;delete globalThis.CustomEvent;}
});
test("rapid-current purple chest exact 30/30/30/5/5 boundaries and counts",async()=>{
 const {rollPurpleChestLoot,getPurpleChestLootTable}=await import("../data/loot.js");
 for(const depth of [70,79]){
  assert.deepEqual(getPurpleChestLootTable(depth).entries.map(e=>e.upperBound),[.3,.6,.9,.95,1]);
  for(const [roll,id] of [[0,CUT],[.299999,CUT],[.3,HP],[.599999,HP],[.6,SP],[.899999,SP],[.9,"sr_follow_up_plus"],[.949999,"sr_follow_up_plus"],[.95,"sr_ability_boost"],[.999999,"sr_ability_boost"]])assert.deepEqual(rollPurpleChestLoot(()=>roll,depth),{kind:"card",cardId:id,rarity:"SR",amount:1,unidentifiedName:"？カード"});
 }
 const counts={};for(let i=0;i<1000;i++){const id=rollPurpleChestLoot(()=>i/1000,70).cardId;counts[id]=(counts[id]||0)+1;}
 assert.deepEqual(counts,{[CUT]:300,[HP]:300,[SP]:300,sr_follow_up_plus:50,sr_ability_boost:50});
});

test("B70-B79 purple chests use vacant event rooms and never replace fixed or rare events",async()=>{
 const {buildBoundaryWallMap,cells,placePurpleSpecialRoomTreasure}=await import("../js/dungeon.js");
 for(let depth=70;depth<=79;depth++){
  buildBoundaryWallMap(depth,()=>.5,{maikaeferNestRoll:1});
  const room=cells.flat().find(c=>c.specialRoom);assert.ok(room,`B${depth}`);
  if(depth===73){assert.equal(room.specialRoom.content.type,'geminiFinal');assert.equal(room.treasure,null);continue;}
  if(depth===76){assert.equal(room.specialRoom.content.bossId,'tiefstrom_b76f');assert.equal(room.treasure,null);continue;}
  assert.equal(room.specialRoom.content,null);assert.equal(room.treasure,"purple");
  assert.equal(cells.flat().filter(c=>c.treasure==="purple").length,1);
  room.treasure=null;room.specialRoom.content={type:"eventBoss",bossId:"test_only"};
  assert.equal(placePurpleSpecialRoomTreasure(depth),null);assert.equal(room.treasure,null);
 }
 buildBoundaryWallMap(70,()=>.5,{maikaeferNestRoll:0});
 const rare=cells.flat().find(c=>c.specialRoom);assert.ok(rare.specialRoom.content);assert.notEqual(rare.treasure,"purple");
});

test("new cards do not enter other floors or other chest pools",async()=>{
 const {rollPurpleChestLoot,rollRedChestLoot,rollBlackChestLoot}=await import("../data/loot.js");
 const ids=new Set([HP,SP,CUT]);
 for(let depth=1;depth<=100;depth++)for(let i=0;i<=100;i++){
  const rng=()=>Math.min(i/100,.999999);
  if(depth<70||depth>79)assert.equal(ids.has(rollPurpleChestLoot(rng,depth).cardId),false);
  assert.equal(ids.has(rollRedChestLoot(rng,depth).cardId),false);
  assert.equal(ids.has(rollBlackChestLoot(rng,depth).cardId),false);
 }
});
