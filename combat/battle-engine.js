import { collectStats } from "./collect-stats.js";
import { createNormalAttack, createSkillAttack } from "./create-attack.js";
import { resolvePhysicalAttack } from "./resolve-physical-attack.js";
import { resolveSpell } from "./resolve-spell.js";
import { resolveHealing } from "./resolve-healing.js";
import { resolveEffects } from "./resolve-effects.js";
import { createGuardAction, resolveTurnOrder } from "./resolve-turn-order.js";
import {
  applyStatusApplications,
  getDefenseMultiplier,
  getNonlethalPoisonDamage,
  getPhysicalDamageReduction,
  getStatusResistanceBonus,
  resolveActionOpportunity,
  resolveEndOfAction
} from "./status-lifecycle.js";
import { getSkill } from "../data/skills.js";
import { getItem } from "../data/items.js";
import { consumeItem } from "../data/inventory.js";
import { getItemUnavailableReason } from "./resolve-item-use.js";
import { resolvePassiveInstantDeath } from "./passive-instant-death.js";
import { getCardById, hasCardEffect, sumCardEffectValues } from "../data/cards.js";
import { getEffectiveSpCost } from "./sp-cost.js";
import {
  advanceNpcChargeState,
  advanceNpcWallProtection,
  applyNpcAfterPlayerAttack,
  applyNpcBattleStart,
  applyNpcChargeSkills,
  applyNpcGuardSupport,
  applyNpcLargeDamageProtection,
  applyNpcLethalProtection,
  applyNpcTurnEnd,
  applyNpcTurnStart
} from "./npc-support.js";
import { applyPlayerChargeAction, isPlayerChargeReady } from "./player-charge.js";
import { getWeapon } from "../data/weapons.js";

export function createBattleState({ character, enemy, enemies = null, targetIndex = 0 }) {
  const vorpalSwordEquippedAtStart = character?.equipment?.weaponId === "vorpal_sword";
  const enemyParty = Array.isArray(enemies) && enemies.length
    ? enemies.map(cloneCombatant)
    : null;
  const selectedTargetIndex = enemyParty
    ? normalizeLivingTargetIndex(enemyParty, targetIndex)
    : 0;
  const selectedEnemy = enemyParty ? enemyParty[selectedTargetIndex] : cloneCombatant(enemy);
  const sphinxBarrierRate = Math.max(0, sumCardEffectValues(character?.cards?.deckSlots, "sphinx_battle_barrier"));
  const sphinxBarrier = sphinxBarrierRate > 0
    ? Math.max(1, Math.ceil(Math.max(1, Number(character?.maxHp) || 1) * sphinxBarrierRate))
    : 0;
  return {
    turn: 1,
    phase: "command",
    outcome: null,
    player: cloneCombatant(character),
    enemy: selectedEnemy,
    ...(enemyParty ? { enemies: enemyParty, targetIndex: selectedTargetIndex, lastPlayerTargetIndex: selectedTargetIndex } : {}),
    vorpalSwordEquippedAtStart,
    ariesActiveAtStart: hasCardEffect(character?.cards?.deckSlots, "zodiac_aries"),
    ariesOpeningAttackAvailable: hasCardEffect(character?.cards?.deckSlots, "zodiac_aries"),
    capricornActiveAtStart: hasCardEffect(character?.cards?.deckSlots, "zodiac_capricorn"),
    libraActiveAtStart: hasCardEffect(character?.cards?.deckSlots, "zodiac_libra"),
    sphinxWisdomActiveAtStart: hasCardEffect(character?.cards?.deckSlots, "sphinx_weakness_insight"),
    sphinxBarrier,
    sphinxBarrierMax: sphinxBarrier,
    vorpalExecution: false,
    slashExecution: null,
    log: [
      enemyParty ? `${enemyParty.map(member => member.name).join("、")}が現れた！` : `${enemy.name}が現れた！`,
      ...(sphinxBarrier > 0 ? ["スピンクスの威容が障壁を展開した！"] : [])
    ],
    presentationEvents: []
  };
}

export function resolveBattleRound({ battle, playerCommand, rng = Math.random } = {}) {
  if (Array.isArray(battle?.enemies)) return resolveMultiBattleRound({ battle, playerCommand, rng });
  const next = structuredClone(battle);
  const playerAction = createPlayerAction(next.player, playerCommand, next.enemy);
  if (!playerAction.ok) return { battle: next, accepted: false, reason: playerAction.reason };
  const enemyAction = createEnemyAction(next.enemy, rng);
  const order = applyAriesOpeningPriority(next, resolveTurnOrder([
    { side: "player", actor: combatStats(next.player), action: playerAction.action },
    { side: "enemy", actor: combatStats(next.enemy), action: enemyAction }
  ], rng));
  next.log = [];
  next.presentationEvents = [];

  let playerActionExecuted = false;
  applyNpcBattleStart(next, rng);
  applyNpcChargeSkills(next, rng);
  if (!next.outcome && playerAction.spCost > 0) next.player.sp -= playerAction.spCost;
  if (!next.outcome && playerCommand.type === "guard") applyNpcGuardSupport(next);
  if (!next.outcome) applyNpcTurnStart(next, rng);

  for (const entry of order) {
    if (next.outcome) break;
    const actor = next[entry.side];
    const targetSide = entry.side === "player" ? "enemy" : "player";
    const target = next[targetSide];
    if (!actor.alive || actor.hp <= 0) continue;
    const opportunity = resolveActionOpportunity(actor.statuses);
    actor.statuses = opportunity.statuses;
    if (opportunity.skipped) {
      next.log.push(`${actor.name}は動けない！`);
      finishAction(next, entry.side);
      continue;
    }
    const targetHpBefore = target.hp;
    const action = applyAriesOpeningAttack(next, entry.action, entry.side);
    executeAction({
      battle: next,
      action,
      actor,
      actorSide: entry.side,
      target,
      targetSide,
      rng
    });
    if (entry.side === "player") playerActionExecuted = true;
    finishAction(next, entry.side);
    updateOutcome(next);
    if (!next.outcome && entry.side === "player" && target.hp < targetHpBefore) {
      applyNpcAfterPlayerAttack(next, rng);
    }
  }
  if (playerActionExecuted) {
    next.player = applyPlayerChargeAction(next.player, {
      commandType: playerCommand.type,
      spCost: playerAction.spCost,
      chargeSkill: Boolean(playerAction.action.chargeSkill)
    });
  }
  if (!next.outcome) applyPlayerTurnEndChargeEffects(next);
  if (!next.outcome) applyNpcTurnEnd(next, rng);
  advanceNpcWallProtection(next);
  advanceNpcChargeState(next, { allowCharge: !next.outcome });
  if (!next.outcome) {
    next.turn += 1;
    next.phase = "command";
  }
  return { battle: next, accepted: true };
}

