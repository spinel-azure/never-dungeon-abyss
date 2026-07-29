import { collectStats } from "./collect-stats.js";
import { clamp } from "./combat-config.js";
import { applyStatus } from "./status-lifecycle.js";
import { getTrapById } from "../data/traps.js";

export function resolveTreasureTrap({
  character,
  treasureType,
  trapId,
  rng = Math.random
} = {}) {
  const trap = getTrapById(trapId);
  if (!character || !trap) {
    return { character, trap: null, disarmed: false, saved: false, damage: 0, message: "" };
  }

  const disarmRate = getDisarmRate(character, treasureType);
  const disarmed = normalizedRoll(rng) < disarmRate;
  if (disarmed) {
    return {
      character,
      trap,
      disarmRate,
      disarmed: true,
      saved: false,
      damage: 0,
      message: `${trap.name}の罠を解除した！`
    };
  }

  const saved = normalizedRoll(rng) < trap.baseSaveRate;
  const effect = applyTrapEffect(character, trap, saved);
  return {
    ...effect,
    trap,
    disarmRate,
    disarmed: false,
    saved
  };
}

export function getDisarmRate(character, treasureType) {
  if (character?.job === "thief" && treasureType === "red") return 1;
  const stats = collectStats(character);
  return clamp(stats.dex * 0.02 + numeric(character?.trapDisarmBonus), 0, 1);
}

function applyTrapEffect(character, trap, saved) {
  if (trap.effect.type === "damage") {
    if (saved && trap.saveSuccessEffect === "avoid") {
      return {
        character,
        damage: 0,
        message: `${trap.name}が作動したが、間一髪で回避した！`
      };
    }
    const multiplier = saved && trap.saveSuccessEffect === "halfDamage" ? 0.5 : 1;
    const rawDamage = Math.max(
      1,
      Math.floor(Math.max(1, Number(character.maxHp) || 1) * trap.effect.maxHpRate * multiplier)
    );
    const damage = Math.min(Math.max(0, Number(character.hp) - 1), rawDamage);
    return {
      character: { ...character, hp: Math.max(1, Number(character.hp) - damage) },
      damage,
      message: saved
        ? `${trap.name}が作動した！身をかわして${damage}ダメージに抑えた。`
        : `${trap.name}が作動した！${damage}ダメージを受けた。`
    };
  }

  if (trap.effect.type === "status") {
    if (saved && trap.saveSuccessEffect === "negateStatus") {
      return {
        character,
        damage: 0,
        message: `${trap.name}が作動したが、間一髪で回避した！`
      };
    }
    const statuses = applyStatus(character.statuses || [], {
      statusId: trap.effect.statusId,
      success: true
    });
    return {
      character: { ...character, statuses, condition: "POISON" },
      damage: 0,
      message: `${trap.name}が作動した！毒状態になった。`
    };
  }

  return { character, damage: 0, message: `${trap.name}の罠が作動した。` };
}

function normalizedRoll(rng) {
  return Math.max(0, Math.min(0.999999999, Number(rng()) || 0));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
