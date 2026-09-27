import {generateRegisteredSpecialMap,specialMapFingerprint} from './generator.js';
import {mapOriginalId} from '../../data/special-maps.js';
const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
export function createSpecialMapSession(registered,mapKey){
 const original=registered.find(map=>mapOriginalId(map)===mapKey);
 if(!original)throw Error('登録済みの地図が見つかりません。');
 const generatedMap=generateRegisteredSpecialMap(original),{entrance,startDirection}=generatedMap;
 const explored=Array.from({length:10},()=>Array(10).fill(false));explored[entrance.y][entrance.x]=true;
 const cells=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>({x,y,type:'floor',walls:Object.fromEntries(dirs.map((d,i)=>[d,generatedMap.walls[y*10+x][i]])),doors:{N:null,E:null,S:null,W:null},doorKinds:{N:null,E:null,S:null,W:null}})));
 return {kind:'specialMap',mapKey,ruleset:original.rulesetVersion,seed:original.seed,generatedMap,fingerprint:specialMapFingerprint(generatedMap),cells,explored,playerX:entrance.x,playerY:entrance.y,direction:dirs.indexOf(startDirection),exitReached:false,motion:null,
  renderState:{kind:'specialMap',x:entrance.x+.5,y:entrance.y+.5,angle:dirs.indexOf(startDirection)*Math.PI/2-Math.PI/2,shake:0,torch:0,torchFuel:100,minimapEffectForced:true}};
}
export function specialWall(session,x,y,dir){return !session.cells[y]?.[x]||session.cells[y][x].walls[dir]!==false;}
export function updateSpecialMotion(session,now){
 const m=session.motion;if(!m)return;
 const t=Math.max(0,Math.min(1,(now-m.started)/m.duration)),ease=t*t*(3-2*t);
 session.renderState.x=m.x+(m.toX-m.x)*ease;session.renderState.y=m.y+(m.toY-m.y)*ease;session.renderState.angle=m.angle+(m.toAngle-m.angle)*ease;
 if(t===1){session.motion=null;const {exit}=session.generatedMap;session.exitReached=session.playerX===exit.x&&session.playerY===exit.y;}
}
export function actSpecialMap(session,action,now){
 if(session.motion||session.exitReached)return false;
 const state=session.renderState;let x=session.playerX,y=session.playerY,angle=state.angle;
 if(action==='left'||action==='right'){
  const turn=action==='left'?-1:1;session.direction=(session.direction+turn+4)%4;angle+=turn*Math.PI/2;
 }else if(action==='up'||action==='down'){
  const d=(session.direction+(action==='down'?2:0))%4;
  if(specialWall(session,x,y,dirs[d]))return false;x+=dx[d];y+=dy[d];
  if(x<0||x>=10||y<0||y>=10)return false;
  session.playerX=x;session.playerY=y;session.explored[y][x]=true;
 }else return false;
 session.motion={x:state.x,y:state.y,angle:state.angle,toX:x+.5,toY:y+.5,toAngle:angle,started:now,duration:170};return true;
}
