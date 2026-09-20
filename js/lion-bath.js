import {LION_EMPTY_BACKGROUND} from '../data/loewenkoenigin.js';
import {startLoopSe,stopLoopSe} from './audio.js';
export const LION_BATH_IMAGE='images/background/dungeon_event_24c.avif';
export const LION_BATH_CHANCE=0.0005;
const NEXT='\n＊Aボタンで次へ';
const EMPTY='玉座の間は静まり返り、誰もいないようだ。';
const PAGES=[
 '水の流れる音に誘われて玉座の間の奥へと進むとそこは沐浴場となっており、今まさにレーヴェンケーニギンが沐浴を行っていた。\n引き締まった肢体に目を奪われていると、レーヴェンケーニギンと目が合った。',
 'レーヴェンケーニギン「…貴様か。そのままでよい。妾を打ち破り「リーオー」を得た貴様になら、見られても構わぬ。他の者であれば八つ裂きであっただろうがな。\n獅子神さまへ祈りを捧げる前に、こうして身体を清めておる。」',
 'レーヴェンケーニギン「妾はまだ終わってはおらぬ。更に力をつけ、いつの日か再び貴様と相見えようぞ。それまで待っておれ…！」'
];
export function createLionAftermath(fromGX,fromGY,roll=Math.random()) {
 const rare=roll<LION_BATH_CHANCE;
 return {type:'lionEvent',aftermath:true,rare,fromGX,fromGY,phase:rare?'bathPrompt':'empty',background:LION_EMPTY_BACKGROUND,reserveMessageLines:6,
 message:rare?'玉座の間は静まり返り、誰もいないようだ…いや、耳を澄ますと水の流れる音が聞こえる…どうやら玉座の間の奥からのようだ。\n奥へ行ってみますか？\n＊Aボタン：はい　Bボタン：いいえ':EMPTY+NEXT};
}
const clamp=v=>Math.max(0,Math.min(1,v));
// Frame-driven: no queued timers survive a load, retreat or scene replacement.
export function getLionBathFrame(time,reduced=false) {
 if(reduced){if(time<200)return {throne:1-time/200,opacity:0,blur:28,scale:1};if(time<300)return {throne:0,opacity:0,blur:28,scale:1};return {throne:0,opacity:clamp((time-300)/200),blur:0,scale:1};}
 if(time<1000)return {throne:1,opacity:0,blur:28,scale:1.05};
 if(time<1700)return {throne:1-(time-1000)/700,opacity:0,blur:28,scale:1.05};
 if(time<2000)return {throne:0,opacity:0,blur:28,scale:1.05};
 if(time<2800){const p=(time-2000)/800;return {throne:0,opacity:p,blur:28-6*p,scale:1.05};}
 const p=clamp((time-2800)/1700),ease=p*p*(3-2*p);
 return {throne:0,opacity:1,blur:22*(1-ease),scale:1.05-.05*ease};
}
let session=null;
export function disposeLionBath(){if(!session)return;session.layer?.remove();session=null;stopLoopSe('lionBathWater');}
export function syncLionBath(event){
 if(session&&session.event!==event)disposeLionBath();
 if(event?.aftermath&&event.rare&&!session){session={event,layer:null};void startLoopSe('lionBathWater');}
}
export function handleLionBathInput(event,action,hooks,now){
 if(event.phase==='empty'&&action==='confirm')hooks.retreat(event);
 else if(event.phase==='bathPrompt'){
  if(action==='cancel')hooks.retreat(event);
  else if(action==='confirm'){event.phase='bathLoading';event.message='';hooks.say('');}
 }else if(event.phase==='bathTalk'&&action==='confirm'){
  event.page++;
  if(event.page<PAGES.length)hooks.say(PAGES[event.page]+NEXT);
  else{event.phase='bathExit';event.startAt=now;hooks.say('');}
 }
 return true;
}
export function updateLionBath(event,now,hooks){
 if(event.loadFailed){event.loadFailed=false;hooks.say(event.message);}
 if(event.phase==='bathReveal'&&now-event.startAt>=(event.reduced?900:4900)){
  event.phase='bathTalk';event.page=0;hooks.markLionBathSeen();hooks.say(PAGES[0]+NEXT);
 }else if(event.phase==='bathExit'&&now-event.startAt>=(event.reduced?250:1200))hooks.retreat(event);
}
function prepareLayer(ctx,event){
 if(!session||session.event!==event||session.layer)return;
 const owner=session,layer=document.createElement('div'),img=document.createElement('img');
 layer.className='lion-bath-layer';layer.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;background:#060506;';
 layer.style.zIndex=String((Number(getComputedStyle(ctx.canvas).zIndex)||1)+1);
 img.alt='';img.style.cssText='width:100%;height:100%;object-fit:fill;opacity:0;filter:blur(28px);transform:scale(1.05);display:block;';
 layer.append(img);owner.layer=layer;owner.img=img;
 // Decode both images before starting the clock; never attach a sharp image.
 const throne=new Image();throne.src=LION_EMPTY_BACKGROUND;img.src=LION_BATH_IMAGE;
 Promise.all([img.decode(),throne.decode()]).then(()=>{
  if(session!==owner||event.phase!=='bathLoading')return;
  owner.throne=throne;event.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  ctx.canvas.parentElement.append(layer);event.phase='bathReveal';event.startAt=performance.now();
 }).catch(()=>{if(session!==owner)return;event.phase='empty';event.rare=false;event.loadFailed=true;event.message='奥へは進めないようだ。'+NEXT;disposeLionBath();});
}
export function drawLionBath(ctx,event,width,height,images,load,now){
 syncLionBath(event);load(LION_EMPTY_BACKGROUND,LION_EMPTY_BACKGROUND);
 ctx.save();ctx.fillStyle='#060506';ctx.fillRect(0,0,width,height);
 let frame={throne:1,opacity:0,blur:28,scale:1.05};
 if(event.phase==='bathLoading')prepareLayer(ctx,event);
 if(event.phase==='bathReveal')frame=getLionBathFrame(now-event.startAt,event.reduced);
 else if(event.phase==='bathTalk')frame={throne:0,opacity:1,blur:0,scale:1};
 else if(event.phase==='bathExit'){const p=clamp((now-event.startAt)/(event.reduced?250:1200));frame={throne:0,opacity:1-p,blur:event.reduced?0:28*p,scale:event.reduced?1:1+.05*p};}
 const bg=images.get(LION_EMPTY_BACKGROUND);
 if(bg?.naturalWidth){ctx.globalAlpha=frame.throne;ctx.drawImage(bg,0,0,width,height);}
 ctx.restore();
 if(session?.layer?.isConnected){
  // Show the throne on the DOM underlay while its canvas counterpart fades.
  session.layer.style.backgroundImage=frame.throne>0?`linear-gradient(rgba(6,5,6,${1-frame.throne}),rgba(6,5,6,${1-frame.throne})),url("${LION_EMPTY_BACKGROUND}")`:'none';
  session.layer.style.backgroundSize='100% 100%';
  Object.assign(session.img.style,{opacity:String(frame.opacity),filter:`blur(${frame.blur}px)`,transform:`scale(${frame.scale})`});
 }
}
