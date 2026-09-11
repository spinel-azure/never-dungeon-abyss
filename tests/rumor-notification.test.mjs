import test from "node:test";
import assert from "node:assert/strict";

import {
  createGuildQuestNotificationController,
  createPassiveNotificationCoordinator,
  createRumorNotificationController
} from "../js/rumor-notification.js";

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitUntil(predicate, timeoutMs = 250) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for notification state.");
    await delay(2);
  }
}

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name)
  };
}

function createElements() {
  return {
    root: { hidden: true, classList: createClassList() },
    bell: { offsetWidth: 64 },
    copy: { hidden: true },
    detail: { textContent: "" }
  };
}

function createController({
  pending,
  canPresent = () => true,
  playBell = () => Promise.resolve(true),
  ringDurationMs = 4,
  messageDurationMs = 4,
  fadeDurationMs = 4,
  onMarked = () => {},
  onSaved = () => {}
} = {}) {
  const elements = createElements();
  const coordinator = createPassiveNotificationCoordinator({ canPresent, observeRoot: null });
  const controller = createRumorNotificationController({
    ...elements,
    coordinator,
    getPending: () => pending,
    markShown: onMarked,
    save: onSaved,
    playBell,
    ringDurationMs,
    messageDurationMs,
    fadeDurationMs
  });
  return { ...elements, coordinator, controller };
}

test("one rumor rings once, reveals copy after the bell, and completes once", async () => {
  const pending = [{ notificationId: "rumor_001:base" }];
  let bellCount = 0;
  let marked = [];
  let saveCount = 0;
  const view = createController({
    pending,
    playBell: async () => {
      bellCount += 1;
      await delay(12);
      return true;
    },
    ringDurationMs: 4,
    messageDurationMs: 6,
    fadeDurationMs: 4,
    onMarked: ids => { marked = ids; pending.length = 0; },
    onSaved: () => { saveCount += 1; }
  });

  assert.equal(view.controller.request(), true);
  await waitUntil(() => !view.root.hidden);
  assert.equal(view.copy.hidden, true);
  assert.equal(view.root.classList.contains("is-ringing"), true);
  await delay(6);
  assert.equal(view.copy.hidden, true, "copy must wait for the actual bell completion");
  await waitUntil(() => !view.copy.hidden);
  assert.equal(view.detail.textContent, "酒場で新しい噂が聞けます");
  await waitUntil(() => marked.length === 1);
  assert.equal(bellCount, 1);
  assert.deepEqual(marked, ["rumor_001:base"]);
  assert.equal(saveCount, 1);
  assert.equal(view.root.hidden, true);
  view.coordinator.dispose();
});

test("multiple pending stages are deduplicated into one plural notification", async () => {
  const pending = [
    { notificationId: "rumor_002:base" },
    { notificationId: "rumor_002:base" },
    { notificationId: "rumor_003:wisdom" }
  ];
  let bellCount = 0;
  let marked = [];
  const view = createController({
    pending,
    playBell: () => { bellCount += 1; return Promise.resolve(true); },
    onMarked: ids => { marked = ids; pending.length = 0; }
  });

  view.controller.request();
  await waitUntil(() => !view.copy.hidden);
  assert.equal(view.detail.textContent, "酒場で新しい噂が2件聞けます");
  await waitUntil(() => marked.length === 2);
  assert.equal(bellCount, 1);
  assert.deepEqual(marked, ["rumor_002:base", "rumor_003:wisdom"]);
  view.coordinator.dispose();
});

test("muted or failed audio still keeps the bell-only interval before showing text", async () => {
  const pending = [{ notificationId: "rumor_004:base" }];
  let marked = false;
  const view = createController({
    pending,
    playBell: () => Promise.resolve(false),
    ringDurationMs: 60,
    messageDurationMs: 4,
    fadeDurationMs: 4,
    onMarked: () => { marked = true; pending.length = 0; }
  });

  view.controller.request();
  await waitUntil(() => !view.root.hidden);
  await delay(10);
  assert.equal(view.copy.hidden, true);
  await waitUntil(() => !view.copy.hidden);
  await waitUntil(() => marked);
  view.coordinator.dispose();
});

test("a rumor heard while waiting is removed before sound or presentation", async () => {
  let available = false;
  const pending = [{ notificationId: "rumor_005:base" }];
  let bellCount = 0;
  let marked = 0;
  const view = createController({
    pending,
    canPresent: () => available,
    playBell: () => { bellCount += 1; return Promise.resolve(true); },
    onMarked: () => { marked += 1; }
  });

  view.controller.request();
  pending.length = 0;
  available = true;
  view.coordinator.updateAvailability();
  await delay(20);

  assert.equal(bellCount, 0);
  assert.equal(marked, 0);
  assert.equal(view.root.hidden, true);
  view.coordinator.dispose();
});

