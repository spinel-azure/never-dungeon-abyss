// Normalized image-space emitters: x, y, width, rise. No boss-ID checks or image edits.
export const ENEMY_AMBIENT_EFFECTS = Object.freeze({
  "wicker-flame": Object.freeze({
    back: [[.12,.29,.08,.23],[.19,.45,.08,.23],[.31,.48,.08,.22],
      [.45,.27,.09,.21],[.58,.3,.08,.22],[.7,.45,.09,.25],
      [.85,.3,.09,.24],[.86,.16,.08,.19],[.15,.14,.08,.19],
      [.26,.67,.09,.23],[.16,.88,.09,.25],[.4,.67,.08,.2],
      [.64,.7,.09,.25],[.77,.9,.09,.25]],
    front: [[.23,.94,.06,.18],[.76,.94,.06,.17],[.31,.64,.05,.14],
      [.66,.59,.05,.15],[.17,.3,.045,.15],[.83,.29,.045,.15]],
    glow: [[.25,.7,.2],[.73,.72,.2],[.2,.28,.18],[.8,.28,.18]],
    sparks: 28, strength: .85
  }),
  "brass-heat": Object.freeze({
    back: [[.31,.88,.045,.12],[.62,.95,.05,.13],[.91,.85,.045,.12],
      [.55,.72,.05,.14],[.76,.65,.045,.13],[.23,.74,.06,.13]],
    front: [[.2,.76,.06,.13],[.12,.85,.045,.12],[.61,.66,.035,.09],
      [.62,.92,.04,.1],[.87,.7,.035,.08]],
    glow: [[.22,.74,.13],[.56,.64,.17],[.64,.76,.13],[.86,.67,.11]],
    sparks: 8, strength: .5
  })
});

export function getAmbientFrameRate(frameRate, mobile = false) {
  return mobile || Number(frameRate) === 30 ? 30 : 60;
}

// object-fit: contain may leave empty space inside the img element (especially in parties).
export function getAmbientImageBounds(imageRect, hostRect, naturalWidth, naturalHeight) {
  const scale = Math.min(imageRect.width / naturalWidth, imageRect.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: imageRect.left - hostRect.left + (imageRect.width - width) / 2 - (hostRect.borderLeft || 0),
    top: imageRect.top - hostRect.top + (imageRect.height - height) / 2 - (hostRect.borderTop || 0),
    width, height
  };
}

