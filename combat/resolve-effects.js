import { resolveStatusEffect } from "./resolve-status-effect.js";

export function resolveEffects({
  effects = [],
  trigger,
  attacker,
  defender,
  rng = Math.random
} = {}) {
  return effects
    .filter(effect => (effect.trigger || "perAction") === trigger)
    .map(effect => resolveStatusEffect({ attacker, defender, effect, rng }));
}
