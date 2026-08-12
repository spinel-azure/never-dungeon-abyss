import { collectStats } from "./collect-stats.js";
import { resolveHealing } from "./resolve-healing.js";
import { getSkill } from "../data/skills.js";
import { getEffectiveSpCost } from "./sp-cost.js";

export function resolveFieldSkill({ character, skillId, torchFuel = 0, presenceIncreaseReduction = 0 } = {}) {
  const skill = getSkill(skillId);
  if (!character || !skill || !character.skillIds?.includes(skill.id)) {
    return { accepted: false, reason: "unknownSkill" };
  }
  if (skill.actionType !== "healing" || skill.target !== "self") {
    if (!["cureStatus", "sacrificialCure", "dungeonEffect"].includes(skill.actionType) || skill.target !== "self") {
      return { accepted: false, reason: "battleOnly" };
    }
  }
  const spCost = getEffectiveSpCost(skill, character);
  if (character.sp < spCost) {
    return { accepted: false, reason: "insufficientSp" };
  }
  if (skill.actionType === "healing" && character.hp >= character.maxHp) {
    return { accepted: false, reason: "fullHp" };
  }

  if (["cureStatus", "sacrificialCure"].includes(skill.actionType) && !hasStatus(character, skill.statusId)) {
    return { accepted: false, reason: "noEffect" };
  }

  if (skill.environmentEffect === "restoreTorch" && Number(torchFuel) >= 100) {
    return { accepted: false, reason: "fullTorch" };
  }
  if (skill.environmentEffect === "presenceIncreaseReduction" && Number(presenceIncreaseReduction) >= skill.effectValue) {
    return { accepted: false, reason: "alreadyActive" };
  }

  if (skill.actionType === "cureStatus") {
    const nextCharacter = structuredClone(character);
    nextCharacter.sp = Math.max(0, character.sp - spCost);
    nextCharacter.statuses = (nextCharacter.statuses || [])
      .filter(status => (status.statusId || status.id) !== skill.statusId);
    nextCharacter.condition = hasStatus(nextCharacter, "bleeding") ? "BLEED" : hasStatus(nextCharacter, "poison") ? "POISON" : "GOOD";
    return { accepted: true, character: nextCharacter, skill, healing: 0 };
  }

  if (skill.actionType === "sacrificialCure") {
    const nextCharacter = structuredClone(character);
    nextCharacter.statuses = (nextCharacter.statuses || [])
      .filter(status => (status.statusId || status.id) !== skill.statusId);
    const damage = Math.floor(Math.max(0, Number(character.maxHp) || 0) * skill.damageRate);
    nextCharacter.hp = Math.max(1, Number(character.hp) - damage);
    nextCharacter.condition = hasStatus(nextCharacter, "bleeding") ? "BLEED" : "GOOD";
    return { accepted: true, character: nextCharacter, skill, healing: 0, damage, environment: {} };
  }

  if (skill.actionType === "dungeonEffect") {
    const nextCharacter = structuredClone(character);
    nextCharacter.sp = Math.max(0, character.sp - spCost);
    const environment = skill.environmentEffect === "restoreTorch"
      ? { torchFuel: Math.min(100, Number(torchFuel) + skill.effectValue) }
      : { presenceIncreaseReduction: skill.effectValue };
    return { accepted: true, character: nextCharacter, skill, healing: 0, environment };
  }

  const healing = resolveHealing({
    caster: collectStats(character),
    target: character,
    healing: skill
  });
  const nextCharacter = {
    ...structuredClone(character),
    hp: Math.min(character.maxHp, character.hp + healing.actualHealing),
    sp: Math.max(0, character.sp - spCost)
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
