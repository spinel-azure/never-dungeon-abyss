// Browser QA for scrolling the post-identification INVENTORY list.
// Start tools/dev-server.cjs on port 4189 before running this file.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.LOOT_IDENTIFY_SCROLL_TEST_URL || "http://127.0.0.1:4189";
const output = process.env.LOOT_IDENTIFY_SCROLL_TEST_OUTPUT
  || path.join(os.tmpdir(), "nda-loot-identify-scroll-qa");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.LOOT_IDENTIFY_SCROLL_TEST_CHANNEL
    || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

async function prepareResults(page, layout) {
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.ndaMainReady === "true");
  return page.evaluate(selectedLayout => {
    document.querySelector("#titleScreen").hidden = true;
    document.querySelector("#townScreen").hidden = false;
    document.body.className = `layout-${selectedLayout} town-active loot-identify-open`;
    const overlay = document.querySelector("#lootIdentifyOverlay");
    const list = document.querySelector("#lootIdentifyList");
    const action = document.querySelector("#lootIdentifyAction");
    const title = document.querySelector("#lootIdentifyTitle");
    if (!overlay || !list || !action || !title) throw new Error("Loot identification UI is missing.");
    title.textContent = "INVENTORY";
    action.textContent = "閉じる";
    action.disabled = false;
    const rows = Array.from({ length: 38 }, (_, index) => {
      const row = document.createElement("div");
      row.className = `loot-identify-entry${index === 9 ? " qa-long-row" : ""}`;
      const name = document.createElement("span");
      const amount = document.createElement("strong");
      if (index === 9) {
        name.textContent = "Cカード「宝箱探知」";
        amount.textContent = "×0 → カード（上限超過2枚は200Gに変換）";
      } else {
        name.textContent = `取得アイテム${String(index + 1).padStart(2, "0")}`;
        amount.textContent = `×${index + 1} → インベントリ`;
      }
      row.append(name, amount);
      return row;
    });
    list.replaceChildren(...rows);
    list.scrollTop = 0;
    overlay.hidden = false;
    window.__lootScrollQa = { actionClicks: 0, backgroundTouches: 0 };
    action.addEventListener("click", () => { window.__lootScrollQa.actionClicks += 1; }, true);
    document.querySelector("#screen")?.addEventListener("touchstart", () => {
      window.__lootScrollQa.backgroundTouches += 1;
    });
    const actionRect = action.getBoundingClientRect();
    return {
      listScrollHeight: list.scrollHeight,
      listClientHeight: list.clientHeight,
      actionTop: actionRect.top,
      actionIsOutsideList: !list.contains(action)
    };
  }, layout);
}

async function inspectResults(page) {
  return page.evaluate(() => {
    const list = document.querySelector("#lootIdentifyList");
    const action = document.querySelector("#lootIdentifyAction");
    const panel = document.querySelector(".loot-identify-panel");
    const longRow = document.querySelector(".qa-long-row");
    const lastRow = list.lastElementChild;
    const listRect = list.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const longRect = longRow.getBoundingClientRect();
    const childRects = [...longRow.children].map(child => child.getBoundingClientRect());
    const lastRect = lastRow.getBoundingClientRect();
    const style = getComputedStyle(list);
    return {
      scrollTop: list.scrollTop,
      scrollMaximum: list.scrollHeight - list.clientHeight,
      atBottom: list.scrollTop >= list.scrollHeight - list.clientHeight - 2,
      lastVisible: lastRect.top >= listRect.top - 1 && lastRect.bottom <= listRect.bottom + 1,
      actionTop: actionRect.top,
      actionVisible: actionRect.top >= panelRect.top && actionRect.bottom <= panelRect.bottom + 1,
      actionClicks: window.__lootScrollQa.actionClicks,
      backgroundTouches: window.__lootScrollQa.backgroundTouches,
      pageScrollY: window.scrollY,
      documentFits: document.documentElement.scrollWidth <= innerWidth + 1,
      touchAction: style.touchAction,
      overflowY: style.overflowY,
      longRowGrew: longRect.height > 30,
      longRowContainsText: childRects.every(rect => rect.top >= longRect.top - 1 && rect.bottom <= longRect.bottom + 1)
    };
  });
}

