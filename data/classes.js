import { getInitialEquipment } from "./equipment.js";
import { getDeckCostAtLevel, getLevelGrowth, normalizeExperience } from "./growth.js";
import { createInitialCardState, normalizeCardState } from "./deck.js";
import { collectCardStatBonuses } from "./cards.js";
import {
  createInitialInventory, createInitialLootBag, createInitialWarehouse,
  normalizeInventory, normalizeLootBag, normalizeWarehouse
} from "./inventory.js";
import { collectEquippedInstanceBonuses, isEquipmentBuybackEligible, normalizeEquipmentInventory } from "./equipment-inventory.js";
import { normalizeQuestState } from "./quests.js";
import { normalizeAdventureStats } from "./adventure-stats.js";
import {
  createInitialLongMarchChallenge,
  createInitialMarathonChallenge,
  LONG_MARCH_REQUIRED_TRANSFER_FLAG,
  normalizeLongMarchChallenge,
  normalizeMarathonChallenge
} from "./marathon-challenge.js";
import { normalizeDepthReturnSettlement } from "./experience-settlement.js";
import { getLevelUnlockedSkillIds } from "./skills.js";
import { createInitialKeyItemState, normalizeKeyItemState } from "./key-items.js";
import { getItem } from "./items.js";
import { createInitialNpcSystem, normalizeNpcSystem } from "./npc-party.js";
import { createInitialPlayerCharge, normalizePlayerCharge } from "../combat/player-charge.js";

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
    initialSkillIds: Object.freeze(["magic_wall", "illusion", "fireball", "ice_bind"])
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
  const equipmentCollection = normalizeEquipmentInventory(null, equipment, null, characterClass.id);
  return {
    name: String(name || "").trim().slice(0, 12),
    job: characterClass.id,
    jobLabel: jobLabel || characterClass.label,
    level: 1,
    deckCost: getDeckCostAtLevel(1),
    cards: createInitialCardState(),
    inventory: createInitialInventory(),
    keyItems: createInitialKeyItemState(),
    warehouse: createInitialWarehouse(),
    lootBag: createInitialLootBag(),
    quests: normalizeQuestState(),
    eventFlags: {},
    adventureStats: normalizeAdventureStats(),
    marathonChallenge: createInitialMarathonChallenge(),
    longMarchChallenge: createInitialLongMarchChallenge(),
    npcSystem: createInitialNpcSystem(),
    playerCharge: createInitialPlayerCharge(),
    herbicideTrialUses: 0,
    cardPassiveStepCount: 0,
    herbicideTrialUses: 0,
    cardPassiveStepCount: 0,
    highestDungeonDepthReached: 1,
    gold: 0,
    experience: 0,
    carriedExperience: 0,
    pendingExperienceSettlement: null,
    hp: characterClass.maxHp,
    maxHp: characterClass.maxHp,
    sp: characterClass.maxSp,
    maxSp: characterClass.maxSp,
    baseStats: { ...characterClass.stats },
    equipmentStatBonuses: collectEquippedInstanceBonuses(
      equipmentCollection.equipmentInventory,
      equipmentCollection.equippedInstanceIds
    ),
    cardStatBonuses: {},
    def: 0,
    equipment,
    ...equipmentCollection,
    equipmentBuyback: [],
    itemBuyback: [],
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
  const level = Math.max(1, Math.min(197, Math.floor(Number(character.level) || 1)));
  const growth = getLevelGrowth(characterClass.id, level);
  const equipment = normalizeEquipment(character.equipment, characterClass.id);
  const equipmentCollection = normalizeEquipmentInventory(
    character.equipmentInventory,
    equipment,
    character.equippedInstanceIds,
    characterClass.id
  );
  const equipmentStatBonuses = collectEquippedInstanceBonuses(
    equipmentCollection.equipmentInventory,
    equipmentCollection.equippedInstanceIds
  );
  const cards = normalizeCardState(character.cards, growth.deckCost);
  const cardStatBonuses = collectCardStatBonuses(cards.deckSlots);
  const maxHpBeforeTaurus = growth.hp
    + Math.max(0, Math.floor(Number(equipmentStatBonuses.maxHp) || 0))
    + Math.max(0, Math.floor(Number(cardStatBonuses.maxHp) || 0));
  const maxHp = cards.deckSlots.includes("zodiac_taurus")
    ? Math.ceil(maxHpBeforeTaurus * 1.5)
    : maxHpBeforeTaurus;
  const maxSpBeforeManaBooster = growth.sp
    + Math.max(0, Math.floor(Number(equipmentStatBonuses.maxSp) || 0))
    + Math.max(0, Math.floor(Number(cardStatBonuses.maxSp) || 0));
  const maxSp = cards.deckSlots.includes("legendary_mana_booster")
    ? Math.ceil(maxSpBeforeManaBooster * 1.2)
    : maxSpBeforeManaBooster;
  const inferredDepth = character.eventFlags?.transfer_portal_b10f_unlocked ? 10 : 1;
  const normalizedEquipmentBuyback = Array.isArray(character.equipmentBuyback)
    ? structuredClone(character.equipmentBuyback)
      .filter(entry => entry?.instance?.instanceId && isEquipmentBuybackEligible(entry.instance))
      .map(entry => ({ ...entry, entryId: String(entry.entryId || `equipment:${entry.instance.instanceId}`) }))
    : [];
  const normalizedItemBuyback = Array.isArray(character.itemBuyback)
    ? structuredClone(character.itemBuyback)
      .filter(entry => getItem(entry?.itemId)?.repurchasable && Number(entry?.amount) > 0)
      .map(entry => {
        const amount = Math.max(1, Math.floor(Number(entry.amount) || 1));
        const legacyPrice = Math.max(0, Math.floor(Number(entry.price) || 0));
        const unitPrice = Math.max(0, Math.floor(Number(entry.unitPrice) || legacyPrice));
        return { ...entry, entryId: "item:latest", amount, unitPrice, price: entry.unitPrice == null ? unitPrice * amount : legacyPrice };
      })
    : [];
  const latestEquipmentBuyback = normalizedEquipmentBuyback.at(-1);
  const latestItemBuyback = normalizedItemBuyback.at(-1);
  const quests = normalizeQuestState(character.quests);
  const eventFlags = character.eventFlags && typeof character.eventFlags === "object"
    ? { ...character.eventFlags }
    : {};
  if (quests.completedQuestIds.includes("guild_011")) {
    eventFlags.support_npc_malicious_join_unlocked = true;
  }
  return {
    ...character,
    job: characterClass.id,
    jobLabel: character.jobLabel || characterClass.label,
    level,
    deckCost: growth.deckCost,
    cards,
    inventory: normalizeInventory(character.inventory),
    keyItems: normalizeKeyItemState(character.keyItems),
    warehouse: normalizeWarehouse(character.warehouse),
    lootBag: normalizeLootBag(character.lootBag),
    quests,
    eventFlags,
    adventureStats: normalizeAdventureStats(character.adventureStats),
    marathonChallenge: normalizeMarathonChallenge(character.marathonChallenge),
    longMarchChallenge: eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG]
      ? normalizeLongMarchChallenge(character.longMarchChallenge)
      : createInitialLongMarchChallenge(),
    npcSystem: normalizeNpcSystem(character.npcSystem),
    playerCharge: normalizePlayerCharge(character.playerCharge),
    herbicideTrialUses: Math.max(0, Math.min(5, Math.floor(Number(character.herbicideTrialUses) || 0))),
    cardPassiveStepCount: Math.max(0, Math.floor(Number(character.cardPassiveStepCount) || 0)) % 5,
    herbicideTrialUses: Math.max(0, Math.min(5, Math.floor(Number(character.herbicideTrialUses) || 0))),
    cardPassiveStepCount: Math.max(0, Math.floor(Number(character.cardPassiveStepCount) || 0)) % 5,
    highestDungeonDepthReached: Math.max(
      inferredDepth,
      Math.floor(Number(character.highestDungeonDepthReached) || 1)
    ),
    gold: Math.max(0, Math.floor(Number(character.gold) || 0)),
    experience: normalizeExperience(character.experience),
    carriedExperience: Math.max(0, Math.floor(Number(character.carriedExperience) || 0)),
    pendingExperienceSettlement: normalizeDepthReturnSettlement(
      character.pendingExperienceSettlement,
      character.carriedExperience
    ),
    maxHp,
    maxSp,
    hp: legacyCharacter ? maxHp : clampInteger(character.hp, 0, maxHp, maxHp),
    sp: legacyCharacter ? maxSp : clampInteger(character.sp, 0, maxSp, maxSp),
    baseStats: { ...characterClass.stats, ...(character.baseStats || {}) },
    equipmentStatBonuses,
    cardStatBonuses,
    def: Math.max(0, Number(character.def) || 0),
    equipment,
    ...equipmentCollection,
    equipmentBuyback: latestEquipmentBuyback ? [latestEquipmentBuyback] : [],
    itemBuyback: latestEquipmentBuyback ? [] : latestItemBuyback ? [latestItemBuyback] : [],
    skillIds: [...new Set([
      ...characterClass.initialSkillIds,
      ...(Array.isArray(character.skillIds) ? character.skillIds : []),
      ...getLevelUnlockedSkillIds(characterClass.id, level)
    ])],
    statuses: normalizeCharacterStatuses(character.statuses),
    bleedingStepCount: Math.max(0, Math.floor(Number(character.bleedingStepCount) || 0)) % 5,
    condition: normalizeCharacterStatuses(character.statuses).some(status => (status.statusId || status.id) === "bleeding") ? "BLEED"
      : normalizeCharacterStatuses(character.statuses).some(status => ["poison", "deadly_poison"].includes(status.statusId || status.id)) ? "POISON"
      : "GOOD",
    alive: character.alive !== false && Number(character.hp) > 0
  };
}

