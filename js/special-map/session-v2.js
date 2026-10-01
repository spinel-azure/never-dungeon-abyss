import {mapOriginalId} from '../../data/special-maps.js';
import {generateRegisteredSpecialMap} from './generator.js';
import {specialMapV2StructureFingerprint} from './generator-v2.js';
import {doorKey} from './doors.js';
import {resolveSpecialStartDirection,specialDoorState,openSpecialDoorAhead} from './session.js';

const dirs=['N','E','S','W'];
const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y;
export const isV2Session=s=>s?.kind==='specialMapV2';

// Owns three in-memory floor runtimes. The stable renderState facade is important:
// the renderer/field-item bridge retains its reference across floor switches.
export function createSpecialMapV2Session(registered,mapKey,{playSe=()=>{},say=()=>{}}={}){
 const original=registered.find(m=>mapOriginalId(m)===mapKey);
 if(original?.rulesetVersion!=='special-map-v2')throw Error('登録済みV2地図が見つかりません。');
 const blueprint=generateRegisteredSpecialMap(original);
 const s={kind:'specialMapV2',mapKey,ruleset:original.rulesetVersion,seed:original.seed,level:original.level,rarity:original.rarity,
  blueprint,fingerprint:specialMapV2StructureFingerprint(blueprint),currentFloor:0,torchFuel:100,
  bossKeyFound:false,bossDoorUnlocked:false,transitioning:false,playSe,say};
 s.floors=blueprint.floors.map(f=>{
  const generatedMap={...f,entrance:f.stairsUp};
  const direction=resolveSpecialStartDirection(generatedMap);
  const edge=f.bossRoom?.doorEdge;
  // Candidate 2 contains only the boss gate; do not invent ordinary door layouts.
  const doors=edge?[{...edge,dir:edge.direction,key:doorKey(edge.x,edge.y,edge.direction)}]:[];
  const r={generatedFloor:f,generatedMap,playerX:f.stairsUp.x,playerY:f.stairsUp.y,direction,
   explored:Array.from({length:10},()=>Array(10).fill(false)),openedDoors:new Set(),
   doorLayout:{doors},doorByKey:new Map(doors.map(d=>[d.key,d])),motion:null,autoPath:null,chestOpened:false,
   renderState:{kind:'specialMapV2',x:f.stairsUp.x+.5,y:f.stairsUp.y+.5,angle:direction*Math.PI/2-Math.PI/2,shake:0,torch:0,minimapEffectForced:false}};
  r.cells=f.walls.reduce((rows,w,i)=>{
   const x=i%10,y=Math.floor(i/10),p={x,y};
   const cell={x,y,type:same(p,f.stairsUp)?'stairsUp':same(p,f.stairsDown)?'stairsDown':'floor',
    walls:Object.fromEntries(dirs.map((d,j)=>[d,w[j]])),doors:{},doorKinds:{}};
   if(same(p,f.keyChest)){
    Object.defineProperty(cell,'treasure',{enumerable:true,get:()=>r.chestOpened?null:'gold'});
    Object.defineProperty(cell,'treasureDiscovered',{enumerable:true,get:()=>r.explored[y][x]});
   }
   for(const d of dirs){
    Object.defineProperty(cell.doors,d,{enumerable:true,get:()=>specialDoorState(r,x,y,d)});
    Object.defineProperty(cell.doorKinds,d,{enumerable:true,get:()=>r.doorByKey.has(doorKey(x,y,d))?(s.bossDoorUnlocked?'bossUnlocked':'boss'):null});
   }
   (rows[y]??=[]).push(cell);return rows;
  },[]);
  return r;
 });
 for(const key of ['generatedMap','cells','explored','openedDoors','doorLayout','doorByKey','playerX','playerY','direction','motion','autoPath']){
  Object.defineProperty(s,key,{enumerable:true,get:()=>s.floors[s.currentFloor][key],set:v=>{s.floors[s.currentFloor][key]=v;}});
 }
 s.renderState=new Proxy({}, {
  get:(_,key)=>key==='torchFuel'?s.torchFuel:s.floors[s.currentFloor].renderState[key],
  set:(_,key,value)=>{if(key==='torchFuel')s.torchFuel=value;else s.floors[s.currentFloor].renderState[key]=value;return true;}
 });
 Object.defineProperty(s,'surveyView',{get:()=>s.explored}); // display/path adapter only; never persistent survey
 Object.defineProperty(s,'surveyedCount',{get:()=>s.explored.flat().filter(Boolean).length});
 s.isDoorLocked=(x,y,d)=>s.doorByKey.has(doorKey(x,y,d))&&!s.bossDoorUnlocked;
 s.canOpenDoor=(x,y,d)=>{
  if(!s.isDoorLocked(x,y,d))return true;
  if(!s.bossKeyFound){s.say('赤錆びた扉には鍵がかかっている。');s.playSe('blocked');return false;}
  s.bossDoorUnlocked=true;return true;
 };
 s.explored[s.playerY][s.playerX]=true;
 return s;
}

export function getV2StairDestination(s){
 if(!isV2Session(s)||s.motion||s.renderState.anim||s.transitioning)return null;
 const here={floor:s.currentFloor+1,x:s.playerX,y:s.playerY};
 for(const link of s.blueprint.links){
  if(here.floor===link.upper.floor&&same(here,link.upper))return link.lower;
  if(here.floor===link.lower.floor&&same(here,link.lower))return link.upper;
 }
 return null;
}

export function switchV2Floor(s,destination){
 if(!isV2Session(s)||!s.blueprint.links.some(l=>[l.upper,l.lower].some(p=>p.floor===destination?.floor&&same(p,destination))))throw Error('不正な階段移動先です。');
 s.autoPath=null;
 s.currentFloor=destination.floor-1;
 s.playerX=destination.x;s.playerY=destination.y;
 s.direction=resolveSpecialStartDirection({...s.generatedMap,entrance:destination});
 s.renderState.x=destination.x+.5;s.renderState.y=destination.y+.5;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;
 s.renderState.anim=null;s.motion=null;s.autoPath=null;
 s.explored[destination.y][destination.x]=true;
}

// Returns the stair link for the UI's existing darken/audio/reveal sequence.
export function confirmV2Cell(s,now){
 if(s.transitioning||s.motion||s.renderState.anim)return {handled:true};
 const destination=getV2StairDestination(s);
 if(destination)return {handled:true,destination};
 const f=s.floors[s.currentFloor],point={x:s.playerX,y:s.playerY};
 if(same(point,f.generatedFloor.keyChest)){
  if(!f.chestOpened){f.chestOpened=true;s.bossKeyFound=true;s.playSe('importantItem');s.say('金箱から赤錆びた鍵を手に入れた。');}
  else s.say('金箱は空だ。');
  return {handled:true};
 }
 if(openSpecialDoorAhead(s,now)){s.playSe('door');s.say('ギィ……');}
 return {handled:true};
}
