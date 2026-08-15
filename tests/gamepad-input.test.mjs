import test from "node:test";
import assert from "node:assert/strict";
import {
  GAMEPAD_DEAD_ZONE, GAMEPAD_REPEAT_DELAY, GAMEPAD_REPEAT_INTERVAL,
  configureGamepadInput, createGamepadInputState, getGamepadActionButtons,
  getGamepadDirection, pollGamepadActions, syncGamepadConnections
} from "../js/gamepad-input.js";

function pad({ axes = [0, 0], pressed = [], mapping = "", index = 0, id = "TEST PAD" } = {}) {
  return { axes, mapping, index, id, buttons: Array.from({ length: 16 }, (_, buttonIndex) => ({ pressed: pressed.includes(buttonIndex) })) };
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
  assert.deepEqual(pollGamepadActions(pad({ pressed: [0, 3, 9] }), state, 0), ["cancel", "minimap", "menu"]);
  assert.deepEqual(pollGamepadActions(pad({ pressed: [0, 3, 9] }), state, 16), []);
  pollGamepadActions(pad(), state, 32);
  assert.deepEqual(pollGamepadActions(pad({ pressed: [1, 4, 5] }), state, 48), ["confirm", "pageLeft", "pageRight"]);
});

test("standard mapping uses the lower button to confirm and right button to cancel", () => {
  const mapping = getGamepadActionButtons(pad({ mapping: "standard" }));
  assert.equal(mapping[0], "confirm");
  assert.equal(mapping[1], "cancel");
  const state = createGamepadInputState();
  assert.deepEqual(pollGamepadActions(pad({ mapping: "standard", pressed: [0] }), state, 0), ["confirm"]);
  pollGamepadActions(pad({ mapping: "standard" }), state, 16);
  assert.deepEqual(pollGamepadActions(pad({ mapping: "standard", pressed: [1] }), state, 32), ["cancel"]);
});

test("custom bindings override a controller mapping and keep actions unique", () => {
  const bindings = { confirm: 1, cancel: 0, minimap: 2, items: 3 };
  const mapping = getGamepadActionButtons(pad({ mapping: "standard" }), bindings);
  assert.equal(mapping[0], "cancel");
  assert.equal(mapping[1], "confirm");
  assert.equal(mapping[2], "minimap");
  assert.equal(mapping[3], "items");
  const state = createGamepadInputState();
  assert.deepEqual(pollGamepadActions(pad({ mapping: "standard", pressed: [0, 1, 2] }), state, 0, bindings), ["cancel", "confirm", "minimap"]);
});

test("resume suppression waits for neutral and prevents a held button burst", () => {
  const state = createGamepadInputState({ suppressUntilNeutral: true });
  const held = pad({ mapping: "standard", pressed: [0] });
  assert.deepEqual(pollGamepadActions(held, state, 0), []);
  assert.deepEqual(pollGamepadActions(held, state, 16), []);
  assert.deepEqual(pollGamepadActions(pad({ mapping: "standard" }), state, 32), []);
  assert.deepEqual(pollGamepadActions(held, state, 48), ["confirm"]);
});

test("connection polling announces once, removes disconnects, and permits reconnect", () => {
  const known = new Map();
  const events = [];
  const callbacks = {
    onConnected: info => events.push(`on:${info.index}:${info.id}`),
    onDisconnected: info => events.push(`off:${info.index}:${info.id}`)
  };
  const controller = pad({ mapping: "standard", index: 2, id: "DualSense Wireless Controller" });
  syncGamepadConnections([controller], known, callbacks);
  syncGamepadConnections([controller], known, callbacks);
  assert.deepEqual(events, ["on:2:DualSense Wireless Controller"]);
  syncGamepadConnections([], known, callbacks);
  syncGamepadConnections([controller], known, callbacks);
  assert.deepEqual(events, [
    "on:2:DualSense Wireless Controller",
    "off:2:DualSense Wireless Controller",
    "on:2:DualSense Wireless Controller"
  ]);
});

test("Gamepad API unsupported environments return a harmless cleanup", () => {
  const originalNavigator = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
    assert.doesNotThrow(() => configureGamepadInput()());
  } finally {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  }
});
