// Browser integration QA. Start tools/dev-server.cjs, then run with Playwright available.
// The injected hooks exist only in these isolated browser contexts.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.JOHANNA_CAT_TEST_URL || "http://127.0.0.1:4179";
const output = process.env.JOHANNA_CAT_TEST_OUTPUT || path.join(os.tmpdir(), "nda-johanna-cat-qa");
await mkdir(output, { recursive: true });

const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const townSource = await readFile(new URL("../../js/town.js", import.meta.url), "utf8");
const audioSource = await readFile(new URL("../../js/audio.js", import.meta.url), "utf8");

const townHook = `
window.johannaCatTownQa = {
  setFastTypewriter: () => setTownTypewriterOptions({ enabled: true, speed: "fast" }),
  snapshot: () => ({
    mode: town.mode,
    transitioning: town.transitioning,
    typewriterActive: townTypewriter.active,
    catTimerCount: town.johannaCatTransitionTimers.size,
    blackout: town.root.classList.contains("is-inn-cat-blackout"),
    anastasiaBlackout: town.root.classList.contains("is-anastasia-outfit-blackout"),
    message: town.messageEl.textContent,
    messageFits: town.messageEl.scrollHeight <= town.messageEl.clientHeight + 1,
    portrait: town.portrait.getAttribute("src") || "",
    commandsHidden: town.commandRoot.hidden,
    popupHidden: document.querySelector("#itemGetEffect").hidden,
    popupActive: document.querySelector("#itemGetEffect").classList.contains("is-active"),
    popupText: document.querySelector("#itemGetItems").textContent
  }),
  startAnastasiaProbe() {
    window.__anastasiaCompletions = [];
    town.onCompleteFacilityTalk = flag => window.__anastasiaCompletions.push(flag);
    town.facilityTalkDialogue = ["アナスタシア暗転確認"];
    town.facilityTalkDialogueIndex = 0;
    town.facilityTalkCompletionFlag = ANASTASIA_OUTFIT_EVENT_FLAG;
    town.mode = "facilityTalk";
    town.messageEl.textContent = town.facilityTalkDialogue[0];
    handleFacilityTalkInput("confirm");
  }
};`;

const mainHook = `window.johannaCatMainQa = {
  setup() {
    localStorage.clear();
    document.querySelector("#titleScreen").hidden = true;
    document.body.classList.remove("title-active");
    saveEnabled = true;
    worldLocation = "town";
    character = createInitialCharacter({ name: "JOHANNA QA", job: "mage" });
    character = {
      ...character,
      eventFlags: {
        ...(character.eventFlags || {}),
        inn_visited: true,
        sphinx_b69f_riddle_heard: true,
        sphinx_b69f_route_fixed: false
      }
    };
    setBgmOptions({ enabled: false });
    setSeOptions({ enabled: false });
    setTownTypewriterOptions({ enabled: true, speed: "fast" });
    openTown({ registrationRequired: false, facilityId: "inn", mode: "facilityMenu" });
    updateCharacterUi();
  },
  prepareReturn() {
    character = {
      ...character,
      eventFlags: { ...(character.eventFlags || {}), johanna_cat_return_pending: true }
    };
    openTown({ registrationRequired: false, facilityId: "inn", mode: "facilityMenu" });
    updateCharacterUi();
  },
  close: closeTown,
  reopen: () => openTown({ registrationRequired: false, facilityId: "inn", mode: "facilityMenu" }),
  state: () => structuredClone(character)
};`;

function instrumentAudio(source) {
  return source.replace(
    /export async function playSe\(key\) \{\r?\n/u,
    match => `${match}  globalThis.__johannaCatSe?.push(key);\n`
  );
}

async function advance(page, ms) {
  await page.waitForTimeout(ms);
}

async function readSavedCat(page) {
  return page.evaluate(async () => {
    const snapshot = (await import("/js/save-data.js")).loadGame();
    return {
      count: snapshot?.character?.keyItems?.owned?.johanna_calico_cat?.count || 0,
      completed: Boolean(snapshot?.character?.eventFlags?.johanna_cat_borrow_transition)
    };
  });
}

async function pressFinalConfirm(page, touch) {
  if (touch) {
    await page.dispatchEvent("#buttonA", "touchend", { bubbles: true, cancelable: true });
  } else {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "x",
      code: "KeyX",
      bubbles: true,
      cancelable: true
    })));
  }
}

