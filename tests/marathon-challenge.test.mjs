import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard } from "../data/deck.js";
import { isTransferDestinationUnlocked } from "../data/transfer-destinations.js";
import {
  LONG_MARCH_COMPLETION_FLAG,
  LONG_MARCH_REQUIRED_TRANSFER_FLAG,
  LONG_MARCH_REWARD_CARD_ID,
  invalidateLongMarchChallenge,
  invalidateMarathonChallenge,
  MARATHON_COMPLETION_FLAG,
  recordLongMarchDescent,
  recordMarathonDescent,
  startLongMarchChallenge,
  startMarathonChallenge
} from "../data/marathon-challenge.js";

function descendToGoal(character, defeatedBossFloors = [9, 19, 29, 39]) {
  let next = character;
  let result = null;
  for (let fromDepth = 1; fromDepth < 42; fromDepth += 1) {
    result = recordMarathonDescent(next, {
      fromDepth,
      toDepth: fromDepth + 1,
      defeatedBossFloors
    });
    next = result.character;
  }
  return result;
}

test("the B1F to B42F marathon survives save normalization and completes in strict order", () => {
  const initial = createInitialCharacter({ name: "RUNNER", job: "thief" });
  let character = startMarathonChallenge(initial);
  character = recordMarathonDescent(character, { fromDepth: 1, toDepth: 2 }).character;
  character = normalizeCharacter(character);
  assert.deepEqual(character.marathonChallenge, { active: true, currentDepth: 2 });

  let result = null;
  for (let fromDepth = 2; fromDepth < 42; fromDepth += 1) {
    result = recordMarathonDescent(character, {
      fromDepth,
      toDepth: fromDepth + 1,
      defeatedBossFloors: [9, 19, 29, 39]
    });
    character = result.character;
  }
  assert.equal(result.completed, true);
  assert.equal(character.eventFlags[MARATHON_COMPLETION_FLAG], true);
  assert.deepEqual(character.marathonChallenge, { active: false, currentDepth: 0 });
});

test("all four checkpoint bosses are required for the marathon reward", () => {
  const character = startMarathonChallenge(createInitialCharacter({ name: "RUNNER", job: "warrior" }));
  const result = descendToGoal(character, [9, 19, 29]);
  assert.equal(result.completed, false);
  assert.deepEqual(result.missingBossFloors, [39]);
  assert.equal(result.character.eventFlags[MARATHON_COMPLETION_FLAG], undefined);
  assert.equal(result.character.marathonChallenge.active, false);
});

test("returning or breaking the sequential descent invalidates the marathon", () => {
  const initial = startMarathonChallenge(createInitialCharacter({ name: "RUNNER", job: "mage" }));
  assert.equal(invalidateMarathonChallenge(initial).marathonChallenge.active, false);
  const skipped = recordMarathonDescent(initial, { fromDepth: 1, toDepth: 3 });
  assert.equal(skipped.completed, false);
  assert.equal(skipped.character.marathonChallenge.active, false);
});

test("a completed marathon cannot be restarted", () => {
  const initial = createInitialCharacter({ name: "RUNNER", job: "priest" });
  initial.eventFlags[MARATHON_COMPLETION_FLAG] = true;
  assert.equal(startMarathonChallenge(initial).marathonChallenge.active, false);
});

test("the second long march tracks strict descent from B1F through B84F", () => {
  let character = createInitialCharacter({ name: "RUNNER", job: "thief" });
  character.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG] = true;
  character = startLongMarchChallenge(character);
  for (let fromDepth = 1; fromDepth < 84; fromDepth += 1) {
    const result = recordLongMarchDescent(character, { fromDepth, toDepth: fromDepth + 1 });
    character = result.character;
    assert.equal(result.completed, fromDepth === 83);
  }
  assert.equal(character.eventFlags[LONG_MARCH_COMPLETION_FLAG], true);
  assert.deepEqual(character.longMarchChallenge, { active: false, currentDepth: 0 });
});

test("the second long march survives saves and fails on a skipped floor", () => {
  let character = createInitialCharacter({ name: "RUNNER", job: "priest" });
  character.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG] = true;
  character = startLongMarchChallenge(character);
  character = recordLongMarchDescent(character, { fromDepth: 1, toDepth: 2 }).character;
  character = normalizeCharacter(character);
  assert.deepEqual(character.longMarchChallenge, { active: true, currentDepth: 2 });
  const skipped = recordLongMarchDescent(character, { fromDepth: 2, toDepth: 4 });
  assert.equal(skipped.completed, false);
  assert.equal(skipped.character.longMarchChallenge.active, false);
});

