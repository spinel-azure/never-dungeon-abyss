import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getOwnedCardCount } from "../data/deck.js";
import {
  MAX_ACTIVE_QUESTS,
  abandonQuest,
  acceptQuest,
  getQuestProgress,
  normalizeQuestState,
  recordEnemyDefeat,
  reportQuest,
  shouldForceEnemy
} from "../data/quests.js";

const QUEST_ID = "guild_001_abyss_rat";

test("quest state is normalized into character saves", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(character.gold, 0);
  assert.deepEqual(character.quests, { active: {}, completedQuestIds: [] });
  const normalized = normalizeCharacter({
    ...character,
    quests: { active: { [QUEST_ID]: { progress: 999 } } }
  });
  assert.equal(normalized.quests.active[QUEST_ID].progress, 15);
});

test("quest 001 can be accepted and abandoned", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const accepted = acceptQuest(character, QUEST_ID);
  assert.equal(accepted.accepted, true);
  assert.equal(getQuestProgress(accepted.character, QUEST_ID).active, true);
  const duplicate = acceptQuest(accepted.character, QUEST_ID);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "alreadyAccepted");
  const abandoned = abandonQuest(accepted.character, QUEST_ID);
  assert.equal(abandoned.accepted, true);
  assert.equal(getQuestProgress(abandoned.character, QUEST_ID).active, false);
  assert.equal(MAX_ACTIVE_QUESTS, 3);
});

test("rat defeats advance only quest 001 and stop at 15", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "thief" }),
    QUEST_ID
  ).character;
  character = recordEnemyDefeat(character, "cave_slime");
  assert.equal(getQuestProgress(character, QUEST_ID).progress, 0);
  for (let index = 0; index < 20; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rat");
  }
  const progress = getQuestProgress(character, QUEST_ID);
  assert.equal(progress.progress, 15);
  assert.equal(progress.readyToReport, true);
});

test("B1F forces rats only until the active quest reaches its target", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "mage" }),
    QUEST_ID
  ).character;
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "abyss_rat" }), true);
  assert.equal(shouldForceEnemy(character, { depth: 2, enemyId: "abyss_rat" }), false);
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rat");
  }
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "abyss_rat" }), false);
});

test("reporting a completed quest grants the C-rarity AGI card once", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "priest" }),
    QUEST_ID
  ).character;
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rat");
  }
  const report = reportQuest(character, QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "common_gale_feather");
  assert.equal(report.bonusGold, 200);
  assert.equal(report.character.gold, 200);
  assert.equal(getOwnedCardCount(report.character.cards, "common_gale_feather"), 1);
  assert.equal(getQuestProgress(report.character, QUEST_ID).completed, true);
  const repeated = reportQuest(report.character, QUEST_ID);
  assert.equal(repeated.accepted, false);
  assert.equal(repeated.character.gold, 200);
});

test("invalid quest entries are discarded during normalization", () => {
  assert.deepEqual(
    normalizeQuestState({ active: { invalid: { progress: 3 } }, completedQuestIds: ["invalid"] }),
    { active: {}, completedQuestIds: [] }
  );
});
