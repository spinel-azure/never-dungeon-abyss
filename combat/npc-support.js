import { NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";
import { resolveSpell } from "./resolve-spell.js";

export const NPC_SUPPORT_BALANCE = Object.freeze({
  alec: Object.freeze({ attackRate: 0.3, growthAttack: 2, guardBase: 0.08, guardPerStage: 0.01, guardMaximum: 0.18 }),
  rebecca: Object.freeze({ hitRate: 0.175, growthAttack: 2, debuffRate: 0.15, debuffTurns: 2, defenseMultiplier: 0.85 }),
  erika: Object.freeze({ healRate: 0.04, healPerStage: 0.002 }),
  johan: Object.freeze({ basePower: 8, spellRate: 0.3, growthInt: 3, element: "arcane" })
});

export function canNpcSupport({ battle, npcId, supportType } = {}) {
  if (!NPC_SUPPORT_ENABLED || battle?.outcome || !npcId || !supportType) return false;
  return getActiveNpcIds(battle.player).includes(npcId);
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

function applyNpcDamage(battle, { npcId, damage, message, hitIndex = 0, hitCount = 1 }) {
  if (battle.outcome || battle.enemy.hp <= 0) return 0;
  const actual = Math.min(battle.enemy.hp, Math.max(0, Math.floor(damage)));
  battle.enemy.hp -= actual;
  battle.enemy.alive = battle.enemy.hp > 0;
  battle.log.push(message);
  battle.presentationEvents.push({ type: "attackHit", npcId, actorName: getNpcDefinition(npcId)?.name,
    actorSide: "npc", targetSide: "enemy", hitIndex, hitCount, hit: true, damage: actual, message });
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
