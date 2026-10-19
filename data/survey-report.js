import {normalizeSpecialMaps,mapContentId} from './special-maps.js';
import {getMapSurveyReports} from './special-map-survey-report.js';
import {getItem} from './items.js';
import {getItemCompendiumEntry} from './item-compendium.js';
import {getEquipmentItem} from './equipment.js';
import {grantItem,getItemCount} from './inventory.js';
import {grantKeyItem,hasKeyItem} from './key-items.js';
import {grantEquipmentInstance,characterOwnsEquipment} from './equipment-inventory.js';
import {normalizeReincarnationCount} from './reincarnation.js';
export const SURVEY_PRIZES=Object.freeze([
 ...['strength','intelligence','agility','dexterity','luck'].map(stat=>({id:stat+'_engraving',name:getItem(stat+'_engraving').name,cost:100,category:1})),
 {id:'attracting_incense',name:'引き寄せのお香',cost:1,category:0},
 {id:'zaubertrank',name:getItem('zaubertrank').name,cost:300,category:0},
 {id:'allheilmittel',name:getItem('allheilmittel').name,cost:600,category:0},
 {id:'hacking_device',name:'ハッキングデバイス',cost:1000,category:3,keyItem:true,once:true},
 {id:'alveter_schuhe',name:'アルヴェターシューエ',cost:250,category:2,once:true}
]);
export function surveyPrizeDetails(prize){
 if(prize.keyItem)return {category:'貴重品',description:'明らかにこの世界の物ではない。用途は不明。',effect:'転生3回時のみ、Lv.100三女神の開始HPを5％減らす。所持で有効・消費なし・交換は1回のみ。',image:getItemCompendiumEntry(prize.id)?.imageSrc};
 const item=prize.once?getEquipmentItem(prize.id,'footId'):getItem(prize.id);
 const catalog=getItemCompendiumEntry(prize.id);
 return {category:prize.once?'装備品・足':'消耗品',
  description:prize.once?`DEF＋${item.statBonuses.def}／${item.description}。一品物・交換は1回のみ。ロック状態で受け取ります。`:item.description,
  image:catalog?.imageSrc||({alveter_schuhe:'images/item-compendium/allwetterschuhe.avif',zaubertrank:'images/item-compendium/zaubertrank.avif',allheilmittel:'images/item-compendium/allheilmittel.avif'}[prize.id]||'')};
}
export function reportableMaps(character){const s=normalizeSpecialMaps(character?.specialMaps);const ids=new Set(getMapSurveyReports(s).filter(r=>r.canReport).map(r=>r.mapId));return s.registered.filter(m=>ids.has(m.id));}
const fail=error=>({ok:false,error});
export function surveyExchangeReason(character,prize){
 const s=normalizeSpecialMaps(character?.specialMaps);
 if(!hasKeyItem(character?.keyItems,'stamp_book')||!s.surveyIntroductionComplete)return '説明を聞いてから交換してください。';
 if(prize.keyItem){
  if(normalizeReincarnationCount(character.reincarnationCount)<3)return '転生3回で交換可能';
  if(hasKeyItem(character.keyItems,prize.id))return '交換済み・所持済み';
 }
 if(prize.once&&!prize.keyItem&&(s.surveyShoesExchanged||characterOwnsEquipment(character,prize.id)))return '交換済み・所持済み';
 if(s.stampPoints<prize.cost)return 'ポイント不足';
 if(!prize.once&&getItemCount(character.inventory,prize.id)>=getItem(prize.id).maxOwned)return '所持上限';
 return '';
}
export function surveyOperation(character,action,id){
 const s=normalizeSpecialMaps(character.specialMaps);let next={...character,specialMaps:s};
 if(action==='book'){
  if(hasKeyItem(character.keyItems,'stamp_book'))return {ok:true,character:next};
  next.keyItems=grantKeyItem(character.keyItems,'stamp_book').keyItems;
 }else if(action==='intro'){
  if(!hasKeyItem(character.keyItems,'stamp_book'))return fail('スタンプ帳が必要です。');
  next.specialMaps={...s,surveyIntroductionComplete:true};
 }else if(action==='report'){
  if(!hasKeyItem(character.keyItems,'stamp_book')||!s.surveyIntroductionComplete)return fail('説明を聞いてから報告してください。');
  const map=reportableMaps(character).find(m=>m.id===id);if(!map)return fail('この地図は報告できません。');
  next.specialMaps={...s,stampPoints:s.stampPoints+1,surveyRewardClaims:{...s.surveyRewardClaims,[mapContentId(map)]:true}};
 }else if(action==='exchange'){
  const prize=SURVEY_PRIZES.find(p=>p.id===id);if(!prize)return fail('交換品が見つかりません。');
  const reason=surveyExchangeReason(character,prize);if(reason)return fail(reason);
  if(prize.keyItem){next={...next,keyItems:grantKeyItem(next.keyItems,prize.id).keyItems};}
  else if(prize.once){const r=grantEquipmentInstance(next,prize.id,'footId',{locked:true});if(!r.accepted)return fail('装備を受け取れません。');next=r.character;}
  else{const r=grantItem(next.inventory,id);if(r.gained!==1)return fail('所持上限です。');next={...next,inventory:r.inventory};}
  next.specialMaps={...s,stampPoints:s.stampPoints-prize.cost,...(prize.once&&!prize.keyItem?{surveyShoesExchanged:true}:{})};
 }else return fail('未対応の操作です。');
 return {ok:true,character:next};
}
export function transactSurvey({getCharacter,setCharacter,save},action,id){
 const before=getCharacter(),r=surveyOperation(before,action,id);if(!r.ok)return r;
 setCharacter(r.character);try{if(save()===false)throw Error('save');}catch{setCharacter(before);return fail('保存に失敗しました。もう一度お試しください。');}return r;
}
