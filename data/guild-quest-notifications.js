import { QUESTS, getQuestProgress, isQuestAvailable } from "./quests.js";

const QUEST_IDS = new Set(QUESTS.map(quest => quest.id));

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids
    .map(id => String(id || "").trim())
    .filter(id => id && QUEST_IDS.has(id)))];
}

export function createInitialGuildQuestNotificationState() {
  return { pendingIds: [], notifiedIds: [] };
}

export function normalizeGuildQuestNotificationState(state) {
  const notifiedIds = normalizeIds(state?.notifiedIds);
  const notified = new Set(notifiedIds);
  const pendingIds = normalizeIds(state?.pendingIds).filter(id => !notified.has(id));
  return { pendingIds, notifiedIds };
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function withNotificationState(character, notificationState) {
  const current = character?.guildQuestNotifications;
  if (current
    && Array.isArray(current.pendingIds)
    && Array.isArray(current.notifiedIds)
    && sameIds(current.pendingIds, notificationState.pendingIds)
    && sameIds(current.notifiedIds, notificationState.notifiedIds)) {
    return character;
  }
  return { ...character, guildQuestNotifications: notificationState };
}

/** Returns quests that can currently be accepted at the guild. */
export function getAvailableGuildQuestNotifications(character) {
  if (!character?.eventFlags?.guild_first_request_unlocked) return [];
  return QUESTS.flatMap(quest => {
    const progress = getQuestProgress(character, quest.id);
    if (!isQuestAvailable(character, quest) || progress.active || progress.completed) return [];
    return [{
      id: quest.id,
      questId: quest.id,
      notificationId: quest.id,
      quest
    }];
  });
}

/** Reconciles saved pending IDs with the quests that remain newly acceptable. */
export function syncGuildQuestNotifications(character) {
  if (!character || typeof character !== "object") {
    return { character, pendingQuests: [], addedIds: [], removedIds: [] };
  }
  const state = normalizeGuildQuestNotificationState(character.guildQuestNotifications);
  const availableQuests = getAvailableGuildQuestNotifications(character);
  const availableIds = new Set(availableQuests.map(entry => entry.notificationId));
  const notified = new Set(state.notifiedIds);
  const pendingIds = state.pendingIds.filter(id => availableIds.has(id) && !notified.has(id));
  const removedIds = state.pendingIds.filter(id => !pendingIds.includes(id));
  const addedIds = [];

  for (const entry of availableQuests) {
    const id = entry.notificationId;
    if (notified.has(id) || pendingIds.includes(id)) continue;
    pendingIds.push(id);
    addedIds.push(id);
  }

  const notificationState = { pendingIds, notifiedIds: state.notifiedIds };
  const nextCharacter = withNotificationState(character, notificationState);
  return {
    character: nextCharacter,
    pendingQuests: availableQuests.filter(entry => pendingIds.includes(entry.notificationId)),
    addedIds,
    removedIds
  };
}

/** Rechecks acceptance state immediately before a queued notification begins. */
export function getPendingGuildQuestNotifications(character) {
  if (!character || typeof character !== "object") return [];
  const pending = new Set(normalizeGuildQuestNotificationState(
    character.guildQuestNotifications
  ).pendingIds);
  return getAvailableGuildQuestNotifications(character)
    .filter(entry => pending.has(entry.notificationId));
}

/** Marks only the IDs captured by a notification that completed its display. */
export function markGuildQuestNotificationsShown(character, notificationIds) {
  if (!character || typeof character !== "object") return character;
  const state = normalizeGuildQuestNotificationState(character.guildQuestNotifications);
  const pending = new Set(state.pendingIds);
  const completedIds = normalizeIds(notificationIds).filter(id => pending.has(id));
  if (!completedIds.length) return withNotificationState(character, state);
  const completed = new Set(completedIds);
  const notifiedIds = [...state.notifiedIds];
  const notified = new Set(notifiedIds);
  for (const id of completedIds) {
    if (notified.has(id)) continue;
    notified.add(id);
    notifiedIds.push(id);
  }
  return withNotificationState(character, {
    pendingIds: state.pendingIds.filter(id => !completed.has(id)),
    notifiedIds
  });
}
