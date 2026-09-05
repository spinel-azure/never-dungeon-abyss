import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter } from "../data/classes.js";
import {
  EXPLORATION_OBSTACLE_MAGIC_SP_COST,
  FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR,
  GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR,
  getExplorationObstacleById,
  getExplorationObstacleForDepth,
  getExplorationObstacleRemovalOptions,
  getExplorationObstacleOilPrompt,
  resolveExplorationObstacleRemoval
} from "../data/exploration-obstacles.js";
import { getItem, getShopItemIdsForCharacter } from "../data/items.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import {
  B35F_SURVEY_QUEST_ID,
  B45F_SURVEY_QUEST_ID,
  acceptQuest,
  getQuestProgress,
  recordFloorExploration
} from "../data/quests.js";
import { DIRS, MAP_H, MAP_W, START_X, START_Y } from "../js/config.js";
import {
  buildBoundaryWallMap,
  cells,
  explored,
  getExplorationObstacleAt,
  getStartPosition,
  removeExplorationObstacleAt,
  resetAllWalls,
  setStartPosition,
  setWall,
  validateDungeonLayout
} from "../js/dungeon.js";
import { getTraversalBlockingReservations } from "../js/dungeon-feature-placement.js";
import {
  configurePlayer,
  handleOverlayEventInput,
  manualMove,
  resetPlayer,
  setPlayerInputEnabled,
  state
} from "../js/player.js";
import { findExploredPathToStart } from "../js/autoReturn.js";
import { loadGame, writeGame } from "../js/save-data.js";

function seededRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeededFloor(depth, seed = depth * 101) {
  const originalRandom = Math.random;
  const rng = seededRng(seed);
  setStartPosition(START_X, START_Y);
  Math.random = rng;
  try {
    return buildBoundaryWallMap(depth, rng, {
      blackChestsUnlocked: true,
      eventFlags: {}
    });
  } finally {
    Math.random = originalRandom;
  }
}

function placedObstacles() {
  return cells.flat().filter(cell => cell.explorationObstacleId);
}

function createObstacleCharacter(job = "warrior", sp = 20, itemId = "", amount = 0) {
  const character = createInitialCharacter({ name: "TEST", job });
  character.sp = sp;
  if (itemId && amount > 0) character.inventory = grantItem(character.inventory, itemId, amount).inventory;
  return character;
}

function prepareObstacleInteraction(character, obstacleId) {
  resetAllWalls();
  setStartPosition(1, 1);
  resetPlayer(DIRS.findIndex(direction => direction.key === "E"));
  setPlayerInputEnabled(true);
  setWall(1, 1, "E", false);
  cells[1][2].explorationObstacleId = obstacleId;
  let currentCharacter = character;
  const messages = [];
  configurePlayer({
    say: message => messages.push(message),
    playSe: () => {},
    cancelAutoReturn: () => {},
    getExplorationObstacleRemovalOptions: id => getExplorationObstacleRemovalOptions(currentCharacter, id),
    resolveExplorationObstacleRemoval: ({ obstacleId: id, x, y, method }) => {
      const result = resolveExplorationObstacleRemoval(currentCharacter, id, method);
      if (!result.accepted) return result;
      if (!removeExplorationObstacleAt(x, y)) return { accepted: false, reason: "obstacleMissing" };
      currentCharacter = result.character;
      return result;
    },
    onStateChanged: () => {}
  });
  return {
    messages,
    get character() { return currentCharacter; }
  };
}

