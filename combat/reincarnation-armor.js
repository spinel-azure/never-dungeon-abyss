import { getReincarnationArmorSet } from '../data/reincarnation-armor.js';

export function syncArmorState(player) {
  const set = getReincarnationArmorSet(player);
  if (!set) { delete player.armorBattle; return null; }
  if (player.armorBattle?.seriesId !== set.id) player.armorBattle = {
    seriesId:set.id, firstUsed:false, casts:0, barrier:0, barrierUntil:0,
    counterUntil:0, counterFrom:0, guardTurn:-1, finishedTurn:-1
  };
  return {set,state:player.armorBattle};
}
export function armorSpellCost(cost, skill, player) {
  const set = getReincarnationArmorSet(player);
  if (!set || set.job !== 'mage' || player.armorBattle?.seriesId !== set.id
    || player.armorBattle.casts !== 3 || skill.actionType !== 'spell') return cost;
  return cost > 0 ? Math.max(1,Math.ceil(cost*(1-[0,.2,.3,.4][set.tier]))) : 0;
}
export function beginArmorCommand(battle, action) {
  const active = syncArmorState(battle.player);
  delete battle.armorCommand;
  if (!active) return;
  const {set,state} = active;
  const command = {physical:0,spell:0,initiative:0};
  if(action.actionType === 'physicalAttack') {
    if(set.job === 'warrior' && battle.turn >= state.counterFrom && battle.turn <= state.counterUntil) {
      command.physical = [0,0,.1,.15][set.tier];
      state.counterUntil = 0;
    }
    if(set.job === 'thief') {
      command.physical = state.firstUsed ? 0 : [0,.1,.15,.2][set.tier];
      command.initiative = [0,0,.05,.1][set.tier];
      state.firstUsed = true;
    }
  }
  if(set.job === 'mage' && action.actionType === 'spell') {
    if(state.casts === 3) {command.spell = [0,0,.1,.15][set.tier];state.casts=0;}
    else state.casts += 1;
  }
  battle.armorCommand = command;
}
export function armorDamageMultiplier(battle, action, target) {
  const command = battle.armorCommand;
  if(!command) return 1;
  if(action.actionType === 'physicalAttack') return 1 + command.physical
    + (target.armorOpportunityTurn === battle.turn ? 0 : command.initiative);
  return action.actionType === 'spell' ? 1 + command.spell : 1;
}
export function recordArmorGuard(battle) {
  const active=syncArmorState(battle.player);
  if(active?.set.job !== 'warrior') return;
  active.state.guardTurn=battle.turn;
  active.state.counterFrom=battle.turn+1;
  active.state.counterUntil=battle.turn+2;
}
export function grantArmorBarrier(battle, healing) {
  const active=syncArmorState(battle.player);
  if(active?.set.job !== 'priest' || !(healing>0)) return;
  const {state,set}=active;
  const amount=Math.min(Math.floor(battle.player.maxHp*.05),Math.floor(healing*[0,.05,.08,.1][set.tier]));
  if(amount<=0) return;
  state.barrier=Math.max(state.barrier,amount);
  state.barrierUntil=battle.turn+2;
}
export function absorbArmorBarrier(battle, hits) {
  const active=syncArmorState(battle.player);
  if(!active || active.state.barrierUntil<battle.turn || !(active.state.barrier>0)) return hits;
  let absorbed=0;
  const result=hits.map(hit=>{
    const amount=Math.min(active.state.barrier,Math.max(0,hit.damage));
    active.state.barrier-=amount;absorbed+=amount;
    return {...hit,damage:hit.damage-amount};
  });
  if(absorbed>0) {
    const message=`障壁が${absorbed}ダメージを防いだ！`;
    battle.log.push(message);
    battle.presentationEvents.push({type:'armorBarrierDamage',targetSide:'player',amount:absorbed,message});
  }
  return result;
}
export function finishArmorRound(battle) {
  delete battle.armorCommand;
  if(battle.outcome || battle.player.hp<=0) {delete battle.player.armorBattle;return;}
  const active=syncArmorState(battle.player);
  if(!active || active.state.finishedTurn===battle.turn) return;
  const {set,state}=active;
  state.finishedTurn=battle.turn;
  if(set.job==='warrior' && state.guardTurn===battle.turn) {
    const amount=Math.min(Math.max(0,battle.player.maxHp-battle.player.hp),
      Math.floor(battle.player.maxHp*(set.tier===3?.03:.02)));
    if(amount>0) {
      battle.player.hp+=amount;
      const message=`HPが${amount}回復した！`;
      battle.log.push(message);
      battle.presentationEvents.push({type:'healing',actorSide:'player',targetSide:'player',amount,message});
    }
  }
  if(state.barrierUntil<=battle.turn) state.barrier=0;
}
