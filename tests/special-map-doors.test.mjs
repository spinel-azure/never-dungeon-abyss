import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSpecialMapDoors,doorKey} from '../js/special-map/doors.js';
import {generateSpecialMap,specialMapFingerprint} from '../js/special-map/generator.js';
import {createSpecialMapSession,specialDoorState,openSpecialDoorAhead,actSpecialMap,updateSpecialMotion} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {checkDoors} from './special-map-doors-helper.mjs';
const rules='special-map-v1',original={rulesetVersion:rules,seed:12345,discovererName:'†ルル'};
const create=(m=original)=>createSpecialMapSession([m],mapOriginalId(m));
for(const seed of [0,1,12345,65535])test(`doors ${seed}: deterministic, valid, independent of topology mutation`,()=>{
 const map=generateSpecialMap(rules,seed),before=structuredClone(map),layout=generateSpecialMapDoors(rules,seed,map);
 for(let i=0;i<100;i++)assert.deepEqual(generateSpecialMapDoors(rules,seed,map),layout);
 checkDoors(layout,map);assert.deepEqual(map,before);
});
test('doors reject bad inputs and do not consume Math.random',()=>{
 for(const seed of [-1,65536,1.5,NaN,Infinity,'1'])assert.throws(()=>generateSpecialMapDoors(rules,seed));
 assert.throws(()=>generateSpecialMapDoors('unknown',0));
 assert.throws(()=>generateSpecialMapDoors(rules,1,generateSpecialMap(rules,2)));
 const random=Math.random;try{Math.random=()=>{throw Error('random');};assert.ok(generateSpecialMapDoors(rules,0).doors.length);}finally{Math.random=random;}
 assert.equal(specialMapFingerprint(generateSpecialMap(rules,12345)),'65bbb4f0');
});
test('canonical boundaries share identities and reject outer edges',()=>{
 assert.equal(doorKey(3,4,'E'),doorKey(4,4,'W'));assert.equal(doorKey(3,4,'S'),doorKey(3,5,'N'));
 for(const [x,y,d] of [[0,0,'N'],[0,0,'W'],[9,9,'E'],[9,9,'S'],[-1,0,'E']])assert.equal(doorKey(x,y,d),null);
});
test('closed door blocks both sides; only adjacent front opens; animation then permits passage',()=>{
 const s=create(),door=s.doorLayout.doors[0],{x,y,dir,key}=door,d=dir==='E'?1:2,nx=x+(d===1?1:0),ny=y+(d===2?1:0);
 assert.equal(s.openedDoors.size,0);assert.equal(openSpecialDoorAhead(s,0),false);
 s.playerX=x;s.playerY=y;s.direction=(d+2)%4;
 assert.equal(openSpecialDoorAhead(s,0),false);assert.equal(actSpecialMap(s,'down',0),false);
 s.direction=d;assert.equal(actSpecialMap(s,'up',0),false);assert.equal(openSpecialDoorAhead(s,0),true);
 assert.equal(actSpecialMap(s,'up',100),false);updateSpecialMotion(s,519);assert.equal(s.openedDoors.size,0);updateSpecialMotion(s,520);
 assert.ok(s.openedDoors.has(key));assert.equal(specialDoorState(s,nx,ny,dir==='E'?'W':'N'),'open');
 assert.equal(s.cells[y][x].doors[dir],'open');assert.equal(s.cells[ny][nx].doors[dir==='E'?'W':'N'],'open');
 assert.equal(actSpecialMap(s,'up',521),true);updateSpecialMotion(s,691);assert.equal(s.playerX,nx);assert.equal(s.playerY,ny);
 assert.equal(actSpecialMap(s,'down',692),true);updateSpecialMotion(s,862);assert.equal(s.playerX,x);assert.equal(s.playerY,y);
 const again=create();assert.deepEqual(again.doorLayout,s.doorLayout);assert.equal(again.openedDoors.size,0);
 assert.deepEqual(create({...original,discovererName:'ALC'}).doorLayout,s.doorLayout);
 s.exitReached=true;assert.equal(openSpecialDoorAhead(s,900),false);
});
import {drawMinimap} from '../js/minimap.js';
test('minimap hides unseen doors and uses existing closed/open colors from either explored side',()=>{
 const s=create(),d=s.doorLayout.doors[0];let colors=[];
 const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;if(k==='strokeStyle')colors.push(v);return true;}});
 const draw=()=>{colors=[];drawMinimap(ctx,{W:960,MAP_W:10,MAP_H:10,cells:s.cells,explored:s.explored,state:s.renderState,roundRect(){}});return colors;};
 assert.ok(!draw().includes('#f0b35a'));
 s.explored[d.y][d.x]=true;assert.ok(draw().includes('#f0b35a'));
 s.openedDoors.add(d.key);assert.ok(draw().includes('#dfc18a'));
 s.explored[d.y][d.x]=false;s.explored[d.y+(d.dir==='S'?1:0)][d.x+(d.dir==='E'?1:0)]=true;assert.ok(draw().includes('#dfc18a'));
});
