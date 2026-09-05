import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { collectCardStatBonuses } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getSkill } from "../data/skills.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";
import {
  createEnemyCombatant,
  getEnemyById
} from "../data/enemies.js";
import {
  equipInstance,
  grantEquipmentInstance
} from "../data/equipment-inventory.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import { normalizeNpcSystem } from "../data/npc-party.js";

const JOBS = Object.freeze(["warrior", "thief", "priest", "mage"]);
const SEEDS = Object.freeze([6061, 7073, 8087, 9091, 9901]);
const STANDARD_DECK = Object.freeze([
  "sr_ability_boost",
  "sr_ability_boost",
  "sr_ability_boost",
  "common_follow_up",
  "common_guard_stone",
  "rare_mana_recovery"
]);

const DEEP_GEAR = Object.freeze({
  warrior: Object.freeze(["blacksteel_longsword", "blacksteel_greatshield", "blacksteel_helmet", "blacksteel_heavy_armor", "blacksteel_greaves", "masters_necklace"]),
  thief: Object.freeze(["abyss_fang", "abyss_tiger_buckler", "abyss_tiger_hood", "abyss_tiger_light_armor", "abyss_tiger_boots", "masters_necklace"]),
  priest: Object.freeze(["sacred_tree_mace", "sacred_tree_shield", "sacred_tree_mitre", "sacred_tree_vestment", "sacred_tree_shoes", "grain_choker"]),
  mage: Object.freeze(["ancient_tree_staff", "abyss_hat", "abyss_robe", "abyss_shoes", "mana_amplifier"])
});

const CRYSTAL_GEAR = Object.freeze({
  warrior: Object.freeze(["crystal_warhammer", "amethyst_helmet", "amethyst_plate", "amethyst_greaves", "masters_necklace"]),
  thief: Object.freeze(["resonant_katar", "phantom_crystal_buckler", "phantom_crystal_hood", "phantom_crystal_armor", "phantom_crystal_boots", "masters_necklace"]),
  priest: Object.freeze(["amethyst_flail", "white_crystal_shield", "white_crystal_mitre", "white_crystal_vestment", "white_crystal_shoes", "grain_choker"]),
  mage: Object.freeze(["resonance_staff", "astral_crystal_hat", "astral_crystal_robe", "astral_crystal_shoes", "mana_amplifier"])
});

export const DEEP_BATTLE_SCENARIOS = Object.freeze([
  scenario("B60", 65, ["abyss_giant_scorpion"], 8),
  scenario("B60", 65, ["cobra_gator"], 8),
  scenario("B60", 65, ["abyss_lizard", "abyss_lizard", "abyss_lizard"], 15),
  scenario("B70", 75, ["abgrund_krabbe"], 8),
  scenario("B70", 75, ["abyss_giant_catfish"], 12),
  scenario("B70", 75, ["abyss_piranha", "abyss_piranha", "abyss_piranha"], 15),
  scenario("B70", 75, ["abyss_piranha", "abyss_piranha", "abgrund_krabbe"], 15),
  scenario("B80", 85, ["amethyst_golem"], 12),
  scenario("B80", 85, ["crystal_mimic"], 12),
  scenario("B80", 85, ["abyss_crystal_beetle", "abyss_crystal_beetle", "abyss_crystal_beetle"], 15),
  scenario("B80", 85, ["abyss_crystal_beetle", "abyss_crystal_beetle", "crystal_mimic"], 15),
  scenario("B90", 95, ["wraith"], 12),
  scenario("B90", 95, ["schleipnir"], 12),
  scenario("B90", 95, ["sensenmann", "sensenmann"], 15)
]);

