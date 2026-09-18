import test from 'node:test';
import assert from 'node:assert/strict';
import {getEventDoorTextureKind,LEO_ROOM_CLOSED_MESSAGE} from '../data/leo-room.js';
import {getSpecialRoomDefinition,rollMaikaeferNestContent} from '../data/special-rooms.js';
import {buildBoundaryWallMap,setDoor} from '../js/dungeon.js';
import {configurePlayer,state,tryMove,openDoorAhead,setPlayerInputEnabled} from '../js/player.js';
import {DIRS} from '../js/config.js';
test('Only B1 special doors use Leo, all other floors and door types retain their textures',()=>{
 for(let depth=1;depth<=100;depth++)for(const kind of ['normal','locked','boss','bossUnlocked','specialLocked','specialUnlocked']){
  assert.equal(getEventDoorTextureKind(depth,kind),depth===1&&kind.startsWith('special')?'leo':kind);
 }
 const room=getSpecialRoomDefinition(1);
 assert.equal(room.content.type,'leoPreparation');
 assert.equal(rollMaikaeferNestContent({room,roll:0}),null);
});
test('Sealed Leo entrance rejects movement and interaction even for previously opened doors',()=>{
 buildBoundaryWallMap(1);let message='';
 configurePlayer({say:s=>message=s,playSe:()=>{},cancelAutoReturn:()=>{},getSpecialDoorAccessBlock:()=>({blocked:true,sealed:true,message:LEO_ROOM_CLOSED_MESSAGE})});
 setPlayerInputEnabled(true);
 for(const kind of ['specialLocked','specialUnlocked'])for(const value of ['closed','open']){
  setDoor(2,2,'E',value,kind);
  Object.assign(state,{gridX:2,gridY:2,dir:DIRS.findIndex(d=>d.key==='E'),anim:null,overlayEvent:null,autoReturning:false});
  assert.equal(openDoorAhead(),true);assert.equal(state.anim,null);
  tryMove(1);assert.equal(state.anim,null);assert.equal(state.gridX,2);
  assert.equal(message,LEO_ROOM_CLOSED_MESSAGE);
 }
 configurePlayer({getSpecialDoorAccessBlock:()=>({blocked:false})});
});
