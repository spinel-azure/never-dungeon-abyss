import {attachV2Encounters} from './encounter-v2.js';
import {attachV2BossEncounter} from './boss-encounter-v2.js';
import {mapOriginalId} from '../../data/special-maps.js';
import {generateRegisteredSpecialMap} from './generator.js';
import {specialMapV2StructureFingerprint} from './generator-v2.js';
import {doorKey} from './doors.js';
import {resolveSpecialStartDirection,specialDoorState,openSpecialDoorAhead} from './session.js';
import {attachV2Survey} from './survey-v2.js';
import {selectNormalMapBoss} from '../../data/karte-normal-bosses.js';
import {resolveSpecialThemeBoss} from '../../data/karte-special-bosses.js';
import {NORMAL_MAP_THEMES} from '../../data/special-map-themes.js';
import {generateExplicitSpecialMapV2} from './special-themes-v2.js';
import {isExplorerTestEnabled} from '../explorer-preview.js';

const dirs=['N','E','S','W'];
const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y;
export const isV2Session=s=>s?.kind==='specialMapV2';

// Owns three in-memory floor runtimes. The stable renderState facade is important:
// the renderer/field-item bridge retains its reference across floor switches.
export function createSpecialMapV2Session(registered,mapKey,options={}){
 const {playSe=()=>{},say=()=>{}}=options;
 const original=registered.find(m=>mapOriginalId(m)===mapKey);
 if(original?.rulesetVersion!=='special-map-v2')throw Error('登録済みV2地図が見つかりません。');
 if(options.developmentTheme&&!isExplorerTestEnabled())throw Error('探検家テストをONにしてください。');
 const blueprint=options.developmentTheme?generateExplicitSpecialMapV2({...original,ruleset:original.rulesetVersion,themeId:options.developmentTheme}):generateRegisteredSpecialMap(original);
 const s={kind:'specialMapV2',expeditionId:crypto.randomUUID(),mapKey,ruleset:original.rulesetVersion,seed:original.seed,level:original.level,rarity:original.rarity,
  themeOverride:original.themeOverride,
  blueprint,fingerprint:specialMapV2StructureFingerprint(blueprint),currentFloor:0,torchFuel:100,
  battleExperience:0,experienceClosed:false,rewardedBattles:new Set(),lootBag:null,
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
   if(same(p,f.bossRoom?.bossCell))Object.defineProperty(cell,'mapReturnPortal',{enumerable:true,get:()=>Boolean(s.bossDefeated||s.bossPreviewDismissed)});
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
 attachV2Survey(s,original,options);
 s.cellPrompt=null;
 attachV2Encounters(s,options);
 attachV2BossEncounter(s,options);
 const themeId=blueprint.floors[2].themeId;
 const visibleBoss=NORMAL_MAP_THEMES.includes(themeId)?selectNormalMapBoss({seed:s.seed,level:s.level,rarity:s.rarity,themeId}):resolveSpecialThemeBoss(themeId,s.level);
 s.bossRenderDefinition=visibleBoss;
 s.getBossRenderState=()=>{
  const p=s.generatedMap.bossRoom?.bossCell;
  if(s.currentFloor!==2||!p||!visibleBoss)return null;
  const gate=s.bossDefeated||s.bossPreviewDismissed;
  return {x:p.x,y:p.y,renderX:p.x+.5,renderY:p.y+.5,showAtContact:gate||s.bossPreviewPlaying,
   definition:{imageId:gate?'warp_portal_b100f':visibleBoss.id,image:gate?'images/dungeon_effects/warp_portal.avif':visibleBoss.image,renderScale:gate ? 1.8 : 1.9,maxHeightRatio:.9,silhouette:!gate&&Boolean(visibleBoss.battleMinMapLevel>s.level),opacity:s.bossPreviewFadeStarted?Math.max(0,1-(Date.now()-s.bossPreviewFadeStarted)/1000):1}};
 };
 // A survey milestone is a cell event too: its notice must not race battle audio.
 s.onCellEntered=()=>{options.onEnvironmentStep?.(s);beginV2CellPrompt(s);if(!s.onBossCell()&&!s.surveyNotice)s.onEncounterStep();};
 s.isDoorLocked=(x,y,d)=>s.doorByKey.has(doorKey(x,y,d))&&!s.bossDoorUnlocked;
 s.canOpenDoor=(x,y,d)=>{
  if(!s.isDoorLocked(x,y,d))return true;
  if(!s.bossKeyFound){s.say('赤錆びた扉には鍵がかかっている。');s.playSe('blocked');return false;}
  s.bossDoorUnlocked=true;return true;
 };
 s.explored[s.playerY][s.playerX]=true;
 s.recordSurvey(s.playerX,s.playerY);
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

export function getV2StairPrompt(s){
 if(!isV2Session(s))return '';
 const here={x:s.playerX,y:s.playerY},f=s.generatedMap;
 const hint=s.cellPrompt?'　Bでその場に留まる':'　移動で探索を続ける';
 if(same(here,f.stairsUp))return s.currentFloor===0
  ?'上り階段がある。探索を終了して帰還しますか？\n＊A／Enterで帰還'+hint
  :'上り階段がある。上層に移動しますか？\n＊A／Enterで移動'+hint;
 if(same(here,f.stairsDown))return '下り階段がある。下層に移動しますか？\n＊A／Enterで移動'+hint;
 return '';
}

export function getV2CellPromptMessage(s){
 if(!isV2Session(s)||!s.cellPrompt)return '';
 if(s.cellPrompt==='gate')return 'ワープゲートが現れた。B1Fの入口へ移動しますか？\n＊A／Enterで移動　Bでその場に留まる';
 return s.cellPrompt==='stairs'?getV2StairPrompt(s):'金色の宝箱がある。開けますか？\n＊A／Enterで開ける　Bでその場に留まる';
}
export function beginV2CellPrompt(s){
 const f=s.floors[s.currentFloor],here={x:s.playerX,y:s.playerY};
 s.cellPrompt=isV2ReturnGate(s)?'gate':getV2StairPrompt(s)?'stairs':same(here,f.generatedFloor.keyChest)&&!f.chestOpened?'chest':null;
 if(s.cellPrompt){s.autoPath=null;s.say(getV2CellPromptMessage(s));}
 return s.cellPrompt;
}
export function cancelV2CellPrompt(s){
 if(!s.cellPrompt)return false;
 s.cellPrompt=null;s.say('その場に留まった。A／Enterで再び調べられます。');return true;
}

// Award only after the shared Three.js opening callback. No normal key inventory.
export function completeV2KeyChest(s){
 const f=s.chestOpening;
 if(!f)return false;
 s.chestOpening=null;s.transitioning=false;
 f.chestOpened=true;s.bossKeyFound=true;
 s.playSe('importantItem');s.say('金箱から赤錆びた鍵を手に入れた。');
 return true;
}
export function cancelV2KeyChest(s){
 if(!s.chestOpening)return;
 s.chestOpening=null;s.transitioning=false;
}

export function switchV2Floor(s,destination){
 if(!isV2Session(s)||!s.blueprint.links.some(l=>[l.upper,l.lower].some(p=>p.floor===destination?.floor&&same(p,destination))))throw Error('不正な階段移動先です。');
 return moveV2To(s,destination);
}
export function isV2ReturnGate(s){
 return isV2Session(s)&&(s.bossDefeated||s.bossPreviewDismissed)&&s.currentFloor===2&&same({x:s.playerX,y:s.playerY},s.generatedMap.bossRoom?.bossCell);
}
export function warpV2ToEntrance(s){
 if(!isV2ReturnGate(s)||s.battleContext||s.motion||s.renderState.anim)return false;
 return moveV2To(s,{floor:1,...s.blueprint.floors[0].stairsUp});
}
function moveV2To(s,destination){
 if(!s.flushSurvey())return false;
 s.cellPrompt=null;
 s.autoPath=null;
 s.currentFloor=destination.floor-1;
 s.playerX=destination.x;s.playerY=destination.y;
 s.direction=resolveSpecialStartDirection({...s.generatedMap,entrance:destination});
 s.renderState.x=destination.x+.5;s.renderState.y=destination.y+.5;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;
 s.renderState.anim=null;s.motion=null;s.autoPath=null;
 s.explored[destination.y][destination.x]=true;
 s.recordSurvey(destination.x,destination.y);
 return true;
}

// Returns the stair link for the UI's existing darken/audio/reveal sequence.
export function confirmV2Cell(s,now){
 if(s.transitioning||s.motion||s.renderState.anim)return {handled:true};
 s.cellPrompt=null;
 if(isV2ReturnGate(s))return {handled:true,warpToEntrance:true};
 const destination=getV2StairDestination(s);
 if(destination)return {handled:true,destination};
 const f=s.floors[s.currentFloor],point={x:s.playerX,y:s.playerY};
 if(s.currentFloor===0&&same(point,f.generatedFloor.stairsUp))return {handled:true,returnToEntrance:true};
 if(same(point,f.generatedFloor.keyChest)){
  if(!f.chestOpened){s.chestOpening=f;s.transitioning=true;return {handled:true,openKeyChest:true};}
  else s.say('金箱は空だ。');
  return {handled:true};
 }
 if(openSpecialDoorAhead(s,now)){s.playSe('door');s.say('ギィ……');}
 return {handled:true};
}
