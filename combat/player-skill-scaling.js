import { getSkill } from '../data/skills.js';
import { normalizeReincarnationCount, getPhysicalReincarnationMultiplier } from '../data/reincarnation.js';

export function isScalingAttackSkill(skill = {}) {
  return Number(skill?.spCost) > 0 && !skill.chargeSkill && !skill.ultimateChargeSkill
    && ['physicalAttack', 'spell'].includes(skill.actionType);
}

export function getSkillSpMultiplier(skill, character = {}) {
  return isScalingAttackSkill(skill) ? 1 + normalizeReincarnationCount(character.reincarnationCount) : 1;
}

// Called only at the player damage-resolution boundary. Each repeat/target starts
// from its unscaled action, preserving Gemini/weapon repeats without stacking.
export function preparePlayerSkillDamage(action, character = {}) {
  if (!isScalingAttackSkill(getSkill(action.id))) return action;
  const count = normalizeReincarnationCount(character.reincarnationCount);
  const factor = 1 + 0.25 * count;
  if (action.actionType === 'spell') {
    return {
      ...action,
      ...(action.id === 'holy_light' ? { intelligenceMultiplier: 1.5 + 0.5 * count } : {}),
      powerMultiplier: (action.powerMultiplier ?? 1) * factor
    };
  }
  const holyMultiplier = action.id === 'holy_strike'
    ? getPhysicalReincarnationMultiplier(character.level, count) : 1;
  return { ...action, powerPerHit: (action.powerPerHit ?? 1) * factor * holyMultiplier };
}
