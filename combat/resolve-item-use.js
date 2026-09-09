import { canUseItemIn, getItem } from "../data/items.js";
import { consumeItem, getItemCount } from "../data/inventory.js";
import { getStatusEffect } from "../data/status-effects.js";
import { getConditionLabel } from "./condition-label.js";
import { hasKeyItem } from "../data/key-items.js";
import { sumCardEffectValues } from "../data/cards.js";

const HP_RECOVERY_ITEM_EFFECT_IDS = new Set([
  "heal_hp",
  "heal_hp_rate",
  "restore_hp_full",
  "battle_overheal_flat"
]);
const SP_RECOVERY_ITEM_EFFECT_IDS = new Set(["restore_sp_rate", "restore_sp_full"]);
const STRONG_HERBICIDE_TARGET_IDS = new Set([
  "giant_vine_obstacle",
  "fleischfresser_b59f",
  "fleischfresserknospe_b57f"
]);

export function cureAllNegativeStatuses(statuses = []) {
  return (Array.isArray(statuses) ? statuses : []).filter(status => {
    const kind = getStatusEffect(status?.statusId || status?.id)?.kind;
    return kind !== "ailment" && kind !== "debuff";
  });
}

export function getItemUnavailableReason({ character, itemId, context, enemy, torchFuel = 0, treasureCompassActive = false } = {}) {
  const item = getItem(itemId);
  if (!item) return "unknownItem";
  const owned = item.keyItemId
    ? hasKeyItem(character?.keyItems, item.keyItemId)
    : getItemCount(character?.inventory, itemId) > 0;
  if (!owned) return "notOwned";
  if (!canUseItemIn(item, context)) {
    if (context === "battle") return "fieldOnly";
    if (item.usableIn?.includes("dungeon")) return "dungeonOnly";
    return "battleOnly";
  }
  const healsHp = item.effects?.some(effect => effect.id === "heal_hp" || effect.id === "heal_hp_rate");
  const hasAnotherEffect = item.effects?.some(effect => effect.id !== "heal_hp" && effect.id !== "heal_hp_rate");
  if (healsHp && !hasAnotherEffect && character.hp >= character.maxHp) return "fullHp";
  const restoresSp = item.effects?.some(effect => effect.id === "restore_sp_rate" || effect.id === "restore_sp_full");
  const hasNonSpEffect = item.effects?.some(effect => effect.id !== "restore_sp_rate" && effect.id !== "restore_sp_full");
  if (restoresSp && !hasNonSpEffect && character.sp >= character.maxSp) return "fullSp";
  if (itemId === "antidote" && hasStatus(character, "deadly_poison")) return "deadlyPoisonNotCurable";
  if (itemId === "antidote" && character.hp >= character.maxHp && !hasStatus(character, "poison")) return "noEffect";
  if (itemId === "strong_antidote" && character.hp >= character.maxHp && !hasPoison(character)) return "noEffect";
  if (itemId === "styptic" && character.hp >= character.maxHp && !hasStatus(character, "bleeding")) return "noEffect";
  if (itemId === "active_healing_potion_small" && hasStatus(character, "active_healing_potion_small_used")) return "oncePerBattle";
  if (itemId === "allheilmittel" && context === "battle" && hasStatus(character, "allheilmittel_used")) return "allheilmittelOncePerBattle";
  if (itemId === "allheilmittel" && character.hp >= character.maxHp && character.sp >= character.maxSp
    && cureAllNegativeStatuses(character.statuses).length === (character.statuses || []).length) return "noEffect";
  if (itemId === "guiding_torch" && Number(torchFuel) >= 100) return "fullTorch";
  if (itemId === "treasure_compass" && treasureCompassActive) return "noEffect";
  if (itemId === "holy_water") {
    if (enemy?.isBoss) return "bossImmune";
    if (enemy?.race !== "undead") return "undeadOnly";
  }
  if (["strong_herbicide_trial", "strong_herbicide"].includes(itemId)
    && !isStrongHerbicideTarget(enemy)) return "plantOnly";
  const barrier = item.effects?.find(effect => effect.id === "element_barrier");
  if (barrier && (character?.statuses || []).some(status =>
    (status.id || status.statusId) === `${barrier.element}_barrier`
  )) return "alreadyActive";
  const imbue = item.effects?.find(effect => effect.id === "weapon_element_imbue");
  if (imbue && (character?.statuses || []).some(status => (
    (status.id || status.statusId) === "weapon_element_imbue"
    && status.element === imbue.element
    && status.active !== false
  ))) return "alreadyActive";
  return "";
}

export function getItemUnavailableReasonForEnemies({ enemies, ...options } = {}) {
  const livingEnemies = (Array.isArray(enemies) ? enemies : [])
    .filter(enemy => enemy?.alive !== false && Number(enemy?.hp) > 0);
  if (!livingEnemies.length) return getItemUnavailableReason(options);
  const reasons = livingEnemies.map(enemy => getItemUnavailableReason({ ...options, enemy }));
  return reasons.some(reason => !reason) ? "" : reasons[0];
}

