import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  invalidateMarathonChallenge,
  MARATHON_COMPLETION_FLAG,
  recordMarathonDescent,
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
