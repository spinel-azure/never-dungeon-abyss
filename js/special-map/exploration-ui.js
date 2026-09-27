import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,specialWall} from './session.js';
import {useSpecialMapRenderSource,toggleMinimapOverlay} from '../renderer.js';
import {drawMinimap,getMinimapBounds} from '../minimap.js';
export function startSpecialMapExploration({host,registered,mapKey,message,onExit}){
 const session=createSpecialMapSession(registered,mapKey);
 const container=document.createElement('section');container.className='special-map-runtime';container.setAttribute('aria-label','特殊迷宮探索');
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','特殊迷宮3D表示');
 const hud=document.createElement('div');hud.className='special-map-hud';
 const controls=document.createElement('div');controls.className='special-map-controls';
 const notice=document.createElement('div');notice.className='special-map-exit';notice.hidden=true;
 container.append(canvas,hud,controls,notice);host.append(container);
 let disposed=false,returned=false,reported=false;
 const finish=()=>{if(returned)return;returned=true;close();onExit();};
 function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;return b;}
 controls.append(button('帰還（B）',finish),button('地図',toggleMinimapOverlay));
 notice.append(document.createTextNode('特殊迷宮の出口へ到達した！'),button('奈落入口へ（A）',finish));
 const restore=useSpecialMapRenderSource({canvas,ctx:canvas.getContext('2d'),W:960,H:540,state:session.renderState,eventOverlayCtx:null,
  wallOnCell:(x,y,d)=>specialWall(session,x,y,d),closedDoorOnCell:()=>false,openDoorOnCell:()=>false,getDoorState:()=>null,getDoorKind:()=>null,getDepth:()=>0,
  inBounds:(x,y)=>x>=0&&x<10&&y>=0&&y<10,getRoamingEnemyRenderState:()=>null,
  updateAnimation:now=>updateSpecialMotion(session,now),drawMinimap,getMinimapBounds,
  getMinimapOptions:()=>({W:960,MAP_W:10,MAP_H:10,cells:session.cells,explored:session.explored,state:session.renderState}),
  updateHud:()=>{
   container.dataset.moving=String(Boolean(session.motion));
   hud.textContent=`特殊地図　X:${session.playerX} Y:${session.playerY}　${['北','東','南','西'][session.direction]}向き`;
   if(session.exitReached&&!reported){reported=true;notice.hidden=false;message.textContent='特殊迷宮の出口へ到達した！ A／ENTERで奈落入口へ戻ります。';}
  }
 },session.generatedMap.themeId);
 message.textContent='特殊地図を探索中。方向キー：移動・旋回 ／ B：即時帰還（敵・宝箱・報酬なし）';
 function input(action){if(disposed)return false;if(action==='cancel'){finish();return true;}if(action==='confirm'&&session.exitReached){finish();return true;}actSpecialMap(session,action,performance.now());container.dataset.moving=String(Boolean(session.motion));return true;}
 const enter=e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();input('confirm');}};
 window.addEventListener('keydown',enter,true);
 function close(){if(disposed)return;disposed=true;restore();container.remove();window.removeEventListener('keydown',enter,true);}
 return {input,close,session};
}
