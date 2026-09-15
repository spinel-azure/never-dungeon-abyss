import test from "node:test";
import assert from "node:assert/strict";
import { ITEMS, getItem, canUseItemIn, getShopItemIdsForDepth, getShopItemIdsForCharacter } from "../data/items.js";
import { rollRedChestLoot, rollBlackChestLoot, rollPurpleChestLoot } from "../data/loot.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { addLootItem, getItemCount, grantItem, settleLootBag } from "../data/inventory.js";
import { sellItem } from "../data/commerce.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { isDungeonFeatureOccupied } from "../js/dungeon-feature-placement.js";
import { getRestoredTreasureType } from "../js/dungeon-save-restore.js";

import { getInventoryItemDescription, getInventoryItemUnavailableReason } from "../js/menu.js";
const valuables = [
  ["blue_pearl", "蒼真珠", 5000],
  ["crystal_coral", "水晶珊瑚", 10000],
  ["sunken_kingdom_coin_pouch", "沈没王国の金貨袋", 20000]
];
const potion = "strong_healing_potion_medium";

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test("B70 red chest exact 50/30/15/5 boundaries yield one item", () => {
  for (const [roll, itemId] of [[0,"wurfspeer"],[0.499999,"wurfspeer"],[0.5,"blue_pearl"],[0.799999,"blue_pearl"],[0.8,"crystal_coral"],[0.949999,"crystal_coral"],[0.95,"sunken_kingdom_coin_pouch"],[0.999999,"sunken_kingdom_coin_pouch"]]) {
    const result=rollRedChestLoot(()=>roll,70);
    assert.deepEqual(result,{kind:"item",itemId,amount:1,unidentifiedName:"？アイテム"});
  }
  const counts={};
  for(let n=0;n<10000;n++) {const id=rollRedChestLoot(()=>n/10000,70).itemId;counts[id]=(counts[id]||0)+1;}
  assert.deepEqual(counts,{wurfspeer:5000,blue_pearl:3000,crystal_coral:1500,sunken_kingdom_coin_pouch:500});
});

test("the existing medium strong potion is reused without changing its price or effects",()=>{
  assert.equal(ITEMS.filter(i=>i.id===potion).length,1);
  assert.equal(getItem(potion).name,"強回復薬（中）");
  assert.equal(getItem(potion).sellPrice,1000);
  assert.deepEqual(getItem(potion).effects,[{id:"heal_hp_rate",value:0.5}]);
});

for(const [id,name,price] of valuables) {
  test(`${name}: material limits, description, no use, no shop stock`,()=>{
    const item=getItem(id);
    assert.equal(ITEMS.filter(i=>i.id===id).length,1);
    assert.equal(item.name,name);assert.equal(item.sellPrice,price);assert.equal(item.buyPrice,0);
    assert.equal(item.category,"material");assert.equal(item.maxOwned,getItem("rat_tail").maxOwned);
    assert.equal(item.repurchasable,false);assert.ok(item.description.startsWith("《換金アイテム》\n"));
    assert.deepEqual(item.effects,[]);
    for (const context of ["town", "dungeon"]) {
      assert.equal(getInventoryItemDescription(item, {}, context), item.description);
      assert.ok(getInventoryItemUnavailableReason(item, {}, context));
    }
    for(const context of ["town","dungeon","battle"]) assert.equal(canUseItemIn(item,context),false);
    for(const depth of [1,69,70,71,100,200]) assert.equal(getShopItemIdsForDepth(depth).includes(id),false);
    assert.equal(getShopItemIdsForCharacter({eventFlags:{transfer_portal_b70f_unlocked:true}}).includes(id),false);
  });
  test(`${name}: lot settlement and partial sale preserve quantities and gold`,()=>{
    let character=createInitialCharacter({name:"TREASURE",job:"warrior"});
    const gold=character.gold;
    character.lootBag=addLootItem(character.lootBag,id,3).lootBag;
    assert.equal(character.gold,gold);assert.equal(character.lootBag.gold,0);assert.equal(getItemCount(character.inventory,id),0);
    character=settleLootBag(character).character;
    assert.equal(character.gold,gold);assert.equal(getItemCount(character.inventory,id),3);
    const sold=sellItem(character,id,{amount:2});
    assert.equal(sold.accepted,true);assert.equal(sold.value,price*2);
    assert.equal(sold.character.gold,gold+price*2);assert.equal(getItemCount(sold.character.inventory,id),1);
    assert.equal(sold.character.itemBuyback?.length||0,0);
    const restored=normalizeCharacter(JSON.parse(JSON.stringify(sold.character)));
    assert.equal(getItemCount(restored.inventory,id),1);assert.equal(restored.gold,gold+price*2);
  });
  test(`${name}: inventory overflow uses existing warehouse handling`,()=>{
    let character=createInitialCharacter({name:"OVERFLOW",job:"warrior"});
    character.inventory=grantItem(character.inventory,id,99).inventory;
    character.lootBag=addLootItem(character.lootBag,id,2).lootBag;
    const settled=settleLootBag(character);
    assert.equal(getItemCount(settled.character.inventory,id),99);
    assert.equal(settled.results[0].warehouse,2);
    assert.equal(settled.character.gold,character.gold);
  });
}

