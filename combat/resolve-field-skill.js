import { collectStats } from "./collect-stats.js";
import { resolveHealing } from "./resolve-healing.js";
import { getSkill } from "../data/skills.js";

export function resolveFieldSkill({ character, skillId } = {}) {
  const skill = getSkill(skillId);
  if (!character || !skill || !character.skillIds?.includes(skill.id)) {
    return { accepted: false, reason: "unknownSkill" };
  }
  if (skill.actionType !== "healing" || skill.target !== "self") {
    if (skill.actionType !== "cureStatus" || skill.target !== "self") {
      return { accepted: false, reason: "battleOnly" };
    }
  }
  if (character.sp < skill.spCost) {
    return { accepted: false, reason: "insufficientSp" };
  }
  if (skill.actionType === "healing" && character.hp >= character.maxHp) {
    return { accepted: false, reason: "fullHp" };
  }

  if (skill.actionType === "cureStatus" && !hasStatus(character, skill.statusId)) {
    return { accepted: false, reason: "noEffect" };
  }

  if (skill.actionType === "cureStatus") {
    const nextCharacter = structuredClone(character);
    nextCharacter.sp = Math.max(0, character.sp - skill.spCost);
    nextCharacter.statuses = (nextCharacter.statuses || [])
      .filter(status => (status.statusId || status.id) !== skill.statusId);
    nextCharacter.condition = hasStatus(nextCharacter, "poison") ? "POISON" : "GOOD";
    return { accepted: true, character: nextCharacter, skill, healing: 0 };
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

function hasStatus(character, statusId) {
  return (character?.statuses || []).some(status => (status.statusId || status.id) === statusId);
}
