import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  getUnreadTavernRumor,
  getUnreadTavernRumors,
  markTavernRumorRead
} from "../data/tavern-rumors.js";
import {
  createInitialTavernRumorNotificationState,
  getPendingTavernRumorNotifications,
  markTavernRumorNotificationsShown,
  normalizeTavernRumorNotificationState,
  syncTavernRumorNotifications
} from "../data/tavern-rumor-notifications.js";

function makeCharacter(name = "噂通知係") {
  return createInitialCharacter({ name, job: "thief" });
}

test("the rumor list returns every available unread rumor in registration order", () => {
  const character = makeCharacter();
  character.highestDungeonDepthReached = 4;
  const rumors = getUnreadTavernRumors(character);

  assert.deepEqual(rumors.map(rumor => rumor.id), [
    "rumor_001_base",
    "rumor_002_base",
    "rumor_003_base"
  ]);
  assert.equal(getUnreadTavernRumor(character)?.id, rumors[0].id);
  assert.deepEqual(
    rumors.map(({ rumorId, stageId, notificationId }) => ({ rumorId, stageId, notificationId })),
    [
      { rumorId: "rumor_001", stageId: "base", notificationId: "rumor_001:base" },
      { rumorId: "rumor_002", stageId: "base", notificationId: "rumor_002:base" },
      { rumorId: "rumor_003", stageId: "base", notificationId: "rumor_003:base" }
    ]
  );
});

test("only the latest unlocked stage of each rumor is returned", () => {
  const character = makeCharacter();
  character.highestDungeonDepthReached = 4;
  const rumors = getUnreadTavernRumors(character, {
    mikanEncountered: true,
    lingeringGhostDefeated: true,
    otherworldlyWisdomDefeated: true
  });

  assert.deepEqual(rumors.map(rumor => rumor.notificationId), [
    "rumor_001:mikan",
    "rumor_002:ghost",
    "rumor_003:wisdom"
  ]);
});

test("saved event flags drive stage updates without duplicated caller conditions", () => {
  const character = makeCharacter();
  character.highestDungeonDepthReached = 4;
  character.eventFlags.mikan_nyanko_encountered = true;
  character.eventFlags.lingering_ghost_b2f_defeated_once = true;
  character.eventFlags.boss_otherworldly_wisdom_b4f_defeated = true;

  assert.deepEqual(getUnreadTavernRumors(character).map(rumor => rumor.notificationId), [
    "rumor_001:mikan",
    "rumor_002:ghost",
    "rumor_003:wisdom"
  ]);
});

test("sync queues every current unread stage once and persists the queue", () => {
  const character = makeCharacter();
  character.highestDungeonDepthReached = 4;

  const first = syncTavernRumorNotifications(character);
  assert.deepEqual(first.addedIds, ["rumor_001:base", "rumor_002:base", "rumor_003:base"]);
  assert.deepEqual(first.character.tavernRumorNotifications.pendingIds, first.addedIds);
  assert.deepEqual(first.pendingRumors.map(rumor => rumor.notificationId), first.addedIds);

  const repeated = syncTavernRumorNotifications(first.character);
  assert.equal(repeated.character, first.character);
  assert.deepEqual(repeated.addedIds, []);
  assert.deepEqual(repeated.pendingRumors.map(rumor => rumor.notificationId), first.addedIds);
});

test("a newly unlocked stage replaces its obsolete queued stage", () => {
  const base = syncTavernRumorNotifications(makeCharacter()).character;
  const updated = syncTavernRumorNotifications(base, { mikanEncountered: true });

  assert.deepEqual(updated.removedIds, ["rumor_001:base"]);
  assert.deepEqual(updated.addedIds, ["rumor_001:mikan"]);
  assert.deepEqual(updated.character.tavernRumorNotifications.pendingIds, ["rumor_001:mikan"]);
});

test("completing a notification does not mark the tavern rumor as read", () => {
  let character = syncTavernRumorNotifications(makeCharacter()).character;
  character = markTavernRumorNotificationsShown(character, ["rumor_001:base"]);

  assert.equal(character.eventFlags.tavern_rumor_001_base_read, undefined);
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_001_base");
  assert.deepEqual(character.tavernRumorNotifications.pendingIds, []);
  assert.deepEqual(character.tavernRumorNotifications.notifiedIds, ["rumor_001:base"]);
  assert.deepEqual(syncTavernRumorNotifications(character).addedIds, []);
});

