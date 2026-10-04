import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall,specialDoorState,openSpecialDoorAhead,flushSpecialSurvey,continueSpecialAutoWalker} from './session.js';
import {useSpecialMapRenderSource,toggleMinimapOverlay,setWallColor,setFloorColor} from '../renderer.js';
import {createSpecialMapV2Session,isV2Session,confirmV2Cell,switchV2Floor,getV2StairPrompt,completeV2KeyChest,cancelV2KeyChest} from './session-v2.js';
import {drawMinimap,getMinimapBounds} from '../minimap.js';
import {attachSpecialMap,getSpecialMapHost,getSpecialMapContext} from './context.js';
import {describeTestMap,mapOriginalId} from '../../data/special-maps.js';
export function startSpecialMapExploration(options){
 const host=getSpecialMapHost();
 const original=options.registered.find(m=>mapOriginalId(m)===options.mapKey);
 if(original?.rulesetVersion!=='special-map-v2'||!host.runEntryTransition)return createExploration(options);
 if(getSpecialMapContext())throw Error('特殊地図はすでに探索中です。');
 let controller=null,cancelled=false,locked=true;
 const pending={
  input:action=>locked?true:controller?.input(action)??true,
  close(){cancelled=true;controller?.close();},
  finish:()=>locked?false:controller?.finish()??false,
  get session(){return controller?.session;},
 };
 pending.ready=(async()=>{
  try{
   const completed=await host.runEntryTransition(()=>{
    if(cancelled)return;
    controller=createExploration(options);
    controller.session.transitioning=true;
    controller.session.renderState.overlayEvent=null;
   });
   if(cancelled)return;
   if(completed===false||!controller)throw Error('入場演出を開始できませんでした。');
   let name='特殊地図';try{name=describeTestMap(original).name;}catch{}
   controller.session.renderState.overlayEvent={type:'floorLap',showOverlay:false,overlayMessage:name,specialMapTitle:true};
   controller.session.transitioning=false;locked=false;
  }catch{
   if(cancelled)return;
   controller?.close();options.onExit();
   options.message.textContent='特殊地図へ入場できませんでした。もう一度お試しください。';
  }
 })();
 return pending;
}
function createExploration({registered,mapKey,message,onExit,onEnter=()=>{},playSe=()=>{},saveSurvey=()=>({ok:false})}){
 if(getSpecialMapContext())throw Error('特殊地図はすでに探索中です。');
 const host=getSpecialMapHost();
 const original=registered.find(m=>mapOriginalId(m)===mapKey);
 const createSession=original?.rulesetVersion==='special-map-v2'?createSpecialMapV2Session:createSpecialMapSession;
 const session=createSession(registered,mapKey,{persistSurvey:saveSurvey,playSe,say:text=>{message.textContent=text;}});
 let name='特殊地図';try{name=describeTestMap(original).name;}catch{}
 const container=document.createElement('section');container.className='special-map-runtime';container.setAttribute('aria-label','特殊迷宮探索');
 const canvas=document.createElement('canvas');canvas.className='special-map-view';canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','特殊迷宮3D表示');
 container.append(canvas);host.viewport.append(container);
 const statusParent=host.status.parentElement;container.append(host.status);
 let disposed=false,returned=false;
 let stairPrompt=getV2StairPrompt(session);
 function showStairNotice(prefix=''){
  const next=getV2StairPrompt(session);
  if(next)message.textContent=prefix+next;
  else if(stairPrompt&&message.textContent.includes(stairPrompt))message.textContent='特殊地図を探索中。Bボタンでメニュー表示。';
  stairPrompt=next;
 }
 function finish(){if(returned||session.transitioning)return false;if(!flushSpecialSurvey(session)){message.textContent=session.surveyError;return false;}if(host.beforeReturn?.()===false)return false;returned=true;close();onExit();return true;}
 onEnter();
 const detach=attachSpecialMap({session,finish});
 session.renderState.overlayEvent={type:'floorLap',showOverlay:false,overlayMessage:name,specialMapTitle:true};
 const restore=useSpecialMapRenderSource({canvas,ctx:canvas.getContext('2d'),W:960,H:540,state:session.renderState,eventOverlayCtx:null,
  wallOnCell:(x,y,d)=>specialWall(session,x,y,d)||specialDoorState(session,x,y,d)==='closed',closedDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='closed',openDoorOnCell:(x,y,d)=>specialDoorState(session,x,y,d)==='open',getDoorState:(x,y,d)=>specialDoorState(session,x,y,d),getDoorKind:(x,y,d)=>session.cells[y]?.[x]?.doorKinds[d]??null,getDepth:()=>0,
  inBounds:(x,y)=>x>=0&&x<10&&y>=0&&y<10,getRoamingEnemyRenderState:()=>null,
  updateAnimation:now=>{
   if(host.isPaused?.()||session.transitioning||session.renderState.overlayEvent)return;
   const wasOpening=!!session.renderState.anim,wasStep=session.motion?.isStep,wasAuto=!!session.autoPath;
   updateSpecialMotion(session,now);
   if(wasOpening&&!session.renderState.anim)message.textContent='扉が　ひらいた。';
   continueSpecialAutoWalker(session,now);
   // Also replace the auto-walker's arrival notice with the actionable stair prompt.
   if(!session.motion&&(wasStep||(wasAuto&&!session.autoPath))){
    showStairNotice();
   }
  },drawMinimap,getMinimapBounds,
  getMinimapOptions:()=>({W:960,MAP_W:10,MAP_H:10,cells:session.cells,explored:session.surveyView,state:session.renderState}),
  updateHud:()=>{
   container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));
   container.dataset.banner=String(Boolean(session.renderState.overlayEvent));
   host.updateHud?.();
   if(session.surveyCompletionPending){session.surveyCompletionPending=false;message.textContent='地図の調査が完了した！ 完全地図が解放されました。';}
   if(session.surveyError)message.textContent=session.surveyError;
  }
 },session.generatedMap.themeId);
 message.textContent=stairPrompt||'特殊地図を探索中。Bボタンでメニュー表示。';
 async function useStairs(destination){
  if(!flushSpecialSurvey(session)){message.textContent=session.surveyError;return;}
  session.transitioning=true;
  try{
   const onDark=()=>{
    if(disposed)return;
    if(!switchV2Floor(session,destination))return;
    setWallColor(session.generatedMap.themeId);setFloorColor(session.generatedMap.themeId);
    host.floorChanged?.({session});
    session.renderState.overlayEvent={type:'floorLap',showOverlay:false,overlayMessage:`B${session.currentFloor+1}F`,specialMapTitle:true};
    showStairNotice(`B${session.currentFloor+1}Fへ移動した。\n`);
   };
   if(host.runStairsTransition)await host.runStairsTransition(onDark);else{playSe('stairs');onDark();}
  }catch{if(!disposed)message.textContent='階段の移動を完了できませんでした。';}
  finally{session.transitioning=false;}
 }
 async function openKeyChest(){
  const opening=session.chestOpening;
  try{
   if(!host.playTreasureOpening)throw Error('Treasure presentation unavailable');
   message.textContent='金箱を開けている……';playSe('door');
   await host.playTreasureOpening('gold',()=>{
    if(disposed||session.chestOpening!==opening)return;
    host.hideTreasure?.();completeV2KeyChest(session);
   });
  }catch{
   if(disposed||session.chestOpening!==opening)return;
   host.hideTreasure?.();cancelV2KeyChest(session);
   message.textContent='金箱を開けられませんでした。A／Enterでもう一度お試しください。';
  }
 }
 function input(action){
  if(disposed)return false;
  if(session.transitioning)return true;
  // Ordinary menus/overlays own their inputs, before field movement.
  if(host.handleInput?.(action))return true;
  if(session.renderState.overlayEvent){session.renderState.overlayEvent=null;return true;}
  if(action==='map'){toggleMinimapOverlay();return true;}
  if(['up','down','left','right','confirm','cancel'].includes(action))session.autoPath=null;
  if(action==='cancel'){host.openMenu();return true;}
  if(action==='confirm'&&session.surveyError){flushSpecialSurvey(session);message.textContent=session.surveyError||'調査記録を保存しました。';return true;}
  if(action==='confirm'&&isV2Session(session)){const result=confirmV2Cell(session,performance.now());if(result.destination)void useStairs(result.destination);else if(result.returnToEntrance)finish();else if(result.openKeyChest)void openKeyChest();}
  else if(action==='confirm'){if(openSpecialDoorAhead(session,performance.now())){playSe('door');message.textContent='ギィ……';}}
  else actSpecialMap(session,action,performance.now());
  container.dataset.moving=String(Boolean(session.motion||session.renderState.anim));return true;
 }
 const enter=e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();input('confirm');}};
 window.addEventListener('keydown',enter,true);
 const saveOnHide=()=>{if(isV2Session(session))flushSpecialSurvey(session);};
 const saveWhenHidden=()=>{if(document.visibilityState==='hidden')saveOnHide();};
 window.addEventListener('pagehide',saveOnHide);
 document.addEventListener('visibilitychange',saveWhenHidden);
 const dismiss=()=>{if(session.renderState.overlayEvent)session.renderState.overlayEvent=null;};canvas.addEventListener('click',dismiss);
 function close(){if(disposed)return;disposed=true;session.disposeSurvey?.();window.removeEventListener('pagehide',saveOnHide);document.removeEventListener('visibilitychange',saveWhenHidden);if(session.chestOpening){host.hideTreasure?.();cancelV2KeyChest(session);}restore();statusParent.append(host.status);container.remove();window.removeEventListener('keydown',enter,true);detach();}
 return {input,close,session,finish};
}
