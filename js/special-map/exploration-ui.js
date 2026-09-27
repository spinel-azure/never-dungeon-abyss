import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey} from './session.js';
import {useSpecialMapRenderSource,toggleMinimapOverlay} from '../renderer.js';
import {drawMinimap,getMinimapBounds} from '../minimap.js';
export function startSpecialMapExploration({host,registered,mapKey,message,onExit,playSe=()=>{},saveSurvey=()=>({ok:false})}){
 const session=createSpecialMapSession(registered,mapKey,{persistSurvey:saveSurvey});
 const container=document.createElement('section');container.className='special-map-runtime';container.setAttribute('aria-label','特殊迷宮探索');
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','特殊迷宮3D表示');
 const hud=document.createElement('div');hud.className='special-map-hud';
 const controls=document.createElement('div');controls.className='special-map-controls';
 container.append(canvas,hud,controls);host.append(container);
 let disposed=false,returned=false,reported=false;
 const finish=()=>{if(returned)return;if(!flushSpecialSurvey(session)){message.textContent=session.surveyError;return;}returned=true;close();onExit();};
 function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;return b;}
 controls.append(button('帰還（B）',finish),button('地図',toggleMinimapOverlay),button('開扉（A）',()=>input('confirm')));
 const restore=useSpecialMapRenderSource({canvas,ctx:canvas.getContext('2d'),W:960,H:540,state:session.renderState,eventOverlayCtx:null,
  wallOnCell:(x,y,d)=>specialWall(session,x,y,d)||specialDoorState(session,x,y,d)==='closed',closedDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='closed',openDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='open',getDoorState:(x,y,d)=>specialDoorState(session,x,y,d),getDoorKind:(x,y,d)=>specialDoorState(session,x,y,d)?'normal':null,getDepth:()=>0,
  inBounds:(x,y)=>x>=0&&x<10&&y>=0&&y<10,getRoamingEnemyRenderState:()=>null,
  updateAnimation:now=>{const wasOpening=!!session.renderState.anim;updateSpecialMotion(session,now);if(wasOpening&&!session.renderState.anim)message.textContent='扉が　ひらいた。';},drawMinimap,getMinimapBounds,
  getMinimapOptions:()=>({W:960,MAP_W:10,MAP_H:10,cells:session.cells,explored:session.surveyView,state:session.renderState}),
  updateHud:()=>{
   container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));
   hud.textContent=`特殊地図　X:${session.playerX} Y:${session.playerY}　${['北','東','南','西'][session.direction]}向き　${session.surveyComplete?'調査完了':`調査 ${session.surveyedCount} / 100`}`;
   if(session.exitReached&&!reported){reported=true;message.textContent='出口を発見した。調査を続けられます。';}
   if(session.surveyCompletionPending){session.surveyCompletionPending=false;message.textContent='地図の調査が完了した！ 完全地図が解放されました。';}
   if(session.surveyError)message.textContent=session.surveyError;
  }
 },session.generatedMap.themeId);
 message.textContent='特殊地図を探索中。方向キー：移動・旋回 ／ B：即時帰還（敵・宝箱・報酬なし）';
 function input(action){
  if(disposed)return false;if(action==='cancel'){finish();return true;}
  if(action==='confirm'&&session.surveyError){flushSpecialSurvey(session);message.textContent=session.surveyError||'調査記録を保存しました。';return true;}
  if(action==='confirm'){if(openSpecialDoorAhead(session,performance.now())){playSe('door');message.textContent='ギィ……';}}
  else{
   const d=(session.direction+(action==='down'?2:0))%4;
   if(['up','down'].includes(action)&&!session.motion&&!session.renderState.anim&&specialDoorState(session,session.playerX,session.playerY,['N','E','S','W'][d])==='closed')message.textContent='扉が閉じている。正面を向いてA／ENTERで開扉。';
   actSpecialMap(session,action,performance.now());
  }
  container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));return true;
 }
 const enter=e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();input('confirm');}};
 window.addEventListener('keydown',enter,true);
 function close(){if(disposed)return;disposed=true;restore();container.remove();window.removeEventListener('keydown',enter,true);}
 return {input,close,session};
}
