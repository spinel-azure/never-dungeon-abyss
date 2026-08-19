import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { getTownPasserbyImageSource } from "../js/town-passersby.js";

test("Helen's walking portrait changes permanently after her hidden event", () => {
  const character = createInitialCharacter("常連客", "warrior");
  assert.equal(getTownPasserbyImageSource("shopkeeper", character), "images/npc/NPC_13b.avif");
  character.eventFlags.helen_hidden_event_seen = true;
  assert.equal(getTownPasserbyImageSource("shopkeeper", character), "images/npc/NPC_13g.avif");
});
