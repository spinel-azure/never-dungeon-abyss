export const ENEMY_DROP_RATES = Object.freeze({ none: 0.4, item: 0.55, redChest: 0.05 });
export const STILETTO_ENHANCEMENT_RATES = Object.freeze([0.5, 0.3, 0.15, 0.05]);

export function rollEnemyDrop(enemy, rng = Math.random) {
  if (enemy?.noDrop) return { kind: "none" };
  const roll = normalizedRoll(rng);
  if (roll < 0.4) return { kind: "none" };
  if (roll < 0.95) return enemy?.dropItemId
    ? { kind: "item", itemId: enemy.dropItemId, amount: 1 }
    : { kind: "none" };
  return { kind: "redChest" };
}

export function rollRedChestLoot(rng = Math.random) {
  const roll = normalizedRoll(rng);
  if (roll < 0.6) return { kind: "gold", amount: rollRedChestGold(rng) };
  if (roll < 0.8) return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  if (roll < 0.95) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  return { kind: "equipment", equipmentId: "stiletto", slot: "rightArmId",
    enhancement: rollEnhancement(STILETTO_ENHANCEMENT_RATES, rng), unidentifiedName: "？短剣" };
}

export function rollRedChestGold(rng = Math.random) {
  const roll = normalizedRoll(rng);
  return roll < 0.6 ? 10 : roll < 0.9 ? 15 : 20;
}

export function rollEnhancement(rates, rng = Math.random) {
  const roll = normalizedRoll(rng);
  let total = 0;
  for (let level = 0; level < rates.length; level += 1) {
    total += Number(rates[level]) || 0;
    if (roll < total) return level;
  }
  return Math.max(0, rates.length - 1);
}

function normalizedRoll(rng) {
  return Math.max(0, Math.min(0.999999999, Number(rng?.()) || 0));
}
