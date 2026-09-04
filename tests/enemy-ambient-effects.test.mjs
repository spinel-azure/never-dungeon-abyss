import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { BOSSES, createBossCombatant } from "../data/bosses.js";
import { createBattleState } from "../combat/battle-engine.js";
import {
  ENEMY_AMBIENT_EFFECTS, createEnemyAmbientEffects, drawEnemyAmbientFrame,
  getAmbientCanvasSize, getAmbientFrameRate, getAmbientImageBounds
} from "../js/enemy-ambient-effects.js";

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    fire(type) { listeners.get(type)?.(); }
  };
}
function drawingContext() {
  const calls = [];
  const gradient = { addColorStop(...args) { calls.push(["color", ...args]); } };
  const context = { calls };
  for (const name of ["clearRect", "save", "restore", "setTransform", "fillRect", "beginPath", "moveTo", "bezierCurveTo", "closePath", "fill"]) {
    context[name] = (...args) => calls.push([name, ...args]);
  }
  context.createLinearGradient = (...args) => { calls.push(["linear", ...args]); return gradient; };
  context.createRadialGradient = (...args) => { calls.push(["radial", ...args]); return gradient; };
  return context;
}
function harness({ rate = 60, mobile = false, reduced = false } = {}) {
  const pending = new Map(), draws = [], canvases = [], observers = [];
  let nextId = 0;
  class Observer {
    constructor(fn) { this.fn = fn; this.targets = new Set(); observers.push(this); }
    observe(node) { this.targets.add(node); }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); }
  }
  const doc = { ...eventTarget(), hidden: false, createElement() {
    const ctx = drawingContext();
    const canvas = { style: {}, width: 300, height: 150, removed: false,
      setAttribute() {}, getContext: () => ctx, remove() { this.removed = true; } };
    canvases.push(canvas);
    return canvas;
  } };
  const win = { ...eventTarget(), ResizeObserver: Observer, MutationObserver: Observer };
  const root = { isConnected: true, hidden: false, parentElement: null,
    getClientRects: () => root.hidden ? [] : [{}], closest: () => null };
  const config = { rate, mobile, reduced };
  const controller = createEnemyAmbientEffects({ root, documentRef: doc, windowRef: win,
    requestFrame(fn) { pending.set(++nextId, fn); return nextId; },
    cancelFrame(id) { pending.delete(id); },
    getFrameRate: () => config.rate, isMobileDevice: () => config.mobile,
    reducedMotion: () => config.reduced,
    drawFrame(...args) { draws.push(args); }
  });
  function target(effect = "wicker-flame", hp = 100) {
    const classes = new Set();
    const classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) };
    const host = { dataset: {}, classList, clientLeft: 0, clientTop: 0,
      getBoundingClientRect: () => ({ left: 10, top: 20 }), append() {} };
    const image = { ...eventTarget(), classList: { contains: () => false },
      complete: true, naturalWidth: 600, naturalHeight: 600, isConnected: true,
      getBoundingClientRect: () => ({ left: 100, top: 80, width: 300, height: 300 }),
      closest: () => host };
    return { image, enemy: { hp, ambientEffect: effect }, host };
  }
  return { controller, root, doc, win, pending, draws, canvases, target, observers, config,
    frame(time) { const batch = [...pending.values()]; pending.clear(); for (const fn of batch) fn(time); },
    liveCanvases: () => canvases.filter(canvas => !canvas.removed)
  };
}

test("only the two requested bosses declare ambient effects, retained through combat cloning", () => {
  assert.deepEqual(Object.values(BOSSES).filter(b => b.ambientEffect).map(b => [b.id, b.ambientEffect]), [
    ["wicker_man_b39f", "wicker-flame"], ["brass_bull_event_boss", "brass-heat"]
  ]);
  for (const id of ["wicker_man_b39f", "brass_bull_event_boss"]) {
    const enemy = createBossCombatant(id);
    const battle = createBattleState({ character: { hp: 100, maxHp: 100 }, enemy });
    assert.equal(battle.enemy.ambientEffect, BOSSES[id].ambientEffect);
  }
  assert.ok(ENEMY_AMBIENT_EFFECTS["wicker-flame"].sparks > ENEMY_AMBIENT_EFFECTS["brass-heat"].sparks);
  assert.ok(ENEMY_AMBIENT_EFFECTS["wicker-flame"].strength > ENEMY_AMBIENT_EFFECTS["brass-heat"].strength);
});