test("B70 uses the common 1-3 placement count and avoids stairs, NPCs and feature reservations",()=>{
  for(const [roll,count] of [[0,1],[0.34,2],[0.99,3]]) {
    buildBoundaryWallMap(70,()=>roll,{blackChestsUnlocked:true,maikaeferNestRoll:1});
    const red=cells.flat().filter(c=>c.treasure==="red");
    assert.equal(red.length,count);
    assert.equal(cells.flat().filter(c=>c.treasure==="black").length,1);
    for(const cell of red) {
      assert.equal(cell.type,"floor");assert.ok(!cell.npc);assert.equal(isDungeonFeatureOccupied(cell),false);
    }
  }
  for(let seed=1;seed<=20;seed++) {
    buildBoundaryWallMap(70,seeded(seed),{maikaeferNestRoll:1});
    const red=cells.flat().filter(c=>c.treasure==="red");
    assert.ok(red.length>=1&&red.length<=3);
    for(const cell of red) assert.equal(isDungeonFeatureOccupied(cell)||Boolean(cell.npc)||cell.type!=="floor",false);
  }
});

test("neighboring floors keep red placement and original loot; other chest types exclude new valuables",()=>{
  for(const depth of [69,71,72,73,74,75,76,77,78,79]) {
    buildBoundaryWallMap(depth,()=>0.5,{blackChestsUnlocked:true,maikaeferNestRoll:1});
    const reds=cells.flat().filter(c=>c.treasure==="red");
    assert.equal(reds.length,depth===69?2:0);
  }
  assert.equal(rollRedChestLoot(()=>0.05,69).itemId,"strong_healing_potion_small");
  assert.equal(rollRedChestLoot(()=>0.15,69).itemId,"strong_antidote");
  assert.equal(rollRedChestLoot(()=>0.5,69).kind,"equipment");
  for(const depth of [71,72,79]) {
    assert.equal(rollRedChestLoot(()=>0.1,depth).kind,"gold");
    assert.equal(rollRedChestLoot(()=>0.55,depth).itemId,"healing_potion");
    assert.equal(rollRedChestLoot(()=>0.75,depth).itemId,"antidote");
    assert.equal(rollRedChestLoot(()=>0.88,depth).equipmentId,"stiletto");
  }
  const ids=new Set(valuables.map(([id])=>id));
  for(let depth=1;depth<=100;depth++) for(let n=0;n<=100;n++) {
    const rng=()=>Math.min(n/100,0.999999);
    if(depth!==70) assert.equal(ids.has(rollRedChestLoot(rng,depth).itemId),false);
    assert.equal(ids.has(rollBlackChestLoot(rng,depth,"warrior").itemId),false);
    assert.equal(ids.has(rollPurpleChestLoot(rng,depth).itemId),false);
  }
});

test("B70 saved chests are preserved and opened/old empty cells gain no chests on restore",()=>{
  buildBoundaryWallMap(70,()=>0.5,{maikaeferNestRoll:1});
  const saved=structuredClone(cells);
  const red=saved.flat().filter(c=>c.treasure==="red");
  assert.equal(red.length,2); red[0].treasure=null;
  for(const cell of saved.flat()) assert.equal(getRestoredTreasureType(cell,{depth:70}),cell.treasure||null);
});