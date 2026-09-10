// Browser integration QA for the passive tavern-rumor notification.
// Start tools/dev-server.cjs on port 4188 before running this file.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.RUMOR_NOTIFICATION_TEST_URL || "http://127.0.0.1:4188";
const output = process.env.RUMOR_NOTIFICATION_TEST_OUTPUT
  || path.join(os.tmpdir(), "nda-rumor-notification-qa");
await mkdir(output, { recursive: true });

const mainSource = await readFile(new URL("../../js/main.js", import.meta.url), "utf8");
const mainIntegrationHook = `
function rumorMainQaSnapshot() {
  const notificationState = character?.tavernRumorNotifications || {};
  return {
    activeChannel: passiveNotificationCoordinator.activeChannel,
    queuedCount: passiveNotificationCoordinator.queuedCount,
    achievementQueueCount: achievementNotificationQueue.length,
    achievementVisible: Boolean(achievementUnlockedEffect && !achievementUnlockedEffect.hidden),
    rumorVisible: Boolean(rumorNotification && !rumorNotification.hidden),
    rumorRinging: Boolean(rumorNotification?.classList.contains("is-ringing")),
    rumorMessage: Boolean(rumorNotification?.classList.contains("is-message")),
    townMode: isTownOpen() ? getTownState().mode : null,
    playerInputEnabled: isPlayerInputEnabled(),
    rumor002Read: Boolean(character?.eventFlags?.tavern_rumor_002_base_read),
    pendingIds: [...(notificationState.pendingIds || [])],
    notifiedIds: [...(notificationState.notifiedIds || [])],
    overlapCount: window.__rumorMainQaOverlapCount || 0,
    timeline: [...(window.__rumorMainQaTimeline || [])]
  };
}

function rumorMainQaTrackVisibility() {
  const achievementVisible = Boolean(achievementUnlockedEffect && !achievementUnlockedEffect.hidden);
  const rumorVisible = Boolean(rumorNotification && !rumorNotification.hidden);
  if (achievementVisible && rumorVisible) window.__rumorMainQaOverlapCount += 1;
  window.__rumorMainQaTimeline.push({
    at: performance.now(),
    achievementVisible,
    rumorVisible,
    activeChannel: passiveNotificationCoordinator.activeChannel
  });
}

function prepareRumorMainQa({ depth = 1, location = "dungeon", dialogue = false } = {}) {
  localStorage.clear();
  resetPassiveNotifications();
  saveEnabled = true;
  worldLocation = location;
  currentDepth = depth;
  character = createInitialCharacter({ name: "RUMOR MAIN QA", job: "warrior" });
  character.highestDungeonDepthReached = depth;
  character.eventFlags = {
    ...(character.eventFlags || {}),
    tavern_rumor_001_base_read: true
  };
  character.tavernRumorNotifications = { pendingIds: [], notifiedIds: [] };
  state.overlayEvent = dialogue ? { type: "rumor_main_qa_dialogue" } : null;
  document.querySelector("#titleScreen").hidden = true;
  document.body.classList.remove("title-active");
  setSeOptions({ enabled: false });
  setTownTypewriterOptions({ enabled: false });
  if (location === "town") {
    setPlayerInputEnabled(false);
    openTown({ registrationRequired: false, facilityId: "tavern", mode: "facilityMenu" });
  } else {
    closeTown();
    setPlayerInputEnabled(true);
  }
  knownAchievementIds = new Set(
    getAdventureChronicle(character).filter(entry => entry.achieved).map(entry => entry.id)
  );
  window.__rumorMainQaOverlapCount = 0;
  window.__rumorMainQaTimeline = [];
  window.__rumorMainQaObserver?.disconnect();
  window.__rumorMainQaObserver = new MutationObserver(rumorMainQaTrackVisibility);
  [achievementUnlockedEffect, rumorNotification].forEach(element => {
    if (element) window.__rumorMainQaObserver.observe(element, {
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
  });
  updateCharacterUi();
  resumePassiveNotifications();
  return rumorMainQaSnapshot();
}

window.rumorNotificationMainQa = {
  setup() {
    return prepareRumorMainQa({ depth: 1, location: "dungeon", dialogue: true });
  },
  setupTownConversation() {
    return prepareRumorMainQa({ depth: 2, location: "town" });
  },
  setupDungeonInputLock() {
    return prepareRumorMainQa({ depth: 2, location: "dungeon" });
  },
  unlockDepthTwo() {
    character = { ...character, highestDungeonDepthReached: 2 };
    updateCharacterUi();
    return rumorMainQaSnapshot();
  },
  setDialogueActive(active) {
    state.overlayEvent = active ? { type: "rumor_main_qa_dialogue" } : null;
    handlePersistentStateChanged();
    return rumorMainQaSnapshot();
  },
  setDungeonInputEnabled(enabled) {
    setPlayerInputEnabled(enabled);
    return rumorMainQaSnapshot();
  },
  snapshot: rumorMainQaSnapshot,
  savedNotificationState() {
    const saved = loadGame("auto");
    return structuredClone(saved?.character?.tavernRumorNotifications || null);
  }
};`;

