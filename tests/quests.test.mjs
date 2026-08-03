import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getOwnedCardCount } from "../data/deck.js";
import {
  MAX_ACTIVE_QUESTS,
  FLOOR_SURVEY_QUEST_ID,
  RABBIT_EXTERMINATION_QUEST_ID,
  SLIME_EXTERMINATION_QUEST_ID,
  WANDERING_DEAD_EXTERMINATION_QUEST_ID,
  abandonQuest,
  acceptQuest,
  getQuestById,
  getQuestProgress,
  isDungeonDepthUnlocked,
  isQuestAvailable,
  normalizeQuestState,
  recordFloorExploration,
  recordEnemyDefeat,
  reportQuest,
  shouldForceEnemy
} from "../data/quests.js";

const QUEST_ID = "guild_001_abyss_rat";

function unlockB2F(character) {
  return {
    ...character,
    quests: {
      ...character.quests,
      completedQuestIds: [
        QUEST_ID,
        SLIME_EXTERMINATION_QUEST_ID,
        FLOOR_SURVEY_QUEST_ID
      ]
    }
  };
}

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

test("quest 002 forces cave slimes on B1F and can progress beside quest 003", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character = acceptQuest(character, SLIME_EXTERMINATION_QUEST_ID).character;
  character = acceptQuest(character, FLOOR_SURVEY_QUEST_ID).character;
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "cave_slime" }), true);
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "abyss_rat" }), false);
  assert.equal(shouldForceEnemy(character, { depth: 2, enemyId: "cave_slime" }), false);
  const explored = Array.from({ length: 10 }, () => Array(10).fill(false));
  explored[0][0] = true;
  character = recordFloorExploration(character, { depth: 1, explored });
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "cave_slime");
  }
  assert.equal(getQuestProgress(character, SLIME_EXTERMINATION_QUEST_ID).readyToReport, true);
  assert.equal(getQuestProgress(character, FLOOR_SURVEY_QUEST_ID).progress, 1);
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "cave_slime" }), false);
});

test("quest 002 report grants an HP card and 200G", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "thief" }),
    SLIME_EXTERMINATION_QUEST_ID
  ).character;
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "cave_slime");
  }
  const report = reportQuest(character, SLIME_EXTERMINATION_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "common_hp_up");
  assert.equal(report.bonusGold, 200);
  assert.equal(report.character.gold, 200);
  assert.equal(getOwnedCardCount(report.character.cards, "common_hp_up"), 1);
});

test("B2F remains locked until quests 001, 002, and 003 are completed", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(isDungeonDepthUnlocked(character, 1), true);
  assert.equal(isDungeonDepthUnlocked(character, 2), false);
  character = acceptQuest(character, QUEST_ID).character;
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rat");
  }
  assert.equal(getQuestProgress(character, QUEST_ID).readyToReport, true);
  assert.equal(isDungeonDepthUnlocked(character, 2), false);
  character = reportQuest(character, QUEST_ID).character;
  assert.equal(isDungeonDepthUnlocked(character, 2), false);
  character = {
    ...character,
    quests: {
      ...character.quests,
      completedQuestIds: [
        ...character.quests.completedQuestIds,
        "guild_002_cave_slime",
        FLOOR_SURVEY_QUEST_ID
      ]
    }
  };
  assert.equal(isDungeonDepthUnlocked(character, 2), true);
  assert.equal(isDungeonDepthUnlocked(character, 3), true);
});

test("quest 003 tracks B1F explored cells and resets before completion", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "mage" }),
    FLOOR_SURVEY_QUEST_ID
  ).character;
  const explored = Array.from({ length: 10 }, () => Array(10).fill(false));
  explored[0][0] = true;
  explored[0][1] = true;
  character = recordFloorExploration(character, { depth: 1, explored });
  assert.equal(getQuestProgress(character, FLOOR_SURVEY_QUEST_ID).progress, 2);
  character = recordFloorExploration(character, { depth: 0, explored: [] });
  assert.equal(getQuestProgress(character, FLOOR_SURVEY_QUEST_ID).progress, 0);
});

