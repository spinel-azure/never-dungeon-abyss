import test from "node:test";
import assert from "node:assert/strict";
import { buildBoundaryWallMap, cells, getStartPosition, validateDungeonLayout } from "../js/dungeon.js";
import { getBossById, getFloorBossByDepth } from "../data/bosses.js";
import { B100_FIXED_FLOOR_MAP, B100_GAUNTLET_BOSS_IDS, getB100GauntletFlag } from "../data/fixed-floor-maps.js";
import { DIRS } from "../js/config.js";
import { configurePlayer, handleOverlayEventInput, manualMove, setPlayerInputEnabled, state, updateAnimation } from "../js/player.js";

const internal = ({ x, y }) => ({ x, y: B100_FIXED_FLOOR_MAP.height - 1 - y });

test("B100F loads the mapper JSON as a terminal fixed floor", () => {
  buildBoundaryWallMap(100, () => 0.5, {});
  const flat = cells.flat();
  assert.deepEqual(getStartPosition(), { x: 0, y: 9 });
  assert.equal(flat.filter(cell => cell.type === "stairsUp").length, 1);
  assert.equal(flat.filter(cell => cell.type === "stairsDown").length, 0);
  assert.equal(cells[9][0].portal, "transfer_b100f");
  assert.equal(flat.filter(cell => cell.fixedWarp).length, 11);
  assert.equal(flat.filter(cell => cell.fixedReturnPortal).length, 11);
  assert.equal(flat.filter(cell => cell.fixedReturnPoint).length, 1);
  assert.equal(flat.filter(cell => cell.fixedEvent).length, 2);
  assert.equal(flat.filter(cell => cell.fountain).length, 1);
  assert.equal(validateDungeonLayout({ depth: 100 }).valid, true);
});

test("B100F converts bottom-left mapper coordinates and warp targets", () => {
  buildBoundaryWallMap(100, () => 0.5, {});
  const firstWarp = B100_FIXED_FLOOR_MAP.warps[0];
  const from = internal(firstWarp);
  const to = internal(firstWarp.to);
  assert.equal(cells[from.y][from.x].fixedWarp.warpId, "W01");
  assert.deepEqual(cells[from.y][from.x].fixedWarp.to, to);
  const fountain = internal(B100_FIXED_FLOOR_MAP.healingFountains[0]);
  assert.equal(cells[fountain.y][fountain.x].fountain, "healing_fountain");
  assert.equal(cells[9][0].walls.W, true);
  assert.equal(cells[9][0].walls.S, true);
});

test("B100F warp portals wait for confirmation and apply every configured arrival direction", async () => {
  const messages = [];
  const transitions = [];
  configurePlayer({
    say: message => messages.push(message),
    onDungeonStep: () => {},
    onStateChanged: () => {},
    runFixedWarpTransition: async onDark => { transitions.push("warp"); await onDark(); }
  });
  const expectedFacings = ["E", "N", "E", "E", "N", "N", "S", "S", "S", "E", "N"];
  assert.deepEqual(B100_FIXED_FLOOR_MAP.warps.map(warp => warp.facing), expectedFacings);

  buildBoundaryWallMap(100, () => 0.5, {});
  setPlayerInputEnabled(true);
  const north = DIRS.findIndex(dir => dir.key === "N");
  const east = DIRS.findIndex(dir => dir.key === "E");
  Object.assign(state, { gridX: 0, gridY: 8, x: 0.5, y: 8.5, dir: north, angle: DIRS[north].angle, anim: null, overlayEvent: null });
  manualMove(1);
  updateAnimation(state.anim.start + state.anim.duration + 1);
  assert.deepEqual({ x: state.gridX, y: state.gridY }, { x: 0, y: 7 });
  assert.match(messages.at(-1), /転送陣がまばゆい光に包まれる/);
  handleOverlayEventInput("confirm");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual({ x: state.gridX, y: state.gridY }, { x: 8, y: 8 });
  assert.equal(state.dir, east);
  assert.deepEqual(transitions, ["warp"]);
});

test("B100F return portals always face west and missing facing preserves the prior direction", async () => {
  configurePlayer({
    say: () => {},
    onDungeonStep: () => {},
    onStateChanged: () => {},
    runFixedWarpTransition: async onDark => onDark()
  });
  buildBoundaryWallMap(100, () => 0.5, {});
  setPlayerInputEnabled(true);
  const north = DIRS.findIndex(dir => dir.key === "N");
  const west = DIRS.findIndex(dir => dir.key === "W");
  Object.assign(state, { gridX: 8, gridY: 7, x: 8.5, y: 7.5, dir: north, angle: DIRS[north].angle, anim: null, overlayEvent: null });
  manualMove(1);
  updateAnimation(state.anim.start + state.anim.duration + 1);
  handleOverlayEventInput("confirm");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual({ x: state.gridX, y: state.gridY }, { x: 1, y: 9 });
  assert.equal(state.dir, west);

  buildBoundaryWallMap(100, () => 0.5, {});
  const w01 = internal(B100_FIXED_FLOOR_MAP.warps[0]);
  cells[w01.y][w01.x].fixedWarp.facing = "";
  Object.assign(state, { gridX: 0, gridY: 8, x: 0.5, y: 8.5, dir: north, angle: DIRS[north].angle, anim: null, overlayEvent: null });
  manualMove(1);
  updateAnimation(state.anim.start + state.anim.duration + 1);
  handleOverlayEventInput("confirm");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.dir, north);
});