test("Glut and Frost floors place three safe, separated exploration obstacles except survey floors", () => {
  const fireFloors = [30, 31, 32, 33, 34, 36, 37, 38, 39];
  const iceFloors = [40, 41, 42, 43, 44, 46, 47, 48, 49];
  for (const [floors, obstacleId] of [[fireFloors, "fire_pillar"], [iceFloors, "giant_ice_block"]]) {
    for (const depth of floors) {
      const report = buildSeededFloor(depth);
      const obstacles = placedObstacles();
      assert.equal(report.valid, true, `B${depth}F: ${report.errors?.join(" / ")}`);
      assert.equal(obstacles.length, 3, `B${depth}F`);
      assert.ok(obstacles.every(cell => cell.explorationObstacleId === obstacleId), `B${depth}F`);
      const start = getStartPosition();
      for (const cell of obstacles) {
        assert.equal(cell.type, "floor");
        assert.equal(cell.featureReservation?.type, "explorationObstacle");
        assert.equal(cell.reserved, "explorationObstacle");
        assert.equal(Boolean(cell.npc || cell.treasure || cell.fountain || cell.questEvent), false);
        assert.equal(Boolean(cell.bossId || cell.bossRemainsId || cell.specialRoom || cell.quicksand || cell.rapidCurrent), false);
        assert.equal(Object.values(cell.doors).some(Boolean), false);
        assert.ok(Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y) >= 3);
      }
      for (let left = 0; left < obstacles.length; left += 1) {
        for (let right = left + 1; right < obstacles.length; right += 1) {
          const distance = Math.abs(obstacles[left].x - obstacles[right].x)
            + Math.abs(obstacles[left].y - obstacles[right].y);
          assert.ok(distance >= 3, `B${depth}F obstacle spacing`);
        }
      }
      const blocking = getTraversalBlockingReservations(cells);
      assert.equal(report.reachableBeforeUnlock, MAP_W * MAP_H - blocking.length - cells.flat().filter(cell => cell.npc).length);
      assert.equal(cells.flat().filter(cell => cell.type === "stairsDown").length, 1);
    }
  }

  buildSeededFloor(FIRE_PILLAR_SURVEY_EXCLUDED_FLOOR);
  assert.equal(placedObstacles().length, 0);
  buildSeededFloor(GIANT_ICE_BLOCK_SURVEY_EXCLUDED_FLOOR);
  assert.equal(placedObstacles().length, 0);
});

test("fixed generation input reproduces obstacle coordinates and preserves B39F/B49F boss rooms", () => {
  buildSeededFloor(30, 7788);
  const first = placedObstacles().map(cell => `${cell.x},${cell.y}`).sort();
  buildSeededFloor(30, 7788);
  assert.deepEqual(placedObstacles().map(cell => `${cell.x},${cell.y}`).sort(), first);
  for (const depth of [39, 49]) {
    buildSeededFloor(depth, 9900 + depth);
    assert.equal(validateDungeonLayout({ depth, progress: { eventFlags: {} } }).valid, true);
    assert.ok(cells.flat().some(cell => cell.featureReservation?.id === `boss_room_b${depth}f`));
    assert.equal(placedObstacles().some(cell => cell.featureReservation?.type === "bossRoom"), false);
  }
});

test("obstacle definitions use the requested assets and floor-zone exclusions", async () => {
  const fire = getExplorationObstacleById("fire_pillar");
  const ice = getExplorationObstacleById("giant_ice_block");
  assert.equal(fire.image, "images/npc/NPC_event_21.avif");
  assert.equal(ice.image, "images/npc/NPC_event_22.avif");
  assert.equal(getExplorationObstacleForDepth(34)?.id, fire.id);
  assert.equal(getExplorationObstacleForDepth(35), null);
  assert.equal(getExplorationObstacleForDepth(44)?.id, ice.id);
  assert.equal(getExplorationObstacleForDepth(45), null);
  await Promise.all([readFile(new URL(`../${fire.image}`, import.meta.url)), readFile(new URL(`../${ice.image}`, import.meta.url))]);
});

test("walking into an unavailable obstacle does not move or change facing", () => {
  const interaction = prepareObstacleInteraction(createObstacleCharacter("warrior"), "fire_pillar");
  const direction = state.dir;
  manualMove(1);
  assert.equal(state.gridX, 1);
  assert.equal(state.gridY, 1);
  assert.equal(state.dir, direction);
  assert.equal(state.anim, null);
  assert.equal(state.overlayEvent, null);
  assert.equal(interaction.messages.at(-1), "激しく燃え上がる火柱が行く手を遮っている。\nこのままでは通れそうにない。");
});

test("a mage spends ten SP only after confirming the matching spell", () => {
  const interaction = prepareObstacleInteraction(createObstacleCharacter("mage", 10), "fire_pillar");
  manualMove(1);
  assert.equal(state.overlayEvent?.phase, "confirm");
  assert.equal(interaction.messages.at(-1), "氷の術式で火柱を消しますか？\n必要SP：10\n＊Aボタン：はい　Bボタン：いいえ");
  handleOverlayEventInput("cancel");
  assert.equal(getExplorationObstacleAt(2, 1)?.id, "fire_pillar");
  assert.equal(interaction.character.sp, 10);

  manualMove(1);
  handleOverlayEventInput("confirm");
  assert.equal(interaction.character.sp, 0);
  assert.equal(getExplorationObstacleAt(2, 1), null);
  assert.equal(interaction.messages.at(-1), "氷の術式を放つと、火柱は白い蒸気を上げて消え去った！\n＊Aボタン：次へ");
  handleOverlayEventInput("confirm");
  manualMove(1);
  assert.ok(state.anim);
});

