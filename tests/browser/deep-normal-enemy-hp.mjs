// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The shipped main module is extended only in the served test copy. Each browser
// context uses an isolated character and never reads or writes a player's save.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.DEEP_ENEMY_HP_TEST_URL || "http://127.0.0.1:4177";
const output = process.env.DEEP_ENEMY_HP_TEST_OUTPUT || path.join(os.tmpdir(), "nda-deep-enemy-hp-qa");
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const battleSource = await readFile(new URL("../../js/battle.js", import.meta.url), "utf8");
const pacingSource = await readFile(new URL("../../tools/simulate-deep-normal-enemy-battles.mjs", import.meta.url), "utf8");
const pacingBrowserSource = pacingSource.replace(/\nif \(import\.meta\.url === `[\s\S]*$/, "\n");
const hook = `window.deepEnemyHpQa = {
  async start({ job, level, band, depth, enemyIds }) {
    const { createPacingCharacter } = await import('../tools/simulate-deep-normal-enemy-battles.mjs');
    this.battleModule ||= await import('./battle.js');
    document.querySelector('#titleScreen').hidden = true;
    document.body.classList.remove('title-active');
    setBgmOptions({ enabled: false }); setSeOptions({ enabled: false });
    character = createPacingCharacter({ job, level, band, withNpcs: true });
    character.hp = character.maxHp = 99999;
    character.sp = character.maxSp = 99999;
    currentDepth = depth; worldLocation = 'dungeon'; saveEnabled = false;
    closeCampMenu('test'); closeTown();
    pendingEncounter = {
      enemyData: getEnemyById(enemyIds[0]),
      enemyPartyData: enemyIds.map(getEnemyById),
      ambush: false,
      concealed: false
    };
    updateCharacterUi();
    const experienceBefore = character.carriedExperience;
    const started = beginRandomBattle();
    return { started, experienceBefore };
  },
  state() { return structuredClone(character); },
  battle() { return this.battleModule.getDeepEnemyHpBrowserState(); },
  input(action) { return handleBattleInput(action); },
  finish() { return handleBattleInput('confirm'); }
};`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.DEEP_ENEMY_HP_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

const cases = Object.freeze([
  { band: "B60", depth: 64, level: 65, job: "warrior", enemyIds: ["abyss_giant_scorpion"], hp: [480], first: "attack", skill: "crushing_break" },
  { band: "B70", depth: 78, level: 75, job: "thief", enemyIds: ["abyss_piranha", "abyss_piranha", "abgrund_krabbe"], hp: [280, 280, 650], skill: "blade_dance" },
  { band: "B80", depth: 88, level: 85, job: "mage", enemyIds: ["amethyst_golem"], hp: [1100], skill: "lightning_bolt" },
  { band: "B90", depth: 96, level: 95, job: "priest", enemyIds: ["wraith"], hp: [1050], skill: "holy_light" }
]);

try {
  for (const [layout, width, height] of [["pc", 1280, 900], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
    });
    await page.addInitScript(() => {
      let seed = 0x4e444148;
      Math.random = () => {
        seed = Math.imul(seed ^ seed >>> 15, 1 | seed);
        seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed);
        return ((seed ^ seed >>> 14) >>> 0) / 4294967296;
      };
    });
    await page.route("**/js/battle.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${battleSource}\nexport function getDeepEnemyHpBrowserState() {\n  const battle = battleUi.battle;\n  return structuredClone({ active: battleUi.active, presenting: battleUi.presenting, outcome: battle?.outcome || null, turn: battle?.turn || 0, playerHp: battle?.player?.hp || 0, enemies: (battle?.enemies || [battle?.enemy]).filter(Boolean).map(enemy => ({ id: enemy.id, hp: enemy.hp, maxHp: enemy.maxHp, alive: enemy.alive })) });\n}`
    }));
    await page.route("**/tools/simulate-deep-normal-enemy-battles.mjs", route => route.fulfill({
      contentType: "text/javascript",
      body: pacingBrowserSource
    }));
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: mainSource.replace(
        '  document.documentElement.dataset.ndaMainReady = "true";',
        `${hook}\n  document.documentElement.dataset.ndaMainReady = "true";`
      )
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.deepEnemyHpQa);

    async function useSkill(skillId) {
      await page.evaluate(() => { deepEnemyHpQa.input("right"); deepEnemyHpQa.input("confirm"); });
      await page.locator("#skillOverlay").waitFor({ state: "visible" });
      for (let pageIndex = 0; pageIndex < 8; pageIndex += 1) {
        const skill = page.locator(`#skillOverlay [data-skill-id="${skillId}"]`);
        if (await skill.count()) {
          assert.equal(await skill.isDisabled(), false, `${layout} ${skillId} should be available`);
          await skill.click();
          return;
        }
        const next = page.locator("#skillOverlay [data-skill-next]");
        assert.equal(await next.isVisible(), true, `${layout} ${skillId} page navigation`);
        await next.click();
      }
      assert.fail(`${layout}: skill ${skillId} was not found`);
    }

    async function waitForRound(previousTurn, label) {
      try {
        await page.waitForFunction(turn => {
          const state = deepEnemyHpQa.battle();
          return !state.presenting && (state.turn > turn || state.outcome);
        }, previousTurn, { timeout: 60000 });
      } catch (error) {
        const diagnostic = await page.evaluate(() => ({
          battle: deepEnemyHpQa.battle(),
          message: document.querySelector("#message")?.textContent,
          skillOverlayOpen: !document.querySelector("#skillOverlay")?.hidden
        }));
        console.error(JSON.stringify({ layout, label, previousTurn, diagnostic }, null, 2));
        throw error;
      }
      return page.evaluate(() => deepEnemyHpQa.battle());
    }

    for (const definition of cases) {
      const started = await page.evaluate(testCase => deepEnemyHpQa.start(testCase), definition);
      assert.equal(started.started, true, `${layout} ${definition.band} starts`);
      await page.waitForFunction(() => !document.querySelector("#battleScreen").hidden);
      await page.waitForFunction(() => [...document.querySelectorAll("#battleEnemyImage, .battle-enemy-member-image")]
        .filter(image => image.getClientRects().length).every(image => image.complete && image.naturalWidth > 0));
      let battle = await page.evaluate(() => deepEnemyHpQa.battle());
      assert.deepEqual(battle.enemies.map(enemy => enemy.id), definition.enemyIds, `${layout} ${definition.band} formation`);
      assert.deepEqual(battle.enemies.map(enemy => enemy.maxHp), definition.hp, `${layout} ${definition.band} maxHp`);
      assert.deepEqual(battle.enemies.map(enemy => enemy.hp), definition.hp, `${layout} ${definition.band} starting hp`);
      assert.equal(await page.locator(".battle-enemy-member").evaluateAll(elements =>
        elements.filter(element => element.getClientRects().length).length
      ), definition.enemyIds.length > 1 ? definition.enemyIds.length : 0);
      assert.ok(await page.locator("#battleScreen").evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= -1 && bounds.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
      }), `${layout} ${definition.band} viewport fit`);

      if (definition.first === "attack") {
        const previousTurn = battle.turn;
        await page.evaluate(() => deepEnemyHpQa.input("confirm"));
        battle = await waitForRound(previousTurn, `${definition.band}:attack`);
        assert.ok(battle.enemies[0].hp < definition.hp[0], `${layout} normal attack reduces HP`);
      }
      let rounds = definition.first ? 1 : 0;
      while (!battle.outcome && rounds < 30) {
        const previousTurn = battle.turn;
        await useSkill(definition.skill);
        battle = await waitForRound(previousTurn, `${definition.band}:${definition.skill}:${rounds + 1}`);
        rounds += 1;
      }
      assert.equal(battle.outcome, "victory", `${layout} ${definition.band} victory`);
      await page.locator(".viewport").screenshot({ path: path.join(output, `${layout}-${definition.band.toLowerCase()}-victory.png`) });
      assert.match(await page.locator("#message").textContent(), /Aボタンで次へ/);
      await page.evaluate(() => deepEnemyHpQa.finish());
      await page.waitForFunction(() => !deepEnemyHpQa.battle().active);
      await page.waitForFunction(() => document.querySelector("#message").textContent.includes("EXPを獲得した"));
      const character = await page.evaluate(() => deepEnemyHpQa.state());
      assert.ok(character.carriedExperience > started.experienceBefore, `${layout} ${definition.band} experience reward`);
      for (const enemyId of new Set(definition.enemyIds)) {
        assert.ok(character.compendium.monsters[enemyId]?.defeated, `${layout} ${enemyId} compendium defeat`);
      }
      assert.equal(await page.locator("#battleScreen").isHidden(), true, `${layout} ${definition.band} closes`);
      results.push({ layout, band: definition.band, job: definition.job, enemies: definition.enemyIds, rounds });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
