// Runs against an isolated browser context. The test hook is injected into the
// served module, so the shipped game exposes no debug API and no player save is used.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.MANA_RECOVERY_TEST_URL || "http://127.0.0.1:4175";
const output = process.env.MANA_RECOVERY_TEST_OUTPUT || path.join(os.tmpdir(), "nda-mana-recovery-qa");
const source = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const hook = `window.manaRecoveryQa = {
  setup() {
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    saveEnabled = true;
    character = createInitialCharacter({ name: 'MANA RECOVERY QA', job: 'warrior' });
    character.level = 40;
    character.baseStats = { ...character.baseStats, str: 100, dex: 100, agi: 100 };
    character.cards = {
      ownedCardIds: ['rare_mana_recovery'],
      ownedCardCounts: { rare_mana_recovery: 1 },
      deckSlots: ['rare_mana_recovery', null, null, null, null, null]
    };
    character = normalizeCharacter(character);
    character.sp = 20;
    currentDepth = 1;
    worldLocation = 'dungeon';
    closeCampMenu();
    closeTown();
    resetDungeon('', null, true);
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    updateCharacterUi();
  },
  victory: finishBattleVictory,
  start() {
    const enemy = createEnemyCombatant(getEnemyById('abyss_rat'));
    enemy.hp = enemy.maxHp = 1;
    return startBattle(enemy, { playStartSe: false });
  },
  action: handleBattleInput,
  active: isBattleActive,
  load: () => continueGame('auto'),
  status: openStatusMenu,
  setSp(value) { character.sp = value; updateCharacterUi(); },
  state: () => ({ character: structuredClone(character), location: worldLocation })
};`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.MANA_RECOVERY_TEST_CHANNEL || "msedge",
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
    body: source.replace(
      '  document.documentElement.dataset.ndaMainReady = "true";',
      `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
    )
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.manaRecoveryQa);
  const battleResult = await page.evaluate(async () => {
    manaRecoveryQa.setup();
    const { createBattleState, resolveBattleRound } = await import("/combat/battle-engine.js");
    const { createEnemyCombatant, getEnemyById } = await import("/data/enemies.js");
    const { createBattleCompletionSnapshot } = await import("/js/battle.js");
    const enemy = createEnemyCombatant(getEnemyById("abyss_rat"));
    enemy.hp = enemy.maxHp = 1;
    let battle = createBattleState({ character: manaRecoveryQa.state().character, enemy });
    battle.encounterBossId = enemy.id;
    battle = resolveBattleRound({
      battle,
      playerCommand: { type: "attack" },
      rng: () => 0.5
    }).battle;
    const snapshot = createBattleCompletionSnapshot(battle);
    manaRecoveryQa.victory(snapshot);
    return {
      outcome: snapshot.outcome,
      sp: snapshot.player.sp,
      recoveryEvents: snapshot.presentationEvents.filter(event => event.type === "spHealing").length
    };
  });

  assert.deepEqual(battleResult, { outcome: "victory", sp: 25, recoveryEvents: 1 });
  assert.equal(await page.evaluate(() => manaRecoveryQa.state().character.sp), 25);
  assert.equal(await page.locator("#quickSpCurrent").textContent(), "25");
  await page.evaluate(() => manaRecoveryQa.status());
  assert.match(await page.locator(".nde-status-vitals").textContent(), /SP 25 \/ /);

  const savedSp = await page.evaluate(async () => (await import("/js/save-data.js")).loadGame("auto").character.sp);
  assert.equal(savedSp, 25);
  await page.evaluate(() => {
    manaRecoveryQa.setSp(1);
    manaRecoveryQa.load();
  });
  assert.equal(await page.evaluate(() => manaRecoveryQa.state().character.sp), 25);
  assert.equal(await page.locator("#quickSpCurrent").textContent(), "25");
  assert.match(await page.locator(".nde-status-vitals").textContent(), /SP 25 \/ /);

  // Exercise the ordinary battle screen path as well: command, presentation,
  // finish input, HUD/autosave, and reload all use the same persistent state.
  await page.evaluate(() => manaRecoveryQa.setup());
  assert.equal(await page.evaluate(() => manaRecoveryQa.start()), true);
  await page.evaluate(() => {
    const random = Math.random;
    Math.random = () => 0.5;
    manaRecoveryQa.action("confirm");
    Math.random = random;
  });
  await page.waitForTimeout(1800);
  await page.evaluate(() => manaRecoveryQa.action("confirm"));
  await page.waitForFunction(() => !manaRecoveryQa.active());
  assert.equal(await page.evaluate(() => manaRecoveryQa.state().character.sp), 25);
  assert.equal(await page.locator("#quickSpCurrent").textContent(), "25");
  const actualSavedSp = await page.evaluate(async () => (await import("/js/save-data.js")).loadGame("auto").character.sp);
  assert.equal(actualSavedSp, 25);
  await page.evaluate(() => {
    manaRecoveryQa.setSp(1);
    manaRecoveryQa.load();
    manaRecoveryQa.status();
  });
  assert.equal(await page.evaluate(() => manaRecoveryQa.state().character.sp), 25);
  assert.match(await page.locator(".nde-status-vitals").textContent(), /SP 25 \/ /);
  await page.screenshot({ path: path.join(output, "loaded-status.png") });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ battleResult, savedSp, actualSavedSp, loadedSp: 25, errors, warnings, output }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
