import { PROLOGUE_CONFIG, PROLOGUE_PARAGRAPHS } from "../data/prologue.js";

const wait = duration => new Promise(resolve => window.setTimeout(resolve, duration));

export function createPrologueController({ screen, text, silhouette, flash, skipButton, onComplete }) {
  let running = false;
  let paused = false;
  let skipArmed = false;
  let offset = 0;
  let previousTime = 0;
  let frameId = 0;
  const triggeredCues = new Set();

  function renderText() {
    text.replaceChildren(...PROLOGUE_PARAGRAPHS.map(paragraph => {
      const element = document.createElement("p");
      element.textContent = paragraph.text;
      if (paragraph.cue) element.dataset.prologueCue = paragraph.cue;
      return element;
    }));
  }

  function start() {
    stop(false);
    renderText();
    running = true;
    paused = false;
    skipArmed = false;
    screen.hidden = false;
    offset = screen.clientHeight * 1.04;
    previousTime = performance.now();
    triggeredCues.clear();
    silhouette.src = PROLOGUE_CONFIG.queenImage;
    silhouette.dataset.figure = "queen";
    flash.classList.remove("is-active");
    skipButton.classList.remove("is-armed");
    skipButton.textContent = "A / ENTER：SKIP";
    text.style.transform = `translate3d(0,${offset}px,0)`;
    frameId = requestAnimationFrame(tick);
  }

  function stop(complete = false) {
    running = false;
    cancelAnimationFrame(frameId);
    frameId = 0;
    if (!complete) return;
    screen.hidden = true;
    onComplete?.();
  }

  function finish() {
    stop(true);
  }

  function tick(now) {
    if (!running) return;
    const elapsed = Math.min(50, now - previousTime);
    previousTime = now;
    if (!paused) offset -= PROLOGUE_CONFIG.scrollPixelsPerSecond * elapsed / 1000;
    text.style.transform = `translate3d(0,${offset}px,0)`;
    checkCues();
    if (offset + text.offsetHeight < 0) {
      paused = true;
      window.setTimeout(() => running && finish(), PROLOGUE_CONFIG.endingPauseMs);
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  function checkCues() {
    if (paused) return;
    for (const element of text.querySelectorAll("[data-prologue-cue]")) {
      const cue = element.dataset.prologueCue;
      if (triggeredCues.has(cue)) continue;
      const bounds = element.getBoundingClientRect();
      const screenBounds = screen.getBoundingClientRect();
      if (bounds.top > screenBounds.top + screenBounds.height * 0.54) continue;
      triggeredCues.add(cue);
      if (cue === "night") void playNightSequence();
      else if (cue === "before-you") void pauseFor(PROLOGUE_CONFIG.beforeYouPauseMs);
      else if (cue === "you") void pauseFor(PROLOGUE_CONFIG.youPauseMs);
      break;
    }
  }

  async function pauseFor(duration) {
    paused = true;
    await wait(duration);
    if (running) paused = false;
  }

  async function playNightSequence() {
    paused = true;
    await wait(PROLOGUE_CONFIG.nightPauseMs);
    if (!running) return;
    await pulseFlash();
    await wait(PROLOGUE_CONFIG.flashGapMs);
    if (!running) return;
    await pulseFlash();
    if (!running) return;
    silhouette.src = PROLOGUE_CONFIG.catImage;
    silhouette.dataset.figure = "cat";
    await wait(PROLOGUE_CONFIG.postFlashPauseMs);
    if (running) paused = false;
  }

  async function pulseFlash() {
    flash.classList.add("is-active");
    await wait(PROLOGUE_CONFIG.flashDurationMs);
    flash.classList.remove("is-active");
  }

  function handleAction(action) {
    if (!running || !["confirm", "cancel"].includes(action)) return false;
    if (action === "cancel" && skipArmed) {
      skipArmed = false;
      skipButton.classList.remove("is-armed");
      skipButton.textContent = "A / ENTER：SKIP";
      return true;
    }
    if (!skipArmed) {
      skipArmed = true;
      skipButton.classList.add("is-armed");
      skipButton.textContent = "SKIP？  A / ENTER：YES  B：NO";
      return true;
    }
    if (action === "confirm") finish();
    return true;
  }

  skipButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    handleAction("confirm");
  }, true);

  return Object.freeze({ start, stop, handleAction, isRunning: () => running });
}