export function isStrongHerbicideTarget(enemy) {
  return Boolean(enemy?.strongHerbicideTrait)
    || STRONG_HERBICIDE_TARGET_IDS.has(String(enemy?.id || ""));
}

export function isHealingItemSpReturnEligible(item) {
  const effects = Array.isArray(item?.effects) ? item.effects : [];
  return effects.some(effect => HP_RECOVERY_ITEM_EFFECT_IDS.has(effect?.id))
    && !effects.some(effect => SP_RECOVERY_ITEM_EFFECT_IDS.has(effect?.id));
}

export function calculateHealingItemSpReturn({
  item,
  actualHpHealing = 0,
  currentSp = 0,
  maxSp = 0,
  rate = 0
} = {}) {
  const recoveryRate = Math.max(0, Number(rate) || 0);
  if (recoveryRate <= 0 || !isHealingItemSpReturnEligible(item)) return 0;
  const healing = Math.max(0, Math.floor(Number(actualHpHealing) || 0));
  const availableSp = Math.max(0,
    Math.floor(Number(maxSp) || 0) - Math.max(0, Math.floor(Number(currentSp) || 0)));
  return Math.min(availableSp, Math.floor(healing * recoveryRate));
}

export function resolveFieldItemUse({ character, itemId, context = "dungeon", torchFuel = 0, treasureCompassActive = false } = {}) {
  const reason = getItemUnavailableReason({ character, itemId, context, torchFuel, treasureCompassActive });
  if (reason) return { accepted: false, reason };
  const item = getItem(itemId);
  const next = structuredClone(character);
  const environment = {};
  let healing = 0;
  let spHealing = 0;
  const deathPoisonUnaffected = ["antidote", "strong_antidote"].includes(itemId)
    && hasStatus(next, "death_poison");
  for (const effect of item.effects) {
    if (effect.id === "heal_hp") {
      const amount = Math.min(effect.value, next.maxHp - next.hp);
      next.hp += amount;
      healing += amount;
    } else if (effect.id === "heal_hp_rate") {
      const requested = Math.max(1, Math.ceil(next.maxHp * (Number(effect.value) || 0)));
      const amount = Math.min(requested, next.maxHp - next.hp);
      next.hp += amount;
      healing += amount;
    } else if (effect.id === "battle_overheal_flat") {
      return { accepted: false, reason: "battleOnly" };
    } else if (effect.id === "cure_poison") {
      next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "poison");
    } else if (effect.id === "cure_deadly_poison") {
      next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "deadly_poison");
    } else if (effect.id === "cure_bleeding") {
      next.statuses = (next.statuses || []).filter(status => (status.statusId || status.id) !== "bleeding");
    } else if (effect.id === "restore_hp_full") {
      healing += Math.max(0, next.maxHp - next.hp);
      next.hp = next.maxHp;
    } else if (effect.id === "restore_sp_full") {
      spHealing += Math.max(0, next.maxSp - next.sp);
      next.sp = next.maxSp;
    } else if (effect.id === "restore_sp_rate") {
      const requested = Math.max(1, Math.ceil(next.maxSp * (Number(effect.value) || 0)));
      const amount = Math.min(requested, next.maxSp - next.sp);
      next.sp += amount;
      spHealing += amount;
    } else if (effect.id === "cure_all_ailments") {
      next.statuses = cureAllNegativeStatuses(next.statuses);
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
  const healingItemSpReturn = calculateHealingItemSpReturn({
    item,
    actualHpHealing: healing,
    currentSp: next.sp,
    maxSp: next.maxSp,
    rate: sumCardEffectValues(next.cards?.deckSlots, "healing_item_sp_return")
  });
  if (healingItemSpReturn > 0) {
    next.sp += healingItemSpReturn;
    spHealing += healingItemSpReturn;
  }
  next.condition = getConditionLabel(next.statuses);
  next.inventory = consumeItem(next.inventory, itemId).inventory;
  return {
    accepted: true,
    item,
    character: next,
    environment,
    healing,
    spHealing,
    message: itemId === "allheilmittel"
      ? `${item.name}を使った。HPとSPが全回復し、すべての状態異常が治った。`
      : spHealing > 0 && healing === 0
        ? `${item.name}を使った。SPが${spHealing}回復した。`
      : `${healing > 0 ? `${item.name}を使った。HPが${healing}回復した。` : `${item.name}を使った。`}`
        + `${healingItemSpReturn > 0 ? `\n恩返しによりSPが${healingItemSpReturn}回復した。` : ""}`
        + `${deathPoisonUnaffected ? "\n死毒は治療する事が出来ない！" : ""}`
  };
}

function hasPoison(character) {
  return (character?.statuses || []).some(status => ["poison", "deadly_poison"].includes(status.statusId || status.id));
}

function hasStatus(character, statusId) {
  return (character?.statuses || []).some(status => (status.statusId || status.id) === statusId);
}
