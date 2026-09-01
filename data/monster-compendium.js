import { BOSSES } from "./bosses.js";
import { enemies } from "./enemies.js";
import { findEquipmentDefinition } from "./equipment-inventory.js";
import { getItem } from "./items.js";
import { getKeyItem } from "./key-items.js";

export const MONSTER_COMPENDIUM_FILTERS = Object.freeze(["ALL", "1", "10", "20", "30", "40", "50", "60", "70", "80", "90"]);

const RACE_LABELS = Object.freeze({
  aberration: "異形", beast: "獣", construct: "造物", demon: "悪魔", dragon: "竜",
  giant: "巨人", human: "人間", insect: "昆虫", plant: "植物", slime: "粘体",
  spirit: "精霊", undead: "不死", unknown: "不明"
});
const ELEMENT_LABELS = Object.freeze({ fire: "炎", ice: "氷", lightning: "雷", holy: "聖", dark: "闇", arcane: "魔" });
const STATUS_LABELS = Object.freeze({
  poison: "毒", deadly_poison: "死毒", severe_poison: "猛毒", bleeding: "出血",
  action_skip: "行動不能", speed_down: "速度低下", silence: "沈黙", blind: "暗闇",
  death_sentence: "死の宣告"
});

const CATALOG = Object.freeze([
  ...enemies.map((monster, sourceIndex) => createCatalogEntry(monster, "enemy", sourceIndex)),
  ...Object.values(BOSSES)
    .filter(monster => monster?.isBoss === true && monster.maxHp > 0)
    .map((monster, sourceIndex) => createCatalogEntry(monster, "boss", sourceIndex))
].sort(compareCatalogEntries));

export function getMonsterCompendiumEntries(character, filter = "ALL") {
  const records = character?.compendium?.monsters || {};
  const selectedFilter = MONSTER_COMPENDIUM_FILTERS.includes(String(filter)) ? String(filter) : "ALL";
  return CATALOG
    .filter(entry => !entry.hiddenUntilEncounter || records[entry.id]?.encountered === true)
    .filter(entry => selectedFilter === "ALL" || entry.floorBand === selectedFilter)
    .map(entry => presentEntry(entry, records[entry.id]));
}

export function getMonsterCompendiumCompletion(character) {
  const records = character?.compendium?.monsters || {};
  const publicEntries = CATALOG.filter(entry => !entry.hiddenUntilEncounter);
  const encountered = publicEntries.filter(entry => records[entry.id]?.encountered === true).length;
  const defeated = publicEntries.filter(entry => records[entry.id]?.defeated === true).length;
  const total = publicEntries.length;
  return {
    encountered,
    defeated,
    total,
    percentage: total > 0 ? Math.floor((defeated / total) * 100) : 0
  };
}

export function getMonsterCompendiumCatalog() {
  return CATALOG.map(entry => ({ ...entry }));
}

function createCatalogEntry(monster, type, sourceIndex) {
  const floor = getFirstFloor(monster);
  const hiddenUntilEncounter = type === "enemy"
    ? monster.randomEncounter === false
    : monster.bossKind !== "floor" || Number(monster.floor) >= 100;
  return {
    id: monster.id,
    monster,
    type,
    sourceIndex,
    floor,
    floorBand: getFloorBand(floor),
    hiddenUntilEncounter
  };
}

