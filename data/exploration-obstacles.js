import { getFloorZone } from "./floor-zone-names.js";
import { consumeItem, getItemCount } from "./inventory.js";

export const EXPLORATION_OBSTACLE_TARGET_COUNT = 3;
export const EXPLORATION_OBSTACLE_MAGIC_SP_COST = 10;

// These survey floors must remain fully traversable without spending another resource.
export const FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR = 35;
export const GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR = 45;

export const EXPLORATION_OBSTACLES = Object.freeze({
  fire_pillar: Object.freeze({
    id: "fire_pillar",
    name: "火柱",
    zoneName: "Glut-Zone",
    excludedFloor: FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR,
    imageId: "NPC_event_21",
    image: "images/npc/NPC_event_21.avif",
    renderScale: 1.12,
    minimapMarker: "♨",
    minimapColor: "#ff9b52",
    oilItemId: "ice_lizard_oil",
    oilName: "氷蜥蜴の油",
    blockedMessage: "激しく燃え上がる火柱が行く手を遮っている。\nこのままでは通れそうにない。",
    magicName: "氷の術式",
    magicConfirmMessage: "氷の術式で火柱を消しますか？\n必要SP：10\n＊Aボタン：はい　Bボタン：いいえ",
    magicResultMessage: "氷の術式を放つと、火柱は白い蒸気を上げて消え去った！",
    johanMessage: "ヨハン「この程度なら、俺に任せろ。」",
    johanResultMessage: "ヨハンが氷の術式を組み上げると、火柱は白い蒸気を上げて消え去った！",
    oilAction: "火柱を消し",
    oilResultMessage: "氷蜥蜴の油を振りかけると、火柱は白い蒸気を上げて消え去った！"
  }),
  giant_ice_block: Object.freeze({
    id: "giant_ice_block",
    name: "巨大氷塊",
    zoneName: "Frost-Zone",
    excludedFloor: GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR,
    imageId: "NPC_event_22",
    image: "images/npc/NPC_event_22.avif",
    renderScale: 1.08,
    minimapMarker: "◆",
    minimapColor: "#a9e8ff",
    oilItemId: "fire_lizard_oil",
    oilName: "火蜥蜴の油",
    blockedMessage: "巨大な氷塊が行く手を塞いでいる。\nこのままでは通れそうにない。",
    magicName: "炎の術式",
    magicConfirmMessage: "炎の術式で巨大氷塊を溶かしますか？\n必要SP：10\n＊Aボタン：はい　Bボタン：いいえ",
    magicResultMessage: "炎の術式を放つと、巨大氷塊は音を立てて崩れ落ちた！",
    johanMessage: "ヨハン「これなら、すぐに溶かせそうだ。」",
    johanResultMessage: "ヨハンが炎の術式を放つと、巨大氷塊は音を立てて崩れ落ちた！",
    oilAction: "巨大氷塊を溶かし",
    oilResultMessage: "火蜥蜴の油を振りかけると、巨大氷塊は音を立てて崩れ落ちた！"
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
  const johan = activeNpcIds.includes("johan");
  const mage = String(character?.job || "") === "mage";
  const sp = Math.max(0, Math.floor(Number(character?.sp) || 0));
  const oilCount = obstacle ? getItemCount(character?.inventory, obstacle.oilItemId) : 0;
  return {
    obstacle,
    johan,
    mage,
    sp,
    magicSpCost: EXPLORATION_OBSTACLE_MAGIC_SP_COST,
    canUseMagic: Boolean(obstacle && !johan && mage && sp >= EXPLORATION_OBSTACLE_MAGIC_SP_COST),
    oilCount,
    canUseOil: Boolean(obstacle && !johan && oilCount > 0)
  };
}

export function getExplorationObstacleOilPrompt(obstacle, oilCount) {
  if (!obstacle) return "";
  return `「${obstacle.oilName}」を使って${obstacle.oilAction}ますか？\n所持数：${Math.max(0, Math.floor(Number(oilCount) || 0))}個\n＊Aボタン：はい　Bボタン：いいえ`;
}

export function getExplorationObstacleMethodPrompt(obstacle, oilCount) {
  if (!obstacle) return "";
  return `${obstacle.name}を解除する方法を選んでください。\n＊Aボタン：${obstacle.magicName}　Bボタン：「${obstacle.oilName}」（${Math.max(0, Math.floor(Number(oilCount) || 0))}個）`;
}

export function resolveExplorationObstacleRemoval(character, obstacleId, method) {
  const options = getExplorationObstacleRemovalOptions(character, obstacleId);
  if (!options.obstacle) return { accepted: false, reason: "unknownObstacle", character };
  if (options.johan) {
    return method === "johan"
      ? { accepted: true, reason: "", method, character }
      : { accepted: false, reason: "johanPriority", character };
  }
  if (method === "magic") {
    if (!options.mage) return { accepted: false, reason: "wrongJob", character };
    if (!options.canUseMagic) return { accepted: false, reason: "insufficientSp", character };
    return {
      accepted: true,
      reason: "",
      method,
      character: { ...character, sp: options.sp - options.magicSpCost }
    };
  }
  if (method === "oil") {
    if (!options.canUseOil) return { accepted: false, reason: "notOwned", character };
    const consumed = consumeItem(character.inventory, options.obstacle.oilItemId, 1);
    if (consumed.consumed !== 1) return { accepted: false, reason: consumed.reason || "notOwned", character };
    return {
      accepted: true,
      reason: "",
      method,
      character: { ...character, inventory: consumed.inventory }
    };
  }
  return { accepted: false, reason: "invalidMethod", character };
}
