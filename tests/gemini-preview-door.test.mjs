import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGeminiPreviewDoor } from '../js/gemini-preview-door.js';
import { getSpecialRoomDefinition, rollMaikaeferNestContent } from '../data/special-rooms.js';
import { buildBoundaryWallMap, cells, setDoor, attemptSpecialRoomUnlock } from '../js/dungeon.js';
import { configurePlayer, state, tryMove, openDoorAhead, setPlayerInputEnabled } from '../js/player.js';
import { DIRS } from '../js/config.js';

test('B22 public preview opens only on twentieth forward bump; A and guaranteed unlock cannot bypass it',()=>{
  buildBoundaryWallMap();
  const room={...getSpecialRoomDefinition(22),attemptsRemaining:1};
  cells[2][3].specialRoom=room;
  setDoor(2,2,'E','closed','specialLocked');
  Object.assign(state,{gridX:2,gridY:2,dir:DIRS.findIndex(d=>d.key==='E'),anim:null,overlayEvent:null,autoReturning:false});
  let message='';
  configurePlayer({say:s=>message=s,playSe:()=>{},onStateChanged:()=>{},cancelAutoReturn:()=>{},getSpecialDoorAccessBlock:()=>({blocked:false})});
  setPlayerInputEnabled(true);
  for(let i=0;i<25;i++) openDoorAhead();
  assert.equal(state.anim,null);
  assert.equal(attemptSpecialRoomUnlock({x:2,y:2,dirKey:'E',guaranteed:true}).accepted,false);
  for(let i=0;i<19;i++){tryMove(1);assert.equal(state.anim,null);assert.equal(message,room.content.accessBlockedMessage);}
  tryMove(1);assert.equal(state.anim.type,'door');
  assert.equal(rollMaikaeferNestContent({room,roll:0}),null);
  assert.equal(inspectGeminiPreviewDoor(structuredClone(room)).unlocked,false);
  assert.equal(inspectGeminiPreviewDoor(getSpecialRoomDefinition(31),true),null);
  state.anim=null;
});