test("PC supports 60/30; phones and tablets cap even a 60fps setting at 30", () => {
  assert.equal(getAmbientFrameRate(60), 60);
  assert.equal(getAmbientFrameRate(30), 30);
  assert.equal(getAmbientFrameRate(60, true), 30);
  assert.equal(getAmbientFrameRate(undefined), 60);
});

test("contain geometry follows actual sprite at PC/mobile widths, including party borders", () => {
  for (const width of [880, 390, 768]) {
    const bounds = getAmbientImageBounds({ left: 12, top: 22, width, height: 200 },
      { left: 10, top: 20, borderLeft: 2, borderTop: 2 }, 600, 600);
    assert.equal(bounds.width, 200);
    assert.equal(bounds.height, 200);
    assert.equal(bounds.left, (width - 200) / 2);
    assert.equal(bounds.top, 0);
  }
  assert.deepEqual(getAmbientCanvasSize(2000, 1000, 60), { width: 640, height: 320 });
  assert.deepEqual(getAmbientCanvasSize(2000, 1000, 30), { width: 448, height: 224 });
  assert.deepEqual(getAmbientCanvasSize(120, 60, 30), { width: 120, height: 60 });
});

test("ordinary/unknown/dead enemies allocate neither canvas nor animation/listeners", () => {
  const h = harness();
  h.controller.sync([h.target(null), h.target("toString"), h.target("wicker-flame", 0)]);
  assert.equal(h.pending.size, 0);
  assert.equal(h.liveCanvases().length, 0);
  assert.equal(h.doc.listeners.size, 0);
});

test("multiple targets and repeated sync share exactly one RAF and two layers per enemy", () => {
  const h = harness(), targets = [h.target(), h.target("brass-heat")];
  for (let i = 0; i < 5; i++) h.controller.sync(targets);
  assert.equal(h.liveCanvases().length, 4);
  assert.equal(h.pending.size, 1);
  h.frame(0);
  assert.equal(h.draws.length, 2);
  assert.equal(h.pending.size, 1);
  h.controller.clear();
  assert.equal(h.pending.size, 0);
  assert.equal(h.liveCanvases().length, 0);
  assert.equal(h.doc.listeners.size, 0);
  assert.equal(h.win.listeners.size, 0);
  assert.ok(h.observers.every(observer => observer.targets.size === 0));
  assert.ok(targets.every(target => target.image.listeners.size === 0));
});

test("60/30 caps work on 60/120Hz RAF without slowing real-time animation", () => {
  for (const hz of [60, 120]) for (const rate of [30, 60]) {
    const h = harness({ rate });
    h.controller.sync([h.target()]);
    for (let i = 0; i < hz * 2; i++) h.frame(i * 1000 / hz);
    assert.ok(Math.abs(h.draws.length - rate * 2) <= 1, `${hz}Hz/${rate}fps: ${h.draws.length}`);
    assert.ok(h.draws.at(-1)[1] > 1.95);
    assert.equal(h.pending.size, 1);
    h.controller.clear();
  }
});

test("30fps switches live, lowers backing resolution and preserves time", () => {
  const h = harness(), target = h.target();
  target.image.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000 });
  h.controller.sync([target]); h.frame(0);
  assert.equal(h.canvases[0].width, 640);
  h.config.mobile = true;
  h.frame(34);
  assert.equal(h.canvases[0].width, 448);
  assert.equal(h.draws.at(-1)[2], 30);
  assert.equal(h.draws.at(-1)[1], .034);
});

test("hidden document or scene stops all updates; reopening resets scheduling", () => {
  const h = harness();
  h.controller.sync([h.target()]); h.frame(0);
  h.doc.hidden = true; h.doc.fire("visibilitychange");
  assert.equal(h.pending.size, 0);
  h.doc.hidden = false; h.doc.fire("visibilitychange"); h.frame(100000);
  assert.equal(h.draws.length, 2);
  h.root.hidden = true;
  h.observers.at(-1).fn();
  assert.equal(h.pending.size, 0);
  h.root.hidden = false; h.observers.at(-1).fn(); h.frame(100001);
  assert.equal(h.draws.length, 3);
  h.controller.clear();
  h.doc.fire("visibilitychange"); h.win.fire("resize");
  assert.equal(h.pending.size, 0);
});

