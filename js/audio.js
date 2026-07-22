export const SE = Object.freeze({
  battleStart: "battle_start.wav",
  attackHit: "damage.wav",
  spellAttack: "fire_attack.wav",
  playerDamage: "my_damage.wav",
  guard: "bassdrum.wav",
  attackMiss: "miss.wav",
  buff: "charge.wav",
  enemyDefeated: "arawaru.wav",
  battleVictory: "fanfare.wav",
  step: "ashioto.wav",
  blocked: "doon.wav",
  door: "door1.wav",
  stairs: "zaza.wav",
  cursorMove: "cursor_7.wav",
  confirm: "cursor_1.wav",
  cancel: "cancel.wav",
  item: "item_3.wav",
  heal: "little_cure.wav",
  catVoice01: "cat_voice01.mp3",
  catVoice02: "cat_voice02.mp3",
  catVoice03: "cat_voice03.mp3"
});

const audio = {
  enabled: true,
  volume: .1,
  urls: new Map(),
  sounds: new Map(),
  sequenceSounds: new Map(),
  activeSounds: new Map(),
  pendingRequests: new Map(),
  requestIds: new Map(),
  lastStartedAt: new Map(),
  sequenceResolvers: new Set(),
  configured: false
};

const MAX_CONCURRENT_SE = 3;
const PLAYBACK_POLICIES = {
  step: { mode: "restart", priority: 1, disabledOnTouch: true, desktopCooldown: 70 },
  cursorMove: { mode: "restart", priority: 1, mobileCooldown: 80, desktopCooldown: 45 },
  confirm: { mode: "drop", priority: 2 },
  cancel: { mode: "drop", priority: 2 },
  item: { mode: "drop", priority: 2 },
  heal: { mode: "drop", priority: 2 },
  blocked: { mode: "drop", priority: 3, disabledOnTouch: true },
  door: { mode: "drop", priority: 3 },
  battleStart: { mode: "complete", priority: 3 },
  battleVictory: { mode: "complete", priority: 3 },
  enemyDefeated: { mode: "complete", priority: 3 },
  catVoice01: { mode: "complete", priority: 2 },
  catVoice02: { mode: "complete", priority: 2 },
  catVoice03: { mode: "complete", priority: 2 }
};
const DEFAULT_POLICY = { mode: "drop", priority: 2 };

export function configureAudio() {
  Object.entries(SE).forEach(([key, file]) => {
    audio.urls.set(key, `se/${file}`);
  });
  if (audio.configured) return;
  audio.configured = true;
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAllSe(); });
  window.addEventListener("pagehide", stopAllSe);
  window.addEventListener("blur", stopAllSe);
}

export function setSeOptions({ enabled, volume } = {}) {
  if (typeof enabled === "boolean") audio.enabled = enabled;
  if (Number.isFinite(volume)) audio.volume = Math.max(0, Math.min(1, volume));
  if (!audio.enabled || audio.volume <= 0) stopAllSe();
}

export function playSe(key) {
  if (!audio.enabled || audio.volume <= 0) return Promise.resolve(false);
  const url = audio.urls.get(key);
  if (!url) {
    console.warn(`Unknown SE key: ${key}`);
    return Promise.resolve(false);
  }
  let sound = audio.sounds.get(key);
  if (!sound) {
    sound = makeSound(url);
    audio.sounds.set(key, sound);
  }
  const policy = PLAYBACK_POLICIES[key] || DEFAULT_POLICY;
  if (policy.disabledOnTouch && isTouchLayout()) return Promise.resolve(false);
  const now = performance.now();
  const cooldown = isTouchLayout() ? policy.mobileCooldown || 0 : policy.desktopCooldown || 0;
  if (cooldown && now - (audio.lastStartedAt.get(key) || -Infinity) < cooldown) return Promise.resolve(false);

  const isPending = audio.pendingRequests.has(key);
  const isPlaying = audio.activeSounds.has(sound) || (!sound.paused && !sound.ended);
  if (isPending) return Promise.resolve(false);
  if (isPlaying) {
    if (policy.mode !== "restart") return Promise.resolve(false);
    stopSound(sound, key);
  }
  if (!reservePlaybackSlot(policy.priority)) return Promise.resolve(false);

  resetSound(sound);
  sound.volume = audio.volume;
  const requestId = (audio.requestIds.get(key) || 0) + 1;
  audio.requestIds.set(key, requestId);
  audio.pendingRequests.set(key, { sound, priority: policy.priority, requestId });
  audio.lastStartedAt.set(key, now);
  const playback = sound.play();
  if (!playback?.then) {
    markPlaybackStarted(key, sound, policy.priority, requestId);
    return Promise.resolve(true);
  }
  return playback
    .then(() => { markPlaybackStarted(key, sound, policy.priority, requestId); return true; })
    .catch(() => false)
    .finally(() => clearPendingRequest(key, requestId));
}

