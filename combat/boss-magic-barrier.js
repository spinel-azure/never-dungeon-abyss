import { onWassermannfrauBarrierDamage, onWassermannfrauBarrierRecovery } from './wassermannfrau-ai.js';
export function absorbBossMagicBarrier(battle, target, damage, hold = false) {
 if (!(target?.bossMagicBarrierMax > 0) || (!(target.bossMagicBarrier > 0) && !hold) || !(damage > 0)) return damage;
 const before=target.bossMagicBarrier;
 target.bossMagicBarrier=Math.max(0,before-damage);
 const broken=before>0 && target.bossMagicBarrier===0;
 const message=broken?`${target.name}の魔力障壁が砕け散った！`:`${target.name}の魔力障壁に${Math.min(before,damage)}ダメージ！`;
 if(before>0){
  battle.log.push(message);
  battle.presentationEvents.push({type:'bossMagicBarrier',enemyId:target.id,remaining:target.bossMagicBarrier,amount:Math.min(before,damage),absorbed:true,broken,message});
 }
 onWassermannfrauBarrierDamage(battle,target,broken);
 return 0;
}
export function absorbPlayerMagic(battle, actor, target, action) {
 const amount=Math.min(target.sp,Math.ceil(Math.max(0,target.sp)*(action.absorbRate ?? .25)));
 target.sp-=amount;
 const before=actor.bossMagicBarrier;
 actor.bossMagicBarrier=Math.min(actor.bossMagicBarrierMax,before+amount*(action.barrierRecoveryMultiplier ?? 2));
 // A transition hook for a future high-tide action; opening at full does not trigger it.
 actor.bossMagicBarrierFilled=before<actor.bossMagicBarrierMax && actor.bossMagicBarrier===actor.bossMagicBarrierMax;
 const message=`${actor.name}の魔力吸収！\nSPを${amount}吸収された！ 魔力障壁が${actor.bossMagicBarrier-before}回復した！`;
 battle.log.push(message);
 battle.presentationEvents.push({type:'bossMagicBarrier',enemyId:actor.id,remaining:actor.bossMagicBarrier,playerSp:target.sp,filled:actor.bossMagicBarrierFilled,message});
 onWassermannfrauBarrierRecovery(battle,actor,before);
}