async function swipeList(page, client) {
  const box = await page.locator("#lootIdentifyList").boundingBox();
  assert.ok(box && box.height > 80, "mobile: result list has a swipeable viewport");
  const x = box.x + box.width * 0.55;
  const startY = box.y + box.height * 0.82;
  const endY = box.y + box.height * 0.18;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY }]
  });
  for (let step = 1; step <= 8; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: startY + (endY - startY) * step / 8 }]
    });
    await page.waitForTimeout(18);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(180);
}

try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`pc: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`pc: ${message.text()}`);
    });
    const initial = await prepareResults(page, "pc");
    assert.ok(initial.listScrollHeight > initial.listClientHeight, "pc: list content exceeds its viewport");
    assert.equal(initial.actionIsOutsideList, true, "pc: close button is outside the scrolling list");
    await page.locator("#lootIdentifyList").hover();
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
    const afterWheel = await inspectResults(page);
    assert.ok(afterWheel.scrollTop > 0, "pc: mouse wheel changes list scrollTop");
    assert.equal(afterWheel.actionTop, initial.actionTop, "pc: close button stays fixed while the list scrolls");
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(150);
    const atBottom = await inspectResults(page);
    assert.equal(atBottom.atBottom && atBottom.lastVisible, true, "pc: the final result row can be read");
    assert.equal(atBottom.actionVisible, true, "pc: close button remains available at the bottom");
    assert.equal(atBottom.longRowContainsText, true,
      "pc: result text is not clipped");
    await page.screenshot({ path: path.join(output, "pc-inventory-bottom.png") });
    results.push({ layout: "pc", viewport: "1280x900", afterWheel, atBottom });
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`mobile: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`mobile: ${message.text()}`);
    });
    const initial = await prepareResults(page, "mobile");
    assert.ok(initial.listScrollHeight > initial.listClientHeight, "mobile: list content exceeds its viewport");
    assert.equal(initial.actionIsOutsideList, true, "mobile: close button is outside the scrolling list");
    await page.screenshot({ path: path.join(output, "mobile-inventory-wrapped.png") });
    const client = await context.newCDPSession(page);
    await swipeList(page, client);
    const afterSwipe = await inspectResults(page);
    assert.ok(afterSwipe.scrollTop > 0, "mobile: a native touch swipe changes list scrollTop");
    assert.equal(afterSwipe.actionTop, initial.actionTop, "mobile: close button stays fixed during touch scrolling");
    assert.equal(afterSwipe.actionClicks, 0, "mobile: ending a swipe does not activate Close");
    assert.equal(afterSwipe.backgroundTouches, 0, "mobile: touch does not reach the dungeon canvas");
    assert.equal(afterSwipe.pageScrollY, 0, "mobile: the document does not scroll behind the list");
    assert.equal(afterSwipe.documentFits, true, "mobile: no horizontal page overflow is introduced");
    assert.equal(afterSwipe.touchAction, "pan-y");
    assert.equal(afterSwipe.overflowY, "auto");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const state = await inspectResults(page);
      if (state.atBottom) break;
      await swipeList(page, client);
    }
    const atBottom = await inspectResults(page);
    assert.equal(atBottom.atBottom && atBottom.lastVisible, true, "mobile: repeated swipes reach the final result row");
    assert.equal(atBottom.actionVisible, true, "mobile: close button remains available at the bottom");
    assert.equal(atBottom.actionClicks, 0, "mobile: scrolling never activates Close");
    assert.equal(atBottom.longRowGrew && atBottom.longRowContainsText, true,
      "mobile: long card and overflow text expands its row without clipping");
    await page.screenshot({ path: path.join(output, "mobile-inventory-bottom.png") });
    results.push({ layout: "mobile", viewport: "390x844 touch", afterSwipe, atBottom });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
