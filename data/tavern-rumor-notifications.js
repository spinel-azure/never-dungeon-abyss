import { getUnreadTavernRumors } from "./tavern-rumors.js";

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids
    .map(id => String(id || "").trim())
    .filter(Boolean))];
}

export function createInitialTavernRumorNotificationState() {
  return { pendingIds: [], notifiedIds: [] };
}

export function normalizeTavernRumorNotificationState(state) {
  const notifiedIds = normalizeIds(state?.notifiedIds);
  const notified = new Set(notifiedIds);
  const pendingIds = normalizeIds(state?.pendingIds).filter(id => !notified.has(id));
  return { pendingIds, notifiedIds };
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function withNotificationState(character, notificationState) {
  const current = character?.tavernRumorNotifications;
  if (current
    && Array.isArray(current.pendingIds)
    && Array.isArray(current.notifiedIds)
    && sameIds(current.pendingIds, notificationState.pendingIds)
    && sameIds(current.notifiedIds, notificationState.notifiedIds)) {
    return character;
  }
  return { ...character, tavernRumorNotifications: notificationState };
}

/**
 * Reconciles the persistent queue with the rumor stages that can currently be
 * heard. Each rumor contributes only its latest unlocked unread stage.
 */
export function syncTavernRumorNotifications(character, context = {}) {
  if (!character || typeof character !== "object") {
    return { character, pendingRumors: [], addedIds: [], removedIds: [] };
  }
  const state = normalizeTavernRumorNotificationState(character.tavernRumorNotifications);
  const unreadRumors = getUnreadTavernRumors(character, context);
  const unreadIds = new Set(unreadRumors.map(rumor => rumor.notificationId));
  const notified = new Set(state.notifiedIds);
  const pending = state.pendingIds.filter(id => unreadIds.has(id) && !notified.has(id));
  const removedIds = state.pendingIds.filter(id => !pending.includes(id));
  const addedIds = [];

  for (const rumor of unreadRumors) {
    const id = rumor.notificationId;
    if (notified.has(id) || pending.includes(id)) continue;
    pending.push(id);
    addedIds.push(id);
  }

  const notificationState = { pendingIds: pending, notifiedIds: state.notifiedIds };
  const nextCharacter = withNotificationState(character, notificationState);
  return {
    character: nextCharacter,
    pendingRumors: unreadRumors.filter(rumor => pending.includes(rumor.notificationId)),
    addedIds,
    removedIds
  };
}

/** Returns only queued stages that are still the latest unread stage. */
export function getPendingTavernRumorNotifications(character, context = {}) {
  if (!character || typeof character !== "object") return [];
  const pending = new Set(normalizeTavernRumorNotificationState(
    character.tavernRumorNotifications
  ).pendingIds);
  return getUnreadTavernRumors(character, context)
    .filter(rumor => pending.has(rumor.notificationId));
}

/** Marks a completed display batch. Reading a rumor remains a separate action. */
export function markTavernRumorNotificationsShown(character, notificationIds) {
  if (!character || typeof character !== "object") return character;
  const state = normalizeTavernRumorNotificationState(character.tavernRumorNotifications);
  const pending = new Set(state.pendingIds);
  const completedIds = normalizeIds(notificationIds).filter(id => pending.has(id));
  if (!completedIds.length) return withNotificationState(character, state);
  const completed = new Set(completedIds);
  const notifiedIds = [...state.notifiedIds];
  const notified = new Set(notifiedIds);
  for (const id of completedIds) {
    if (!notified.has(id)) {
      notified.add(id);
      notifiedIds.push(id);
    }
  }
  return withNotificationState(character, {
    pendingIds: state.pendingIds.filter(id => !completed.has(id)),
    notifiedIds
  });
}
