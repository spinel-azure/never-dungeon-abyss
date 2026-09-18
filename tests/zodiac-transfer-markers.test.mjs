import test from 'node:test';
import assert from 'node:assert/strict';
import {getZodiacTransferMarkers as markers} from '../data/zodiac-transfer-markers.js';
import {getCardById} from '../data/cards.js';
import {rollPurpleChestLoot} from '../data/loot.js';
import {grantKeyItem} from '../data/key-items.js';
const observed=()=>({cards:{deckSlots:['sr_astronomy']},eventFlags:{}});
test('Astronomy is SR cost 4 and enters existing purple chest SR rolls',()=>{
 const card=getCardById('sr_astronomy');assert.equal(card.rarity,'SR');assert.equal(card.cost,4);
 for(const depth of [3,70])assert.equal(rollPurpleChestLoot(()=>.999,depth).cardId,card.id);
});
test('Only equipped Astronomy detects guardians; ownership and former NPC detection do not',()=>{
 for(const c of [{},{cards:{ownedCardCounts:{sr_astronomy:1}}},{cards:{deckSlots:['common_person_detection']}},{keyItems:grantKeyItem(null,'royal_cat_medal').keyItems}])assert.deepEqual(markers(c,10),[]);
 const c=observed();assert.deepEqual(markers(c,10),['aquarius']);assert.deepEqual(markers(c,40),['cancer']);assert.deepEqual(markers(c,60),['scorpio']);assert.deepEqual(markers(c,70),['pisces']);assert.deepEqual(markers(c,90),['sagittarius']);
 c.eventFlags.boss_wassermannfrau_b18f_defeated=true;assert.deepEqual(markers(c,10),[]);
 c.cards.ownedCardCounts={zodiac_cancer:1};assert.deepEqual(markers(c,40),[]);
 c.cards.deckSlots=[];assert.deepEqual(markers(c,90),[]);
});
test('Gemini retains legacy discovery while Astronomy discovers and follows the active act',()=>{
 const c=observed();assert.deepEqual(markers(c,20),['gemini']);
 c.eventFlags.gemini_second_completed=true;assert.deepEqual(markers(c,40),['gemini','cancer']);
 c.eventFlags.gemini_final_completed=true;assert.deepEqual(markers(c,40),['cancer']);
 const legacy={eventFlags:{gemini_event_started:true},cards:{deckSlots:['common_person_detection']}};
 assert.deepEqual(markers(legacy,20),['gemini']);assert.deepEqual(markers(legacy,40),[]);
 assert.deepEqual(markers(JSON.parse(JSON.stringify(c)),40),['cancer']);
});
test('Virgo points to the active guild objective, then disappears when the dungeon task is done',()=>{
 const c=observed();c.quests={active:{guild_033:{progress:0}},completedQuestIds:[]};
 assert.deepEqual(markers(c,90),['sagittarius','virgo']);
 c.eventFlags.lichtbringer_b95f_found=true;assert.deepEqual(markers(c,90),['sagittarius']);
});
