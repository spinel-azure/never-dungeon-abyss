import test from "node:test";
import assert from "node:assert/strict";

import {
  ANASTASIA_OUTFIT_EVENT_FLAG,
  isAnastasiaFestivalSunday,
  isAnastasiaOutfitEventPending,
  shouldUseAnastasiaFestivalPortrait
} from "../data/anastasia-event.js";

function characterWithFlags(...flags) {
  return { eventFlags: Object.fromEntries(flags.map(flag => [flag, true])) };
}

test("Anastasia's hidden outfit waits for both her assignment and the five-hundred-donation rumor", () => {
  assert.equal(isAnastasiaOutfitEventPending(characterWithFlags("tavern_rumor_005_base_read")), false);
  const pending = characterWithFlags("tavern_rumor_004_base_read", "tavern_rumor_005_base_read");
  assert.equal(isAnastasiaOutfitEventPending(pending), true);
  assert.equal(shouldUseAnastasiaFestivalPortrait(pending, new Date("2026-08-19T12:00:00")), true);
  pending.eventFlags[ANASTASIA_OUTFIT_EVENT_FLAG] = true;
  assert.equal(isAnastasiaOutfitEventPending(pending), false);
});

test("the unlocked outfit and walking-picture suppression apply only on real Sundays", () => {
  const character = characterWithFlags(ANASTASIA_OUTFIT_EVENT_FLAG);
  assert.equal(isAnastasiaFestivalSunday(character, new Date("2026-08-23T12:00:00")), true);
  assert.equal(isAnastasiaFestivalSunday(character, new Date("2026-08-24T12:00:00")), false);
  assert.equal(shouldUseAnastasiaFestivalPortrait(character, new Date("2026-08-23T12:00:00")), true);
  assert.equal(shouldUseAnastasiaFestivalPortrait(character, new Date("2026-08-24T12:00:00")), false);
});
