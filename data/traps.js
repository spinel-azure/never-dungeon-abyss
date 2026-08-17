export const TREASURE_TRAP_RATES = Object.freeze({
  red: 0.2,
  purple: 0.5,
  black: 0.5,
  gold: 0.8
});

export const TRAPS = Object.freeze({
  falling_stones: Object.freeze({
    id: "falling_stones",
    name: "石つぶて",
    baseSaveRate: 0.2,
    saveSuccessEffect: "avoid",
    effect: Object.freeze({
      type: "damage",
      maxHpRate: 0.1
    })
  }),
  crossbow: Object.freeze({
    id: "crossbow",
    name: "石弓",
    baseSaveRate: 0.15,
    saveSuccessEffect: "halfDamage",
    effect: Object.freeze({
      type: "damage",
      maxHpRate: 0.25
    })
  }),
  poison_needle: Object.freeze({
    id: "poison_needle",
    name: "毒針",
    baseSaveRate: 0.2,
    saveSuccessEffect: "negateStatus",
    effect: Object.freeze({
      type: "status",
      statusId: "poison"
    })
  })
});

export function getTrapById(trapId) {
  return TRAPS[trapId] || null;
}

export function rollTreasureTrap(treasureType, rng = Math.random) {
  const rate = TREASURE_TRAP_RATES[treasureType] || 0;
  if (normalizedRoll(rng) >= rate) return null;
  const trapIds = Object.keys(TRAPS);
  const index = Math.min(
    trapIds.length - 1,
    Math.floor(normalizedRoll(rng) * trapIds.length)
  );
  return trapIds[index] || null;
}

function normalizedRoll(rng) {
  return Math.max(0, Math.min(0.999999999, Number(rng()) || 0));
}
