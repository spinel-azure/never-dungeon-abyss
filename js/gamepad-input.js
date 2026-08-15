export const GAMEPAD_DEAD_ZONE = 0.5;
export const GAMEPAD_REPEAT_DELAY = 300;
export const GAMEPAD_REPEAT_INTERVAL = 120;

const DIRECTION_BUTTONS = Object.freeze({ 12: "up", 13: "down", 14: "left", 15: "right" });
const STANDARD_ACTION_BUTTONS = Object.freeze({ 0: "confirm", 1: "cancel", 2: "unusedX", 3: "minimap", 4: "pageLeft", 5: "pageRight", 8: "unusedBack", 9: "menu" });
const LEGACY_ACTION_BUTTONS = Object.freeze({ 0: "cancel", 1: "confirm", 2: "unusedX", 3: "minimap", 4: "pageLeft", 5: "pageRight", 8: "unusedBack", 9: "menu" });

export function createGamepadInputState({ suppressUntilNeutral = false } = {}) {
  return { buttons: new Map(), direction: "", directionStartedAt: 0, directionRepeatedAt: 0, suppressUntilNeutral };
}

export function normalizeGamepadBindings(bindings) {
  const defaults = { confirm: null, cancel: null, minimap: null };
  const used = new Set();
  for (const action of Object.keys(defaults)) {
    const rawButton = bindings?.[action];
    const button = rawButton === null || rawButton === undefined ? NaN : Number(rawButton);
    if (Number.isInteger(button) && button >= 0 && button <= 3 && !used.has(button)) {
      defaults[action] = button;
      used.add(button);
    }
  }
  return defaults;
}

export function getGamepadActionButtons(gamepad, bindings) {
  const base = gamepad?.mapping === "standard" ? STANDARD_ACTION_BUTTONS : LEGACY_ACTION_BUTTONS;
  const normalized = normalizeGamepadBindings(bindings);
  if (Object.values(normalized).every(button => button === null)) return base;
  const mapped = { ...base };
  for (const index of [0, 1, 2, 3]) {
    if (["confirm", "cancel", "minimap"].includes(mapped[index])) mapped[index] = "unused";
  }
  for (const [action, button] of Object.entries(normalized)) {
    if (button !== null) mapped[button] = action;
  }
  return mapped;
}

export function getGamepadDirection(gamepad, deadZone = GAMEPAD_DEAD_ZONE) {
  for (const [index, action] of Object.entries(DIRECTION_BUTTONS)) {
    if (gamepad?.buttons?.[Number(index)]?.pressed) return action;
  }
  const x = Number(gamepad?.axes?.[0]) || 0;
  const y = Number(gamepad?.axes?.[1]) || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < deadZone) return "";
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
}

export function pollGamepadActions(gamepad, state, now, bindings) {
  const actions = [];
  const direction = getGamepadDirection(gamepad);
  const actionButtons = getGamepadActionButtons(gamepad, bindings);
  if (state.suppressUntilNeutral) {
    const anyButtonPressed = Object.keys(actionButtons).some(index => gamepad?.buttons?.[Number(index)]?.pressed);
    state.direction = direction;
    for (const index of Object.keys(actionButtons)) {
      state.buttons.set(Number(index), Boolean(gamepad?.buttons?.[Number(index)]?.pressed));
    }
    if (direction || anyButtonPressed) return actions;
    state.suppressUntilNeutral = false;
    state.buttons.clear();
    return actions;
  }
  if (!direction) state.direction = "";
  else if (direction !== state.direction) {
    state.direction = direction;
    state.directionStartedAt = now;
    state.directionRepeatedAt = now;
    actions.push(direction);
  } else if (now - state.directionStartedAt >= GAMEPAD_REPEAT_DELAY && now - state.directionRepeatedAt >= GAMEPAD_REPEAT_INTERVAL) {
    state.directionRepeatedAt = now;
    actions.push(direction);
  }
  for (const [indexText, action] of Object.entries(actionButtons)) {
    const index = Number(indexText);
    const pressed = Boolean(gamepad?.buttons?.[index]?.pressed);
    if (pressed && !state.buttons.get(index)) actions.push(action);
    state.buttons.set(index, pressed);
  }
  return actions;
}

