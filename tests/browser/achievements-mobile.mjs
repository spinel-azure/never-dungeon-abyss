// Browser layout QA for the expanded achievement list and the mobile guild quest pager.
// Start tools/dev-server.cjs, then run with Playwright available.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.ACHIEVEMENTS_TEST_URL || "http://127.0.0.1:4187";
const output = process.env.ACHIEVEMENTS_TEST_OUTPUT || path.join(os.tmpdir(), "nda-achievements-qa");
await mkdir(output, { recursive: true });

const townSource = await readFile(new URL("../../js/town.js", import.meta.url), "utf8");
const townHook = `
window.achievementMobileTownQa = {
  setup(character) {
    configureTown({
      root: document.querySelector("#townScreen"),
      messageEl: document.querySelector("#message"),
      commandRoot: document.querySelector("#dungeonCommands"),
      getCharacter: () => character,
      playSe: () => {},
      onStateChanged: () => {}
    });
    setTownTypewriterOptions({ enabled: false });
    openTown({ registrationRequired: false, facilityId: "guild", mode: "facilityMenu" });
    openGuildQuestList("report");
  },
  snapshot: () => ({
    mode: town.mode,
    page: town.questPage,
    count: town.guildQuestList.children.length,
    labels: [...town.guildQuestList.children].map(button => button.textContent)
  })
};`;

const browser = await chromium.launch({
  channel: process.env.ACHIEVEMENTS_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const results = [];

try {
  for (const [layout, width, height, touch] of [["pc", 1280, 900, false], ["mobile", 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout} pageerror: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${layout} console: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated achievement and guild layout QA."
    }));
    await page.route("**/js/town.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${townSource}\n${townHook}`
    }));
    await page.goto(origin);

    await page.evaluate(async ({ layout, touch }) => {
      localStorage.clear();
      const { createInitialCharacter } = await import("/data/classes.js");
      const menu = await import("/js/menu.js");
      document.querySelector("#titleScreen").hidden = true;
      document.body.className = `layout-${layout} ${touch ? "input-touch" : "input-pointer"}`;
      window.__achievementQaCharacter = createInitialCharacter({ name: "ACHIEVEMENT QA", job: "warrior" });
      menu.configureMenu({
        root: document.querySelector("#menuScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        getCharacter: () => window.__achievementQaCharacter,
        playSe: () => {},
        setBgmOptions: () => {},
        setSeOptions: () => {},
        setScreenShakeEnabled: () => {},
        setTorchFlickerEnabled: () => {},
        setFrameRateMode: () => {},
        setTorchFuelDisabled: () => {},
        setPresenceDisabled: () => {},
        setMistOptions: () => {},
        setWallColor: () => {},
        setFloorColor: () => {},
        setNpcTypewriterOptions: () => {},
        setTouchControlsMode: () => {},
        setTouchMovementMode: () => {},
        setStopwatchVisible: () => {},
        setMinimapRevealOptions: () => {}
      });
      menu.openAdventureRecords();
      document.querySelector('[data-adventure-records-tab="chronicle"]').click();
    }, { layout, touch });

    const achievementPages = [];
    while (true) {
      const pageState = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("[data-adventure-record-id]")];
        return {
          page: document.querySelector("[data-adventure-records-page]").textContent,
          rows: rows.map(row => {
            const label = row.querySelector("span");
            const status = row.querySelector("strong");
            const labelRect = label.getBoundingClientRect();
            const statusRect = status.getBoundingClientRect();
            return {
              id: row.dataset.adventureRecordId,
              text: row.textContent,
              whiteSpace: getComputedStyle(label).whiteSpace,
              rowHeight: row.getBoundingClientRect().height,
              labelHeight: labelRect.height,
              fitsBeforeStatus: labelRect.right <= statusRect.left + 0.5,
              fitsOwnBox: label.scrollWidth <= label.clientWidth + 1
            };
          }),
          nextDisabled: document.querySelector('[data-adventure-records-nav="next"]').disabled
        };
      });
      achievementPages.push(pageState);
      if (pageState.nextDisabled) break;
      await page.locator('[data-adventure-records-nav="next"]').click();
    }
    const achievementRows = achievementPages.flatMap(entry => entry.rows);
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――死毒の主")));
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――黄金の稲穂の女神")));
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――豊穣感謝際")));
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――お得意様")));
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――悠久の冒険者")));
    assert.ok(achievementRows.some(row => row.text.includes("？？？？？？――やりこみ王")));
    assert.ok(achievementRows.every(row => row.whiteSpace === "nowrap"));
    if (layout === "mobile") {
      assert.ok(achievementRows.every(row => row.fitsBeforeStatus && row.fitsOwnBox),
        JSON.stringify(achievementRows.filter(row => !row.fitsBeforeStatus || !row.fitsOwnBox)));
    }
    await page.locator("#menuScreen").screenshot({ path: path.join(output, `${layout}-achievements-last-page.png`) });
    if (achievementPages.length > 1) {
      await page.locator('[data-adventure-records-nav="back"]').click();
      await page.locator("#menuScreen").screenshot({ path: path.join(output, `${layout}-achievements-new-page.png`) });
    }

    if (layout === "mobile") {
      await page.evaluate(async () => {
        const { QUESTS } = await import("/data/quests.js");
        const menu = await import("/js/menu.js");
        const character = window.__achievementQaCharacter;
        character.quests.active = Object.fromEntries(QUESTS.slice(0, 6).map(quest => [quest.id, { progress: 0 }]));
        menu.closeCampMenu("main");
        await import("/js/town.js");
        window.achievementMobileTownQa.setup(character);
      });
      const guild = await page.evaluate(() => ({
        ...window.achievementMobileTownQa.snapshot(),
        metrics: [...document.querySelectorAll(".guild-quest-entry")].map(button => ({
          scrollWidth: button.scrollWidth,
          clientWidth: button.clientWidth,
          fontSize: getComputedStyle(button).fontSize,
          whiteSpace: getComputedStyle(button).whiteSpace
        }))
      }));
      assert.equal(guild.mode, "questReportList");
      assert.equal(guild.count, 3);
      assert.ok(guild.metrics.every(metric => metric.scrollWidth <= metric.clientWidth + 1), JSON.stringify(guild));
      assert.ok(guild.metrics.every(metric => metric.whiteSpace === "nowrap"));
      await page.locator("#townScreen").screenshot({ path: path.join(output, "mobile-guild-three-quests.png") });
      results.push({ layout, pages: achievementPages.length, guild, output });
    } else {
      results.push({ layout, pages: achievementPages.length, output });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, output }, null, 2));
} finally {
  await browser.close();
}
