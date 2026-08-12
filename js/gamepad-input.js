export const GAMEPAD_DEAD_ZONE = 0.5;
export const GAMEPAD_REPEAT_DELAY = 300;
export const GAMEPAD_REPEAT_INTERVAL = 120;

const DIRECTION_BUTTONS = Object.freeze({ 12: "up", 13: "down", 14: "left", 15: "right" });
const ACTION_BUTTONS = Object.freeze({ 0: "confirm", 1: "cancel", 2: "unusedX", 3: "status", 4: "pageLeft", 5: "pageRight", 8: "unusedBack", 9: "menu" });

export function createGamepadInputState() {
  return { buttons: new Map(), direction: "", directionStartedAt: 0, directionRepeatedAt: 0 };
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

export function pollGamepadActions(gamepad, state, now) {
  const actions = [];
  const direction = getGamepadDirection(gamepad);
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
  for (const [indexText, action] of Object.entries(ACTION_BUTTONS)) {
    const index = Number(indexText);
    const pressed = Boolean(gamepad?.buttons?.[index]?.pressed);
    if (pressed && !state.buttons.get(index)) actions.push(action);
    state.buttons.set(index, pressed);
  }
  return actions;
}

export function configureGamepadInput({ dispatchAction, openStatusMenu, isTextInputFocused = defaultTextInputFocused } = {}) {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return () => {};
  const states = new Map();
  let frameId = 0;
  const connected = event => console.info(`[NDA] Gamepad connected: ${event.gamepad.id}`);
  const disconnected = event => { states.delete(event.gamepad.index); console.info(`[NDA] Gamepad disconnected: ${event.gamepad.id}`); };
  window.addEventListener("gamepadconnected", connected);
  window.addEventListener("gamepaddisconnected", disconnected);
  const poll = now => {
    for (const gamepad of navigator.getGamepads() || []) {
      if (!gamepad) continue;
      const state = states.get(gamepad.index) || createGamepadInputState();
      states.set(gamepad.index, state);
      for (const action of pollGamepadActions(gamepad, state, now)) {
        if (isTextInputFocused()) continue;
        if (action === "status") openStatusMenu?.();
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
  };
}

function defaultTextInputFocused() {
  return document.activeElement instanceof Element && Boolean(document.activeElement.closest("input, select, textarea"));
}
