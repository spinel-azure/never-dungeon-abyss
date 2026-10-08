import {TRELIREN_REQUEST} from '../data/map-beta.js';
import {paginateMessageToFit} from './message-pagination.js';
import {TRELIREN_DIALOGUES} from '../data/treliren.js';
export function createTrelirenDialogue({messageEl,getRun,startOverlay,getEvent,clearOverlay,save,grantReward,playReward,finish,onClose,onCancel,needsRequest=()=>false,startTyping,completeTyping,stopTyping}){
 let pages=[],page=0,body=null,hint=null,locked=false,epoch=0;
 function cleanup(){
  stopTyping?.();epoch++;locked=false;pages=[];body=hint=null;
  messageEl.classList.remove('town-compact-talk');
  if(getEvent()?.type==='trelirenTalk')clearOverlay();
 }
 function render(){
  const run=getRun();
  messageEl.classList.add('town-compact-talk');
  body=document.createElement('span');body.className='town-talk-body';
  hint=document.createElement('span');hint.className='town-talk-hint';
  messageEl.replaceChildren(body,hint);
  pages=paginateMessageToFit({element:body,text:run.phase===5?'迷宮探検家トレリーレン「'+TRELIREN_REQUEST+'」':TRELIREN_DIALOGUES[run.firstEncounter?'first':'repeat'][run.phase]});
  page=0;show();
 }
 function show(){const text=pages[page]||'';if(startTyping)startTyping(getEvent(),text,(value,typing)=>{body.textContent=value;hint.textContent=locked||typing?'':'＊Aボタンで次へ';});else {body.textContent=text;hint.textContent=locked?'':'＊Aボタンで次へ';}}
 async function reward(){
  stopTyping?.();const token=epoch;locked=true;body.textContent='';hint.textContent='';
  if(!getRun().rewardGiven){grantReward();save();await playReward();}
  if(token!==epoch)return;
  locked=false;render();
 }
 return {
  start(){
   cleanup();const run=getRun();
   startOverlay({type:'trelirenTalk',imageId:run.firstEncounter?'treliren_portrait':'treliren_wave',
    image:run.firstEncounter?'images/npc/NPC_27c.avif':'images/npc/NPC_27d.avif',canCancel:false});
   render();save();if(run.phase===3)void reward();
  },
  handle(action){
   if(getEvent()?.type!=='trelirenTalk'||action==='dismiss')return false;
   if(action==='cancel'){cleanup();onCancel();onClose();save();return true;}
   if(locked||action!=='confirm')return true;
   if(getEvent()?.typing?.active){completeTyping?.(getEvent());return true;}
   if(++page<pages.length){show();return true;}
   const run=getRun();
   if(run.phase<4||(run.phase===4&&needsRequest())){run.phase++;save();render();if(run.phase===3)void reward();return true;}
   locked=true;hint.textContent='';getEvent().fadeStartedAt=performance.now();
   const token=epoch;
   setTimeout(()=>{if(token!==epoch)return;if(finish()===false){locked=false;hint.textContent="保存に失敗しました。Aボタンで再試行";return;}cleanup();onClose();save();},500);
   return true;
  },
  cleanup
 };
}
