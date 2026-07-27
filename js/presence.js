const PRESENCE_MAX = 100;
const NORMAL_STEP_MIN = 4;
const NORMAL_STEP_MAX = 8;
const DARK_STEP_MIN = 5;
const DARK_STEP_MAX = 10;
const ENCOUNTER_MESSAGE = "＊　何者かと遭遇した！　＊";

let presence = 0;
let suppressedSteps = 0;
let encounterActive = false;
let presenceDisabled = false;
const hooks = {
  onChange: () => {},
  onEncounter: () => {}
};

export function configurePresence(callbacks) {
  Object.assign(hooks, callbacks);
  hooks.onChange(presence);
}

export function getPresence() {
  return presence;
}

export function getPresenceSuppressedSteps() {
  return suppressedSteps;
}

export function restorePresence(value, suppression = 0) {
  presence = Math.max(0, Math.min(PRESENCE_MAX, Math.floor(Number(value) || 0)));
  suppressedSteps = Math.max(0, Math.floor(Number(suppression) || 0));
  encounterActive = presence >= PRESENCE_MAX;
  hooks.onChange(presence);
}

export function addPresence(amount) {
  if (presenceDisabled) return false;
  if (encounterActive) return false;
  const increase = Math.max(0, Math.floor(Number(amount) || 0));
  presence = Math.min(PRESENCE_MAX, presence + increase);
  hooks.onChange(presence);
  if (presence < PRESENCE_MAX) return false;
  return triggerEncounter();
}

export function setPresenceDisabled(disabled) {
  presenceDisabled = Boolean(disabled);
  if (presenceDisabled) resetPresence();
}

export function isPresenceDisabled() {
  return presenceDisabled;
}

export function resetPresence() {
  presence = 0;
  encounterActive = false;
  hooks.onChange(presence);
}

export function suppressPresence(steps) {
  suppressedSteps = Math.max(suppressedSteps, Math.max(0, Math.floor(Number(steps) || 0)));
  hooks.onChange(presence);
}

export function onPlayerStep({ inDarkness = false, random = Math.random } = {}) {
  if (suppressedSteps > 0) {
    suppressedSteps -= 1;
    hooks.onChange(presence);
    return false;
  }
  const min = inDarkness ? DARK_STEP_MIN : NORMAL_STEP_MIN;
  const max = inDarkness ? DARK_STEP_MAX : NORMAL_STEP_MAX;
  const amount = Math.floor(random() * (max - min + 1)) + min;
  return addPresence(amount);
}

export function triggerEncounter() {
  if (encounterActive) return false;
  encounterActive = true;
  hooks.onEncounter(ENCOUNTER_MESSAGE);
  return true;
}
