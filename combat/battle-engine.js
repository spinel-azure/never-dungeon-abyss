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

export function createBattleState({ character, enemy }) {
  const vorpalSwordEquippedAtStart = character?.equipment?.weaponId === "vorpal_sword";
  return {
    turn: 1,
    phase: "command",
    outcome: null,
    player: cloneCombatant(character),
    enemy: cloneCombatant(enemy),
    vorpalSwordEquippedAtStart,
    vorpalExecution: false,
    slashExecution: null,
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
        weaponEnhancement: player.equipment?.rightArmEnhancement,
        skillIds: player.skillIds
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
  if (skill.actionType === "passive") return { ok: false, reason: "passive" };
  if (skill.preventWhileStatusActive && (player.statuses || []).some(status =>
    (status.statusId || status.id) === skill.preventWhileStatusActive && status.active !== false
  )) return { ok: false, reason: "alreadyActive" };
  if (player.sp < skill.spCost) return { ok: false, reason: "insufficientSp" };
  if (["cureStatus", "sacrificialCure"].includes(skill.actionType)
    && !(player.statuses || []).some(status => (status.statusId || status.id) === skill.statusId)) {
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
  const actionTable = Array.isArray(enemy.actions) ? enemy.actions : [];
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
      } else if (effect.id === "cure_bleeding") {
        actor.statuses = (actor.statuses || []).filter(status => (status.statusId || status.id) !== "bleeding");
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
    const bleeding = (actor.statuses || []).some(status => (status.statusId || status.id) === "bleeding");
    const poison = (actor.statuses || []).some(status => (status.statusId || status.id) === "poison");
    actor.condition = bleeding ? "BLEED" : poison ? "POISON" : "GOOD";
    battle.log.push(`${actor.name}は${action.name}を唱えた。${action.statusId === "bleeding" ? "出血が止まった。" : "毒が消え去った。"}`);
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
    ? getPhysicalDamageReduction(target.statuses)
    : 0;
  let resolvedHits = result.hits;
  let passiveExecution = null;
  if (actorSide === "player" && action.id === "normal_attack" && action.passiveInstantDeathId) {
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
  let presentedHits = resolvedHits.map((hit, index) => ({
    index,
    hit: hit.hit,
    critical: hit.critical,
    damage: hit.hit ? Math.max(0, Math.floor(hit.damage * (1 - reduction))) : 0
  }));
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
      message
    });
  });
  if (isMultiHit && hitCount > 0) battle.log.push(`合計${actualDamage}ダメージ！`);
  const applications = barrier ? [] : [
    ...resolvedHits.flatMap(hit => hit.effects || []),
    ...(result.actionEffects || [])
  ];
  target.statuses = applyStatusApplications(target.statuses, applications);
  for (const applied of applications.filter(item => item.success)) {
    battle.log.push(`${target.name}は${statusName(applied.statusId)}状態になった。`);
  }
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
  if (end.bleedingDamage > 0 && actor.hp > 0) {
    const damage = getNonlethalPoisonDamage(actor.hp, end.bleedingDamage);
    actor.hp -= damage;
    actor.alive = actor.hp > 0;
    if (damage > 0) {
      battle.log.push(`${actor.name}は出血で${damage}ダメージ。`);
      battle.presentationEvents.push({ type: "bleedingDamage", actorSide: null, targetSide: side,
        amount: damage, message: `出血で${damage}ダメージ！` });
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
  const statusResistances = structuredClone(combatant.statusResistances || {});
  const bleeding = statusResistances.bleeding || {};
  statusResistances.bleeding = { ...bleeding,
    resistancePoints: (Number(bleeding.resistancePoints) || 0) + collected.bleedingResistance * 100 };
  const actionSkip = statusResistances.action_skip || {};
  statusResistances.action_skip = { ...actionSkip,
    resistancePoints: (Number(actionSkip.resistancePoints) || 0) + collected.actionSkipResistance * 100 };
  return {
    ...collected,
    def: Math.floor(collected.def * getDefenseMultiplier(combatant.statuses)),
    statusResistanceBonus: collected.statusResistanceBonus + getStatusResistanceBonus(combatant.statuses),
    statuses: structuredClone(combatant.statuses || []),
    statusResistances,
    elementMultipliers: { ...(combatant.elementMultipliers || {}) },
    magicDamageReduction: collected.magicDamageReduction,
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
    bleeding: "出血",
    action_skip: "行動不能",
    speed_down: "速度低下"
  })[id] || id;
}
