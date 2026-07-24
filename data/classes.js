import { collectEquipmentBonuses, getInitialEquipment } from "./equipment.js";

export const STAT_KEYS = Object.freeze(["str", "int", "agi", "dex", "luc"]);

export const CHARACTER_CLASSES = Object.freeze({
  WARRIOR: Object.freeze({
    id: "warrior",
    label: "WARRIOR",
    name: "戦士",
    stats: Object.freeze({ str: 8, int: 2, agi: 5, dex: 5, luc: 4 }),
    maxHp: 30,
    maxSp: 15,
    initialSkillIds: Object.freeze(["armor_break", "power_strike", "unyielding_stance"])
  }),
  THIEF: Object.freeze({
    id: "thief",
    label: "THIEF",
    name: "盗賊",
    stats: Object.freeze({ str: 4, int: 3, agi: 7, dex: 7, luc: 3 }),
    maxHp: 25,
    maxSp: 20,
    initialSkillIds: Object.freeze(["quick_strike", "poison_blade", "shadow_bind"])
  }),
  PRIEST: Object.freeze({
    id: "priest",
    label: "PRIEST",
    name: "僧侶",
    stats: Object.freeze({ str: 5, int: 6, agi: 4, dex: 4, luc: 5 }),
    maxHp: 20,
    maxSp: 25,
    initialSkillIds: Object.freeze(["holy_strike", "healing_prayer", "guardian_prayer"])
  }),
  MAGE: Object.freeze({
    id: "mage",
    label: "MAGE",
    name: "魔術師",
    stats: Object.freeze({ str: 2, int: 8, agi: 5, dex: 5, luc: 4 }),
    maxHp: 15,
    maxSp: 30,
    initialSkillIds: Object.freeze(["illusion", "fireball", "ice_bind"])
  })
});

const CLASSES_BY_ID = Object.freeze(Object.fromEntries(
  Object.values(CHARACTER_CLASSES).map(characterClass => [characterClass.id, characterClass])
));

export function getCharacterClass(id) {
  return CLASSES_BY_ID[String(id || "").toLowerCase()] || null;
}

export function createInitialCharacter({ name, job, jobLabel } = {}) {
  const characterClass = getCharacterClass(job) || CHARACTER_CLASSES.WARRIOR;
  const equipment = getInitialEquipment(characterClass.id);
  return {
    name: String(name || "").trim().slice(0, 12),
    job: characterClass.id,
    jobLabel: jobLabel || characterClass.label,
    level: 1,
    experience: 0,
    carriedExperience: 0,
    hp: characterClass.maxHp,
    maxHp: characterClass.maxHp,
    sp: characterClass.maxSp,
    maxSp: characterClass.maxSp,
    baseStats: { ...characterClass.stats },
    equipmentStatBonuses: collectEquipmentBonuses(equipment),
    cardStatBonuses: {},
    def: 0,
    equipment,
    skillIds: [...characterClass.initialSkillIds],
    statuses: [],
    condition: "GOOD",
    alive: true
  };
}

export function normalizeCharacter(character) {
  if (!character || typeof character !== "object") return null;
  const characterClass = getCharacterClass(character.job) || CHARACTER_CLASSES.WARRIOR;
  const legacyCharacter = !character.baseStats || !Array.isArray(character.skillIds);
  const maxHp = legacyCharacter
    ? characterClass.maxHp
    : positiveInteger(character.maxHp, characterClass.maxHp);
  const maxSp = legacyCharacter
    ? characterClass.maxSp
    : positiveInteger(character.maxSp, characterClass.maxSp);
  const equipment = normalizeEquipment(character.equipment, characterClass.id);
  return {
    ...character,
    job: characterClass.id,
    jobLabel: character.jobLabel || characterClass.label,
    maxHp,
    maxSp,
    hp: legacyCharacter ? maxHp : clampInteger(character.hp, 0, maxHp, maxHp),
    sp: legacyCharacter ? maxSp : clampInteger(character.sp, 0, maxSp, maxSp),
    baseStats: { ...characterClass.stats, ...(character.baseStats || {}) },
    equipmentStatBonuses: collectEquipmentBonuses(equipment),
    cardStatBonuses: { ...(character.cardStatBonuses || {}) },
    def: Math.max(0, Number(character.def) || 0),
    equipment,
    skillIds: Array.isArray(character.skillIds)
      ? [...character.skillIds]
      : [...characterClass.initialSkillIds],
    statuses: Array.isArray(character.statuses) ? structuredClone(character.statuses) : [],
    condition: character.condition || "GOOD",
    alive: character.alive !== false && Number(character.hp) > 0
  };
}

function normalizeEquipment(equipment, job) {
  const initial = getInitialEquipment(job);
  const merged = { ...initial, ...(equipment || {}) };
  const legacyWeaponIds = new Set(["training_dagger", "wooden_mace", "apprentice_staff"]);
  if (!equipment?.rightArmId && legacyWeaponIds.has(equipment?.weaponId)) {
    merged.weaponId = initial.weaponId;
  }
  merged.rightArmId = merged.weaponId || merged.rightArmId || initial.rightArmId;
  merged.weaponId = merged.rightArmId;
  return merged;
}

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
