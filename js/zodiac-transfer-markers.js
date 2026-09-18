import { getZodiacTransferMarkers } from '../data/zodiac-transfer-markers.js';
const SYMBOLS = {
 gemini: ['ジェミニ','M8 7 Q16 11 24 7 M8 25 Q16 21 24 25 M12 9 V23 M20 9 V23'],
 aquarius: ['アクエリアス','M5 13 L10 9 16 13 22 9 27 13 M5 23 L10 19 16 23 22 19 27 23'],
 cancer: ['キャンサー','M6 12 Q16 3 26 12 M26 20 Q16 29 6 20 M12 12 A3 3 0 1 1 6 12 A3 3 0 1 1 12 12 M26 20 A3 3 0 1 1 20 20 A3 3 0 1 1 26 20'],
 scorpio: ['スコルピオ','M5 23 V10 Q8 4 11 10 V23 M11 10 Q15 4 18 10 V21 Q18 27 27 23 M23 20 L28 23 24 27'],
 pisces: ['パイシーズ','M8 5 Q19 16 8 27 M24 5 Q13 16 24 27 M5 16 H27'],
 sagittarius: ['サジタリウス','M7 25 L25 7 M14 7 H25 V18 M7 14 L18 25'],
 libra: ['リーブラ','M5 25 H27 M5 18 H11 A7 7 0 1 1 21 18 H27'],
 virgo: ['ヴァルゴ','M5 24 V10 Q8 4 11 10 V24 M11 10 Q15 4 18 10 V23 Q27 19 27 13 Q27 7 22 10 Q18 17 27 27']
};
export function appendZodiacTransferMarkers(button, character, depth) {
 const markers=getZodiacTransferMarkers(character,depth);
 if(!markers.length)return;
 const group=document.createElement('span');group.className='zodiac-transfer-markers';
 const ns='http://www.w3.org/2000/svg';
 for(const zodiac of markers){
  const [name,d]=SYMBOLS[zodiac];
  const label=zodiac==='gemini'?'この区域にシュヴェスター姉妹がいる':`この区域に${name}の未完了イベントがある`;
  const icon=document.createElementNS(ns,'svg');
  for(const [k,v] of Object.entries({viewBox:'0 0 32 32',class:'zodiac-transfer-marker',role:'img','aria-label':label}))icon.setAttribute(k,v);
  const title=document.createElementNS(ns,'title');title.textContent=label;
  const rect=document.createElementNS(ns,'rect');
  for(const [k,v] of Object.entries({x:1,y:1,width:30,height:30,rx:3,fill:'#6639b4',stroke:'#c9acff','stroke-width':1.5}))rect.setAttribute(k,v);
  const path=document.createElementNS(ns,'path');
  for(const [k,v] of Object.entries({d,fill:'none',stroke:'#fff','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(k,v);
  icon.append(title,rect,path);group.append(icon);
 }
 button.append(group);
}
