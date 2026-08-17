import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { applyBossVictory } from "../data/bosses.js";
import { getOwnedCardCount } from "../data/deck.js";
import { getItemCount } from "../data/inventory.js";
import {
  MAX_ACTIVE_QUESTS,
  FLOOR_SURVEY_QUEST_ID,
  RABBIT_EXTERMINATION_QUEST_ID,
  SLIME_EXTERMINATION_QUEST_ID,
  WANDERING_DEAD_EXTERMINATION_QUEST_ID,
  BLACK_BOX_INVESTIGATION_QUEST_ID,
  RED_DOOR_INVESTIGATION_QUEST_ID,
  QUEEN_SHADOW_QUEST_ID,
  JABBERWOCK_QUEST_ID,
  SECOND_RED_DOOR_INVESTIGATION_QUEST_ID,
  THIEVES_HIDEOUT_QUEST_ID,
  THIRD_RED_DOOR_INVESTIGATION_QUEST_ID,
  B35F_SURVEY_QUEST_ID,
  B45F_SURVEY_QUEST_ID,
  BRASS_BULL_QUEST_ID,
  RED_DOOR_DEFENSE_CARD_FLAG,
  grantRedDoorInvestigationSupply,
  abandonQuest,
  acceptQuest,
  getQuestById,
  getQuestHistory,
  getQuestProgress,
  isDungeonDepthUnlocked,
  isQuestAvailable,
  normalizeQuestState,
  recordFloorExploration,
  recordQueenShadowEncounter,
  completeQueenShadowInvestigation,
  recordEnemyDefeat,
  recordBossDefeat,
  recordCustomQuestProgress,
  reportQuest,
  shouldForceEnemy
} from "../data/quests.js";

const QUEST_ID = "guild_001_abyss_rat";

test("quest history lists reportable, active, then completed requests", () => {
  const character = createInitialCharacter("履歴確認", "warrior");
  character.quests = {
    active: {
      [SLIME_EXTERMINATION_QUEST_ID]: { progress: 2 },
      [FLOOR_SURVEY_QUEST_ID]: { progress: 100 }
    },
    completedQuestIds: [QUEST_ID]
  };
  const history = getQuestHistory(character);
  assert.deepEqual(history.map(entry => entry.quest.id), [
    FLOOR_SURVEY_QUEST_ID,
    SLIME_EXTERMINATION_QUEST_ID,
    QUEST_ID
  ]);
  assert.equal(history[0].progress.readyToReport, true);
  assert.equal(history[2].progress.completed, true);
});

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

test("B20F remains locked until the B19 checkpoint boss is defeated", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(isDungeonDepthUnlocked(character, 19), true);
  assert.equal(isDungeonDepthUnlocked(character, 20), false);
  character.eventFlags.boss_fallen_mage_b19f_defeated = true;
  assert.equal(isDungeonDepthUnlocked(character, 20), true);
  assert.equal(isDungeonDepthUnlocked(character, 21), true);
});

test("B30F remains locked until the B29 checkpoint boss is defeated", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(isDungeonDepthUnlocked(character, 29), true);
  assert.equal(isDungeonDepthUnlocked(character, 30), false);
  character.eventFlags.boss_iron_maiden_b29f_defeated = true;
  assert.equal(isDungeonDepthUnlocked(character, 30), true);
});

