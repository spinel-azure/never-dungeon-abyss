import {layoutAuroraSurface} from './aurora-layout.js';
export const SUMMONING_COLORS=Object.freeze({background:'#0B111C',normal:'#91E0DF',warning:'#FF7777',success:'#A8F0B5'});
const common=['> AKASHIC RECORDS : CONNECTED','> DIVINE ENTITY DATA : FOUND','','> INITIALIZING REPRODUCTION...'];
const normal=['','> LUMINA   : VERIFIED','> NOCTIA   : VERIFIED','> ZELENA   : VERIFIED','','> DIVINE AUTHORITY : 100%','> SUMMONING SEQUENCE : COMPLETE'];
const hacking=['','!! WARNING !!','!! UNAUTHORIZED ACCESS DETECTED !!','','> UNKNOWN DEVICE : CONNECTED','> REPRODUCTION PROTOCOL : INTERRUPTED','> SECURITY OVERRIDE : FAILED','','> DIVINE AUTHORITY : DEGRADED','> INTERFERENCE SUCCESSFUL'];
export const characterDelay=ch=>ch===' '?12:ch==='.'?140:32;
export function createSummoningTimeline(route='normal'){
 if(!['normal','hacking'].includes(route))throw new RangeError('Unknown summoning route');
 let time=0,branchAt=0,warningAt=null,successAt=Infinity;
 const rows=[...common,...(route==='hacking'?hacking:normal)].map((text,index)=>{
  if(index===common.length)branchAt=time;
  const row={text,start:time,characters:[],color:text.startsWith('!!')||text.includes('SECURITY OVERRIDE')?'warning':text.includes('SEQUENCE : COMPLETE')||text.includes('INTERFERENCE SUCCESSFUL')?'success':'normal'};
  if(row.color==='success')successAt=time;
  for(const ch of text){time+=characterDelay(ch);row.characters.push(time);}
  row.end=time;
  if(text==='!! WARNING !!')warningAt=time;
  time+=!text?200:text==='!! WARNING !!'?800:500;
  return row;
 });
 const completeAt=rows.at(-1).end;
 return {route,rows,branchAt,warningAt,successAt,completeAt,endAt:completeAt+1300};
}
export function summoningFrameAt(timeline,elapsed){
 const time=Math.max(0,elapsed),complete=time>=timeline.completeAt;
 let rowIndex=0;for(let i=0;i<timeline.rows.length;i++)if(time>=timeline.rows[i].start)rowIndex=i;
 const rows=timeline.rows.slice(0,rowIndex+1).map(row=>({...row,visible:row.text.slice(0,row.characters.filter(t=>t<=time).length)}));
 const warningElapsed=time-(timeline.warningAt??Infinity);
 return {rows,rowIndex,complete,ended:time>=timeline.endAt,shade:Math.max(0,Math.min(1,(time-timeline.completeAt-1000)/300)),
  cursorVisible:time%800<400,cursorColor:timeline.route==='hacking'&&time>=timeline.branchAt&&time<timeline.successAt?'warning':'normal',
  warningVisible:warningElapsed<0||warningElapsed>=800||Math.floor(warningElapsed/200)%2===0,
  flash:timeline.route==='hacking'&&time>=timeline.branchAt&&time<timeline.branchAt+160?.22*(1-(time-timeline.branchAt)/160):0};
}
export function drawSummoningLog(ctx,frame){
 const c=SUMMONING_COLORS;ctx.fillStyle=c.background;ctx.fillRect(0,0,960,540);
 ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=c.normal;ctx.font='bold 24px monospace';ctx.fillText('AURORA OS',36,46);
 ctx.textAlign='right';ctx.fillStyle='#8097a9';ctx.font='14px monospace';ctx.fillText('DIVINE SUMMONING PROTOCOL',924,46);
 ctx.strokeStyle='#3b4c5c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(36,71);ctx.lineTo(924,71);ctx.stroke();
 ctx.save();ctx.beginPath();ctx.rect(36,84,888,398);ctx.clip();ctx.textAlign='left';ctx.font='bold 24px monospace';
 frame.rows.forEach((row,i)=>{if(row.text==='!! WARNING !!'&&!frame.warningVisible)return;ctx.fillStyle=c[row.color];ctx.fillText(row.visible,54,110+i*27);});
 if(frame.cursorVisible){const row=frame.rows.at(-1);ctx.fillStyle=c[frame.cursorColor];ctx.fillRect(54+ctx.measureText(row.visible).width+3,91+frame.rowIndex*27,12,21);}
 ctx.restore();ctx.strokeStyle='#293d4b';ctx.beginPath();ctx.moveTo(36,492);ctx.lineTo(924,492);ctx.stroke();
 ctx.fillStyle='#8097a9';ctx.font='13px monospace';ctx.textAlign='left';ctx.fillText('AURORA OS / AKASHIC INTERFACE',40,518);ctx.textAlign='right';ctx.fillText('SIMULATED LOG',924,518);
 if(frame.flash){ctx.fillStyle=`rgba(255,50,50,${frame.flash})`;ctx.fillRect(0,0,960,540);}
 if(frame.shade){ctx.fillStyle=`rgba(0,0,0,${frame.shade})`;ctx.fillRect(0,0,960,540);}
}