function instrumentMain(source) {
  const anchor = '  document.documentElement.dataset.ndaMainReady = "true";';
  assert.equal(source.includes(anchor), true, "main rumor QA hook anchor exists");
  return source.replace(anchor, `${mainIntegrationHook}\n${anchor}`);
}

async function pressMainKey(page, key, code) {
  await page.evaluate(({ key, code }) => window.dispatchEvent(new KeyboardEvent("keydown", {
    key,
    code,
    bubbles: true,
    cancelable: true
  })), { key, code });
}

async function selectFacilityCommand(page, command) {
  const button = page.locator(`[data-facility-command="${command}"]`);
  await button.waitFor({ state: "visible" });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await button.evaluate(node => node.classList.contains("is-selected"))) break;
    await pressMainKey(page, "ArrowRight", "ArrowRight");
  }
  assert.equal(
    await button.evaluate(node => node.classList.contains("is-selected")),
    true,
    `town: real directional input selects ${command}`
  );
  return button;
}

async function activateFacilityCommand(page, command) {
  await selectFacilityCommand(page, command);
  await pressMainKey(page, "x", "KeyX");
}

function readWaveDuration(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", "bell SE must be a RIFF file");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE", "bell SE must be a WAVE file");
  let byteRate = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "fmt " && size >= 12) byteRate = buffer.readUInt32LE(start + 8);
    if (id === "data") dataBytes += Math.min(size, buffer.length - start);
    offset = start + size + (size & 1);
  }
  assert.ok(byteRate > 0 && dataBytes > 0, "bell SE must contain valid fmt/data chunks");
  return dataBytes / byteRate;
}

const wave = await readFile(new URL("../../se/nda_rumor_bell_3.wav", import.meta.url));
const bellDurationSeconds = readWaveDuration(wave);
assert.ok(
  bellDurationSeconds >= 2.55 && bellDurationSeconds <= 2.65,
  `bell SE duration must be about 2.6 seconds; got ${bellDurationSeconds}`
);

