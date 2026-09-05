// Browser integration QA. Start tools/dev-server.cjs before running this file.
// The real page, CSS, item overlay, battle UI, battle engine, and boss artwork are
// used with an isolated in-memory character; the shipped game exposes no test API.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.HERBICIDE_TEST_URL || "http://127.0.0.1:4175";
const output = process.env.HERBICIDE_TEST_OUTPUT || path.join(os.tmpdir(), "nda-herbicide-qa");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.HERBICIDE_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const warnings = [];

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (["warning", "error"].includes(message.type())) warnings.push(message.text());
  });
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: "// Isolated strong-herbicide browser QA."
  }));
  await page.goto(origin);
  await page.evaluate(async () => {
    const battle = await import("/js/battle.js");
    const items = await import("/js/item-overlay.js");
    const { createInitialCharacter } = await import("/data/classes.js");
    const { grantItem, getItemCount } = await import("/data/inventory.js");
    const { createBossCombatant } = await import("/data/bosses.js");
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    let character = createInitialCharacter({ name: "HERBICIDE QA", job: "warrior" });
    character.inventory = grantItem(character.inventory, "strong_herbicide", 3).inventory;
    character.hp = character.maxHp = 99999;
    const completed = [];
    const playedSe = [];
    const observed = { hit: false, vanished: false, numbers: [], messages: [] };
    const enemyImage = document.querySelector("#battleEnemyImage");
    const enemyStage = enemyImage.closest(".battle-enemy-stage");
    const numberLayer = document.querySelector("#battleEnemyNumbers");
    const message = document.querySelector("#message");
    new MutationObserver(() => {
      if (enemyImage.classList.contains("is-hit")) observed.hit = true;
    }).observe(enemyImage, { attributes: true, attributeFilter: ["class"] });
    new MutationObserver(() => {
      if (enemyStage.dataset.vanishPending === "true" || enemyStage.dataset.vanishPlaying === "true") observed.vanished = true;
    }).observe(enemyStage, { attributes: true, attributeFilter: ["data-vanish-pending", "data-vanish-playing"] });
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("battle-number")) observed.numbers.push(node.textContent);
      }
    }).observe(numberLayer, { childList: true });
    new MutationObserver(() => observed.messages.push(message.textContent)).observe(message, {
      childList: true,
      characterData: true,
      subtree: true
    });
    items.configureItemOverlay({ root: document.querySelector("#itemOverlay"), messageEl: message, playSe: () => {} });
    battle.configureBattle({
      root: document.querySelector("#battleScreen"),
      commandRoot: document.querySelector("#dungeonCommands"),
      messageEl: message,
      getCharacter: () => character,
      onCharacterChanged: patch => Object.assign(character, patch),
      onVictory: result => completed.push(result.outcome),
      onDefeat: result => completed.push(result.outcome),
      onEscape: result => completed.push(result.outcome),
      openItems: ({ character: battleCharacter, enemy, enemies, onUse }) => items.openItemOverlay({
        context: "battle", character: battleCharacter, enemy, enemies, onUse
      }),
      playSe: id => playedSe.push(id)
    });
    window.herbicideQa = {
      battle,
      completed,
      playedSe,
      observed,
      resetObserved() {
        observed.hit = false;
        observed.vanished = false;
        observed.numbers.length = 0;
        observed.messages.length = 0;
      },
      start(hp) {
        const enemy = createBossCombatant("fleischfresser_b59f");
        enemy.hp = hp;
        enemy.escapeRate = 1;
        enemy.actions = [{
          weight: 1,
          action: { id: "qa_wait", name: "待機", actionType: "wait", speedModifier: -1000, waitMessage: "待機" }
        }];
        return battle.startBattle(enemy, { playStartSe: false });
      },
      itemCount: () => getItemCount(character.inventory, "strong_herbicide")
    };
  });

  async function useHerbicide() {
    await page.locator('[data-battle-command="items"]').click();
    await page.locator("#itemOverlay .skill-overlay-item", { hasText: "強力除草剤" }).click();
    await page.waitForFunction(() => herbicideQa.observed.hit && herbicideQa.observed.numbers.includes("500"));
  }

  assert.equal(await page.evaluate(() => herbicideQa.start(10000)), true);
  await page.evaluate(() => herbicideQa.resetObserved());
  await useHerbicide();
  assert.equal(await page.locator("#battleBossHpMeter").getAttribute("aria-valuenow"), "95");
  assert.match(await page.locator("#message").textContent(), /500の固定ダメージ/);
  assert.match(await page.locator("#message").textContent(), /再生能力が5ターン停止/);
  await page.locator(".viewport").screenshot({ path: path.join(output, "first-use.png") });
  await page.waitForFunction(() => document.querySelectorAll("#battleEnemyNumbers .battle-number").length === 0);
  assert.equal(await page.evaluate(() => herbicideQa.itemCount()), 2);

  await page.evaluate(() => herbicideQa.resetObserved());
  await useHerbicide();
  assert.equal(await page.locator("#battleBossHpMeter").getAttribute("aria-valuenow"), "90");
  assert.match(await page.locator("#message").textContent(), /再生停止時間が5ターンに延長/);
  assert.equal(await page.evaluate(() => herbicideQa.itemCount()), 1);
  await page.waitForFunction(() => document.querySelectorAll("#battleEnemyNumbers .battle-number").length === 0);

  await page.locator('[data-battle-command="escape"]').click();
  await page.evaluate(() => herbicideQa.battle.handleBattleInput("confirm"));
  await page.waitForFunction(() => !herbicideQa.battle.isBattleActive());
  assert.deepEqual(await page.evaluate(() => herbicideQa.completed), ["escaped"]);

  assert.equal(await page.evaluate(() => herbicideQa.start(500)), true);
  await page.evaluate(() => herbicideQa.resetObserved());
  await useHerbicide();
  assert.equal(await page.locator("#battleBossHpMeter").getAttribute("aria-valuenow"), "0");
  assert.equal(await page.evaluate(() => herbicideQa.observed.vanished), true);
  await page.locator(".viewport").screenshot({ path: path.join(output, "lethal-use.png") });
  await page.waitForFunction(() => document.querySelector("#message").textContent.includes("＊Aボタンで次へ"));
  await page.evaluate(() => herbicideQa.battle.handleBattleInput("confirm"));
  await page.waitForFunction(() => !herbicideQa.battle.isBattleActive());
  assert.deepEqual(await page.evaluate(() => herbicideQa.completed), ["escaped", "victory"]);
  assert.equal(await page.evaluate(() => herbicideQa.itemCount()), 0);
  assert.equal(await page.evaluate(() => herbicideQa.playedSe.includes("attackHit")), true);
  assert.equal(await page.evaluate(() => herbicideQa.playedSe.includes("battleVictory")), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  console.log(JSON.stringify({
    firstHpPercent: 95,
    secondHpPercent: 90,
    lethalHpPercent: 0,
    completed: await page.evaluate(() => herbicideQa.completed),
    observedHit: await page.evaluate(() => herbicideQa.observed.hit),
    observedVanish: await page.evaluate(() => herbicideQa.observed.vanished),
    errors,
    warnings,
    output
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