test("an interrupted notification is concealed and presented again when safe", async () => {
  let available = true;
  const pending = [{ notificationId: "rumor_006:base" }];
  let bellCount = 0;
  let marked = 0;
  const view = createController({
    pending,
    canPresent: () => available,
    playBell: async () => { bellCount += 1; await delay(20); return true; },
    ringDurationMs: 20,
    onMarked: () => { marked += 1; pending.length = 0; }
  });

  view.controller.request();
  await waitUntil(() => !view.root.hidden);
  available = false;
  view.coordinator.updateAvailability();
  await waitUntil(() => view.root.hidden);
  assert.equal(marked, 0);

  available = true;
  view.coordinator.updateAvailability();
  await waitUntil(() => marked === 1);
  assert.equal(bellCount, 2);
  view.coordinator.dispose();
});

test("reset invalidates an active generation instead of reviving its old queue", async () => {
  const pending = [{ notificationId: "rumor_008:base" }];
  let marked = 0;
  const view = createController({
    pending,
    playBell: async () => { await delay(20); return true; },
    ringDurationMs: 20,
    onMarked: () => { marked += 1; }
  });

  view.controller.request();
  await waitUntil(() => !view.root.hidden);
  view.coordinator.reset();
  view.controller.reset();
  await delay(35);

  assert.equal(marked, 0);
  assert.equal(view.coordinator.queuedCount, 0);
  assert.equal(view.coordinator.activeChannel, "");
  assert.equal(view.root.hidden, true);
  view.coordinator.dispose();
});

test("achievement and rumor presentations share one serial coordinator", async () => {
  const timeline = [];
  const pending = [{ notificationId: "rumor_007:base" }];
  const coordinator = createPassiveNotificationCoordinator({ observeRoot: null });
  const elements = createElements();
  const rumor = createRumorNotificationController({
    ...elements,
    coordinator,
    getPending: () => pending,
    markShown: () => { timeline.push("rumor:end"); pending.length = 0; },
    playBell: () => { timeline.push("rumor:start"); return Promise.resolve(true); },
    ringDurationMs: 3,
    messageDurationMs: 3,
    fadeDurationMs: 3
  });

  coordinator.enqueue({
    id: "achievement:test",
    channel: "achievement",
    play: async () => {
      timeline.push("achievement:start");
      await delay(12);
      timeline.push("achievement:end");
      return true;
    }
  });
  rumor.request();
  await waitUntil(() => timeline.includes("rumor:end"));

  assert.deepEqual(timeline, [
    "achievement:start",
    "achievement:end",
    "rumor:start",
    "rumor:end"
  ]);
  coordinator.dispose();
});

test("rumor and quest notices share the coordinator and quest copy stays singular", async () => {
  const timeline = [];
  const rumorPending = [{ notificationId: "rumor_009:base" }];
  const questPending = [
    { notificationId: "guild_004" },
    { notificationId: "guild_005" }
  ];
  const coordinator = createPassiveNotificationCoordinator({ observeRoot: null });
  const rumorElements = createElements();
  const questElements = createElements();
  const rumor = createRumorNotificationController({
    ...rumorElements,
    coordinator,
    getPending: () => rumorPending,
    markShown: () => { timeline.push("rumor:end"); rumorPending.length = 0; },
    playBell: () => { timeline.push("rumor:start"); return Promise.resolve(true); },
    ringDurationMs: 3,
    messageDurationMs: 3,
    fadeDurationMs: 3
  });
  const quest = createGuildQuestNotificationController({
    ...questElements,
    coordinator,
    getPending: () => questPending,
    markShown: () => { timeline.push("quest:end"); questPending.length = 0; },
    playBell: () => { timeline.push("quest:start"); return Promise.resolve(true); },
    ringDurationMs: 3,
    messageDurationMs: 3,
    fadeDurationMs: 3
  });

  rumor.request();
  quest.request();
  await waitUntil(() => timeline.includes("quest:end"));

  assert.deepEqual(timeline, ["rumor:start", "rumor:end", "quest:start", "quest:end"]);
  assert.equal(questElements.detail.textContent, "ギルド依頼が追加されました");
  coordinator.dispose();
});

test("a quest unlocked during an active batch is left for the next display", async () => {
  const pending = [{ notificationId: "guild_010" }];
  const batches = [];
  let injected = false;
  const elements = createElements();
  const coordinator = createPassiveNotificationCoordinator({ observeRoot: null });
  const quest = createGuildQuestNotificationController({
    ...elements,
    coordinator,
    getPending: () => pending,
    markShown: ids => {
      batches.push(ids);
      pending.splice(0, ids.length);
    },
    playBell: async () => {
      if (!injected) {
        injected = true;
        pending.push({ notificationId: "guild_011" });
      }
      await delay(6);
      return true;
    },
    ringDurationMs: 3,
    messageDurationMs: 3,
    fadeDurationMs: 3
  });

  quest.request();
  await waitUntil(() => batches.length === 2);
  assert.deepEqual(batches, [["guild_010"], ["guild_011"]]);
  coordinator.dispose();
});
