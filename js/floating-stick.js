const DEAD_ZONE = 10;
const MAX_RADIUS = 50;
const OUTER_RADIUS = 56;
const MOVE_REPEAT_MS = 90;
const DPAD_REPEAT_DELAY_MS = 300;
const DPAD_REPEAT_MS = 120;
const TOUCH_CONTROL_MODES = Object.freeze(["auto", "on", "off"]);
export const DEFAULT_TOUCH_MOVEMENT_MODE = "dpad";
const TOUCH_MOVEMENT_MODES = Object.freeze([DEFAULT_TOUCH_MOVEMENT_MODE, "stick"]);

export function normalizeTouchMovementMode(mode) {
  return TOUCH_MOVEMENT_MODES.includes(mode) ? mode : DEFAULT_TOUCH_MOVEMENT_MODE;
}

export function resolveTouchMovementUi({
  touchControlsEnabled = false,
  requestedMode = DEFAULT_TOUCH_MOVEMENT_MODE,
  layout = "pc"
} = {}) {
  const touchLayout = layout === "mobile" || layout === "tablet";
  const movementMode = touchLayout ? normalizeTouchMovementMode(requestedMode) : "stick";
  return {
    movementMode,
    dpadEnabled: Boolean(touchControlsEnabled && touchLayout && movementMode === "dpad"),
    stickEnabled: Boolean(touchControlsEnabled && (!touchLayout || movementMode === "stick"))
  };
}

export function getTouchDpadAction(direction) {
  return ({ up: "up", down: "down", left: "left", right: "right" })[direction] || "";
}

export function resolveTouchControlsEnabled(mode = "auto", capabilities = {}) {
  if (mode === "on") return true;
  if (mode === "off") return false;
  const coarsePointer = capabilities.coarsePointer
    ?? globalThis.matchMedia?.("(any-pointer: coarse)")?.matches
    ?? false;
  const maxTouchPoints = capabilities.maxTouchPoints
    ?? globalThis.navigator?.maxTouchPoints
    ?? 0;
  return Boolean(coarsePointer && maxTouchPoints > 0);
}

export function normalizeFloatingStickInput(dx, dy, { deadZone = DEAD_ZONE, maxRadius = MAX_RADIUS } = {}) {
  const distance = Math.hypot(dx, dy);
  if (distance < deadZone) return { x: 0, y: 0, distance, active: false };
  const scale = distance > maxRadius ? maxRadius / distance : 1;
  return { x: dx * scale / maxRadius, y: dy * scale / maxRadius, distance, active: true };
}

