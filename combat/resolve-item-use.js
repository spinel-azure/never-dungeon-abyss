import { canUseItemIn, getItem } from "../data/items.js";
import { consumeItem, getItemCount } from "../data/inventory.js";

export function getItemUnavailableReason({ character, itemId, context, enemy, torchFuel = 0, treasureCompassActive = false } = {}) {
  const item = getItem(itemId);
  if (!item) return "unknownItem";
  if (getItemCount(character?.inventory, itemId) <= 0) return "notOwned";
  if (!canUseItemIn(item, context)) {
    if (context === "battle") return "fieldOnly";
    if (item.usableIn?.includes("dungeon")) return "dungeonOnly";
    return "battleOnly";
  }
  const healsHp = item.effects?.some(effect => effect.id === "heal_hp");
  const hasAnotherEffect = item.effects?.some(effect => effect.id !== "heal_hp");
  if (healsHp && !hasAnotherEffect && character.hp >= character.maxHp) return "fullHp";
  if (itemId === "antidote" && character.hp >= character.maxHp && !hasPoison(character)) return "noEffect";
  if (itemId === "styptic" && character.hp >= character.maxHp && !hasStatus(character, "bleeding")) return "noEffect";
  if (itemId === "guiding_torch" && Number(torchFuel) >= 100) return "fullTorch";
  if (itemId === "treasure_compass" && treasureCompassActive) return "noEffect";
  if (itemId === "holy_water") {
    if (enemy?.isBoss) return "bossImmune";
    if (enemy?.race !== "undead") return "undeadOnly";
  }
  return "";
}

export function resolveFieldItemUse({ character, itemId, context = "dungeon", torchFuel = 0, treasureCompassActive = false } = {}) {
  const reason = getItemUnavailableReason({ character, itemId, context, torchFuel, treasureCompassActive });
  if (reason) return { accepted: false, reason };
  const item = getItem(itemId);
  const next = structuredClone(character);
  const environment = {};
  let healing = 0;
  for (const effect of item.effects) {
    if (effect.id === "heal_hp") {
      healing = Math.min(effect.value, next.maxHp - next.hp);
      next.hp += healing;
    } else if (effect.id === "cure_poison") {
      next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "poison");
    } else if (effect.id === "cure_bleeding") {
      next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "bleeding");
    } else if (effect.id === "restore_torch") {
      environment.torchFuel = effect.value;
    } else if (effect.id === "reset_presence") {
      environment.resetPresence = true;
    } else if (effect.id === "suppress_presence_steps") {
      environment.suppressPresenceSteps = effect.value;
    } else if (effect.id === "reveal_treasures_until_return") {
      environment.treasureCompassActive = true;
    } else if (effect.id === "auto_walk_to_stairs_up") {
      environment.startAutoWalker = true;
    } else if (effect.id === "emergency_escape") {
      environment.emergencyEscape = true;
    }
  }
  next.condition = hasStatus(next, "bleeding") ? "BLEED" : hasPoison(next) ? "POISON" : "GOOD";
  next.inventory = consumeItem(next.inventory, itemId).inventory;
  return {
    accepted: true,
    item,
    character: next,
    environment,
    healing,
    message: healing > 0 ? `${item.name}を使った。HPが${healing}回復した。` : `${item.name}を使った。`
  };
}

function hasPoison(character) {
  return (character?.statuses || []).some(status => (status.statusId || status.id) === "poison");
}

function hasStatus(character, statusId) {
  return (character?.statuses || []).some(status => (status.statusId || status.id) === statusId);
}
