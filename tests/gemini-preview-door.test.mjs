import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGeminiPreviewDoor } from '../js/gemini-preview-door.js';
import { getSpecialRoomDefinition, rollMaikaeferNestContent } from '../data/special-rooms.js';
import { resetAllWalls, cells, setDoor, getSpecialRoomAtDoor } from '../js/dungeon.js';
import { configurePlayer, state, openDoorAhead, setPlayerInputEnabled } from '../js/player.js';
import { DIRS } from '../js/config.js';

test('B22 released entrance opens immediately without twenty bumps',t=>{
  // Random B1 rooms can shadow the B22 room via current.specialRoom.
  t.mock.method(Math,'random',()=>{throw Error('Door fixture must be deterministic');});
  resetAllWalls();
  const room={...getSpecialRoomDefinition(22),attemptsRemaining:1};
  cells[2][3].specialRoom=room;
  setDoor(2,2,'E','closed','specialLocked');
  assert.equal(getSpecialRoomAtDoor(2,2,'E'),room);
  Object.assign(state,{gridX:2,gridY:2,dir:DIRS.findIndex(d=>d.key==='E'),anim:null,overlayEvent:null,autoReturning:false});
  let message='';
  configurePlayer({say:s=>message=s,playSe:()=>{},onStateChanged:()=>{},cancelAutoReturn:()=>{},getSpecialDoorAccessBlock:()=>({blocked:false})});
  setPlayerInputEnabled(true);
  openDoorAhead();assert.equal(state.anim.type,'door');
  assert.equal(rollMaikaeferNestContent({room,roll:0}),null);
  assert.equal(inspectGeminiPreviewDoor(structuredClone(room)).unlocked,true);
  assert.equal(inspectGeminiPreviewDoor(getSpecialRoomDefinition(31),true),null);
  state.anim=null;
});
