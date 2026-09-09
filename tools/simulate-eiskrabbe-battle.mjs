import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { createBossCombatant } from "../data/bosses.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";
import { getSkill } from "../data/skills.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import { createPacingCharacter } from "./simulate-deep-normal-enemy-battles.mjs";

const JOBS = Object.freeze(["warrior", "thief", "priest", "mage"]);
const SEEDS = Object.freeze([4701, 4703, 4709, 4721, 4723]);

export function runEiskrabbeBattleMatrix({ seeds = SEEDS } = {}) {
  return JOBS.map(job => {
    const runs = seeds.map(seed => simulate(job, seed));
    const victories = runs.filter(run => run.outcome === "victory");
    return {
      job,
      level: 65,
      equipmentBand: "B50-B59 +3",
      party: "Alec+Rebecca+Erika (growth stage 6)",
      seeds: [...seeds],
      victories: victories.length,
      defeats: runs.length - victories.length,
      actions: runs.map(run => run.actions),
      averageActions: victories.length
        ? Number((victories.reduce((sum, run) => sum + run.actions, 0) / victories.length).toFixed(1))
        : null,
      damageTaken: runs.map(run => run.damageTaken),
      stanceBreaks: runs.map(run => run.stanceBreaks),
      greatPincers: runs.map(run => run.greatPincers)
    };
  });
}

function simulate(job, seed) {
  let character = createPacingCharacter({ job, level: 65, band: "B60", withNpcs: true });
  character.cards = {
    ...character.cards,
    ownedCardIds: [...new Set([...(character.cards.ownedCardIds || []), "zodiac_libra", "zodiac_taurus", "zodiac_gemini"])],
    ownedCardCounts: {
      ...(character.cards.ownedCardCounts || {}),
      zodiac_libra: 1,
      zodiac_taurus: 1,
      zodiac_gemini: 1
    }
  };
  if (job !== "mage") character.inventory = grantItem(character.inventory, "fire_lizard_oil", 1).inventory;
  let battle = createBattleState({ character, enemy: createBossCombatant("eiskrabbe_b47f") });
  const rng = mulberry32(seed);
  let actions = 0;
  let damageTaken = 0;
  let stanceBreaks = 0;
  let greatPincers = 0;
  while (!battle.outcome && actions < 400) {
    const result = resolveBattleRound({ battle, playerCommand: chooseCommand(battle, job), rng });
    if (!result.accepted) throw new Error(`${job}: ${result.reason}`);
    battle = result.battle;
    damageTaken += battle.presentationEvents
      .filter(event => event.type === "attackHit" && event.actorSide === "enemy" && event.targetSide === "player")
      .reduce((sum, event) => sum + Math.max(0, Number(event.damage) || 0), 0);
    stanceBreaks += battle.log.filter(message => message.includes("反撃の構えが崩れた")).length;
    greatPincers += battle.log.filter(message => message.includes("反撃の大鋏！")).length;
    actions += 1;
  }
  return {
    outcome: battle.outcome || "timeout",
    actions,
    damageTaken,
    stanceBreaks,
    greatPincers
  };
}

function chooseCommand(battle, job) {
  if (job !== "mage" && getItemCount(battle.player.inventory, "fire_lizard_oil") > 0
    && !battle.player.statuses?.some(status => (status.id || status.statusId) === "weapon_element_imbue")) {
    return { type: "item", itemId: "fire_lizard_oil" };
  }
  if (battle.player.hp <= battle.player.maxHp * 0.45) {
    if (job === "priest") {
      const triage = affordableSkill(battle.player, "die_triage");
      if (triage) return triage;
    }
    if (getItemCount(battle.player.inventory, "strong_healing_potion_small") > 0) {
      return { type: "item", itemId: "strong_healing_potion_small" };
    }
  }
  if (job === "mage") return affordableSkill(battle.player, "fireball") || { type: "attack" };
  if (job === "warrior") {
    const armorBroken = battle.enemy.statuses?.some(status => (status.id || status.statusId) === "armor_break");
    return affordableSkill(battle.player, armorBroken ? "power_strike" : "crushing_break") || { type: "attack" };
  }
  if (job === "thief") return affordableSkill(battle.player, "gale_blades") || { type: "attack" };
  if (battle.enemy.reservedEnemyAction) return { type: "attack" };
  return affordableSkill(battle.player, "holy_strike") || { type: "attack" };
}

function affordableSkill(player, skillId) {
  const skill = getSkill(skillId);
  return skill && getEffectiveSpCost(skill, player) <= player.sp
    ? { type: "skill", skillId }
    : null;
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
  console.table(runEiskrabbeBattleMatrix().map(row => ({
    job: row.job,
    record: `${row.victories}W/${row.defeats}L`,
    actions: row.actions.join("/"),
    average: row.averageActions,
    damage: row.damageTaken.join("/"),
    breaks: row.stanceBreaks.join("/"),
    greatPincers: row.greatPincers.join("/")
  })));
}
