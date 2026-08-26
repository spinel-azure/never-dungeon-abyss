import { COMBAT_CONFIG, randomBetween } from "./combat-config.js";

export function calculateActionSpeed({ actor = {}, action = {}, rng = Math.random } = {}) {
  const random = Math.floor(randomBetween(rng, 0, COMBAT_CONFIG.speedRandomMaximum + 1));
  return {
    speed:
      numeric(actor.agi) * COMBAT_CONFIG.speedAgilityMultiplier
      + numeric(actor.speedBonus)
      + numeric(action.speedModifier)
      + getStatusSpeedModifier(actor)
      + random,
    baseAgility: numeric(actor.agi),
    tieBreaker: Number(rng?.()) || 0
  };
}

export function resolveTurnOrder(entries = [], rng = Math.random) {
  return entries
    .map(entry => ({
      ...entry,
      ...calculateActionSpeed({ actor: entry.actor, action: entry.action, rng })
    }))
    .sort((a, b) =>
      numeric(b.action?.turnPriority) - numeric(a.action?.turnPriority)
      || b.speed - a.speed
      || b.baseAgility - a.baseAgility
      || b.tieBreaker - a.tieBreaker
    );
}

export function createGuardAction() {
  return {
    id: "guard",
    name: "ぼうぎょ",
    actionType: "guard",
    speedModifier: 15
  };
}

function getStatusSpeedModifier(actor) {
  return (actor.statuses || []).reduce((total, status) => {
    if (status.active === false) return total;
    return total + numeric(status.speedModifier);
  }, 0);
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
