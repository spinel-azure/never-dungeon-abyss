import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { resolveFieldSkill } from "../combat/resolve-field-skill.js";
import { DIRS, MAP_H, MAP_W } from "../js/config.js";
import { cells, explored, setDoor, setStartPosition, setWall } from "../js/dungeon.js";
import { configurePlayer, manualMove, setPlayerInputEnabled, state } from "../js/player.js";
import {
  cancelAutoReturn,
  configureAutoReturn,
  findExploredPathToStart,
  getAutoReturnAvailability,
  startAutoReturn
} from "../js/autoReturn.js";

function prepareTwoCellRoute(doorKind = "normal") {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      explored[y][x] = false;
      cells[y][x].walls = { N: true, E: true, S: true, W: true };
      cells[y][x].doors = { N: null, E: null, S: null, W: null };
      cells[y][x].doorKinds = { N: null, E: null, S: null, W: null };
    }
  }
  setStartPosition(1, 1);
  state.gridX = 2;
  state.gridY = 1;
  state.dir = DIRS.findIndex(direction => direction.key === "W");
  state.anim = null;
  state.autoReturning = false;
  state.autoWalkerActive = false;
  state.autoReturnPaused = false;
  state.autoPath = [];
  setPlayerInputEnabled(true);
  explored[1][1] = true;
  explored[1][2] = true;
  setWall(1, 1, "E", true);
  setDoor(1, 1, "E", "closed", doorKind);
}

test("auto return routes through an explored normal closed door", () => {
  prepareTwoCellRoute("normal");
  assert.deepEqual(findExploredPathToStart(), ["W"]);
});

test("auto return does not route through locked, boss, or special-room doors", () => {
  prepareTwoCellRoute("locked");
  assert.deepEqual(findExploredPathToStart(), []);
  prepareTwoCellRoute("boss");
  assert.deepEqual(findExploredPathToStart(), []);
  prepareTwoCellRoute("specialLocked");
  assert.deepEqual(findExploredPathToStart(), []);
});

test("persistent auto return rejects duplicate starts and survives a battle input lock", () => {
  prepareTwoCellRoute("normal");
  configureAutoReturn({ say: () => {}, playArrivalSe: () => {} });
  const availability = getAutoReturnAvailability();
  assert.equal(availability.accepted, true);
  assert.equal(startAutoReturn({ persistentThroughBattle: true, availability }), true);
  assert.equal(state.autoReturning, true);
  assert.equal(state.autoWalkerActive, true);
  assert.deepEqual(availability.path, ["W"]);
  assert.equal(getAutoReturnAvailability().reason, "alreadyActive");

  setPlayerInputEnabled(false);
  assert.equal(state.autoReturning, true);
  assert.equal(state.autoWalkerActive, true);
  setPlayerInputEnabled(true);
  cancelAutoReturn(false);
});

test("manual input interrupts persistent auto return without recreating its spent resource", () => {
  prepareTwoCellRoute("normal");
  configureAutoReturn({ say: () => {}, playArrivalSe: () => {} });
  configurePlayer({ cancelAutoReturn, say: () => {} });
  const availability = getAutoReturnAvailability();
  const warrior = normalizeCharacter({
    ...createInitialCharacter({ name: "RUNNER", job: "warrior" }),
    level: 20,
    sp: 50
  });
  warrior.sp = 50;
  const spentSkillState = resolveFieldSkill({
    character: warrior,
    skillId: "full_sprint",
    context: "dungeon",
    autoReturnAvailability: availability
  }).character;
  assert.equal(spentSkillState.sp, 20);
  assert.equal(startAutoReturn({ persistentThroughBattle: true, availability }), true);
  manualMove(1);
  assert.equal(state.autoReturning, false);
  assert.equal(state.autoWalkerActive, false);
  assert.equal(spentSkillState.sp, 20);
});
