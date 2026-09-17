import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiProgress,canEnterGeminiThird,completeGeminiThirdVisit,hasGeminiTransferMarker} from '../data/gemini-event.js';
import {getSpecialRoomDefinition,rollMaikaeferNestContent} from '../data/special-rooms.js';
import {configurePlayer,state,startGeminiThirdEvent,handleOverlayEventInput,updateAnimation} from '../js/player.js';
import {drawGeminiEvent} from '../js/gemini-event-renderer.js';

test('Third act gates, saves, fixed rooms and marker persist until red sister finishes',()=>{
 const c={eventFlags:{gemini_event_started:true},cards:{deckSlots:['common_person_detection']}};
 assert.equal(canEnterGeminiThird(c,'white'),false);
 c.eventFlags.gemini_second_completed=true;
 assert.equal(canEnterGeminiThird(c,'red'),false);
 assert.equal(completeGeminiThirdVisit(c,'red'),false);
 assert.equal(completeGeminiThirdVisit(c,'white'),true);
 const saved=JSON.parse(JSON.stringify(c));
 assert.equal(canEnterGeminiThird(saved,'red'),true);
 assert.equal(hasGeminiTransferMarker(saved,40),true);
 assert.equal(completeGeminiThirdVisit(saved,'white'),false);
 assert.equal(completeGeminiThirdVisit(saved,'red'),true);
 assert.equal(geminiProgress(saved).thirdCompleted,true);
 assert.equal(hasGeminiTransferMarker(saved,40),false);
 for(const [floor,sister] of [[44,'white'],[48,'red']]) {
  assert.equal(canEnterGeminiThird(saved,sister),false);
  const room=getSpecialRoomDefinition(floor);assert.equal(room.content.sister,sister);
  assert.equal(rollMaikaeferNestContent({room,roll:0}),null);
 }
});
test('Single-sister dialogue fades, saves only at end and exits with A; white revisit recalls hint',()=>{
 const c={eventFlags:{gemini_second_completed:true}};let message='';
 configurePlayer({getGeminiProgress:()=>geminiProgress(c),completeGeminiThirdVisit:s=>completeGeminiThirdVisit(c,s),
 say:s=>message=s,cancelAutoReturn:()=>{},onStateChanged:()=>{}});
 for(const [sister,count] of [['white',2],['red',3]]) {
  startGeminiThirdEvent(1,1,sister);assert.equal(state.overlayEvent.sister,sister);
  Object.assign(state,{gridX:2,gridY:1,x:2.5,y:1.5,anim:null});
  handleOverlayEventInput('cancel');assert.equal(state.overlayEvent.page,0);
  for(let i=0;i<count;i++)handleOverlayEventInput('confirm');
  assert.equal(state.overlayEvent.phase,'fading');
  handleOverlayEventInput('confirm');assert.equal(state.overlayEvent.phase,'fading');
  updateAnimation(state.overlayEvent.sistersFadeOutStart+1501);
  assert.ok(message.includes(sister==='white'?'静かに姿':'クスクス'));
  handleOverlayEventInput('confirm');assert.equal(state.overlayEvent,null);assert.ok(state.anim.npcRetreat);state.anim=null;
  if(sister==='white') {
   startGeminiThirdEvent(1,1,sister);assert.equal(state.overlayEvent.phase,'gone');assert.ok(message.includes('4つ下'));state.overlayEvent=null;
  }
 }
 assert.ok(c.eventFlags.gemini_third_completed);
});
test('Canvas draws only the selected sister on her original side and removes her after fading',()=>{
 const previous=globalThis.window;globalThis.window={matchMedia:()=>({matches:false})};
 try {
  const images=new Map(['white','red'].map(k=>['gemini_'+k,{id:k,naturalWidth:100,naturalHeight:200}]));
  images.set('bg',{id:'bg',complete:true,naturalWidth:800});
  const drawn=[];const ctx={fillRect(){},save(){},restore(){},drawImage(image,x){drawn.push([image.id,x]);}};
  for(const sister of ['white','red']) {
   drawn.length=0;const event={act:3,sister,page:0,phase:'dialogue',background:'bg'};
   drawGeminiEvent(ctx,event,800,450,images,()=>{});
   assert.deepEqual(drawn.map(x=>x[0]),['bg',sister]);
   assert.equal(drawn[1][1]<400,sister==='white');
   drawn.length=0;event.phase='gone';drawGeminiEvent(ctx,event,800,450,images,()=>{});assert.deepEqual(drawn.map(x=>x[0]),['bg']);
  }
 }finally{globalThis.window=previous;}
});
