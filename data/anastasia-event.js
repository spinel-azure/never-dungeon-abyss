export const ANASTASIA_ASSIGNED_FLAG = "tavern_rumor_004_base_read";
export const ANASTASIA_OUTFIT_RUMOR_FLAG = "tavern_rumor_005_base_read";
export const ANASTASIA_OUTFIT_EVENT_FLAG = "anastasia_festival_outfit_unlocked";

export function isAnastasiaAssigned(character) {
  return Boolean(character?.eventFlags?.[ANASTASIA_ASSIGNED_FLAG]);
}

export function isAnastasiaOutfitEventPending(character) {
  const flags = character?.eventFlags || {};
  return Boolean(
    flags[ANASTASIA_ASSIGNED_FLAG]
    && flags[ANASTASIA_OUTFIT_RUMOR_FLAG]
    && !flags[ANASTASIA_OUTFIT_EVENT_FLAG]
  );
}

export function isAnastasiaFestivalSunday(character, date = new Date()) {
  return Boolean(
    character?.eventFlags?.[ANASTASIA_OUTFIT_EVENT_FLAG]
    && date instanceof Date
    && !Number.isNaN(date.getTime())
    && date.getDay() === 0
  );
}

export function shouldUseAnastasiaFestivalPortrait(character, date = new Date()) {
  return isAnastasiaOutfitEventPending(character) || isAnastasiaFestivalSunday(character, date);
}