test("returning, defeat, and transfer entry invalidate the second long march", () => {
  let character = createInitialCharacter({ name: "STOPPER", job: "mage" });
  character.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG] = true;
  character = startLongMarchChallenge(character);
  assert.equal(invalidateLongMarchChallenge(character).longMarchChallenge.active, false);

  const source = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /completeDungeonDefeat\(\)[\s\S]*?invalidateLongMarchChallenge\(character\)/);
  assert.match(source, /enterFloorFromTransfer\(depth = 10\)[\s\S]*?invalidateLongMarchChallenge\(character\)/);
  assert.match(source, /returnToTown\([\s\S]*?invalidateLongMarchChallenge\(character\)/);
});

test("the B84F long march starts only after the B80F transfer portal is unlocked", () => {
  const locked = createInitialCharacter({ name: "RUNNER", job: "warrior" });
  assert.equal(startLongMarchChallenge(locked).longMarchChallenge.active, false);

  locked.longMarchChallenge = { active: true, currentDepth: 40 };
  assert.equal(normalizeCharacter(locked).longMarchChallenge.active, false);

  locked.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG] = true;
  assert.deepEqual(startLongMarchChallenge(locked).longMarchChallenge, { active: true, currentDepth: 1 });
  assert.equal(LONG_MARCH_REWARD_CARD_ID, "zodiac_taurus");
});

test("a legacy B79F boss clear starts the long march whenever B80F is a valid transfer destination", () => {
  const legacy = createInitialCharacter({ name: "OLD RUNNER", job: "warrior" });
  legacy.eventFlags.boss_jirene_b79f_defeated = true;

  assert.equal(isTransferDestinationUnlocked(legacy, 80), true);
  assert.deepEqual(startLongMarchChallenge(legacy).longMarchChallenge, {
    active: true,
    currentDepth: 1
  });
});

test("legacy quest 028 reports and reached B80F boss clears backfill the B80F portal flag", () => {
  const reported = createInitialCharacter({ name: "REPORT", job: "priest" });
  reported.quests.completedQuestIds.push("guild_028");
  const normalizedReported = normalizeCharacter(reported);
  assert.equal(normalizedReported.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG], true);

  const reached = createInitialCharacter({ name: "REACHED", job: "mage" });
  reached.eventFlags.boss_jirene_b79f_defeated = true;
  reached.eventFlags.floor_b80_reached = true;
  const normalizedReached = normalizeCharacter(reached);
  assert.equal(normalizedReached.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG], true);

  const unbeaten = normalizeCharacter(createInitialCharacter({ name: "NEW", job: "thief" }));
  assert.equal(unbeaten.eventFlags[LONG_MARCH_REQUIRED_TRANSFER_FLAG], undefined);
  assert.equal(startLongMarchChallenge(unbeaten).longMarchChallenge.active, false);
});

test("the town entrance route reaches B84F, grants Taurus once, and survives save normalization", () => {
  let character = createInitialCharacter({ name: "ROUTE", job: "thief" });
  character.eventFlags.boss_jirene_b79f_defeated = true;
  character.eventFlags.floor_b80_reached = true;
  character = normalizeCharacter(character);
  character = startLongMarchChallenge(character);

  for (let fromDepth = 1; fromDepth < 84; fromDepth += 1) {
    character = recordLongMarchDescent(character, {
      fromDepth,
      toDepth: fromDepth + 1
    }).character;
    if (fromDepth === 41) character = normalizeCharacter(character);
  }

  assert.equal(character.eventFlags[LONG_MARCH_COMPLETION_FLAG], true);
  const reward = grantCard(character.cards, LONG_MARCH_REWARD_CARD_ID, 1, character.deckCost);
  character = normalizeCharacter({ ...character, cards: reward.cards });
  assert.equal(reward.gained, 1);
  assert.equal(character.cards.ownedCardCounts[LONG_MARCH_REWARD_CARD_ID], 1);
  assert.equal(startLongMarchChallenge(character).longMarchChallenge.active, false);
  assert.equal(
    grantCard(character.cards, LONG_MARCH_REWARD_CARD_ID, 1, character.deckCost).gained,
    0
  );
});

test("main grants Taurus after the B84F achievement presentation", () => {
  const source = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const achievementSource = fs.readFileSync(new URL("../data/adventure-records.js", import.meta.url), "utf8");
  assert.match(source, /grantCard\(character\.cards, LONG_MARCH_REWARD_CARD_ID/);
  assert.match(source, /showCardGetEffect\(LONG_MARCH_REWARD_CARD_ID, \{ seId: "itemGet" \}\), 4300/);
  assert.match(source, /character\?\.eventFlags\?\.b1_b84_long_march_completed/);
  assert.match(source, /if \(restoredLongMarchReward\)/);
  assert.match(achievementSource, /\["longMarch84", "深淵への大行軍再び", flags\.b1_b84_long_march_completed/);
});