export async function playSeSequence(key, count = 1) {
  const repeats = Math.max(0, Math.floor(count));
  const url = audio.urls.get(key);
  if (!url || repeats === 0) return false;
  let sound = audio.sequenceSounds.get(key);
  if (!sound) {
    sound = makeSound(url);
    audio.sequenceSounds.set(key, sound);
  }
  for (let index = 0; index < repeats; index += 1) {
    if (!audio.enabled || audio.volume <= 0) return false;
    if (!reservePlaybackSlot(3, sound)) return false;
    const completed = await playSeToEnd(sound, key);
    if (!completed) return false;
  }
  return true;
}

export function stopAllSe() {
  audio.sounds.forEach((sound, key) => stopSound(sound, key));
  audio.sequenceSounds.forEach((sound, key) => stopSound(sound, key));
  audio.pendingRequests.clear();
  audio.sequenceResolvers.forEach(resolve => resolve(false));
  audio.sequenceResolvers.clear();
}

function playSeToEnd(sound, key) {
  resetSound(sound);
  sound.volume = audio.volume;
  return new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      sound.removeEventListener("ended", onEnded);
      sound.removeEventListener("error", onError);
      audio.sequenceResolvers.delete(finish);
      audio.activeSounds.delete(sound);
      resolve(result);
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 10000);
    audio.sequenceResolvers.add(finish);
    audio.activeSounds.set(sound, { key, priority: 3 });
    sound.addEventListener("ended", onEnded, { once: true });
    sound.addEventListener("error", onError, { once: true });
    sound.play().catch(() => finish(false));
  });
}

function makeSound(url) {
  const sound = new Audio(url);
  sound.preload = "none";
  sound.loop = false;
  sound.addEventListener("ended", () => audio.activeSounds.delete(sound));
  sound.addEventListener("error", () => audio.activeSounds.delete(sound));
  return sound;
}

function markPlaybackStarted(key, sound, priority, requestId) {
  if (audio.requestIds.get(key) !== requestId || sound.paused) return;
  audio.activeSounds.set(sound, { key, priority });
}

function clearPendingRequest(key, requestId) {
  if (audio.pendingRequests.get(key)?.requestId === requestId) audio.pendingRequests.delete(key);
}

function reservePlaybackSlot(priority, existingSound = null) {
  if (existingSound && audio.activeSounds.has(existingSound)) return true;
  const pendingCount = [...audio.pendingRequests.values()].filter(request => !audio.activeSounds.has(request.sound)).length;
  if (audio.activeSounds.size + pendingCount < MAX_CONCURRENT_SE) return true;
  const lowerActive = [...audio.activeSounds.entries()]
    .filter(([, active]) => active.priority < priority)
    .sort((a, b) => a[1].priority - b[1].priority)[0];
  const lowerPending = [...audio.pendingRequests.entries()]
    .filter(([, pending]) => pending.priority < priority)
    .sort((a, b) => a[1].priority - b[1].priority)[0];
  if (!lowerActive && !lowerPending) return false;
  if (lowerPending && (!lowerActive || lowerPending[1].priority <= lowerActive[1].priority)) {
    stopSound(lowerPending[1].sound, lowerPending[0]);
  } else {
    stopSound(lowerActive[0], lowerActive[1].key);
  }
  return true;
}

function stopSound(sound, key) {
  sound.pause();
  resetSound(sound);
  audio.activeSounds.delete(sound);
  const pending = audio.pendingRequests.get(key);
  if (pending?.sound === sound) audio.pendingRequests.delete(key);
}

function resetSound(sound) {
  try { sound.currentTime = 0; } catch (_error) {}
}

function isTouchLayout() {
  return document.body.classList.contains("layout-mobile") || document.body.classList.contains("layout-tablet");
}