export function configureFloatingStick({
  zoneEl,
  stickEl,
  dpadEl = null,
  manualMove,
  manualTurn,
  isInputAllowed = () => true,
  onUserOperation = () => {},
  mode = "auto",
  movementMode = DEFAULT_TOUCH_MOVEMENT_MODE
}) {
  if (!zoneEl || !stickEl) return null;

  const knob = stickEl.querySelector(".virtual-stick-knob");
  const coarsePointerQuery = globalThis.matchMedia?.("(any-pointer: coarse)") || null;
  let touchControlsMode = TOUCH_CONTROL_MODES.includes(mode) ? mode : "auto";
  let touchMovementMode = normalizeTouchMovementMode(movementMode);
  let enabled = false;
  let stickEnabled = false;
  let dpadEnabled = false;
  let activePointerId = null;
  let activeDpadButton = null;
  let centerX = 0;
  let centerY = 0;
  let activeInputKey = null;
  let repeatTimer = null;
  let repeatDelayTimer = null;

  function getLayout() {
    if (document.body.classList.contains("layout-mobile")) return "mobile";
    if (document.body.classList.contains("layout-tablet")) return "tablet";
    return "pc";
  }

  function refreshEnabled() {
    enabled = resolveTouchControlsEnabled(touchControlsMode, {
      coarsePointer: Boolean(coarsePointerQuery?.matches),
      maxTouchPoints: Number(globalThis.navigator?.maxTouchPoints) || 0
    });
    const movementUi = resolveTouchMovementUi({
      touchControlsEnabled: enabled,
      requestedMode: touchMovementMode,
      layout: getLayout()
    });
    stickEnabled = movementUi.stickEnabled;
    dpadEnabled = movementUi.dpadEnabled;
    document.body.classList.toggle("touch-controls-enabled", enabled);
    document.body.classList.toggle("touch-controls-disabled", !enabled);
    document.body.classList.toggle("touch-movement-dpad", movementUi.movementMode === "dpad");
    document.body.classList.toggle("touch-movement-stick", movementUi.movementMode === "stick");
    zoneEl.hidden = !stickEnabled;
    if (dpadEl) {
      dpadEl.hidden = !dpadEnabled;
      dpadEl.setAttribute("aria-hidden", String(!dpadEnabled));
    }
    if (!stickEnabled && activeDpadButton === null) reset();
    if (!dpadEnabled && activeDpadButton !== null) reset();
    return enabled;
  }

  function begin(event) {
    if (!stickEnabled || activePointerId !== null || !isInputAllowed()) return;
    if (event.pointerType && event.pointerType !== "touch" && event.pointerType !== "pen") return;
    event.preventDefault();
    onUserOperation();
    activePointerId = event.pointerId;
    const rect = zoneEl.getBoundingClientRect();
    centerX = clamp(event.clientX, rect.left + OUTER_RADIUS, rect.right - OUTER_RADIUS);
    centerY = clamp(event.clientY, rect.top + OUTER_RADIUS, rect.bottom - OUTER_RADIUS);
    stickEl.style.left = `${centerX - rect.left}px`;
    stickEl.style.top = `${centerY - rect.top}px`;
    stickEl.classList.add("is-active");
    stickEl.setAttribute("aria-hidden", "false");
    zoneEl.setPointerCapture?.(event.pointerId);
    updateAt(event.clientX, event.clientY);
  }

  function update(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    if (!isInputAllowed()) return reset();
    updateAt(event.clientX, event.clientY);
  }

  function end(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    if (zoneEl.hasPointerCapture?.(event.pointerId)) zoneEl.releasePointerCapture(event.pointerId);
    reset();
  }

  function updateAt(clientX, clientY) {
    const vector = normalizeFloatingStickInput(clientX - centerX, clientY - centerY);
    if (knob) knob.style.transform = `translate(${vector.x * MAX_RADIUS}px, ${vector.y * MAX_RADIUS}px)`;
    handleVector(vector);
  }

  function handleVector(vector) {
    if (!vector.active) {
      activeInputKey = null;
      stopRepeat();
      return;
    }
    const horizontal = Math.abs(vector.x) > Math.abs(vector.y);
    const inputKey = horizontal ? `turn:${vector.x < 0 ? -1 : 1}` : `move:${vector.y < 0 ? 1 : -1}`;
    if (inputKey === activeInputKey) return;
    activeInputKey = inputKey;
    stopRepeat();
    const [type, rawAmount] = inputKey.split(":");
    const amount = Number(rawAmount);
    if (type === "turn") return void manualTurn(amount);
    performMove(amount);
    repeatTimer = window.setInterval(() => performMove(amount), MOVE_REPEAT_MS);
  }

  function performMove(amount) {
    if (!isInputAllowed()) return reset();
    manualMove(amount);
  }

  function stopRepeat() {
    if (repeatDelayTimer !== null) {
      window.clearTimeout(repeatDelayTimer);
      repeatDelayTimer = null;
    }
    if (repeatTimer !== null) {
      window.clearInterval(repeatTimer);
      repeatTimer = null;
    }
  }

  function reset() {
    const pointerId = activePointerId;
    const dpadButton = activeDpadButton;
    activePointerId = null;
    dpadButton?.classList.remove("is-pressed");
    activeDpadButton = null;
    activeInputKey = null;
    stopRepeat();
    if (pointerId !== null && dpadButton?.hasPointerCapture?.(pointerId)) {
      dpadButton.releasePointerCapture(pointerId);
    }
    stickEl.classList.remove("is-active");
    stickEl.setAttribute("aria-hidden", "true");
    if (knob) knob.style.transform = "translate(0, 0)";
  }

  function setMode(nextMode) {
    touchControlsMode = TOUCH_CONTROL_MODES.includes(nextMode) ? nextMode : "auto";
    reset();
    refreshEnabled();
  }

  function setMovementMode(nextMode) {
    touchMovementMode = normalizeTouchMovementMode(nextMode);
    reset();
    refreshEnabled();
  }

  function dispatchDpadAction(action) {
    if (!isInputAllowed()) {
      reset();
      return;
    }
    if (action === "up") manualMove(1);
    else if (action === "down") manualMove(-1);
    else if (action === "left") manualTurn(-1);
    else if (action === "right") manualTurn(1);
  }

  function beginDpad(event) {
    const button = event.currentTarget;
    const action = getTouchDpadAction(button?.dataset?.touchDirection);
    if (!dpadEnabled || !action || activePointerId !== null || !isInputAllowed()) return;
    event.preventDefault();
    event.stopPropagation();
    onUserOperation();
    activePointerId = event.pointerId;
    activeDpadButton = button;
    activeInputKey = `dpad:${action}`;
    button.classList.add("is-pressed");
    button.setPointerCapture?.(event.pointerId);
    dispatchDpadAction(action);
    repeatDelayTimer = window.setTimeout(() => {
      repeatDelayTimer = null;
      if (activePointerId !== event.pointerId || activeInputKey !== `dpad:${action}`) return;
      repeatTimer = window.setInterval(() => dispatchDpadAction(action), DPAD_REPEAT_MS);
    }, DPAD_REPEAT_DELAY_MS);
  }

  function moveDpad(event) {
    if (event.pointerId !== activePointerId || event.currentTarget !== activeDpadButton) return;
    event.preventDefault();
    const rect = activeDpadButton.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) reset();
  }

  function endDpad(event) {
    if (event.pointerId !== activePointerId || event.currentTarget !== activeDpadButton) return;
    event.preventDefault();
    reset();
  }

  const preventContextMenu = event => event.preventDefault();
  const dpadButtons = dpadEl ? [...dpadEl.querySelectorAll("[data-touch-direction]")] : [];
  dpadButtons.forEach(button => {
    button.addEventListener("pointerdown", beginDpad);
    button.addEventListener("pointermove", moveDpad);
    button.addEventListener("pointerup", endDpad);
    button.addEventListener("pointercancel", endDpad);
    button.addEventListener("lostpointercapture", reset);
    button.addEventListener("contextmenu", preventContextMenu);
  });

  const resetEvents = ["blur", "resize", "orientationchange", "pageshow", "nda:new-game", "nda:continue", "nda:load-game"];
  zoneEl.addEventListener("pointerdown", begin);
  zoneEl.addEventListener("pointermove", update);
  zoneEl.addEventListener("pointerup", end);
  zoneEl.addEventListener("pointercancel", end);
  zoneEl.addEventListener("lostpointercapture", reset);
  resetEvents.forEach(name => window.addEventListener(name, refreshAfterReset));
  document.addEventListener("visibilitychange", reset);
  coarsePointerQuery?.addEventListener?.("change", refreshEnabled);
  const observer = new MutationObserver(() => {
    if (!isInputAllowed()) reset();
    refreshEnabled();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  refreshEnabled();

  function refreshAfterReset() {
    reset();
    refreshEnabled();
  }

  return {
    reset,
    setMode,
    setMovementMode,
    getMode: () => touchControlsMode,
    getMovementMode: () => touchMovementMode,
    isEnabled: () => enabled,
    isDpadEnabled: () => dpadEnabled,
    isStickEnabled: () => stickEnabled,
    destroy() {
      reset();
      observer.disconnect();
      zoneEl.removeEventListener("pointerdown", begin);
      zoneEl.removeEventListener("pointermove", update);
      zoneEl.removeEventListener("pointerup", end);
      zoneEl.removeEventListener("pointercancel", end);
      zoneEl.removeEventListener("lostpointercapture", reset);
      resetEvents.forEach(name => window.removeEventListener(name, refreshAfterReset));
      document.removeEventListener("visibilitychange", reset);
      coarsePointerQuery?.removeEventListener?.("change", refreshEnabled);
      dpadButtons.forEach(button => {
        button.removeEventListener("pointerdown", beginDpad);
        button.removeEventListener("pointermove", moveDpad);
        button.removeEventListener("pointerup", endDpad);
        button.removeEventListener("pointercancel", endDpad);
        button.removeEventListener("lostpointercapture", reset);
        button.removeEventListener("contextmenu", preventContextMenu);
      });
    }
  };
}

function clamp(value, minimum, maximum) {
  if (maximum < minimum) return (minimum + maximum) / 2;
  return Math.max(minimum, Math.min(maximum, value));
}
