export const PLAYER_CHARGE_MAX = 100;
export const PLAYER_CHARGE_GAINS = Object.freeze({ guard: 1, attack: 5, spSkill: 15 });

export function createInitialPlayerCharge() {
  return { value: 0, cooldown: 0 };
}

export function normalizePlayerCharge(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    value: clampInteger(source.value, 0, PLAYER_CHARGE_MAX),
    cooldown: clampInteger(source.cooldown, 0, 1)
  };
}

export function isPlayerChargeReady(character) {
  const state = normalizePlayerCharge(character?.playerCharge);
  return state.value >= PLAYER_CHARGE_MAX && state.cooldown === 0;
}

export function applyPlayerChargeAction(character, { commandType, spCost = 0, chargeSkill = false } = {}) {
  if (!character) return character;
  const state = normalizePlayerCharge(character.playerCharge);
  if (chargeSkill) return { ...character, playerCharge: { value: 0, cooldown: 1 } };
  if (state.cooldown > 0) return { ...character, playerCharge: { ...state, cooldown: state.cooldown - 1 } };
  const gain = commandType === "guard" ? PLAYER_CHARGE_GAINS.guard
    : commandType === "attack" ? PLAYER_CHARGE_GAINS.attack
      : commandType === "skill" && spCost > 0 ? PLAYER_CHARGE_GAINS.spSkill : 0;
  return { ...character, playerCharge: { ...state, value: Math.min(PLAYER_CHARGE_MAX, state.value + gain) } };
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)));
}
