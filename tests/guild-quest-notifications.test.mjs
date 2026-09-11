import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  B2F_UNLOCK_QUEST_IDS,
  JOHANNA_RESCUE_QUEST_ID,
  MAERCHENTIERE_QUEST_ID
} from "../data/quests.js";
import {
  createInitialGuildQuestNotificationState,
  getAvailableGuildQuestNotifications,
  getPendingGuildQuestNotifications,
  markGuildQuestNotificationsShown,
  normalizeGuildQuestNotificationState,
  syncGuildQuestNotifications
} from "../data/guild-quest-notifications.js";

function makeCharacter(name = "依頼通知係") {
  const character = createInitialCharacter({ name, job: "warrior" });
  character.eventFlags.guild_first_request_unlocked = true;
  return character;
}

test("initial requests wait for guild introduction and then queue as one persistent batch", () => {
  const character = createInitialCharacter({ name: "新人", job: "warrior" });
  assert.deepEqual(getAvailableGuildQuestNotifications(character), []);
  assert.deepEqual(syncGuildQuestNotifications(character).addedIds, []);

  character.eventFlags.guild_first_request_unlocked = true;
  const first = syncGuildQuestNotifications(character);
  assert.deepEqual(first.addedIds, B2F_UNLOCK_QUEST_IDS);
  assert.deepEqual(first.character.guildQuestNotifications.pendingIds, B2F_UNLOCK_QUEST_IDS);

  const repeated = syncGuildQuestNotifications(first.character);
  assert.equal(repeated.character, first.character);
  assert.deepEqual(repeated.addedIds, []);
});

test("availability uses quest conditions while active and completed requests are excluded", () => {
  const character = makeCharacter();
  character.quests.completedQuestIds = [...B2F_UNLOCK_QUEST_IDS, MAERCHENTIERE_QUEST_ID];
  character.eventFlags.quest_031_anna_request_unlocked = true;
  assert.equal(
    getAvailableGuildQuestNotifications(character).some(entry => entry.questId === JOHANNA_RESCUE_QUEST_ID),
    true
  );

  character.quests.active[JOHANNA_RESCUE_QUEST_ID] = { progress: 0 };
  assert.equal(
    getAvailableGuildQuestNotifications(character).some(entry => entry.questId === JOHANNA_RESCUE_QUEST_ID),
    false,
    "an accepted request is not new"
  );

  delete character.quests.active[JOHANNA_RESCUE_QUEST_ID];
  character.quests.completedQuestIds.push(JOHANNA_RESCUE_QUEST_ID);
  assert.equal(
    getAvailableGuildQuestNotifications(character).some(entry => entry.questId === JOHANNA_RESCUE_QUEST_ID),
    false,
    "a reported request is not new"
  );
});

test("a request accepted while waiting is removed before presentation", () => {
  let character = syncGuildQuestNotifications(makeCharacter()).character;
  const acceptedId = character.guildQuestNotifications.pendingIds[0];
  character.quests.active[acceptedId] = { progress: 0 };

  assert.equal(
    getPendingGuildQuestNotifications(character).some(entry => entry.questId === acceptedId),
    false
  );
  const reconciled = syncGuildQuestNotifications(character);
  assert.equal(reconciled.removedIds.includes(acceptedId), true);
  assert.equal(reconciled.character.guildQuestNotifications.pendingIds.includes(acceptedId), false);
});

test("completion marks only the displayed IDs and preserves requests unlocked during display", () => {
  let character = makeCharacter();
  const displayedIds = [B2F_UNLOCK_QUEST_IDS[0]];
  const laterIds = [B2F_UNLOCK_QUEST_IDS[1]];
  character.guildQuestNotifications = {
    pendingIds: [...displayedIds, ...laterIds],
    notifiedIds: []
  };
  character = markGuildQuestNotificationsShown(character, displayedIds);
  assert.deepEqual(character.guildQuestNotifications.notifiedIds, displayedIds);
  assert.deepEqual(character.guildQuestNotifications.pendingIds, laterIds);
});

test("notification completion does not accept or complete a request", () => {
  let character = syncGuildQuestNotifications(makeCharacter()).character;
  const [requestId] = character.guildQuestNotifications.pendingIds;
  character = markGuildQuestNotificationsShown(character, [requestId]);

  assert.equal(character.quests.active[requestId], undefined);
  assert.equal(character.quests.completedQuestIds.includes(requestId), false);
  assert.deepEqual(syncGuildQuestNotifications(character).addedIds, []);
});

test("legacy and malformed saved notification state is normalized safely", () => {
  assert.deepEqual(
    normalizeGuildQuestNotificationState(),
    createInitialGuildQuestNotificationState()
  );
  assert.deepEqual(normalizeGuildQuestNotificationState({
    pendingIds: [B2F_UNLOCK_QUEST_IDS[0], B2F_UNLOCK_QUEST_IDS[0], "missing_quest", "shown"],
    notifiedIds: ["shown", B2F_UNLOCK_QUEST_IDS[1], B2F_UNLOCK_QUEST_IDS[1]]
  }), {
    pendingIds: [B2F_UNLOCK_QUEST_IDS[0]],
    notifiedIds: [B2F_UNLOCK_QUEST_IDS[1]]
  });

  const legacy = makeCharacter("旧セーブ");
  delete legacy.guildQuestNotifications;
  const normalized = normalizeCharacter(legacy);
  assert.deepEqual(normalized.guildQuestNotifications, { pendingIds: [], notifiedIds: [] });
  assert.deepEqual(syncGuildQuestNotifications(normalized).addedIds, B2F_UNLOCK_QUEST_IDS);
});

test("pending and notified request IDs survive character normalization", () => {
  const character = makeCharacter("復元テスト");
  character.guildQuestNotifications = {
    pendingIds: [B2F_UNLOCK_QUEST_IDS[1]],
    notifiedIds: [B2F_UNLOCK_QUEST_IDS[0]]
  };
  assert.deepEqual(
    normalizeCharacter(character).guildQuestNotifications,
    character.guildQuestNotifications
  );
});
