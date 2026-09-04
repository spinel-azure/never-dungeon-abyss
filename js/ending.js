import { ENDING_ASSETS, EPILOGUE, EPILOGUE_AFTER_MEDAL, getEndingCredits } from "../data/ending.js";
import { createEndingAudioClock } from "./audio.js";
import { EffectEngine } from "./effects/effect-engine.js";

const clamp = n => Math.max(0, Math.min(1, n));
export function getEndingFrame(seconds) {
  const t = Math.max(0, seconds);
  const stage = t < 4 ? "intro" : t < 29 ? "epilogue" : t < 35 ? "medal"
    : t < 41 ? "after" : t < 73 ? "credits" : t < 81 ? "thanks" : "end";
  const spans = { epilogue: [4, 29], credits: [41, 73] };
  const span = spans[stage];
  return { stage, progress: span ? clamp((t - span[0]) / (span[1] - span[0])) : 0,
    opacity: Math.min(clamp(t / 4), clamp((96 - t) / 5)), done: t >= 96 };
}

// The same cracker renderer used by LOT BAG. Only its origin/direction differ.
export function createArrivalConfetti(reduced = false) {
  return { width: 960, height: 540, duration: 1800, parts: [
    [0, 0, 30], [960, 0, 150], [0, 540, -30], [960, 540, -150]
  ].map(([x, y, direction], i) => ({ type: "cracker", id: `arrival_${i}`, enabled: true,
    x, y, direction, start: 0, duration: 1800, easing: "linear", seed: i + 2,
    color: ["#ffda63", "#fa8ca5", "#80d9ff", "#c7a7ff"][i], secondaryColor: "#fff4bb",
    count: reduced ? 5 : 36, speed: 500, spread: 45, gravity: 80, size: 5 })) };
}