export function syncGamepadConnections(gamepads, connectedGamepads, { onConnected, onDisconnected } = {}) {
  const present = new Set();
  for (const gamepad of gamepads || []) {
    if (!gamepad) continue;
    present.add(gamepad.index);
    if (connectedGamepads.has(gamepad.index)) continue;
    const info = { index: gamepad.index, id: String(gamepad.id || "GAMEPAD"), mapping: String(gamepad.mapping || "") };
    connectedGamepads.set(gamepad.index, info);
    onConnected?.(info);
  }
  for (const [index, info] of connectedGamepads) {
    if (present.has(index)) continue;
    connectedGamepads.delete(index);
    onDisconnected?.(info);
  }
}

export function configureGamepadInput({ dispatchAction, toggleMinimap, onConnectionChange, getBindings = () => null, isTextInputFocused = defaultTextInputFocused } = {}) {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return () => {};
  const states = new Map();
  const connectedGamepads = new Map();
  let frameId = 0;
  const announceConnected = info => {
    console.info(`[NDA] Gamepad connected: ${info.id}`);
    onConnectionChange?.({ connected: true, ...info });
  };
  const announceDisconnected = info => {
    console.info(`[NDA] Gamepad disconnected: ${info.id}`);
    onConnectionChange?.({ connected: false, ...info });
  };
  const getGamepads = () => {
    try { return Array.from(navigator.getGamepads() || []); }
    catch (error) { console.warn("[NDA] Gamepad polling failed.", error); return []; }
  };
  const syncConnections = gamepads => syncGamepadConnections(gamepads, connectedGamepads, {
    onConnected: info => {
      states.set(info.index, createGamepadInputState({ suppressUntilNeutral: true }));
      announceConnected(info);
    },
    onDisconnected: info => {
      states.delete(info.index);
      announceDisconnected(info);
    }
  });
  const connected = event => syncConnections([...(getGamepads().filter(Boolean)), event.gamepad]);
  const disconnected = event => {
    const info = connectedGamepads.get(event.gamepad.index);
    if (!info) return;
    connectedGamepads.delete(event.gamepad.index);
    states.delete(event.gamepad.index);
    announceDisconnected(info);
  };
  const resetInputStates = () => {
    states.clear();
    for (const gamepad of getGamepads()) {
      if (gamepad) states.set(gamepad.index, createGamepadInputState({ suppressUntilNeutral: true }));
    }
  };
  const resume = () => {
    if (document.visibilityState === "hidden") return;
    resetInputStates();
    syncConnections(getGamepads());
  };
  const wakeAfterUserGesture = () => syncConnections(getGamepads());
  window.addEventListener("gamepadconnected", connected);
  window.addEventListener("gamepaddisconnected", disconnected);
  window.addEventListener("focus", resume);
  window.addEventListener("pageshow", resume);
  window.addEventListener("pointerdown", wakeAfterUserGesture, { passive: true });
  window.addEventListener("touchstart", wakeAfterUserGesture, { passive: true });
  document.addEventListener("visibilitychange", resume);
  const poll = now => {
    const gamepads = getGamepads();
    syncConnections(gamepads);
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      const state = states.get(gamepad.index) || createGamepadInputState({ suppressUntilNeutral: true });
      states.set(gamepad.index, state);
      for (const action of pollGamepadActions(gamepad, state, now, getBindings())) {
        if (isTextInputFocused()) continue;
        if (action === "minimap") toggleMinimap?.();
        else if (action === "menu") dispatchAction?.("cancel");
        else if (action === "pageLeft") dispatchAction?.("left");
        else if (action === "pageRight") dispatchAction?.("right");
        else if (!action.startsWith("unused")) dispatchAction?.(action);
      }
    }
    frameId = requestAnimationFrame(poll);
  };
  frameId = requestAnimationFrame(poll);
  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("gamepadconnected", connected);
    window.removeEventListener("gamepaddisconnected", disconnected);
    window.removeEventListener("focus", resume);
    window.removeEventListener("pageshow", resume);
    window.removeEventListener("pointerdown", wakeAfterUserGesture);
    window.removeEventListener("touchstart", wakeAfterUserGesture);
    document.removeEventListener("visibilitychange", resume);
    states.clear();
    connectedGamepads.clear();
  };
}

function defaultTextInputFocused() {
  return document.activeElement instanceof Element && Boolean(document.activeElement.closest("input, select, textarea"));
}
