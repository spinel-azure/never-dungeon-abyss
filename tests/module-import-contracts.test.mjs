import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("main imports quest progress before gating the B6 special door", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const questImport = source.match(/import\s*\{([\s\S]*?)\}\s*from\s*["']\.\.\/data\/quests\.js["'];/);
  assert.ok(questImport, "quests.js import block is missing");
  assert.match(questImport[1], /\bgetQuestProgress\b/);
  assert.match(source, /getQuestProgress\(character, room\.content\.requiredQuestId\)/);
});
