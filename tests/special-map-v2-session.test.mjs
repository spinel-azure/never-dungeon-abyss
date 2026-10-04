import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapV2Session,confirmV2Cell,getV2StairDestination,switchV2Floor,getV2StairPrompt,completeV2KeyChest,cancelV2KeyChest,cancelV2CellPrompt} from '../js/special-map/session-v2.js';
import {actSpecialMap,updateSpecialMotion,openSpecialDoorAhead,specialDoorState,startSpecialAutoWalker,continueSpecialAutoWalker,getSpecialAutoAvailability,flushSpecialSurvey} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {resolveSpecialFieldItem,applySpecialFieldEnvironment} from '../js/special-map/field-environment.js';
import {attachSpecialMap,getSpecialMapContext} from '../js/special-map/context.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'†ルル'};
const create=(options={})=>createSpecialMapV2Session([original],mapOriginalId(original),options);
const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
let clock=0;
function act(s,a){clock+=600;const result=actSpecialMap(s,a,clock);updateSpecialMotion(s,clock+600);return result;}
function face(s,d){while(s.direction!==d)assert.ok(act(s,'right'));}
function go(s,p){
 cancelV2CellPrompt(s); // B: leave this event cell without using it.
 const start=s.playerY*10+s.playerX,end=p.y*10+p.x,queue=[start],seen=new Map([[start,[]]]);
 for(const i of queue){if(i===end)break;for(let d=0;d<4;d++){
  const x=i%10,y=Math.floor(i/10),nx=x+dx[d],ny=y+dy[d],j=ny*10+nx;
  if(s.cells[y][x].walls[dirs[d]]||s.isDoorLocked(x,y,dirs[d])||nx<0||ny<0||nx>=10||ny>=10||seen.has(j))continue;
  seen.set(j,[...seen.get(i),d]);queue.push(j);
 }}
 assert.ok(seen.has(end),'reachable destination');
 for(const d of seen.get(end)){
  cancelV2CellPrompt(s);
  face(s,d);if(specialDoorState(s,s.playerX,s.playerY,dirs[d])==='closed'){assert.ok(openSpecialDoorAhead(s,clock));updateSpecialMotion(s,clock+600);clock+=600;}
  assert.ok(act(s,'up'));
 }
}
function stairs(s,down){
 go(s,down?s.generatedMap.stairsDown:s.generatedMap.stairsUp);
 const fuel=s.torchFuel,dest=getV2StairDestination(s);assert.ok(dest);
 assert.deepEqual(confirmV2Cell(s,clock).destination,dest);switchV2Floor(s,dest);
 assert.equal(s.torchFuel,fuel);assert.equal(s.playerX,dest.x);assert.equal(s.playerY,dest.y);
}

test('V2 starts registered-only on floor 1, preserves blueprint and separates runtime from persistent knowledge',()=>{
 const s=create();
 assert.equal(s.kind,'specialMapV2');assert.equal(s.currentFloor,0);assert.equal(s.torchFuel,100);assert.equal(s.fingerprint,'3519b715');
 assert.equal(s.cells[s.playerY][s.playerX].type,'stairsUp');assert.equal(s.cells[s.playerY][s.playerX].walls[dirs[s.direction]],false);
 assert.deepEqual(s.floors.map(f=>f.explored.flat().filter(Boolean).length),[1,0,0]);
 assert.equal(getV2StairDestination(s),null);assert.equal(confirmV2Cell(s,0).destination,undefined);
 assert.ok(flushSpecialSurvey(s));assert.equal(s.totalSurveyed,1);assert.equal(s.surveyComplete,false);
 assert.throws(()=>createSpecialMapV2Session([],mapOriginalId(original)));
 const decoded=decodeMapCode(encodeMapCode(original)).map;
 assert.deepEqual(createSpecialMapV2Session([decoded],mapOriginalId(decoded)).blueprint,s.blueprint);
});

test('V2 boundary seed floor arrivals face an opening and share torch without marking unvisited floors',()=>{
 for(const seed of [0,1,12345,65535]){
  const map={...original,seed},s=createSpecialMapV2Session([map],mapOriginalId(map));
  const before=JSON.stringify(s.blueprint);s.renderState.torchFuel=61;
  for(const link of s.blueprint.links)for(const destination of [link.lower,link.upper]){
   switchV2Floor(s,destination);assert.equal(s.cells[s.playerY][s.playerX].walls[dirs[s.direction]],false);assert.equal(s.renderState.torchFuel,61);
  }
  assert.equal(JSON.stringify(s.blueprint),before);
  assert.ok(s.floors.every(f=>f.explored.flat().filter(Boolean).length<=2));
 }
});

test('stairs round trips retain per-floor runtime and one torch, without changing character or blueprint',()=>{
 const s=create(),before=JSON.stringify(s.blueprint),source=JSON.stringify(original),render=s.renderState,first=s.floors[0];
 stairs(s,true);const count=first.explored.flat().filter(Boolean).length;assert.ok(count>1);assert.equal(s.currentFloor,1);
 stairs(s,false);assert.equal(s.currentFloor,0);assert.equal(s.floors[0],first);assert.equal(s.surveyedCount,count);
 stairs(s,true);stairs(s,true);assert.equal(s.currentFloor,2);stairs(s,false);stairs(s,true);stairs(s,false);stairs(s,false);
 assert.equal(s.renderState,render);assert.equal(JSON.stringify(s.blueprint),before);assert.equal(JSON.stringify(original),source);
 assert.equal(s.currentFloor,0);assert.equal(create().torchFuel,100);
});