test("SP9 cannot remove an obstacle by magic but the matching oil remains selectable", () => {
  let interaction = prepareObstacleInteraction(createObstacleCharacter("mage", 9), "giant_ice_block");
  manualMove(1);
  assert.equal(state.overlayEvent, null);
  assert.equal(interaction.character.sp, 9);
  assert.equal(interaction.messages.at(-1), "巨大な氷塊が行く手を塞いでいる。\nこのままでは通れそうにない。");

  interaction = prepareObstacleInteraction(createObstacleCharacter("mage", 9, "fire_lizard_oil", 1), "giant_ice_block");
  manualMove(1);
  assert.equal(state.overlayEvent?.method, "oil");
  assert.equal(interaction.messages.at(-1), "「火蜥蜴の油」を使って巨大氷塊を溶かしますか？\n所持数：1個\n＊Aボタン：はい　Bボタン：いいえ");
});

test("a mage can deliberately choose oil without spending SP", () => {
  const interaction = prepareObstacleInteraction(createObstacleCharacter("mage", 20, "ice_lizard_oil", 2), "fire_pillar");
  manualMove(1);
  assert.equal(state.overlayEvent?.phase, "methodChoice");
  handleOverlayEventInput("cancel");
  assert.equal(state.overlayEvent?.method, "oil");
  assert.equal(interaction.messages.at(-1), getExplorationObstacleOilPrompt(getExplorationObstacleById("fire_pillar"), 2));
  handleOverlayEventInput("confirm");
  assert.equal(interaction.character.sp, 20);
  assert.equal(getItemCount(interaction.character.inventory, "ice_lizard_oil"), 1);
  assert.equal(getExplorationObstacleAt(2, 1), null);
});

test("an accompanying Johan always removes the obstacle without consuming player resources", () => {
  const character = createObstacleCharacter("mage", 20, "ice_lizard_oil", 2);
  character.npcSystem = {
    registeredIds: ["johan"],
    activeIds: ["johan"],
    records: { johan: { maxDepth: 40 } }
  };
  const interaction = prepareObstacleInteraction(character, "fire_pillar");
  manualMove(1);
  assert.equal(state.overlayEvent?.phase, "johanIntro");
  assert.equal(interaction.messages.at(-1), "ヨハン「この程度なら、俺に任せろ。」\n＊Aボタン：次へ");
  handleOverlayEventInput("confirm");
  assert.equal(interaction.messages.at(-1), "ヨハンが氷の術式を組み上げると、火柱は白い蒸気を上げて消え去った！\n＊Aボタン：次へ");
  assert.equal(interaction.character.sp, 20);
  assert.equal(getItemCount(interaction.character.inventory, "ice_lizard_oil"), 2);
  assert.equal(getExplorationObstacleAt(2, 1), null);
});

test("registered but non-accompanying Johan does not grant free removal", () => {
  const character = createObstacleCharacter("warrior");
  character.npcSystem = { registeredIds: ["johan"], activeIds: [], records: { johan: { maxDepth: 40 } } };
  const options = getExplorationObstacleRemovalOptions(character, "fire_pillar");
  assert.equal(options.johan, false);
  assert.equal(options.canUseMagic, false);
  assert.equal(options.canUseOil, false);
});

test("only the matching oil removes each obstacle and opposite or lightning oil cannot", () => {
  const oils = ["fire_lizard_oil", "ice_lizard_oil", "lightning_lizard_oil"];
  for (const [obstacleId, matchingOil] of [["fire_pillar", "ice_lizard_oil"], ["giant_ice_block", "fire_lizard_oil"]]) {
    for (const oilId of oils) {
      const character = createObstacleCharacter("warrior", 0, oilId, 1);
      const options = getExplorationObstacleRemovalOptions(character, obstacleId);
      assert.equal(options.canUseOil, oilId === matchingOil, `${obstacleId}/${oilId}`);
      const result = resolveExplorationObstacleRemoval(character, obstacleId, "oil");
      assert.equal(result.accepted, oilId === matchingOil, `${obstacleId}/${oilId}`);
      if (result.accepted) assert.equal(getItemCount(result.character.inventory, matchingOil), 0);
    }
  }
});

