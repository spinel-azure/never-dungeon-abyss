// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The hook exists only in the served test copy of main.js and never enters the shipped game.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.MIDGAME_HP_TEST_URL || "http://127.0.0.1:4173";
const output = process.env.MIDGAME_HP_TEST_OUTPUT || path.join(os.tmpdir(), "nda-midgame-hp-qa");
const source = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const hook = `window.midgameHpQa = {
  setup() {
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    setBgmOptions({ enabled: false }); setSeOptions({ enabled: false });
    character = normalizeCharacter({ ...createInitialCharacter({ name: 'HP QA', job: 'priest' }), level: 54 });
    character.hp = character.maxHp;
    currentDepth = 50; worldLocation = 'town';
    openTown({ registrationRequired: false });
    updateCharacterUi(); renderCharacterStatus();
  },
  status() { openStatusMenu(); },
  battle() {
    closeCampMenu('test'); closeTown(); worldLocation = 'dungeon';
    pendingEncounter = { enemyData: getEnemyById('abyss_tiger'), enemyPartyData: [getEnemyById('abyss_tiger')] };
    return beginRandomBattle();
  },
  state() { return structuredClone(character); }
};`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.MIDGAME_HP_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const consoleErrors = [];
const results = [];

try {
  for (const [layout, width, height, reducedMotion] of [
    ["pc", 1280, 900, "no-preference"],
    ["mobile", 390, 844, "no-preference"],
    ["tablet", 820, 1180, "reduce"]
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: source.replace(
        '  document.documentElement.dataset.ndaMainReady = "true";',
        `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
      )
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.midgameHpQa);
    await page.evaluate(() => midgameHpQa.setup());

    assert.equal(await page.locator("#quickHpMax").textContent(), "166", `${layout} quick status`);
    assert.equal((await page.evaluate(() => midgameHpQa.state())).maxSp, 166, `${layout} unchanged SP`);

    await page.evaluate(() => midgameHpQa.status());
    await page.locator('[data-menu-view="status"]').waitFor({ state: "visible" });
    assert.match(await page.locator(".nde-status-vitals").innerText(), /HP\s+166\s*\/\s*166/, `${layout} status screen`);
    await page.screenshot({ path: path.join(output, `${layout}-status.png`) });

    assert.equal(await page.evaluate(() => midgameHpQa.battle()), true, `${layout} battle start`);
    await page.waitForFunction(() => !document.querySelector("#battleScreen").hidden);
    assert.equal(await page.locator("#quickHpMax").textContent(), "166", `${layout} battle HUD`);
    await page.screenshot({ path: path.join(output, `${layout}-battle.png`) });
    results.push({ layout, width, height, hp: 166, sp: 166 });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(errors, [], `page errors: ${errors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, errors, consoleErrors, output }, null, 2));
