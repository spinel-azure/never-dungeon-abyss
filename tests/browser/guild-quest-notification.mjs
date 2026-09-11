// Browser QA for the passive guild-request notification.
// Start tools/dev-server.cjs on port 4188 before running this file.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.GUILD_QUEST_NOTIFICATION_TEST_URL || "http://127.0.0.1:4188";
const output = process.env.GUILD_QUEST_NOTIFICATION_TEST_OUTPUT
  || path.join(os.tmpdir(), "nda-guild-quest-notification-qa");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.GUILD_QUEST_NOTIFICATION_TEST_CHANNEL
    || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const [layout, width, height, touch] of [
    ["pc", 1280, 900, false],
    ["mobile", 390, 844, true]
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`${layout}: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: "// Isolated guild request notification browser QA."
    }));
    await page.goto(origin);

    const setup = await page.evaluate(async () => {
      const root = document.querySelector("#guildQuestNotification");
      const bell = document.querySelector("#guildQuestNotificationBell");
      const copy = document.querySelector("#guildQuestNotificationCopy");
      const detail = document.querySelector("#guildQuestNotificationDetail");
      if (!root || !bell || !copy || !detail) throw new Error("Guild request notification DOM is missing.");
      document.querySelector("#titleScreen").hidden = true;
      document.body.classList.remove("title-active");
      document.body.append(root);
      const underlay = document.createElement("button");
      underlay.type = "button";
      underlay.id = "questNoticeUnderlay";
      underlay.style.cssText = "position:fixed;inset:0 0 auto 0;height:300px;z-index:10;background:transparent;border:0;color:transparent";
      underlay.addEventListener("click", () => { window.__questNoticeUnderlayClicks += 1; });
      document.body.append(underlay);
      const pending = ["guild_004", "guild_005", "guild_006"].map(notificationId => ({ notificationId }));
      const module = await import("/js/rumor-notification.js");
      const coordinator = module.createPassiveNotificationCoordinator({ observeRoot: null });
      window.__questNoticeUnderlayClicks = 0;
      window.__questNoticeQa = {
        pending,
        bellPlayCount: 0,
        marked: [],
        saveCount: 0,
        bellFinishedAt: 0,
        copyShownAt: 0,
        startedAt: performance.now(),
        coordinator
      };
      const qa = window.__questNoticeQa;
      qa.controller = module.createGuildQuestNotificationController({
        root,
        bell,
        copy,
        detail,
        coordinator,
        getPending: () => pending,
        markShown: ids => {
          qa.marked.push(...ids);
          pending.length = 0;
        },
        save: () => { qa.saveCount += 1; },
        playBell: () => {
          qa.bellPlayCount += 1;
          return new Promise(resolve => setTimeout(() => {
            qa.bellFinishedAt = performance.now();
            resolve(true);
          }, 700));
        },
        stopBell: () => {},
        ringDurationMs: 700,
        messageDurationMs: 360,
        fadeDurationMs: 90
      });
      const observer = new MutationObserver(() => {
        if (!copy.hidden && !qa.copyShownAt) qa.copyShownAt = performance.now();
      });
      observer.observe(copy, { attributes: true, attributeFilter: ["hidden"] });
      qa.observer = observer;
      return qa.controller.request();
    });
    assert.equal(setup, true, `${layout}: request notification queues`);

    const root = page.locator("#guildQuestNotification");
    const bell = page.locator("#guildQuestNotificationBell");
    const copy = page.locator("#guildQuestNotificationCopy");
    await root.waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("#guildQuestNotificationBell")?.naturalWidth > 0);
    const ringing = await page.evaluate(() => {
      const root = document.querySelector("#guildQuestNotification");
      const bell = document.querySelector("#guildQuestNotificationBell");
      const rect = root.getBoundingClientRect();
      return {
        ringing: root.classList.contains("is-ringing"),
        copyHidden: document.querySelector("#guildQuestNotificationCopy").hidden,
        pointerEvents: getComputedStyle(root).pointerEvents,
        animationName: getComputedStyle(bell).animationName,
        imageRendering: getComputedStyle(bell).imageRendering,
        fits: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1
      };
    });
    assert.equal(ringing.ringing, true, `${layout}: bell stage starts first`);
    assert.equal(ringing.copyHidden, true, `${layout}: text waits for bell completion`);
    assert.equal(ringing.pointerEvents, "none", `${layout}: notice does not capture input`);
    assert.equal(ringing.animationName, "rumor-bell-swing", `${layout}: shared three-ring swing is active`);
    assert.ok(["pixelated", "crisp-edges"].includes(ringing.imageRendering));
    assert.equal(ringing.fits, true, `${layout}: ringing view fits the viewport`);

    await page.waitForTimeout(180);
    const transformA = await bell.evaluate(node => getComputedStyle(node).transform);
    await page.waitForTimeout(180);
    const transformB = await bell.evaluate(node => getComputedStyle(node).transform);
    assert.notEqual(transformA, transformB, `${layout}: bell visibly rotates around its pivot`);

    await page.waitForFunction(() => !document.querySelector("#guildQuestNotificationCopy").hidden);
    const message = await page.evaluate(() => {
      const root = document.querySelector("#guildQuestNotification");
      const rect = root.getBoundingClientRect();
      const heading = root.querySelector("strong");
      const detail = document.querySelector("#guildQuestNotificationDetail");
      return {
        heading: heading.textContent,
        detail: detail.textContent,
        headingColor: getComputedStyle(heading).color,
        detailColor: getComputedStyle(detail).color,
        borderColor: getComputedStyle(root).borderColor,
        fits: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
        copyShownAt: window.__questNoticeQa.copyShownAt,
        bellFinishedAt: window.__questNoticeQa.bellFinishedAt
      };
    });
    assert.equal(message.heading, "依頼新着");
    assert.equal(message.detail, "ギルド依頼が追加されました");
    assert.equal(message.headingColor, "rgb(103, 220, 255)");
    assert.equal(message.detailColor, "rgb(255, 255, 255)");
    assert.equal(message.borderColor, "rgb(95, 215, 255)");
    assert.equal(message.fits, true, `${layout}: message view fits the viewport`);
    assert.ok(message.copyShownAt >= message.bellFinishedAt, `${layout}: copy follows bell completion`);

    const box = await root.boundingBox();
    assert.ok(box);
    if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await page.evaluate(() => window.__questNoticeUnderlayClicks), 1, `${layout}: input passes through notice`);

    await page.screenshot({ path: path.join(output, `guild-quest-notification-${layout}.png`) });
    await page.waitForFunction(() => document.querySelector("#guildQuestNotification").hidden);
    const completed = await page.evaluate(() => ({
      bellPlayCount: window.__questNoticeQa.bellPlayCount,
      marked: window.__questNoticeQa.marked,
      saveCount: window.__questNoticeQa.saveCount
    }));
    assert.equal(completed.bellPlayCount, 1, `${layout}: one WAV playback per aggregate notice`);
    assert.deepEqual(completed.marked, ["guild_004", "guild_005", "guild_006"]);
    assert.equal(completed.saveCount, 1);
    results.push({ layout, screenshot: path.join(output, `guild-quest-notification-${layout}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, []);
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