export function runDeepBattlePacingMatrix({ seeds = SEEDS } = {}) {
  const rows = [];
  for (const scenarioDefinition of DEEP_BATTLE_SCENARIOS) {
    for (const job of JOBS) {
      for (const withNpcs of [true, false]) {
        const runs = seeds.map(seed => simulateBattle({ scenario: scenarioDefinition, job, seed, withNpcs }));
        const victories = runs.filter(run => run.outcome === "victory");
        rows.push({
          band: scenarioDefinition.band,
          level: scenarioDefinition.level,
          enemies: scenarioDefinition.enemyIds.join("+"),
          category: scenarioDefinition.category,
          targetMaximum: scenarioDefinition.targetMaximum,
          job,
          party: withNpcs ? "Alec+Rebecca+Erika" : "solo",
          npcStage: withNpcs ? Math.floor(Number(scenarioDefinition.band.slice(1)) / 10) : 0,
          seeds: [...seeds],
          victories: victories.length,
          defeats: runs.length - victories.length,
          actions: runs.map(run => run.actions),
          averageActions: victories.length
            ? Number((victories.reduce((sum, run) => sum + run.actions, 0) / victories.length).toFixed(1))
            : null,
          maximumActions: victories.length ? Math.max(...victories.map(run => run.actions)) : null
        });
      }
    }
  }
  return rows;
}

export function createPacingCharacter({ job, level, band, withNpcs }) {
  let character = createInitialCharacter({ name: `PACE-${job}`, job });
  const ownedCardCounts = {
    sr_ability_boost: 3,
    common_follow_up: 1,
    common_guard_stone: 1,
    rare_mana_recovery: 1
  };
  character = normalizeCharacter({
    ...character,
    level,
    highestDungeonDepthReached: Number(band.slice(1)),
    cards: { ownedCardIds: Object.keys(ownedCardCounts), ownedCardCounts, deckSlots: [...STANDARD_DECK] },
    npcSystem: withNpcs ? makeNpcSystem(Number(band.slice(1))) : normalizeNpcSystem()
  });
  const gear = Number(band.slice(1)) >= 80 ? CRYSTAL_GEAR[job] : DEEP_GEAR[job];
  for (const equipmentId of gear) {
    const slot = equipmentSlot(equipmentId);
    const granted = grantEquipmentInstance(character, equipmentId, slot, { enhancement: 3 });
    if (!granted.accepted) throw new Error(`Unable to grant ${equipmentId} to ${job}`);
    const equipped = equipInstance(granted.character, slot, granted.instance.instanceId);
    if (!equipped.accepted) throw new Error(`Unable to equip ${equipmentId} to ${job}: ${equipped.reason}`);
    character = equipped.character;
  }
  character = normalizeCharacter(character);
  character.inventory = grantItem(character.inventory, "strong_healing_potion_small", 20).inventory;
  character.inventory = grantItem(character.inventory, "strong_antidote", 10).inventory;
  character.cardStatBonuses = collectCardStatBonuses(character.cards.deckSlots);
  character.hp = character.maxHp;
  character.sp = character.maxSp;
  return character;
}

function simulateBattle({ scenario: scenarioDefinition, job, seed, withNpcs }) {
  const character = createPacingCharacter({
    job,
    level: scenarioDefinition.level,
    band: scenarioDefinition.band,
    withNpcs
  });
  const enemies = scenarioDefinition.enemyIds.map(id => createEnemyCombatant(getEnemyById(id)));
  let battle = createBattleState({
    character,
    enemy: enemies[0],
    ...(enemies.length > 1 ? { enemies, targetIndex: 0 } : {})
  });
  const rng = mulberry32(seed);
  let actions = 0;
  while (!battle.outcome && actions < 60) {
    const command = chooseCommand(battle, job);
    const resolved = resolveBattleRound({ battle, playerCommand: command, rng });
    if (!resolved.accepted) throw new Error(`${job} command rejected: ${resolved.reason}`);
    battle = resolved.battle;
    actions += 1;
  }
  return { outcome: battle.outcome || "timeout", actions, hp: battle.player.hp, sp: battle.player.sp };
}

