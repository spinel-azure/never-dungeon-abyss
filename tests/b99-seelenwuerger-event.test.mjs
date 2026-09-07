import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import {
  bossLeavesRemains,
  getBossById,
  resolveBossEncounterPrompt
} from "../data/bosses.js";
import { getKeyItem } from "../data/key-items.js";
import { buildBoundaryWallMap, cells, placeFloorBossKeyTreasure } from "../js/dungeon.js";
import {
  configurePlayer,
  handleOverlayEventInput,
  startBossEvent,
  state
} from "../js/player.js";

const WITHOUT_LIGHTBRINGER = "「ククク…！この漆黒の中で私に抗う事など出来ぬ。さぁ、この鎌で切り裂いてやろう！」\n＊Aボタンで次へ";
const WITH_LIGHTBRINGER = "「リヒトブリンガー？…忌々しい…！そんな物で吾輩を打ち破ろうなどとはゆめゆめ思わぬ事だ…！\nドゥンケルマギーア様の邪魔はさせぬ。さぁ、この鎌で切り裂いてやろう！」\n＊Aボタンで次へ";

test("B99F Seelenwuerger uses the requested before/after event art and conditional dialogue", async () => {
  const boss = getBossById("seelenwuerger_b99f");
  assert.equal(boss.encounterImageId, "seelenwuerger_before_b99f");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_25.avif");
  assert.equal(boss.defeatedEncounterImageId, "seelenwuerger_after_b99f");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_26.avif");
  assert.equal(resolveBossEncounterPrompt(boss), WITHOUT_LIGHTBRINGER);
  assert.equal(resolveBossEncounterPrompt(boss, { lightbringerOwned: true }), WITH_LIGHTBRINGER);
  assert.equal(bossLeavesRemains(boss), true);
  await Promise.all([
    access(new URL("../images/npc/NPC_event_25.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_26.avif", import.meta.url))
  ]);
});

test("B99F creates one trapped gold chest for its red-rust key and a sealed boss room", () => {
  buildBoundaryWallMap(99, () => 0.5, {
    bossDefeatedById: { seelenwuerger_b99f: false },
    redDoorUnlocked: false,
    hasRedKey: false
  });
  const flat = cells.flat();
  const room = flat.filter(cell => cell.reserved === "bossRoom");
  const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b99f_chest");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "seelenwuerger_b99f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
  assert.ok(keyChests[0].treasureTrapId);
  assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "boss").length, 2);

  const key = getKeyItem("red_rust_key_b99f");
  assert.equal(key.name, "赤錆びた鍵");
  assert.equal(key.sellable, false);
  assert.equal(key.consumable, true);
});

test("B99F key chest is not recreated after pickup, door unlock, or boss victory", () => {
  for (const progress of [
    { bossDefeatedById: { seelenwuerger_b99f: false }, hasRedKey: true },
    { bossDefeatedById: { seelenwuerger_b99f: false }, redDoorUnlocked: true },
    { bossDefeatedById: { seelenwuerger_b99f: true } }
  ]) {
    buildBoundaryWallMap(99, () => 0.5, progress);
    assert.equal(cells.flat().some(cell => cell.eventTreasureId === "red_rust_key_b99f_chest"), false);
  }
  buildBoundaryWallMap(99, () => 0.5, {
    bossDefeatedById: { seelenwuerger_b99f: true }
  });
  const room = cells.flat().filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.some(cell => cell.bossId), false);
  assert.equal(room.filter(cell => cell.bossRemainsId === "seelenwuerger_b99f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
});

test("B99F key chest restoration can exclude the player's saved cell", () => {
  buildBoundaryWallMap(99, () => 0.5, {
    bossDefeatedById: { seelenwuerger_b99f: false },
    redDoorUnlocked: true
  });
  const playerCell = cells.flat().find(cell => cell.type === "floor" && !cell.reserved && !cell.treasure && !cell.npc);
  const placed = placeFloorBossKeyTreasure(getBossById("seelenwuerger_b99f"), () => 0.5, {
    bossDefeatedById: { seelenwuerger_b99f: false },
    redDoorUnlocked: false,
    hasRedKey: false,
    excludedFeatureCells: [playerCell]
  });
  assert.ok(placed);
  assert.notDeepEqual(placed, { x: playerCell.x, y: playerCell.y });
  assert.equal(cells[placed.y][placed.x].eventTreasureId, "red_rust_key_b99f_chest");
});

test("B99F pre-battle dialogue waits for A, then starts the battle immediately once", () => {
  const messages = [];
  const started = [];
  let stateChanges = 0;
  configurePlayer({
    isBossRematch: () => false,
    getBossEncounterPrompt: boss => resolveBossEncounterPrompt(boss, { lightbringerOwned: true }),
    say: message => messages.push(message),
    onStateChanged: () => { stateChanges += 1; },
    beginBossBattle: bossId => { started.push(bossId); return true; }
  });
  state.overlayEvent = null;
  startBossEvent("seelenwuerger_b99f", 3, 4);
  assert.equal(started.length, 0);
  assert.equal(state.overlayEvent?.imageId, "seelenwuerger_before_b99f");
  assert.equal(state.overlayEvent?.reserveMessageLines, 4);
  assert.equal(messages.at(-1), WITH_LIGHTBRINGER);

  assert.equal(handleOverlayEventInput("confirm"), true);
  assert.deepEqual(started, ["seelenwuerger_b99f"]);
  assert.equal(state.overlayEvent, null);
  assert.equal(messages.at(-1), "");
  assert.ok(stateChanges >= 1);
  assert.equal(handleOverlayEventInput("confirm"), false);
  assert.deepEqual(started, ["seelenwuerger_b99f"]);
});
