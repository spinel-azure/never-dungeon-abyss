import test from "node:test";
import assert from "node:assert/strict";

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
