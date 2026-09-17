import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiProgress,resolveGeminiChoice,resetGeminiRetry,completeGeminiSecond,hasGeminiTransferMarker,getGeminiFirstScenario} from '../data/gemini-event.js';
import {getSpecialRoomDefinition,rollMaikaeferNestContent} from '../data/special-rooms.js';
import {configurePlayer,state,startGeminiEvent,startGeminiSecondEvent,handleOverlayEventInput,updateAnimation} from '../js/player.js';

test('Retry scenes alternate on failure, survive save/load, and reward the displayed correct box',()=>{
  let c={};
  for(let i=0;i<4;i++) {
    const retry=i%2===1;
    assert.equal(geminiProgress(c).retryVariant,retry);
    const scenario=getGeminiFirstScenario(retry);
    assert.ok(scenario.background.endsWith(retry?'19b.avif':'19.avif'));
    assert.equal(resolveGeminiChoice(c,retry?'sun':'moon'),true);
    assert.equal(resolveGeminiChoice(c,retry?'moon':'sun'),false);
    c=JSON.parse(JSON.stringify(c));resetGeminiRetry(c);
  }
  resolveGeminiChoice(c,'moon');resetGeminiRetry(c);
  assert.equal(resolveGeminiChoice(c,'moon'),true);
  assert.ok(geminiProgress(c).completed);
  assert.equal(resolveGeminiChoice(c,'moon'),false);
});
test('B31 fixed room and markers move from B20 to B30 to B40 with source condition intact',()=>{
  const room=getSpecialRoomDefinition(31);
  assert.equal(room.content.type,'geminiSecond');
  assert.equal(rollMaikaeferNestContent({room,roll:0}),null);
  const c={eventFlags:{gemini_event_started:true},cards:{deckSlots:['common_person_detection']}};
  assert.equal(completeGeminiSecond(c),false);
  resolveGeminiChoice(c,'sun');assert.equal(hasGeminiTransferMarker(c,30),true);
  assert.equal(completeGeminiSecond(c),true);assert.equal(completeGeminiSecond(c),false);
  assert.equal(hasGeminiTransferMarker(c,30),false);assert.equal(hasGeminiTransferMarker(c,40),true);
  c.cards.deckSlots=[];assert.equal(hasGeminiTransferMarker(c,40),false);
  c.cards.deckSlots=['common_person_detection'];c.eventFlags.gemini_third_completed=true;
  assert.equal(hasGeminiTransferMarker(c,40),false);
});
test('Second act fades after two pages, saves completion, and revisits show only reminder',()=>{
  const c={eventFlags:{gemini_first_completed:true}};let message='';
  configurePlayer({getGeminiProgress:()=>geminiProgress(c),completeGeminiSecond:()=>completeGeminiSecond(c),
    say:s=>message=s,cancelAutoReturn:()=>{},onStateChanged:()=>{}});
  startGeminiSecondEvent(1,1);
  assert.ok(message.includes('また、お会いしました'));
  handleOverlayEventInput('cancel');assert.equal(state.overlayEvent.page,0);
  handleOverlayEventInput('confirm');assert.ok(message.includes('地下40階'));
  handleOverlayEventInput('confirm');assert.equal(state.overlayEvent.phase,'fading');
  assert.ok(c.eventFlags.gemini_second_completed);
  updateAnimation(state.overlayEvent.sistersFadeOutStart+1501);
  assert.equal(state.overlayEvent.phase,'gone');assert.ok(message.includes('燭台の火が静かに'));
  startGeminiSecondEvent(1,1);assert.equal(state.overlayEvent.phase,'gone');assert.ok(message.includes('反芻'));
  state.overlayEvent=null;
});
test('Retry A opens moon and produces reward with matching emblem',()=>{
  const c={eventFlags:{gemini_retry_variant:true}};let popup=0,emblem;
  configurePlayer({getGeminiProgress:()=>geminiProgress(c),say:()=>{},cancelAutoReturn:()=>{},onStateChanged:()=>{},
    playSe:()=>{},hideTreasure:()=>{},resolveGeminiChoice:choice=>resolveGeminiChoice(c,choice),
    showGeminiReward:()=>popup++,playTreasureOpening:(_,done,options)=>{emblem=options.emblem;done();}});
  startGeminiEvent(1,1);for(let i=0;i<4;i++)handleOverlayEventInput('confirm');
  handleOverlayEventInput('confirm');assert.equal(emblem,'moon');
  handleOverlayEventInput('confirm');assert.equal(popup,1);assert.ok(c.eventFlags.gemini_first_completed);
  state.overlayEvent=null;
});