test('key chest, locked gate, unlock, autoclose, boss cell and cross-floor key retention',()=>{
 const sounds=[],s=create({playSe:id=>sounds.push(id)});stairs(s,true);stairs(s,true);
 const f=s.generatedMap,room=f.bossRoom;
 go(s,room.approach);const first=room.cells[0];face(s,dirs.findIndex((_,d)=>s.playerX+dx[d]===first.x&&s.playerY+dy[d]===first.y));
 assert.equal(openSpecialDoorAhead(s,clock),false);assert.equal(act(s,'up'),false);assert.equal(s.bossDoorUnlocked,false);
 go(s,f.keyChest);assert.equal(s.cells[s.playerY][s.playerX].treasure,'gold');
 assert.equal(confirmV2Cell(s,clock).openKeyChest,true);assert.equal(s.bossKeyFound,false);assert.equal(s.transitioning,true);completeV2KeyChest(s);assert.equal(s.bossKeyFound,true);assert.equal(s.cells[s.playerY][s.playerX].treasure,null);
 confirmV2Cell(s,clock);assert.equal(sounds.filter(id=>id==='importantItem').length,1);
 stairs(s,false);stairs(s,true);assert.equal(s.bossKeyFound,true);assert.equal(s.floors[2].chestOpened,true);
 go(s,room.approach);face(s,dirs.findIndex((_,d)=>s.playerX+dx[d]===first.x&&s.playerY+dy[d]===first.y));
 assert.ok(openSpecialDoorAhead(s,clock));assert.equal(s.bossDoorUnlocked,true);assert.equal(actSpecialMap(s,'up',clock+1),false);
 updateSpecialMotion(s,clock+600);clock+=600;assert.ok(act(s,'up'));assert.equal(s.openedDoors.size,0);
 go(s,room.bossCell);assert.equal(s.explored[room.bossCell.y][room.bossCell.x],true);
 assert.equal(s.cells[s.playerY][s.playerX].bossId,undefined);assert.equal(sounds.includes('battleStart'),false);
 assert.ok(startSpecialAutoWalker(s));const fuel=s.torchFuel,steps=s.autoPath.length;
 for(let n=0;n<1000&&s.autoPath;n++){clock+=600;updateSpecialMotion(s,clock);continueSpecialAutoWalker(s,clock);}
 assert.equal(s.autoPath,null);assert.equal(s.playerX,f.stairsUp.x);assert.equal(s.playerY,f.stairsUp.y);assert.equal(s.currentFloor,2);
 assert.equal(s.torchFuel,Math.max(0,fuel-steps));assert.equal(s.openedDoors.size,0);assert.equal(s.bossDoorUnlocked,true);
 assert.equal(create().bossKeyFound,false);assert.equal(create().bossDoorUnlocked,false);
});

test('V2 auto walker only knows visited cells; locked doors excluded even with synthetic full knowledge',()=>{
 const s=create();assert.equal(startSpecialAutoWalker(s),false);
 const entrance=s.generatedMap.entrance;assert.ok(act(s,'up'));
 const visited=s.surveyView.map(row=>[...row]);assert.ok(getSpecialAutoAvailability(s).accepted);s.surveyView.forEach(row=>row.fill(false));
 assert.equal(getSpecialAutoAvailability(s).accepted,false);s.surveyView.forEach((row,y)=>row.splice(0,10,...visited[y]));
 assert.ok(startSpecialAutoWalker(s));for(let i=0;i<15&&s.autoPath;i++){clock+=600;updateSpecialMotion(s,clock);continueSpecialAutoWalker(s,clock);}
 assert.equal(s.playerX,entrance.x);assert.equal(s.playerY,entrance.y);
 stairs(s,true);stairs(s,true);s.surveyView.forEach(row=>row.fill(true));const boss=s.generatedMap.bossRoom.bossCell;s.playerX=boss.x;s.playerY=boss.y;
 assert.equal(getSpecialAutoAvailability(s).accepted,false);
});

test('V2 transition locks input, torch items target shared fuel, one active context only',()=>{
 const s=create();s.transitioning=true;
 assert.equal(actSpecialMap(s,'up',0),false);assert.equal(openSpecialDoorAhead(s,0),false);assert.equal(getV2StairDestination(s),null);assert.equal(startSpecialAutoWalker(s),false);
 s.transitioning=false;s.renderState.torchFuel=12;
 const character={hp:10,maxHp:10,sp:10,maxSp:10,inventory:{counts:{guiding_torch:1,warding_incense:1}},keyItems:{red_rust_key_b9f:true}};
 const r=resolveSpecialFieldItem({character,itemId:'guiding_torch',session:s});assert.ok(r.accepted);applySpecialFieldEnvironment(s,r.environment);assert.equal(s.torchFuel,100);
 assert.equal(s.bossKeyFound,false);assert.equal(resolveSpecialFieldItem({character,itemId:'warding_incense',session:s}).accepted,false);
 const detach=attachSpecialMap({session:s});assert.throws(()=>attachSpecialMap({session:create()}));detach();assert.equal(getSpecialMapContext(),null);
});
