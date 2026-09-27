import {STEP_MS,TURN_MS,DOOR_OPEN_MS} from '../config.js';
import {normalizeSurveyMask,surveyVisit,surveyCount,surveyGrid} from '../../data/special-map-survey.js';
import {generateRegisteredSpecialMap,specialMapFingerprint} from './generator.js';
import {mapOriginalId} from '../../data/special-maps.js';
import {generateSpecialMapDoors,doorKey} from './doors.js';
const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
export function createSpecialMapSession(registered,mapKey,{persistSurvey=()=>({ok:true}),playSe=()=>{},say=()=>{}}={}){
 const original=registered.find(map=>mapOriginalId(map)===mapKey);
 if(!original)throw Error('登録済みの地図が見つかりません。');
 const generatedMap=generateRegisteredSpecialMap(original),{entrance,startDirection}=generatedMap;
 const explored=Array.from({length:10},()=>Array(10).fill(false));explored[entrance.y][entrance.x]=true;
 const cells=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'floor',walls:Object.fromEntries(dirs.map((d,i)=>[d,generatedMap.walls[y*10+x][i]])),doors:{N:null,E:null,S:null,W:null},doorKinds:{N:null,E:null,S:null,W:null}})));
 const doorLayout=generateSpecialMapDoors(original.rulesetVersion,original.seed,generatedMap);
 const mask=normalizeSurveyMask(original.surveyedMask);
 const session={persistSurvey,playSe,say,surveyedMask:mask,pendingSurveyMask:mask,surveyedCount:surveyCount(mask),surveyComplete:surveyCount(mask)===100,surveyView:surveyGrid(mask),surveyCompletionPending:false,surveyError:'',kind:'specialMap',mapKey,ruleset:original.rulesetVersion,seed:original.seed,generatedMap,fingerprint:specialMapFingerprint(generatedMap),doorLayout,doorByKey:new Map(doorLayout.doors.map(d=>[d.key,d])),openedDoors:new Set(),cells,explored,playerX:entrance.x,playerY:entrance.y,direction:dirs.indexOf(startDirection),exitReached:false,motion:null,
  renderState:{kind:'specialMap',x:entrance.x+.5,y:entrance.y+.5,angle:dirs.indexOf(startDirection)*Math.PI/2-Math.PI/2,shake:0,torch:0,torchFuel:100,minimapEffectForced:true}};
 // Read-only cell adapters let the existing minimap use its normal door marks.
 // The only mutable source of truth is openedDoors, shared by both edge sides.
 for(const row of cells)for(const cell of row)for(const dir of dirs){
  Object.defineProperty(cell.doors,dir,{enumerable:true,get:()=>specialDoorState(session,cell.x,cell.y,dir)});
  cell.doorKinds[dir]=session.doorByKey.has(doorKey(cell.x,cell.y,dir))?'normal':null;
 }
 recordSpecialSurvey(session,entrance.x,entrance.y);
 return session;
}
export function specialWall(session,x,y,dir){return !session.cells[y]?.[x]||session.cells[y][x].walls[dir]!==false;}
export function specialDoorState(session,x,y,dir){const key=doorKey(x,y,dir);return session.doorByKey.has(key)?(session.openedDoors.has(key)?'open':'closed'):null;}
export function openSpecialDoorAhead(session,now){
 if(session.motion||session.renderState.anim)return false;
 const x=session.playerX,y=session.playerY,dirKey=dirs[session.direction];
 if(specialDoorState(session,x,y,dirKey)!=='closed')return false;
 // Existing renderer's normal door animation contract; same duration as player.js.
 session.renderState.anim={type:'door',start:now,duration:DOOR_OPEN_MS,x,y,dirKey,key:doorKey(x,y,dirKey)};return true;
}
export function updateSpecialMotion(session,now){
 const door=session.renderState.anim;
 if(door?.type==='door'&&now-door.start>=door.duration){session.openedDoors.add(door.key);session.renderState.anim=null;}
 const m=session.motion;if(!m)return;
 const t=Math.max(0,Math.min(1,(now-m.started)/m.duration)),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 session.renderState.x=m.x+(m.toX-m.x)*ease;session.renderState.y=m.y+(m.toY-m.y)*ease;session.renderState.angle=m.angle+(m.toAngle-m.angle)*ease;
 if(t===1){if(m.crossedDoor)session.openedDoors.delete(m.crossedDoor);session.motion=null;const {exit}=session.generatedMap;session.exitReached=session.playerX===exit.x&&session.playerY===exit.y;}
}
export function actSpecialMap(session,action,now){
 if(session.motion||session.renderState.anim)return false;
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
 session.motion={x:state.x,y:state.y,angle:state.angle,toX:x+.5,toY:y+.5,toAngle:angle,started:now,duration,crossedDoor};return true;
}

export function recordSpecialSurvey(session,x,y){
 session.pendingSurveyMask=surveyVisit(session.pendingSurveyMask,x,y);
 return flushSpecialSurvey(session);
}
export function flushSpecialSurvey(session){
 if(session.pendingSurveyMask===session.surveyedMask)return true;
 let result;try{result=session.persistSurvey(session.pendingSurveyMask);}catch{}
 if(!result?.ok){session.surveyError='調査記録を保存できませんでした。Aまたは帰還で再試行できます。';return false;}
 const wasComplete=session.surveyComplete;
 session.surveyedMask=session.pendingSurveyMask;session.surveyedCount=surveyCount(session.surveyedMask);
 session.surveyComplete=session.surveyedCount===100;session.surveyView=surveyGrid(session.surveyedMask);session.surveyError='';
 if(!wasComplete&&session.surveyComplete)session.surveyCompletionPending=true;
 return true;
}
