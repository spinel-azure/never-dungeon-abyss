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
} from "./status-lifecycle.js?v=20260805-01";
import { getSkill } from "../data/skills.js";
import { getItem } from "../data/items.js";
import { consumeItem } from "../data/inventory.js";
import { getItemUnavailableReason } from "./resolve-item-use.js";

export function createBattleState({ character, enemy }) {
  return {
    turn: 1,
    phase: "command",
    outcome: null,
    player: cloneCombatant(character),
    enemy: cloneCombatant(enemy),
    log: [`${enemy.name}が現れた！`],
    presentationEvents: []
  };
}

export function resolveBattleRound({ battle, playerCommand, rng = Math.random } = {}) {
  const next = structuredClone(battle);
  const playerAction = createPlayerAction(next.player, playerCommand, next.enemy);
  if (!playerAction.ok) return { battle: next, accepted: false, reason: playerAction.reason };
  const enemyAction = createEnemyAction(next.enemy, rng);
  const order = resolveTurnOrder([
    { side: "player", actor: combatStats(next.player), action: playerAction.action },
    { side: "enemy", actor: combatStats(next.enemy), action: enemyAction }
  ], rng);
  next.log = [];
  next.presentationEvents = [];
  if (playerAction.spCost > 0) next.player.sp -= playerAction.spCost;

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
    executeAction({
      battle: next,
      action: entry.action,
      actor,
      actorSide: entry.side,
      target,
      targetSide,
      rng
    });
    finishAction(next, entry.side);
    updateOutcome(next);
  }
  if (!next.outcome) {
    next.turn += 1;
    next.phase = "command";
  }
  return { battle: next, accepted: true };
}

export function resolveEnemyAmbush({ battle, rng = Math.random } = {}) {
  const next = structuredClone(battle);
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
    return {
      ok: true,
      spCost: 0,
      action: createNormalAttack({
        weaponId: player.equipment?.weaponId,
        weaponEnhancement: player.equipment?.rightArmEnhancement
      })
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
  if (player.sp < skill.spCost) return { ok: false, reason: "insufficientSp" };
  if (skill.actionType === "cureStatus" && !(player.statuses || []).some(status => (status.statusId || status.id) === skill.statusId)) {
    return { ok: false, reason: "noEffect" };
  }
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
  return { ok: true, spCost: skill.spCost, action };
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

function executeAction({ battle, action, actor, actorSide, target, targetSide, rng }) {
  const actorStats = combatStats(actor);
  const targetStats = combatStats(target);
  if (action.actionType === "guard") {
    actor.statuses = applyStatusApplications(actor.statuses, [{
      statusId: "guard",
      success: true,
      skipInitialDecrement: true
    }]);
    battle.log.push(`${actor.name}は身を守った。`);
    return;
  }
  if (action.actionType === "wait") {
    battle.log.push(`${actor.name}は隙を見せた。`);
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
      } else if (effect.id === "cure_poison") {
        actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== "poison");
      } else if (effect.id === "banish_undead") {
        target.hp = 0;
        target.alive = false;
        target.experienceReward = 0;
        target.dropItemId = null;
        target.noDrop = true;
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
    actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== action.statusId);
    actor.condition = (actor.statuses || []).some(status => (status.statusId || status.id) === "poison") ? "POISON" : "GOOD";
    battle.log.push(`${actor.name}は${action.name}を唱えた。毒が消え去った。`);
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
    ? getPhysicalDamageReduction(target.statuses)
    : 0;
  const presentedHits = result.hits.map((hit, index) => ({
    index,
    hit: hit.hit,
    critical: hit.critical,
    damage: hit.hit ? Math.max(0, Math.floor(hit.damage * (1 - reduction))) : 0
  }));
  const actualDamage = presentedHits.reduce((total, hit) => total + hit.damage, 0);
  target.hp = Math.max(0, target.hp - actualDamage);
  target.alive = target.hp > 0;
  const hitCount = presentedHits.filter(hit => hit.hit).length;
  const isMultiHit = presentedHits.length > 1;
  battle.log.push(`${actor.name}の${action.name || "攻撃"}！`);
  presentedHits.forEach((hit, index) => {
    const prefix = isMultiHit ? `${index + 1}撃目：` : "";
    const message = hit.hit
      ? `${prefix}${hit.damage}ダメージ！${hit.critical ? " 会心！" : ""}`
      : `${prefix}攻撃は外れた！`;
    battle.log.push(message);
    battle.presentationEvents.push({
      type: "attackHit",
      actorSide,
      targetSide,
      hitIndex: index,
      hitCount: presentedHits.length,
      hit: hit.hit,
      damage: hit.damage,
      critical: hit.critical,
      message
    });
  });
  if (isMultiHit && hitCount > 0) battle.log.push(`合計${actualDamage}ダメージ！`);
  const applications = [
    ...result.hits.flatMap(hit => hit.effects || []),
    ...(result.actionEffects || [])
  ];
  target.statuses = applyStatusApplications(target.statuses, applications);
  for (const applied of applications.filter(item => item.success)) {
    battle.log.push(`${target.name}は${statusName(applied.statusId)}状態になった。`);
  }
}

function finishAction(battle, side) {
  const actor = battle[side];
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
        amount: actualPoisonDamage,
        message: `毒で${actualPoisonDamage}ダメージ！`
      });
    }
  }
}

function updateOutcome(battle) {
  if (battle.enemy.hp <= 0) {
    battle.enemy.alive = false;
    battle.outcome = "victory";
    battle.phase = "complete";
    battle.log.push(`${battle.enemy.name}を倒した！`);
  } else if (battle.player.hp <= 0) {
    battle.player.alive = false;
    battle.outcome = "defeat";
    battle.phase = "complete";
    battle.log.push(`${battle.player.name}は倒れた……`);
  }
}

function combatStats(combatant) {
  const collected = collectStats(combatant);
  return {
    ...collected,
    def: Math.floor(collected.def * getDefenseMultiplier(combatant.statuses)),
    statusResistanceBonus: collected.statusResistanceBonus + getStatusResistanceBonus(combatant.statuses),
    statuses: structuredClone(combatant.statuses || []),
    statusResistances: structuredClone(combatant.statusResistances || {}),
    elementMultipliers: { ...(combatant.elementMultipliers || {}) },
    isBoss: Boolean(combatant.isBoss)
  };
}

function cloneCombatant(source) {
  return {
    ...structuredClone(source),
    name: source.name || "UNKNOWN",
    hp: Math.max(0, Number(source.hp) || 0),
    maxHp: Math.max(1, Number(source.maxHp) || 1),
    sp: Math.max(0, Number(source.sp) || 0),
    maxSp: Math.max(0, Number(source.maxSp) || 0),
    statuses: structuredClone(source.statuses || []),
    equipment: {
      weaponId: source.equipment?.weaponId || "iron_longsword",
      ...(source.equipment || {})
    },
    alive: source.alive !== false && Number(source.hp) > 0
  };
}

function statusName(id) {
  return ({
    armor_break: "DEF低下",
    poison: "毒",
    action_skip: "行動不能",
    speed_down: "速度低下"
  })[id] || id;
}
