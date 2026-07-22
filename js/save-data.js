export const SAVE_SCHEMA_VERSION = 1;

const CURRENT_KEY = "nda.save.slot1.current";
const BACKUP_KEY = "nda.save.slot1.backup";
const TEMP_KEY = "nda.save.slot1.temp";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidSaveData(value) {
  return isObject(value)
    && value.schemaVersion === SAVE_SCHEMA_VERSION
    && typeof value.savedAt === "string"
    && isObject(value.dungeon)
    && Array.isArray(value.dungeon.cells)
    && Array.isArray(value.dungeon.explored)
    && isObject(value.player);
}

function readKey(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return isValidSaveData(value) ? value : null;
  } catch (error) {
    console.warn(`NDA save data could not be read (${key}).`, error);
    return null;
  }
}

export function loadGame() {
  const current = readKey(CURRENT_KEY);
  if (current) return current;

  const backup = readKey(BACKUP_KEY);
  if (!backup) return null;
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(backup));
  } catch (error) {
    console.warn("NDA backup save could not be promoted.", error);
  }
  return backup;
}

export function hasSaveData() {
  return Boolean(loadGame());
}

export function writeGame(snapshot) {
  const save = {
    ...snapshot,
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString()
  };
  if (!isValidSaveData(save)) return false;

  try {
    const serialized = JSON.stringify(save);
    localStorage.setItem(TEMP_KEY, serialized);
    if (!isValidSaveData(JSON.parse(localStorage.getItem(TEMP_KEY) || "null"))) return false;

    const current = localStorage.getItem(CURRENT_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(CURRENT_KEY, serialized);
    localStorage.removeItem(TEMP_KEY);
    window.dispatchEvent(new CustomEvent("nda:save-changed"));
    return true;
  } catch (error) {
    console.warn("NDA game data could not be saved.", error);
    return false;
  }
}

