import {generateSpecialMap,specialMapFingerprint} from './generator.js';
import {streamV1,chooseIndexV1,hash32V1} from './random-v1.js';
export const DOOR_REVISION='v1-door-candidate-1';
export const DOOR_STREAM='door-layout';
export function doorKey(x,y,dir){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=10||y>=10)return null;
 if(dir==='W'){x--;dir='E';}else if(dir==='N'){y--;dir='S';}
 if(x<0||y<0||(dir==='E'&&x>=9)||(dir==='S'&&y>=9)||!['E','S'].includes(dir))return null;
 return `${x},${y},${dir}`;
}
// Positions only: neither seed/revision nor mutable open state are hashed.
export function canonicalDoorPositions(layout){return JSON.stringify(layout.doors.map(d=>d.key).sort());}
export function doorFingerprint(layout){return hash32V1(canonicalDoorPositions(layout)).toString(16).padStart(8,'0');}
export function generateSpecialMapDoors(ruleset,seed,generatedMap){
 if(!['special-map-v1','phase2a-1'].includes(ruleset))throw RangeError('Unsupported door ruleset');
 const map=generateSpecialMap(ruleset,seed);
 if(generatedMap&&specialMapFingerprint(generatedMap)!==specialMapFingerprint(map))throw RangeError('Door blueprint mismatch');
 const next=streamV1(ruleset,seed,DOOR_STREAM),targetCount=6+chooseIndexV1(next,5),candidates=[];
 const forbidden=new Set([map.entrance.y*10+map.entrance.x,map.exit.y*10+map.exit.x]);
 for(let y=0;y<10;y++)for(let x=0;x<10;x++)for(const [dir,d,offset] of [['E',1,1],['S',2,10]]){
  const key=doorKey(x,y,dir),a=y*10+x,b=a+offset;
  if(key&&!map.walls[a][d]&&!forbidden.has(a)&&!forbidden.has(b))candidates.push({key,x,y,dir,kind:'normal'});
 }
 for(let i=candidates.length-1;i>0;i--){const j=chooseIndexV1(next,i+1);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const occupied=new Set(),doors=[];
 for(const candidate of candidates){
  const a=candidate.y*10+candidate.x,b=a+(candidate.dir==='E'?1:10);
  if(occupied.has(a)||occupied.has(b))continue;
  occupied.add(a);occupied.add(b);doors.push(candidate);if(doors.length===targetCount)break;
 }
 doors.sort((a,b)=>a.y-b.y||a.x-b.x||(a.dir==='E'?-1:1));
 const layout={revision:DOOR_REVISION,ruleset,seed,targetCount,doors};
 return {...layout,fingerprint:doorFingerprint(layout)};
}
