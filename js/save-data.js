import {
  isProtectedSavePayload,
  protectSavePayload,
  unprotectSavePayload
} from "./save-integrity.js";

export const SAVE_SCHEMA_VERSION = 2;
export const SAVE_ARCHIVE_VERSION = 2;
export const AUTO_SAVE_SLOT = "auto";
export const MANUAL_SAVE_SLOTS = Object.freeze(["manual1", "manual2", "manual3"]);

const LEGACY_AUTO_KEYS = Object.freeze({
  current: "nda.save.slot1.current",
  backup: "nda.save.slot1.backup",
  temp: "nda.save.slot1.temp"
});

function slotKeys(slot) {
  if (slot === AUTO_SAVE_SLOT) return LEGACY_AUTO_KEYS;
  if (!MANUAL_SAVE_SLOTS.includes(slot)) return null;
  const number = MANUAL_SAVE_SLOTS.indexOf(slot) + 1;
  return {
    current: `nda.save.manual${number}.current`,
    backup: `nda.save.manual${number}.backup`,
    temp: `nda.save.manual${number}.temp`
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidSaveData(value) {
  return isValidSaveShape(value) && value.schemaVersion === SAVE_SCHEMA_VERSION;
}

function isValidLegacySaveData(value) {
  return isValidSaveShape(value) && value.schemaVersion === 1;
}

function isValidSaveShape(value) {
  return isObject(value)
    && typeof value.savedAt === "string"
    && isObject(value.character)
    && isObject(value.dungeon)
    && Array.isArray(value.dungeon.cells)
    && Array.isArray(value.dungeon.explored)
    && isObject(value.player);
}

function readKey(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (isProtectedSavePayload(stored)) {
      const value = unprotectSavePayload(stored);
      return isValidSaveData(value) ? value : null;
    }
    return isValidLegacySaveData(stored) ? stored : null;
  } catch (error) {
    console.warn(`NDA save data could not be read (${key}).`, error);
    return null;
  }
}

export function loadGame(slot = AUTO_SAVE_SLOT) {
  const keys = slotKeys(slot);
  if (!keys) return null;
  const current = readKey(keys.current);
  if (current) return current;
  const backup = readKey(keys.backup);
  if (!backup) return null;
  try {
    localStorage.setItem(keys.current, JSON.stringify(backup));
  } catch (error) {
    console.warn(`NDA backup save could not be promoted (${slot}).`, error);
  }
  return backup;
}

export function hasAutoSaveData() {
  return Boolean(loadGame(AUTO_SAVE_SLOT));
}

export function hasManualSaveData() {
  return MANUAL_SAVE_SLOTS.some(slot => Boolean(loadGame(slot)));
}

export function hasSaveData() {
  return hasAutoSaveData() || hasManualSaveData();
}

export function writeGame(snapshot, slot = AUTO_SAVE_SLOT) {
  const keys = slotKeys(slot);
  if (!keys) return false;
  const save = {
    ...snapshot,
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString()
  };
  if (!isValidSaveData(save)) return false;

  try {
    writeValidatedSave(save, keys);
    window.dispatchEvent(new CustomEvent("nda:save-changed"));
    return true;
  } catch (error) {
    console.warn(`NDA game data could not be saved (${slot}).`, error);
    return false;
  }
}

function writeValidatedSave(save, keys) {
  const serialized = JSON.stringify(protectSavePayload(save));
  localStorage.setItem(keys.temp, serialized);
  const temporaryEnvelope = JSON.parse(localStorage.getItem(keys.temp) || "null");
  if (!isValidSaveData(unprotectSavePayload(temporaryEnvelope))) {
    throw new Error("Temporary save validation failed.");
  }
  const current = localStorage.getItem(keys.current);
  if (current) localStorage.setItem(keys.backup, current);
  localStorage.setItem(keys.current, serialized);
  localStorage.removeItem(keys.temp);
}

export function getSaveSlotSummaries() {
  return [AUTO_SAVE_SLOT, ...MANUAL_SAVE_SLOTS].map((slot, index) => {
    const save = loadGame(slot);
    return {
      slot,
      label: slot === AUTO_SAVE_SLOT ? "オートセーブ" : `セーブ${index}`,
      exists: Boolean(save),
      name: save?.character?.name || "",
      level: Math.max(1, Math.floor(Number(save?.character?.level) || 1)),
      savedAt: save?.savedAt || ""
    };
  });
}

export function createSaveArchive() {
  const slots = {};
  [AUTO_SAVE_SLOT, ...MANUAL_SAVE_SLOTS].forEach(slot => {
    const save = loadGame(slot);
    if (save) slots[slot] = { ...save, schemaVersion: SAVE_SCHEMA_VERSION };
  });
  return protectSavePayload({
    format: "NEVER DUNGEON : ABYSS SAVE DATA",
    archiveVersion: SAVE_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    slots
  });
}

export function importSaveArchive(candidate) {
  const protectedArchive = isProtectedSavePayload(candidate);
  const archive = protectedArchive ? unprotectSavePayload(candidate) : candidate;
  if (protectedArchive && !archive) {
    return { accepted: false, importedSlots: [], reason: "integrityFailed" };
  }
  const isLegacyArchive = archive?.archiveVersion === 1;
  if (
    !isObject(archive)
    || archive.format !== "NEVER DUNGEON : ABYSS SAVE DATA"
    || (!protectedArchive && !isLegacyArchive)
    || (protectedArchive && archive.archiveVersion !== SAVE_ARCHIVE_VERSION)
    || !isObject(archive.slots)
  ) {
    return { accepted: false, importedSlots: [], reason: "invalidArchive" };
  }

  const importedSlots = [];
  for (const slot of [AUTO_SAVE_SLOT, ...MANUAL_SAVE_SLOTS]) {
    const save = archive.slots[slot];
    if (!save) continue;
    if (!(isValidSaveData(save) || (isLegacyArchive && isValidLegacySaveData(save)))) {
      return { accepted: false, importedSlots: [], reason: "invalidSave" };
    }
  }

  try {
    for (const slot of [AUTO_SAVE_SLOT, ...MANUAL_SAVE_SLOTS]) {
      const save = archive.slots[slot];
      if (!save) continue;
      writeValidatedSave({ ...save, schemaVersion: SAVE_SCHEMA_VERSION }, slotKeys(slot));
      importedSlots.push(slot);
    }
    window.dispatchEvent(new CustomEvent("nda:save-changed"));
    return { accepted: true, importedSlots };
  } catch (error) {
    console.warn("NDA save archive could not be imported.", error);
    return { accepted: false, importedSlots: [], reason: "writeFailed" };
  }
}