// No game, inventory, battle, audio or save dependencies. Route is fixed per play.
export function createAuroraSummoning({anchor=null,pollGamepad=true,embedded=false}={}){
 let active=null;
 function dispose(){active?.finish(false);}
 function handleInput(action){if(!active)return false;if(action==='confirm')active.confirm();return true;}
 async function play({route='normal'}={}){
  const timeline=createSummoningTimeline(route);
  if(active)return {route,completed:false};
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','AURORA OS — DIVINE SUMMONING PROTOCOL');
  dialog.style.cssText='position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:0;background:#000;overflow:hidden;touch-action:none;outline:none;';
  if(embedded)dialog.style.background='transparent';
  const style=document.createElement('style');style.textContent='dialog.aurora-boot::backdrop{background:transparent}';dialog.className='aurora-boot';dialog.append(style);
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','INITIALIZING...');
  canvas.style.cssText='position:absolute;image-rendering:auto;aspect-ratio:16/9;touch-action:none;';dialog.append(canvas);
  // Separate black cover hides the surrounding HUD without resizing the game.
  const cover=document.createElement('div');cover.style.cssText='position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;';dialog.prepend(cover);
  if(embedded)cover.hidden=true;
  document.body.append(dialog);const previousFocus=document.activeElement;
  let raf=0,start=null,offset=0,lastConfirm=-Infinity,phase='loading',ended=false,resolve;
  const heldKeys=new Set(),heldPads=new Map();let pointer=null;
  const result=new Promise(r=>resolve=r);
  function layout(){
   layoutAuroraSurface(canvas,anchor,embedded);
  }
  const ctx=canvas.getContext('2d');
  function finish(ok){
   if(ended)return;ended=true;cancelAnimationFrame(raf);
   window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('resize',layout);
   window.removeEventListener('pagehide',dispose);dialog.close();dialog.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});active=null;resolve({route,completed:ok});
   window.removeEventListener('scroll',layout,true);
  }
  function confirm(){
   const now=performance.now();if(start===null||phase==='closing'||now-lastConfirm<300)return;
   lastConfirm=now;const elapsed=now-start+offset;
   offset+=(phase==='complete'?timeline.completeAt+1000:timeline.completeAt)-elapsed;
   phase=phase==='complete'?'closing':'complete';
  }
  active={finish,confirm};
  function key(e){
   e.stopImmediatePropagation();e.preventDefault();
   if(e.type==='keyup'){heldKeys.delete(e.code);return;}
   if(e.repeat||heldKeys.has(e.code))return;heldKeys.add(e.code);
   if(['Enter','Space','KeyZ'].includes(e.code))confirm();
  }
  function pads(){
   if(!pollGamepad)return;
   for(const pad of navigator.getGamepads?.()||[]){if(!pad)continue;const down=!!pad.buttons[0]?.pressed;
    if(heldPads.has(pad.index)&&down&&!heldPads.get(pad.index))confirm();heldPads.set(pad.index,down);
   }
  }
  dialog.addEventListener('cancel',e=>e.preventDefault());
  dialog.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();if(pointer===null)pointer=e.pointerId;});
  dialog.addEventListener('pointerup',e=>{e.preventDefault();e.stopImmediatePropagation();if(pointer===e.pointerId){pointer=null;confirm();}});
  dialog.addEventListener('pointercancel',()=>pointer=null);
  dialog.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();});
  window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);window.addEventListener('resize',layout);window.addEventListener('pagehide',dispose);
  window.addEventListener('scroll',layout,true);
  dialog.showModal();layout();pads();
  function tick(now){
   if(ended)return;pads();const frame=summoningFrameAt(timeline,now-start+offset);phase=frame.ended?'ended':frame.shade>0?'closing':frame.complete?'complete':'typing';
   if(phase==='ended'){finish(true);return;}
   cover.style.opacity='1';
   canvas.setAttribute('aria-label',frame.rows.map(r=>r.visible).join('\n'));
   canvas.dataset.route=route;canvas.dataset.row=String(frame.rowIndex);canvas.dataset.cursor=frame.cursorColor;
   canvas.dataset.phase=phase;
   drawSummoningLog(ctx,frame);raf=requestAnimationFrame(tick);
  }
  start=performance.now();raf=requestAnimationFrame(tick);
  return result;
 }
 return {play,dispose,handleInput,isActive:()=>!!active};
}
