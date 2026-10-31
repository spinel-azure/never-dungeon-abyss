import {createAuroraBoot} from './aurora-boot.js';
import {createAuroraSummoning} from './aurora-summoning.js';
import {isSuperGoddess} from '../combat/goddess-superboss.js';
import {canActivateHackingDevice} from '../combat/hacking-device.js';
import {layoutAuroraSurface} from './aurora-layout.js';

// Each map version verifies its own encounter metadata before setting mapBoss.
// The common presentation does not interpret V2/V3 session or checkpoint shapes.
export function getAuroraBattleRoute(character,enemy,{mapBoss=false,resumed=null}={}){
 if(resumed||!mapBoss||!isSuperGoddess(enemy))return null;
 return canActivateHackingDevice(character,enemy)?'hacking':'normal';
}

// One owner for the two presentations, the black interstitial and input release.
// No battle state is created until startBattle runs under the closing cover.
export function createAuroraBattleIntro({anchor=null,embedded=!!anchor,boot=createAuroraBoot({anchor,pollGamepad:false,embedded}),summoning=createAuroraSummoning({anchor,pollGamepad:false,embedded})}={}){
 let active=null;
 function dispose(){active?.cancel();}
 async function play({route,isCurrent=()=>true,startBattle}){
  if(active)return false;
  const shield=document.createElement('dialog');
  shield.className='aurora-battle-shield';
  shield.style.cssText='position:fixed;inset:0;margin:0;border:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;background:transparent;outline:none;touch-action:none;';
  const style=document.createElement('style');style.textContent='.aurora-battle-shield::backdrop{background:transparent}';shield.append(style);
  document.body.append(shield);
  const cover=document.createElement('div');cover.style.cssText='position:absolute;background:#000;opacity:0;pointer-events:none;';shield.append(cover);
  function layout(){if(embedded)layoutAuroraSurface(cover,anchor,true);else Object.assign(cover.style,{inset:'0'});}
  layout();window.addEventListener('resize',layout);window.addEventListener('scroll',layout,true);
  const focus=document.activeElement,keys=new Set(),pads=new Map(),pointers=new Set();
  let cancelled=false,child=null,raf=0,drainResolve=null,lastInput=performance.now();
  const token={cancel(){cancelled=true;boot.dispose();summoning.dispose();drainResolve?.();}};
  active=token;
  function key(e){
   e.preventDefault();e.stopImmediatePropagation();lastInput=performance.now();
   if(e.type==='keyup'){keys.delete(e.code);return;}
   if(e.repeat||keys.has(e.code))return;keys.add(e.code);
   if(['Enter','Space','KeyZ'].includes(e.code))child?.handleInput('confirm');
  }
  function poll(){
   if(cancelled)return;
   for(const pad of navigator.getGamepads?.()||[]){if(!pad)continue;
    const down=!!pad.buttons[0]?.pressed;
    if(pads.has(pad.index)&&down&&!pads.get(pad.index))child?.handleInput('confirm');
    pads.set(pad.index,down);
    if(pad.buttons.some(b=>b.pressed)||pad.axes?.some(a=>Math.abs(a)>.3))lastInput=performance.now();
   }
   if(drainResolve&&keys.size===0&&pointers.size===0&&performance.now()-lastInput>=300)drainResolve();
   raf=requestAnimationFrame(poll);
  }
  function pointer(e){lastInput=performance.now();if(e.type==='pointerdown')pointers.add(e.pointerId);else pointers.delete(e.pointerId);}
  function blur(){keys.clear();pointers.clear();lastInput=performance.now();}
  shield.addEventListener('cancel',e=>e.preventDefault());
  for(const type of ['pointerdown','pointerup','click','touchend'])shield.addEventListener(type,e=>{e.preventDefault();e.stopImmediatePropagation();lastInput=performance.now();});
  window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);window.addEventListener('pagehide',dispose);
  for(const type of ['pointerdown','pointerup','pointercancel'])window.addEventListener(type,pointer,true);
  window.addEventListener('blur',blur);
  shield.showModal();poll();
  try{
   child=boot;await boot.play();
   if(cancelled||!isCurrent())return false;
   cover.style.opacity='1';
   child=summoning;await summoning.play({route});
   child=null;
   if(cancelled||!isCurrent())return false;
   lastInput=performance.now();await new Promise(resolve=>{drainResolve=resolve;});drainResolve=null;
   if(cancelled||!isCurrent())return false;
   return startBattle();
  }finally{
   cancelAnimationFrame(raf);boot.dispose();summoning.dispose();
   window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('pagehide',dispose);
   for(const type of ['pointerdown','pointerup','pointercancel'])window.removeEventListener(type,pointer,true);
   window.removeEventListener('blur',blur);
   window.removeEventListener('resize',layout);window.removeEventListener('scroll',layout,true);
   shield.close();shield.remove();if(focus?.isConnected)focus.focus({preventScroll:true});
   if(active===token)active=null;
  }
 }
 return {play,dispose,isActive:()=>!!active};
}
