import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiProgress,resolveGeminiChoice,resetGeminiRetry,GEMINI_PAGES} from '../data/gemini-event.js';
import {hasKeyItem} from '../data/key-items.js';
import {configurePlayer,state,startGeminiEvent,handleOverlayEventInput,updateAnimation} from '../js/player.js';
import {getDoorKind, setDoor} from '../js/dungeon.js';
test('Gemini sun grants a unique key item and persistent stage one completion',()=>{
  const c={};assert.equal(resolveGeminiChoice(c,'sun'),true);
  assert.ok(hasKeyItem(c.keyItems,'gemini_emblem_half'));
  const saved=JSON.parse(JSON.stringify(c));assert.ok(geminiProgress(saved).completed);
  assert.equal(resolveGeminiChoice(saved,'sun'),false);
  resetGeminiRetry(saved);assert.ok(geminiProgress(saved).completed);
});
test('Moon failure survives reload and blocks retries until a new expedition',()=>{
  const c={};resolveGeminiChoice(c,'moon');
  const saved=JSON.parse(JSON.stringify(c));assert.ok(geminiProgress(saved).blocked);
  assert.equal(resolveGeminiChoice(saved,'sun'),false);
  assert.ok(!hasKeyItem(saved.keyItems,'gemini_emblem_half'));
  resetGeminiRetry(saved);assert.equal(resolveGeminiChoice(saved,'sun'),true);
});
test('Gemini dialogue uses A, choice uses A/B, and opening ignores repeated input',()=>{
  for(const [input,symbol] of [['confirm','sun'],['cancel','moon']]) {
    const c={};let callback,options,message,popups=0;
    configurePlayer({say:s=>message=s,cancelAutoReturn:()=>{},playSe:()=>{},onStateChanged:()=>{},hideTreasure:()=>{},
      resolveGeminiChoice:choice=>resolveGeminiChoice(c,choice),showGeminiReward:()=>popups++,
      playTreasureOpening:(type,done,opt)=>{assert.equal(type,'black');callback=done;options=opt;}});
    startGeminiEvent(1,1);
    Object.assign(state,{gridX:2,gridY:1,x:2.5,y:1.5,anim:null});
    setDoor(1,1,'E','open','specialUnlocked');
    handleOverlayEventInput('cancel');assert.equal(state.overlayEvent.page,0);
    for(let i=0;i<GEMINI_PAGES.length;i++)handleOverlayEventInput('confirm');
    assert.equal(state.overlayEvent.phase,'choice');
    handleOverlayEventInput(input);assert.equal(options.emblem,symbol);assert.ok(options.plainOpening);
    handleOverlayEventInput('confirm');assert.equal(state.overlayEvent.phase,'opening');
    callback();assert.equal(state.overlayEvent.phase,'opened');
    handleOverlayEventInput('confirm');assert.equal(state.overlayEvent.phase,'result');
    assert.ok(message.includes(symbol==='sun'?'照らし合わせる':'残念'));
    assert.equal(popups,symbol==='sun'?1:0);
    assert.ok(!message.includes('貴重品'));
    handleOverlayEventInput('confirm');
    assert.equal(state.overlayEvent.phase,'fading');
    assert.equal(state.anim,null);
    handleOverlayEventInput('cancel');assert.equal(state.overlayEvent.phase,'fading');
    updateAnimation(state.overlayEvent.sistersFadeOutStart+1501);
    assert.equal(state.overlayEvent.phase,'gone');
    assert.ok(message.includes('姉妹の姿はない。迷宮の先でまた会えるだろう。'));
    handleOverlayEventInput('confirm');assert.equal(state.anim,null);
    handleOverlayEventInput('cancel');
    assert.equal(state.overlayEvent,null);
    assert.equal(getDoorKind(1,1,'E'),'specialLocked');
    assert.equal(state.anim.npcRetreat,true);
    assert.equal(state.anim.toGX,1);
    state.anim=null;
  }
});
