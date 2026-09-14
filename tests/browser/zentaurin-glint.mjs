// Browser integration QA. Start tools/dev-server.cjs on port 4181 before running.
// The real battle UI and boss artwork are used with an isolated in-memory character.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.ARROW_GLINT_TEST_URL || "http://127.0.0.1:4179";
const output = process.env.ARROW_GLINT_TEST_OUTPUT || path.resolve("artifacts/zentaurin-glint");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.ARROW_GLINT_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const [layout, width, height] of [["pc", 1280, 900], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated Zentaurin browser QA."
    }));
    await page.goto(origin);
    const started = await page.evaluate(async () => {
      const battle = await import("/js/battle.js");
      const { createBossCombatant } = await import("/data/bosses.js");
      const { createInitialCharacter } = await import("/data/classes.js");
      document.querySelector("#titleScreen").hidden = true;
      document.body.classList.remove("title-active");
      const character = createInitialCharacter({ name: "GLINT QA", job: "mage" });
      character.hp = character.maxHp = 99999;
      character.sp = character.maxSp = 99999;
      battle.configureBattle({
        root: document.querySelector("#battleScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        messageEl: document.querySelector("#message"),
        getCharacter: () => character,
        onCharacterChanged: changes => Object.assign(character, changes),
        playSe: () => {},
        getFrameRate: () => 30,
        isMobileDevice: () => innerWidth <= 600
      });
      return battle.startBattle(createBossCombatant("zentaurin_b96f"), { playStartSe: false });
    });
    assert.equal(started, true, `${layout}: battle starts`);
    const image = page.locator("#battleEnemyImage");
    await image.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector("#battleEnemyImage");
      return image?.complete && image.naturalWidth > 0;
    });
    const snapshot = await page.evaluate(() => {
      const image = document.querySelector("#battleEnemyImage");
      const viewport = document.querySelector(".viewport").getBoundingClientRect();
      return {
        name: document.querySelector("#battleEnemyName")?.textContent || "",
        src: image.getAttribute("src"),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        hpPercent: document.querySelector("#battleBossHpMeter")?.getAttribute("aria-valuenow"),
        fitsViewport: viewport.left >= -1 && viewport.right <= innerWidth + 1
          && document.documentElement.scrollWidth <= innerWidth
      };
    });
    assert.match(snapshot.name, /ツェンタウリン/);
    assert.match(snapshot.src, /images\/bosses\/boss_24\.avif$/);
    assert.equal(snapshot.hpPercent, "100");
    assert.equal(snapshot.fitsViewport, true, `${layout}: battle UI fits viewport`);
    await page.waitForTimeout(2000);
    await page.waitForFunction(() => {
      const c=document.querySelector('.battle-enemy-ambient-front');
      return c && c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>200);
    });
    await page.locator(".viewport").screenshot({ path: path.join(output, `${layout}.png`) });
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => {
      const c=document.querySelector('.battle-enemy-ambient-front');
      return c && !c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
    });
    results.push({ layout, ...snapshot });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
