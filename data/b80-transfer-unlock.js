export const B80_TRANSFER_FLAG = "transfer_portal_b80f_unlocked";
export const B80_BOSS_DEFEATED_FLAG = "boss_jirene_b79f_defeated";
export const B80_REACHED_FLAG = "floor_b80_reached";
export const B80_UNLOCK_QUEST_ID = "guild_028";

export function isB80TransferUnlocked(character) {
  return Boolean(
    character?.eventFlags?.[B80_TRANSFER_FLAG]
      || character?.eventFlags?.[B80_BOSS_DEFEATED_FLAG]
  );
}

export function backfillB80TransferUnlock(eventFlags, completedQuestIds = []) {
  const flags = eventFlags && typeof eventFlags === "object" ? { ...eventFlags } : {};
  const questReported = Array.isArray(completedQuestIds)
    && completedQuestIds.includes(B80_UNLOCK_QUEST_ID);
  const reachedAfterBoss = Boolean(
    flags[B80_BOSS_DEFEATED_FLAG] && flags[B80_REACHED_FLAG]
  );
  if (questReported || reachedAfterBoss) flags[B80_TRANSFER_FLAG] = true;
  return flags;
}
