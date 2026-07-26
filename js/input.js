export function configureInput({
  forwardBtn,
  backBtn,
  leftBtn,
  rightBtn,
  autoReturnBtn,
  randomGenerateBtn,
  manualMove,
  manualTurn,
  startAutoReturn,
  generateRandomDungeon,
  buttonA,
  buttonB,
  commandRoot,
  openStatusMenu = () => {},
  handleSkillInput = () => false,
  handleOverlayInput = () => false,
  handleBattleInput = () => false,
  handleTownInput = () => false,
  handleDoorInput = () => false,
  handleMenuInput
}) {
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof Element && e.target.closest("input, select, textarea")) return;
    const skillAction = keyAction(e);
    if (skillAction && handleSkillInput(skillAction)) { e.preventDefault(); return; }
    if (e.key === "ArrowUp" && handleBattleInput("up")) { e.preventDefault(); return; }
    if (e.key === "ArrowDown" && handleBattleInput("down")) { e.preventDefault(); return; }
    if (e.key === "ArrowLeft" && handleBattleInput("left")) { e.preventDefault(); return; }
    if (e.key === "ArrowRight" && handleBattleInput("right")) { e.preventDefault(); return; }
    if (e.code === "KeyX" && handleBattleInput("confirm")) { e.preventDefault(); return; }
    if (e.code === "KeyZ" && handleBattleInput("cancel")) { e.preventDefault(); return; }
    if (e.key === "ArrowUp" && handleTownInput("up")) { e.preventDefault(); return; }
    if (e.key === "ArrowDown" && handleTownInput("down")) { e.preventDefault(); return; }
    if (e.key === "ArrowLeft" && handleTownInput("left")) { e.preventDefault(); return; }
    if (e.key === "ArrowRight" && handleTownInput("right")) { e.preventDefault(); return; }
    if (e.code === "KeyX" && handleTownInput("confirm")) { e.preventDefault(); return; }
    if (e.code === "KeyZ" && handleTownInput("cancel")) { e.preventDefault(); return; }
    if (handleOverlayInput("dismiss")) { e.preventDefault(); return; }
    if (e.key === "ArrowUp" && handleMenuInput("up")) { e.preventDefault(); return; }
    if (e.key === "ArrowDown" && handleMenuInput("down")) { e.preventDefault(); return; }
    if (e.key === "ArrowLeft" && handleMenuInput("left")) { e.preventDefault(); return; }
    if (e.key === "ArrowRight" && handleMenuInput("right")) { e.preventDefault(); return; }
    if (e.code === "KeyX" && (handleOverlayInput("confirm") || handleMenuInput("confirm") || handleDoorInput())) { e.preventDefault(); return; }
    if (e.code === "KeyZ" && (handleOverlayInput("cancel") || handleMenuInput("cancel"))) { e.preventDefault(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); manualMove(1); }
    if (e.key === "ArrowDown") { e.preventDefault(); manualMove(-1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); manualTurn(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); manualTurn(1); }
  }, { passive: false });

  bindControl(forwardBtn, () => handleSkillInput("up") || handleOverlayInput("dismiss") || manualMove(1));
  bindControl(backBtn, () => handleSkillInput("down") || handleOverlayInput("dismiss") || manualMove(-1));
  bindControl(leftBtn, () => handleSkillInput("left") || handleOverlayInput("dismiss") || manualTurn(-1));
  bindControl(rightBtn, () => handleSkillInput("right") || handleOverlayInput("dismiss") || manualTurn(1));
  bindControl(autoReturnBtn, () => handleSkillInput("cancel") || handleOverlayInput("dismiss") || startAutoReturn());
  bindControl(randomGenerateBtn, () => handleSkillInput("cancel") || handleOverlayInput("dismiss") || generateRandomDungeon());
  bindControl(buttonA, () => handleSkillInput("confirm") || handleBattleInput("confirm") || handleTownInput("confirm") || handleOverlayInput("confirm") || handleMenuInput("confirm") || handleDoorInput());
  bindControl(buttonB, () => handleSkillInput("cancel") || handleBattleInput("cancel") || handleTownInput("cancel") || handleOverlayInput("cancel") || handleMenuInput("cancel"));
  configureCommandMouseButtons({
    commandRoot,
    confirm: () => handleSkillInput("confirm") || handleBattleInput("confirm") || handleTownInput("confirm") || handleOverlayInput("confirm") || handleMenuInput("confirm") || handleDoorInput(),
    cancel: () => handleSkillInput("cancel") || handleBattleInput("cancel") || handleTownInput("cancel") || handleOverlayInput("cancel") || handleMenuInput("cancel"),
    status: () => {
      if (handleSkillInput("cancel")) {
        openStatusMenu();
        return true;
      }
      if (handleBattleInput("cancel")) {
        openStatusMenu();
        return true;
      }
      openStatusMenu();
      return true;
    }
  });
  configureTouchGuards();
}

