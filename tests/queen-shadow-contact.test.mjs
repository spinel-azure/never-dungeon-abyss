import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBoundaryWallMap,cells} from '../js/dungeon.js';
import {configurePlayer,state,manualMove,manualTurn,updateAnimation,handleOverlayEventInput,resetPlayer,setPlayerInputEnabled} from '../js/player.js';

for(const id of ['queen_shadow','queen_shadow_desert','queen_shadow_dark']) {
 test(`${id}: contact fades, blocks input, records once, and resets without stale callbacks`,()=>{
  buildBoundaryWallMap(10,()=>.5,{});
  for(const [x,y] of [[1,1],[2,1]]) Object.assign(cells[y][x],{type:'floor',npc:null,bossId:null,bossRemainsId:null,fountain:null,fixedWarp:null,fixedEvent:null,quicksand:null,rapidCurrent:null,treasure:null,questEvent:null,specialRoom:null,walls:{N:false,E:false,S:false,W:false},doors:{}});
  cells[1][2].npc=id;
  let count=0,message='';
  configurePlayer({say:s=>message=s,onNpcEncountered:()=>count++,onDungeonStep:()=>{},onStateChanged:()=>{},onRoamingEnemyPlayerStep:()=>({}),updateRoamingEnemyAnimation:()=>({})});
  Object.assign(state,{gridX:1,gridY:1,x:1.5,y:1.5,dir:1,angle:0,anim:null,overlayEvent:null,autoReturning:false});
  setPlayerInputEnabled(true);
  manualMove(1);
  assert.ok(state.anim);
  updateAnimation(state.anim.start+state.anim.duration+1);
  const event=state.overlayEvent;
  assert.equal(event.type,'npcContact');assert.equal(event.phase,'fading');assert.equal(message,'');assert.equal(count,1);assert.equal(cells[1][2].npc,null);
  for(const action of ['confirm','cancel','dismiss','up','down']) assert.equal(handleOverlayEventInput(action),true);
  manualMove(1);manualTurn(1);assert.equal(state.anim,null);assert.equal(state.gridX,2);assert.equal(state.dir,1);
  updateAnimation(event.fadeStartedAt+1499);assert.equal(event.phase,'fading');
  updateAnimation(event.fadeStartedAt+1500);assert.equal(event.phase,'message');assert.match(message,/Aボタン/);assert.equal(count,1);
  handleOverlayEventInput('confirm');assert.equal(state.overlayEvent,null);
  state.overlayEvent={...event,phase:'fading'};resetPlayer(1);message='reset';updateAnimation(event.fadeStartedAt+9999);
  assert.equal(state.overlayEvent,null);assert.equal(message,'reset');assert.equal(count,1);
 });
}
