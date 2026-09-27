import assert from 'node:assert/strict';
import {doorKey,doorFingerprint} from '../js/special-map/doors.js';
export function checkDoors(layout,map){
 const occupied=new Set(),keys=new Set();
 assert.equal(layout.ruleset,map.ruleset);assert.equal(layout.seed,map.seed);
 assert.ok(layout.targetCount>=6&&layout.targetCount<=10);
 assert.ok(layout.doors.length<=layout.targetCount);
 for(const door of layout.doors){
  const {x,y,dir,key}=door;assert.ok(['E','S'].includes(dir));assert.equal(doorKey(x,y,dir),key);assert.ok(key);
  assert.ok(!keys.has(key),'duplicate');keys.add(key);
  const a=y*10+x,b=a+(dir==='E'?1:10),opposite=dir==='E'?'W':'N';
  assert.equal(doorKey(b%10,Math.floor(b/10),opposite),key);
  assert.equal(map.walls[a][dir==='E'?1:2],false,'wall door');
  for(const i of [a,b]){assert.ok(!occupied.has(i),'multiple doors on cell');occupied.add(i);assert.notEqual(i,map.entrance.y*10+map.entrance.x);assert.notEqual(i,map.exit.y*10+map.exit.x);}
 }
 assert.equal(doorFingerprint(layout),layout.fingerprint);
}
