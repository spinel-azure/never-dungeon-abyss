import { NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";
import { resolveSpell } from "./resolve-spell.js";
import { resolveInstantDeath } from "./resolve-status-effect.js";
import { getNpcStagePassive, NPC_ADVANCED_GROWTH } from "../data/npc-passives.js";

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

export function applyNpcChargeSkills(battle, rng = Math.random) {
  if (!NPC_SUPPORT_ENABLED || battle?.outcome) return battle;
  for (const npcId of getActiveNpcIds(battle.player)) {
    if (battle.outcome) break;
    const config = NPC_CHARGE_SKILLS[npcId];
    const record = getNpcChargeRecord(battle.player, npcId);
    if (!config || !record || record.charge < 100 || record.chargeCooldown > 0) continue;
    const stage = getGrowthStage(battle.player, npcId);
    const erikaHealReady = npcId === "erika"
      && battle.player.hp > 0
      && battle.player.hp <= battle.player.maxHp * NPC_ADVANCED_GROWTH.erika.stage8.hpThresholdRate;
    const upgradedName = stage >= 8 && (npcId !== "erika" || erikaHealReady)
      ? NPC_ADVANCED_GROWTH[npcId]?.stage8?.name
      : null;
    const resolvedName = upgradedName || config.name;
    record.charge = 0;
    record.chargeCooldown = 2;
    battle.log.push(`${getNpcDefinition(npcId)?.name}のチャージスキルⅠ「${resolvedName}」！`);
    battle.presentationEvents.push({
      type: "npcChargeSkill",
      npcId,
      skillName: resolvedName,
      quote: upgradedName || config.quote,
      cutIn: config.cutIn,
      message: `${getNpcDefinition(npcId)?.name}「${upgradedName || config.quote}」`
    });
    if (npcId === "alec") applyAlecChargeSkill(battle, config, rng);
    else if (npcId === "rebecca") applyRebeccaChargeSkill(battle, config, rng);
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

export function applyNpcBattleStart(battle, rng = Math.random) {
  if (!battle || battle.npcOpeningSupportApplied) return battle;
  battle.npcOpeningSupportApplied = true;
  if (!canNpcSupport({ battle, npcId: "rebecca", supportType: "openingAttack" })
    || getGrowthStage(battle.player, "rebecca") < 10) return battle;
  const upgrade = NPC_ADVANCED_GROWTH.rebecca.stage10;
  const support = NPC_SUPPORT_BALANCE.rebecca;
  const attack = Number(getNpcDefinition("rebecca")?.baseStats?.atk) + 10 * support.growthAttack;
  const damage = Math.max(1, Math.floor(attack * support.hitRate));
  battle.log.push(`レベッカの「${upgrade.name}」！`);
  battle.presentationEvents.push({ type: "npcSupport", npcId: "rebecca", actionName: upgrade.name,
    message: `レベッカ「${upgrade.name}！」` });
  if (!Array.isArray(battle.enemies)) {
    applyNpcDamage(battle, { npcId: "rebecca", damage, actionName: upgrade.name,
      message: `${upgrade.name}！ ${damage}ダメージ！`, rng });
    return battle;
  }
  const selected = battle.enemy;
  for (const enemy of battle.enemies) {
    if (!enemy?.alive || enemy.hp <= 0 || battle.outcome) continue;
    battle.enemy = enemy;
    applyNpcDamage(battle, { npcId: "rebecca", damage, actionName: upgrade.name,
      message: `${upgrade.name}！ ${damage}ダメージ！`, rng });
  }
  if (!battle.outcome) battle.enemy = selected?.alive ? selected : battle.enemies.find(enemy => enemy.alive) || selected;
  return battle;
}

export function applyNpcLethalProtection(battle) {
  if (!battle?.player || battle.player.hp > 0 || battle.npcSiegfriedUsed
    || !canNpcSupport({ battle, npcId: "alec", supportType: "lethalProtection" })
    || getGrowthStage(battle.player, "alec") < 10) return false;
  const name = NPC_ADVANCED_GROWTH.alec.stage10.name;
  battle.npcSiegfriedUsed = true;
  battle.player.hp = 1;
  battle.player.alive = true;
  battle.log.push(`アレクの「${name}」！ 致命の一撃を受け止めた！`);
  battle.presentationEvents.push({ type: "healing", npcId: "alec", actorSide: "npc", targetSide: "player",
    amount: 1, actionName: name, message: `アレクが致命の一撃を受け止めた！` });
  return true;
}

export function applyNpcLargeDamageProtection(battle, { presentedHits = [], actualDamage = 0 } = {}) {
  const upgrade = NPC_ADVANCED_GROWTH.johan.stage10;
  if (!battle?.player || battle.npcZauberschildUsed || actualDamage <= 0
    || actualDamage < Math.max(1, Math.floor(battle.player.maxHp * upgrade.triggerDamageMaxHpRate))
    || !canNpcSupport({ battle, npcId: "johan", supportType: "largeDamageProtection" })
    || getGrowthStage(battle.player, "johan") < 10) return { presentedHits, actualDamage, activated: false };
  battle.npcZauberschildUsed = true;
  const reducedHits = presentedHits.map(hit => ({
    ...hit,
    damage: hit.hit ? Math.max(0, Math.floor(hit.damage * (1 - upgrade.damageReduction))) : hit.damage
  }));
  const reducedDamage = reducedHits.reduce((total, hit) => total + (Number(hit.damage) || 0), 0);
  const spRecovery = Math.min(battle.player.maxSp - battle.player.sp,
    Math.max(1, Math.floor(battle.player.maxSp * upgrade.spRecoveryMaxSpRate)));
  battle.player.sp += Math.max(0, spRecovery);
  battle.log.push(`ヨハンの「${upgrade.name}」！ 巨大な魔力障壁が致命の一撃を歪めた！`);
  if (spRecovery > 0) battle.log.push(`SPが${spRecovery}回復した！`);
  battle.presentationEvents.push({ type: "npcSupport", npcId: "johan", actionName: upgrade.name,
    spRecovery, message: `ヨハンの「${upgrade.name}」が大ダメージを軽減した！` });
  return { presentedHits: reducedHits, actualDamage: reducedDamage, activated: true };
}

export function getNpcSupportStatus(character, npcId) {
  const definition = getNpcDefinition(npcId);
  if (!definition) return null;
  const stage = getGrowthStage(character, npcId);
  const maxDepth = Math.max(0, Math.floor(Number(character?.npcSystem?.records?.[npcId]?.maxDepth) || 0));
  const growth = `${"■".repeat(stage)}${"□".repeat(10 - stage)}`;
  const passive = getNpcStagePassive(npcId, stage);
  const passiveText = advanced => {
    const current = advanced || passive;
    return current ? `${current.name}（${current.description}）` : "";
  };
  const common = { id: npcId, name: definition.name, jobLabel: definition.jobLabel, stage, maxDepth, growth };
  if (npcId === "alec") {
    const config = NPC_SUPPORT_BALANCE.alec;
    const attack = Number(definition.baseStats.atk) + stage * config.growthAttack;
    const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.alec.stage7 : null;
    const advancedRows = [
      ...(stage >= 8 ? [["チャージ", NPC_ADVANCED_GROWTH.alec.stage8.name]] : []),
      ...(stage >= 10 ? [["奥義", NPC_ADVANCED_GROWTH.alec.stage10.name]] : [])
    ];
    return { ...common, rows: [
      ["追撃威力", String(Math.max(1, Math.floor(attack * config.attackRate * (stage7?.attackMultiplier || 1))))],
      ["防御援護", `${formatPercent(Math.min(config.guardMaximum, config.guardBase + stage * config.guardPerStage + (stage7?.guardBonus || 0)))}％`],
      ["援護特性", "攻撃後に追撃／防御時に物理軽減"],
      ...(passive ? [["パッシブ", passiveText(stage >= 9 ? NPC_ADVANCED_GROWTH.alec.stage9 : null)]] : []),
      ...advancedRows
    ] };
  }
  if (npcId === "rebecca") {
    const config = NPC_SUPPORT_BALANCE.rebecca;
    const attack = Number(definition.baseStats.atk) + stage * config.growthAttack;
    const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.rebecca.stage7 : null;
    return { ...common, rows: [
      ["連撃威力", `${Math.max(1, Math.floor(attack * config.hitRate))}×2`],
      ["弱体成功", `${formatPercent(stage7?.debuffRate ?? config.debuffRate)}％`],
      ["弱体効果", `DEF－${formatPercent(1 - config.defenseMultiplier)}％／${stage7?.debuffTurns ?? config.debuffTurns}ターン`],
      ...(passive ? [["パッシブ", passiveText(stage >= 9 ? NPC_ADVANCED_GROWTH.rebecca.stage9 : null)]] : []),
      ...(stage >= 8 ? [["チャージ", NPC_ADVANCED_GROWTH.rebecca.stage8.name]] : []),
      ...(stage >= 10 ? [["奥義", NPC_ADVANCED_GROWTH.rebecca.stage10.name]] : [])
    ] };
  }
  if (npcId === "erika") {
    const config = NPC_SUPPORT_BALANCE.erika;
    return { ...common, rows: [
      ["回復量", `最大HPの${formatPercent(config.healRate + stage * config.healPerStage)}％`],
      ["発動条件", "ターン終了時／HP減少中"],
      ...(passive ? [["パッシブ", passiveText(stage >= 9 ? NPC_ADVANCED_GROWTH.erika.stage9 : null)]] : []),
      ...(stage >= 8 ? [["チャージ", NPC_ADVANCED_GROWTH.erika.stage8.name]] : []),
      ...(stage >= 10 ? [["奥義", NPC_ADVANCED_GROWTH.erika.stage10.name]] : [])
    ] };
  }
  const config = NPC_SUPPORT_BALANCE.johan;
  const intelligence = Number(definition.baseStats.int) + stage * config.growthInt;
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.johan.stage7 : null;
  const baseDamage = (config.basePower + intelligence * 0.5) * config.spellRate * (stage7?.spellDamageMultiplier || 1);
  return { ...common, rows: [
    ["呪文威力", `約${Math.max(1, Math.floor(baseDamage * 0.9))}～${Math.max(1, Math.floor(baseDamage * 1.1))}`],
    ["属性", "無属性"],
    ["発動条件", "ターン開始時"],
    ...(passive ? [["パッシブ", passiveText(stage >= 9 ? NPC_ADVANCED_GROWTH.johan.stage9 : null)]] : []),
    ...(stage >= 8 ? [["チャージ", NPC_ADVANCED_GROWTH.johan.stage8.name]] : []),
    ...(stage >= 10 ? [["奥義", NPC_ADVANCED_GROWTH.johan.stage10.name]] : [])
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

export function applyNpcAfterPlayerAttack(battle, rng = Math.random) {
  if (!canNpcSupport({ battle, npcId: "alec", supportType: "followUp" })) return battle;
  const stage = getGrowthStage(battle.player, "alec");
  const config = NPC_SUPPORT_BALANCE.alec;
  const attack = Number(getNpcDefinition("alec")?.baseStats?.atk) + stage * config.growthAttack;
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.alec.stage7 : null;
  const damage = Math.max(1, Math.floor(attack * config.attackRate * (stage7?.attackMultiplier || 1)));
  applyNpcDamage(battle, { npcId: "alec", damage, message: `アレクの追撃！ ${damage}ダメージ！`, rng });
  return battle;
}

export function applyNpcGuardSupport(battle) {
  if (!canNpcSupport({ battle, npcId: "alec", supportType: "guard" })) return battle;
  const stage = getGrowthStage(battle.player, "alec");
  const config = NPC_SUPPORT_BALANCE.alec;
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.alec.stage7 : null;
  const reduction = Math.min(config.guardMaximum, config.guardBase + stage * config.guardPerStage + (stage7?.guardBonus || 0));
  battle.player.statuses = [
    ...(battle.player.statuses || []).filter(status => (status.id || status.statusId) !== "npc_alec_guard"),
    { id: "npc_alec_guard", statusId: "npc_alec_guard", active: true, remainingTurns: 1,
      skipInitialDecrement: true, physicalDamageReduction: reduction, expiresAfterBattle: true }
  ];
  battle.log.push("アレクが守りを固めた！");
  battle.presentationEvents.push({ type: "npcSupport", npcId: "alec", message: "アレクが守りを固めた！" });
  return battle;
}

export function applyNpcTurnEnd(battle, rng = Math.random) {
  if (!canNpcSupport({ battle, npcId: "erika", supportType: "turnEndHeal" })) return battle;
  if (battle.player.hp <= 0 || battle.player.hp >= battle.player.maxHp) return battle;
  const stage = getGrowthStage(battle.player, "erika");
  const stage10 = NPC_ADVANCED_GROWTH.erika.stage10;
  if (stage >= 10 && !battle.npcGoldenWheatUsed && battle.player.hp <= battle.player.maxHp * stage10.hpThresholdRate) {
    battle.npcGoldenWheatUsed = true;
    const amount = Math.min(battle.player.maxHp - battle.player.hp,
      Math.max(1, Math.floor(battle.player.maxHp * stage10.healMaxHpRate)));
    battle.player.hp += amount;
    battle.player.statuses = cureNpcPrayerStatuses(battle.player.statuses, { all: true });
    battle.player.condition = getNpcCondition(battle.player.statuses);
    const message = `エリカの「${stage10.name}」！ HPが${amount}回復し、状態異常が消え去った！`;
    battle.log.push(message);
    battle.presentationEvents.push({ type: "healing", npcId: "erika", actorSide: "npc", targetSide: "player",
      amount, actionName: stage10.name, message });
    return battle;
  }
  const config = NPC_SUPPORT_BALANCE.erika;
  const requested = Math.max(1, Math.floor(battle.player.maxHp * (config.healRate + stage * config.healPerStage)));
  const amount = Math.min(requested, battle.player.maxHp - battle.player.hp);
  battle.player.hp += amount;
  const message = `エリカの祈り！ HPが${amount}回復した！`;
  battle.log.push(message);
  battle.presentationEvents.push({ type: "healing", npcId: "erika", actorSide: "npc", targetSide: "player", amount, message });
  if (stage >= 7 && Number(rng()) < NPC_ADVANCED_GROWTH.erika.stage7.cureRate) {
    const before = battle.player.statuses?.length || 0;
    battle.player.statuses = cureNpcPrayerStatuses(battle.player.statuses);
    if ((battle.player.statuses?.length || 0) < before) {
      battle.player.condition = getNpcCondition(battle.player.statuses);
      battle.log.push("エリカの祈りが状態異常を浄化した！");
      battle.presentationEvents.push({ type: "npcSupport", npcId: "erika", message: "状態異常が浄化された！" });
    }
  }
  return battle;
}

function applyRebeccaSupport(battle, rng) {
  const stage = getGrowthStage(battle.player, "rebecca");
  const definition = getNpcDefinition("rebecca");
  const config = NPC_SUPPORT_BALANCE.rebecca;
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.rebecca.stage7 : null;
  const attack = Number(definition?.baseStats?.atk) + stage * config.growthAttack;
  const damage = Math.max(1, Math.floor(attack * config.hitRate));
  battle.log.push("レベッカの連続攻撃！");
  for (let hitIndex = 0; hitIndex < 2 && !battle.outcome; hitIndex += 1) {
    applyNpcDamage(battle, { npcId: "rebecca", damage, message: `${hitIndex + 1}撃目：${damage}ダメージ！`, hitIndex, hitCount: 2, rng });
  }
  if (!battle.outcome && Number(rng()) < (stage7?.debuffRate ?? config.debuffRate)) {
    battle.enemy.statuses = [
      ...(battle.enemy.statuses || []).filter(status => (status.id || status.statusId) !== "npc_defense_down"),
      { id: "npc_defense_down", statusId: "npc_defense_down", active: true,
        remainingTurns: stage7?.debuffTurns ?? config.debuffTurns, skipInitialDecrement: true,
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
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.johan.stage7 : null;
  const intelligence = Number(definition?.baseStats?.int) + stage * config.growthInt;
  const result = resolveSpell({
    attacker: { int: intelligence },
    defender: battle.enemy,
    spell: { id: "npc_johan_arcane", element: config.element, spellPower: config.basePower,
      powerMultiplier: config.spellRate * (stage7?.spellDamageMultiplier || 1) },
    rng
  });
  const damage = Math.max(0, Math.floor(result.totalDamage || result.hits?.[0]?.damage || 0));
  applyNpcDamage(battle, { npcId: "johan", damage, message: `ヨハンが攻撃呪文を放った！ ${damage}ダメージ！` });
  if (stage7 && !battle.outcome && Number(rng()) < stage7.debuffRate) {
    battle.enemy.statuses = [
      ...(battle.enemy.statuses || []).filter(status => (status.id || status.statusId) !== "npc_johan_magic_exposure"),
      { id: "npc_johan_magic_exposure", statusId: "npc_johan_magic_exposure", active: true,
        remainingTurns: stage7.debuffTurns, skipInitialDecrement: true,
        magicDamageTakenBonus: stage7.magicDamageTakenBonus, expiresAfterBattle: true }
    ];
    battle.log.push("敵の呪文耐性が低下した！");
    battle.presentationEvents.push({ type: "npcSupport", npcId: "johan", message: "敵の呪文耐性が低下した！" });
  }
}

function applyAlecChargeSkill(battle, config, rng) {
  const stage = getGrowthStage(battle.player, "alec");
  const support = NPC_SUPPORT_BALANCE.alec;
  const attack = Number(getNpcDefinition("alec")?.baseStats?.atk) + stage * support.growthAttack;
  const stage7 = stage >= 7 ? NPC_ADVANCED_GROWTH.alec.stage7 : null;
  const upgrade = stage >= 8 ? NPC_ADVANCED_GROWTH.alec.stage8 : null;
  const normalDamage = Math.max(1, Math.floor(attack * support.attackRate * (stage7?.attackMultiplier || 1)));
  const damage = Math.max(1, Math.floor(normalDamage * (upgrade?.damageMultiplier || config.damageMultiplier)));
  const actionName = upgrade?.name || config.name;
  applyNpcDamage(battle, { npcId: "alec", damage, actionName, message: `${actionName}！ ${damage}ダメージ！`, rng });
  if (upgrade && !battle.outcome) {
    battle.enemy.statuses = [
      ...(battle.enemy.statuses || []).filter(status => (status.id || status.statusId) !== "npc_alec_defense_down"),
      { id: "npc_alec_defense_down", statusId: "npc_alec_defense_down", active: true,
        remainingTurns: upgrade.defenseDownTurns, skipInitialDecrement: true,
        defenseMultiplier: upgrade.defenseMultiplier, expiresAfterBattle: true }
    ];
    battle.log.push("敵の防御力が低下した！");
  }
}

function applyRebeccaChargeSkill(battle, config, rng) {
  const stage = getGrowthStage(battle.player, "rebecca");
  const support = NPC_SUPPORT_BALANCE.rebecca;
  const upgrade = stage >= 8 ? NPC_ADVANCED_GROWTH.rebecca.stage8 : null;
  const attack = Number(getNpcDefinition("rebecca")?.baseStats?.atk) + stage * support.growthAttack;
  const normalHitDamage = Math.max(1, Math.floor(attack * support.hitRate));
  const damage = Math.max(1, Math.floor(normalHitDamage * config.damageMultiplier * (upgrade?.defensePierceDamageMultiplier || 1)));
  const actionName = upgrade?.name || config.name;
  for (let hitIndex = 0; hitIndex < config.hitCount && !battle.outcome; hitIndex += 1) {
    applyNpcDamage(battle, {
      npcId: "rebecca",
      damage,
      actionName,
      message: `${hitIndex + 1}撃目：${damage}ダメージ！`,
      hitIndex,
      hitCount: config.hitCount,
      rng
    });
  }
}

function applyErikaChargeSkill(battle, config) {
  const stage = getGrowthStage(battle.player, "erika");
  const upgrade = stage >= 8 ? NPC_ADVANCED_GROWTH.erika.stage8 : null;
  if (upgrade && battle.player.hp > 0 && battle.player.hp <= battle.player.maxHp * upgrade.hpThresholdRate) {
    const amount = Math.min(battle.player.maxHp - battle.player.hp,
      Math.max(1, Math.floor(battle.player.maxHp * upgrade.healMaxHpRate)));
    battle.player.hp += amount;
    battle.player.statuses = cureNpcPrayerStatuses(battle.player.statuses, { all: true, chargeCure: true });
    battle.player.condition = getNpcCondition(battle.player.statuses);
    const message = `エリカの「${upgrade.name}」！ HPが${amount}回復した！`;
    battle.log.push(message);
    battle.presentationEvents.push({ type: "healing", npcId: "erika", actorSide: "npc", targetSide: "player",
      amount, actionName: upgrade.name, message });
    return;
  }
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
  const stage = getGrowthStage(battle.player, "johan");
  const upgrade = stage >= 8 ? NPC_ADVANCED_GROWTH.johan.stage8 : null;
  battle.player.statuses = [
    ...(battle.player.statuses || []).filter(status => (status.id || status.statusId) !== "npc_johan_wall"),
    {
      id: "npc_johan_wall",
      statusId: "npc_johan_wall",
      active: true,
      expiresAfterBattle: true,
      npcWallTurns: config.durationTurns,
      npcWallDamageThresholdRate: upgrade?.damageThresholdRate || config.damageThresholdRate,
      npcWallStrongDamageReduction: upgrade?.strongDamageReduction || 0
    }
  ];
  battle.log.push("ヨハンの壁が弱い攻撃を完全に防ぐ！");
  battle.presentationEvents.push({
    type: "npcSupport",
    npcId: "johan",
    message: upgrade
      ? "ヨハンの壁が3ターンの間、弱い攻撃を完全に防ぎ、強い攻撃も軽減する！"
      : "ヨハンの壁が3ターンの間、弱い攻撃を完全に防ぐ！"
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

function applyNpcDamage(battle, { npcId, damage, actionName = "", message, hitIndex = 0, hitCount = 1, rng = Math.random }) {
  if (battle.outcome || battle.enemy.hp <= 0) return 0;
  const hpBefore = battle.enemy.hp;
  const actual = Math.min(battle.enemy.hp, Math.max(0, Math.floor(damage)));
  battle.enemy.hp -= actual;
  const stage = getGrowthStage(battle.player, npcId);
  const passive = getNpcStagePassive(npcId, stage);
  const instantDeath = battle.enemy.hp > 0 && passive?.instantDeathRate
    ? resolveInstantDeath({ defender: battle.enemy, baseRate: passive.instantDeathRate,
      minimumRate: passive.instantDeathRate, maximumRate: passive.instantDeathRate, rng })
    : { success: false };
  let advancedDamage = 0;
  let advancedMessage = "";
  if (battle.enemy.hp > 0 && instantDeath.immune && stage >= 9 && Number(rng()) < passive.instantDeathRate) {
    if (npcId === "alec") {
      advancedDamage = Math.min(battle.enemy.hp,
        Math.max(1, Math.floor(actual * (NPC_ADVANCED_GROWTH.alec.stage9.immuneDamageMultiplier - 1))));
      advancedMessage = `${NPC_ADVANCED_GROWTH.alec.stage9.name}が敵を深く斬り裂いた！`;
    } else if (npcId === "rebecca") {
      const upgrade = NPC_ADVANCED_GROWTH.rebecca.stage9;
      const requested = Math.max(1, Math.floor(battle.enemy.hp * upgrade.immuneCurrentHpDamageRate));
      advancedDamage = Math.min(battle.enemy.hp, battle.enemy.isBoss
        ? Math.min(requested, upgrade.bossDamageMaximum)
        : requested);
      advancedMessage = `${upgrade.name}が敵の急所を抉った！`;
    }
    battle.enemy.hp -= advancedDamage;
  }
  if (instantDeath.success) battle.enemy.hp = 0;
  battle.enemy.alive = battle.enemy.hp > 0;
  const resolvedMessage = instantDeath.success
    ? `${message} ${passive.name}が敵を断ち切った！`
    : advancedDamage > 0 ? `${message} ${advancedMessage} 追加${advancedDamage}ダメージ！` : message;
  battle.log.push(resolvedMessage);
  const targetIndex = Array.isArray(battle.enemies) ? battle.enemies.indexOf(battle.enemy) : -1;
  battle.presentationEvents.push({ type: "attackHit", npcId, actorName: getNpcDefinition(npcId)?.name,
    actorSide: "npc", targetSide: "enemy", actionName, hitIndex, hitCount, hit: true,
    ...(targetIndex < 0 ? {} : { targetIndex }),
    damage: instantDeath.success ? hpBefore : actual + advancedDamage,
    slashExecution: instantDeath.success, passiveExecutionId: instantDeath.success ? passive.id : advancedDamage > 0 ? `${passive.id}_advanced` : null,
    message: resolvedMessage });
  if (battle.enemy.hp <= 0) setNpcVictory(battle);
  return actual;
}

function setNpcVictory(battle) {
  battle.enemy.hp = 0;
  battle.enemy.alive = false;
  if (Array.isArray(battle.enemies) && battle.enemies.some(enemy => enemy.alive && enemy.hp > 0)) return;
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

function cureNpcPrayerStatuses(statuses = [], { all = false, chargeCure = false } = {}) {
  const curable = new Set(["poison", "deadly_poison", "bleeding", ...(all && !chargeCure ? ["action_skip", "electrified"] : [])]);
  let cured = false;
  return (statuses || []).filter(status => {
    const matches = curable.has(status.id || status.statusId);
    if (!matches || (!all && cured)) return true;
    cured = true;
    return false;
  });
}

function getNpcCondition(statuses = []) {
  if (statuses.some(status => (status.id || status.statusId) === "bleeding")) return "BLEED";
  if (statuses.some(status => ["poison", "deadly_poison"].includes(status.id || status.statusId))) return "POISON";
  return "GOOD";
}
