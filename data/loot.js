export const ENEMY_DROP_RATES = Object.freeze({ none: 0.4, item: 0.55, redChest: 0.05 });
export const STILETTO_ENHANCEMENT_RATES = Object.freeze([0.75, 0.18, 0.06, 0.01]);
export const BLACK_CHEST_STILETTO_ENHANCEMENT_RATES = Object.freeze([0.45, 0.35, 0.15, 0.05]);

export function rollEnemyDrop(enemy, rng = Math.random) {
  if (enemy?.noDrop) return { kind: "none" };
  if (enemy?.dropProfile === "blackChest") return rollBlackChestLoot(rng);
  const roll = normalizedRoll(rng);
  if (roll < 0.4) return { kind: "none" };
  if (roll < 0.95) {
    if (enemy?.dropItemId) return { kind: "item", itemId: enemy.dropItemId, amount: 1 };
    if (enemy?.dropGold) return { kind: "gold", amount: Math.max(1, Math.floor(Number(enemy.dropGold) || 0)) };
    return { kind: "none" };
  }
  return { kind: "redChest" };
}

export function rollBlackChestLoot(rng = Math.random) {
  const roll = normalizedRoll(rng);
  if (roll < 0.45) return { kind: "gold", amount: rollBlackChestGold(rng) };
  if (roll < 0.65) return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  if (roll < 0.8) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  return { kind: "equipment", equipmentId: "stiletto", slot: "rightArmId",
    enhancement: rollEnhancement(BLACK_CHEST_STILETTO_ENHANCEMENT_RATES, rng), unidentifiedName: "？短剣" };
}

export function rollBlackChestGold(rng = Math.random) {
  const roll = normalizedRoll(rng);
  return roll < 0.5 ? 30 : roll < 0.85 ? 40 : 50;
}

export function rollRedChestLoot(rng = Math.random) {
  const roll = normalizedRoll(rng);
  if (roll < 0.55) return { kind: "gold", amount: rollRedChestGold(rng) };
  if (roll < 0.75) return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  if (roll < 0.88) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
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
