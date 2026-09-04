import { hasKeyItem } from "../data/key-items.js";

export function getQueenRegaliaMinimapEffects(keyItems, { depth = null, eventFlags = {}, location = "dungeon" } = {}) {
  const blocked = location === "town" || depth === 100;
  const blessing = Boolean(eventFlags.queen_blessing_unlocked) && depth >= 1 && depth <= 99 && !blocked;
  const effective = id => !blocked && (blessing || hasKeyItem(keyItems, id));
  return {
    npcDetectionActive: effective("queen_tiara"),
    stairsDetectionActive: effective("queen_earring"),
    treasureDetectionActive: effective("queen_earring"),
    fullMapRevealActive: effective("queen_necklace")
  };
}
