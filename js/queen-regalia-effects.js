import { hasKeyItem } from "../data/key-items.js";

export function getQueenRegaliaMinimapEffects(keyItems) {
  return {
    npcDetectionActive: hasKeyItem(keyItems, "queen_tiara"),
    stairsDetectionActive: hasKeyItem(keyItems, "queen_earring"),
    treasureDetectionActive: hasKeyItem(keyItems, "queen_earring"),
    fullMapRevealActive: hasKeyItem(keyItems, "queen_necklace")
  };
}
