// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The injected hook shortens only the isolated QA page's presentation waits.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.TEMPLE_REVIVAL_TEST_URL || "http://127.0.0.1:4173";
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const acceleratedSource = mainSource.replace(
  "return new Promise(resolve => window.setTimeout(resolve, milliseconds));",
  "return new Promise(resolve => window.setTimeout(resolve, Math.min(milliseconds, 5)));"
);
assert.notEqual(acceleratedSource, mainSource, "revival QA wait hook was installed");

const mainHook = `
let templeRevivalQaPromise = null;
window.templeRevivalQa = {
  start({ assigned = false, festival = false, loot = false } = {}) {
    localStorage.clear();
    saveEnabled = false;
    character = createInitialCharacter({ name: "REVIVAL QA", job: "warrior" });
    character.alive = false;
    character.hp = 0;
    character.carriedExperience = 900;
    character.lootBagTutorialSeen = true;
    character.eventFlags = {
      ...(character.eventFlags || {}),
      ...(assigned ? { tavern_rumor_004_base_read: true } : {}),
      ...(festival ? { tavern_rumor_005_base_read: true } : {})
    };
    if (loot) character.lootBag.gold = 100;
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    setTownTypewriterOptions({ enabled: false });
    worldLocation = "dungeon";
    closeTown();
    templeRevivalQaPromise = completeDungeonDefeat();
  },
  finish: () => templeRevivalQaPromise,
  snapshot: () => ({
    message: document.querySelector("#message").textContent,
    portrait: document.querySelector("#townPortrait").getAttribute("src") || "",
    portraitLoaded: document.querySelector("#townPortrait").complete
      && document.querySelector("#townPortrait").naturalWidth > 0,
    prayerHidden: document.querySelector("#revivalPrayer").hidden,
    lootHidden: document.querySelector("#lootIdentifyOverlay").hidden
  })
};`;

function instrumentMain(source) {
  const anchor = '  document.documentElement.dataset.ndaMainReady = "true";';
  assert.equal(source.includes(anchor), true, "main QA hook anchor exists");
  return source.replace(anchor, `${mainHook}\n${anchor}`);
}

const cases = [
  {
    name: "irvine-no-loot",
    options: {},
    portrait: "images/npc/NPC_12.avif",
    message: "司祭アーヴァイン：おお…！女神の祈りが届いたか…！よくぞ目覚めた…！\n持ち帰るはずだった900EXPを失った。"
  },
  {
    name: "anastasia-with-loot",
    options: { assigned: true, loot: true },
    portrait: "images/npc/NPC_12c.avif",
    message: "助祭アナスタシア：ああ…！女神様に祈りが届いたのですね…！お気づきになって、本当によかった……。\n持ち帰るはずだった900EXPを失った。"
  },
  {
    name: "festival-anastasia-no-loot",
    options: { assigned: true, festival: true },
    portrait: "images/npc/NPC_12d.avif",
    message: "助祭アナスタシア：ああ…！女神様に祈りが届いたのですね…！お気づきになって、本当によかった……。\n持ち帰るはずだった900EXPを失った。"
  }
];

const browser = await chromium.launch({
  channel: process.env.TEMPLE_REVIVAL_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const results = [];
try {
  for (const testCase of cases) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(acceleratedSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.templeRevivalQa);
    await page.evaluate(options => templeRevivalQa.start(options), testCase.options);
    if (testCase.options.loot) {
      await page.locator("#lootIdentifyOverlay").waitFor({ state: "visible" });
      await page.locator("#lootIdentifyAction").click();
      await page.locator("#lootIdentifyAction").click();
    }
    const during = await page.evaluate(() => templeRevivalQa.snapshot());
    assert.equal(during.message, "", `${testCase.name}: no keeper dialogue is visible during the prayer`);
    await page.evaluate(() => templeRevivalQa.finish());
    const finished = await page.evaluate(() => templeRevivalQa.snapshot());
    assert.equal(finished.message, testCase.message, `${testCase.name}: post-prayer dialogue`);
    assert.ok(finished.portrait.endsWith(testCase.portrait), `${testCase.name}: portrait ${finished.portrait}`);
    assert.equal(finished.portraitLoaded, true, `${testCase.name}: portrait asset loads`);
    assert.equal(finished.prayerHidden, true, `${testCase.name}: prayer overlay has ended`);
    assert.equal(finished.lootHidden, true, `${testCase.name}: loot overlay is closed`);
    assert.deepEqual(errors, [], `${testCase.name}: browser errors`);
    results.push({ name: testCase.name, portrait: finished.portrait, message: finished.message });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
