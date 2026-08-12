import test from "node:test";
import assert from "node:assert/strict";
import {
  GAMEPAD_DEAD_ZONE, GAMEPAD_REPEAT_DELAY, GAMEPAD_REPEAT_INTERVAL,
  createGamepadInputState, getGamepadDirection, pollGamepadActions
} from "../js/gamepad-input.js";

function pad({ axes = [0, 0], pressed = [] } = {}) {
  return { axes, buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index) })) };
}

test("left stick ignores small drift and resolves cardinal directions", () => {
  assert.equal(GAMEPAD_DEAD_ZONE, 0.5);
  assert.equal(getGamepadDirection(pad({ axes: [0.49, -0.49] })), "");
  assert.equal(getGamepadDirection(pad({ axes: [0, -0.8] })), "up");
  assert.equal(getGamepadDirection(pad({ axes: [0.9, 0.2] })), "right");
});

test("D-pad directions override stick input", () => {
  assert.equal(getGamepadDirection(pad({ axes: [0.9, 0], pressed: [14] })), "left");
  assert.equal(getGamepadDirection(pad({ pressed: [12] })), "up");
  assert.equal(getGamepadDirection(pad({ pressed: [13] })), "down");
  assert.equal(getGamepadDirection(pad({ pressed: [15] })), "right");
});

test("direction input fires immediately, waits, repeats, and rearms at neutral", () => {
  const state = createGamepadInputState();
  assert.deepEqual(pollGamepadActions(pad({ axes: [0, -1] }), state, 0), ["up"]);
  assert.deepEqual(pollGamepadActions(pad({ axes: [0, -1] }), state, GAMEPAD_REPEAT_DELAY - 1), []);
  assert.deepEqual(pollGamepadActions(pad({ axes: [0, -1] }), state, GAMEPAD_REPEAT_DELAY), ["up"]);
  assert.deepEqual(pollGamepadActions(pad({ axes: [0, -1] }), state, GAMEPAD_REPEAT_DELAY + GAMEPAD_REPEAT_INTERVAL - 1), []);
  assert.deepEqual(pollGamepadActions(pad(), state, 1000), []);
  assert.deepEqual(pollGamepadActions(pad({ axes: [0, -1] }), state, 1001), ["up"]);
});

test("buttons use rising edges and expose standard mappings", () => {
  const state = createGamepadInputState();
  assert.deepEqual(pollGamepadActions(pad({ pressed: [0, 3, 9] }), state, 0), ["confirm", "status", "menu"]);
  assert.deepEqual(pollGamepadActions(pad({ pressed: [0, 3, 9] }), state, 16), []);
  pollGamepadActions(pad(), state, 32);
  assert.deepEqual(pollGamepadActions(pad({ pressed: [1, 4, 5] }), state, 48), ["cancel", "pageLeft", "pageRight"]);
});
