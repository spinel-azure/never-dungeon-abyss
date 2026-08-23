import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { createInitialCharacter } from "../data/classes.js";
import { acceptQuest } from "../data/quests.js";
import { getTownPasserbyImageSource, isTownPasserbyVisible } from "../js/town-passersby.js";

test("Helen's walking portrait changes permanently after her hidden event", () => {
  const character = createInitialCharacter("常連客", "warrior");
  assert.equal(getTownPasserbyImageSource("shopkeeper", character), "images/npc/NPC_13b.avif");
  character.eventFlags.helen_hidden_event_seen = true;
  assert.equal(getTownPasserbyImageSource("shopkeeper", character), "images/npc/NPC_13g.avif");
});

test("Parthenope stops walking through town permanently after quest 028 is accepted", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_027"
  );
  assert.equal(isTownPasserbyVisible("quietTownGirl", character), true);

  const accepted = acceptQuest(character, "guild_028");
  assert.equal(accepted.accepted, true);
  assert.equal(isTownPasserbyVisible("quietTownGirl", accepted.character), false);

  delete accepted.character.quests.active.guild_028;
  assert.equal(isTownPasserbyVisible("quietTownGirl", accepted.character), false);
});

test("the horse and chicken walk through town more often than the rare visitor", () => {
  const source = readFileSync(new URL("../js/town-passersby.js", import.meta.url), "utf8");
  assert.equal(getTownPasserbyImageSource("horseAndChicken", null), "images/npc/NPC_18b.avif");
  assert.equal(existsSync(new URL("../images/npc/NPC_18b.avif", import.meta.url)), true);
  assert.match(source, /id: "horseAndChicken"[\s\S]*?spawnInterval: Object\.freeze\(\[45000, 85000\]\)/);
  assert.match(source, /id: "rareTownVisitor"[\s\S]*?spawnInterval: Object\.freeze\(\[240000, 480000\]\)/);
  assert.match(source, /id: "horseAndChicken"[\s\S]*?walkPeriod: 880/);
  assert.match(source, /config\.gait === "trot"[\s\S]*?\[0, -1, -2, -3, -3, -2, -1, 0\]/);
  assert.match(source, /const bottomOverscan = Math\.max\(0, -Math\.min\(\.\.\.bobPattern\)\)/);
  assert.match(source, /height - drawHeight \+ bottomOverscan \+ bobOffset/);
});
