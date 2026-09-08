// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// Main bootstrap is skipped so no player save is read or changed.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.BATTLE_SPEED_TEST_URL || "http://127.0.0.1:4175";
const output = process.env.BATTLE_SPEED_TEST_OUTPUT || path.join(os.tmpdir(), "nda-battle-speed-qa");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BATTLE_SPEED_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const results = [];

try {
  for (const [name, width, height] of [["pc", 1280, 900], ["mobile", 390, 844], ["tablet", 820, 1180]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      hasTouch: name !== "pc"
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${name}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// isolated battle-speed browser QA"
    }));
    await page.addInitScript(() => { Math.random = () => .5; });
    await page.goto(origin);
    await page.evaluate(async layout => {
      const battle = await import("/js/battle.js");
      const { configureInput } = await import("/js/input.js");
      const { createInitialCharacter } = await import("/data/classes.js");
      const { createEnemyCombatant, getEnemyById } = await import("/data/enemies.js");
      document.querySelector("#titleScreen").hidden = true;
      document.body.className = `layout-${layout} orientation-portrait input-${layout === "pc" ? "pointer" : "touch"}`;
      configureInput({
        forwardBtn: document.querySelector("#forward"),
        backBtn: document.querySelector("#back"),
        leftBtn: document.querySelector("#left"),
        rightBtn: document.querySelector("#right"),
        autoReturnBtn: document.querySelector("#autoReturn"),
        randomGenerateBtn: document.querySelector("#randomGenerate"),
        buttonA: document.querySelector("#buttonA"),
        buttonB: document.querySelector("#buttonB"),
        commandRoot: null,
        manualMove: () => false,
        manualTurn: () => false,
        startAutoReturn: () => false,
        generateRandomDungeon: () => false,
        handleMenuInput: () => false
      });
      let character = createInitialCharacter({ name: "速度確認", job: "warrior" });
      character.hp = character.maxHp = 9999;
      character.baseStats = { ...character.baseStats, str: 50, dex: 50, agi: 50 };
      let speedMode = "fast";
      let setCount = 0;
      const sounds = [];
      const configure = () => battle.configureBattle({
        root: document.querySelector("#battleScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        messageEl: document.querySelector("#message"),
        getCharacter: () => character,
        onCharacterChanged: patch => Object.assign(character, patch),
        getBattleSpeedMode: () => speedMode,
        setBattleSpeedMode: mode => { speedMode = mode; setCount++; return speedMode; },
        playSe: key => sounds.push(key)
      });
      configure();
      window.qa = {
        ...battle,
        configure,
        sounds,
        get speedMode() { return speedMode; },
        set speedMode(mode) { speedMode = mode; },
        get setCount() { return setCount; },
        start() {
          const enemy = createEnemyCombatant(getEnemyById("abyss_rat"));
          enemy.hp = enemy.maxHp = 9999;
          enemy.escapeRate = 1;
          return battle.startBattle(enemy, { playStartSe: false });
        }
      };
    }, name);

    assert.equal(await page.evaluate(() => qa.start()), true);
    const toggle = page.locator("#battleSpeedToggle");
    const pressToggle = () => name === "pc" ? toggle.click() : toggle.tap();
    await assert.doesNotReject(() => toggle.waitFor({ state: "visible" }));
    assert.equal(await toggle.textContent(), "⏩");
    assert.equal(await toggle.getAttribute("data-speed"), "fast");
    assert.match(await toggle.getAttribute("aria-label"), /戦闘速度：倍速/);
    const bounds = await page.evaluate(() => {
      const button = document.querySelector("#battleSpeedToggle").getBoundingClientRect();
      const root = document.querySelector("#battleScreen").getBoundingClientRect();
      return {
        width: button.width,
        height: button.height,
        rightGap: root.right - button.right,
        bottomGap: root.bottom - button.bottom,
        rootWidth: root.width,
        rootHeight: root.height
      };
    });
    assert.ok(bounds.width >= 44 && bounds.height >= 44, JSON.stringify(bounds));
    assert.ok(bounds.rightGap >= 0 && bounds.rightGap <= 16, JSON.stringify(bounds));
    assert.ok(bounds.bottomGap >= 0 && bounds.bottomGap <= 16, JSON.stringify(bounds));

    await pressToggle();
    assert.equal(await toggle.textContent(), "▶");
    assert.equal(await toggle.getAttribute("data-speed"), "normal");
    assert.match(await toggle.getAttribute("aria-label"), /戦闘速度：等速/);
    assert.equal(await page.evaluate(() => qa.speedMode), "normal");
    assert.deepEqual(await page.evaluate(() => qa.sounds), ["cursorMove"]);
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-battle-speed-normal.png`) });

    await page.locator('[data-battle-command="attack"]').click();
    await page.waitForTimeout(40);
    await pressToggle();
    assert.equal(await toggle.textContent(), "⏯", "speed remains switchable during presentation");
    assert.equal(await toggle.getAttribute("data-speed"), "slow");
    assert.match(await toggle.getAttribute("aria-label"), /戦闘速度：低速/);
    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-battle-speed-slow.png`) });
    await pressToggle();
    assert.equal(await toggle.textContent(), "⏩");
    assert.equal(await toggle.getAttribute("data-speed"), "fast");
    await page.waitForTimeout(1800);

    await page.locator('[data-battle-command="escape"]').click();
    await page.waitForTimeout(50);
    await page.evaluate(() => qa.handleBattleInput("confirm"));
    assert.equal(await page.evaluate(() => qa.isBattleActive()), false);

    await page.evaluate(() => {
      qa.speedMode = "slow";
      qa.configure();
    });
    assert.equal(await page.evaluate(() => qa.start()), true);
    assert.equal(await toggle.textContent(), "⏯");
    assert.match(await toggle.getAttribute("aria-label"), /戦闘速度：低速/);
    const before = await page.evaluate(() => qa.setCount);
    await pressToggle();
    assert.equal(await page.evaluate(() => qa.setCount), before + 1, "reconfiguration must not duplicate click listeners");
    assert.equal(await toggle.textContent(), "⏩");

    await page.locator(".viewport").screenshot({ path: path.join(output, `${name}-battle-speed.png`) });
    results.push({ name, bounds });
    await context.close();
  }

  const settingsContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const settingsPage = await settingsContext.newPage();
  settingsPage.on("pageerror", error => errors.push(`settings: ${error.message}`));
  settingsPage.on("console", message => {
    if (message.type() === "error") errors.push(`settings: ${message.text()}`);
  });
  await settingsPage.goto(origin);
  await settingsPage.waitForFunction(() => document.documentElement.dataset.ndaMainReady === "true");
  await settingsPage.evaluate(() => {
    localStorage.setItem("nde-settings-v1", JSON.stringify({ battleSpeedMode: "slow" }));
  });
  await settingsPage.reload();
  await settingsPage.waitForFunction(() => document.documentElement.dataset.ndaMainReady === "true");
  assert.equal(
    await settingsPage.evaluate(async () => (await import("/js/menu.js")).getBattleSpeedMode()),
    "normal",
    "the former slow setting must keep its 1.8x pace after migration"
  );
  const stored = await settingsPage.evaluate(async () => {
    const menu = await import("/js/menu.js");
    menu.setBattleSpeedMode("slow");
    const settings = JSON.parse(localStorage.getItem("nde-settings-v1") || "null");
    return {
      mode: settings?.battleSpeedMode,
      version: settings?.battleSpeedSettingsVersion
    };
  });
  assert.deepEqual(stored, { mode: "slow", version: 2 });
  await settingsPage.reload();
  await settingsPage.waitForFunction(() => document.documentElement.dataset.ndaMainReady === "true");
  assert.equal(await settingsPage.evaluate(async () => (await import("/js/menu.js")).getBattleSpeedMode()), "slow");
  await settingsContext.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, output }, null, 2));
} finally {
  await browser.close();
}
