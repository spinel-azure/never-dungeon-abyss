import {hasGeminiTransferMarker} from '../data/gemini-event.js';
export function appendGeminiTransferMarker(button, character, depth) {
  if (!hasGeminiTransferMarker(character, depth)) return;
  const ns='http://www.w3.org/2000/svg';
  const icon=document.createElementNS(ns,'svg');
  icon.setAttribute('viewBox','0 0 32 32');
  icon.setAttribute('class','gemini-transfer-marker');
  icon.setAttribute('role','img');
  icon.setAttribute('aria-label','この区域にシュヴェスター姉妹がいる');
  const title=document.createElementNS(ns,'title');title.textContent='この区域にシュヴェスター姉妹がいる';icon.append(title);
  const rect=document.createElementNS(ns,'rect');
  for(const [k,v] of Object.entries({x:1,y:1,width:30,height:30,rx:3,fill:'#6639b4',stroke:'#c9acff','stroke-width':1.5})) rect.setAttribute(k,v);
  const path=document.createElementNS(ns,'path');
  for(const [k,v] of Object.entries({d:'M8 7 Q16 11 24 7 M8 25 Q16 21 24 25 M12 9 V23 M20 9 V23',fill:'none',stroke:'#fff','stroke-width':2,'stroke-linecap':'round'})) path.setAttribute(k,v);
  icon.append(rect,path);button.append(icon);
}