test("quest 003 completion survives return and grants an SP card and 200G", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "priest" }),
    FLOOR_SURVEY_QUEST_ID
  ).character;
  const explored = Array.from({ length: 10 }, () => Array(10).fill(true));
  character = recordFloorExploration(character, { depth: 1, explored });
  character = recordFloorExploration(character, { depth: 0, explored: [] });
  assert.equal(getQuestProgress(character, FLOOR_SURVEY_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, FLOOR_SURVEY_QUEST_ID);
  assert.equal(report.rewardCardId, "common_sp_up");
  assert.equal(report.bonusGold, 200);
  assert.equal(getOwnedCardCount(report.character.cards, "common_sp_up"), 1);
});

test("quest 004 unlocks with B2F and forces abyss rabbits until 15 defeats", () => {
  const quest = getQuestById(RABBIT_EXTERMINATION_QUEST_ID);
  assert.equal(quest.objectiveLabel, "奈落ウサギを15匹退治する。");
  assert.equal(quest.descriptionLabel, "目的");
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  assert.equal(isQuestAvailable(character, RABBIT_EXTERMINATION_QUEST_ID), false);
  assert.equal(acceptQuest(character, RABBIT_EXTERMINATION_QUEST_ID).reason, "unavailable");
  character = unlockB2F(character);
  assert.equal(isQuestAvailable(character, RABBIT_EXTERMINATION_QUEST_ID), true);
  character = acceptQuest(character, RABBIT_EXTERMINATION_QUEST_ID).character;
  assert.equal(shouldForceEnemy(character, { depth: 2, enemyId: "abyss_rabbit" }), true);
  assert.equal(shouldForceEnemy(character, { depth: 2, enemyId: "wandering_dead" }), false);
  assert.equal(shouldForceEnemy(character, { depth: 1, enemyId: "abyss_rabbit" }), false);
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rabbit");
  }
  assert.equal(getQuestProgress(character, RABBIT_EXTERMINATION_QUEST_ID).readyToReport, true);
  assert.equal(shouldForceEnemy(character, { depth: 2, enemyId: "abyss_rabbit" }), false);
});

test("quest 004 report grants Alertness and 200G", () => {
  let character = unlockB2F(createInitialCharacter({ name: "TEST", job: "mage" }));
  character = acceptQuest(character, RABBIT_EXTERMINATION_QUEST_ID).character;
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "abyss_rabbit");
  }
  const report = reportQuest(character, RABBIT_EXTERMINATION_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "common_alertness");
  assert.equal(report.bonusGold, 200);
  assert.equal(report.character.gold, 200);
  assert.equal(getOwnedCardCount(report.character.cards, "common_alertness"), 1);
});

test("quest 005 forces wandering dead only on B4F and ignores other floors", () => {
  const quest = getQuestById(WANDERING_DEAD_EXTERMINATION_QUEST_ID);
  assert.equal(quest.targetId, "wandering_dead");
  assert.equal(quest.targetDepth, 4);
  assert.equal(quest.objectiveLabel, "さまよう亡者を15体退治する。");
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "thief" }),
    WANDERING_DEAD_EXTERMINATION_QUEST_ID
  ).character;
  assert.equal(shouldForceEnemy(character, { depth: 4, enemyId: "wandering_dead" }), true);
  assert.equal(shouldForceEnemy(character, { depth: 3, enemyId: "wandering_dead" }), false);
  character = recordEnemyDefeat(character, "wandering_dead", 3);
  assert.equal(getQuestProgress(character, WANDERING_DEAD_EXTERMINATION_QUEST_ID).progress, 0);
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "wandering_dead", 4);
  }
  assert.equal(getQuestProgress(character, WANDERING_DEAD_EXTERMINATION_QUEST_ID).readyToReport, true);
  assert.equal(shouldForceEnemy(character, { depth: 4, enemyId: "wandering_dead" }), false);
});

test("quest 005 report grants Dexterity Lesson and 400G once", () => {
  let character = acceptQuest(
    createInitialCharacter({ name: "TEST", job: "priest" }),
    WANDERING_DEAD_EXTERMINATION_QUEST_ID
  ).character;
  for (let index = 0; index < 15; index += 1) {
    character = recordEnemyDefeat(character, "wandering_dead", 4);
  }
  const report = reportQuest(character, WANDERING_DEAD_EXTERMINATION_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "common_dexterity_lesson");
  assert.equal(report.bonusGold, 400);
  assert.equal(report.character.gold, 400);
  assert.equal(getOwnedCardCount(report.character.cards, "common_dexterity_lesson"), 1);
  assert.equal(reportQuest(report.character, WANDERING_DEAD_EXTERMINATION_QUEST_ID).accepted, false);
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
