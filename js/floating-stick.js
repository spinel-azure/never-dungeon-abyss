const DEAD_ZONE = 10;
const MAX_RADIUS = 50;
const OUTER_RADIUS = 56;
const MOVE_REPEAT_MS = 90;
const TOUCH_CONTROL_MODES = Object.freeze(["auto", "on", "off"]);

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
  manualMove,
  manualTurn,
  isInputAllowed = () => true,
  onUserOperation = () => {},
  mode = "auto"
}) {
  if (!zoneEl || !stickEl) return null;

  const knob = stickEl.querySelector(".virtual-stick-knob");
  const coarsePointerQuery = globalThis.matchMedia?.("(any-pointer: coarse)") || null;
  let touchControlsMode = TOUCH_CONTROL_MODES.includes(mode) ? mode : "auto";
  let enabled = false;
  let activePointerId = null;
  let centerX = 0;
  let centerY = 0;
  let activeInputKey = null;
  let repeatTimer = null;

  function refreshEnabled() {
    enabled = resolveTouchControlsEnabled(touchControlsMode, {
      coarsePointer: Boolean(coarsePointerQuery?.matches),
      maxTouchPoints: Number(globalThis.navigator?.maxTouchPoints) || 0
    });
    document.body.classList.toggle("touch-controls-enabled", enabled);
    document.body.classList.toggle("touch-controls-disabled", !enabled);
    if (!enabled) reset();
    return enabled;
  }

  function begin(event) {
    if (!enabled || activePointerId !== null || !isInputAllowed()) return;
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
    if (repeatTimer === null) return;
    window.clearInterval(repeatTimer);
    repeatTimer = null;
  }

  function reset() {
    activePointerId = null;
    activeInputKey = null;
    stopRepeat();
    stickEl.classList.remove("is-active");
    stickEl.setAttribute("aria-hidden", "true");
    if (knob) knob.style.transform = "translate(0, 0)";
  }

  function setMode(nextMode) {
    touchControlsMode = TOUCH_CONTROL_MODES.includes(nextMode) ? nextMode : "auto";
    refreshEnabled();
  }

  const resetEvents = ["blur", "resize", "orientationchange", "pageshow", "nda:new-game", "nda:continue", "nda:load-game"];
  zoneEl.addEventListener("pointerdown", begin);
  zoneEl.addEventListener("pointermove", update);
  zoneEl.addEventListener("pointerup", end);
  zoneEl.addEventListener("pointercancel", end);
  zoneEl.addEventListener("lostpointercapture", reset);
  resetEvents.forEach(name => window.addEventListener(name, reset));
  document.addEventListener("visibilitychange", reset);
  coarsePointerQuery?.addEventListener?.("change", refreshEnabled);
  const observer = new MutationObserver(() => { if (!isInputAllowed()) reset(); });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  refreshEnabled();

  return {
    reset,
    setMode,
    getMode: () => touchControlsMode,
    isEnabled: () => enabled,
    destroy() {
      reset();
      observer.disconnect();
      zoneEl.removeEventListener("pointerdown", begin);
      zoneEl.removeEventListener("pointermove", update);
      zoneEl.removeEventListener("pointerup", end);
      zoneEl.removeEventListener("pointercancel", end);
      zoneEl.removeEventListener("lostpointercapture", reset);
      resetEvents.forEach(name => window.removeEventListener(name, reset));
      document.removeEventListener("visibilitychange", reset);
      coarsePointerQuery?.removeEventListener?.("change", refreshEnabled);
    }
  };
}

function clamp(value, minimum, maximum) {
  if (maximum < minimum) return (minimum + maximum) / 2;
  return Math.max(minimum, Math.min(maximum, value));
}
