import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import { calculateBattleExperienceReward } from "../js/character-services.js";

const silver="common_silver_beetle",gold="sr_golden_beetle",king="legendary_beetle_king";
test("beetle cards have approved costs and no enabled drop route",()=>{
 assert.deepEqual([getCardById(silver).cost,getCardById(gold).cost,getCardById(king).cost],[1,4,6]);
 assert.equal(getCardById(silver).acquisition.enabled,false);assert.equal(getCardById(king).acquisition.enabled,false);
 assert.equal(getCardById(king).acquisition.enemyId,"maikaefer_koenig");
});
test("battle EXP bonuses add before one final floor",()=>{
 const c=createInitialCharacter({name:"甲虫",job:"thief"});
 const cases=[ [[],101], [[silver],111], [[gold],126], [[king],151], [[silver,gold],136], [[silver,king],161], [[gold,king],176], [[silver,gold,king],186] ];
 for(const [cards,expected] of cases){c.cards.deckSlots=cards;assert.equal(calculateBattleExperienceReward(c,101),expected,cards.join("+"));}
});
