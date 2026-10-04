import {findKnownPath} from '../known-path.js';
import {STEP_MS,TURN_MS,DOOR_OPEN_MS} from '../config.js';
import {normalizeSurveyMask,surveyVisit,surveyCount,surveyGrid} from '../../data/special-map-survey.js';
import {generateRegisteredSpecialMap,specialMapFingerprint} from './generator.js';
import {mapOriginalId} from '../../data/special-maps.js';
import {generateSpecialMapDoors,doorKey} from './doors.js';
const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
export function createSpecialMapSession(registered,mapKey,{persistSurvey=()=>({ok:true}),playSe=()=>{},say=()=>{}}={}){
 const original=registered.find(map=>mapOriginalId(map)===mapKey);
 if(!original)throw Error('登録済みの地図が見つかりません。');
 if(original.rulesetVersion==='special-map-v2')throw Error('V2多層探索は準備中です。');
 const generatedMap=generateRegisteredSpecialMap(original),{entrance,startDirection}=generatedMap;
 const resolvedDirection=resolveSpecialStartDirection(generatedMap);
 const explored=Array.from({length:10},()=>Array(10).fill(false));explored[entrance.y][entrance.x]=true;
 const cells=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'floor',walls:Object.fromEntries(dirs.map((d,i)=>[d,generatedMap.walls[y*10+x][i]])),doors:{N:null,E:null,S:null,W:null},doorKinds:{N:null,E:null,S:null,W:null}})));
 const doorLayout=generateSpecialMapDoors(original.rulesetVersion,original.seed,generatedMap);
 const mask=normalizeSurveyMask(original.surveyedMask);
 const session={persistSurvey,playSe,say,surveyedMask:mask,pendingSurveyMask:mask,surveyedCount:surveyCount(mask),surveyComplete:surveyCount(mask)===100,surveyView:surveyGrid(mask),surveyCompletionPending:false,surveyError:'',kind:'specialMap',mapKey,ruleset:original.rulesetVersion,seed:original.seed,generatedMap,fingerprint:specialMapFingerprint(generatedMap),doorLayout,doorByKey:new Map(doorLayout.doors.map(d=>[d.key,d])),openedDoors:new Set(),cells,explored,playerX:entrance.x,playerY:entrance.y,direction:resolvedDirection,motion:null,autoPath:null,
  renderState:{kind:'specialMap',x:entrance.x+.5,y:entrance.y+.5,angle:resolvedDirection*Math.PI/2-Math.PI/2,shake:0,torch:0,torchFuel:100,minimapEffectForced:false}};
 // Read-only cell adapters let the existing minimap use its normal door marks.
 // The only mutable source of truth is openedDoors, shared by both edge sides.
 for(const row of cells)for(const cell of row)for(const dir of dirs){
  Object.defineProperty(cell.doors,dir,{enumerable:true,get:()=>specialDoorState(session,cell.x,cell.y,dir)});
  cell.doorKinds[dir]=session.doorByKey.has(doorKey(cell.x,cell.y,dir))?'normal':null;
 }
 cells[entrance.y][entrance.x].type="stairsUp";
 recordSpecialSurvey(session,entrance.x,entrance.y);
 return session;
}
export function specialWall(session,x,y,dir){return !session.cells[y]?.[x]||session.cells[y][x].walls[dir]!==false;}
export function specialDoorState(session,x,y,dir){const key=doorKey(x,y,dir);return session.doorByKey.has(key)?(session.openedDoors.has(key)?'open':'closed'):null;}
export function openSpecialDoorAhead(session,now){
 if(session.motion||session.renderState.anim||session.transitioning)return false;
 const x=session.playerX,y=session.playerY,dirKey=dirs[session.direction];
 if(specialDoorState(session,x,y,dirKey)!=='closed')return false;
 if(session.canOpenDoor&&!session.canOpenDoor(x,y,dirKey))return false;
 // Existing renderer's normal door animation contract; same duration as player.js.
 session.renderState.anim={type:'door',start:now,duration:DOOR_OPEN_MS,x,y,dirKey,key:doorKey(x,y,dirKey)};return true;
}
export function updateSpecialMotion(session,now){
 const door=session.renderState.anim;
 if(door?.type==='door'&&now-door.start>=door.duration){session.openedDoors.add(door.key);session.renderState.anim=null;}
 const m=session.motion;if(!m)return;
 const t=Math.max(0,Math.min(1,(now-m.started)/m.duration)),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 session.renderState.x=m.x+(m.toX-m.x)*ease;session.renderState.y=m.y+(m.toY-m.y)*ease;session.renderState.angle=m.angle+(m.toAngle-m.angle)*ease;
 if(t===1){if(m.crossedDoor)session.openedDoors.delete(m.crossedDoor);if(m.isStep)session.renderState.torchFuel=Math.max(0,session.renderState.torchFuel-1);session.motion=null;}
}
export function actSpecialMap(session,action,now){
 if(session.motion||session.renderState.anim||session.transitioning)return false;
 const state=session.renderState;let x=session.playerX,y=session.playerY,angle=state.angle,crossedDoor=null,duration=STEP_MS;
 if(action==='left'||action==='right'){
  const turn=action==='left'?-1:1;session.direction=(session.direction+turn+4)%4;angle+=turn*Math.PI/2;duration=TURN_MS;state.shake=turn>0?2:-2;
 }else if(action==='up'||action==='down'){
  const d=(session.direction+(action==='down'?2:0))%4;
  const forward=action==='up';
  const blocked=(text,outer=false)=>{session.playSe('blocked');state.shake=outer?(forward?-7:5):(forward?-12:9);session.say(text);return false;};
  if(specialDoorState(session,x,y,dirs[d])==='closed')return blocked('扉がある。\n＊Aボタンで開く');
  if(specialWall(session,x,y,dirs[d]))return blocked('そちらには進めない。');
  const nextX=x+dx[d],nextY=y+dy[d];
  if(nextX<0||nextX>=10||nextY<0||nextY>=10)return blocked('外周の向こうは闇に閉ざされている。',true);
  // Record the actual crossed edge, including backward movement. Close only
  // after the step animation completes, just like the ordinary dungeon.
  if(specialDoorState(session,x,y,dirs[d])==='open')crossedDoor=doorKey(x,y,dirs[d]);
  session.playSe('step');state.shake=forward?3:-2;x=nextX;y=nextY;
  session.playerX=x;session.playerY=y;session.explored[y][x]=true;recordSpecialSurvey(session,x,y);
 }else return false;
 session.motion={x:state.x,y:state.y,angle:state.angle,toX:x+.5,toY:y+.5,toAngle:angle,started:now,duration,crossedDoor,isStep:action==='up'||action==='down'};return true;
}

