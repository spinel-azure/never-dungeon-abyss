import { getFloorZone } from "./floor-zone-names.js";
import { getEquippedWeaponElement } from "../combat/weapon-element.js";

export const EXPLORATION_OBSTACLE_TARGET_COUNT = 3;
export const EXPLORATION_OBSTACLE_MAGIC_SP_COST = 10;

// These survey floors must remain fully traversable without spending another resource.
export const FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR = 35;
export const GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR = 45;

export const EXPLORATION_OBSTACLES = Object.freeze({
  crystal_cluster: Object.freeze({
    id: "crystal_cluster", name: "結晶塊", zoneName: "Kristall-Zone",
    imageId: "NPC_event_31", image: "images/npc/NPC_event_31.avif",
    renderScale: 1.9, renderEffect: "ice-sparkle", minimapMarker: "▲", minimapColor: "#cf9aff",
    removalKind: "smash", removalSe: "crystalObstacleBreak",
    weaponConfirmMessage: "行く手を結晶塊が阻んでいるが、衝撃を与えれば簡単に砕けそうだ。\n砕きますか？Aボタン：はい　Bボタン：いいえ",
    weaponResultMessage: "結晶塊は淡く光って砕け散った！…砕ける際、脱力感に襲われた！"
  }),
  dark_orb: Object.freeze({
    id: "dark_orb", name: "闇球", zoneName: "Finsternis-Zone",
    imageId: "NPC_event_30", image: "images/npc/NPC_event_30.avif",
    renderScale: 1.9, renderEffect: "dark-waver", minimapMarker: "▲", minimapColor: "#a96aeb",
    removalKind: "holy", requiredWeaponElement: "holy", weaponElementLabel: "光",
    removalSe: "darkObstacleDispel", weaponAction: "闇球を払い",
    blockedMessage: "揺らめく闇球が行く手を遮っている。\n光属性を帯びた武器か、エリカの光の奇蹟なら払えそうだ。",
    helperMessage: "エリカ「光の奇蹟で、この闇を払いましょう。」",
    helperResultMessage: "エリカが光の奇蹟を唱えると、闇球は光に包まれて消え去った！",
    weaponResultMessage: "光をまとった武器を振るうと、闇球は光に包まれて消え去った！"
  }),
  fire_pillar: Object.freeze({
    id: "fire_pillar",
    name: "火柱",
    zoneName: "Glut-Zone",
    excludedFloor: FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR,
    imageId: "NPC_event_21",
    image: "images/npc/NPC_event_21.avif",
    renderScale: 1.9,
    renderEffect: "fire-waver",
    minimapMarker: "▲",
    minimapColor: "#ff554f",
    requiredWeaponElement: "ice",
    weaponElementLabel: "氷",
    blockedMessage: "激しく燃え上がる火柱が行く手を遮っている。\n氷属性を帯びた武器なら、この火柱を消せそうだ。",
    magicName: "氷の術式",
    magicConfirmMessage: "氷の術式で火柱を消しますか？\n必要SP：10\n＊Aボタン：はい　Bボタン：いいえ",
    magicResultMessage: "氷の術式を放つと、火柱は白い蒸気を上げて消え去った！",
    johanMessage: "ヨハン「この程度なら、俺に任せろ。」",
    johanResultMessage: "ヨハンが氷の術式を組み上げると、火柱は白い蒸気を上げて消え去った！",
    weaponAction: "火柱を消し",
    weaponResultMessage: "氷をまとった武器を振るうと、火柱は白い蒸気を上げて消え去った！"
  }),
  giant_ice_block: Object.freeze({
    id: "giant_ice_block",
    name: "巨大氷塊",
    zoneName: "Frost-Zone",
    excludedFloor: GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR,
    imageId: "NPC_event_22",
    image: "images/npc/NPC_event_22.avif",
    renderScale: 1.9,
    renderEffect: "ice-sparkle",
    minimapMarker: "▲",
    minimapColor: "#7fe3ff",
    requiredWeaponElement: "fire",
    weaponElementLabel: "炎",
    blockedMessage: "巨大な氷塊が行く手を塞いでいる。\n炎属性を帯びた武器なら、この氷塊を溶かせそうだ。",
    magicName: "炎の術式",
    magicConfirmMessage: "炎の術式で巨大氷塊を溶かしますか？\n必要SP：10\n＊Aボタン：はい　Bボタン：いいえ",
    magicResultMessage: "炎の術式を放つと、巨大氷塊は音を立てて崩れ落ちた！",
    johanMessage: "ヨハン「これなら、すぐに溶かせそうだ。」",
    johanResultMessage: "ヨハンが炎の術式を放つと、巨大氷塊は音を立てて崩れ落ちた！",
    weaponAction: "巨大氷塊を溶かし",
    weaponResultMessage: "炎をまとった武器を振るうと、巨大氷塊は音を立てて崩れ落ちた！"
  })
});

