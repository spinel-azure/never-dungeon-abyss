import { canUseItemIn, getItem } from "../data/items.js";
import { consumeItem, getItemCount } from "../data/inventory.js";

export function getItemUnavailableReason({ character, itemId, context, enemy, torchFuel = 0 } = {}) {
  const item = getItem(itemId);
  if (!item) return "unknownItem";
  if (getItemCount(character?.inventory, itemId) <= 0) return "notOwned";
  if (!canUseItemIn(item, context)) return context === "battle" ? "fieldOnly" : "battleOnly";
  if (itemId === "healing_potion" && character.hp >= character.maxHp) return "fullHp";
  if (itemId === "antidote" && character.hp >= character.maxHp && !hasPoison(character)) return "noEffect";
  if (itemId === "guiding_torch" && Number(torchFuel) >= 100) return "fullTorch";
  if (itemId === "holy_water") {
    if (enemy?.isBoss) return "bossImmune";
    if (enemy?.race !== "undead") return "undeadOnly";
  }
  return "";
}

export function resolveFieldItemUse({ character, itemId, context = "dungeon", torchFuel = 0 } = {}) {
  const reason = getItemUnavailableReason({ character, itemId, context, torchFuel });
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
    } else if (effect.id === "restore_torch") {
      environment.torchFuel = effect.value;
    } else if (effect.id === "reset_presence") {
      environment.resetPresence = true;
    } else if (effect.id === "suppress_presence_steps") {
      environment.suppressPresenceSteps = effect.value;
    }
  }
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
