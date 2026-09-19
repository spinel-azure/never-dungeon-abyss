import {LOEWENKOENIGIN_ID, LION_CONFIG, LION_INTRO, LION_VICTORY, LION_FAREWELL,
  LION_BACKGROUND, LION_EMPTY_BACKGROUND, LION_DEFEATED_IMAGE} from '../data/loewenkoenigin.js';

const NEXT = '\n＊Aボタンで次へ';
export function createLionIntro(fromGX, fromGY) {
  return {type:'lionEvent', bossId:LOEWENKOENIGIN_ID, phase:'intro', page:0,
    fromGX, fromGY, reserveMessageLines:6, background:LION_BACKGROUND, message:LION_INTRO[0]+NEXT};
}
export function createLionVictory(gained) {
  return {type:'lionEvent', bossId:LOEWENKOENIGIN_ID, phase:'victory', gained,
    reserveMessageLines:6, background:LION_EMPTY_BACKGROUND, message:LION_VICTORY+NEXT};
}
export function handleLionInput(event, action, hooks, now=performance.now()) {
  if(action!=='confirm') return true;
  if(event.phase==='intro') {
    event.page++;
    if(event.page===LION_INTRO.length-1) {event.phase='challenge';event.startAt=now;}
    hooks.say(LION_INTRO[event.page]+(event.phase==='intro'?NEXT:''));
  } else if(event.phase==='victory') {
    event.phase='reward';
    // The item/defeat flag is already saved atomically by the battle result handler.
    Promise.resolve(event.gained ? hooks.playLeoReward() : null).then(()=>{
      if(!hooks.isCurrent(event))return;
      event.phase='acquired';
      hooks.say((event.gained?'最後のZカード「リーオー」を手に入れた！':'Zカード「リーオー」はすでに所持している。')+NEXT);
    });
  } else if(event.phase==='acquired') {
    event.phase='farewell';event.fadeStart=now;hooks.say(LION_FAREWELL);
  } else if(event.phase==='gone') hooks.close();
  return true;
}
export function updateLionEvent(event, now, hooks) {
  if(event.phase==='challenge' && now>=event.startAt+LION_CONFIG.introDelayMs) {
    event.phase='battle';hooks.close();hooks.beginBossBattle(LOEWENKOENIGIN_ID);
  } else if(event.phase==='farewell' && now>=event.fadeStart+LION_CONFIG.fadeMs) {
    event.phase='gone';hooks.say(LION_FAREWELL+NEXT);
  }
}
export function drawLionEvent(ctx,event,width,height,images,load,now=performance.now()) {
  load(event.background,event.background);
  load(LION_DEFEATED_IMAGE,LION_DEFEATED_IMAGE);
  ctx.save();ctx.fillStyle='#060506';ctx.fillRect(0,0,width,height);
  const background=images.get(event.background);
  if(background?.naturalWidth)ctx.drawImage(background,0,0,width,height);
  if(['victory','reward','acquired','farewell'].includes(event.phase)) {
    const image=images.get(LION_DEFEATED_IMAGE);
    if(image?.naturalWidth) {
      const scale=Math.min(width*.85/image.naturalWidth,height*.95/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      ctx.globalAlpha=event.phase==='farewell'?Math.max(0,1-(now-event.fadeStart)/LION_CONFIG.fadeMs):1;
      ctx.shadowColor='#ffd779';ctx.shadowBlur=18;
      ctx.drawImage(image,(width-w)/2,height-h,w,h);
    }
  }
  ctx.restore();
}
