import {getItem} from '../../data/items.js';
import {isV2TorchRestricted} from './theme-environment-v2.js';
import {getSkill} from '../../data/skills.js';
import {resolveFieldItemUse} from '../../combat/resolve-item-use.js';
import {resolveFieldSkill} from '../../combat/resolve-field-skill.js';
import {getSpecialAutoAvailability,startSpecialAutoWalker} from './session.js';
// Explicit routing boundary: new field effects must be reviewed here before
// consuming anything. Ordinary dungeon environment handlers are never called.
export const SPECIAL_FIELD_EFFECT_TARGETS=Object.freeze({
 heal_hp:'character',heal_hp_rate:'character',cure_poison:'character',cure_deadly_poison:'character',cure_bleeding:'character',
 restore_hp_full:'character',restore_sp_full:'character',restore_sp_rate:'character',cure_all_ailments:'character',wing_gift:'character',
 restore_torch:'specialMap',auto_walk_to_stairs_up:'specialMap',emergency_escape:'specialMap',
 warding_incense:'specialMap',reset_presence:'specialMap',suppress_presence_steps:'specialMap',reveal_treasures_until_return:'unavailable'
});
export function resolveSpecialFieldItem({character,itemId,session}){
 const item=getItem(itemId);
 if(item?.effects.some(e=>['warding_incense','reset_presence','suppress_presence_steps'].includes(e.id))&&session.kind!=='specialMapV2')return {accepted:false,reason:'noEffect'};
 if(itemId==='warding_incense'&&session.incenseActive)return {accepted:false,reason:'alreadyActive',message:'魔除けのお香の効果はまだ続いている。'};
 if(item?.effects.some(e=>e.id==='restore_torch')&&isV2TorchRestricted(session,character))return {accepted:false,reason:'noEffect',message:'この区域では、たいまつの光を補充できない。'};
 if(item?.usableIn.includes('dungeon')&&item.effects.some(e=>!SPECIAL_FIELD_EFFECT_TARGETS[e.id]||SPECIAL_FIELD_EFFECT_TARGETS[e.id]==='unavailable'))return {accepted:false,reason:'noEffect',message:'今は使用する必要がない。'};
 if(itemId==='auto_walker'){const a=getSpecialAutoAvailability(session);if(!a.accepted)return {accepted:false,reason:a.reason};}
 return resolveFieldItemUse({character,itemId,context:'dungeon',torchFuel:session.renderState.torchFuel,treasureCompassActive:false});
}
export function resolveSpecialFieldSkill({character,skillId,session}){
 const effect=getSkill(skillId)?.environmentEffect;
 if(effect==='restoreTorch'&&isV2TorchRestricted(session,character))return {accepted:false,reason:'noEffect',message:'この区域では、たいまつの光を補充できない。'};
 if(effect&&!['restoreTorch','autoReturn',...(session.kind==='specialMapV2'?['presenceIncreaseReduction']:[])].includes(effect))return {accepted:false,reason:'noEffect',message:'今は使用する必要がない。'};
 return resolveFieldSkill({character,skillId,context:'dungeon',torchFuel:session.renderState.torchFuel,presenceIncreaseReduction:session.presenceIncreaseReduction||0,autoReturnAvailability:getSpecialAutoAvailability(session)});
}
export function applySpecialFieldEnvironment(session,environment={}){
 if(session.kind==='specialMapV2'){
  if(environment.resetPresence){session.presence=0;session.presenceSuppressedSteps=0;}
  if(environment.suppressPresenceSteps)session.presenceSuppressedSteps=Math.max(session.presenceSuppressedSteps||0,Math.min(30,environment.suppressPresenceSteps));
  if(environment.wardingIncense)session.incenseActive=true;
  if(Number.isFinite(environment.presenceIncreaseReduction))session.presenceIncreaseReduction=Math.max(0,Math.min(1,environment.presenceIncreaseReduction));
 }
 if(environment.startAutoWalker&&!startSpecialAutoWalker(session))return false;
 if(Number.isFinite(environment.torchFuel))session.renderState.torchFuel=Math.max(0,Math.min(100,environment.torchFuel));
 return true;
}