test("a notified rumor can queue its newly available conversation stage", () => {
  let character = syncTavernRumorNotifications(makeCharacter()).character;
  character = markTavernRumorNotificationsShown(character, ["rumor_001:base"]);

  const updated = syncTavernRumorNotifications(character, { mikanEncountered: true });
  assert.deepEqual(updated.addedIds, ["rumor_001:mikan"]);
  assert.deepEqual(updated.character.tavernRumorNotifications, {
    pendingIds: ["rumor_001:mikan"],
    notifiedIds: ["rumor_001:base"]
  });
});

test("reading a rumor while its notification waits removes it from the queue", () => {
  let character = syncTavernRumorNotifications(makeCharacter()).character;
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));

  assert.deepEqual(getPendingTavernRumorNotifications(character), []);
  const reconciled = syncTavernRumorNotifications(character);
  assert.deepEqual(reconciled.removedIds, ["rumor_001:base"]);
  assert.deepEqual(reconciled.character.tavernRumorNotifications.pendingIds, []);
  assert.deepEqual(reconciled.character.tavernRumorNotifications.notifiedIds, []);
});

test("malformed and legacy notification state is normalized safely", () => {
  assert.deepEqual(normalizeTavernRumorNotificationState(), createInitialTavernRumorNotificationState());
  assert.deepEqual(normalizeTavernRumorNotificationState({
    pendingIds: ["rumor_001:base", "rumor_001:base", "", null, "shown"],
    notifiedIds: ["shown", "shown", 0]
  }), {
    pendingIds: ["rumor_001:base"],
    notifiedIds: ["shown"]
  });

  const legacy = makeCharacter("旧セーブ");
  delete legacy.tavernRumorNotifications;
  const normalized = normalizeCharacter(legacy);
  assert.deepEqual(normalized.tavernRumorNotifications, { pendingIds: [], notifiedIds: [] });

  const introduced = syncTavernRumorNotifications(normalized);
  assert.deepEqual(introduced.addedIds, ["rumor_001:base"]);
});

test("pending and completed notification IDs survive character normalization", () => {
  const character = makeCharacter("復元テスト");
  character.tavernRumorNotifications = {
    pendingIds: ["rumor_002:base"],
    notifiedIds: ["rumor_001:base"]
  };

  const normalized = normalizeCharacter(character);
  assert.deepEqual(normalized.tavernRumorNotifications, character.tavernRumorNotifications);
});

test("the Johanna rumor participates in the same notification list", () => {
  const character = makeCharacter("宿屋の常連");
  character.eventFlags.tavern_rumor_001_base_read = true;
  character.adventureStats.innStayCount = 100;
  character.quests.completedQuestIds.push("guild_026");

  const result = syncTavernRumorNotifications(character);
  assert.deepEqual(result.addedIds, ["rumor_008:base"]);
  assert.equal(result.pendingRumors[0].title, "宿屋の女将の噂");
});

test("the B42 marathon follow-up replaces the pending B40 rumor stage", () => {
  const character = makeCharacter("マラソン通知係");
  character.highestDungeonDepthReached = 40;
  character.eventFlags = {
    ...character.eventFlags,
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true
  };

  const unlocked = syncTavernRumorNotifications(character);
  assert.deepEqual(unlocked.addedIds, ["rumor_009:base"]);
  assert.equal(unlocked.pendingRumors[0].title, "マラソンの噂");

  unlocked.character.eventFlags.b1_b42_marathon_completed = true;
  unlocked.character.highestDungeonDepthReached = 42;
  const completed = syncTavernRumorNotifications(unlocked.character);
  assert.deepEqual(completed.removedIds, ["rumor_009:base"]);
  assert.deepEqual(completed.addedIds, ["rumor_009:marathon"]);
  assert.deepEqual(completed.character.tavernRumorNotifications.pendingIds, ["rumor_009:marathon"]);
});