export function resolveMultiBattleRound({ battle, playerCommand, rng = Math.random } = {}) {
  const next = structuredClone(battle);
  next.targetIndex = normalizeLivingTargetIndex(next.enemies, playerCommand?.targetIndex ?? next.targetIndex);
  next.enemy = next.enemies[next.targetIndex];
  const playerAction = createPlayerAction(next.player, playerCommand, next.enemy);
  if (!playerAction.ok) return { battle: next, accepted: false, reason: playerAction.reason };
  const orderEntries = [{ side: "player", actor: combatStats(next.player), action: playerAction.action }];
  next.enemies.forEach((member, partyIndex) => {
    if (!member.alive || member.hp <= 0) return;
    orderEntries.push({ side: "enemy", partyIndex, actor: combatStats(member), action: createEnemyAction(member, rng) });
  });
  const order = applyAriesOpeningPriority(next, resolveTurnOrder(orderEntries, rng));
  next.log = [];
  next.presentationEvents = [];

  let playerActionExecuted = false;
  applyNpcBattleStart(next, rng);
  setNpcTarget(next, lowestHpRatioTargetIndex(next.enemies));
  applyNpcChargeSkills(next, rng);
  updateMultiOutcome(next);
  if (!next.outcome && playerAction.spCost > 0) next.player.sp -= playerAction.spCost;
  if (!next.outcome && playerCommand.type === "guard") applyNpcGuardSupport(next);
  if (!next.outcome) {
    setNpcTarget(next, lowestHpRatioTargetIndex(next.enemies));
    applyNpcTurnStart(next, rng);
    updateMultiOutcome(next);
  }

  for (const entry of order) {
    if (next.outcome) break;
    const actor = entry.side === "player" ? next.player : next.enemies[entry.partyIndex];
    if (!actor?.alive || actor.hp <= 0) continue;
    const opportunity = resolveActionOpportunity(actor.statuses);
    actor.statuses = opportunity.statuses;
    if (opportunity.skipped) {
      next.log.push(`${actor.name}は動けない！`);
      finishCombatantAction(next, actor, entry.side, entry.partyIndex);
      updateMultiOutcome(next);
      continue;
    }
    if (entry.side === "player") {
      const action = applyAriesOpeningAttack(next, entry.action, "player");
      const targetIndexes = entry.action.target === "allEnemies"
        ? livingEnemyIndexes(next.enemies)
        : [normalizeLivingTargetIndex(next.enemies, next.targetIndex)];
      for (const targetIndex of targetIndexes) {
        const target = next.enemies[targetIndex];
        if (!target?.alive || target.hp <= 0) continue;
        executeTargetedAction({ battle: next, action, actor, actorSide: "player",
          target, targetSide: "enemy", targetIndex, rng });
      }
      playerActionExecuted = true;
      next.lastPlayerTargetIndex = normalizeLivingTargetIndex(next.enemies, next.targetIndex, { allowDefeated: true });
      finishCombatantAction(next, actor, "player");
      updateMultiOutcome(next);
      if (!next.outcome) {
        setNpcTarget(next, normalizeLivingTargetIndex(next.enemies, next.lastPlayerTargetIndex));
        applyNpcAfterPlayerAttack(next, rng);
        updateMultiOutcome(next);
      }
    } else {
      executeTargetedAction({ battle: next, action: entry.action, actor, actorSide: "enemy",
        target: next.player, targetSide: "player", targetIndex: null, rng });
      finishCombatantAction(next, actor, "enemy", entry.partyIndex);
      updateMultiOutcome(next);
    }
  }
  if (playerActionExecuted) {
    next.player = applyPlayerChargeAction(next.player, {
      commandType: playerCommand.type,
      spCost: playerAction.spCost,
      chargeSkill: Boolean(playerAction.action.chargeSkill)
    });
  }
  if (!next.outcome) applyPlayerTurnEndChargeEffects(next);
  if (!next.outcome) applyNpcTurnEnd(next, rng);
  advanceNpcWallProtection(next);
  advanceNpcChargeState(next, { allowCharge: !next.outcome });
  if (!next.outcome) {
    next.turn += 1;
    next.phase = "command";
  }
  next.targetIndex = normalizeLivingTargetIndex(next.enemies, next.targetIndex);
  next.enemy = next.enemies[next.targetIndex];
  return { battle: next, accepted: true };
}

function executeTargetedAction(options) {
  const start = options.battle.presentationEvents.length;
  executeAction(options);
  if (options.targetSide !== "enemy" || options.targetIndex == null) return;
  for (let index = start; index < options.battle.presentationEvents.length; index += 1) {
    const event = options.battle.presentationEvents[index];
    if (event.targetSide === "enemy") event.targetIndex = options.targetIndex;
  }
}

function setNpcTarget(battle, targetIndex) {
  const normalized = normalizeLivingTargetIndex(battle.enemies, targetIndex);
  battle.enemy = battle.enemies[normalized];
  battle.npcTargetIndex = normalized;
}

function livingEnemyIndexes(enemies = []) {
  return enemies.map((enemy, index) => enemy?.alive && enemy.hp > 0 ? index : -1).filter(index => index >= 0);
}

function lowestHpRatioTargetIndex(enemies = []) {
  return livingEnemyIndexes(enemies).sort((left, right) => {
    const leftRate = enemies[left].hp / Math.max(1, enemies[left].maxHp);
    const rightRate = enemies[right].hp / Math.max(1, enemies[right].maxHp);
    return leftRate - rightRate || left - right;
  })[0] ?? 0;
}

function normalizeLivingTargetIndex(enemies = [], requested = 0, { allowDefeated = false } = {}) {
  const index = Math.max(0, Math.min(enemies.length - 1, Math.floor(Number(requested) || 0)));
  if (allowDefeated || (enemies[index]?.alive && enemies[index]?.hp > 0)) return index;
  return livingEnemyIndexes(enemies)[0] ?? index;
}

function applyPlayerTurnEndChargeEffects(battle) {
  const player = battle.player;
  const budding = player.statuses?.find(status =>
    (status.id || status.statusId) === "charge_budding" && status.active !== false
  );
  if (!budding || player.hp <= 0 || player.hp >= player.maxHp) return;
  const requested = Math.max(1, Math.ceil(player.maxHp * (Number(budding.turnEndHealMaxHpRate) || 0)));
  const healing = Math.min(requested, player.maxHp - player.hp);
  player.hp += healing;
  battle.log.push(`新緑の芽吹きによりHPが${healing}回復した！`);
  battle.presentationEvents.push({ type: "healing", actorSide: "player", targetSide: "player",
    amount: healing, message: `HPが${healing}回復した！` });
}

