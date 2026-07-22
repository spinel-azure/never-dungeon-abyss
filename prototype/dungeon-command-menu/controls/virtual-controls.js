export function bindVirtualControls({ stick, buttonA, buttonB, onDirection, onConfirm, onCancel }) {
  const knob = stick.querySelector(".virtual-stick-knob"); let pointerId = null; let centerX = 0; let centerY = 0; let lastDirection = "";
  function directionFor(dx, dy) { if (Math.hypot(dx, dy) < 24) return ""; if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right"; return dy < 0 ? "up" : "down"; }
  function update(event) {
    if (event.pointerId !== pointerId) return; event.preventDefault(); const dx = event.clientX - centerX; const dy = event.clientY - centerY; const distance = Math.hypot(dx, dy); const scale = distance > 34 ? 34 / distance : 1; knob.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
    const direction = directionFor(dx, dy); if (direction && direction !== lastDirection) onDirection(direction); lastDirection = direction;
  }
  function release(event) { if (event.pointerId !== pointerId) return; pointerId = null; lastDirection = ""; knob.style.transform = "translate(0,0)"; }
  stick.addEventListener("pointerdown", (event) => { pointerId = event.pointerId; lastDirection = ""; const rect = stick.getBoundingClientRect(); centerX = rect.left + rect.width / 2; centerY = rect.top + rect.height / 2; stick.setPointerCapture(pointerId); update(event); });
  stick.addEventListener("pointermove", update); stick.addEventListener("pointerup", release); stick.addEventListener("pointercancel", release);
  buttonA.addEventListener("click", onConfirm); buttonB.addEventListener("click", onCancel);
}
