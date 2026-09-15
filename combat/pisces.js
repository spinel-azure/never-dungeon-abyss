import { getStatusEffect } from "../data/status-effects.js";
import { getConditionLabel } from "./condition-label.js";

export const PISCES_STATUS = "pisces_invincible";
export const PISCES_MESSAGE = "双魚の加護が、消えかけた命を繋ぎ止めた！";

export function isPiscesInvincible(combatant) {
  return (combatant?.statuses || []).some(status =>
    (status.id || status.statusId) === PISCES_STATUS && status.active !== false);
}

// Call after mitigation, before HP subtraction; never revive inside a hit loop.
export function protectedCombatDamage(combatant, damage) {
  return isPiscesInvincible(combatant) ? 0 : Math.max(0, Number(damage) || 0);
}

export function applyCombatHpDamage(combatant, damage) {
  const before = Math.max(0, Number(combatant.hp) || 0);
  combatant.hp = Math.max(0, before - protectedCombatDamage(combatant, damage));
  combatant.alive = combatant.hp > 0;
  return before - combatant.hp;
}

export function isOrdinaryNegativeStatus(statusId) {
  return ["ailment", "debuff"].includes(getStatusEffect(statusId)?.kind);
}

// The caller supplies the existing lethal-avoidance policy, keeping NPC support independent.
export function resolvePlayerSurvival(battle, avoidLethal = () => false) {
  if (!battle?.player || battle.outcome || battle.player.hp > 0 || battle.scriptedNonlethal) return false;
  if (avoidLethal(battle)) return true;
  if (!battle.piscesActiveAtStart || battle.piscesUsed) return false;
  battle.piscesUsed = true;
  const player = battle.player;
  player.hp = Math.max(1, Math.floor(player.maxHp * .5));
  player.alive = true;
  player.statuses = (player.statuses || []).filter(status =>
    !isOrdinaryNegativeStatus(status.id || status.statusId));
  player.statuses.push({ ...getStatusEffect(PISCES_STATUS), statusId: PISCES_STATUS, active: true });
  battle.piscesProtectedThroughTurn = battle.resolvingAmbush ? battle.turn : battle.turn + 1;
  player.condition = getConditionLabel(player.statuses);
  battle.log.push(PISCES_MESSAGE);
  battle.presentationEvents.push({type:"healing", actorSide:"player", targetSide:"player",
    amount:player.hp, restoredHp:player.hp, piscesRevival:true, message:PISCES_MESSAGE});
  return true;
}

export function finishPiscesTurn(battle) {
  if (battle.outcome || Number(battle.piscesProtectedThroughTurn) <= battle.turn) {
    if (!battle.outcome && isPiscesInvincible(battle.player)) battle.presentationEvents.push({
      type:"piscesProtectionEnd", targetSide:"player", message:"双魚の加護の無敵効果が切れた。"
    });
    battle.player.statuses = (battle.player.statuses || []).filter(status =>
      (status.id || status.statusId) !== PISCES_STATUS);
    delete battle.piscesProtectedThroughTurn;
    battle.player.condition = getConditionLabel(battle.player.statuses);
  }
}
