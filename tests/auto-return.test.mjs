import test from "node:test";
import assert from "node:assert/strict";

import { DIRS, MAP_H, MAP_W } from "../js/config.js";
import { cells, explored, setDoor, setStartPosition, setWall } from "../js/dungeon.js";
import { state } from "../js/player.js";
import { findExploredPathToStart } from "../js/autoReturn.js";

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
