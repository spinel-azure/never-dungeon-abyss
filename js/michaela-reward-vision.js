import {createReincarnationVision} from './reincarnation-vision.js';
import {paginateMessageToFit} from './message-pagination.js';

export const MICHAELA_REWARD_IMAGES=Object.freeze([
 'images/background/dungeon_event_27.avif',
 'images/background/dungeon_event_27b.avif',
 'images/background/dungeon_event_27c.avif'
]);

// Prepared presentation only. No gameplay trigger, boss ID, or save flag yet.
// The caller supplies final dialogue, routes input, manages BGM, and persists
// completion only when play() returns true. Disposing returns false.
export function createMichaelaRewardVision({host,message,playJingle}){
 const vision=createReincarnationVision({host,message,celebration:{
  images:MICHAELA_REWARD_IMAGES,alt:'女王ミカエラのご褒美',playJingle
 }});
 let active=null;
 function dispose(){
  if(active){active.cancelled=true;active.resume?.();}
  vision.dispose();
 }
 async function play(dialogue){
  if(typeof dialogue!=='string'||!dialogue.trim())throw new TypeError('女王ミカエラの確定した台詞を指定してください。');
  if(active)throw new Error('女王ミカエラの演出は再生中です。');
  const state={cancelled:false,resume:null};active=state;
  const previous=message.dataset.instantText;
  message.dataset.instantText='true';
  try{
   const hint='\n＊Aボタンで次へ';
   const pages=paginateMessageToFit({element:message,text:dialogue,formatPage:text=>text+hint});
   for(const page of pages){
    message.textContent=page+hint;
    await new Promise(resolve=>{state.resume=resolve;});
    state.resume=null;
    if(state.cancelled)return false;
   }
   message.textContent='';
   return await vision.play('');
  }finally{
   if(previous===undefined)delete message.dataset.instantText;else message.dataset.instantText=previous;
   active=null;
  }
 }
 function handleInput(action){
  if(!active)return false;
  if(vision.isActive())return vision.handleInput(action);
  if(action==='confirm'&&active.resume){const next=active.resume;active.resume=null;next();}
  return true;
 }
 return {play,handleInput,dispose,isActive:()=>!!active};
}
