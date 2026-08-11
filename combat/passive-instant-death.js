import { clamp } from "./combat-config.js";
import { resolveInstantDeath } from "./resolve-status-effect.js";

const PASSIVE_CONFIG = Object.freeze({
  flash_slash: Object.freeze({ primaryStat: "str", inverseStat: "agi" }),
  assassination: Object.freeze({ primaryStat: "dex", inverseStat: "str" })
});

export function calculatePassiveInstantDeathRate(passiveId, attacker = {}) {
  const config = PASSIVE_CONFIG[passiveId];
  if (!config) return 0;
  const primary = clamp(Number(attacker[config.primaryStat]) || 0, 1, 30);
  const inverse = clamp(Number(attacker[config.inverseStat]) || 0, 1, 30);
  return clamp(0.01 + (primary - 1) * 0.0035 + (30 - inverse) * 0.0014, 0.01, 0.15);
}

export function resolvePassiveInstantDeath({ passiveId, attacker, defender, rng = Math.random } = {}) {
  return resolveInstantDeath({
    defender,
    baseRate: calculatePassiveInstantDeathRate(passiveId, attacker),
    minimumRate: 0.01,
    maximumRate: 0.15,
    rng
  });
}
