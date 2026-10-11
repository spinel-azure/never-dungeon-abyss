import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {actSpecialMap,updateSpecialMotion} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'QA'};
for(const facing of [0,1,2,3])for(const side of [-1,1])test(`V2 strafe ${side} facing ${facing} keeps facing and runs one arrival`,()=>{
 let steps=0;const s=createSpecialMapV2Session([map],mapOriginalId(map),{scheduleSurvey:()=>null,onEnvironmentStep:()=>steps++});
 s.playerX=4;s.playerY=4;s.direction=facing;s.renderState.x=4.5;s.renderState.y=4.5;s.renderState.angle=facing*Math.PI/2-Math.PI/2;
 const d=(facing+side+4)%4,key=['N','E','S','W'][d];s.cells[4][4].walls[key]=false;
 const angle=s.renderState.angle;assert.equal(actSpecialMap(s,side<0?'strafeLeft':'strafeRight',0),true);
 assert.equal(s.direction,facing);assert.equal(s.motion.toAngle,angle);assert.equal(steps,0);
 updateSpecialMotion(s,200);assert.equal(steps,1);assert.equal(s.torchFuel,99);
 assert.equal(s.playerX,4+[0,1,0,-1][d]);assert.equal(s.playerY,4+[-1,0,1,0][d]);
 assert.equal(s.surveyView[s.playerY][s.playerX],true);
});
test('V2 strafe cannot pass a wall or closed boss door',()=>{
 const s=createSpecialMapV2Session([map],mapOriginalId(map),{scheduleSurvey:()=>null});
 s.cells[s.playerY][s.playerX].walls[['N','E','S','W'][(s.direction+1)%4]]=true;
 assert.equal(actSpecialMap(s,'strafeRight',0),false);assert.equal(s.torchFuel,100);
 s.currentFloor=2;const door=s.doorLayout.doors[0];s.playerX=door.x;s.playerY=door.y;s.direction=(['N','E','S','W'].indexOf(door.dir)+3)%4;
 assert.equal(actSpecialMap(s,'strafeRight',0),false);assert.equal(s.bossDoorUnlocked,false);
});
