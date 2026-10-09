// Browser integration QA. Start tools/dev-server.cjs before running.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.REINCARNATION_TEST_URL || "http://127.0.0.1:4173";
const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const acceleratedSource = mainSource.replace(
  "return new Promise(resolve => window.setTimeout(resolve, milliseconds));",
  "return new Promise(resolve => window.setTimeout(resolve, Math.min(milliseconds, 5)));"
);
assert.notEqual(acceleratedSource, mainSource, "reincarnation ceremony wait hook was installed");
const hook = String.raw`
window.reincarnationQa = {
  start() {
    localStorage.clear();
    saveEnabled = true;
    setTownTypewriterOptions({ enabled: false });
    setSeOptions({ enabled: false });
    character = createInitialCharacter({ name: "転生QA", job: "warrior" });
    const medal = grantKeyItem(character.keyItems, "royal_cat_medal");
    character = normalizeCharacter({
      ...character,
      level: 197,
      experience: 9999999,
      gold: 2500000,
      keyItems: medal.keyItems,
      eventFlags: {
        ...character.eventFlags,
        boss_amayenak_b100f_defeated: true,
        royal_cat_medal_awarded: true,
        reincarnation_unlocked_notified: true
      }
    });
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    worldLocation = "town";
    updateCharacterUi();
    openTown({ registrationRequired: false, facilityId: "temple", mode: "facilityMenu" });
  },
  input(action) { return handleRawTownInput(action); },
  showStatus() { closeTown(); openStatusMenu(); },
  snapshot() {
    const buttons = [...document.querySelectorAll("#dungeonCommands button")];
    const medal = document.querySelector("#reincarnationMedal");
    const medalImage = document.querySelector("#reincarnationMedalImage");
    return {
      message: document.querySelector("#message").textContent,
      mode: getTownState().mode,
      buttons: buttons.map(button => ({
        text: button.textContent,
        disabled: button.disabled,
        selected: button.classList.contains("is-selected")
      })),
      level: character.level,
      reincarnationCount: character.reincarnationCount,
      gold: character.gold,
      medalHidden: medal.hidden,
      medalSource: medalImage.getAttribute("src"),
      reincarnationText: document.querySelector("#statusReincarnation").textContent.trim(),
      ceremonyVisible: !document.querySelector("#sceneTransition").hidden,
      ceremonyImage: document.querySelector("#revivalGoddess").getAttribute("src"),
      ceremonyImageLoaded: document.querySelector("#revivalGoddess").complete
        && document.querySelector("#revivalGoddess").naturalWidth > 0,
      whiteout: document.querySelector("#sceneTransition").classList.contains("is-reincarnation-whiteout")
    };
  }
};`;

function instrumentMain(source) {
  const anchor = '  document.documentElement.dataset.ndaMainReady = "true";';
  assert.equal(source.includes(anchor), true);
  return source.replace(anchor, `${hook}\n${anchor}`);
}

const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
  headless: true
});
try {
  for (const viewport of [{ width: 960, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500, isMobile: viewport.width < 500 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(acceleratedSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.reincarnationQa);
    await page.evaluate(() => reincarnationQa.start());
    await page.evaluate(() => {
      reincarnationQa.input("down");
      reincarnationQa.input("right");
      reincarnationQa.input("confirm");
    });
    await page.waitForFunction(() => reincarnationQa.snapshot().message.includes("デッキコストは3"));
    let snapshot = await page.evaluate(() => reincarnationQa.snapshot());
    assert.match(snapshot.message, /レベルは1、デッキコストは3/);
    assert.match(snapshot.message, /初期スキルだけ/);
    await page.evaluate(() => reincarnationQa.input("confirm"));
    snapshot = await page.evaluate(() => reincarnationQa.snapshot());
    assert.match(snapshot.message, /転生回数：0回 → 1回/);
    assert.match(snapshot.message, /最大HP：999 → 999/);
    assert.match(snapshot.message, /必要経験値：×1\.25/);
    await page.evaluate(() => reincarnationQa.input("confirm"));
    snapshot = await page.evaluate(() => reincarnationQa.snapshot());
    assert.equal(snapshot.buttons[0].text, "やめる");
    assert.equal(snapshot.buttons[0].selected, true, "final confirmation defaults to cancel");
    await page.evaluate(() => reincarnationQa.input("right"));
    await page.evaluate(() => reincarnationQa.input("confirm"));
    await page.waitForFunction(() => reincarnationQa.snapshot().ceremonyVisible);
    snapshot = await page.evaluate(() => reincarnationQa.snapshot());
    assert.equal(snapshot.level, 197, "reincarnation commits only at the final whiteout");
    assert.equal(snapshot.gold, 2500000, "donation commits only at the final whiteout");
    assert.equal(snapshot.ceremonyImage, "images/npc/NPC_19e.avif");
    await page.waitForFunction(() => reincarnationQa.snapshot().reincarnationCount === 1);
    snapshot = await page.evaluate(() => reincarnationQa.snapshot());
    assert.equal(snapshot.level, 1);
    assert.equal(snapshot.gold, 2000000);
    assert.equal(snapshot.medalHidden, false);
    assert.equal(snapshot.medalSource, "images/screenshots/medal_02.avif");
    assert.match(snapshot.reincarnationText, /転生：1回/);
    assert.equal(snapshot.ceremonyImageLoaded, true);
    await page.evaluate(() => reincarnationQa.showStatus());
    assert.equal(await page.locator("#reincarnationMedal").evaluate(element => element.getBoundingClientRect().width > 0), true);
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return { top: value.top, right: value.right, bottom: value.bottom, left: value.left };
      };
      return { medals: rect(".status-medals"), identity: rect(".nde-status-identity"), panel: rect(".status-panel") };
    });
    assert.ok(layout.medals.bottom <= layout.identity.top, "medals do not overlap the identity row");
    assert.ok(layout.medals.left >= layout.panel.left && layout.medals.right <= layout.panel.right,
      "medals stay inside the status panel");
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("reincarnation browser QA passed at PC and mobile widths");
} finally {
  await browser.close();
}
