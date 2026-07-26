import { collectStats } from "./collect-stats.js";
import { resolveHealing } from "./resolve-healing.js";
import { getSkill } from "../data/skills.js";

export function resolveFieldSkill({ character, skillId } = {}) {
  const skill = getSkill(skillId);
  if (!character || !skill || !character.skillIds?.includes(skill.id)) {
    return { accepted: false, reason: "unknownSkill" };
  }
  if (skill.actionType !== "healing" || skill.target !== "self") {
    return { accepted: false, reason: "battleOnly" };
  }
  if (character.sp < skill.spCost) {
    return { accepted: false, reason: "insufficientSp" };
  }
  if (character.hp >= character.maxHp) {
    return { accepted: false, reason: "fullHp" };
  }

  const healing = resolveHealing({
    caster: collectStats(character),
    target: character,
    healing: skill
  });
  const nextCharacter = {
    ...structuredClone(character),
    hp: Math.min(character.maxHp, character.hp + healing.actualHealing),
    sp: Math.max(0, character.sp - skill.spCost)
  };
  return {
    accepted: true,
    character: nextCharacter,
    skill,
    healing: healing.actualHealing
  };
}
