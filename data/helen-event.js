export const HELEN_HIDDEN_EVENT_PENDING_FLAG = "helen_hidden_event_pending";
export const HELEN_HIDDEN_EVENT_SEEN_FLAG = "helen_hidden_event_seen";
export const HELEN_HIDDEN_EVENT_PORTRAIT = "images/npc/NPC_13f.avif";

export function isHelenHiddenEventPending(character) {
  return Boolean(character?.eventFlags?.[HELEN_HIDDEN_EVENT_PENDING_FLAG]
    && !character?.eventFlags?.[HELEN_HIDDEN_EVENT_SEEN_FLAG]);
}

export function shouldUseHelenHiddenPortrait(character) {
  return isHelenHiddenEventPending(character) || Boolean(character?.eventFlags?.[HELEN_HIDDEN_EVENT_SEEN_FLAG]);
}
