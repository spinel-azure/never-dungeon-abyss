import test from 'node:test';
import assert from 'node:assert/strict';
import {STEP_MS,TURN_MS,DOOR_OPEN_MS} from '../js/config.js';
import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,openSpecialDoorAhead,specialDoorState} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
const original={rulesetVersion:'special-map-v1',seed:12345,discovererName:'†ルル'};
function fixture(){const sounds=[],messages=[];const s=createSpecialMapSession([original],mapOriginalId(original),{playSe:id=>sounds.push(id),say:t=>messages.push(t)});return {s,sounds,messages};}
function faceDoor(s){const door=s.doorLayout.doors[0];s.playerX=door.x;s.playerY=door.y;s.direction=door.dir==='E'?1:2;s.renderState.x=door.x+.5;s.renderState.y=door.y+.5;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;return door;}
for(const action of ['up','down'])test(`${action}: close the crossed canonical door only on step completion, then reopen from opposite side`,()=>{
 const {s,sounds}=fixture(),door=faceDoor(s),initialDirection=s.direction;
 assert.ok(openSpecialDoorAhead(s,0));assert.equal(s.renderState.anim.duration,DOOR_OPEN_MS);
 assert.equal(openSpecialDoorAhead(s,1),false);assert.equal(actSpecialMap(s,'up',1),false);assert.deepEqual(sounds,[]);
 updateSpecialMotion(s,DOOR_OPEN_MS);
 // Turning away leaves the open door untouched.
 assert.ok(actSpecialMap(s,'right',600));updateSpecialMotion(s,600+TURN_MS);assert.ok(s.openedDoors.has(door.key));
 s.direction=action==='up'?initialDirection:(initialDirection+2)%4;
 assert.ok(actSpecialMap(s,action,1000));assert.equal(s.motion.crossedDoor,door.key);assert.equal(s.motion.duration,STEP_MS);
 assert.equal(actSpecialMap(s,action,1001),false);assert.equal(openSpecialDoorAhead(s,1001),false);assert.deepEqual(sounds,['step']);
 updateSpecialMotion(s,1000+STEP_MS-1);assert.ok(s.openedDoors.has(door.key));
 updateSpecialMotion(s,1000+STEP_MS);assert.equal(s.openedDoors.size,0);
 assert.equal(specialDoorState(s,door.x,door.y,door.dir),'closed');
 const reverse=door.dir==='E'?'W':'N';assert.equal(specialDoorState(s,s.playerX,s.playerY,reverse),'closed');
 s.direction=(initialDirection+2)%4;assert.ok(openSpecialDoorAhead(s,1300));updateSpecialMotion(s,1300+DOOR_OPEN_MS);
 assert.ok(actSpecialMap(s,'up',1900));updateSpecialMotion(s,1900+STEP_MS);assert.equal(s.openedDoors.size,0);assert.deepEqual(sounds,['step','step']);
});
test('successful forward/back steps sound once, collisions shake and never step, busy inputs are silent',()=>{
 const {s,sounds,messages}=fixture();
 assert.ok(actSpecialMap(s,'up',0));assert.equal(s.renderState.shake,3);assert.equal(actSpecialMap(s,'down',1),false);
 updateSpecialMotion(s,STEP_MS);assert.ok(actSpecialMap(s,'down',200));assert.equal(s.renderState.shake,-2);updateSpecialMotion(s,200+STEP_MS);
 assert.deepEqual(sounds,['step','step']);sounds.length=0;
 s.direction=3;assert.equal(actSpecialMap(s,'up',400),false);assert.deepEqual(sounds,['blocked']);assert.equal(s.renderState.shake,-12);assert.equal(messages.at(-1),'そちらには進めない。');
 s.direction=1;assert.equal(actSpecialMap(s,'down',400),false);assert.equal(s.renderState.shake,9);
 faceDoor(s);assert.equal(actSpecialMap(s,'up',400),false);assert.equal(messages.at(-1),'扉がある。\n＊Aボタンで開く');assert.ok(sounds.every(id=>id==='blocked'));
 assert.ok(openSpecialDoorAhead(s,500));const count=sounds.length;assert.equal(actSpecialMap(s,'left',501),false);assert.equal(actSpecialMap(s,'up',501),false);assert.equal(sounds.length,count);
});
test('turn duration and easing match ordinary exploration without surveying or footsteps',()=>{
 const {s,sounds}=fixture(),count=s.surveyedCount,angle=s.renderState.angle;
 assert.ok(actSpecialMap(s,'right',0));assert.equal(s.motion.duration,TURN_MS);assert.equal(s.renderState.shake,2);
 updateSpecialMotion(s,TURN_MS/4);assert.equal(s.renderState.angle,angle+Math.PI/2*.125);
 updateSpecialMotion(s,TURN_MS);assert.equal(s.motion,null);assert.equal(s.surveyedCount,count);assert.deepEqual(sounds,[]);
 assert.ok(actSpecialMap(s,'left',200));assert.equal(s.renderState.shake,-2);
});
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('special renderer binds ordinary pointer/touch minimap handlers and removes them on return',()=>{
 const source=readFileSync(new URL('../js/renderer.js',import.meta.url),'utf8');
 const listeners=new Map(),canvas={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{assert.equal(listeners.get(type),fn);listeners.delete(type);},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})};
 const renderer={state:{torchFuel:0},canvas:null,W:960,H:540,minimapOverlayVisible:false,lastCanvasTouchAt:0,getMinimapBounds:()=>({x:800,y:10,w:140,h:140})};
 const originalState=renderer.state;
 const scope={renderer,setWallColor(){},setFloorColor(){},Date:{now:()=>1000},hasEffectiveMinimap:state=>state.minimapEffectForced===true};
 vm.runInNewContext(source.slice(source.indexOf('function handleCanvasPointerUp'),source.indexOf('function hasEffectiveTorch'))+'\n'+source.slice(source.indexOf('export function useSpecialMapRenderSource')).replace('export function','function')+';this.bind=useSpecialMapRenderSource;',scope);
 const dispose=scope.bind({canvas,state:{minimapEffectForced:true}},'torture');
 listeners.get('pointerup')({clientX:810,clientY:20});assert.equal(renderer.minimapOverlayVisible,true);
 listeners.get('touchend')({changedTouches:[{clientX:300,clientY:300}]});assert.equal(renderer.minimapOverlayVisible,false);
 listeners.get('pointerup')({clientX:810,clientY:20});assert.equal(renderer.minimapOverlayVisible,false,'synthetic pointer after touch must not toggle twice');
 dispose();assert.equal(listeners.size,0);assert.equal(renderer.state,originalState);
});
test('gamepad map action reaches special exploration before the ordinary world-location gate',()=>{
 const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('    toggleMinimap: () => {')).split('\n    }')[0].replace('    toggleMinimap: () => {','');
 const calls=[];const scope={handleSpecialMapInput:action=>{calls.push(action);return true;}};
 vm.runInNewContext('this.toggle=()=>{'+body+'};',scope);assert.equal(scope.toggle(),true);assert.deepEqual(calls,['map']);
 // With no special session the ordinary dungeon gate and toggle stay intact.
 Object.assign(scope,{handleSpecialMapInput:()=>false,endingSequenceActive:false,michaelaRestorationController:{isActive:()=>false},handleBlockingTutorialInput:()=>false,recordUserInput(){},worldLocation:'town',isBattleActive:()=>false,isMenuOpen:()=>false,sceneTransitionRunning:false,state:{},toggleMinimapOverlay:()=>{calls.push('ordinary');return true;}});
 assert.equal(scope.toggle(),false);scope.worldLocation='dungeon';assert.equal(scope.toggle(),true);assert.equal(calls.at(-1),'ordinary');
});
