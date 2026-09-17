import test from 'node:test';
import assert from 'node:assert/strict';
import {getGeminiFourthAccess,getGeminiFourthQuestion,resolveGeminiFourth,GEMINI_FOURTH_QUESTIONS,hasGeminiTransferMarker} from '../data/gemini-event.js';
import {hasKeyItem} from '../data/key-items.js';
import {buildBoundaryWallMap,cells} from '../js/dungeon.js';
import {configurePlayer,state,startGeminiFourthEvent,handleOverlayEventInput,updateAnimation} from '../js/player.js';
test('B59 event coexists with floor boss and does not become insect room',()=>{
 let seed=59;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 buildBoundaryWallMap(59,rng,{});
 const room=cells.flat().find(c=>c.specialRoom);
 assert.equal(room.specialRoom.content.type,'geminiFourth');
 assert.ok(cells.flat().some(c=>c.bossId==='fleischfresser_b59f'));
});
test('Fourth questions have one solution, persist retry and grant only once',()=>{
 assert.ok(getGeminiFourthAccess({}).blocked);
 for(let q=0;q<3;q++) {
  const c={eventFlags:{gemini_third_completed:true,gemini_event_started:true,gemini_fourth_question:q},cards:{deckSlots:['common_person_detection']}};
  assert.ok(hasGeminiTransferMarker(c,50));
  const correct=GEMINI_FOURTH_QUESTIONS[q].correct;
  assert.equal(resolveGeminiFourth(c,(correct+1)%3,.9).correct,false);
  const saved=JSON.parse(JSON.stringify(c));assert.equal(getGeminiFourthQuestion(saved),2);
  assert.equal(resolveGeminiFourth(saved,1).correct,true);
  assert.ok(hasKeyItem(saved.keyItems,'gemini_emblem_other_half'));
  assert.equal(resolveGeminiFourth(saved,1),null);assert.ok(getGeminiFourthAccess(saved).blocked);
  assert.equal(hasGeminiTransferMarker(saved,50),false);
 }
});
test('Fourth selector wraps with sound; failure and success fade and reward is not repeated',()=>{
 for(const correct of [false,true]) {
 const c={eventFlags:{gemini_third_completed:true}};let sounds=0,rewards=0;
 configurePlayer({say:()=>{},cancelAutoReturn:()=>{},onStateChanged:()=>{},getGeminiFourthQuestion:()=>0,
 resolveGeminiFourth:n=>resolveGeminiFourth(c,n,0),showGeminiFourthReward:()=>rewards++,playSe:s=>{if(s==='cursorMove')sounds++;}});
 startGeminiFourthEvent(1,1);for(let i=0;i<3;i++)handleOverlayEventInput('confirm');
 assert.equal(state.overlayEvent.phase,'stoneChoice');handleOverlayEventInput('left');assert.equal(state.overlayEvent.selection,2);
 if(!correct)handleOverlayEventInput('right');
 handleOverlayEventInput('confirm');assert.equal(rewards,correct?1:0);assert.ok(sounds);
 handleOverlayEventInput('confirm');if(correct)handleOverlayEventInput('confirm');
 assert.equal(state.overlayEvent.phase,'fading');updateAnimation(state.overlayEvent.sistersFadeOutStart+1501);assert.equal(state.overlayEvent.phase,'gone');
 state.overlayEvent=null;
 }
});