export function resolveEnemyAmbush({ battle, rng = Math.random } = {}) {
  const next = structuredClone(battle);
  if (next.ariesActiveAtStart) {
    next.log = ["エアリーズの力が敵の不意打ちを打ち消した！"];
    next.presentationEvents = [];
    next.phase = "command";
    return { battle: next, accepted: true, prevented: true };
  }
  const opportunity = resolveActionOpportunity(next.enemy.statuses);
  next.enemy.statuses = opportunity.statuses;
  next.log = [];
  next.presentationEvents = [];
  if (opportunity.skipped) {
    next.log.push(`${next.enemy.name}は動けない！`);
  } else {
    executeAction({
      battle: next,
      action: createEnemyAction(next.enemy, rng),
      actor: next.enemy,
      actorSide: "enemy",
      target: next.player,
      targetSide: "player",
      rng
    });
  }
  finishAction(next, "enemy");
  updateOutcome(next);
  next.phase = next.outcome ? "complete" : "command";
  return { battle: next, accepted: true };
}

export function createPlayerAction(player, command = {}, enemy = null) {
  if (command.type === "attack") {
    const action = createNormalAttack({
      weaponId: player.equipment?.weaponId,
      weaponEnhancement: player.equipment?.rightArmEnhancement,
      skillIds: player.skillIds
    });
    return {
      ok: true,
      spCost: 0,
      action: applyPlayerWeaponElement(player, action)
    };
  }
  if (command.type === "guard") return { ok: true, spCost: 0, action: createGuardAction() };
  if (command.type === "wait") {
    return {
      ok: true,
      spCost: 0,
      action: { id: "wait", name: "待機", actionType: "wait", speedModifier: 99 }
    };
  }
  if (command.type === "wait") {
    return {
      ok: true,
      spCost: 0,
      action: { id: "wait", name: "待機", actionType: "wait", speedModifier: 99 }
    };
  }
  if (command.type === "wait") {
    return {
      ok: true,
      spCost: 0,
      action: { id: "wait", name: "待機", actionType: "wait", speedModifier: 99 }
    };
  }
  if (command.type === "item") {
    const reason = getItemUnavailableReason({
      character: player,
      itemId: command.itemId,
      context: "battle",
      enemy
    });
    if (reason) return { ok: false, reason };
    const item = getItem(command.itemId);
    return {
      ok: true,
      spCost: 0,
      action: { id: item.id, name: item.name, actionType: "item", item, speedModifier: 99 }
    };
  }
  if (command.type !== "skill") return { ok: false, reason: "notImplemented" };
  const skill = getSkill(command.skillId);
  if (!skill || !player.skillIds?.includes(skill.id)) return { ok: false, reason: "unknownSkill" };
  if (skill.actionType === "passive") return { ok: false, reason: "passive" };
  if (skill.chargeSkill && !isPlayerChargeReady(player)) return { ok: false, reason: "chargeNotReady" };
  if (skill.ultimateChargeSkill && (player.statuses || []).some(status =>
    (status.id || status.statusId) === "charge_ultimate_used" && status.active !== false
  )) return { ok: false, reason: "ultimateAlreadyUsed" };
  if (skill.preventWhileStatusActive && (player.statuses || []).some(status =>
    (status.statusId || status.id) === skill.preventWhileStatusActive && status.active !== false
  )) return { ok: false, reason: "alreadyActive" };
  const spCost = getEffectiveSpCost(skill, player);
  if (player.sp < spCost) return { ok: false, reason: "insufficientSp" };
  if (["cureStatus", "sacrificialCure"].includes(skill.actionType)
    && !(player.statuses || []).some(status => getCuredStatusIds(skill).includes(status.statusId || status.id))) {
    return { ok: false, reason: "noEffect" };
  }
  if (skill.actionType === "dungeonEffect") return { ok: false, reason: "fieldOnly" };
  if (skill.actionType === "banishUndead") {
    if (enemy?.isBoss) return { ok: false, reason: "bossImmune" };
    if (enemy?.race !== "undead") return { ok: false, reason: "undeadOnly" };
  }
  const action = skill.actionType === "physicalAttack"
    ? createSkillAttack(skill, {
      weaponId: player.equipment?.weaponId,
      weaponEnhancement: player.equipment?.rightArmEnhancement
    })
    : { ...skill };
  return { ok: true, spCost, action: applyPlayerWeaponElement(player, action) };
}

export function createEnemyAction(enemy, rng = Math.random) {
  const attack = createNormalAttack({
    weapon: {
      id: `${enemy.id}_attack`,
      name: "攻撃",
      type: "longsword",
      attack: enemy.attack,
      element: "physical"
    }
  });
  const actionTable = Array.isArray(enemy.actions) ? enemy.actions : [];
  const actionSealed = enemy.statuses?.some(status =>
    (status.id || status.statusId) === "action_seal" && status.active !== false
  );
  if (actionSealed) return attack;
  if (actionTable.length > 0) {
    const selected = selectWeightedEnemyAction(actionTable, enemy, rng);
    if (selected) return buildEnemyAction(selected, attack);
  }
  const special = enemy.specialAttack;
  if (!special || Number(rng()) >= Math.max(0, Math.min(1, Number(special.usageRate) || 0))) {
    return attack;
  }
  return {
    ...attack,
    id: special.id || attack.id,
    name: special.name || attack.name,
    effects: [...attack.effects, ...structuredClone(special.effects || [])]
  };
}

function selectWeightedEnemyAction(actionTable, enemy, rng) {
  const weighted = actionTable
    .filter(entry => actionConditionMatches(entry?.when, enemy))
    .map(entry => ({
      action: entry?.action || entry,
      weight: Math.max(0, Number(entry?.weight) || 0)
    }))
    .filter(entry => entry.action && entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let roll = Math.max(0, Math.min(0.999999999999, Number(rng?.()) || 0)) * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll < 0) return entry.action;
  }
  return weighted.at(-1)?.action || null;
}

function actionConditionMatches(condition, enemy) {
  if (!condition) return true;
  const rate = Number(enemy?.maxHp) > 0 ? Number(enemy.hp) / Number(enemy.maxHp) : 1;
  if (Number.isFinite(Number(condition.hpRateBelow)) && !(rate < Number(condition.hpRateBelow))) return false;
  return true;
}

function buildEnemyAction(action, normalAttack) {
  const source = structuredClone(action);
  if (source.actionType !== "physicalAttack") return source;
  return {
    ...normalAttack,
    ...source,
    weapon: normalAttack.weapon,
    effects: structuredClone(source.effects || [])
  };
}