test("B100F queen shadows carry the final warnings and fade after confirmation", () => {
  assert.match(B100_FIXED_FLOOR_MAP.events[0].description, /守護者たちの幻影/);
  assert.match(B100_FIXED_FLOOR_MAP.events[0].description, /再びあなたの前に立ち塞がる/);
  assert.match(B100_FIXED_FLOOR_MAP.events[1].description, /引き返すことは出来ません/);
  assert.equal(B100_FIXED_FLOOR_MAP.events.every(event => event.fadeOut === true), true);
});

test("B100F begins with all ten unique checkpoint bosses and no final boss", () => {
  buildBoundaryWallMap(100, () => 0.5, {});
  const activeBossIds = cells.flat().map(cell => cell.bossId).filter(Boolean);
  assert.equal(activeBossIds.length, 10);
  assert.deepEqual(new Set(activeBossIds), new Set(B100_GAUNTLET_BOSS_IDS));
  const finalPosition = internal(B100_FIXED_FLOOR_MAP.finalBoss);
  assert.equal(cells[finalPosition.y][finalPosition.x].bossId, null);
});

test("B100F unlocks Erzdaemonin only after all ten rematch flags", () => {
  const eventFlags = Object.fromEntries(B100_GAUNTLET_BOSS_IDS.map(id => [getB100GauntletFlag(id), true]));
  const progress = { eventFlags, b100GauntletDefeatedBossIds: [...B100_GAUNTLET_BOSS_IDS] };
  buildBoundaryWallMap(100, () => 0.5, progress);
  const finalPosition = internal(B100_FIXED_FLOOR_MAP.finalBoss);
  assert.equal(cells.flat().filter(cell => B100_GAUNTLET_BOSS_IDS.includes(cell.bossId)).length, 0);
  assert.equal(cells[finalPosition.y][finalPosition.x].bossId, "erzdaemonin_b100f");
  assert.equal(validateDungeonLayout({ depth: 100, progress }).valid, true);
});

test("persistent first-victory flags do not prevent guardian phantoms from returning on a new exploration", () => {
  const eventFlags = Object.fromEntries(B100_GAUNTLET_BOSS_IDS.map(id => [getB100GauntletFlag(id), true]));
  buildBoundaryWallMap(100, () => 0.5, { eventFlags, b100GauntletDefeatedBossIds: [] });
  const activeBossIds = cells.flat().map(cell => cell.bossId).filter(id => B100_GAUNTLET_BOSS_IDS.includes(id));
  assert.equal(activeBossIds.length, B100_GAUNTLET_BOSS_IDS.length);
  assert.deepEqual(new Set(activeBossIds), new Set(B100_GAUNTLET_BOSS_IDS));
});

test("B100F resumes with Amayenak after Erzdaemonin is defeated", () => {
  const eventFlags = Object.fromEntries(B100_GAUNTLET_BOSS_IDS.map(id => [getB100GauntletFlag(id), true]));
  eventFlags.boss_erzdaemonin_b100f_defeated = true;
  buildBoundaryWallMap(100, () => 0.5, { eventFlags, b100GauntletDefeatedBossIds: [...B100_GAUNTLET_BOSS_IDS] });
  const finalPosition = internal(B100_FIXED_FLOOR_MAP.finalBoss);
  assert.equal(cells[finalPosition.y][finalPosition.x].bossId, "amayenak_b100f");
});

test("B100F boss definitions form the final two-stage battle", () => {
  const first = getFloorBossByDepth(100);
  const final = getBossById(first.nextBossId);
  assert.equal(first.id, "erzdaemonin_b100f");
  assert.equal(first.image, "images/bosses/boss_18.avif");
  assert.equal(final.id, "amayenak_b100f");
  assert.equal(final.image, "images/bosses/boss_19.avif");
  assert.equal(final.bossKind, "finalPhase");
});

test("floors before B100F retain one downward staircase", () => {
  buildBoundaryWallMap(99, () => 0.5, {});
  assert.equal(cells.flat().filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(validateDungeonLayout({ depth: 99 }).valid, true);
});
