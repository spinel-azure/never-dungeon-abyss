// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// Main bootstrap is intentionally skipped: use the real page/CSS/battle module with an
// isolated test character, never a player's save or localStorage.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.AMBIENT_TEST_URL || "http://127.0.0.1:4175";
const output = process.env.AMBIENT_TEST_OUTPUT || path.join(os.tmpdir(), "nda-boss-ambient-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.AMBIENT_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined), headless: true });
const errors = [], results = [];
try {
  for (const [name, width, height, rate] of [["pc", 1280, 900, 60], ["mobile", 390, 844, 30], ["tablet", 820, 1180, 30]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    await page.route("**/js/main.js?*", route => route.fulfill({ contentType: "text/javascript", body: "// isolated browser QA" }));
    await page.addInitScript(() => {
      Math.random = () => .5; // Deterministic hit/escape rolls in this isolated test context.
      const stats = window.ambientStats = { draws: 0, pending: new Set() };
      const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
      window.requestAnimationFrame = fn => {
        const ambient = fn.name === "tick";
        const id = request(time => {
          stats.pending.delete(id);
          fn(time);
        });
        if (ambient) stats.pending.add(id);
        return id;
      };
      window.cancelAnimationFrame = id => { stats.pending.delete(id); cancel(id); };
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.classList.contains("battle-enemy-ambient-front")) stats.draws++;
        return clear.apply(this, args);
      };
    });
    await page.goto(origin);
    await page.evaluate(async ({ name }) => {
      const battle = await import("/js/battle.js");
      const { createBossCombatant } = await import("/data/bosses.js");
      const { createInitialCharacter } = await import("/data/classes.js");
      const { setFrameRateMode, getEffectiveFrameRate } = await import("/js/renderer.js");
      document.body.className = `layout-${name} orientation-portrait input-${name === "pc" ? "pointer" : "touch"}`;
      document.querySelector("#titleScreen").hidden = true;
      let character = createInitialCharacter({ name: "炎演出テスト", job: "warrior" });
      character.hp = character.maxHp = 99999;
      character.sp = character.maxSp = 999;
      character.baseStats.dex = 999;
      character.baseStats.agi = 999;
      character.skillIds.push("flame_sweep");
      const completed = [];
      battle.configureBattle({
        root: document.querySelector("#battleScreen"), commandRoot: document.querySelector("#dungeonCommands"),
        messageEl: document.querySelector("#message"), getCharacter: () => character,
        getFrameRate: getEffectiveFrameRate,
        isMobileDevice: () => document.body.classList.contains("layout-mobile") || document.body.classList.contains("layout-tablet"),
        onCharacterChanged: patch => Object.assign(character, patch),
        onVictory: result => completed.push(result.outcome), onDefeat: result => completed.push(result.outcome),
        onEscape: result => completed.push(result.outcome),
        openSkills: ({ onUse }) => { window.qa.useSkill = onUse; return true; }
      });
      window.qa = {
        ...battle, completed, setFrameRateMode,
        start(id, options = {}) {
          const enemy = createBossCombatant(id);
          enemy.escapeRate = 1; // Only this test fixture permits guaranteed escape.
          Object.assign(enemy, options.enemy || {});
          if (options.player) Object.assign(character, options.player);
          if (options.party) options.enemies = [enemy, createBossCombatant("brass_bull_event_boss"),
            createBossCombatant("iron_maiden_b29f")];
          return battle.startBattle(enemy, { playStartSe: false, ...options });
        }
      };
    }, { name });
    async function start(id, options = {}, count = 2) {
      assert.equal(await page.evaluate(({ id, options }) => window.qa.start(id, options), { id, options }), true);
      await page.waitForFunction(() => [...document.querySelectorAll("#battleEnemyImage, .battle-enemy-member-image")]
        .filter(img => img.getClientRects().length).every(img => img.complete && img.naturalWidth > 0));
      await page.waitForTimeout(120);
      assert.equal(await page.locator(".battle-enemy-ambient").count(), count);
      assert.equal(await page.evaluate(() => window.ambientStats.pending.size), count ? 1 : 0);
    }
    async function escape() {
      await page.locator('[data-battle-command="escape"]').click();
      assert.equal(await page.locator(".battle-enemy-ambient").count(), 0);
      await page.evaluate(() => window.qa.handleBattleInput("confirm"));
      assert.equal(await page.evaluate(() => window.qa.isBattleActive()), false);
      assert.equal(await page.evaluate(() => window.ambientStats.pending.size), 0);
    }
    async function measure() {
      return page.evaluate(async () => {
        const before = ambientStats.draws, time = performance.now();
        await new Promise(resolve => setTimeout(resolve, 1100));
        return (ambientStats.draws - before) * 1000 / (performance.now() - time);
      });
    }
    async function assertAligned() {
      const bounds = await page.evaluate(() => {
        const img = document.querySelector("#battleEnemyImage"), canvas = document.querySelector(".battle-enemy-ambient-front");
        const i = img.getBoundingClientRect(), c = canvas.getBoundingClientRect();
        const scale = Math.min(i.width / img.naturalWidth, i.height / img.naturalHeight);
        return { dx: c.left + c.width * .15 / 1.3 - (i.left + (i.width - img.naturalWidth * scale) / 2),
          dy: c.top + c.height * .22 / 1.3 - (i.top + (i.height - img.naturalHeight * scale) / 2),
          internal: Math.max(canvas.width, canvas.height), pointer: getComputedStyle(canvas).pointerEvents };
      });
      assert.ok(Math.abs(bounds.dx) < 1 && Math.abs(bounds.dy) < 1, JSON.stringify(bounds));
      assert.ok(bounds.internal <= (rate === 30 ? 448 : 640));
      assert.equal(bounds.pointer, "none");
    }
    await start("wicker_man_b39f");
    await assertAligned();
    await page.waitForTimeout(700); // Let initial font/image decoding settle before sampling.
    const measured = await measure();
    // Headless CI may not deliver 60 RAF callbacks/sec; deterministic cap tests live in Node.
    assert.ok(measured > 0 && measured <= rate + 2, `${name}: ${measured}fps`);
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-wicker.png`) });
    // Existing hit animation/numbers remain present alongside both layers.
    await page.locator('[data-battle-command="attack"]').click();
    await page.waitForFunction(() => document.querySelector("#battleEnemyImage").classList.contains("is-hit"));
    assert.equal(await page.locator(".battle-enemy-ambient").count(), 2);
    assert.ok(await page.locator("#battleEnemyNumbers .battle-number").count() > 0);
    await page.waitForTimeout(1800);
    await page.locator('[data-battle-command="skills"]').click();
    await page.evaluate(() => {
      qa.skillFinished = false;
      void qa.useSkill("flame_sweep").then(() => { qa.skillFinished = true; });
    });
    await page.waitForFunction(() => !document.querySelector("#battleSkillEffectCanvas").hidden);
    assert.equal(await page.locator(".battle-enemy-ambient").count(), 2);
    assert.ok(await page.evaluate(() => Number(getComputedStyle(document.querySelector("#battleSkillEffectCanvas")).zIndex)
      > Number(getComputedStyle(document.querySelector(".battle-enemy-ambient-front")).zIndex)));
    await page.waitForFunction(() => qa.skillFinished);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 1);
    // Menus hide the real viewport via existing CSS, without explicitly closing battle.
    await page.evaluate(() => document.body.classList.add("menu-open"));
    await page.waitForTimeout(100);
    const frozen = await page.evaluate(() => ambientStats.draws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => ambientStats.draws), frozen);
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 0);
    await page.evaluate(() => document.body.classList.remove("menu-open"));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 1);
    if (name === "pc") {
      await page.evaluate(() => qa.setFrameRateMode(30));
      const low = await measure();
      assert.ok(low > 0 && low <= 32);
      await page.evaluate(() => qa.setFrameRateMode(60));
    }
    await escape();
    await start("brass_bull_event_boss");
    await assertAligned();
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-brass.png`) });
    // Real orientation/width change recalculates image-space anchors.
    await page.setViewportSize({ width: height, height: width });
    await page.waitForTimeout(150);
    await assertAligned();
    await page.setViewportSize({ width, height });
    await escape();
    await start("iron_maiden_b29f", {}, 0); await escape();
    await start("wicker_man_b39f", { phantom: true });
    assert.ok(await page.locator("#battleEnemyImage").evaluate(img => getComputedStyle(img).filter.includes("brightness(0)")));
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-phantom.png`) });
    await escape();
    await start("wicker_man_b39f", { party: true }, 4);
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-party.png`) });
    await escape();
    // Actual lethal attack -> pending vanish -> victory -> close (no outcome stubbing).
    await start("wicker_man_b39f", { enemy: { hp: 1, def: 0 } });
    await page.locator('[data-battle-command="attack"]').click();
    await page.waitForFunction(() => !!document.querySelector('[data-vanish-pending="true"], [data-vanish-playing="true"]'));
    assert.equal(await page.locator(".battle-enemy-ambient").count(), 0);
    await page.waitForFunction(() => document.querySelector("#message").textContent.includes("＊Aボタンで次へ"));
    await page.evaluate(() => qa.handleBattleInput("confirm"));
    assert.equal(await page.evaluate(() => qa.completed.at(-1)), "victory");
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 0);
    await start("brass_bull_event_boss", { player: { hp: 1, maxHp: 1 },
      enemy: { attack: 999999, stats: { str: 9999, int: 9999, dex: 9999, agi: 9999, luc: 1 }, specialAttack: null, actions: [] } });
    await page.locator('[data-battle-command="guard"]').click();
    await page.waitForFunction(() => document.querySelector("#message").textContent.includes("＊Aボタンで次へ"));
    assert.equal(await page.locator(".battle-enemy-ambient").count(), 0);
    await page.evaluate(() => qa.handleBattleInput("confirm"));
    assert.equal(await page.evaluate(() => qa.completed.at(-1)), "defeat");
    assert.equal(await page.evaluate(() => ambientStats.pending.size), 0);
    results.push({ layout: name, measuredFps: Math.round(measured * 10) / 10, checks: "images, alignment, hit/numbers, skill effect, menu pause, resize, phantom, party, escape, victory, defeat" });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, screenshots: output }, null, 2));
} finally { await browser.close(); }