function executeAction({ battle, action, actor, actorSide, target, targetSide, rng }) {
  const actorStats = combatStats(actor);
  const targetStats = combatStats(target);
  if (action.actionType === "enemyEscape" && actorSide === "enemy") {
    actor.alive = false;
    actor.escaped = true;
    actor.experienceReward = 0;
    actor.dropItemId = null;
    actor.dropGold = 0;
    actor.noDrop = true;
    battle.outcome = "enemyEscaped";
    battle.phase = "complete";
    battle.log.push(`${actor.name}は逃げ出した！`);
    return;
  }
  if (action.actionType === "guard") {
    actor.statuses = applyStatusApplications(actor.statuses, [{
      statusId: "guard",
      success: true,
      skipInitialDecrement: true
    }]);
    battle.log.push(`${actor.name}は身を守った。`);
    return;
  }
  if (action.actionType === "chargeDebuff") {
    const successRate = target.isBoss ? Number(action.bossSuccessRate) : Number(action.normalSuccessRate);
    const success = Number(rng()) < Math.max(0, Math.min(1, successRate || 0));
    target.statuses = applyStatusApplications(target.statuses, [{
      statusId: action.statusId, success, skipInitialDecrement: true
    }]);
    battle.log.push(success
      ? `${actor.name}の${action.name}！ ${target.name}は弱体化した！`
      : `${actor.name}の${action.name}！ しかし効果がなかった！`);
    markUltimateUsed(actor, action);
    return;
  }
  if (action.actionType === "chargeHealingBuff") {
    const requested = Math.max(1, Math.ceil(actor.maxHp * (Number(action.healingMaxHpRate) || 0)));
    const healing = Math.min(requested, actor.maxHp - actor.hp);
    actor.hp += healing;
    actor.statuses = applyStatusApplications(actor.statuses, [{
      statusId: action.statusId, success: true, skipInitialDecrement: true
    }]);
    battle.log.push(`${actor.name}の${action.name}！ HPが${healing}回復した！`);
    if (healing > 0) battle.presentationEvents.push({
      type: "healing", actorSide, targetSide: actorSide, amount: healing,
      message: `HPが${healing}回復した！`
    });
    markUltimateUsed(actor, action);
    return;
  }
  if (action.actionType === "wait") {
    battle.log.push(action.waitMessage || `${actor.name}は隙を見せた。`);
    return;
  }
  if (action.actionType === "item") {
    actor.inventory = consumeItem(actor.inventory, action.item.id).inventory;
    let healing = 0;
    for (const effect of action.item.effects) {
      if (effect.id === "heal_hp") {
        const amount = Math.min(effect.value, actor.maxHp - actor.hp);
        actor.hp += amount;
        healing += amount;
      } else if (effect.id === "heal_hp_rate") {
        const requested = Math.max(1, Math.ceil(actor.maxHp * (Number(effect.value) || 0)));
        const amount = Math.min(requested, actor.maxHp - actor.hp);
        actor.hp += amount;
        healing += amount;
      } else if (effect.id === "battle_overheal_flat") {
        const requested = Math.max(1, Math.floor(Number(effect.value) || 0));
        const limit = actor.maxHp + requested;
        const amount = Math.min(requested, Math.max(0, limit - actor.hp));
        actor.hp += amount;
        healing += amount;
        actor.statuses = [
          ...(actor.statuses || []).filter(status => (status.id || status.statusId) !== "active_healing_potion_small_used"),
          { id: "active_healing_potion_small_used", statusId: "active_healing_potion_small_used", expiresAfterBattle: true }
        ];
      } else if (effect.id === "heal_hp_rate") {
        const requested = Math.max(1, Math.ceil(actor.maxHp * (Number(effect.value) || 0)));
        const amount = Math.min(requested, actor.maxHp - actor.hp);
        actor.hp += amount;
        healing += amount;
      } else if (effect.id === "cure_poison") {
        actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== "poison");
      } else if (effect.id === "cure_deadly_poison") {
        actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== "deadly_poison");
      } else if (effect.id === "cure_bleeding") {
        actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== "bleeding");
      } else if (effect.id === "banish_undead") {
        target.hp = 0;
        target.alive = false;
        target.experienceReward = 0;
        target.dropItemId = null;
        target.noDrop = true;
      } else if (effect.id === "element_barrier") {
        const element = effect.element === "ice" ? "ice" : "fire";
        actor.statuses = [
          ...(actor.statuses || []).filter(status => (status.id || status.statusId) !== `${element}_barrier`),
          {
            id: `${element}_barrier`,
            statusId: `${element}_barrier`,
            active: true,
            expiresAfterBattle: true,
            [`${element}DamageReduction`]: Math.max(0, Math.min(0.75, Number(effect.value) || 0))
          }
        ];
      } else if (effect.id === "weapon_element_imbue") {
        const element = effect.element === "ice" ? "ice" : "fire";
        actor.statuses = [
          ...(actor.statuses || []).filter(status => (status.id || status.statusId) !== "weapon_element_imbue"),
          {
            id: "weapon_element_imbue",
            statusId: "weapon_element_imbue",
            element,
            active: true,
            expiresAfterBattle: true
          }
        ];
      } else if (effect.id === "strong_herbicide") {
        if (target.id === "giant_vine_obstacle") {
          target.hp = 0;
          target.alive = false;
          battle.log.push("強力除草剤を巨大蔓へ散布した！ 巨大蔓は見る見るうちに枯れていった！");
          if (action.item.id === "strong_herbicide_trial") actor.herbicideTrialUses = (Number(actor.herbicideTrialUses) || 0) + 1;
        } else if (target.id === "fleischfresser_b59f") {
          const alreadySuppressed = Number(target.regainSuppressedTurns) > 0;
          if (!alreadySuppressed) target.hp = Math.max(1, target.hp - Math.max(0, Math.floor(Number(effect.value) || 500)));
          target.regainSuppressedTurns = 5;
          battle.log.push(alreadySuppressed
            ? "フライシュフレッサーの再生停止時間が延長された！"
            : "フライシュフレッサーの表皮が焼けただれ、再生能力が停止した！");
        }
      }
    }
    battle.log.push(`${actor.name}は${action.item.name}を使った。`);
    if (healing > 0) {
      battle.presentationEvents.push({
        type: "healing", actorSide, targetSide: actorSide, amount: healing,
        message: `HPが${healing}回復した。`
      });
    }
    if (action.item.id === "holy_water") {
      battle.log.push(`${target.name}は聖なる光により消滅した。`);
    }
    const imbue = action.item.effects.find(effect => effect.id === "weapon_element_imbue");
    if (imbue) battle.log.push(`武器に${imbue.element === "ice" ? "氷" : "炎"}の力が宿った！`);
    return;
  }
  if (action.actionType === "wait") {
    battle.log.push(`${actor.name}は隙を見せた。`);
    return;
  }
  if (action.actionType === "wait") {
    battle.log.push(`${actor.name}は隙を見せた。`);
    return;
  }
  if (action.actionType === "buff") {
    const applications = resolveEffects({
      effects: action.effects,
      trigger: "perAction",
      attacker: actorStats,
      defender: actorStats,
      rng
    });
    actor.statuses = applyStatusApplications(
      actor.statuses,
      applications.map(application => ({ ...application, skipInitialDecrement: true }))
    );
    battle.log.push(`${actor.name}は${action.name}を使った。`);
    return;
  }
  if (action.actionType === "healing") {
    const result = resolveHealing({ caster: actorStats, target: actor, healing: action });
    actor.hp = Math.min(actor.maxHp, actor.hp + result.actualHealing);
    battle.log.push(`${actor.name}のHPが${result.actualHealing}回復した。`);
    battle.presentationEvents.push({
      type: "healing",
      actorSide,
      targetSide: actorSide,
      amount: result.actualHealing,
      message: `${result.actualHealing}回復！`
    });
    return;
  }
  if (action.actionType === "cureStatus") {
    const curedStatusIds = getCuredStatusIds(action);
    actor.statuses = (actor.statuses || []).filter(status => !curedStatusIds.includes(status.statusId || status.id));
    const bleeding = (actor.statuses || []).some(status => (status.statusId || status.id) === "bleeding");
    const poison = (actor.statuses || []).some(status => ["poison", "deadly_poison"].includes(status.statusId || status.id));
    actor.condition = bleeding ? "BLEED" : poison ? "POISON" : "GOOD";
    battle.log.push(`${actor.name}は${action.name}を唱えた。${curedStatusIds.includes("bleeding") ? "出血が止まった。" : "毒が消え去った。"}`);
    return;
  }
  if (action.actionType === "sacrificialCure") {
    actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== action.statusId);
    const damage = Math.floor(Math.max(0, Number(actor.maxHp) || 0) * (Number(action.damageRate) || 0));
    actor.hp = Math.max(1, actor.hp - damage);
    const bleeding = (actor.statuses || []).some(status => (status.statusId || status.id) === "bleeding");
    actor.condition = bleeding ? "BLEED" : "GOOD";
    battle.log.push(`${actor.name}は${action.name}を使った。毒が消え、${damage}ダメージを受けた。`);
    battle.presentationEvents.push({
      type: "damage", actorSide, targetSide: actorSide, amount: damage,
      message: `${damage}ダメージ！`
    });
    return;
  }
  if (action.actionType === "banishUndead") {
    target.hp = 0;
    target.alive = false;
    target.experienceReward = 0;
    target.dropItemId = null;
    target.noDrop = true;
    battle.log.push(`${actor.name}は${action.name}を唱えた。${target.name}は聖なる光により消滅した。`);
    return;
  }
  const result = action.actionType === "spell"
    ? resolveSpell({ attacker: actorStats, defender: targetStats, spell: action, rng })
    : resolvePhysicalAttack({ attacker: actorStats, defender: targetStats, attack: action, rng });
  const reduction = action.actionType === "physicalAttack"
    ? Math.max(
      getPhysicalDamageReduction(target.statuses),
      Math.max(0, Math.min(0.95, Number(target.physicalDamageReduction) || 0))
    )
    : 0;
  let resolvedHits = result.hits;
  let passiveExecution = null;
  if (actorSide === "player" && action.passiveInstantDeathId) {
    for (let index = 0; index < resolvedHits.length; index += 1) {
      if (!resolvedHits[index].hit) continue;
      const instantDeath = resolvePassiveInstantDeath({
        passiveId: action.passiveInstantDeathId,
        attacker: actorStats,
        defender: targetStats,
        rng
      });
      if (!instantDeath.success) continue;
      passiveExecution = { index, passiveId: action.passiveInstantDeathId, rate: instantDeath.rate };
      resolvedHits = resolvedHits.slice(0, index + 1);
      break;
    }
  }
  const magicFocus = action.actionType === "spell" && actorSide === "player"
    ? actor.statuses?.find(status => (status.id || status.statusId) === "magic_focus" && status.active !== false)
    : null;
  const manaAmplification = action.actionType === "spell" && actorSide === "player" && !action.ultimateChargeSkill
    ? actor.statuses?.find(status =>
      (status.id || status.statusId) === "charge_mana_amplification" && status.active !== false
    ) : null;
  const raceMultiplier = Number(action.raceDamageMultipliers?.[target.race]) || 1;
  let presentedHits = resolvedHits.map((hit, index) => ({
    index,
    hit: hit.hit,
    critical: hit.critical,
    damage: hit.hit ? Math.max(0, Math.floor(
      hit.damage
        * (1 - reduction)
        * getCapricornDamageMultiplier(battle, actorSide)
        * getCapricornReceivedDamageMultiplier(battle, targetSide)
        * getLibraDamageMultiplier(battle, actorSide, actor, target)
        * getLibraReceivedDamageMultiplier(battle, targetSide, actor, target)
        * getSphinxWeaknessDamageMultiplier(battle, actorSide, result.elementMultiplier)
        * (Number(action.ariesOpeningDamageMultiplier) || 1)
        * (magicFocus ? Number(magicFocus.attackSpellDamageMultiplier) || 1 : 1)
        * (manaAmplification ? Number(manaAmplification.attackSpellDamageMultiplier) || 1 : 1)
        * raceMultiplier
    )) : 0
  }));
  if (magicFocus) {
    actor.statuses = actor.statuses.filter(status => status !== magicFocus);
    battle.log.push("魔力集中の力が攻撃呪文を増幅した！");
  }
  if (passiveExecution) {
    const damageBeforeExecution = presentedHits
      .slice(0, passiveExecution.index)
      .reduce((total, hit) => total + hit.damage, 0);
    presentedHits = presentedHits.map((hit, index) => ({
      ...hit,
      damage: index === passiveExecution.index
        ? Math.max(0, target.hp - damageBeforeExecution)
        : hit.damage,
      slashExecution: index === passiveExecution.index,
      passiveExecutionId: index === passiveExecution.index ? passiveExecution.passiveId : null
    }));
    battle.slashExecution = passiveExecution.passiveId;
    battle.log.push(passiveExecution.passiveId === "flash_slash"
      ? "一閃が敵を断ち切った！"
      : "暗殺術が敵の急所を捉えた！");
  }
  if (actorSide === "player" && action.instantKillNormalUndead && target.race === "undead" && !target.isBoss) {
    const firstLandedIndex = presentedHits.findIndex(hit => hit.hit);
    if (firstLandedIndex >= 0) {
      presentedHits = presentedHits.slice(0, firstLandedIndex + 1).map((hit, index) => ({
        ...hit,
        damage: index === firstLandedIndex ? target.hp : hit.damage,
        slashExecution: index === firstLandedIndex
      }));
      battle.log.push("女神の聖なる光がアンデッドを浄化した！");
    }
  }
  const vorpalExecution = actorSide === "player"
    && action.id === "normal_attack"
    && action.weapon?.id === "vorpal_sword"
    && target.id === "jabberwock_event_boss"
    && presentedHits.some(hit => hit.hit);
  if (vorpalExecution) {
    const firstLandedIndex = presentedHits.findIndex(hit => hit.hit);
    presentedHits = presentedHits.map((hit, index) => ({
      ...hit,
      damage: index === firstLandedIndex ? target.hp : 0,
      vorpalExecution: index === firstLandedIndex,
      slashExecution: index === firstLandedIndex
    }));
    battle.vorpalExecution = true;
    battle.log.push("ヴォーパル・スウォードが怪しく輝いた！");
    battle.log.push("刃はジャバウォックの首を一閃した！");
  }
  let actualDamage = presentedHits.reduce((total, hit) => total + hit.damage, 0);
  const npcWall = targetSide === "player"
    ? target.statuses?.find(status => (status.id || status.statusId) === "npc_johan_wall" && status.active !== false)
    : null;
  const npcWallThreshold = npcWall
    ? Math.max(1, Math.floor(target.maxHp * (Number(npcWall.npcWallDamageThresholdRate) || 0)))
    : 0;
  let npcWallBlocked = false;
  let npcWallReduced = false;
  if (npcWallThreshold > 0) {
    presentedHits = presentedHits.map(hit => {
      if (!hit.hit || hit.damage <= 0) return hit;
      if (hit.damage <= npcWallThreshold) {
        npcWallBlocked = true;
        return { ...hit, damage: 0, blockedByNpcWall: true };
      }
      const strongReduction = Math.max(0, Math.min(0.95, Number(npcWall.npcWallStrongDamageReduction) || 0));
      if (strongReduction <= 0) return hit;
      npcWallReduced = true;
      return { ...hit, damage: Math.max(0, Math.floor(hit.damage * (1 - strongReduction))), reducedByNpcWall: true };
    });
    actualDamage = presentedHits.reduce((total, hit) => total + hit.damage, 0);
    if (npcWallBlocked) battle.log.push("ヨハンの壁が弱い攻撃を完全に防いだ！");
    if (npcWallReduced) battle.log.push("ヨハンの壁が強い攻撃を軽減した！");
  }
  const barrier = action.actionType === "physicalAttack"
    ? findBlockingBarrier(target.statuses, actualDamage)
    : null;
  if (barrier) {
    presentedHits = presentedHits.map(hit => ({ ...hit, damage: 0 }));
    actualDamage = 0;
    barrier.barrierCharges -= 1;
    const remaining = Math.max(0, Number(barrier.barrierCharges) || 0);
    target.statuses = remaining > 0
      ? target.statuses
      : target.statuses.filter(status => status !== barrier);
    battle.log.push(`魔力の壁が攻撃を防いだ！ 残り${remaining}回`);
  }
  if (targetSide === "player" && actualDamage > 0) {
    const protectedDamage = applyNpcLargeDamageProtection(battle, { presentedHits, actualDamage });
    presentedHits = protectedDamage.presentedHits;
    actualDamage = protectedDamage.actualDamage;
  }
  if (targetSide === "player" && actualDamage > 0 && Number(battle.sphinxBarrier) > 0) {
    const absorbed = Math.min(actualDamage, Math.max(0, Math.floor(Number(battle.sphinxBarrier) || 0)));
    let remainingAbsorption = absorbed;
    presentedHits = presentedHits.map(hit => {
      if (!hit.hit || hit.damage <= 0 || remainingAbsorption <= 0) return hit;
      const hitAbsorbed = Math.min(hit.damage, remainingAbsorption);
      remainingAbsorption -= hitAbsorbed;
      return { ...hit, damage: hit.damage - hitAbsorbed, sphinxBarrierAbsorbed: hitAbsorbed };
    });
    battle.sphinxBarrier -= absorbed;
    actualDamage -= absorbed;
    battle.log.push(`障壁が${absorbed}ダメージを防いだ！`);
    battle.presentationEvents.push({ type: "barrierDamage", actorSide, targetSide: "player",
      amount: absorbed, remaining: battle.sphinxBarrier,
      message: battle.sphinxBarrier > 0 ? `障壁 −${absorbed}` : `障壁 −${absorbed}\n障壁が砕け散った！` });
    if (battle.sphinxBarrier <= 0) battle.log.push("障壁が砕け散った！");
  }
  target.hp = Math.max(0, target.hp - actualDamage);
  target.alive = target.hp > 0;
  const hitCount = presentedHits.filter(hit => hit.hit).length;
  const isMultiHit = presentedHits.length > 1;
  battle.log.push(`${actor.name}の${action.name || "攻撃"}！`);
  presentedHits.forEach((hit, index) => {
    const prefix = isMultiHit ? `${index + 1}撃目：` : "";
    const message = hit.blockedByNpcWall
      ? `${prefix}ヨハンの壁が攻撃を防いだ！`
      : hit.hit
        ? `${prefix}${hit.damage}ダメージ！${hit.critical ? " 会心！" : ""}`
      : `${prefix}攻撃は外れた！`;
    battle.log.push(message);
    battle.presentationEvents.push({
      type: "attackHit",
      actorName: actor.name,
      actorSide,
      targetSide,
      hitIndex: index,
      hitCount: presentedHits.length,
      hit: hit.hit,
      damage: hit.damage,
      critical: hit.critical,
      vorpalExecution: Boolean(hit.vorpalExecution),
      slashExecution: Boolean(hit.slashExecution),
      passiveExecutionId: hit.passiveExecutionId || null,
      playerChargePresentationId: actorSide === "player" && action.chargeSkill
        ? action.presentationId || action.id
        : null,
      battlePresentationId: actorSide === "player" && !action.chargeSkill
        ? action.presentationId || null
        : null,
      blockedByNpcWall: Boolean(hit.blockedByNpcWall),
      reducedByNpcWall: Boolean(hit.reducedByNpcWall),
      sphinxBarrierAbsorbed: Math.max(0, Number(hit.sphinxBarrierAbsorbed) || 0),
      message
    });
  });
  if (isMultiHit && hitCount > 0) battle.log.push(`合計${actualDamage}ダメージ！`);
  const landedHits = presentedHits.filter(hit => hit.hit);
  const allLandedHitsBlockedByNpcWall = landedHits.length > 0 && landedHits.every(hit => hit.blockedByNpcWall);
  const applications = barrier || allLandedHitsBlockedByNpcWall ? [] : [
    ...resolvedHits.flatMap(hit => hit.effects || []),
    ...(result.actionEffects || [])
  ];
  target.statuses = applyStatusApplications(target.statuses, applications.map(application => (
    application.statusId === "action_seal" && target.isBoss
      ? { ...application, duration: 1 }
      : application
  )));
  for (const applied of applications.filter(item => item.success)) {
    battle.log.push(`${target.name}は${statusName(applied.statusId)}状態になった。`);
  }
  markUltimateUsed(actor, action);
}

