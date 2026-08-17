import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const townSource = await readFile(new URL("../js/town.js", import.meta.url), "utf8");

test("tavern menu reserves the requested five-command layout", () => {
  const tavernCommands = townSource.match(/tavern:\s*\[([\s\S]*?)\n\s*\]/)?.[1] || "";
  const expected = [
    '["npc-hire", "NPC雇用"]',
    '["rumors", "噂話"]',
    '["past-rumors", "過去の噂話"]',
    '["talk", "話す"]',
    '["return", "町に戻る"]'
  ];

  let previousIndex = -1;
  for (const command of expected) {
    const index = tavernCommands.indexOf(command);
    assert.ok(index > previousIndex, `${command} should appear in the requested order`);
    previousIndex = index;
  }
});

test("future tavern commands remain disabled until their features are implemented", () => {
  assert.match(
    townSource,
    /UNIMPLEMENTED_TAVERN_COMMANDS\s*=\s*Object\.freeze\(new Set\(\["npc-hire", "past-rumors"\]\)\)/
  );
  assert.match(townSource, /button\.disabled\s*=\s*empty\s*\|\|\s*unimplemented/);
});
