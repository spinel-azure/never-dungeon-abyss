import test from "node:test";
import assert from "node:assert/strict";
import {
  configurePresence,
  getPresence,
  getPresenceSuppressedSteps,
  onExplorationStep,
  onPlayerStep,
  resetPresence,
  suppressPresence
} from "../js/presence.js";

function walkNormalSteps(count) {
  for (let step = 0; step < count; step += 1) {
    onPlayerStep({ inDarkness: false, random: () => 0 });
  }
}

test("normal player steps update the same presence observed by the HUD and encounter hook", () => {
  let encounters = 0;
  configurePresence({ onEncounter: () => { encounters += 1; } });
  resetPresence();

  walkNormalSteps(1);
  assert.equal(getPresence(), 4);
  walkNormalSteps(23);
  assert.equal(getPresence(), 96);
  assert.equal(encounters, 0);

  walkNormalSteps(1);
  assert.equal(getPresence(), 100);
  assert.equal(encounters, 1);
  walkNormalSteps(5);
  assert.equal(encounters, 1);
});

test("Auto Walker freezes presence until automatic travel ends", () => {
  resetPresence();
  walkNormalSteps(5);
  assert.equal(getPresence(), 20);

  for (let step = 0; step < 20; step += 1) {
    assert.equal(onExplorationStep({ autoWalkerActive: true, random: () => 0 }), false);
  }
  assert.equal(getPresence(), 20);

  onExplorationStep({ autoWalkerActive: false, random: () => 0 });
  assert.equal(getPresence(), 24);
  resetPresence();
});

test("exorcism talisman suppresses exactly 30 steps and growth resumes on step 31", () => {
  resetPresence();
  suppressPresence(30);

  walkNormalSteps(30);
  assert.equal(getPresence(), 0);
  assert.equal(getPresenceSuppressedSteps(), 0);

  walkNormalSteps(1);
  assert.equal(getPresence(), 4);
  resetPresence();
});
