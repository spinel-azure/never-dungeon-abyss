const PRESENCE_MAX = 100;
const NORMAL_STEP_MIN = 4;
const NORMAL_STEP_MAX = 8;
const DARK_STEP_MIN = 5;
const DARK_STEP_MAX = 10;
const ENCOUNTER_MESSAGE = "＊　何者かと遭遇した！　＊（戦闘は未実装です）";

let presence = 0;
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

export function onPlayerStep({ inDarkness = false, random = Math.random } = {}) {
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
