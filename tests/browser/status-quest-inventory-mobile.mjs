// Browser QA for responsive inventory rows and status quest pages.
// Start tools/dev-server.cjs on port 4191 before running this file.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.STATUS_QUEST_TEST_URL || "http://127.0.0.1:4191";
const browser = await chromium.launch({
  channel: process.env.STATUS_QUEST_TEST_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const errors = [];
const results = [];

try {
  for (const [layout, width, height, touch, expectedRows] of [
    ["pc", 1280, 900, false, 10],
    ["mobile", 390, 844, true, 8]
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout} pageerror: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${layout} console: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated menu layout QA."
    }));
    await page.goto(origin);

    await page.evaluate(async selectedLayout => {
      const { createInitialCharacter } = await import("/data/classes.js");
      const { grantEquipmentInstance } = await import("/data/equipment-inventory.js");
      const quests = await import("/data/quests.js");
      const menu = await import("/js/menu.js");
      document.querySelector("#titleScreen").hidden = true;
      document.body.className = `layout-${selectedLayout} ${selectedLayout === "mobile" ? "input-touch touch-controls-enabled" : "input-pointer"}`;
      document.documentElement.style.setProperty("--nde-visible-height", `${innerHeight}px`);
      let character = createInitialCharacter({ name: "MENU QA", job: "warrior" });
      for (let index = 0; index < 12; index += 1) {
        const result = grantEquipmentInstance(character, "anti_magic_hat", "headId", {
          enhancement: index % 4,
          locked: index % 3 === 0
        });
        if (!result.accepted) throw new Error(`equipment grant failed at ${index}`);
        character = result.character;
      }
      character = {
        ...character,
        quests: {
          active: {
            [quests.GUILD_TRIAL_QUEST_ID]: { progress: 2 },
            [quests.SLIME_EXTERMINATION_QUEST_ID]: { progress: 15 },
            [quests.FLOOR_SURVEY_QUEST_ID]: { progress: 64 }
          },
          completedQuestIds: []
        }
      };
      window.__menuQaCharacter = character;
      menu.configureMenu({
        root: document.querySelector("#menuScreen"),
        commandRoot: document.querySelector("#dungeonCommands"),
        getCharacter: () => window.__menuQaCharacter,
        playSe: () => {},
        setBgmOptions: () => {}, setSeOptions: () => {}, setScreenShakeEnabled: () => {},
        setTorchFlickerEnabled: () => {}, setFrameRateMode: () => {}, setTorchFuelDisabled: () => {},
        setPresenceDisabled: () => {}, setMistOptions: () => {}, setWallColor: () => {}, setFloorColor: () => {},
        setNpcTypewriterOptions: () => {}, setTouchControlsMode: () => {}, setTouchMovementMode: () => {},
        setStopwatchVisible: () => {}, setMinimapRevealOptions: () => {}, onStatusOpened: () => {}
      });
      menu.openItemInventory();
      document.querySelector('[data-inventory-tab="equipment"]').click();
    }, layout);

    const inventory = await page.evaluate(() => {
      const list = document.querySelector("[data-inventory-list]");
      list.lastElementChild.click();
      const last = list.lastElementChild;
      const description = document.querySelector("[data-inventory-description]");
      const name = last.querySelector("span").getBoundingClientRect();
      const marker = last.querySelector("strong").getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const descriptionRect = description.getBoundingClientRect();
      return {
        rows: list.children.length,
        configuredRows: getComputedStyle(list).gridTemplateRows.split(" ").length,
        rects: { listTop: listRect.top, listBottom: listRect.bottom, listHeight: listRect.height, lastTop: lastRect.top, lastBottom: lastRect.bottom, lastHeight: lastRect.height, descriptionTop: descriptionRect.top },
        listContainsLast: lastRect.top >= listRect.top - 1 && lastRect.bottom <= listRect.bottom + 1,
        noDescriptionOverlap: lastRect.bottom <= descriptionRect.top + 1,
        noMarkerOverlap: name.right <= marker.left + 1,
        description: description.textContent
      };
    });
    assert.equal(inventory.rows, expectedRows, `${layout}: visible inventory rows`);
    assert.equal(inventory.configuredRows, expectedRows, `${layout}: CSS inventory tracks`);
    assert.equal(inventory.listContainsLast, true, `${layout}: last inventory row remains inside list`);
    assert.equal(inventory.noDescriptionOverlap, true, `${layout}: description does not overlap equipment row`);
    assert.equal(inventory.noMarkerOverlap, true, `${layout}: equipment name does not overlap markers`);
    assert.match(inventory.description, /装備条件なし/);

    await page.evaluate(async () => {
      const menu = await import("/js/menu.js");
      menu.openStatusMenu();
      const next = document.querySelector('[data-status-nav="next"]');
      next.click();
      next.click();
      next.click();
    });
    const firstQuest = await page.evaluate(() => {
      const panel = document.querySelector('[data-menu-view="status"]');
      const content = document.querySelector("[data-status-quest-content]");
      const pager = document.querySelector(".status-pager");
      const contentRect = content.getBoundingClientRect();
      const pagerRect = pager.getBoundingClientRect();
      return {
        indicator: document.querySelector("[data-status-indicator]").textContent,
        text: content.textContent,
        visible: !document.querySelector("[data-status-quest-page]").hidden,
        withinPanel: contentRect.left >= panel.getBoundingClientRect().left - 1
          && contentRect.right <= panel.getBoundingClientRect().right + 1,
        abovePager: contentRect.bottom <= pagerRect.top + 1,
        pageScrollY: scrollY,
        documentFits: document.documentElement.scrollWidth <= innerWidth + 1
      };
    });
    assert.equal(firstQuest.indicator, "4/6", `${layout}: dynamic status page count`);
    assert.equal(firstQuest.visible, true);
    assert.match(firstQuest.text, /002：スライム退治/);
    assert.match(firstQuest.text, /報告可能/);
    assert.match(firstQuest.text, /洞窟スライムを15匹討伐する/);
    assert.equal(firstQuest.withinPanel, true, `${layout}: quest content stays in panel`);
    assert.equal(firstQuest.abovePager, true, `${layout}: quest content stays above pager`);
    assert.equal(firstQuest.pageScrollY, 0);
    assert.equal(firstQuest.documentFits, true);

    await page.click('[data-status-nav="next"]');
    const secondQuest = await page.evaluate(() => ({
      indicator: document.querySelector("[data-status-indicator]").textContent,
      text: document.querySelector("[data-status-quest-content]").textContent
    }));
    assert.equal(secondQuest.indicator, "5/6");
    assert.match(secondQuest.text, /001：奈落ネズミ退治/);
    results.push({ layout, inventory, firstQuest, secondQuest });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(errors, []);
console.log(JSON.stringify(results, null, 2));