import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getDeckCostAtLevel, getExperienceForLevel } from "../data/growth.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { cells, buildBoundaryWallMap, getStartPosition, randomizeStartPosition } from "../js/dungeon.js";
import { DIRS } from "../js/config.js";
import { collectStats } from "../combat/collect-stats.js";
import { createBattleState, resolveBattleRound, resolveEnemyAmbush } from "../combat/battle-engine.js";
import { resolveSurprise } from "../combat/resolve-environment-save.js";
import { createEnemyCombatant, getRandomEnemy } from "../data/enemies.js";
import { rollEnemyDrop, rollEnhancement, rollRedChestGold } from "../data/loot.js";
import { resolveTreasureTrap } from "../combat/resolve-trap.js";
import { addLootEquipment, addLootGold, addLootItem, createInitialLootBag } from "../data/inventory.js";

const RUNS = Math.max(1, Math.floor(Number(process.argv[2]) || 100));
const BASE_SEED = Math.floor(Number(process.argv[3]) || 0x4e444131);
const CARD_IDS = [
  "common_strength_up", "common_hp_up", "common_lucky_charm",
  "common_gale_feather", "common_sp_up", "common_goddess_grace"
];
const PROPOSED_STILETTO_RATES = Object.freeze([0.75, 0.18, 0.06, 0.01]);

const totals = {
  runs: RUNS, seed: BASE_SEED, returned: 0, defeated: 0, defeatsDuringReturn: 0,
  lowResourceReturns: 0, battles: 0, victories: 0, ambushes: 0, turns: 0,
  steps: 0, exploredCells: 0, chests: 0, experience: 0,
  enemies: {}, loot: { gold: 0, items: {}, equipment: { stiletto: [0, 0, 0, 0] } },
  remainingHp: [], remainingSp: [], runDetails: []
};
totals.redChestProfile = {
  gold: 0.55,
  healingPotion: 0.2,
  antidote: 0.13,
  stiletto: 0.12,
  stilettoEnhancement: [...PROPOSED_STILETTO_RATES]
};
const profileCharacter = makeLevel10Thief();
totals.profile = {
  level: profileCharacter.level, hp: profileCharacter.maxHp, sp: profileCharacter.maxSp,
  deckCost: profileCharacter.deckCost, stats: collectStats(profileCharacter),
  deck: [...profileCharacter.cards.deckSlots]
};

for (let runIndex = 0; runIndex < RUNS; runIndex += 1) {
  const rng = mulberry32((BASE_SEED + Math.imul(runIndex + 1, 0x9e3779b9)) >>> 0);
  const originalRandom = Math.random;
  Math.random = rng;
  const result = simulateRun(rng, runIndex + 1);
  Math.random = originalRandom;
  accumulate(result);
}

totals.averageSteps = round(totals.steps / RUNS);
totals.averageBattles = round(totals.battles / RUNS);
totals.averageExploredCells = round(totals.exploredCells / RUNS);
totals.averageRemainingHp = round(average(totals.remainingHp));
totals.averageRemainingSp = round(average(totals.remainingSp));
totals.minRemainingHp = Math.min(...totals.remainingHp);
totals.minRemainingSp = Math.min(...totals.remainingSp);
delete totals.remainingHp;
delete totals.remainingSp;
console.log(JSON.stringify(totals, null, 2));