export function getAmbientCanvasSize(width, height, fps) {
  const scale = Math.min(1, (fps === 30 ? 448 : 640) / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// One scheduler for all visible enemies, created lazily only for configured effects.
export function createEnemyAmbientEffects({
  root,
  getFrameRate = () => 60,
  isMobileDevice = () => false,
  documentRef = root?.ownerDocument || globalThis.document,
  windowRef = documentRef?.defaultView || globalThis,
  requestFrame = callback => windowRef.requestAnimationFrame(callback),
  cancelFrame = id => windowRef.cancelAnimationFrame(id),
  reducedMotion = null,
  drawFrame = drawEnemyAmbientFrame
} = {}) {
  const entries = new Map();
  let frame = null;
  let lastRenderTime = null;
  let resizeObserver = null;
  let visibilityObserver = null;
  let listening = false;
  const motionQuery = reducedMotion ? null : windowRef.matchMedia?.("(prefers-reduced-motion: reduce)");
  const motionReduced = reducedMotion || (() => Boolean(motionQuery?.matches));
  const fps = () => getAmbientFrameRate(getFrameRate(), isMobileDevice());
  const visible = () => Boolean(root?.isConnected && !root.hidden && !documentRef?.hidden
    && root.getClientRects().length && !root.closest("[hidden]"));

  function stop() {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    lastRenderTime = null;
  }
  function schedule() {
    if (frame === null && entries.size && visible()) frame = requestFrame(tick);
  }
  function layout(entry, frameRate = fps()) {
    const { image, host, back, front } = entry;
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return false;
    const rect = host.getBoundingClientRect();
    const bounds = getAmbientImageBounds(image.getBoundingClientRect(), {
      left: rect.left, top: rect.top,
      borderLeft: host.clientLeft, borderTop: host.clientTop
    }, image.naturalWidth, image.naturalHeight);
    if (!(bounds.width > 0 && bounds.height > 0)) return false;
    const width = bounds.width * 1.3, height = bounds.height * 1.3;
    const size = getAmbientCanvasSize(width, height, frameRate);
    for (const canvas of [back, front]) {
      Object.assign(canvas.style, {
        left: `${bounds.left - bounds.width * .15}px`, top: `${bounds.top - bounds.height * .22}px`,
        width: `${width}px`, height: `${height}px`
      });
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
    }
    entry.frameRate = frameRate;
    return true;
  }
  function refresh() {
    stop();
    if (!visible()) {
      for (const entry of entries.values()) {
        for (const canvas of [entry.back, entry.front]) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    for (const entry of entries.values()) layout(entry);
    schedule();
  }
  function listen() {
    if (listening) return;
    listening = true;
    documentRef.addEventListener("visibilitychange", refresh);
    windowRef.addEventListener("resize", refresh);
    motionQuery?.addEventListener("change", refresh);
    if (windowRef.ResizeObserver) {
      resizeObserver = new windowRef.ResizeObserver(refresh);
      resizeObserver.observe(root);
      for (const entry of entries.values()) resizeObserver.observe(entry.image);
    }
    if (windowRef.MutationObserver) {
      visibilityObserver = new windowRef.MutationObserver(refresh);
      // Observe ancestors too: a scene or menu can hide the battle without closing it.
      for (let node = root; node; node = node.parentElement) {
        visibilityObserver.observe(node, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
      }
    }
  }
  function unlisten() {
    documentRef.removeEventListener("visibilitychange", refresh);
    windowRef.removeEventListener("resize", refresh);
    motionQuery?.removeEventListener("change", refresh);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    resizeObserver = visibilityObserver = null;
    listening = false;
  }
  function remove(image) {
    const entry = entries.get(image);
    if (!entry) return;
    entry.image.removeEventListener("load", entry.onLoad);
    resizeObserver?.unobserve(entry.image);
    entry.back.remove();
    entry.front.remove();
    entry.host.classList.remove("has-enemy-ambient");
    entries.delete(image);
    if (!entries.size) { stop(); unlisten(); }
  }
  function tick(timestamp) {
    frame = null;
    if (!entries.size || !visible()) { stop(); return; }
    const frameRate = fps(), interval = 1000 / frameRate;
    const reduce = motionReduced();
    const elapsed = lastRenderTime === null ? interval : timestamp - lastRenderTime;
    if (elapsed + .01 >= interval) {
      lastRenderTime = elapsed < interval ? timestamp : timestamp - (elapsed % interval);
      for (const [image, entry] of entries) {
        if (!image.isConnected || entry.host.dataset.vanishPending === "true"
          || entry.host.dataset.vanishPlaying === "true" || image.classList.contains("is-defeated")) {
          remove(image);
          continue;
        }
        if (entry.frameRate !== frameRate || !entry.ready) entry.ready = layout(entry, frameRate);
        if (entry.ready) drawFrame(entry, reduce ? 0 : timestamp / 1000, frameRate, Boolean(reduce));
      }
    }
    if (!reduce) schedule();
  }
  function sync(targets = []) {
    const wanted = new Set();
    for (const target of targets) {
      const { image, enemy, hp = enemy?.hp, concealed = false } = target;
      const profile = Object.hasOwn(ENEMY_AMBIENT_EFFECTS, enemy?.ambientEffect)
        ? ENEMY_AMBIENT_EFFECTS[enemy.ambientEffect] : null;
      if (!image || !profile || !(hp > 0)) continue;
      const host = image.closest(".battle-enemy-member, .battle-enemy-stage");
      if (!host || host.dataset.vanishPending === "true" || host.dataset.vanishPlaying === "true") continue;
      wanted.add(image);
      let entry = entries.get(image);
      if (!entry) {
        const canvases = ["back", "front"].map(layer => {
          const canvas = documentRef.createElement("canvas");
          canvas.className = `battle-enemy-ambient battle-enemy-ambient-${layer}`;
          canvas.setAttribute("aria-hidden", "true");
          host.append(canvas);
          return canvas;
        });
        entry = { image, host, back: canvases[0], front: canvases[1] };
        entry.onLoad = () => { entry.ready = layout(entry); schedule(); };
        image.addEventListener("load", entry.onLoad);
        host.classList.add("has-enemy-ambient");
        entries.set(image, entry);
        resizeObserver?.observe(image);
      }
      entry.profile = profile;
      entry.concealed = concealed;
      entry.ready = visible() && layout(entry);
    }
    for (const image of entries.keys()) if (!wanted.has(image)) remove(image);
    if (entries.size) { listen(); schedule(); }
  }
  function clear() {
    stop();
    for (const image of entries.keys()) remove(image);
    unlisten();
  }
  return { sync, remove, clear, destroy: clear };
}

function flame(ctx, emitter, time, seed, strength) {
  const [baseX, baseY, spread, rise] = emitter;
  const phase = (time * (.65 + seed % 3 * .07) + seed * .38197) % 1;
  const fade = Math.sin(Math.PI * phase);
  const width = spread * (.5 + fade * .22);
  const x = baseX + Math.sin(time * 3.1 + seed * 2) * width * .23;
  const y = baseY - phase * rise * .3;
  const tip = x + Math.sin(time * 4.3 + seed) * width * .8;
  const height = rise * (.55 + fade * .4);
  const gradient = ctx.createLinearGradient(x, y, tip, y - height);
  gradient.addColorStop(0, "rgba(255,78,0,0)");
  gradient.addColorStop(.22, `rgba(255,205,36,${strength * fade})`);
  gradient.addColorStop(.6, `rgba(255,91,5,${strength * fade * .8})`);
  gradient.addColorStop(1, "rgba(228,24,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - width * .5, y);
  ctx.bezierCurveTo(x - width * 1.2, y - height * .25, x + width * .5, y - height * .4, x - width * .2, y - height * .6);
  ctx.bezierCurveTo(x - width * .8, y - height * .78, tip - width * .25, y - height * .83, tip, y - height);
  ctx.bezierCurveTo(tip + width * .2, y - height * .75, x + width * 1.15, y - height * .55, x + width * .65, y - height * .35);
  ctx.bezierCurveTo(x + width * .25, y - height * .12, x + width * .9, y - height * .1, x + width * .6, y);
  ctx.closePath();
  ctx.fill();
}

export function drawEnemyAmbientFrame(entry, seconds, fps, reducedMotion = false) {
  const { profile, concealed } = entry;
  for (const [layer, canvas] of [["back", entry.back], ["front", entry.front]]) {
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(canvas.width / 1.3, 0, 0, canvas.height / 1.3, canvas.width * .15 / 1.3, canvas.height * .22 / 1.3);
    ctx.globalCompositeOperation = "lighter";
    const strength = profile.strength * (concealed ? .28 : 1);
    if (layer === "back" || !concealed) {
      for (const [x, y, radius] of profile.glow) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(255,63,4,${strength * (layer === "back" ? .28 : .12)})`);
        glow.addColorStop(1, "rgba(255,30,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }
    if (!reducedMotion && !(concealed && layer === "front")) {
      profile[layer].forEach((emitter, index) => {
        if (fps === 30 && index % 3 === 2) return;
        flame(ctx, emitter, seconds, index + 1, strength * (layer === "back" ? .9 : .4));
      });
    }
    if (layer === "front" && !reducedMotion) {
      const count = fps === 30 ? Math.ceil(profile.sparks / 2) : profile.sparks;
      for (let index = 0; index < count; index += 1) {
        const source = profile.back[index % profile.back.length];
        const phase = (seconds * (.32 + index % 4 * .06) + index * .61803) % 1;
        const x = source[0] + Math.sin(seconds * 1.8 + index) * .025 + Math.sin(index * 7.9) * phase * .08;
        const y = source[1] - phase * .45;
        ctx.fillStyle = `rgba(255,${160 + index % 3 * 35},35,${Math.sin(Math.PI * phase) * strength * .85})`;
        ctx.fillRect(x, y, .0035, .005 + index % 2 * .003);
      }
    }
    ctx.restore();
  }
}
