import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { collectStats } from "../combat/collect-stats.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { grantItem } from "../data/inventory.js";
import { getPlayerDefenseMaximum, getPlayerStatMaximum } from "../data/stat-caps.js";

const caps=[[30,60],[50,70],[70,80],[90,90]];
test("player caps follow reincarnation without changing enemies or NPC-like combatants",()=>{
 for(let count=0;count<=3;count+=1){
  const c=createInitialCharacter({name:"刻印",job:"warrior"});c.reincarnationCount=count;c.baseStats.str=999;c.def=999;
  assert.equal(getPlayerStatMaximum(count),caps[count][0]);assert.equal(getPlayerDefenseMaximum(count),caps[count][1]);
  assert.equal(collectStats(c).str,caps[count][0]);assert.equal(collectStats(c).def,caps[count][1]);
 }
 assert.equal(collectStats({stats:{str:47,int:1,agi:1,dex:1,luc:1},def:123}).str,30);
 assert.equal(collectStats({stats:{str:47,int:1,agi:1,dex:1,luc:1},def:123}).def,123);
});

test("engraving uses base cap, ignores capped equipment, persists, and never double-adds",()=>{
 let c=createInitialCharacter({name:"刻印",job:"warrior"});c.reincarnationCount=1;c.baseStats.str=49;c.equipmentStatBonuses={str:10};
 c.inventory=grantItem(c.inventory,"strength_engraving",2).inventory;
 assert.equal(collectStats(c).str,50);
 const used=resolveFieldItemUse({character:c,itemId:"strength_engraving",context:"town"});
 assert.equal(used.accepted,true);assert.equal(used.character.engravingStatBonuses.str,1);assert.equal(used.character.inventory.counts.strength_engraving,1);
 const loaded=normalizeCharacter(JSON.parse(JSON.stringify(used.character)));
 assert.equal(loaded.engravingStatBonuses.str,1);assert.equal(collectStats(loaded).str,50);
 const blocked=resolveFieldItemUse({character:loaded,itemId:"strength_engraving",context:"dungeon"});
 assert.equal(blocked.accepted,false);assert.equal(blocked.reason,"statMaximum");assert.equal(blocked.character,undefined);assert.match(blocked.message,/STRは上限/);
});

test("old saves default engraving bonuses to zero and battle use is forbidden",()=>{
 const old=createInitialCharacter({name:"旧",job:"mage"});delete old.engravingStatBonuses;
 const loaded=normalizeCharacter(old);assert.deepEqual(loaded.engravingStatBonuses,{str:0,int:0,agi:0,dex:0,luc:0});
 loaded.inventory=grantItem(loaded.inventory,"intelligence_engraving",1).inventory;
 assert.equal(resolveFieldItemUse({character:loaded,itemId:"intelligence_engraving",context:"battle"}).reason,"fieldOnly");
});
