import {getItem} from '../../data/items.js';
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
 warding_incense:'unavailable',reset_presence:'unavailable',suppress_presence_steps:'unavailable',reveal_treasures_until_return:'unavailable'
});
export function resolveSpecialFieldItem({character,itemId,session}){
 const item=getItem(itemId);
 if(item?.usableIn.includes('dungeon')&&item.effects.some(e=>!SPECIAL_FIELD_EFFECT_TARGETS[e.id]||SPECIAL_FIELD_EFFECT_TARGETS[e.id]==='unavailable'))return {accepted:false,reason:'noEffect',message:'今は使用する必要がない。'};
 if(itemId==='auto_walker'){const a=getSpecialAutoAvailability(session);if(!a.accepted)return {accepted:false,reason:a.reason};}
 return resolveFieldItemUse({character,itemId,context:'dungeon',torchFuel:session.renderState.torchFuel,treasureCompassActive:false});
}
export function resolveSpecialFieldSkill({character,skillId,session}){
 const effect=getSkill(skillId)?.environmentEffect;
 if(effect&&!['restoreTorch','autoReturn'].includes(effect))return {accepted:false,reason:'noEffect',message:'今は使用する必要がない。'};
 return resolveFieldSkill({character,skillId,context:'dungeon',torchFuel:session.renderState.torchFuel,presenceIncreaseReduction:0,autoReturnAvailability:getSpecialAutoAvailability(session)});
}
export function applySpecialFieldEnvironment(session,environment={}){
 if(environment.startAutoWalker&&!startSpecialAutoWalker(session))return false;
 if(Number.isFinite(environment.torchFuel))session.renderState.torchFuel=Math.max(0,Math.min(100,environment.torchFuel));
 return true;
}
