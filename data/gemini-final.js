import {hasKeyItem} from './key-items.js';
import {grantCard} from './deck.js';
export const GEMINI_FINAL_BACKGROUND='images/background/dungeon_event_21.avif';
export const GEMINI_FINAL_COMPLETE_BACKGROUND='images/background/dungeon_event_22.avif';
export function getGeminiFinalAccess(character) {
 const f=character?.eventFlags || {};
 return {blocked:!!f.gemini_final_completed || !f.gemini_fourth_completed
  || !hasKeyItem(character?.keyItems,'gemini_emblem_half') || !hasKeyItem(character?.keyItems,'gemini_emblem_other_half'),
  message:f.gemini_final_completed?'もうここに姉妹はいない。二つの紋様が静かに輝いている。':'今はこの扉は開かないようだ。'};
}
export function isGeminiFinalPlacementCorrect(slots) {return slots?.length===2 && slots[0]===0 && slots[1]===1;}
export function completeGeminiFinal(character,slots) {
 if(getGeminiFinalAccess(character).blocked || !isGeminiFinalPlacementCorrect(slots))return null;
 const result=grantCard(character.cards,'zodiac_gemini',1,character.deckCost);
 character.cards=result.cards;
 character.eventFlags={...character.eventFlags,gemini_final_completed:true};
 return result;
}