export function getPlayerWeaponElement(player, action = {}) {
  const actionElement = String(action.element || "physical");
  if (actionElement !== "physical") return actionElement;
  const oil = (player?.statuses || []).find(status => (
    (status.id || status.statusId) === "weapon_element_imbue" && status.active !== false
  ));
  if (["fire", "ice"].includes(oil?.element)) return oil.element;
  const weaponElement = String(action.weapon?.element || "physical");
  if (weaponElement !== "physical") return weaponElement;
  if (hasCardEffect(player?.cards?.deckSlots, "weapon_fire_imbue")) return "fire";
  if (hasCardEffect(player?.cards?.deckSlots, "weapon_ice_imbue")) return "ice";
  return "physical";
}

function applyPlayerWeaponElement(player, action) {
  if (action?.actionType !== "physicalAttack") return action;
  return { ...action, element: getPlayerWeaponElement(player, action) };
}

function applyAriesOpeningPriority(battle, order) {
  if (!battle?.ariesActiveAtStart || Number(battle.turn) !== 1) return order;
  return [...order].sort((left, right) => {
    if (left.side === right.side) return 0;
    return left.side === "player" ? -1 : 1;
  });
}

function applyAriesOpeningAttack(battle, action, actorSide) {
  if (actorSide !== "player" || !battle?.ariesOpeningAttackAvailable) return action;
  if (!["physicalAttack", "spell"].includes(action?.actionType)) return action;
  const card = getCardById("zodiac_aries");
  battle.ariesOpeningAttackAvailable = false;
  battle.log.push("エアリーズの力が最初の攻撃を増幅した！");
  return {
    ...action,
    unavoidable: card?.openingUnavoidable !== false,
    defensePenetration: (Number(action.defensePenetration) || 0)
      + Math.max(0, Number(card?.openingDefensePenetration) || 0),
    ariesOpeningDamageMultiplier: Math.max(1, Number(card?.openingDamageMultiplier) || 1)
  };
}

