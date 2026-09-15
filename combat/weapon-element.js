import { hasCardEffect } from "../data/cards.js";
export function getPlayerWeaponElement(player, action = {}) {
  const actionElement = String(action.element || "physical");
  if (actionElement !== "physical") return actionElement;
  const oil = (player?.statuses || []).find(status => (
    (status.id || status.statusId) === "weapon_element_imbue" && status.active !== false
  ));
  if (["fire", "ice", "lightning"].includes(oil?.element)) return oil.element;
  const weaponElement = String(action.weapon?.element || "physical");
  if (weaponElement !== "physical") return weaponElement;
  if (hasCardEffect(player?.cards?.deckSlots, "weapon_fire_imbue")) return "fire";
  if (hasCardEffect(player?.cards?.deckSlots, "weapon_ice_imbue")) return "ice";
  if (hasCardEffect(player?.cards?.deckSlots, "weapon_lightning_imbue")) return "lightning";
  return "physical";
}

