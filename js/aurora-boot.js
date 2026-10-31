export const AURORA_BOOT_IMAGE='images/background/dungeon_event_28.avif';
export const AURORA_SIZE=Object.freeze({width:960,height:540});
export const AURORA_PROGRESS=Object.freeze([[0,0],[800,.35],[1500,.7],[2300,.9],[2800,.95],[3300,.95],[3500,1]].map(Object.freeze));
// Coordinates measured inside the frame of the 1600 x 900 source image.
export const AURORA_BAR=Object.freeze({x:360,y:371,width:240,height:15});
export function auroraProgressAt(ms){
 if(ms<=0)return 0;
 for(let i=1;i<AURORA_PROGRESS.length;i++){
  const [t,p]=AURORA_PROGRESS[i], [lastT,lastP]=AURORA_PROGRESS[i-1];
  if(ms<=t)return lastP+(p-lastP)*(ms-lastT)/(t-lastT);
 }
 return 1;
}
export function auroraFrameAt(ms){
 if(ms<300)return {phase:'blackout',progress:0,shade:Math.max(0,ms/300)};
 if(ms<3800)return {phase:'initializing',progress:auroraProgressAt(ms-300),shade:0};
 if(ms<4600)return {phase:'complete',progress:1,shade:0,glow:Math.min(1,(ms-3800)/250)};
 return {phase:ms<4900?'closing':'ended',progress:1,shade:Math.min(1,(ms-4600)/300),glow:1};
}
export function drawAuroraBoot(ctx,image,frame){
 const {width,height}=AURORA_SIZE;
 ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
 if(frame.phase!=='blackout'){
  ctx.drawImage(image,0,0,width,height);
  const b=AURORA_BAR,count=40,lit=Math.floor(frame.progress*count+1e-8);
  if(frame.progress>=1){
   const glow=Math.max(0,Math.min(1,frame.glow??1));
   ctx.save();ctx.globalCompositeOperation='screen';
   ctx.shadowColor='rgba(203,156,255,'+(0.65*glow)+')';ctx.shadowBlur=12;
   ctx.fillStyle='rgba(206,172,255,'+(0.16*glow)+')';
   ctx.fillRect(b.x,b.y,b.width-2,b.height);
   ctx.restore();
  }
  ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.width,b.height);ctx.clip();
  for(let i=0;i<lit;i++){
   const x=b.x+i*6;ctx.fillStyle='#ad65ee';ctx.fillRect(x,b.y,4,b.height);
   ctx.fillStyle='#e8c9ff';ctx.fillRect(x,b.y,4,3);
   ctx.fillStyle='#d29aff';ctx.fillRect(x,b.y+3,4,8);
  }ctx.restore();
  ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='18px AuroraPixel, monospace';
  ctx.fillStyle='#dbc6ff';ctx.shadowColor='#080316';ctx.shadowBlur=0;ctx.shadowOffsetX=1;ctx.shadowOffsetY=1;
  ctx.fillText(frame.progress>=1?'INITIALIZATION COMPLETE':'INITIALIZING...',480,404);
  if(frame.progress>=1){ctx.font='12px AuroraPixel, monospace';ctx.fillStyle='#b6f5ef';ctx.fillText('SYSTEM ONLINE',480,419);}
  ctx.shadowOffsetX=ctx.shadowOffsetY=0;
 }
 if(frame.shade>0){ctx.fillStyle=`rgba(0,0,0,${frame.shade})`;ctx.fillRect(0,0,width,height);}
}

// Independent presentation: no audio, storage, game state or battle dependency.
// A future game caller must pause its simulation and route abstract gamepad
// actions to handleInput(), or disable its own gamepad dispatcher while active.
export function createAuroraBoot({imageUrl=new URL('../'+AURORA_BOOT_IMAGE,import.meta.url).href,anchor=null,pollGamepad=true}={}){
 let active=null;
 function dispose(){active?.finish(false);}
 function handleInput(action){if(!active)return false;if(action==='confirm')active.confirm();return true;}
 async function play(){
  if(active)return false;
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','AURORA OS');
  dialog.style.cssText='position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:0;background:transparent;overflow:hidden;touch-action:none;outline:none;';
  const style=document.createElement('style');style.textContent='dialog.aurora-boot::backdrop{background:transparent}';dialog.className='aurora-boot';dialog.append(style);
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;canvas.setAttribute('aria-label','INITIALIZING...');
  canvas.style.cssText='position:absolute;image-rendering:pixelated;aspect-ratio:16/9;touch-action:none;';dialog.append(canvas);
  // Separate black cover hides the surrounding HUD without resizing the game.
  const cover=document.createElement('div');cover.style.cssText='position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;';dialog.prepend(cover);
  document.body.append(dialog);const previousFocus=document.activeElement;
  let raf=0,loadTimer=0,start=null,offset=0,lastConfirm=-Infinity,phase='loading',ended=false,resolve;
  const heldKeys=new Set(),heldPads=new Map();let pointer=null;
  const image=new Image();const result=new Promise(r=>resolve=r);
  function layout(){
   const rect=anchor?.getBoundingClientRect();const w=Math.min(rect?.width||innerWidth,innerWidth,innerHeight*16/9),h=w*9/16;
   canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.left=((innerWidth-w)/2)+'px';canvas.style.top=(rect?Math.max(0,Math.min(rect.top,innerHeight-h)):(innerHeight-h)/2)+'px';
  }
  const ctx=canvas.getContext('2d');
  function finish(ok){
   if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(loadTimer);image.onload=image.onerror=null;
   window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('resize',layout);
   window.removeEventListener('pagehide',dispose);dialog.close();dialog.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});active=null;resolve(ok);
  }
  function confirm(){
   const now=performance.now();if(start===null||phase==='closing'||now-lastConfirm<300)return;
   lastConfirm=now;const elapsed=now-start+offset;
   offset+=(phase==='complete'?4600:3800)-elapsed;
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
  dialog.showModal();layout();pads();
  function tick(now){
   if(ended)return;pads();const frame=auroraFrameAt(now-start+offset);phase=frame.phase;
   if(phase==='ended'){finish(true);return;}
   cover.style.opacity=frame.phase==='blackout'?String(frame.shade):'1';
   canvas.setAttribute('aria-label',frame.progress>=1?'INITIALIZATION COMPLETE / SYSTEM ONLINE':'INITIALIZING...');
   canvas.dataset.phase=phase;canvas.dataset.progress=String(frame.progress);
   drawAuroraBoot(ctx,image,frame);raf=requestAnimationFrame(tick);
  }
  loadTimer=setTimeout(()=>finish(false),5000);
  image.onerror=()=>finish(false);
  image.onload=async()=>{
   clearTimeout(loadTimer);
   try{const font=new FontFace('AuroraPixel',`url(${new URL('../fonts/k8x12.woff2',import.meta.url).href})`);await Promise.race([font.load().then(f=>document.fonts.add(f)),new Promise(r=>{loadTimer=setTimeout(r,1000);})]);}catch{}
   if(ended)return;clearTimeout(loadTimer);start=performance.now();raf=requestAnimationFrame(tick);
  };
  image.src=imageUrl;
  return result;
 }
 return {play,dispose,handleInput,isActive:()=>!!active};
}