export function getCapricornStackCount(battle = {}) {
  if (!battle.capricornActiveAtStart) return 0;
  const card = getCardById("zodiac_capricorn");
  const turnStep = Math.max(1, Math.floor(Number(card?.longBattleTurnStep) || 5));
  const maximum = Math.max(0, Math.floor(Number(card?.longBattleMaximumStacks) || 3));
  return Math.min(maximum, Math.floor(Math.max(0, Number(battle.turn) || 0) / turnStep));
}

function getCapricornDamageMultiplier(battle, actorSide) {
  if (actorSide !== "player") return 1;
  const card = getCardById("zodiac_capricorn");
  return 1 + getCapricornStackCount(battle) * (Number(card?.longBattleDamagePerStack) || 0);
}

function getCapricornReceivedDamageMultiplier(battle, targetSide) {
  if (targetSide !== "player") return 1;
  const card = getCardById("zodiac_capricorn");
  return Math.max(0, 1 - getCapricornStackCount(battle) * (Number(card?.longBattleReductionPerStack) || 0));
}

function isLibraTarget(player, enemy) {
  if (!enemy) return false;
  if (enemy.isBoss) return true;
  const playerLevel = Number(player?.level);
  const enemyLevel = Number(enemy.level);
  return Number.isFinite(playerLevel) && Number.isFinite(enemyLevel) && enemyLevel > playerLevel;
}