export function createEndingController({ parent, onSuspendTown, onSaveStory, onFinish,
  createAudioClock = createEndingAudioClock, getFrameRate = () => 60 } = {}) {
  let root = null, abort = null, clock = null, effect = null, raf = 0;
  let active = false, phase = "idle", armed = false, lastConfirm = -Infinity;
  let previousFrame = -Infinity, phaseStart = 0, generation = 0;
  let sections = {}, skip = null, scene = null, shade = null, reduced = false;
  let metrics = {}, replay = false, saving = false;
  const resize = () => {
    if (!root) return;
    const height = root.clientHeight;
    metrics = { height, epilogue: sections.epilogue.scrollHeight, credits: sections.credits.scrollHeight };
  };
  function build() {
    root = document.createElement("section"); root.id = "endingScreen";
    root.className = "ending-screen"; root.setAttribute("aria-label", "エンディング");
    root.innerHTML = `<div class="ending-arrival"><img class="ending-arrival-image" alt="町への凱旋"><canvas aria-hidden="true"></canvas><p>カッツェンシュタットの中心部へ戻ってきたあなたを、皆が温かく出迎えてくれた。</p></div>
      <div class="ending-roll"><img class="prologue-silhouette ending-queen" alt="">
      <div class="ending-scroll"></div><div class="prologue-dither prologue-dither-top"><i></i><i></i><i></i><i></i></div><div class="prologue-dither prologue-dither-bottom"><i></i><i></i><i></i><i></i></div></div>
      <div class="ending-shade"></div><button class="prologue-skip" type="button">A / ENTER：SKIP</button>`;
    root.querySelector(".ending-arrival-image").src = ENDING_ASSETS.arrival;
    root.querySelector(".ending-queen").src = ENDING_ASSETS.queen;
    const scroll = root.querySelector(".ending-scroll");
    for (const name of ["epilogue", "medal", "after", "credits", "thanks", "end"]) {
      const section = document.createElement("div"); section.className = `ending-section ending-${name}`;
      section.dataset.endingStage = name; scroll.append(section); sections[name] = section;
    }
    const paragraph = (parent, text) => { const p = document.createElement("p"); p.textContent = text; parent.append(p); };
    EPILOGUE.forEach(text => paragraph(sections.epilogue, text));
    paragraph(sections.after, EPILOGUE_AFTER_MEDAL);
    for (const [heading, names] of getEndingCredits()) {
      const group = document.createElement("div"); group.className = "ending-credit";
      paragraph(group, heading); names.forEach(name => paragraph(group, name)); sections.credits.append(group);
    }
    paragraph(sections.thanks, "Thank you for playing!");
    for (const [stage, alt] of [["medal", "王家の猫勲章"], ["end", "Das Ende"]]) {
      const img = document.createElement("img"); img.src = ENDING_ASSETS[stage]; img.alt = alt; sections[stage].append(img);
    }
    parent.append(root); scene = root.querySelector(".ending-roll"); shade = root.querySelector(".ending-shade");
    skip = root.querySelector("button");
    abort = new AbortController();
    skip.addEventListener("pointerdown", event => { event.preventDefault(); event.stopPropagation(); handleAction("confirm"); }, { signal: abort.signal });
    skip.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); if (event.detail === 0) handleAction("confirm"); }, { signal: abort.signal });
    window.addEventListener("keydown", event => {
      if (!active) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) return;
      if (["Enter", " ", "x", "X"].includes(event.key)) handleAction("confirm");
      else if (["Escape", "z", "Z"].includes(event.key)) handleAction("cancel");
    }, { capture: true, signal: abort.signal });
    window.addEventListener("resize", resize, { signal: abort.signal });
    // pagehide preserves pending credits; pageshow can start a fresh clock after BFCache.
    window.addEventListener("pagehide", () => dispose(false), { signal: abort.signal });
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    effect = new EffectEngine(root.querySelector("canvas"), { transparent: true, backdrop: false });
    effect.load(createArrivalConfetti(reduced));
    resize();
  }
  async function start({ arrival = false, isReplay = false } = {}) {
    if (active) return false;
    active = true; replay = isReplay; generation++; phase = arrival ? "arrival" : "loading";
    armed = false; saving = false; previousFrame = -Infinity; lastConfirm = -Infinity;
    onSuspendTown?.(true);
    document.body.classList.add("ending-presenting");
    build(); root.dataset.phase = phase;
    if (arrival) { skip.hidden = true; phaseStart = performance.now(); queue(); }
    else await startCredits();
    return true;
  }
  function queue() { if (active && !raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    if (!active) return;
    const mobile = document.body.classList.contains("layout-mobile") || document.body.classList.contains("layout-tablet");
    const rate = mobile ? 30 : getFrameRate();
    if (now - previousFrame < 1000 / rate - .5) { queue(); return; }
    previousFrame = now;
    if (phase === "arrival") {
      const elapsed = now - phaseStart;
      if (elapsed <= 1800) effect.seek(elapsed);
      else root.querySelector("canvas").hidden = true;
      shade.style.opacity = String(clamp((elapsed - 3000) / 2000));
      if (elapsed >= 5000) { void saveStoryAndStart(); return; }
    } else if (phase === "credits") {
      const frame = getEndingFrame(clock.elapsed());
      scene.style.opacity = String(frame.opacity); clock.fade(frame.opacity);
      for (const [name, section] of Object.entries(sections)) {
        section.style.visibility = name === frame.stage ? "visible" : "hidden";
        section.style.transform = name === "epilogue" || name === "credits"
          ? `translateY(${metrics.height * .85 - frame.progress * (metrics.height * .85 + metrics[name])}px)`
          : "translateY(-50%)";
      }
      root.dataset.stage = frame.stage;
      if (frame.done) { void finish(); return; }
    }
    queue();
  }
  async function saveStoryAndStart() {
    if (saving || !active) return;
    saving = true;
    if (await onSaveStory?.() === false) {
      saving = false; phase = "save-error"; skip.hidden = false;
      skip.textContent = "保存できませんでした。A / ENTER：再試行"; return;
    }
    saving = false;
    if (active) await startCredits();
  }
  async function startCredits() {
    const token = generation;
    phase = "loading"; root.dataset.phase = phase; shade.style.opacity = "0";
    skip.hidden = false; skip.textContent = "A / ENTER：SKIP";
    scene.style.opacity = "0";
    // Keep the first frame black until actual source.start, or the fallback decision.
    clock = createAudioClock();
    try { await clock.start(); } catch { clock.stop(); clock = { elapsed: (() => { const start = performance.now(); return () => (performance.now() - start) / 1000; })(), fade() {}, stop() {} }; }
    if (!active || token !== generation) return;
    phase = "credits"; root.dataset.phase = phase; resize(); queue();
  }
  async function finish() {
    if (!active || saving) return;
    saving = true;
    const saved = await onFinish?.({ replay });
    if (saved === false) {
      saving = false; phase = "finish-save-error"; skip.textContent = "保存できませんでした。A / ENTER：再試行"; return;
    }
    dispose(true);
  }
  function handleAction(action) {
    if (!active) return false;
    if (action === "confirm" && ["save-error", "finish-save-error"].includes(phase)) {
      if (phase === "save-error") void saveStoryAndStart(); else void finish();
      return true;
    }
    if (!["credits", "loading"].includes(phase)) return true;
    if (action === "cancel") { armed = false; skip.textContent = "A / ENTER：SKIP"; skip.classList.remove("is-armed"); }
    if (action === "confirm" && performance.now() - lastConfirm >= 250) {
      lastConfirm = performance.now();
      if (armed) void finish();
      else { armed = true; skip.classList.add("is-armed"); skip.textContent = "SKIP？  A / ENTER：YES  B：NO"; }
    }
    return true;
  }
  function dispose(completed = false) {
    if (!active) return;
    active = false; generation++; phase = "idle"; saving = false;
    cancelAnimationFrame(raf); raf = 0; clock?.stop(); clock = null;
    effect?.stop(false); effect = null; abort?.abort(); abort = null;
    root?.remove(); root = null; sections = {};
    document.body.classList.remove("ending-presenting");
    onSuspendTown?.(false, { completed });
  }
  return { start, handleAction, dispose, isActive: () => active, getPhase: () => phase };
}