test("death removes only that target immediately; vanish flags cannot resurrect fire", () => {
  const h = harness(), a = h.target(), b = h.target("brass-heat");
  h.controller.sync([a, b]);
  h.controller.remove(a.image);
  a.host.dataset.vanishPending = "true";
  h.controller.sync([a, b]);
  assert.equal(h.liveCanvases().length, 2);
  b.host.dataset.vanishPlaying = "true";
  h.frame(0);
  assert.equal(h.liveCanvases().length, 0);
  assert.equal(h.pending.size, 0);
  a.host.dataset.vanishPending = "false";
  a.enemy.hp = 0;
  h.controller.sync([a]);
  assert.equal(h.pending.size, 0);
});

test("unloaded images wait for load and detached enemies release their scheduler", () => {
  const h = harness(), target = h.target();
  target.image.complete = false;
  h.controller.sync([target]); h.frame(0);
  assert.equal(h.draws.length, 0);
  target.image.complete = true; target.image.fire("load"); h.frame(17);
  assert.equal(h.draws.length, 1);
  target.image.isConnected = false; h.frame(34);
  assert.equal(h.pending.size, 0);
  assert.equal(h.liveCanvases().length, 0);
});

test("repeated end/restart cycles do not leave RAF, canvases or image listeners", () => {
  const h = harness(), target = h.target();
  for (let i = 0; i < 10; i++) {
    h.controller.sync([target]); h.frame(i * 1000);
    assert.equal(h.pending.size, 1);
    assert.equal(h.liveCanvases().length, 2);
    h.controller.clear(); h.controller.clear();
    assert.equal(h.pending.size, 0);
    assert.equal(h.liveCanvases().length, 0);
    assert.equal(target.image.listeners.size, 0);
  }
});

test("reduced-motion draws a static glow once without a permanent loop", () => {
  const h = harness({ reduced: true });
  h.controller.sync([h.target()]); h.frame(0);
  assert.equal(h.pending.size, 0);
  assert.equal(h.draws.length, 1);
  assert.equal(h.draws[0][3], true);
});

test("actual painter halves sparks at 30fps and keeps identical time-based tongue positions", () => {
  function paint(rate, concealed = false) {
    const back = drawingContext(), front = drawingContext();
    const make = ctx => ({ width: 390, height: 390, getContext: () => ctx });
    drawEnemyAmbientFrame({ back: make(back), front: make(front),
      profile: ENEMY_AMBIENT_EFFECTS["wicker-flame"], concealed }, 2.5, rate);
    return { back: back.calls, front: front.calls };
  }
  const normal = paint(60), low = paint(30), silhouette = paint(60, true);
  const sparks = calls => calls.filter(call => call[0] === "fillRect" && call[3] === .0035);
  assert.equal(sparks(normal.front).length, 28);
  assert.equal(sparks(low.front).length, 14);
  assert.deepEqual(normal.back.find(c => c[0] === "linear"), low.back.find(c => c[0] === "linear"));
  assert.ok(low.back.filter(c => c[0] === "linear").length < normal.back.filter(c => c[0] === "linear").length);
  assert.equal(silhouette.front.filter(c => ["linear", "radial"].includes(c[0])).length, 0);
});

test("battle integration tears down before vanish and close; normal render uses presentation HP", async () => {
  const source = await fs.readFile(new URL("../js/battle.js", import.meta.url), "utf8");
  assert.match(source, /ambientEffects\?\.remove\(vanishImage\);\s+markEnemyVanishPending/);
  assert.match(source, /function closeBattle\(\) \{\s+battleUi\.ambientEffects\?\.clear\(\)/);
  assert.match(source, /hp: battleUi\.presentationHp\?\.enemies\?\.\[index\] \?\? enemy\.hp/);
  assert.match(source, /battle\.outcome && !battleUi\.presenting/);
  const main = await fs.readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(main, /getFrameRate: getEffectiveFrameRate/);
  assert.match(main, /isMobileDevice: \(\) => document\.body\.classList\.contains\("layout-mobile"\)\s*\|\| document\.body\.classList\.contains\("layout-tablet"\)/);
});