function simulateRun(rng, runNumber) {
  let character = makeLevel10Thief();
  character.lootBag = createInitialLootBag();
  randomizeStartPosition();
  buildBoundaryWallMap(1, rng);
  const start = getStartPosition();
  let position = { ...start };
  let torch = 100;
  let presence = 0;
  let returning = false;
  let returnReason = "";
  let defeated = false;
  let defeatedDuringReturn = false;
  const visited = new Set([key(position)]);
  const opened = new Set();
  const routeStack = [{ ...position }];
  const stats = { battles: 0, victories: 0, ambushes: 0, turns: 0, steps: 0, chests: 0, experience: 0, enemies: {} };

  openChestIfPresent();
  while (!defeated && stats.steps < 1500) {
    if (!returning && isLow(character)) {
      returning = true;
      returnReason = "lowResource";
    }
    if (returning && same(position, start)) break;

    let next;
    if (returning) {
      const path = shortestVisitedPath(position, start, visited);
      if (path.length < 2) break;
      next = path[1];
    } else {
      const candidates = neighbors(position).filter(cell => !visited.has(key(cell)));
      if (candidates.length) {
        next = candidates[Math.floor(rng() * candidates.length)];
        routeStack.push(next);
      } else {
        routeStack.pop();
        next = routeStack.at(-1);
        if (!next) {
          const exits = neighbors(position);
          next = exits[Math.floor(rng() * exits.length)];
          routeStack.push({ ...position }, next);
        }
      }
    }

    position = { ...next };
    visited.add(key(position));
    stats.steps += 1;
    torch = Math.max(0, torch - 1);
    applyExplorationPoison();
    openChestIfPresent();
    presence += randomInt(rng, torch <= 0 ? 5 : 4, torch <= 0 ? 10 : 8);
    if (presence >= 100) {
      presence = 0;
      fightEncounter();
    }
  }

  return {
    run: runNumber, returned: !defeated && same(position, start), defeated, defeatedDuringReturn,
    returnReason: defeated ? "defeat" : returnReason || "safetyLimit",
    hp: Math.max(0, character.hp), maxHp: character.maxHp,
    sp: Math.max(0, character.sp), maxSp: character.maxSp,
    exploredCells: visited.size, lootBag: character.lootBag, ...stats
  };

  function fightEncounter() {
    const enemy = createEnemyCombatant(getRandomEnemy({ depth: 1, rng }));
    stats.battles += 1;
    stats.enemies[enemy.id] = (stats.enemies[enemy.id] || 0) + 1;
    let battle = createBattleState({ character, enemy });
    const playerStats = collectStats(character);
    const surprise = resolveSurprise({
      player: { ...playerStats, surpriseResistance: playerStats.surpriseResistance || 0 },
      enemyBaseRate: enemy.surpriseRate, enemyMaximum: enemy.surpriseRateMaximum,
      forceAmbush: torch <= 0, rng
    });
    if (surprise.ambush) {
      stats.ambushes += 1;
      battle = resolveEnemyAmbush({ battle, rng }).battle;
    }
    while (!battle.outcome && stats.turns < 10000) {
      const command = battle.player.sp >= 5
        ? { type: "skill", skillId: "poison_blade" }
        : { type: "attack" };
      const round = resolveBattleRound({ battle, playerCommand: command, rng });
      if (!round.accepted) throw new Error(`Battle command rejected: ${round.reason}`);
      battle = round.battle;
      stats.turns += 1;
    }
    character = { ...character, hp: battle.player.hp, sp: battle.player.sp, statuses: battle.player.statuses, alive: battle.player.alive };
    if (battle.outcome === "defeat") {
      defeated = true;
      defeatedDuringReturn = returning;
      return;
    }
    stats.victories += 1;
    stats.experience += Math.max(0, enemy.experienceReward || 0);
    addDrop(rollEnemyDrop(enemy, rng));
  }

  function openChestIfPresent() {
    const cell = cells[position.y][position.x];
    if (cell.treasure !== "red" || opened.has(key(position))) return;
    opened.add(key(position));
    stats.chests += 1;
    character = resolveTreasureTrap({ character, treasureType: "red", trapId: cell.treasureTrapId, rng }).character;
    addDrop(rollProposedRedChestLoot(rng));
  }

  function addDrop(drop) {
    if (!drop || drop.kind === "none") return;
    if (drop.kind === "redChest") return addDrop(rollProposedRedChestLoot(rng));
    if (drop.kind === "gold") character.lootBag = addLootGold(character.lootBag, drop.amount).lootBag;
    if (drop.kind === "item") character.lootBag = addLootItem(character.lootBag, drop.itemId, drop.amount || 1).lootBag;
    if (drop.kind === "equipment") character.lootBag = addLootEquipment(character.lootBag, drop).lootBag;
  }

  function applyExplorationPoison() {
    if (!(character.statuses || []).some(status => (status.statusId || status.id) === "poison")) return;
    character.hp = Math.max(1, character.hp - 1);
  }
}

