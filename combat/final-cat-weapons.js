import {getWeapon} from '../data/weapons.js';
import {isPiscesInvincible} from './pisces.js';
export function finalWeaponDamageMultiplier(actor,action){
 if(action.actionType!=='physicalAttack'||action.id==='normal_attack'||Number.isFinite(Number(action.fixedDamage)))return 1;
 const weapon=getWeapon(actor.equipment?.rightArmId||actor.equipment?.weaponId,actor.equipment?.rightArmEnhancement||0);
 return 1+(weapon.physicalSkillDamageBonus||0)+(action.category==='miracle'?(weapon.statBonuses?.attackMiracleDamageBonus||0):0);
}
// Called only for direct enemy hits after all barriers/protection. Other survival
// effects run later if remaining hits still kill the player.
export function applyFinalWeaponEndurance(battle,hits){
 const p=battle.player,weapon=getWeapon(p.equipment?.rightArmId||p.equipment?.weaponId,p.equipment?.rightArmEnhancement||0);
 if(!weapon.endureDirectHit||p.weaponEndureUsed||isPiscesInvincible(p))return hits;
 let hp=p.hp;
 return hits.map(hit=>{
  if(!hit.hit||hit.damage<=0||hp<=0)return hit;
  let damage=hit.damage;
  if(!p.weaponEndureUsed&&hp>=2&&damage>=hp){
   damage=hp-1;p.weaponEndureUsed=true;
   battle.log.push('九死の一生！ HP1で踏みとどまった！');
  }
  hp=Math.max(0,hp-damage);return damage===hit.damage?hit:{...hit,damage,weaponEndured:true};
 });
}