function presentEntry(entry, record = {}) {
  const encountered = record?.encountered === true || record?.defeated === true;
  const defeated = record?.defeated === true;
  const monster = entry.monster;
  const discoveredDrops = (record?.discoveredDropIds || []).map(resolveCollectibleName).filter(Boolean);
  return {
    id: entry.id,
    type: entry.type,
    encountered,
    defeated,
    name: encountered ? monster.name : "？？？？？",
    image: encountered ? monster.image || "" : "",
    habitat: encountered ? formatHabitat(monster) : "？？？？？",
    race: encountered ? (RACE_LABELS[monster.race] || "不明") : "？？？",
    level: defeated ? formatStat(monster.level) : "？？",
    maxHp: defeated ? formatStat(monster.maxHp) : "？？？",
    attack: defeated ? formatStat(monster.attack ?? monster.stats?.str) : "？？",
    defense: defeated ? formatStat(monster.def ?? monster.defense) : "？？",
    stats: defeated ? {
      str: formatStat(monster.stats?.str), int: formatStat(monster.stats?.int),
      agi: formatStat(monster.stats?.agi), dex: formatStat(monster.stats?.dex), luc: formatStat(monster.stats?.luc)
    } : { str: "？？", int: "？？", agi: "？？", dex: "？？", luc: "？？" },
    experience: defeated ? formatStat(monster.experienceReward ?? monster.exp) : "？？？",
    defeatCount: defeated ? Math.max(0, Math.floor(Number(record?.defeatCount) || 0)) : 0,
    elements: defeated ? formatElements(monster.elementMultipliers) : "討伐後に記録",
    statuses: defeated ? formatStatuses(monster.statusResistances) : "討伐後に記録",
    drops: defeated ? formatDrops(discoveredDrops, hasConfiguredDrops(monster)) : "討伐後に記録"
  };
}

function compareCatalogEntries(left, right) {
  const floorDifference = (left.floor ?? 999) - (right.floor ?? 999);
  if (floorDifference !== 0) return floorDifference;
  if (left.type !== right.type) return left.type === "enemy" ? -1 : 1;
  return left.sourceIndex - right.sourceIndex;
}

function getFirstFloor(monster) {
  if (Number.isFinite(Number(monster.floor))) return Math.max(1, Math.floor(Number(monster.floor)));
  if (Array.isArray(monster.exactDepths) && monster.exactDepths.length) return Math.max(1, Math.min(...monster.exactDepths.map(Number).filter(Number.isFinite)));
  if (Number.isFinite(Number(monster.minimumDepth))) return Math.max(1, Math.floor(Number(monster.minimumDepth)));
  if (Number.isFinite(Number(monster.maximumDepth))) return 1;
  return null;
}

function getFloorBand(floor) {
  if (!Number.isFinite(floor)) return "";
  if (floor < 10) return "1";
  return String(Math.min(90, Math.floor(floor / 10) * 10));
}

function formatHabitat(monster) {
  if (Number.isFinite(Number(monster.floor))) return `B${Math.floor(Number(monster.floor))}F`;
  const exact = (monster.exactDepths || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (exact.length) return exact.map(depth => `B${depth}F`).join("・");
  const hasMinimum = Number.isFinite(Number(monster.minimumDepth));
  const hasMaximum = Number.isFinite(Number(monster.maximumDepth));
  if (!hasMinimum && !hasMaximum) return "記録なし";
  const minimum = hasMinimum ? Math.floor(Number(monster.minimumDepth)) : 1;
  const maximum = hasMaximum ? Math.floor(Number(monster.maximumDepth)) : minimum;
  return minimum === maximum ? `B${minimum}F` : `B${minimum}F～B${maximum}F`;
}

function formatStat(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))).toLocaleString("ja-JP") : "―";
}

function formatElements(multipliers = {}) {
  const entries = Object.entries(multipliers)
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) !== 1)
    .map(([id, value]) => `${ELEMENT_LABELS[id] || id.toUpperCase()}×${Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`);
  return entries.length ? entries.join("　") : "特記なし";
}

function formatStatuses(resistances = {}) {
  const entries = Object.entries(resistances).map(([id, resistance]) => {
    const label = STATUS_LABELS[id] || id;
    if (resistance?.immune === true) return `${label}無効`;
    const points = Math.max(0, Math.floor(Number(resistance?.resistancePoints) || 0));
    return points > 0 ? `${label}${points}` : "";
  }).filter(Boolean);
  return entries.length ? entries.join("　") : "特記なし";
}

function formatDrops(discoveredDrops, configured) {
  if (discoveredDrops.length) return discoveredDrops.join("　");
  return configured ? "？？？？" : "なし";
}

function hasConfiguredDrops(monster) {
  return Boolean(monster.dropItemId || monster.dropItems || monster.drops || monster.lootTable);
}

function resolveCollectibleName(id) {
  return getItem(id)?.name || getKeyItem(id)?.name || findEquipmentDefinition(id)?.name || "";
}
