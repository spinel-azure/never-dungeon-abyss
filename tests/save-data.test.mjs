import test from "node:test";
import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  }
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type) {
    this.type = type;
  }
};

const {
  createSaveArchive,
  getSaveSlotSummaries,
  importSaveArchive,
  loadGame,
  writeGame
} = await import("../js/save-data.js");

function makeSnapshot(name = "TEST", level = 8) {
  return {
    character: { name, level },
    player: { gridX: 1, gridY: 1, dir: 0 },
    dungeon: {
      cells: [[{ type: "floor" }]],
      explored: [[true]]
    }
  };
}

test.beforeEach(() => storage.clear());

test("auto and three manual save slots are stored independently", () => {
  assert.equal(writeGame(makeSnapshot("AUTO"), "auto"), true);
  assert.equal(writeGame(makeSnapshot("ONE"), "manual1"), true);
  assert.equal(writeGame(makeSnapshot("TWO"), "manual2"), true);

  assert.equal(loadGame("auto").character.name, "AUTO");
  assert.equal(loadGame("manual1").character.name, "ONE");
  assert.equal(loadGame("manual2").character.name, "TWO");
  assert.equal(loadGame("manual3"), null);

  const summaries = getSaveSlotSummaries();
  assert.deepEqual(summaries.map(summary => summary.exists), [true, true, true, false]);
});

test("JSON archive restores exported save slots after storage is cleared", () => {
  writeGame(makeSnapshot("AUTO", 9), "auto");
  writeGame(makeSnapshot("THREE", 12), "manual3");
  const archive = createSaveArchive();

  storage.clear();
  const result = importSaveArchive(JSON.parse(JSON.stringify(archive)));

  assert.equal(result.accepted, true);
  assert.deepEqual(result.importedSlots, ["auto", "manual3"]);
  assert.equal(loadGame("auto").character.level, 9);
  assert.equal(loadGame("manual3").character.name, "THREE");
});

test("invalid JSON archive does not alter existing saves", () => {
  writeGame(makeSnapshot("KEEP"), "auto");
  const result = importSaveArchive({ format: "unknown", slots: {} });

  assert.equal(result.accepted, false);
  assert.equal(loadGame("auto").character.name, "KEEP");
});