const browser = await chromium.launch({ channel: process.env.JOHANNA_CAT_TEST_CHANNEL || "msedge", headless: true });
const errors = [];
const results = [];
try {
  for (const [layout, width, height, touch] of [["pc", 1280, 900, false], ["mobile", 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${layout}: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") errors.push(`${layout}: ${message.text()}`);
    });
    await page.addInitScript(() => { window.__johannaCatSe = []; });
    await page.route("**/js/audio.js", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentAudio(audioSource)
    }));
    await page.route("**/js/town.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `${townSource}\n${townHook}`
    }));
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: mainSource.replace(
        '  document.documentElement.dataset.ndaMainReady = "true";',
        `${mainHook}\n  document.documentElement.dataset.ndaMainReady = "true";`
      )
    }));

    await page.goto(origin);
    await page.waitForFunction(() => window.johannaCatMainQa && window.johannaCatTownQa);
    await page.evaluate(() => johannaCatMainQa.setup());
    const talkButton = page.locator('[data-facility-command="talk"]');
    await talkButton.evaluate(button => button.click());

    let snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.mode, "facilityTalk");
    assert.equal((await page.evaluate(() => johannaCatMainQa.state())).keyItems.owned.johanna_calico_cat, undefined);
    assert.equal(snapshot.blackout, false);
    assert.equal(snapshot.catTimerCount, 0);
    assert.equal(snapshot.popupHidden, true);

    await advance(page, 5000);
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.mode, "facilityTalk");
    assert.equal(snapshot.transitioning, false);
    assert.equal(snapshot.typewriterActive, false);
    assert.equal(snapshot.blackout, false);
    assert.equal(snapshot.catTimerCount, 0);
    assert.match(snapshot.message, /危ない目には遭わせないでおくれよ？\n＊Aボタン：次へ/u);
    assert.equal(snapshot.messageFits, true);
    assert.equal((await page.evaluate(() => johannaCatMainQa.state())).keyItems.owned.johanna_calico_cat, undefined);
    await page.screenshot({ path: path.join(output, `${layout}-dialogue-wait.png`) });

    await page.evaluate(() => { window.__johannaCatSe.length = 0; });
    await pressFinalConfirm(page, touch);
    const popupShownAt = Date.now();
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    const granted = await page.evaluate(() => johannaCatMainQa.state());
    assert.equal(granted.keyItems.owned.johanna_calico_cat.count, 1);
    assert.equal(granted.eventFlags.johanna_cat_borrow_transition, true);
    assert.equal(snapshot.transitioning, true);
    assert.equal(snapshot.blackout, false);
    assert.equal(snapshot.catTimerCount, 1);
    assert.equal(snapshot.popupHidden, false);
    assert.equal(snapshot.popupActive, true);
    assert.equal(snapshot.popupText, "ヨハンナの愛猫 ×1");
    assert.deepEqual(await page.evaluate(() => window.__johannaCatSe), ["importantItem"]);
    assert.deepEqual(await readSavedCat(page), { count: 1, completed: true });
    await advance(page, 1000);
    assert.equal((await page.evaluate(() => johannaCatTownQa.snapshot())).blackout, false);
    await page.screenshot({ path: path.join(output, `${layout}-item-popup.png`) });

    if (touch) {
      await page.locator("#buttonA").tap();
      await page.locator("#buttonA").tap();
    } else {
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX", bubbles: true, cancelable: true })));
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX", bubbles: true, cancelable: true })));
      await page.locator("#buttonA").evaluate(button => button.click());
    }
    assert.equal((await page.evaluate(() => johannaCatMainQa.state())).keyItems.owned.johanna_calico_cat.count, 1);
    assert.deepEqual(await page.evaluate(() => window.__johannaCatSe), ["importantItem"]);
    assert.equal((await page.evaluate(() => johannaCatTownQa.snapshot())).catTimerCount, 1);

    await page.waitForFunction(() => johannaCatTownQa.snapshot().blackout, null, { timeout: 4500 });
    const blackoutDelayMs = Date.now() - popupShownAt;
    assert.ok(blackoutDelayMs >= 2800 && blackoutDelayMs < 4200, `blackout delay: ${blackoutDelayMs}ms`);
    await page.waitForFunction(() => {
      const state = johannaCatTownQa.snapshot();
      return state.mode === "facilityMenu" && state.blackout;
    }, null, { timeout: 1000 });
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.mode, "facilityMenu");
    assert.equal(snapshot.blackout, true);
    assert.match(snapshot.portrait, /NPC_11c\.avif$/u);
    await page.waitForFunction(() => !johannaCatTownQa.snapshot().blackout, null, { timeout: 1000 });
    await page.waitForFunction(() => !johannaCatTownQa.snapshot().transitioning, null, { timeout: 1000 });
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.transitioning, false);
    assert.equal(snapshot.catTimerCount, 0);
    assert.equal(snapshot.commandsHidden, false);
    assert.equal(snapshot.popupHidden, true);

    await page.evaluate(() => {
      window.__johannaCatSe.length = 0;
      johannaCatMainQa.prepareReturn();
    });
    await advance(page, 5000);
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.mode, "facilityTalk");
    assert.equal(snapshot.blackout, false);
    assert.match(snapshot.message, /危ない目には遭わなかったかい？/u);
    const returnConfirmedAt = Date.now();
    await pressFinalConfirm(page, touch);
    await page.waitForFunction(() => johannaCatTownQa.snapshot().blackout, null, { timeout: 700 });
    assert.ok(Date.now() - returnConfirmedAt < 700);
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.blackout, true);
    assert.equal(snapshot.popupHidden, true);
    assert.equal((await page.evaluate(() => window.__johannaCatSe.includes("importantItem"))), false);
    await page.waitForFunction(() => {
      const state = johannaCatTownQa.snapshot();
      return state.mode === "facilityMenu" && state.blackout;
    }, null, { timeout: 1000 });
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.mode, "facilityMenu");
    assert.match(snapshot.portrait, /NPC_11\.avif$/u);
    const returned = await page.evaluate(() => johannaCatMainQa.state());
    assert.equal(returned.keyItems.owned.johanna_calico_cat, undefined);
    assert.equal(returned.eventFlags.johanna_cat_return_pending, false);
    await page.waitForFunction(() => !johannaCatTownQa.snapshot().transitioning, null, { timeout: 1200 });
    snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
    assert.equal(snapshot.transitioning, false);
    assert.equal(snapshot.blackout, false);
    assert.equal(snapshot.catTimerCount, 0);

    if (layout === "pc") {
      await page.evaluate(() => johannaCatTownQa.startAnastasiaProbe());
      snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
      assert.equal(snapshot.anastasiaBlackout, true);
      assert.equal(snapshot.catTimerCount, 0);
      await page.waitForFunction(() => window.__anastasiaCompletions.length === 1, null, { timeout: 800 });
      assert.deepEqual(await page.evaluate(() => window.__anastasiaCompletions), ["anastasia_festival_outfit_unlocked"]);
      await page.waitForFunction(() => !johannaCatTownQa.snapshot().transitioning, null, { timeout: 1200 });
      snapshot = await page.evaluate(() => johannaCatTownQa.snapshot());
      assert.equal(snapshot.anastasiaBlackout, false);
      assert.equal(snapshot.transitioning, false);
    }

    results.push({
      layout,
      input: touch ? "touch A" : "keyboard X",
      blackoutDelayMs,
      messageFits: true,
      borrowSaved: true,
      returnCompleted: true
    });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(`reload: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`reload: ${message.text()}`);
  });
  await page.addInitScript(() => { window.__johannaCatSe = []; });
  await page.route("**/js/audio.js", route => route.fulfill({ contentType: "text/javascript", body: instrumentAudio(audioSource) }));
  await page.route("**/js/town.js", route => route.fulfill({ contentType: "text/javascript", body: `${townSource}\n${townHook}` }));
  await page.route("**/js/main.js?*", route => route.fulfill({
    contentType: "text/javascript",
    body: mainSource.replace('  document.documentElement.dataset.ndaMainReady = "true";', `${mainHook}\n  document.documentElement.dataset.ndaMainReady = "true";`)
  }));
  await page.goto(origin);
  await page.waitForFunction(() => window.johannaCatMainQa && window.johannaCatTownQa);
  await page.evaluate(() => johannaCatMainQa.setup());
  await page.locator('[data-facility-command="talk"]').evaluate(button => button.click());
  await advance(page, 5000);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX", bubbles: true, cancelable: true })));
  assert.deepEqual(await readSavedCat(page), { count: 1, completed: true });
  await page.reload();
  await page.waitForFunction(() => window.johannaCatMainQa && window.johannaCatTownQa);
  assert.deepEqual(await readSavedCat(page), { count: 1, completed: true });
  assert.equal(await page.evaluate(() => document.querySelector("#townScreen").classList.contains("is-inn-cat-blackout")), false);
  results.push({ layout: "reload-during-popup", savedCatCount: 1, delayedBlackout: false });
  await context.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, errors, output }, null, 2));
} finally {
  await browser.close();
}
