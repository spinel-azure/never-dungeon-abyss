import assert from 'node:assert/strict';
import {V1_THEMES} from '../js/special-map/generator-v1.js';
export function checkStructure(map){
 assert.equal(map.width,10);assert.equal(map.height,10);assert.equal(map.walls.length,100);
 const inside=p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<10&&p.y>=0&&p.y<10;
 assert.ok(inside(map.entrance));assert.ok(inside(map.exit));
 const e=map.entrance;assert.ok(e.x===0||e.y===0||e.x===9||e.y===9);
 assert.ok({N:e.y===0,E:e.x===9,S:e.y===9,W:e.x===0}[e.side]);
 assert.equal(map.startDirection,{N:'S',E:'W',S:'N',W:'E'}[e.side]);assert.ok(V1_THEMES.includes(map.themeId));
 const ds=[[0,-1],[1,0],[0,1],[-1,0]],adj=Array.from({length:100},()=>[]);let openings=0;
 for(let i=0;i<100;i++){
  assert.equal(map.walls[i].length,4);
  for(let d=0;d<4;d++){
   assert.equal(typeof map.walls[i][d],'boolean');const x=i%10+ds[d][0],y=Math.floor(i/10)+ds[d][1];
   if(x<0||y<0||x>=10||y>=10){assert.equal(map.walls[i][d],true);continue;}
   const j=y*10+x;assert.equal(map.walls[i][d],map.walls[j][(d+2)%4]);
   if(!map.walls[i][d]){adj[i].push(j);openings++;}
  }
 }
 assert.equal(openings/2,113);
 const start=e.y*10+e.x,end=map.exit.y*10+map.exit.x;
 const distances=new Map([[start,0]]),queue=[start];
 for(const i of queue)for(const j of adj[i])if(!distances.has(j)){distances.set(j,distances.get(i)+1);queue.push(j);}
 assert.equal(distances.size,100);assert.notEqual(start,end);assert.equal(distances.get(end),Math.max(...distances.values()));
 return distances.get(end);
}