function chooseCommand(battle, job) {
  const multi = Array.isArray(battle.enemies) && battle.enemies.filter(enemy => enemy.alive && enemy.hp > 0).length > 1;
  const hasDeadlyPoison = battle.player.statuses?.some(status =>
    ["deadly_poison", "severe_poison"].includes(status.id || status.statusId) && status.active !== false
  );
  if (hasDeadlyPoison && getItemCount(battle.player.inventory, "strong_antidote") > 0) {
    return { type: "item", itemId: "strong_antidote" };
  }
  const healingThreshold = job === "mage" && multi ? 0.65 : 0.45;
  if (battle.player.hp <= battle.player.maxHp * healingThreshold
    && getItemCount(battle.player.inventory, "strong_healing_potion_small") > 0) {
    return { type: "item", itemId: "strong_healing_potion_small" };
  }
  const targetIndex = multi ? battle.enemies.findIndex(enemy => enemy.alive && enemy.hp > 0) : 0;
  const target = multi ? battle.enemies[targetIndex] : battle.enemy;
  const hasMagicWall = battle.player.statuses?.some(status =>
    (status.id || status.statusId) === "magic_wall" && status.active !== false
  );
  if (job === "mage" && multi && !hasMagicWall) {
    return skillOrAttack(battle.player, "magic_wall", targetIndex);
  }
  if (multi) {
    if (job === "warrior") return skillOrAttack(battle.player, "wide_swing", targetIndex);
    if (job === "thief") return skillOrAttack(battle.player, "blade_dance", targetIndex);
    if (job === "mage") return skillOrAttack(battle.player, "flame_sweep", targetIndex);
  }
  if (job === "warrior") {
    const hasBreak = target.statuses?.some(status => (status.id || status.statusId) === "armor_break" && status.active !== false);
    return skillOrAttack(battle.player, hasBreak ? "power_strike" : "crushing_break", targetIndex);
  }
  if (job === "thief") return skillOrAttack(battle.player, "gale_blades", targetIndex);
  if (job === "priest") {
    return skillOrAttack(battle.player, target.race === "undead" ? "holy_light" : "holy_strike", targetIndex);
  }
  return skillOrAttack(battle.player, bestMageSkill(target), targetIndex);
}

function skillOrAttack(player, skillId, targetIndex) {
  const skill = getSkill(skillId);
  return getEffectiveSpCost(skill, player) <= player.sp
    ? { type: "skill", skillId, targetIndex }
    : { type: "attack", targetIndex };
}

function bestMageSkill(target) {
  const multipliers = target?.elementMultipliers || {};
  const candidates = [
    ["fireball", 10, multipliers.fire ?? 1],
    ["ice_bind", 6.4, multipliers.ice ?? 1],
    ["lightning_bolt", 18, multipliers.lightning ?? 1]
  ];
  return candidates.sort((left, right) => right[1] * right[2] - left[1] * left[2])[0][0];
}

function makeNpcSystem(depth) {
  const stage = Math.max(0, Math.min(10, Math.floor(depth / 10)));
  return normalizeNpcSystem({
    registeredIds: ["alec", "rebecca", "erika"],
    activeIds: ["alec", "rebecca", "erika"],
    records: Object.fromEntries(["alec", "rebecca", "erika"].map(id => [
      id,
      { maxDepth: depth, growthStage: stage, charge: 0, chargeCooldown: 0 }
    ]))
  });
}

function equipmentSlot(id) {
  if (/longsword|fang$|mace$|staff$|warhammer|katar|flail/.test(id)) return "rightArmId";
  if (/shield|buckler|aegis|grimoire/.test(id)) return "leftArmId";
  if (/helmet|hood|mitre|hat/.test(id)) return "headId";
  if (/armor|plate|robe|vestment/.test(id)) return "bodyId";
  if (/greaves|boots|shoes/.test(id)) return "footId";
  return "accessoryId";
}

function scenario(band, level, enemyIds, targetMaximum) {
  const totalHp = enemyIds.reduce((sum, id) => sum + (getEnemyById(id)?.maxHp || 0), 0);
  return Object.freeze({
    band,
    level,
    enemyIds: Object.freeze(enemyIds),
    category: enemyIds.length > 1 ? "formation" : totalHp >= 800 ? "large" : "standard",
    targetMaximum
  });
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = value + 0x6D2B79F5 | 0;
    let result = Math.imul(value ^ value >>> 15, 1 | value);
    result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  console.table(runDeepBattlePacingMatrix().map(row => ({
    band: row.band,
    enemies: row.enemies,
    job: row.job,
    party: row.party,
    record: `${row.victories}W/${row.defeats}L`,
    actions: row.actions.join("/"),
    average: row.averageActions,
    maximum: row.maximumActions,
    target: row.targetMaximum
  })));
}