test("B40F remains locked until the B39 checkpoint boss is defeated", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(isDungeonDepthUnlocked(character, 40), false);
  character.eventFlags.boss_wicker_man_b39f_defeated = true;
  assert.equal(isDungeonDepthUnlocked(character, 40), true);
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
  const newCharacter = createInitialCharacter({ name: "TEST", job: "thief" });
  assert.equal(isQuestAvailable(newCharacter, WANDERING_DEAD_EXTERMINATION_QUEST_ID), false);
  assert.equal(acceptQuest(newCharacter, WANDERING_DEAD_EXTERMINATION_QUEST_ID).reason, "unavailable");
  let character = acceptQuest(
    unlockB2F(newCharacter),
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
    unlockB2F(createInitialCharacter({ name: "TEST", job: "priest" })),
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

test("quest 006 unlocks after quest 005 and rewards First Aid once", () => {
  let character = createInitialCharacter({ name: "TEST", job: "priest" });
  assert.equal(isQuestAvailable(character, BLACK_BOX_INVESTIGATION_QUEST_ID), false);
  character.quests.completedQuestIds.push(
    QUEST_ID,
    SLIME_EXTERMINATION_QUEST_ID,
    FLOOR_SURVEY_QUEST_ID,
    RABBIT_EXTERMINATION_QUEST_ID,
    WANDERING_DEAD_EXTERMINATION_QUEST_ID
  );
  assert.equal(isQuestAvailable(character, BLACK_BOX_INVESTIGATION_QUEST_ID), true);
  character = acceptQuest(character, BLACK_BOX_INVESTIGATION_QUEST_ID).character;
  character = recordCustomQuestProgress(character, BLACK_BOX_INVESTIGATION_QUEST_ID, 1);
  const report = reportQuest(character, BLACK_BOX_INVESTIGATION_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "common_first_aid");
  assert.equal(report.bonusGold, 400);
  assert.equal(report.character.eventFlags.black_chests_unlocked, true);
  assert.equal(getOwnedCardCount(report.character.cards, "common_first_aid"), 1);
});

test("defeating the B6 quest mimic completes quest 006", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.quests.completedQuestIds.push(
    QUEST_ID,
    SLIME_EXTERMINATION_QUEST_ID,
    FLOOR_SURVEY_QUEST_ID,
    RABBIT_EXTERMINATION_QUEST_ID,
    WANDERING_DEAD_EXTERMINATION_QUEST_ID
  );
  character = acceptQuest(character, BLACK_BOX_INVESTIGATION_QUEST_ID).character;
  character = applyBossVictory(character, "quest_mimic_b6f").character;
  character = recordBossDefeat(character, "quest_mimic_b6f", 6);
  character = recordCustomQuestProgress(character, BLACK_BOX_INVESTIGATION_QUEST_ID, 1);
  assert.equal(getQuestProgress(character, BLACK_BOX_INVESTIGATION_QUEST_ID).readyToReport, true);
  assert.equal(character.eventFlags.boss_quest_mimic_b6f_defeated, true);
});

test("quest 007 requires the B9 boss and restores progress after abandonment", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID);
  character = acceptQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  character = recordBossDefeat(character, "strange_knight_statue_b9f", 9);
  assert.equal(getQuestProgress(character, RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);
  character = abandonQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  character = acceptQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  assert.equal(getQuestProgress(character, RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);

  const report = reportQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(report.rewardCardId, "sr_ability_boost");
  assert.equal(report.bonusGold, 600);
  assert.equal(getOwnedCardCount(report.character.cards, "sr_ability_boost"), 1);
  assert.equal(reportQuest(report.character, RED_DOOR_INVESTIGATION_QUEST_ID).accepted, false);
});

test("quest 007 grants the defense card once when accepted", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID);
  const accepted = acceptQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(accepted.acceptanceRewardCardId, "rare_defense_up");
  assert.equal(getOwnedCardCount(accepted.character.cards, "rare_defense_up"), 1);
  assert.equal(accepted.character.eventFlags[RED_DOOR_DEFENSE_CARD_FLAG], true);

  const abandoned = abandonQuest(accepted.character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  const acceptedAgain = acceptQuest(abandoned, RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(acceptedAgain.acceptanceRewardCardId, null);
  assert.equal(getOwnedCardCount(acceptedAgain.character.cards, "rare_defense_up"), 1);
});

test("completed quest 007 saves receive the missing acceptance card once", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    RED_DOOR_INVESTIGATION_QUEST_ID
  );
  const rescued = grantRedDoorInvestigationSupply(character);
  assert.equal(rescued.accepted, true);
  assert.equal(rescued.gained, 1);
  assert.equal(getOwnedCardCount(rescued.character.cards, "rare_defense_up"), 1);
  assert.equal(grantRedDoorInvestigationSupply(rescued.character).reason, "alreadyReceived");
});

test("quest 007 rescues saves where the B9 boss was defeated before acceptance", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID);
  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  character = acceptQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  assert.equal(getQuestProgress(character, RED_DOOR_INVESTIGATION_QUEST_ID).progress, 1);
});

test("quest 007 rescues an already-active legacy quest after the B9 boss was defeated", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID);
  character = acceptQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).character;
  character.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  assert.equal(getQuestProgress(character, RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);
  assert.equal(reportQuest(character, RED_DOOR_INVESTIGATION_QUEST_ID).accepted, true);
});