function normalizeCharacterStatuses(statuses) {
  if (!Array.isArray(statuses)) return [];
  return structuredClone(statuses)
    .filter(status => (status?.statusId || status?.id) !== "death_poison" && status?.expiresAfterBattle !== true)
    .map(status => {
    if (!["poison", "deadly_poison", "bleeding"].includes(status?.statusId || status?.id)) return status;
    const persistentPoison = { ...status };
    delete persistentPoison.remainingTurns;
    delete persistentPoison.duration;
    return persistentPoison;
    });
}

function normalizeEquipment(equipment, job) {
  const initial = getInitialEquipment(job);
  const merged = { ...initial, ...(equipment || {}) };
  const legacyWeaponIds = new Set(["training_dagger", "wooden_mace", "apprentice_staff"]);
  if (!equipment?.rightArmId && legacyWeaponIds.has(equipment?.weaponId)) {
    merged.weaponId = initial.weaponId;
  }
  const explicitlyHasRightArm = Object.prototype.hasOwnProperty.call(equipment || {}, "rightArmId");
  merged.rightArmId = explicitlyHasRightArm
    ? (equipment.rightArmId || null)
    : (merged.weaponId || initial.rightArmId);
  merged.weaponId = merged.rightArmId;
  return merged;
}

function clampInteger(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
