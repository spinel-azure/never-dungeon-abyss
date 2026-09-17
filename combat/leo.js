import { getCardById } from '../data/cards.js';

export function prepareLeoAttack(battle, command, action, repeatAction) {
  if (!battle.leoActiveAtStart || command?.type !== 'attack') return { action, repeatAction, cost: 0 };
  const card = getCardById('zodiac_leo');
  const hp = Math.max(0, battle.player.hp);
  const multiplier = hp <= battle.player.maxHp * card.lowHpThreshold
    ? card.lowHpDamageMultiplier : card.normalAttackDamageMultiplier;
  if (multiplier === card.lowHpDamageMultiplier) {
    const message = '♌ 獅子王！';
    battle.log.push(message);
    battle.presentationEvents.push({type:'message',message});
  }
  return {
    action: {...action, leoDamageMultiplier: multiplier},
    repeatAction: {...repeatAction, leoDamageMultiplier: multiplier},
    cost: Math.ceil(hp * card.attackHpCostRate)
  };
}

export function payLeoAttackCost(battle, cost) {
  const amount = Math.min(Math.max(0, battle.player.hp - 1), cost);
  if (!(amount > 0)) return;
  battle.player.hp -= amount;
  const message = `リーオーの猛攻でHPを${amount}消費した！`;
  battle.log.push(message);
  battle.presentationEvents.push({type:'leoHpCost',targetSide:'player',amount,message});
}