test("quest 008 follows the queen shadow from B10F through B14F and rewards Resistance Spirit", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    RED_DOOR_INVESTIGATION_QUEST_ID
  );
  assert.equal(isQuestAvailable(character, QUEEN_SHADOW_QUEST_ID), true);
  character = acceptQuest(character, QUEEN_SHADOW_QUEST_ID).character;
  character = recordQueenShadowEncounter(character, 11);
  assert.equal(getQuestProgress(character, QUEEN_SHADOW_QUEST_ID).progress, 0);
  character = recordQueenShadowEncounter(character, 10);
  character = recordQueenShadowEncounter(character, 11);
  character = recordQueenShadowEncounter(character, 12);
  character = recordQueenShadowEncounter(character, 13);
  assert.equal(getQuestProgress(character, QUEEN_SHADOW_QUEST_ID).progress, 4);
  character = completeQueenShadowInvestigation(character);
  assert.equal(getQuestProgress(character, QUEEN_SHADOW_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, QUEEN_SHADOW_QUEST_ID);
  assert.equal(report.rewardCardId, "rare_resistance_spirit");
  assert.equal(report.bonusGold, 600);
  assert.equal(getOwnedCardCount(report.character.cards, "rare_resistance_spirit"), 1);
});

test("quest 008 keeps unique shadow progress after abandonment and reacceptance", () => {
  let character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    RED_DOOR_INVESTIGATION_QUEST_ID
  );
  character = acceptQuest(character, QUEEN_SHADOW_QUEST_ID).character;
  character = recordQueenShadowEncounter(character, 10);
  character = abandonQuest(character, QUEEN_SHADOW_QUEST_ID).character;
  character = acceptQuest(character, QUEEN_SHADOW_QUEST_ID).character;
  assert.equal(getQuestProgress(character, QUEEN_SHADOW_QUEST_ID).progress, 1);
  assert.equal(recordQueenShadowEncounter(character, 10), character);
});

test("quest 009 unlocks after quest 006 and rewards Floor Detection plus 800G", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    BLACK_BOX_INVESTIGATION_QUEST_ID
  );
  assert.equal(isQuestAvailable(character, JABBERWOCK_QUEST_ID), true);
  character = acceptQuest(character, JABBERWOCK_QUEST_ID).character;
  character = recordBossDefeat(character, "jabberwock_event_boss", 16);
  assert.equal(getQuestProgress(character, JABBERWOCK_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, JABBERWOCK_QUEST_ID);
  assert.equal(report.rewardCardId, "sr_floor_detection");
  assert.equal(report.bonusGold, 800);
  assert.equal(getOwnedCardCount(report.character.cards, "sr_floor_detection"), 1);
});

test("quest 010 requires completed quest 007 and B10F, then rewards Magic Barrier plus 1000G", () => {
  let character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    RED_DOOR_INVESTIGATION_QUEST_ID
  );
  assert.equal(isQuestAvailable(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID), false);
  character.highestDungeonDepthReached = 10;
  assert.equal(isQuestAvailable(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID), true);
  character = acceptQuest(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID).character;
  character = recordBossDefeat(character, "fallen_mage_b19f", 19);
  assert.equal(getQuestProgress(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(report.rewardCardId, "sr_magic_barrier");
  assert.equal(report.bonusGold, 1000);
  assert.equal(getOwnedCardCount(report.character.cards, "sr_magic_barrier"), 1);
});

test("quest 010 rescues saves that already defeated the B19F boss", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    RED_DOOR_INVESTIGATION_QUEST_ID
  );
  character.highestDungeonDepthReached = 19;
  character.eventFlags.boss_fallen_mage_b19f_defeated = true;
  character = acceptQuest(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID).character;
  assert.equal(getQuestProgress(character, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);
});

test("quest 012 tracks the B29F red door, Iron Maiden, and B30F arrival", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    SECOND_RED_DOOR_INVESTIGATION_QUEST_ID, THIEVES_HIDEOUT_QUEST_ID
  );
  character = acceptQuest(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).character;
  character.eventFlags.red_door_b29f_unlocked = true;
  assert.equal(getQuestProgress(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).progress, 1);
  character.eventFlags.boss_iron_maiden_b29f_defeated = true;
  assert.equal(getQuestProgress(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).progress, 2);
  character.eventFlags.shop_stock_b30f_unlocked = true;
  assert.equal(getQuestProgress(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(report.rewardCardId, "legendary_ability_boost_plus");
  assert.equal(report.bonusGold, 3000);
});