test("removal immediately updates traversal and auto-return pathfinding", () => {
  resetAllWalls();
  setStartPosition(0, 1);
  resetPlayer(DIRS.findIndex(direction => direction.key === "W"));
  state.gridX = 2;
  state.gridY = 1;
  state.x = 2.5;
  state.y = 1.5;
  setWall(0, 1, "E", false);
  setWall(1, 1, "E", false);
  for (const row of explored) row.fill(false);
  explored[1][0] = explored[1][1] = explored[1][2] = true;
  cells[1][1].explorationObstacleId = "fire_pillar";
  assert.deepEqual(findExploredPathToStart(), []);
  assert.equal(removeExplorationObstacleAt(1, 1), true);
  assert.deepEqual(findExploredPathToStart(), ["W", "W"]);
});

test("an already removed obstacle remains absent in a saved floor snapshot", () => {
  buildSeededFloor(40, 4040);
  const removed = placedObstacles()[0];
  assert.equal(removeExplorationObstacleAt(removed.x, removed.y), true);
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
  const snapshot = {
    character: createInitialCharacter({ name: "SAVE", job: "warrior" }),
    player: { gridX: START_X, gridY: START_Y, dir: 0 },
    dungeon: { depth: 40, cells: structuredClone(cells), explored: explored.map(row => row.slice()) }
  };
  assert.equal(writeGame(snapshot), true);
  const loaded = loadGame();
  assert.equal(loaded.dungeon.cells[removed.y][removed.x].explorationObstacleId, null);
  assert.equal(loaded.dungeon.cells[removed.y][removed.x].featureReservation, null);
});

test("B35F and B45F survey quests still complete on a fully explored map", () => {
  const fullMap = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(true));
  let fireCharacter = createInitialCharacter({ name: "FIRE", job: "warrior" });
  fireCharacter.quests.completedQuestIds.push("guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_012");
  fireCharacter = acceptQuest(fireCharacter, B35F_SURVEY_QUEST_ID).character;
  fireCharacter = recordFloorExploration(fireCharacter, { depth: 35, explored: fullMap });
  assert.equal(getQuestProgress(fireCharacter, B35F_SURVEY_QUEST_ID).readyToReport, true);

  let iceCharacter = createInitialCharacter({ name: "ICE", job: "warrior" });
  iceCharacter.quests.completedQuestIds.push("guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_015");
  iceCharacter = acceptQuest(iceCharacter, B45F_SURVEY_QUEST_ID).character;
  iceCharacter = recordFloorExploration(iceCharacter, { depth: 45, explored: fullMap });
  assert.equal(getQuestProgress(iceCharacter, B45F_SURVEY_QUEST_ID).readyToReport, true);
});

test("elemental oils keep their battle-only prices and shop unlock contract", () => {
  assert.equal(EXPLORATION_OBSTACLE_MAGIC_SP_COST, 10);
  for (const itemId of ["fire_lizard_oil", "ice_lizard_oil", "lightning_lizard_oil"]) {
    const item = getItem(itemId);
    assert.equal(item.buyPrice, 500);
    assert.equal(item.sellPrice, 250);
    assert.deepEqual(item.usableIn, ["battle"]);
  }
  assert.equal(getExplorationObstacleById("fire_pillar").oilItemId, "ice_lizard_oil");
  assert.equal(getExplorationObstacleById("giant_ice_block").oilItemId, "fire_lizard_oil");
  const locked = getShopItemIdsForCharacter({ eventFlags: {} });
  assert.equal(locked.includes("fire_lizard_oil"), false);
  assert.equal(locked.includes("ice_lizard_oil"), false);
  const unlocked = getShopItemIdsForCharacter({ eventFlags: { weapon_imbue_oils_shop_unlocked: true } });
  assert.equal(unlocked.includes("fire_lizard_oil"), true);
  assert.equal(unlocked.includes("ice_lizard_oil"), true);
});

test("renderer, minimap, save restore, and shared input paths include exploration obstacles", async () => {
  const [renderer, minimap, main, input] = await Promise.all([
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/minimap.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/input.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /EXPLORATION_OBSTACLES[\s\S]*loadCharacterImage\(obstacle\.imageId, obstacle\.image\)/);
  assert.match(renderer, /cell\.explorationObstacleId[\s\S]*eventKind: "explorationObstacle"/);
  assert.match(minimap, /c\.explorationObstacleId[\s\S]*obstacle\.minimapMarker/);
  assert.match(main, /cells\[y\]\[x\]\.explorationObstacleId = savedCell\.explorationObstacleId \|\| null/);
  assert.match(input, /handleOverlayInput\("confirm"\)/);
  assert.match(input, /handleOverlayInput\("cancel"\)/);
});