function getLibraDamageMultiplier(battle, actorSide, actor, target) {
  if (!battle.libraActiveAtStart || actorSide !== "player" || !isLibraTarget(actor, target)) return 1;
  return Number(getCardById("zodiac_libra")?.strongerEnemyDamageMultiplier) || 1;
}

function getLibraReceivedDamageMultiplier(battle, targetSide, actor, target) {
  if (!battle.libraActiveAtStart || targetSide !== "player" || !isLibraTarget(target, actor)) return 1;
  return Number(getCardById("zodiac_libra")?.strongerEnemyReceivedDamageMultiplier) || 1;
}

function getSphinxWeaknessDamageMultiplier(battle, actorSide, elementMultiplier) {
  if (!battle.sphinxWisdomActiveAtStart || actorSide !== "player" || Number(elementMultiplier) <= 1) return 1;
  return 1 + Math.max(0, Number(getCardById("legendary_sphinx_wisdom")?.effectValue) || 0);
}

function findBlockingBarrier(statuses = [], damage = 0) {
  if (damage <= 0) return null;
  return statuses.find(status =>
    status.active !== false
    && Number(status.barrierCharges) > 0
    && damage <= Number(status.barrierDamageThreshold)
  ) || null;
}

function finishAction(battle, side) {
  const actor = battle[side];
  finishCombatantAction(battle, actor, side);
}

function finishCombatantAction(battle, actor, side, targetIndex = null) {
  const end = resolveEndOfAction({ statuses: actor.statuses, maxHp: actor.maxHp });
  actor.statuses = end.statuses;
  if (end.poisonDamage > 0 && actor.hp > 0) {
    const actualPoisonDamage = getNonlethalPoisonDamage(actor.hp, end.poisonDamage);
    actor.hp -= actualPoisonDamage;
    actor.alive = actor.hp > 0;
    if (actualPoisonDamage > 0) {
      battle.log.push(`${actor.name}は毒で${actualPoisonDamage}ダメージ。`);
      battle.presentationEvents.push({
        type: "poisonDamage",
        actorSide: null,
        targetSide: side,
        ...(targetIndex == null ? {} : { targetIndex }),
        amount: actualPoisonDamage,
        message: `毒で${actualPoisonDamage}ダメージ！`
      });
    }
  }
  if (end.bleedingDamage > 0 && actor.hp > 0) {
    const damage = getNonlethalPoisonDamage(actor.hp, end.bleedingDamage);
    actor.hp -= damage;
    actor.alive = actor.hp > 0;
    if (damage > 0) {
      battle.log.push(`${actor.name}は出血で${damage}ダメージ。`);
      battle.presentationEvents.push({ type: "bleedingDamage", actorSide: null, targetSide: side,
        ...(targetIndex == null ? {} : { targetIndex }),
        amount: damage, message: `出血で${damage}ダメージ！` });
    }
  }
  if (end.deadlyPoisonDamage > 0 && actor.hp > 0) {
    const damage = Math.min(actor.hp, end.deadlyPoisonDamage);
    actor.hp -= damage;
    actor.alive = actor.hp > 0;
    battle.log.push(`${actor.name}は猛毒で${damage}ダメージ！`);
    battle.presentationEvents.push({ type: "poisonDamage", actorSide: null, targetSide: side,
      ...(targetIndex == null ? {} : { targetIndex }),
      amount: damage, message: `猛毒で${damage}ダメージ！` });
  }
  if (end.deathPoisonDamage > 0 && actor.hp > 0) {
    const damage = Math.min(actor.hp, end.deathPoisonDamage);
    actor.hp -= damage;
    actor.alive = actor.hp > 0;
    battle.log.push(`${actor.name}は死毒で${damage}ダメージ！`);
    battle.presentationEvents.push({ type: "poisonDamage", actorSide: null, targetSide: side,
      ...(targetIndex == null ? {} : { targetIndex }),
      amount: damage, message: `死毒で${damage}ダメージ！` });
  }
  if (side === "enemy" && actor.hp > 0 && Number(actor.regainRate) > 0) {
    if (Number(actor.regainSuppressedTurns) > 0) {
      actor.regainSuppressedTurns -= 1;
      if (actor.regainSuppressedTurns === 0) battle.log.push(`${actor.name}の再生能力が戻った！`);
    } else {
      const amount = Math.min(actor.maxHp - actor.hp, Math.max(1, Math.floor(actor.maxHp * actor.regainRate)));
      actor.hp += amount;
      if (amount > 0) {
        battle.log.push(`${actor.name}は${amount}HPを再生した！`);
        battle.presentationEvents.push({ type: "healing", actorSide: "enemy", targetSide: "enemy", amount, message: `${amount}HP再生！` });
      }
    }
  }
}