function keyAction(event) {
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  if (event.key === "ArrowLeft") return "left";
  if (event.key === "ArrowRight") return "right";
  if (event.code === "KeyX") return "confirm";
  if (event.code === "KeyZ") return "cancel";
  return "";
}

function configureCommandMouseButtons({ commandRoot, confirm, cancel, status }) {
  if (!commandRoot) return;
  let suppressClickUntil = 0;

  commandRoot.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || !event.target.closest("button")) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickUntil = performance.now() + 500;
    if (event.button === 2) confirm();
    else if (event.button === 0) cancel();
    else if (event.button === 1) status();
  }, { capture: true });

  commandRoot.addEventListener("click", event => {
    if (performance.now() > suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });

  commandRoot.addEventListener("auxclick", event => {
    if (!event.target.closest("button")) return;
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });

  commandRoot.addEventListener("contextmenu", event => {
    if (!event.target.closest("button")) return;
    event.preventDefault();
  });
}

function bindControl(el, action) {
  let handledTouch = false;

  function isTouchLayout() {
    return document.body.classList.contains("layout-mobile")
      || document.body.classList.contains("layout-tablet");
  }

  el.addEventListener("touchend", (e) => {
    if (!isTouchLayout()) return;
    e.preventDefault();
    e.stopPropagation();
    handledTouch = true;
    action();
    window.setTimeout(() => {
      handledTouch = false;
    }, 350);
  }, { passive: false });

  el.addEventListener("click", (e) => {
    if (handledTouch) {
      e.preventDefault();
      return;
    }
    action();
  });
}

function configureTouchGuards() {
  const guardedSelector = ".shell, .game, .controls, .pad, button, canvas, .virtual-stick, .virtual-stick *, .action-buttons, .action-button";
  let lastTouchEnd = 0;
  let lastTouchStart = 0;

  function isTouchLayout() {
    return document.body.classList.contains("layout-mobile")
      || document.body.classList.contains("layout-tablet");
  }

  function isGuardedTarget(target) {
    return target instanceof Element
      && !target.closest("input, select, textarea, .guild-registration")
      && !target.closest(".dungeon-commands button")
      && !target.closest(".menu-screen")
      && !!target.closest(guardedSelector);
  }

  function preventGuardedTouch(e) {
    if (!isTouchLayout() || !isGuardedTarget(e.target)) return;
    e.preventDefault();
  }

  document.addEventListener("touchstart", (e) => {
    if (!isTouchLayout() || !isGuardedTarget(e.target)) return;
    const now = Date.now();
    e.preventDefault();
    if (now - lastTouchStart <= 300) e.stopPropagation();
    lastTouchStart = now;
  }, { passive: false });

  document.addEventListener("touchmove", preventGuardedTouch, { passive: false });

  document.addEventListener("touchend", (e) => {
    if (!isTouchLayout() || !isGuardedTarget(e.target)) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  ["gesturestart", "gesturechange", "gestureend", "selectstart", "dragstart"].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (e.target instanceof Element && e.target.closest("input, select, textarea, .guild-registration")) return;
      if (isTouchLayout()) e.preventDefault();
    }, { passive: false });
  });

  document.querySelectorAll(".virtual-stick, .action-buttons, .pad, button, canvas").forEach((el) => {
    el.addEventListener("contextmenu", (e) => {
      if (isTouchLayout()) e.preventDefault();
    });
  });
}
