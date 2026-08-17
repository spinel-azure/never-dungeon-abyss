import { NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";
import { resolveSpell } from "./resolve-spell.js";

export const NPC_SUPPORT_BALANCE = Object.freeze({
  alec: Object.freeze({ attackRate: 0.8, growthAttack: 3, guardBase: 0.15, guardPerStage: 0.02, guardMaximum: 0.35 }),
  rebecca: Object.freeze({ hitRate: 0.5, growthAttack: 3, debuffRate: 0.25, debuffTurns: 2, defenseMultiplier: 0.75 }),
  erika: Object.freeze({ healRate: 0.08, healPerStage: 0.006 }),
  johan: Object.freeze({ basePower: 12, spellRate: 0.85, growthInt: 4, element: "arcane" })
});

export const NPC_CHARGE_SKILLS = Object.freeze({
  alec: Object.freeze({ chargePerTurn: 16, name: "強撃", quote: "強撃！", cutIn: "images/battle_effects/NPC_01.avif", damageMultiplier: 1.5 }),
  rebecca: Object.freeze({ chargePerTurn: 25, name: "双連斬", quote: "双連斬！", cutIn: "images/battle_effects/NPC_02.avif", hitCount: 4, damageMultiplier: 0.9 }),
  erika: Object.freeze({ chargePerTurn: 20, name: "聖なる打撃", quote: "聖なる打撃！", cutIn: "images/battle_effects/NPC_03.avif", basePower: 18, growthPower: 3, undeadBossMultiplier: 3 }),
  johan: Object.freeze({ chargePerTurn: 12, name: "壁よ、守りを！", quote: "壁よ、守りを！", cutIn: "images/battle_effects/NPC_04.avif", durationTurns: 3, damageThresholdRate: 0.15 })
});

export function applyNpcChargeSkills(battle) {
  if (!NPC_SUPPORT_ENABLED || battle?.outcome) return battle;
  for (const npcId of getActiveNpcIds(battle.player)) {
    if (battle.outcome) break;
    const config = NPC_CHARGE_SKILLS[npcId];
    const record = getNpcChargeRecord(battle.player, npcId);
    if (!config || !record || record.charge < 100 || record.chargeCooldown > 0) continue;
    record.charge = 0;
    record.chargeCooldown = 2;
    battle.log.push(`${getNpcDefinition(npcId)?.name}のチャージスキルⅠ「${config.name}」！`);
    battle.presentationEvents.push({
      type: "npcChargeSkill",
      npcId,
      skillName: config.name,
      quote: config.quote,
      cutIn: config.cutIn,
      message: `${getNpcDefinition(npcId)?.name}\n「${config.quote}」`
    });
    if (npcId === "alec") applyAlecChargeSkill(battle, config);
    else if (npcId === "rebecca") applyRebeccaChargeSkill(battle, config);
    else if (npcId === "erika") applyErikaChargeSkill(battle, config);
    else if (npcId === "johan") applyJohanChargeSkill(battle, config);
  }
  return battle;
}

export function advanceNpcChargeState(battle, { allowCharge = true } = {}) {
  if (!NPC_SUPPORT_ENABLED || !battle?.player) return battle;
  for (const npcId of getActiveNpcIds(battle.player)) {
    const config = NPC_CHARGE_SKILLS[npcId];
    const record = getNpcChargeRecord(battle.player, npcId);
    if (!config || !record) continue;
    if (record.chargeCooldown > 0) {
      record.chargeCooldown -= 1;
      continue;
    }
    if (allowCharge) record.charge = Math.min(100, record.charge + config.chargePerTurn);
  }
  return battle;
}

export function advanceNpcWallProtection(battle) {
  if (!battle?.player?.statuses) return battle;
  battle.player.statuses = battle.player.statuses.flatMap(status => {
    if ((status.id || status.statusId) !== "npc_johan_wall" || status.active === false) return [status];
    const turns = Math.max(0, Math.floor(Number(status.npcWallTurns) || 0) - 1);
    return turns > 0 ? [{ ...status, npcWallTurns: turns }] : [];
  });
  return battle;
}

export function canNpcSupport({ battle, npcId, supportType } = {}) {
  if (!NPC_SUPPORT_ENABLED || battle?.outcome || !npcId || !supportType) return false;
  return getActiveNpcIds(battle.player).includes(npcId);
}

export function getNpcSupportStatus(character, npcId) {
  const definition = getNpcDefinition(npcId);
  if (!definition) return null;
  const stage = getGrowthStage(character, npcId);
  const maxDepth = Math.max(0, Math.floor(Number(character?.npcSystem?.records?.[npcId]?.maxDepth) || 0));
  const growth = `${"■".repeat(stage)}${"□".repeat(10 - stage)}`;
  const common = { id: npcId, name: definition.name, jobLabel: definition.jobLabel, stage, maxDepth, growth };
  if (npcId === "alec") {
    const config = NPC_SUPPORT_BALANCE.alec;
    const attack = Number(definition.baseStats.atk) + stage * config.growthAttack;
    return { ...common, rows: [
      ["追撃威力", String(Math.max(1, Math.floor(attack * config.attackRate)))],
      ["防御援護", `${formatPercent(Math.min(config.guardMaximum, config.guardBase + stage * config.guardPerStage))}％`],
      ["援護特性", "攻撃後に追撃／防御時に物理軽減"]
    ] };
  }
  if (npcId === "rebecca") {
    const config = NPC_SUPPORT_BALANCE.rebecca;
    const attack = Number(definition.baseStats.atk) + stage * config.growthAttack;
    return { ...common, rows: [
      ["連撃威力", `${Math.max(1, Math.floor(attack * config.hitRate))}×2`],
      ["弱体成功", `${formatPercent(config.debuffRate)}％`],
      ["弱体効果", `DEF－${formatPercent(1 - config.defenseMultiplier)}％／${config.debuffTurns}ターン`]
    ] };
  }
  if (npcId === "erika") {
    const config = NPC_SUPPORT_BALANCE.erika;
    return { ...common, rows: [
      ["回復量", `最大HPの${formatPercent(config.healRate + stage * config.healPerStage)}％`],
      ["発動条件", "ターン終了時／HP減少中"]
    ] };
  }
  const config = NPC_SUPPORT_BALANCE.johan;
  const intelligence = Number(definition.baseStats.int) + stage * config.growthInt;
  const baseDamage = (config.basePower + intelligence * 0.5) * config.spellRate;
  return { ...common, rows: [
    ["呪文威力", `約${Math.max(1, Math.floor(baseDamage * 0.9))}～${Math.max(1, Math.floor(baseDamage * 1.1))}`],
    ["属性", "無属性"],
    ["発動条件", "ターン開始時"]
  ] };
}

export function applyNpcTurnStart(battle, rng = Math.random) {
  if (!NPC_SUPPORT_ENABLED || battle?.outcome) return battle;
  if (canNpcSupport({ battle, npcId: "rebecca", supportType: "turnStartAttack" })) {
    applyRebeccaSupport(battle, rng);
  }
  if (!battle.outcome && canNpcSupport({ battle, npcId: "johan", supportType: "turnStartSpell" })) {
    applyJohanSupport(battle, rng);
  }
  return battle;
}

export function applyNpcAfterPlayerAttack(battle) {
  if (!canNpcSupport({ battle, npcId: "alec", supportType: "followUp" })) return battle;
  const stage = getGrowthStage(battle.player, "alec");
  const config = NPC_SUPPORT_BALANCE.alec;
  const attack = Number(getNpcDefinition("alec")?.baseStats?.atk) + stage * config.growthAttack;
  const damage = Math.max(1, Math.floor(attack * config.attackRate));
  applyNpcDamage(battle, { npcId: "alec", damage, message: `アレクの追撃！ ${damage}ダメージ！` });
  return battle;
}

export function applyNpcGuardSupport(battle) {
  if (!canNpcSupport({ battle, npcId: "alec", supportType: "guard" })) return battle;
  const stage = getGrowthStage(battle.player, "alec");
  const config = NPC_SUPPORT_BALANCE.alec;
  const reduction = Math.min(config.guardMaximum, config.guardBase + stage * config.guardPerStage);
  battle.player.statuses = [
    ...(battle.player.statuses || []).filter(status => (status.id || status.statusId) !== "npc_alec_guard"),
    { id: "npc_alec_guard", statusId: "npc_alec_guard", active: true, remainingTurns: 1,
      skipInitialDecrement: true, physicalDamageReduction: reduction, expiresAfterBattle: true }
  ];
  battle.log.push("アレクが守りを固めた！");
  battle.presentationEvents.push({ type: "npcSupport", npcId: "alec", message: "アレクが守りを固めた！" });
  return battle;
}

export function applyNpcTurnEnd(battle) {
  if (!canNpcSupport({ battle, npcId: "erika", supportType: "turnEndHeal" })) return battle;
  if (battle.player.hp <= 0 || battle.player.hp >= battle.player.maxHp) return battle;
  const stage = getGrowthStage(battle.player, "erika");
  const config = NPC_SUPPORT_BALANCE.erika;
  const requested = Math.max(1, Math.floor(battle.player.maxHp * (config.healRate + stage * config.healPerStage)));
  const amount = Math.min(requested, battle.player.maxHp - battle.player.hp);
  battle.player.hp += amount;
  const message = `エリカの祈り！ HPが${amount}回復した！`;
  battle.log.push(message);
  battle.presentationEvents.push({ type: "healing", npcId: "erika", actorSide: "npc", targetSide: "player", amount, message });
  return battle;
}

function applyRebeccaSupport(battle, rng) {
  const stage = getGrowthStage(battle.player, "rebecca");
  const definition = getNpcDefinition("rebecca");
  const config = NPC_SUPPORT_BALANCE.rebecca;
  const attack = Number(definition?.baseStats?.atk) + stage * config.growthAttack;
  const damage = Math.max(1, Math.floor(attack * config.hitRate));
  battle.log.push("レベッカの連続攻撃！");
  for (let hitIndex = 0; hitIndex < 2 && !battle.outcome; hitIndex += 1) {
    applyNpcDamage(battle, { npcId: "rebecca", damage, message: `${hitIndex + 1}撃目：${damage}ダメージ！`, hitIndex, hitCount: 2 });
  }
  if (!battle.outcome && Number(rng()) < config.debuffRate) {
    battle.enemy.statuses = [
      ...(battle.enemy.statuses || []).filter(status => (status.id || status.statusId) !== "npc_defense_down"),
      { id: "npc_defense_down", statusId: "npc_defense_down", active: true,
        remainingTurns: config.debuffTurns, skipInitialDecrement: true,
        defenseMultiplier: config.defenseMultiplier, expiresAfterBattle: true }
    ];
    battle.log.push("敵の防御力が低下した！");
    battle.presentationEvents.push({ type: "npcSupport", npcId: "rebecca", message: "敵の防御力が低下した！" });
  }
}

function applyJohanSupport(battle, rng) {
  const stage = getGrowthStage(battle.player, "johan");
  const definition = getNpcDefinition("johan");
  const config = NPC_SUPPORT_BALANCE.johan;
  const intelligence = Number(definition?.baseStats?.int) + stage * config.growthInt;
  const result = resolveSpell({
    attacker: { int: intelligence },
    defender: battle.enemy,
    spell: { id: "npc_johan_arcane", element: config.element, spellPower: config.basePower, powerMultiplier: config.spellRate },
    rng
  });
  const damage = Math.max(0, Math.floor(result.totalDamage || result.hits?.[0]?.damage || 0));
  applyNpcDamage(battle, { npcId: "johan", damage, message: `ヨハンが攻撃呪文を放った！ ${damage}ダメージ！` });
}

function applyAlecChargeSkill(battle, config) {
  const stage = getGrowthStage(battle.player, "alec");
  const support = NPC_SUPPORT_BALANCE.alec;
  const attack = Number(getNpcDefinition("alec")?.baseStats?.atk) + stage * support.growthAttack;
  const normalDamage = Math.max(1, Math.floor(attack * support.attackRate));
  const damage = Math.max(1, Math.floor(normalDamage * config.damageMultiplier));
  applyNpcDamage(battle, { npcId: "alec", damage, actionName: config.name, message: `強撃！ ${damage}ダメージ！` });
}

function applyRebeccaChargeSkill(battle, config) {
  const stage = getGrowthStage(battle.player, "rebecca");
  const support = NPC_SUPPORT_BALANCE.rebecca;
  const attack = Number(getNpcDefinition("rebecca")?.baseStats?.atk) + stage * support.growthAttack;
  const normalHitDamage = Math.max(1, Math.floor(attack * support.hitRate));
  const damage = Math.max(1, Math.floor(normalHitDamage * config.damageMultiplier));
  for (let hitIndex = 0; hitIndex < config.hitCount && !battle.outcome; hitIndex += 1) {
    applyNpcDamage(battle, {
      npcId: "rebecca",
      damage,
      actionName: config.name,
      message: `${hitIndex + 1}撃目：${damage}ダメージ！`,
      hitIndex,
      hitCount: config.hitCount
    });
  }
}

function applyErikaChargeSkill(battle, config) {
  const stage = getGrowthStage(battle.player, "erika");
  const baseDamage = Math.max(1, Math.floor(config.basePower + stage * config.growthPower));
  const isUndead = battle.enemy.race === "undead";
  const damage = isUndead && !battle.enemy.isBoss
    ? battle.enemy.hp
    : Math.max(1, Math.floor(baseDamage * (isUndead ? config.undeadBossMultiplier : 1)));
  applyNpcDamage(battle, {
    npcId: "erika",
    damage,
    actionName: config.name,
    message: isUndead && !battle.enemy.isBoss
      ? `聖なる打撃がアンデッドを浄化した！`
      : `聖なる打撃！ 防御力を無視して${damage}ダメージ！`
  });
}

function applyJohanChargeSkill(battle, config) {
  battle.player.statuses = [
    ...(battle.player.statuses || []).filter(status => (status.id || status.statusId) !== "npc_johan_wall"),
    {
      id: "npc_johan_wall",
      statusId: "npc_johan_wall",
      active: true,
      expiresAfterBattle: true,
      npcWallTurns: config.durationTurns,
      npcWallDamageThresholdRate: config.damageThresholdRate
    }
  ];
  battle.log.push("ヨハンの壁が弱い攻撃を完全に防ぐ！");
  battle.presentationEvents.push({
    type: "npcSupport",
    npcId: "johan",
    message: "ヨハンの壁が3ターンの間、弱い攻撃を完全に防ぐ！"
  });
}

function getNpcChargeRecord(player, npcId) {
  const records = player?.npcSystem?.records;
  if (!records || !records[npcId]) return null;
  const record = records[npcId];
  record.charge = Math.max(0, Math.min(100, Math.floor(Number(record.charge) || 0)));
  record.chargeCooldown = Math.max(0, Math.min(2, Math.floor(Number(record.chargeCooldown) || 0)));
  return record;
}

function applyNpcDamage(battle, { npcId, damage, actionName = "", message, hitIndex = 0, hitCount = 1 }) {
  if (battle.outcome || battle.enemy.hp <= 0) return 0;
  const actual = Math.min(battle.enemy.hp, Math.max(0, Math.floor(damage)));
  battle.enemy.hp -= actual;
  battle.enemy.alive = battle.enemy.hp > 0;
  battle.log.push(message);
  battle.presentationEvents.push({ type: "attackHit", npcId, actorName: getNpcDefinition(npcId)?.name,
    actorSide: "npc", targetSide: "enemy", actionName, hitIndex, hitCount, hit: true, damage: actual, message });
  if (battle.enemy.hp <= 0) setNpcVictory(battle);
  return actual;
}

function setNpcVictory(battle) {
  battle.enemy.hp = 0;
  battle.enemy.alive = false;
  battle.outcome = "victory";
  battle.phase = "complete";
  battle.log.push(`${battle.enemy.name}を倒した！`);
}

function getActiveNpcIds(player) {
  return Array.isArray(player?.npcSystem?.activeIds) ? player.npcSystem.activeIds : [];
}

function getGrowthStage(player, npcId) {
  return Math.max(0, Math.min(10, Math.floor(Number(player?.npcSystem?.records?.[npcId]?.growthStage) || 0)));
}

function formatPercent(rate) {
  const value = Math.round(Number(rate) * 1000) / 10;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