function updateMultiOutcome(battle) {
  if (battle.player.hp <= 0) {
    if (applyNpcLethalProtection(battle)) return;
    battle.player.alive = false;
    battle.outcome = "defeat";
    battle.phase = "complete";
    battle.log.push(`${battle.player.name}は倒れた……`);
    return;
  }
  if (livingEnemyIndexes(battle.enemies).length > 0) return;
  battle.outcome = "victory";
  battle.phase = "complete";
  battle.log.push("敵の一団を倒した！");
}

function markUltimateUsed(actor, action) {
  if (!action?.ultimateChargeSkill) return;
  actor.statuses = applyStatusApplications(actor.statuses, [{
    statusId: "charge_ultimate_used", success: true
  }]);
}

function updateOutcome(battle) {
  if (battle.enemy.hp <= 0) {
    battle.enemy.alive = false;
    battle.outcome = "victory";
    battle.phase = "complete";
    battle.log.push(`${battle.enemy.name}を倒した！`);
  } else if (battle.player.hp <= 0) {
    if (applyNpcLethalProtection(battle)) return;
    battle.player.alive = false;
    battle.outcome = "defeat";
    battle.phase = "complete";
    battle.log.push(`${battle.player.name}は倒れた……`);
  }
}

function combatStats(combatant) {
  const collected = collectStats(combatant);
  const statusResistances = structuredClone(combatant.statusResistances || {});
  if ((Number(collected.deadlyPoisonResistance) || 0) >= 1) {
    statusResistances.deadly_poison = { resistancePoints: 100, immune: true };
  }
  for (const statusId of ["poison", "deadly_poison"]) {
    const resistance = statusResistances[statusId] || {};
    statusResistances[statusId] = {
      ...resistance,
      resistancePoints: (Number(resistance.resistancePoints) || 0) + collected.poisonResistance * 100
    };
  }
  const bleeding = statusResistances.bleeding || {};
  statusResistances.bleeding = { ...bleeding,
    resistancePoints: (Number(bleeding.resistancePoints) || 0) + collected.bleedingResistance * 100 };
  const actionSkip = statusResistances.action_skip || {};
  statusResistances.action_skip = { ...actionSkip,
    resistancePoints: (Number(actionSkip.resistancePoints) || 0) + collected.actionSkipResistance * 100 };
  for (const status of combatant.statuses || []) {
    for (const [statusId, points] of Object.entries(status.statusResistancePointsById || {})) {
      const resistance = statusResistances[statusId] || {};
      statusResistances[statusId] = {
        ...resistance,
        resistancePoints: (Number(resistance.resistancePoints) || 0) + (Number(points) || 0)
      };
    }
  }
  const statusFireDamageReduction = (combatant.statuses || []).reduce(
    (total, status) => total + (status.active === false ? 0 : Number(status.fireDamageReduction) || 0), 0
  );
  const statusIceDamageReduction = (combatant.statuses || []).reduce(
    (total, status) => total + (status.active === false ? 0 : Number(status.iceDamageReduction) || 0), 0
  );
  const statusMagicDamageTakenBonus = (combatant.statuses || []).reduce(
    (total, status) => total + (status.active === false ? 0 : Number(status.magicDamageTakenBonus) || 0), 0
  );
  return {
    ...collected,
    def: Math.floor(collected.def * getDefenseMultiplier(combatant.statuses)),
    statusResistanceBonus: collected.statusResistanceBonus + getStatusResistanceBonus(combatant.statuses),
    statuses: structuredClone(combatant.statuses || []),
    statusResistances,
    elementMultipliers: { ...(combatant.elementMultipliers || {}) },
    magicDamageReduction: collected.magicDamageReduction,
    fireDamageReduction: Math.min(0.75, collected.fireDamageReduction + statusFireDamageReduction),
    iceDamageReduction: Math.min(0.75, collected.iceDamageReduction + statusIceDamageReduction),
    nonElementalMagicDamageReduction: collected.nonElementalMagicDamageReduction,
    elementalMagicDamageReduction: collected.elementalMagicDamageReduction,
    fireSpellDamageBonus: collected.fireSpellDamageBonus,
    iceSpellDamageBonus: collected.iceSpellDamageBonus,
    attackSpellDamageBonus: collected.attackSpellDamageBonus,
    passiveInstantDeathRateBonus: collected.passiveInstantDeathRateBonus,
    fireDamageTakenBonus: collected.fireDamageTakenBonus,
    iceDamageTakenBonus: collected.iceDamageTakenBonus,
    magicDamageTakenBonus: statusMagicDamageTakenBonus,
    isBoss: Boolean(combatant.isBoss)
  };
}

function cloneCombatant(source) {
  const equipment = {
    weaponId: source.equipment?.weaponId || "iron_longsword",
    ...(source.equipment || {})
  };
  const weapon = getWeapon(equipment.rightArmId || equipment.weaponId, equipment.rightArmEnhancement || 0);
  return {
    ...structuredClone(source),
    name: source.name || "UNKNOWN",
    hp: Math.max(0, Number(source.hp) || 0),
    maxHp: Math.max(1, Number(source.maxHp) || 1),
    sp: Math.max(0, Number(source.sp) || 0),
    maxSp: Math.max(0, Number(source.maxSp) || 0),
    statuses: structuredClone(source.statuses || []),
    skillIds: [...new Set([...(source.skillIds || []), ...(weapon.grantedSkillIds || [])])],
    equipment,
    alive: source.alive !== false && Number(source.hp) > 0
  };
}

function getCuredStatusIds(action = {}) {
  return Array.isArray(action.statusIds) && action.statusIds.length
    ? action.statusIds
    : [action.statusId].filter(Boolean);
}

function statusName(id) {
  return ({
    armor_break: "DEF低下",
    action_seal: "封技",
    poison: "毒",
    deadly_poison: "猛毒",
    bleeding: "出血",
    action_skip: "行動不能",
    electrified: "感電",
    speed_down: "速度低下"
  })[id] || id;
}