const browser = await chromium.launch({
  channel: process.env.RUMOR_NOTIFICATION_TEST_CHANNEL
    || (process.platform === "win32" ? "msedge" : undefined),
  headless: true
});
const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  for (const [layout, width, height, touch, pendingCount] of [
    ["pc", 1280, 900, false, 1],
    ["mobile", 390, 844, true, 3]
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
      body: "// Isolated rumor notification browser QA."
    }));
    await page.goto(origin);

    const setup = await page.evaluate(async ({ layout, pendingCount, bellDurationMs }) => {
      const root = document.querySelector("#rumorNotification");
      const bell = document.querySelector("#rumorNotificationBell");
      const copy = document.querySelector("#rumorNotificationCopy");
      const detail = document.querySelector("#rumorNotificationDetail");
      if (!root || !bell || !copy || !detail) {
        throw new Error("Rumor notification DOM is missing from index.html.");
      }
      document.querySelector("#titleScreen").hidden = true;
      document.body.className = `layout-${layout}`;
      document.body.append(root);
      const pending = Array.from({ length: pendingCount }, (_, index) => ({
        notificationId: `rumor_qa_${index + 1}:base`
      }));
      const notification = await import("/js/rumor-notification.js");
      const coordinator = notification.createPassiveNotificationCoordinator({ observeRoot: null });
      window.__rumorNotificationQa = {
        bellPlayCount: 0,
        bellFinishedAt: 0,
        copyShownAt: 0,
        marked: [],
        saveCount: 0,
        pending,
        coordinator,
        controller: null
      };
      const qa = window.__rumorNotificationQa;
      qa.controller = notification.createRumorNotificationController({
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
          }, bellDurationMs));
        },
        stopBell: () => {}
      });
      const copyObserver = new MutationObserver(() => {
        if (!copy.hidden && !qa.copyShownAt) qa.copyShownAt = performance.now();
      });
      copyObserver.observe(copy, { attributes: true, attributeFilter: ["hidden"] });
      qa.copyObserver = copyObserver;
      qa.startedAt = performance.now();
      return { requested: qa.controller.request(), src: bell.getAttribute("src") };
    }, { layout, pendingCount, bellDurationMs: bellDurationSeconds * 1000 });
    assert.equal(setup.requested, true, `${layout}: notification is queued`);
    assert.match(setup.src, /images\/screenshots\/bell\.avif$/);

    const root = page.locator("#rumorNotification");
    const bell = page.locator("#rumorNotificationBell");
    const copy = page.locator("#rumorNotificationCopy");
    await root.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector("#rumorNotificationBell");
      return image?.complete && image.naturalWidth > 0;
    });

    const ringingStart = await page.evaluate(() => {
      const root = document.querySelector("#rumorNotification");
      const bell = document.querySelector("#rumorNotificationBell");
      const rootStyle = getComputedStyle(root);
      const bellStyle = getComputedStyle(bell);
      const rootRect = root.getBoundingClientRect();
      const bellRect = bell.getBoundingClientRect();
      return {
        ringing: root.classList.contains("is-ringing"),
        copyHidden: document.querySelector("#rumorNotificationCopy").hidden,
        pointerEvents: rootStyle.pointerEvents,
        animationName: bellStyle.animationName,
        transformOrigin: bellStyle.transformOrigin,
        imageRendering: bellStyle.imageRendering,
        bellNaturalWidth: bell.naturalWidth,
        bellNaturalHeight: bell.naturalHeight,
        rootFits: rootRect.left >= -1 && rootRect.right <= innerWidth + 1
          && rootRect.top >= -1 && rootRect.bottom <= innerHeight + 1,
        bellFits: bellRect.left >= -1 && bellRect.right <= innerWidth + 1
          && bellRect.top >= -1 && bellRect.bottom <= innerHeight + 1
      };
    });
    assert.equal(ringingStart.ringing, true, `${layout}: bell stage is active`);
    assert.equal(ringingStart.copyHidden, true, `${layout}: copy is hidden while bell rings`);
    assert.equal(ringingStart.pointerEvents, "none", `${layout}: notification does not take pointer input`);
    assert.notEqual(ringingStart.animationName, "none", `${layout}: bell has a rotation animation`);
    assert.ok(
      ["pixelated", "crisp-edges"].includes(ringingStart.imageRendering),
      `${layout}: bell keeps pixel-art rendering; got ${ringingStart.imageRendering}`
    );
    assert.ok(ringingStart.bellNaturalWidth > 0 && ringingStart.bellNaturalHeight > 0);
    assert.equal(ringingStart.rootFits && ringingStart.bellFits, true, `${layout}: ringing bell fits viewport`);

    await page.waitForTimeout(180);
    const firstTransform = await bell.evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(180);
    const secondTransform = await bell.evaluate(element => getComputedStyle(element).transform);
    assert.notEqual(firstTransform, "none", `${layout}: bell is transformed around its pivot`);
    assert.notEqual(secondTransform, firstTransform, `${layout}: bell visibly swings over time`);

    const elapsed = await page.evaluate(() => performance.now() - window.__rumorNotificationQa.startedAt);
    await page.waitForTimeout(Math.max(0, 2350 - elapsed));
    assert.equal(await copy.isHidden(), true, `${layout}: text is not shown before the 2.6s bell ends`);
    assert.equal(
      await page.evaluate(() => window.__rumorNotificationQa.bellPlayCount),
      1,
      `${layout}: the three-ring audio file is requested exactly once`
    );

    await copy.waitFor({ state: "visible", timeout: 2000 });
    const message = await page.evaluate(() => {
      const qa = window.__rumorNotificationQa;
      const root = document.querySelector("#rumorNotification");
      const bell = document.querySelector("#rumorNotificationBell");
      const copy = document.querySelector("#rumorNotificationCopy");
      const rootRect = root.getBoundingClientRect();
      const bellRect = bell.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      const originParts = getComputedStyle(bell).transformOrigin.split(" ").map(parseFloat);
      return {
        heading: copy.querySelector("strong")?.textContent?.trim() || "",
        detail: document.querySelector("#rumorNotificationDetail").textContent.trim(),
        bellPlayCount: qa.bellPlayCount,
        orderingMs: qa.copyShownAt - qa.bellFinishedAt,
        messageClass: root.classList.contains("is-message"),
        ringingClass: root.classList.contains("is-ringing"),
        bellTransform: getComputedStyle(bell).transform,
        pivotAtHanger: originParts[0] >= bellRect.width * 0.78
          && originParts[0] <= bellRect.width * 0.94
          && originParts[1] <= bellRect.height * 0.12,
        fits: [rootRect, bellRect, copyRect].every(rect => rect.left >= -1 && rect.right <= innerWidth + 1
          && rect.top >= -1 && rect.bottom <= innerHeight + 1),
        documentFits: document.documentElement.scrollWidth <= innerWidth + 1
      };
    });
    assert.equal(message.heading, "噂話新着");
    assert.equal(
      message.detail,
      pendingCount === 1 ? "酒場で新しい噂が聞けます" : `酒場で新しい噂が${pendingCount}件聞けます`
    );
    assert.equal(message.bellPlayCount, 1);
    assert.ok(message.orderingMs >= -12, `${layout}: copy appeared before bell completion (${message.orderingMs}ms)`);
    assert.equal(message.messageClass, true);
    assert.equal(message.ringingClass, false);
    assert.equal(message.pivotAtHanger, true, `${layout}: bell pivot is not at its actual hanging point`);
    assert.equal(message.fits && message.documentFits, true, `${layout}: notification fits the viewport`);

    const rootBox = await root.boundingBox();
    assert.ok(rootBox, `${layout}: notification has a visible box`);
    await page.evaluate(({ box }) => {
      const button = document.createElement("button");
      button.id = "rumorNotificationUnderlayQa";
      button.textContent = "underlay";
      Object.assign(button.style, {
        position: "fixed",
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        zIndex: "10000",
        opacity: "0"
      });
      button.addEventListener("click", () => { window.__rumorNotificationQa.underlayClicks = 1; });
      document.body.append(button);
    }, { box: rootBox });
    await page.mouse.click(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
    assert.equal(
      await page.evaluate(() => window.__rumorNotificationQa.underlayClicks || 0),
      1,
      `${layout}: notification must allow clicks through`
    );
    await root.screenshot({ path: path.join(output, `${layout}-message.png`) });

    await root.waitFor({ state: "hidden", timeout: 4500 });
    const completion = await page.evaluate(() => ({
      marked: window.__rumorNotificationQa.marked,
      saveCount: window.__rumorNotificationQa.saveCount,
      playCount: window.__rumorNotificationQa.bellPlayCount
    }));
    assert.equal(completion.marked.length, pendingCount, `${layout}: displayed stages are completed once`);
    assert.equal(completion.saveCount, 1, `${layout}: completion is saved once`);
    assert.equal(completion.playCount, 1, `${layout}: redraw does not replay audio`);
    results.push({
      layout,
      viewport: `${width}x${height}`,
      pendingCount,
      bellDurationSeconds,
      message,
      screenshot: path.join(output, `${layout}-message.png`)
    });
    await context.close();
  }

  // Exercise the production main.js integration in an isolated browser profile.
  // Reaching B2F unlocks both an achievement and rumor_002 while a dialogue is
  // active. The shared coordinator must defer both, show the achievement first,
  // then restart an interrupted rumor and persist its completion.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`main-integration: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`main-integration: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(mainSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.rumorNotificationMainQa);

    const initial = await page.evaluate(() => rumorNotificationMainQa.setup());
    assert.deepEqual(initial.pendingIds, [], "main: setup has no unread queued rumor");
    assert.equal(initial.rumorVisible, false);
    assert.equal(initial.achievementVisible, false);

    const unlocked = await page.evaluate(() => rumorNotificationMainQa.unlockDepthTwo());
    assert.deepEqual(unlocked.pendingIds, ["rumor_002:base"], "main: state change queues the newly available rumor");
    assert.ok(unlocked.achievementQueueCount >= 1, "main: the same state change queues its achievement");
    await page.waitForTimeout(700);
    const stillBlocked = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.equal(stillBlocked.achievementVisible, false, "main: dialogue defers achievement notification");
    assert.equal(stillBlocked.rumorVisible, false, "main: dialogue defers rumor notification");
    assert.deepEqual(stillBlocked.pendingIds, ["rumor_002:base"]);

    await page.evaluate(() => rumorNotificationMainQa.setDialogueActive(false));
    await page.locator("#achievementUnlockedEffect").waitFor({ state: "visible", timeout: 2000 });
    assert.equal(await page.locator("#rumorNotification").isHidden(), true,
      "main: rumor does not overlap an achievement notification");
    await page.locator("#rumorNotification").waitFor({ state: "visible", timeout: 6500 });
    const afterAchievement = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.equal(afterAchievement.achievementVisible, false);
    assert.equal(afterAchievement.rumorRinging, true, "main: rumor begins after achievement finishes");

    // A dialogue begins during the bell. Production state-change handling must
    // abort the presentation without marking it complete, then offer it again.
    await page.evaluate(() => rumorNotificationMainQa.setDialogueActive(true));
    await page.locator("#rumorNotification").waitFor({ state: "hidden", timeout: 1000 });
    const interrupted = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.deepEqual(interrupted.pendingIds, ["rumor_002:base"], "main: interruption keeps persistent pending state");
    assert.equal(interrupted.notifiedIds.includes("rumor_002:base"), false);

    await page.evaluate(() => rumorNotificationMainQa.setDialogueActive(false));
    await page.locator("#rumorNotification").waitFor({ state: "visible", timeout: 2000 });
    await page.locator("#rumorNotificationCopy").waitFor({ state: "visible", timeout: 3500 });
    assert.equal(await page.locator("#rumorNotificationDetail").textContent(), "酒場で新しい噂が聞けます");
    await page.locator("#rumorNotification").waitFor({ state: "hidden", timeout: 4500 });
    await page.waitForFunction(() => {
      const snapshot = rumorNotificationMainQa.snapshot();
      return snapshot.pendingIds.length === 0 && snapshot.notifiedIds.includes("rumor_002:base");
    });
    const completed = await page.evaluate(() => ({
      runtime: rumorNotificationMainQa.snapshot(),
      saved: rumorNotificationMainQa.savedNotificationState()
    }));
    assert.equal(completed.runtime.overlapCount, 0, "main: achievement and rumor were never visible together");
    assert.deepEqual(completed.runtime.pendingIds, []);
    assert.equal(completed.runtime.notifiedIds.includes("rumor_002:base"), true);
    assert.deepEqual(completed.saved?.pendingIds, [], "main: completed queue is saved");
    assert.equal(completed.saved?.notifiedIds?.includes("rumor_002:base"), true,
      "main: notified stage is persisted in the isolated auto save");
    results.push({
      layout: "main-integration",
      queuedFromStateChange: "rumor_002:base",
      deferredDuringDialogue: true,
      achievementExclusive: completed.runtime.overlapCount === 0,
      interruptedAndResumed: true,
      persisted: completed.saved?.notifiedIds?.includes("rumor_002:base") === true
    });
    await context.close();
  }

  // Enter the actual tavern rumor conversation through the production keyboard
  // input path while the bell is moving. handleTownInput() must re-check the new
  // town mode and interrupt the notification immediately.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`town-conversation: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`town-conversation: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(mainSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.rumorNotificationMainQa);
    const setup = await page.evaluate(() => rumorNotificationMainQa.setupTownConversation());
    assert.equal(setup.townMode, "facilityMenu");
    assert.deepEqual(setup.pendingIds, ["rumor_002:base"]);
    const notification = page.locator("#rumorNotification");
    await notification.waitFor({ state: "visible", timeout: 2000 });
    assert.equal((await page.evaluate(() => rumorNotificationMainQa.snapshot())).rumorRinging, true);

    await activateFacilityCommand(page, "rumors");
    await page.waitForFunction(() => rumorNotificationMainQa.snapshot().townMode === "tavernRumor");
    await notification.waitFor({ state: "hidden", timeout: 1000 });
    const conversation = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.deepEqual(conversation.pendingIds, ["rumor_002:base"],
      "town: entering the conversation interrupts without completing the notification");
    assert.equal(conversation.notifiedIds.includes("rumor_002:base"), false);

    for (let index = 0; index < 10; index += 1) {
      if ((await page.evaluate(() => rumorNotificationMainQa.snapshot().townMode)) !== "tavernRumor") break;
      await pressMainKey(page, "x", "KeyX");
      await page.waitForTimeout(30);
    }
    await page.waitForFunction(() => rumorNotificationMainQa.snapshot().townMode === "facilityMenu");
    await page.waitForTimeout(250);
    const heard = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.equal(heard.rumor002Read, true, "town: the real conversation marks the rumor read");
    assert.deepEqual(heard.pendingIds, [], "town: a rumor heard during interruption leaves the pending queue");
    assert.equal(heard.rumorVisible, false, "town: the heard rumor is not re-presented");
    results.push({
      layout: "town-conversation-integration",
      enteredThroughKeyboard: true,
      interrupted: true,
      heardRumorRemovedFromQueue: true
    });
    await context.close();
  }

  // Pointer activation bypasses handleTownInput(), so exercise the document
  // click hook with a trusted tap on the already-selected rumor button.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`town-native-click: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`town-native-click: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(mainSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.rumorNotificationMainQa);
    const setup = await page.evaluate(() => rumorNotificationMainQa.setupTownConversation());
    assert.equal(setup.townMode, "facilityMenu");
    assert.deepEqual(setup.pendingIds, ["rumor_002:base"]);
    const notification = page.locator("#rumorNotification");
    await notification.waitFor({ state: "visible", timeout: 2000 });
    assert.equal((await page.evaluate(() => rumorNotificationMainQa.snapshot())).rumorRinging, true);

    const rumorsButton = await selectFacilityCommand(page, "rumors");
    await page.evaluate(() => {
      window.__rumorMainQaNativeClicks = [];
      document.addEventListener("click", event => {
        if (event.target.closest?.('[data-facility-command="rumors"]')) {
          window.__rumorMainQaNativeClicks.push({ isTrusted: event.isTrusted });
        }
      }, { capture: true });
    });
    await rumorsButton.tap();
    await page.waitForFunction(() => rumorNotificationMainQa.snapshot().townMode === "tavernRumor");
    await notification.waitFor({ state: "hidden", timeout: 1000 });
    const interrupted = await page.evaluate(() => ({
      runtime: rumorNotificationMainQa.snapshot(),
      nativeClicks: [...window.__rumorMainQaNativeClicks]
    }));
    assert.deepEqual(interrupted.nativeClicks, [{ isTrusted: true }],
      "town touch: selected rumor command receives one trusted native click");
    assert.deepEqual(interrupted.runtime.pendingIds, ["rumor_002:base"],
      "town touch: native click interrupts without completing the notification");
    assert.equal(interrupted.runtime.notifiedIds.includes("rumor_002:base"), false);
    assert.equal(interrupted.runtime.rumorVisible, false,
      "town touch: document click availability check hides the notification immediately");
    results.push({
      layout: "town-native-click-integration",
      viewport: "390x844 touch",
      trustedClick: true,
      interrupted: true,
      pendingPreserved: true
    });
    await context.close();
  }

  // Dungeon cutscenes commonly lock player input without opening an overlay.
  // Exercise the production input wrapper to ensure that lock also aborts and
  // later resumes the queued notification.
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`input-lock: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(`input-lock: ${message.text()}`);
    });
    await page.route("**/js/main.js?*", route => route.fulfill({
      contentType: "text/javascript",
      body: instrumentMain(mainSource)
    }));
    await page.goto(origin);
    await page.waitForFunction(() => window.rumorNotificationMainQa);
    const setup = await page.evaluate(() => rumorNotificationMainQa.setupDungeonInputLock());
    assert.equal(setup.playerInputEnabled, true);
    assert.deepEqual(setup.pendingIds, ["rumor_002:base"]);
    const notification = page.locator("#rumorNotification");
    await notification.waitFor({ state: "visible", timeout: 2000 });

    const locked = await page.evaluate(() => rumorNotificationMainQa.setDungeonInputEnabled(false));
    assert.equal(locked.playerInputEnabled, false);
    await notification.waitFor({ state: "hidden", timeout: 1000 });
    await page.waitForTimeout(350);
    const whileLocked = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.deepEqual(whileLocked.pendingIds, ["rumor_002:base"]);
    assert.equal(whileLocked.notifiedIds.includes("rumor_002:base"), false);
    assert.equal(whileLocked.rumorVisible, false, "input lock keeps the notification deferred");

    const unlocked = await page.evaluate(() => rumorNotificationMainQa.setDungeonInputEnabled(true));
    assert.equal(unlocked.playerInputEnabled, true);
    await notification.waitFor({ state: "visible", timeout: 2000 });
    await page.locator("#rumorNotificationCopy").waitFor({ state: "visible", timeout: 3500 });
    await notification.waitFor({ state: "hidden", timeout: 4500 });
    await page.waitForFunction(() => rumorNotificationMainQa.snapshot().notifiedIds.includes("rumor_002:base"));
    const completed = await page.evaluate(() => rumorNotificationMainQa.snapshot());
    assert.deepEqual(completed.pendingIds, []);
    assert.equal(completed.notifiedIds.includes("rumor_002:base"), true);
    results.push({
      layout: "input-lock-integration",
      interruptedWhileLocked: true,
      resumedAfterUnlock: true,
      completed: true
    });
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("\n")}`);
console.log(JSON.stringify({ results, pageErrors, consoleErrors, screenshots: output }, null, 2));