function rollProposedRedChestLoot(rng) {
  const roll = rng();
  if (roll < 0.55) return { kind: "gold", amount: rollRedChestGold(rng) };
  if (roll < 0.75) {
    return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  }
  if (roll < 0.88) {
    return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  }
  return {
    kind: "equipment",
    equipmentId: "stiletto",
    slot: "rightArmId",
    enhancement: rollEnhancement(PROPOSED_STILETTO_RATES, rng),
    unidentifiedName: "？短剣"
  };
}

function makeLevel10Thief() {
  let character = createInitialCharacter({ name: "SIM_THIEF", job: "thief" });
  character.level = 10;
  character.experience = getExperienceForLevel(10);
  character.deckCost = getDeckCostAtLevel(10);
  CARD_IDS.forEach(cardId => { character.cards = grantCard(character.cards, cardId, 1, character.deckCost).cards; });
  CARD_IDS.forEach((cardId, index) => { character.cards = setDeckSlot(character.cards, index, cardId, character.deckCost); });
  character = normalizeCharacter(character);
  character.hp = character.maxHp;
  character.sp = character.maxSp;
  return character;
}

function isLow(character) {
  return character.hp <= character.maxHp * 0.1 || character.sp <= character.maxSp * 0.1;
}

function neighbors(position) {
  const result = [];
  for (const dir of DIRS) {
    const x = position.x + dir.dx;
    const y = position.y + dir.dy;
    if (!cells[y]?.[x] || cells[y][x].npc) continue;
    const source = cells[position.y][position.x];
    if (source.walls[dir.key] && source.doorKinds[dir.key] !== "normal") continue;
    result.push({ x, y });
  }
  return result;
}

function shortestVisitedPath(from, to, visited) {
  const queue = [{ ...from }];
  const parent = new Map([[key(from), null]]);
  while (queue.length) {
    const current = queue.shift();
    if (same(current, to)) break;
    for (const next of neighbors(current)) {
      if (!visited.has(key(next)) || parent.has(key(next))) continue;
      parent.set(key(next), current);
      queue.push(next);
    }
  }
  if (!parent.has(key(to))) return [];
  const path = [];
  for (let current = to; current; current = parent.get(key(current))) path.push(current);
  return path.reverse();
}

function accumulate(result) {
  totals.returned += Number(result.returned);
  totals.defeated += Number(result.defeated);
  totals.defeatsDuringReturn += Number(result.defeatedDuringReturn);
  totals.lowResourceReturns += Number(result.returnReason === "lowResource");
  for (const keyName of ["battles", "victories", "ambushes", "turns", "steps", "exploredCells", "chests", "experience"]) totals[keyName] += result[keyName];
  totals.remainingHp.push(result.hp);
  totals.remainingSp.push(result.sp);
  for (const [id, count] of Object.entries(result.enemies)) totals.enemies[id] = (totals.enemies[id] || 0) + count;
  totals.loot.gold += result.lootBag.gold;
  for (const [id, count] of Object.entries(result.lootBag.items)) totals.loot.items[id] = (totals.loot.items[id] || 0) + count;
  for (const instance of result.lootBag.equipmentInstances) {
    if (instance.equipmentId === "stiletto") totals.loot.equipment.stiletto[instance.enhancement || 0] += 1;
  }
  totals.runDetails.push({ run: result.run, result: result.returnReason, hp: `${result.hp}/${result.maxHp}`, sp: `${result.sp}/${result.maxSp}`, battles: result.battles, steps: result.steps, explored: result.exploredCells });
}

function key(cell) { return `${cell.x},${cell.y}`; }
function same(a, b) { return a.x === b.x && a.y === b.y; }
function randomInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function average(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }
function round(value) { return Math.round(value * 100) / 100; }
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