export function recordSpecialSurvey(session,x,y){
 if(session.kind==='specialMapV2')return session.recordSurvey(x,y);
 session.pendingSurveyMask=surveyVisit(session.pendingSurveyMask,x,y);
 return flushSpecialSurvey(session);
}
export function flushSpecialSurvey(session){
 if(session.kind==='specialMapV2')return session.flushSurvey();
 if(session.pendingSurveyMask===session.surveyedMask)return true;
 let result;try{result=session.persistSurvey(session.pendingSurveyMask);}catch{}
 if(!result?.ok){session.surveyError='調査記録を保存できませんでした。Aまたは帰還で再試行できます。';return false;}
 const wasComplete=session.surveyComplete;
 session.surveyedMask=session.pendingSurveyMask;session.surveyedCount=surveyCount(session.surveyedMask);
 session.surveyComplete=session.surveyedCount===100;session.surveyView=surveyGrid(session.surveyedMask);session.surveyError='';
 if(!wasComplete&&session.surveyComplete)session.surveyCompletionPending=true;
 return true;
}

// Preserve generated startDirection; resolve only the runtime facing, using
// ordinary chooseStartDirection's S/E/N/W fallback order.
export function resolveSpecialStartDirection(map){
 const walls=map.walls[map.entrance.y*map.width+map.entrance.x],preferred=dirs.indexOf(map.startDirection);
 if(walls[preferred]===false)return preferred;
 const found=[2,1,0,3].find(d=>walls[d]===false);if(found===undefined)throw Error('入口に通路がありません。');return found;
}
export function getSpecialAutoAvailability(s){
 if(s.autoPath)return {accepted:false,reason:'alreadyActive'};
 if(s.motion||s.renderState.anim||s.transitioning)return {accepted:false,reason:'moving'};
 const entrance=s.generatedMap.entrance;
 if(s.playerX===entrance.x&&s.playerY===entrance.y)return {accepted:false,reason:'alreadyAtStart'};
 const path=findKnownPath({x:s.playerX,y:s.playerY},entrance,(p,q,d)=>q.x>=0&&q.x<10&&q.y>=0&&q.y<10&&s.surveyView[q.y][q.x]&&!specialWall(s,p.x,p.y,d)&&!s.isDoorLocked?.(p.x,p.y,d));
 return {accepted:path.length>0,reason:path.length?'':'noPath',path};
}
export function startSpecialAutoWalker(s){const a=getSpecialAutoAvailability(s);if(!a.accepted)return false;s.autoPath=[...a.path];return true;}
export function continueSpecialAutoWalker(s,now){
 if(!s.autoPath||s.motion||s.renderState.anim||s.transitioning)return;
 if(!s.autoPath.length){s.autoPath=null;s.say(s.kind==='specialMapV2'&&s.currentFloor>0?'上り階段へ戻った。':'入口へ戻った。');return;}
 const d=dirs.indexOf(s.autoPath[0]);
 if(s.direction!==d){const diff=(d-s.direction+4)%4;actSpecialMap(s,diff===3?'left':'right',now);return;}
 if(specialDoorState(s,s.playerX,s.playerY,dirs[d])==='closed'){if(openSpecialDoorAhead(s,now))s.playSe('door');return;}
 if(actSpecialMap(s,'up',now))s.autoPath.shift();else{s.autoPath=null;s.say('帰還経路を見失った。');}
}