test("quest 013 supplies ten large potions, resets on leaving B35F, and rewards fireproof boots", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    THIRD_RED_DOOR_INVESTIGATION_QUEST_ID
  );
  const accepted = acceptQuest(character, B35F_SURVEY_QUEST_ID);
  character = accepted.character;
  assert.equal(accepted.acceptanceSupplyItemId, "healing_potion_large");
  assert.equal(accepted.acceptanceSupplyAmount, 10);
  const fullMap = Array.from({ length: 10 }, () => Array(10).fill(true));
  const halfMap = Array.from({ length: 5 }, () => Array(10).fill(true));
  character = recordFloorExploration(character, { depth: 35, explored: halfMap });
  assert.equal(getQuestProgress(character, B35F_SURVEY_QUEST_ID).progress, 50);
  character = recordFloorExploration(character, { depth: 34, explored: [] });
  assert.equal(getQuestProgress(character, B35F_SURVEY_QUEST_ID).progress, 0);
  character = recordFloorExploration(character, { depth: 35, explored: fullMap });
  assert.equal(getQuestProgress(character, B35F_SURVEY_QUEST_ID).readyToReport, true);
  assert.equal(character.eventFlags.achievement_b35f_100_cells, true);
  const report = reportQuest(character, B35F_SURVEY_QUEST_ID);
  assert.equal(report.rewardEquipmentId, "fireproof_boots");
  assert.equal(report.bonusGold, 2000);
  assert.equal(report.character.eventFlags.weapon_imbue_oils_shop_unlocked, true);
  assert.equal(report.character.eventFlags.weapon_imbue_oils_shop_unlocked, true);
  assert.ok(report.character.equipmentInventory.instances.some(entry => entry.equipmentId === "fireproof_boots"));
});

test("quest 017 follows quest 015, supplies fifteen large potions, and rewards coldproof boots", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(isQuestAvailable(character, B45F_SURVEY_QUEST_ID), false);
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID, "guild_015"
  );
  assert.equal(isQuestAvailable(character, B45F_SURVEY_QUEST_ID), true);
  const accepted = acceptQuest(character, B45F_SURVEY_QUEST_ID);
  character = accepted.character;
  assert.equal(accepted.acceptanceSupplyItemId, "healing_potion_large");
  assert.equal(accepted.acceptanceSupplyAmount, 15);
  const fullMap = Array.from({ length: 10 }, () => Array(10).fill(true));
  const halfMap = Array.from({ length: 5 }, () => Array(10).fill(true));
  character = recordFloorExploration(character, { depth: 45, explored: halfMap });
  assert.equal(getQuestProgress(character, B45F_SURVEY_QUEST_ID).progress, 50);
  character = recordFloorExploration(character, { depth: 44, explored: [] });
  assert.equal(getQuestProgress(character, B45F_SURVEY_QUEST_ID).progress, 0);
  character = recordFloorExploration(character, { depth: 45, explored: fullMap });
  assert.equal(getQuestProgress(character, B45F_SURVEY_QUEST_ID).readyToReport, true);
  assert.equal(character.eventFlags.achievement_b45f_100_cells, true);
  const report = reportQuest(character, B45F_SURVEY_QUEST_ID);
  assert.equal(report.rewardEquipmentId, "coldproof_boots");
  assert.equal(report.bonusGold, 4000);
  assert.ok(report.character.equipmentInventory.instances.some(entry => entry.equipmentId === "coldproof_boots"));
});

test("quest 014 is gated by quest 013, tracks the B36F Brass Bull, and unlocks Scorching Barrier sales", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.quests.completedQuestIds.push(
    QUEST_ID, SLIME_EXTERMINATION_QUEST_ID, FLOOR_SURVEY_QUEST_ID,
    THIRD_RED_DOOR_INVESTIGATION_QUEST_ID
  );
  assert.equal(isQuestAvailable(character, BRASS_BULL_QUEST_ID), false);
  character.quests.completedQuestIds.push(B35F_SURVEY_QUEST_ID);
  assert.equal(isQuestAvailable(character, BRASS_BULL_QUEST_ID), true);
  character = acceptQuest(character, BRASS_BULL_QUEST_ID).character;
  character = recordBossDefeat(character, "brass_bull_event_boss", 36);
  assert.equal(getQuestProgress(character, BRASS_BULL_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, BRASS_BULL_QUEST_ID);
  assert.equal(report.rewardItemId, "scorching_barrier");
  assert.equal(report.rewardItemAmount, 3);
  assert.equal(report.bonusGold, 5000);
  assert.equal(getItemCount(report.character.inventory, "scorching_barrier"), 3);
  assert.equal(report.character.eventFlags.scorching_barrier_shop_unlocked, true);
});

test("quest 012 hides the Iron Maiden spoiler and quest 013 supply uses an item popup", async () => {
  assert.equal(getQuestById(THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).objectiveLabel, "赤い扉を開け、中を調査する");
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /result\.acceptanceSupplyItemId[\s\S]*showNamedItemGetEffect/);
  assert.match(source, /回復薬（大）×\$\{result\.acceptanceSupplyAmount\}/);
});
