import {GEMINI_FINAL_BACKGROUND,GEMINI_FINAL_COMPLETE_BACKGROUND,isGeminiFinalPlacementCorrect} from '../data/gemini-final.js';
const NEXT='\n＊Aボタンで次へ';
const PROMPT='白衣のシュヴェスター「ここにある台座。そしてあなたがお持ちの紋様。どうすればいいか、お分かりですわよね？」\n赤衣のシュヴェスター「この台座に紋様を置いてはいけないわ。」\n＊Aボタンで置く　Bボタンで何もしない';
const MERGED='シュヴェスター「今、二つのものが一つになりましたわ。私たちは二つでひとつ。さあ、あなたの力となりましょう。」';
export function createGeminiFinalEvent(fromGX,fromGY) {
 return {type:'geminiEvent',act:5,page:1,phase:'finalIntro',background:GEMINI_FINAL_BACKGROUND,fromGX,fromGY,
  slots:[null,null],selection:0,piece:0,reserveMessageLines:7,sistersFadeStart:performance.now(),
  message:'白衣のシュヴェスター「ついにここまでいらしたのね。これで最後ですわ。」\n赤衣のシュヴェスター「まだ最後じゃないわ。」'+NEXT};
}
function slotMessage(e) {
 return '台座に紋様を置きますか？\n◀▶で置く台座を選択　Aボタンで決定後、置く紋様を選択しAボタンで確定。Bボタンで取り消し\n選択中：'+(e.selection===0?'左':'右')+'の台座';
}
export function handleGeminiFinalInput(e,action,h) {
 if(['finalLeaving','finalDeclineFade','finalArriving','finalMerging','finalRewardFade'].includes(e.phase))return true;
 if(e.phase==='finalIntro' && action==='confirm'){e.phase='finalPrompt';h.say(PROMPT);}
 else if(e.phase==='finalPrompt') {
  if(action==='confirm'){e.phase='finalLeaving';e.sistersFadeOutStart=performance.now();h.say('');}
  if(action==='cancel'){e.phase='finalDecline';h.say('白衣のシュヴェスター「…そう。わたくしたちはここでお待ちしております。いつまでも…。」\n赤衣のシュヴェスター「わたしは待たないわよ？さよなら。」'+NEXT);}
 } else if(e.phase==='finalDecline' && action==='confirm'){e.phase='finalDeclineFade';e.sistersFadeOutStart=performance.now();h.say('');}
 else if(e.phase==='finalSlots') {
  if(action==='left'||action==='right'){e.selection=1-e.selection;h.playSe('cursorMove');h.say(slotMessage(e));}
  if(action==='confirm'){e.phase='finalPiece';e.piece=e.slots[e.selection] ?? 0;h.say(pieceMessage(e));}
  if(action==='cancel') {
   if(e.slots[e.selection]!==null){e.slots[e.selection]=null;h.say(slotMessage(e));}
   else {e.slots=[null,null];e.phase='finalPrompt';e.sistersReadyAt=performance.now();e.sistersFadeStart=performance.now();h.say(PROMPT);}
  }
 } else if(e.phase==='finalPiece') {
  if(action==='left'||action==='right'){e.piece=1-e.piece;h.playSe('cursorMove');h.say(pieceMessage(e));}
  if(action==='cancel'){e.phase='finalSlots';h.say(slotMessage(e));}
  if(action==='confirm') {
   e.slots=e.slots.map(p=>p===e.piece?null:p);e.slots[e.selection]=e.piece;h.playSe('cursorMove');
   if(isGeminiFinalPlacementCorrect(e.slots)) {
    e.background=GEMINI_FINAL_COMPLETE_BACKGROUND;e.phase='finalArriving';e.sistersReadyAt=performance.now();e.sistersFadeStart=performance.now();h.say('二つの紋様がつながり、まばゆい光を放ち始めた。');
   } else {e.phase='finalSlots';h.say((e.slots.every(p=>p!==null)?'紋様がつながらない。左右を置き直してみよう。\n':'')+slotMessage(e));}
  }
 } else if(e.phase==='finalSpeech' && action==='confirm'){e.phase='finalRewardFade';e.sistersFadeOutStart=performance.now();h.say('');}
 return true;
}
function pieceMessage(e){return '置く紋様を選んでください。\n◀▶で選択　Aボタンで確定　Bボタンで取り消し\n'+(e.piece===0?'紋様の片割れ（右へつながる紋様）':'もう一つの紋様の片割れ（左へつながる紋様）');}
export function updateGeminiFinal(e,now,h) {
 if(e.phase==='finalLeaving' && now>=e.sistersFadeOutStart+1500){e.phase='finalSlots';h.say(slotMessage(e));}
 else if(e.phase==='finalDeclineFade' && now>=e.sistersFadeOutStart+1500){e.phase='gone';h.say('姉妹は静かに姿を消した。\n＊Aボタンで部屋から出る');}
 else if(e.phase==='finalArriving' && e.sistersReadyAt && now>=Math.max(e.sistersReadyAt,e.sistersFadeStart)+1800){e.phase='finalMerging';e.mergeStart=now;}
 else if(e.phase==='finalMerging' && now>=e.mergeStart+2500){e.phase='finalSpeech';h.say(MERGED+NEXT);}
 else if(e.phase==='finalRewardFade' && now>=e.sistersFadeOutStart+1500) {
  e.phase='gone';const result=h.completeGeminiFinal?.(e.slots);
  h.say(result ? (result.gained ? 'Zカード「ジェミニ」を手に入れた！' : '双子座の試練を終えた。ジェミニはすでにあなたと共にある。')+'\n＊Aボタンで部屋から出る' : '＊Aボタンで部屋から出る');
 }
}
