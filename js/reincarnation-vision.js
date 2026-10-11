import {paginateMessageToFit} from './message-pagination.js';
import {EffectEngine} from './effects/effect-engine.js';
import {createStageFilter} from './effects/effect-stage.js';

export const REINCARNATION_VISION_IMAGE='images/background/dungeon_event_25b.avif';
export const REINCARNATION_VISION_IMAGES=[REINCARNATION_VISION_IMAGE,'images/background/dungeon_event_25c.avif','images/background/dungeon_event_25.avif'];
export const isReincarnationVisionEligible=character=>Number(character?.reincarnationCount)===3 && Number(character?.level)>=197 && !character?.eventFlags?.reincarnation_lumina_completed;
export const finalReincarnationMessage=name=>`黄金の稲穂の女神ルミナ「${name}、聞こえますか…。私たちがあなたの限界を引き上げる事が出来るのはここまでです。よくぞここまで己を鍛え上げましたね。あなたに安らぎを与えましょう…。」`;

export function createReincarnationVision({host,message}){
 let active=null;
 const hint='\n＊Aボタンで次へ';
 function handleInput(action){
  if(!active)return false;
  if(action==='confirm'&&active.ready){active.ready=false;active.next?.();}
  return true;
 }
 function dispose(){active?.finish(false);}
 async function play(name){
  dispose();
  const previousInstantText=message.dataset.instantText;
  message.dataset.instantText='true';
  const root=document.createElement('div');root.className='reincarnation-vision';
  root.style.cssText='position:absolute;inset:0;z-index:4;background:#fff;overflow:hidden';
  const picture=document.createElement('img');picture.src=REINCARNATION_VISION_IMAGE;picture.alt='黄金の稲穂の女神ルミナ';
  picture.style.cssText='visibility:hidden;position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
  const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.append(picture,canvas);host.append(root);
  const engine=new EffectEngine(canvas,{transparent:true,backdrop:false,onScreen:createStageFilter(root,()=>({width:960,height:540}))});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const guard=event=>{
   if(event.target instanceof Element&&event.target.closest('#buttonA'))return;
   event.preventDefault();event.stopImmediatePropagation();
  };
  const guardedEvents=['pointerdown','pointerup','click','touchend'];
  for(const type of guardedEvents)document.addEventListener(type,guard,{capture:true,passive:false});
  let resolve,ended=false;
  const result=new Promise(done=>{resolve=done;});
  const state={ready:false,next:null,finish(ok){if(ended)return;ended=true;if(previousInstantText===undefined)delete message.dataset.instantText;else message.dataset.instantText=previousInstantText;engine.stop(false);state.next?.();for(const type of guardedEvents)document.removeEventListener(type,guard,true);root.remove();if(active===state)active=null;resolve(ok);}};
  active=state;
  const pause=ms=>Promise.race([new Promise(done=>setTimeout(done,ms)),result]);
  const animate=async frames=>{
   if(ended)return;
   const animation=picture.animate(frames,{duration:reduced?160:1400,fill:'forwards',easing:'ease-in-out'});
   await Promise.race([animation.finished.catch(()=>{}),result]);animation.cancel();
  };
  const changeImage=async src=>{
   await animate([{filter:'blur(0px)',opacity:1},{filter:'blur(22px)',opacity:0}]);
   if(ended)return;
   picture.style.opacity='0';picture.src=src;
   await Promise.race([picture.decode().catch(()=>{}),pause(3000)]);
   await animate([{filter:'blur(22px)',opacity:0},{filter:'blur(0px)',opacity:1}]);
   picture.style.opacity='1';
  };
  const next=()=>new Promise(done=>{state.next=done;state.ready=true;});
  const effect=parts=>({version:3,id:'reincarnation-vision',width:960,height:540,duration:reduced?160:1100,parts,audioTracks:[]});
  // Image loading is bounded; a missing asset must never lock the ceremony.
  await Promise.race([picture.decode().catch(()=>{}),new Promise(done=>setTimeout(done,3000))]);
  if(ended)return result;
  engine.load(effect([{type:'whiteout',enabled:true,start:0,duration:reduced?160:700,color:'#ffffff',intensity:1,fadeIn:0,hold:0,fadeOut:reduced?160:700}]));
  picture.style.visibility='visible';root.style.background='#000';
  picture.style.opacity='0';
  await Promise.all([engine.play(),animate([{filter:'blur(22px)',opacity:0},{filter:'blur(0px)',opacity:1}])]);
  picture.style.opacity='1';
  if(ended)return result;
  const pages=paginateMessageToFit({element:message,text:finalReincarnationMessage(name),formatPage:text=>text+hint});
  for(const page of pages){
   message.textContent=page+hint;
   await next();
   if(ended)return result;
  }
  message.textContent='';
  await changeImage(REINCARNATION_VISION_IMAGES[1]);
  await pause(5000);
  if(ended)return result;
  await changeImage(REINCARNATION_VISION_IMAGES[2]);
  if(ended)return result;
  message.textContent='＊Aボタンで次へ';
  await next();
  if(ended)return result;
  const closing=paginateMessageToFit({element:message,text:'黄金の稲穂の女神ルミナ「私たちはいつでもあなたを見守っておりますよ…。」',formatPage:text=>text+hint});
  for(let index=0;index<closing.length;index++){
   const last=index===closing.length-1;
   message.textContent=closing[index]+(last?'':hint);
   if(last)await pause(3000);else await next();
   if(ended)return result;
  }
  message.textContent='';
  engine.load(effect(reduced
   ? [{type:'blackout',enabled:true,start:0,duration:160,color:'#000000',intensity:1,fadeIn:160,hold:0,fadeOut:0}]
   : [{type:'whiteout',enabled:true,start:0,duration:800,color:'#ffffff',intensity:1,fadeIn:250,hold:550,fadeOut:0},
      {type:'tvOff',enabled:true,start:250,duration:850,collapse:500}]));
  await engine.play();picture.style.visibility='hidden';state.finish(true);
  return result;
 }
 return {play,handleInput,dispose,isActive:()=>!!active};
}
