import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey,continueSpecialAutoWalker} from './session.js';
import {useSpecialMapRenderSource,toggleMinimapOverlay} from '../renderer.js';
import {drawMinimap,getMinimapBounds} from '../minimap.js';
import {attachSpecialMap,getSpecialMapHost} from './context.js';
import {describeTestMap,mapOriginalId} from '../../data/special-maps.js';
export function startSpecialMapExploration({registered,mapKey,message,onExit,playSe=()=>{},saveSurvey=()=>({ok:false})}){
 const host=getSpecialMapHost();
 const session=createSpecialMapSession(registered,mapKey,{persistSurvey:saveSurvey,playSe,say:text=>{message.textContent=text;}});
 const original=registered.find(m=>mapOriginalId(m)===mapKey);
 let name='特殊地図';try{name=describeTestMap(original).name;}catch{}
 const container=document.createElement('section');container.className='special-map-runtime';container.setAttribute('aria-label','特殊迷宮探索');
 const canvas=document.createElement('canvas');canvas.className='special-map-view';canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','特殊迷宮3D表示');
 container.append(canvas);host.viewport.append(container);
 const statusParent=host.status.parentElement;container.append(host.status);
 let disposed=false,returned=false;
 function finish(){if(returned)return false;if(!flushSpecialSurvey(session)){message.textContent=session.surveyError;return false;}if(host.beforeReturn?.()===false)return false;returned=true;close();onExit();return true;}
 const detach=attachSpecialMap({session,finish});
 session.renderState.overlayEvent={type:'floorLap',showOverlay:false,overlayMessage:name,specialMapTitle:true};
 const restore=useSpecialMapRenderSource({canvas,ctx:canvas.getContext('2d'),W:960,H:540,state:session.renderState,eventOverlayCtx:null,
  wallOnCell:(x,y,d)=>specialWall(session,x,y,d)||specialDoorState(session,x,y,d)==='closed',closedDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='closed',openDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='open',getDoorState:(x,y,d)=>specialDoorState(session,x,y,d),getDoorKind:(x,y,d)=>specialDoorState(session,x,y,d)?'normal':null,getDepth:()=>0,
  inBounds:(x,y)=>x>=0&&x<10&&y>=0&&y<10,getRoamingEnemyRenderState:()=>null,
  updateAnimation:now=>{if(host.isPaused?.()||session.renderState.overlayEvent)return;const wasOpening=!!session.renderState.anim;updateSpecialMotion(session,now);if(wasOpening&&!session.renderState.anim)message.textContent='扉が　ひらいた。';continueSpecialAutoWalker(session,now);},drawMinimap,getMinimapBounds,
  getMinimapOptions:()=>({W:960,MAP_W:10,MAP_H:10,cells:session.cells,explored:session.surveyView,state:session.renderState}),
  updateHud:()=>{
   container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));
   container.dataset.banner=String(Boolean(session.renderState.overlayEvent));
   host.updateHud?.();
   if(session.surveyCompletionPending){session.surveyCompletionPending=false;message.textContent='地図の調査が完了した！ 完全地図が解放されました。';}
   if(session.surveyError)message.textContent=session.surveyError;
  }
 },session.generatedMap.themeId);
 message.textContent='特殊地図を探索中。Bボタンでメニュー表示。';
 function input(action){
  if(disposed)return false;
  // Ordinary menus/overlays own their inputs, before field movement.
  if(host.handleInput?.(action))return true;
  if(session.renderState.overlayEvent){session.renderState.overlayEvent=null;return true;}
  if(action==='map'){toggleMinimapOverlay();return true;}
  if(['up','down','left','right','confirm','cancel'].includes(action))session.autoPath=null;
  if(action==='cancel'){host.openMenu();return true;}
  if(action==='confirm'&&session.surveyError){flushSpecialSurvey(session);message.textContent=session.surveyError||'調査記録を保存しました。';return true;}
  if(action==='confirm'){if(openSpecialDoorAhead(session,performance.now())){playSe('door');message.textContent='ギィ……';}}
  else actSpecialMap(session,action,performance.now());
  container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));return true;
 }
 const enter=e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();input('confirm');}};
 window.addEventListener('keydown',enter,true);
 const dismiss=()=>{if(session.renderState.overlayEvent)session.renderState.overlayEvent=null;};canvas.addEventListener('click',dismiss);
 function close(){if(disposed)return;disposed=true;restore();statusParent.append(host.status);container.remove();window.removeEventListener('keydown',enter,true);detach();}
 return {input,close,session,finish};
}
