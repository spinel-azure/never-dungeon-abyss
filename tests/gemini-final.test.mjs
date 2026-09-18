import test from 'node:test';
import assert from 'node:assert/strict';
import {getGeminiFinalAccess,completeGeminiFinal,isGeminiFinalPlacementCorrect} from '../data/gemini-final.js';
import {grantKeyItem,hasKeyItem} from '../data/key-items.js';
import {grantCard} from '../data/deck.js';
import {hasGeminiTransferMarker} from '../data/gemini-event.js';
import {createGeminiFinalEvent,handleGeminiFinalInput,updateGeminiFinal} from '../js/gemini-final-event.js';
import {buildBoundaryWallMap,cells} from '../js/dungeon.js';
function character(){return {eventFlags:{gemini_event_started:true,gemini_fourth_completed:true},keyItems:grantKeyItem(grantKeyItem([],'gemini_emblem_half').keyItems,'gemini_emblem_other_half').keyItems,cards:{deckSlots:['common_person_detection']}};}
test('Final access, unique reward, existing ownership, save/load and marker lifecycle',()=>{
 assert.ok(getGeminiFinalAccess({}).blocked);
 for(const owned of [false,true]) {
 const c=character();c.keyItems=grantKeyItem(c.keyItems,'queen_tiara').keyItems;if(owned)c.cards=grantCard(c.cards,'zodiac_gemini',1,8).cards;
 assert.equal(getGeminiFinalAccess(c).blocked,false);assert.ok(hasGeminiTransferMarker(c,70));
 assert.equal(completeGeminiFinal(c,[1,0]),null);assert.equal(completeGeminiFinal(c,[0,0]),null);
 assert.equal(completeGeminiFinal(c,[0,1]).gained,owned?0:1);
 const saved=JSON.parse(JSON.stringify(c));assert.ok(getGeminiFinalAccess(saved).blocked);assert.equal(completeGeminiFinal(saved,[0,1]),null);
 assert.equal(hasGeminiTransferMarker(saved,70),false);assert.ok(hasKeyItem(saved.keyItems,'gemini_emblem_half'));
 assert.equal(saved.cards.ownedCardCounts.zodiac_gemini,1);
 }
 const c=character();c.keyItems=[];assert.ok(getGeminiFinalAccess(c).blocked);
});
test('Placement supports cancellation, wrong order, unique pieces, timed convergence and single reward',()=>{
 const c=character();let rewards=0;const h={say(){},playSe(){},completeGeminiFinal:s=>{rewards++;return completeGeminiFinal(c,s);}};
 const e=createGeminiFinalEvent(1,1);const input=a=>handleGeminiFinalInput(e,a,h);
 input('confirm');input('confirm');updateGeminiFinal(e,e.sistersFadeOutStart+1501,h);assert.equal(e.phase,'finalSlots');
 input('confirm');input('cancel');assert.equal(e.phase,'finalSlots');
 input('confirm');input('right');input('confirm');assert.deepEqual(e.slots,[1,null]);
 input('right');input('confirm');input('confirm');assert.deepEqual(e.slots,[1,0]);assert.equal(e.phase,'finalSlots');
 input('cancel');assert.deepEqual(e.slots,[1,null]);
 input('confirm');input('right');input('confirm');assert.deepEqual(e.slots,[null,1]);
 input('left');input('confirm');input('confirm');assert.ok(isGeminiFinalPlacementCorrect(e.slots));assert.equal(e.phase,'finalArriving');
 updateGeminiFinal(e,e.sistersFadeStart+1801,h);assert.equal(e.phase,'finalMerging');
 updateGeminiFinal(e,e.mergeStart+2501,h);assert.equal(e.phase,'finalSpeech');
 input('confirm');updateGeminiFinal(e,e.sistersFadeOutStart+1501,h);assert.equal(e.phase,'gone');assert.equal(rewards,1);
 updateGeminiFinal(e,performance.now()+100000,h);assert.equal(rewards,1);
});
test('Refusing leaves retry available without reward; B73 has fixed event',()=>{
 const c=character(),e=createGeminiFinalEvent(1,1),h={say(){},playSe(){},completeGeminiFinal(){throw Error('unexpected reward');}};
 handleGeminiFinalInput(e,'confirm',h);handleGeminiFinalInput(e,'cancel',h);assert.equal(e.phase,'finalDecline');
 handleGeminiFinalInput(e,'confirm',h);updateGeminiFinal(e,e.sistersFadeOutStart+1501,h);assert.equal(e.phase,'gone');assert.equal(getGeminiFinalAccess(c).blocked,false);
 let seed=73;buildBoundaryWallMap(73,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),{});
 assert.equal(cells.flat().find(c=>c.specialRoom).specialRoom.content.type,'geminiFinal');
});
