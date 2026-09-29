import { LION_CONFIG } from '../data/loewenkoenigin.js';

export const isCharmed = character => (character?.statuses || []).some(status =>
  (status.id || status.statusId) === 'charm' && status.active !== false && Number(status.remainingTurns ?? 3) > 0);

export function charmAction(rng = Math.random) {
  const roll = rng();
  if (roll < 1 / 3) return { actionType: 'guard', name: '防御' };
  return { actionType: 'wait', name: '魅了', waitMessage: roll < 2 / 3
    ? '逃げようとした！ しかし逃げられない！' : 'あなたはエルツデモーニンに見とれている…！' };
}
export function getAkashicPreparation(enemy) {
  if (!enemy?.causalityRevival || enemy.apocalypseUsed || enemy.hp > enemy.maxHp * .65) return null;
  return { id: 'phantom_apocalypse_prepare', name: '終末の予兆', actionType: 'prepareAction',
    prepareMessage: 'アマイェナクの幻影に闇の魔力が集中する…！',
    reservedAction: { id: 'phantom_apocalypse', name: 'アポカリプス', actionType: 'spell',
      presentationId: 'apocalypse', element: 'dark', spellPower: 330, powerMultiplier: 1,
      unavoidable: true, effects: [], maxHpDamageCap: .6 }
  };
}
export function capAkashicDot(enemy, end) {
  if (enemy?.akashicPhantom) for (const key of ['deadlyPoisonDamage', 'deathPoisonDamage']) {
    end[key] = Math.min(end[key], Math.floor(enemy.maxHp * LION_CONFIG.dotRates[key]));
  }
  return end;
}
export function reviveAkashicEnemy(battle, enemy, targetIndex) {
  if (!enemy?.causalityRevival || enemy.causalityUsed || enemy.hp > 0) return false;
  enemy.causalityUsed = true;
  enemy.hp = Math.floor(enemy.maxHp * .5);
  enemy.alive = true;
  const message = '因果律改変！ アマイェナクの幻影が復活した！';
  battle.log.push(message);
  battle.presentationEvents.push({ type: 'healing', targetSide: 'enemy', actorSide: 'enemy',
    ...(targetIndex == null ? {} : { targetIndex }), amount: enemy.hp, causalityRevival: true, message });
  return true;
}