export function getExplorationObstacleById(id) {
  return EXPLORATION_OBSTACLES[String(id || "")] || null;
}

export function getExplorationObstacleForDepth(depth) {
  const floor = Math.floor(Number(depth) || 0);
  const zoneName = getFloorZone(floor)?.name || "";
  return Object.values(EXPLORATION_OBSTACLES).find(obstacle => (
    obstacle.zoneName === zoneName && obstacle.excludedFloor !== floor
  )) || null;
}

export function getExplorationObstacleRemovalOptions(character, obstacleId) {
  const obstacle = getExplorationObstacleById(obstacleId);
  const activeNpcIds = Array.isArray(character?.npcSystem?.activeIds)
    ? character.npcSystem.activeIds
    : [];
  const johan = !obstacle?.removalKind && activeNpcIds.includes("johan");
  const erika = obstacle?.removalKind === "holy" && activeNpcIds.includes("erika");
  const mage = String(character?.job || "") === "mage";
  const sp = Math.max(0, Math.floor(Number(character?.sp) || 0));
  const weaponElement = getEquippedWeaponElement(character);
  return {
    obstacle,
    johan,
    erika,
    mage,
    sp,
    magicSpCost: EXPLORATION_OBSTACLE_MAGIC_SP_COST,
    canUseMagic: Boolean(obstacle && !obstacle.removalKind && !johan && mage && sp >= EXPLORATION_OBSTACLE_MAGIC_SP_COST),
    weaponElement,
    canUseWeapon: Boolean(obstacle && !johan && !erika && (obstacle.removalKind === "smash" || weaponElement === obstacle.requiredWeaponElement))
  };
}

export function getExplorationObstacleWeaponPrompt(obstacle) {
  if (!obstacle) return "";
  if (obstacle.weaponConfirmMessage) return obstacle.weaponConfirmMessage;
  return `${obstacle.weaponElementLabel}をまとった武器で${obstacle.weaponAction}ますか？\n＊Aボタン：はい　Bボタン：いいえ`;
}

export function getExplorationObstacleMethodPrompt(obstacle) {
  if (!obstacle) return "";
  return `${obstacle.name}を解除する方法を選んでください。\n＊Aボタン：${obstacle.magicName}　Bボタン：${obstacle.weaponElementLabel}属性の武器`;
}
export function resolveExplorationObstacleRemoval(character, obstacleId, method) {
  const options = getExplorationObstacleRemovalOptions(character, obstacleId);
  if (!options.obstacle) return { accepted: false, reason: "unknownObstacle", character };
  if (options.erika) return method === "erika"
    ? { accepted: true, reason: "", method, character }
    : { accepted: false, reason: "erikaPriority", character };
  if (options.johan) {
    return method === "johan"
      ? { accepted: true, reason: "", method, character }
      : { accepted: false, reason: "johanPriority", character };
  }
  if (method === "magic") {
    if (options.obstacle.removalKind) return { accepted: false, reason: "invalidMethod", character };
    if (!options.mage) return { accepted: false, reason: "wrongJob", character };
    if (!options.canUseMagic) return { accepted: false, reason: "insufficientSp", character };
    return {
      accepted: true,
      reason: "",
      method,
      character: { ...character, sp: options.sp - options.magicSpCost }
    };
  }
  if (method === "weapon") {
    if (!options.canUseWeapon) return { accepted: false, reason: "wrongWeaponElement", character };
    if (options.obstacle.removalKind === "smash") return {
      accepted: true, reason: "", method, character: { ...character, sp: Math.max(0, options.sp - 10) }
    };
    return { accepted: true, reason: "", method, character };
  }
  return { accepted: false, reason: "invalidMethod", character };
}
