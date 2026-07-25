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
  getPhysicalDamageReduction,
  getStatusResistanceBonus,
  resolveActionOpportunity,
  resolveEndOfAction
} from "./status-lifecycle.js";
import { getSkill } from "../data/skills.js";

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
  const playerAction = createPlayerAction(next.player, playerCommand);
  if (!playerAction.ok) return { battle: next, accepted: false, reason: playerAction.reason };
  const enemyAction = createEnemyAction(next.enemy);
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

export function createPlayerAction(player, command = {}) {
  if (command.type === "attack") {
    return {
      ok: true,
      spCost: 0,
      action: createNormalAttack({ weaponId: player.equipment?.weaponId })
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
  if (command.type !== "skill") return { ok: false, reason: "notImplemented" };
  const skill = getSkill(command.skillId);
  if (!skill || !player.skillIds?.includes(skill.id)) return { ok: false, reason: "unknownSkill" };
  if (player.sp < skill.spCost) return { ok: false, reason: "insufficientSp" };
  const action = skill.actionType === "physicalAttack"
    ? createSkillAttack(skill, { weaponId: player.equipment?.weaponId })
    : { ...skill };
  return { ok: true, spCost: skill.spCost, action };
}

function createEnemyAction(enemy) {
  return createNormalAttack({
    weapon: {
      id: `${enemy.id}_attack`,
      name: "攻撃",
      type: "longsword",
      attack: enemy.attack,
      element: "physical"
    }
  });
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
    actor.hp = Math.max(0, actor.hp - end.poisonDamage);
    actor.alive = actor.hp > 0;
    battle.log.push(`${actor.name}は毒で${end.poisonDamage}ダメージ。`);
    battle.presentationEvents.push({
      type: "damage",
      actorSide: null,
      targetSide: side,
      amount: end.poisonDamage,
      message: `毒で${end.poisonDamage}ダメージ！`
    });
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
