import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import { calculateBattleExperienceReward } from "../js/character-services.js";

const silver="common_silver_beetle",gold="sr_golden_beetle",king="legendary_beetle_king";
test("beetle cards have approved costs and enabled V2 enemy drop routes",()=>{
 assert.deepEqual([getCardById(silver).cost,getCardById(gold).cost,getCardById(king).cost],[1,4,6]);
 assert.equal(getCardById(silver).acquisition.enabled,true);assert.equal(getCardById(silver).acquisition.dropRate,.03);
 assert.equal(getCardById(king).acquisition.enabled,true);assert.equal(getCardById(king).acquisition.dropRate,.02);
 assert.equal(getCardById(king).acquisition.enemyId,"maikaefer_koenig");
 assert.deepEqual([getCardById(silver).maxOwned,getCardById(silver).maxCopies,getCardById(silver).overflowGold],[1,1,1000]);
 assert.deepEqual([getCardById(king).maxOwned,getCardById(king).maxCopies,getCardById(king).overflowGold],[1,1,50000]);
});

test("new beetle cards use their dedicated card icons",()=>{
 assert.equal(getCardById(silver).iconId,"silver-beetle");
 assert.equal(getCardById(king).iconId,"beetle-king");
});
test("battle EXP bonuses add before one final floor",()=>{
 const c=createInitialCharacter({name:"甲虫",job:"thief"});
 const cases=[ [[],101], [[silver],111], [[gold],126], [[king],151], [[silver,gold],136], [[silver,king],161], [[gold,king],176], [[silver,gold,king],186] ];
 for(const [cards,expected] of cases){c.cards.deckSlots=cards;assert.equal(calculateBattleExperienceReward(c,101),expected,cards.join("+"));}
});
