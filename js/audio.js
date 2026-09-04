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
  levelUp: "hakushu.wav",
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
  catVoice03: "cat_voice03.mp3",
  townAmbience: "shizen_kohen.mp3",
  goodNight: "good-night.mp3",
  horseVoice: "uma_01.mp3",
  roosterVoice: "niwatori_01.mp3",
  gameOver: "game-over1.mp3",
  revival: "fukkatsu-inori1.mp3",
  levelUpJingle: "sentou-syouri2.mp3",
  itemGet: "item-get.mp3",
  importantItem: "juuyou-item.mp3",
  costOver: "boo.wav",
  achievementUnlocked: "item-get.mp3",
  rapidCurrentSplash: "minamo.mp3",
  rapidCurrentFlow: "suiryuu.mp3",
  fixedWarp: "warp.wav"
});

const audio = {
  enabled: true,
  volume: .1,
  bgmEnabled: true,
  bgmVolume: .1,
  urls: new Map(),
  bgmUrls: new Map([
    ["title", "bgm/shinen-tobira.mp3"],
    ["dungeon", "bgm/bukimi-tou.mp3"],
    ["deepDungeon", "bgm/matou-izanai.mp3"],
    ["normalBattle", "bgm/mazieru-shitou.mp3"],
    ["floorBoss", "bgm/sentou-two.mp3"],
    ["eventBoss", "bgm/battle-of-galfer.mp3"],
    ["temple", "bgm/kyoukai.mp3"],
    ["registration", "bgm/skip-melzo.mp3"],
    ["townFacilities", "bgm/tabidachi-junbi.mp3"],
    ["lotBag", "bgm/casino-hitotooki.mp3"],
    ["shrine", "bgm/hokora.mp3"],
    ["jungleZone", "bgm/taikutsu-mori.mp3"],
    ["desertZone", "bgm/arabu-sabaku.mp3"],
    ["finalBoss", "bgm/tozasareshi-seisen.mp3"],
    ["maerchentiereBoss", "bgm/manuke-kyoku.mp3"],
    ["ending", "bgm/jo-jokyoku.mp3"]
  ]),
  context: null,
  seMasterGain: null,
  bgmMasterGain: null,
  buffers: new Map(),
  bufferRequests: new Map(),
  activeSources: new Map(),
  loopSources: new Map(),
  loopRequests: new Map(),
  desiredLoops: new Set(),
  desiredBgmKey: "",
  bgmSource: null,
  cinematic: null,
  bgmRequestId: 0,
  pendingRequests: new Map(),
  requestIds: new Map(),
  lastStartedAt: new Map(),
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
  levelUp: { mode: "complete", priority: 3 },
  goodNight: { mode: "complete", priority: 3 },
  horseVoice: { mode: "complete", priority: 3 },
  roosterVoice: { mode: "complete", priority: 3 },
  gameOver: { mode: "complete", priority: 3 },
  revival: { mode: "complete", priority: 3 },
  levelUpJingle: { mode: "complete", priority: 3 },
  itemGet: { mode: "complete", priority: 2 },
  importantItem: { mode: "complete", priority: 3 },
  costOver: { mode: "restart", priority: 3 },
  achievementUnlocked: { mode: "complete", priority: 3 },
  enemyDefeated: { mode: "complete", priority: 3 },
  catVoice01: { mode: "complete", priority: 2 },
  catVoice02: { mode: "complete", priority: 2 },
  catVoice03: { mode: "complete", priority: 2 },
  rapidCurrentSplash: { mode: "restart", priority: 3 },
  rapidCurrentFlow: { mode: "restart", priority: 2 },
  fixedWarp: { mode: "complete", priority: 3 }
};
const DEFAULT_POLICY = { mode: "drop", priority: 2 };

export function configureAudio() {
  Object.entries(SE).forEach(([key, file]) => {
    audio.urls.set(key, `se/${file}`);
  });
  if (audio.configured) return;
  audio.configured = true;
  const unlock = () => {
    void resumeAudioContext().then(restartInterruptedAudio);
  };
  document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  document.addEventListener("touchstart", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopInterruptedAudio();
    else restartInterruptedAudio();
  });
  window.addEventListener("pagehide", stopInterruptedAudio);
  window.addEventListener("pageshow", restartInterruptedAudio);
  window.addEventListener("blur", stopInterruptedAudio);
  window.addEventListener("focus", restartInterruptedAudio);
}

export function setSeOptions({ enabled, volume } = {}) {
  if (typeof enabled === "boolean") audio.enabled = enabled;
  if (Number.isFinite(volume)) audio.volume = Math.max(0, Math.min(1, volume));
  applySeGain();
  if (!audio.enabled || audio.volume <= 0) stopAllSe();
  else restartDesiredLoops();
}

export function setBgmOptions({ enabled, volume } = {}) {
  if (typeof enabled === "boolean") audio.bgmEnabled = enabled;
  if (Number.isFinite(volume)) audio.bgmVolume = Math.max(0, Math.min(1, volume));
  applyBgmGain();
  if (!audio.bgmEnabled || audio.bgmVolume <= 0) stopBgmSource();
  else restartBgm();
}

export function startBgm(key) {
  if (!audio.bgmUrls.has(key)) {
    console.warn(`Unknown BGM key: ${key}`);
    return Promise.resolve(false);
  }
  if (audio.desiredBgmKey !== key) stopBgmSource();
  audio.desiredBgmKey = key;
  return restartBgm();
}

export function stopBgm() {
  audio.cinematic?.stop();
  audio.desiredBgmKey = "";
  audio.bgmRequestId += 1;
  stopBgmSource();
}

export async function playSe(key) {
  if (!audio.enabled || audio.volume <= 0) return false;
  const url = audio.urls.get(key);
  if (!url) {
    console.warn(`Unknown SE key: ${key}`);
    return false;
  }
  const policy = PLAYBACK_POLICIES[key] || DEFAULT_POLICY;
  if (policy.disabledOnTouch && isTouchLayout()) return false;
  const now = performance.now();
  const cooldown = isTouchLayout() ? policy.mobileCooldown || 0 : policy.desktopCooldown || 0;
  if (cooldown && now - (audio.lastStartedAt.get(key) || -Infinity) < cooldown) return false;

  const matchingSources = getActiveSources(key);
  if (audio.pendingRequests.has(key)) return false;
  if (matchingSources.length) {
    if (policy.mode !== "restart") return false;
    matchingSources.forEach(stopSource);
  }
  if (!reservePlaybackSlot(policy.priority)) return false;

  const requestId = (audio.requestIds.get(key) || 0) + 1;
  audio.requestIds.set(key, requestId);
  audio.pendingRequests.set(key, { priority: policy.priority, requestId });
  audio.lastStartedAt.set(key, now);
  try {
    const [context, buffer] = await Promise.all([resumeAudioContext(), loadBuffer(key, url)]);
    if (!context || !buffer || !isCurrentRequest(key, requestId) || !audio.enabled || audio.volume <= 0) return false;
    return startSource(key, buffer, policy.priority);
  } catch (error) {
    warnAudio(`SE could not be played: ${key}`, error);
    return false;
  } finally {
    clearPendingRequest(key, requestId);
  }
}

export async function playSeSequence(key, count = 1) {
  const repeats = Math.max(0, Math.floor(count));
  const url = audio.urls.get(key);
  if (!url || repeats === 0 || !audio.enabled || audio.volume <= 0) return false;
  let context;
  let buffer;
  try {
    [context, buffer] = await Promise.all([resumeAudioContext(), loadBuffer(key, url)]);
  } catch (error) {
    warnAudio(`SE sequence could not be loaded: ${key}`, error);
    return false;
  }
  if (!context || !buffer) return false;
  for (let index = 0; index < repeats; index += 1) {
    if (!audio.enabled || audio.volume <= 0) return false;
    if (!reservePlaybackSlot(3)) return false;
    const completed = await startSourceToEnd(key, buffer, 3);
    if (!completed) return false;
  }
  return true;
}

export function startLoopSe(key) {
  if (!audio.urls.has(key)) {
    console.warn(`Unknown loop SE key: ${key}`);
    return Promise.resolve(false);
  }
  audio.desiredLoops.add(key);
  return startDesiredLoop(key);
}

export function stopLoopSe(key) {
  audio.desiredLoops.delete(key);
  audio.loopRequests.delete(key);
  stopLoopSource(key);
}

export function stopAllSe() {
  audio.requestIds.forEach((id, key) => audio.requestIds.set(key, id + 1));
  audio.pendingRequests.clear();
  [...audio.activeSources.keys()].forEach(stopSource);
  [...audio.loopSources.keys()].forEach(stopLoopSource);
}

function restartDesiredLoops() {
  if (!audio.enabled || audio.volume <= 0 || document.hidden) return;
  audio.desiredLoops.forEach(key => { void startDesiredLoop(key); });
}

function stopInterruptedAudio() {
  stopAllSe();
  if (audio.cinematic) return;
  stopBgmSource();
}

// Non-looping presentation using shared decoding, options and master gain.
export function createEndingAudioClock({ timeoutMs = 8000 } = {}) {
  stopBgm();
  let source = null, gain = null, context = null, startedAt = 0, fallbackAt = 0;
  let cancelled = false, timer = 0, cancelStart = null;
  const session = {
    async start() {
      const interrupted = new Promise(resolve => { cancelStart = () => resolve(false); });
      const timedOut = new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); });
      const ready = audio.bgmEnabled && audio.bgmVolume > 0
        ? Promise.all([resumeAudioContext(), loadBuffer("bgm:ending", audio.bgmUrls.get("ending"))])
        : Promise.resolve(false);
      const result = await Promise.race([ready, timedOut, interrupted]);
      clearTimeout(timer); timer = 0; cancelStart = null;
      if (cancelled) return false;
      if (result && result[0]?.state === "running" && result[1]) {
        context = result[0]; source = context.createBufferSource();
        source.buffer = result[1]; source.loop = false;
        gain = context.createGain(); gain.connect(audio.bgmMasterGain); source.connect(gain);
        startedAt = context.currentTime; source.start(0);
      } else fallbackAt = performance.now();
      return Boolean(source);
    },
    elapsed() { return source ? Math.max(0, context.currentTime - startedAt) : Math.max(0, (performance.now() - fallbackAt) / 1000); },
    fade(value) { if (gain) gain.gain.setValueAtTime(Math.max(0, Math.min(1, value)), context.currentTime); },
    stop() {
      cancelled = true; clearTimeout(timer); timer = 0; cancelStart?.();
      if (source) { try { source.stop(); } catch {} source.disconnect(); }
      gain?.disconnect(); source = null; gain = null;
      if (audio.cinematic === session) audio.cinematic = null;
    }
  };
  audio.cinematic = session;
  return session;
}

function restartInterruptedAudio() {
  if (audio.cinematic) { void resumeAudioContext(); return; }
  restartDesiredLoops();
  restartBgm();
}

function restartBgm() {
  const key = audio.desiredBgmKey;
  if (!key || audio.bgmSource || !audio.bgmEnabled || audio.bgmVolume <= 0 || document.hidden) {
    return Promise.resolve(Boolean(audio.bgmSource));
  }
  const requestId = ++audio.bgmRequestId;
  return Promise.all([resumeAudioContext(), loadBuffer(`bgm:${key}`, audio.bgmUrls.get(key))])
    .then(([context, buffer]) => {
      if (!context || !buffer || requestId !== audio.bgmRequestId || key !== audio.desiredBgmKey
        || !audio.bgmEnabled || audio.bgmVolume <= 0 || document.hidden) return false;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(audio.bgmMasterGain);
      source.onended = () => {
        if (audio.bgmSource === source) audio.bgmSource = null;
      };
      audio.bgmSource = source;
      source.start(0);
      return true;
    })
    .catch(error => {
      warnAudio(`BGM could not be played: ${key}`, error);
      return false;
    });
}

function stopBgmSource() {
  const source = audio.bgmSource;
  if (!source) return;
  audio.bgmSource = null;
  source.onended = null;
  try { source.stop(0); } catch (_error) {}
  try { source.disconnect(); } catch (_error) {}
}

function startDesiredLoop(key) {
  if (!audio.desiredLoops.has(key) || !audio.enabled || audio.volume <= 0 || document.hidden) {
    return Promise.resolve(false);
  }
  if (audio.loopSources.has(key)) return Promise.resolve(true);
  if (audio.loopRequests.has(key)) return audio.loopRequests.get(key);
  const url = audio.urls.get(key);
  const request = Promise.all([resumeAudioContext(), loadBuffer(key, url)])
    .then(([context, buffer]) => {
      if (!context || !buffer || !audio.desiredLoops.has(key) || !audio.enabled || audio.volume <= 0 || document.hidden) return false;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(audio.seMasterGain);
      source.onended = () => {
        if (audio.loopSources.get(key) === source) audio.loopSources.delete(key);
      };
      audio.loopSources.set(key, source);
      source.start(0);
      return true;
    })
    .catch(error => {
      warnAudio(`Loop SE could not be played: ${key}`, error);
      return false;
    })
    .finally(() => {
      if (audio.loopRequests.get(key) === request) audio.loopRequests.delete(key);
    });
  audio.loopRequests.set(key, request);
  return request;
}

function stopLoopSource(key) {
  const source = audio.loopSources.get(key);
  if (!source) return;
  audio.loopSources.delete(key);
  source.onended = null;
  try { source.stop(0); } catch (_error) {}
  try { source.disconnect(); } catch (_error) {}
}

function ensureAudioGraph() {
  if (audio.context) return audio.context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn("Web Audio API is unavailable; sound effects are disabled.");
    return null;
  }
  try {
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = audio.volume;
    gain.connect(context.destination);
    const bgmGain = context.createGain();
    bgmGain.gain.value = audio.bgmVolume;
    bgmGain.connect(context.destination);
    audio.context = context;
    audio.seMasterGain = gain;
    audio.bgmMasterGain = bgmGain;
    return context;
  } catch (error) {
    warnAudio("Web Audio API initialization failed; sound effects are disabled.", error);
    return null;
  }
}

async function resumeAudioContext() {
  const context = ensureAudioGraph();
  if (!context) return null;
  applySeGain();
  applyBgmGain();
  if (context.state === "suspended") {
    try { await context.resume(); }
    catch (error) { warnAudio("AudioContext resume failed.", error); }
  }
  return context;
}

function applySeGain() {
  if (!audio.seMasterGain) return;
  const value = audio.enabled ? audio.volume : 0;
  try { audio.seMasterGain.gain.setValueAtTime(value, audio.context?.currentTime || 0); }
  catch (_error) { audio.seMasterGain.gain.value = value; }
}

function applyBgmGain() {
  if (!audio.bgmMasterGain) return;
  const value = audio.bgmEnabled ? audio.bgmVolume : 0;
  try { audio.bgmMasterGain.gain.setValueAtTime(value, audio.context?.currentTime || 0); }
  catch (_error) { audio.bgmMasterGain.gain.value = value; }
}

function loadBuffer(key, url) {
  if (audio.buffers.has(key)) return Promise.resolve(audio.buffers.get(key));
  if (audio.bufferRequests.has(key)) return audio.bufferRequests.get(key);
  const request = (async () => {
    const context = ensureAudioGraph();
    if (!context) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const buffer = await decodeAudioData(context, await response.arrayBuffer());
    audio.buffers.set(key, buffer);
    return buffer;
  })().catch(error => {
    warnAudio(`Audio file could not be loaded: ${url}`, error);
    return null;
  }).finally(() => audio.bufferRequests.delete(key));
  audio.bufferRequests.set(key, request);
  return request;
}

function decodeAudioData(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const succeed = buffer => { if (!settled) { settled = true; resolve(buffer); } };
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    try {
      const result = context.decodeAudioData(arrayBuffer, succeed, fail);
      if (result?.then) result.then(succeed, fail);
    } catch (error) { fail(error); }
  });
}

function startSource(key, buffer, priority, onFinish = null) {
  if (!audio.context || !audio.seMasterGain) return false;
  try {
    const source = audio.context.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.seMasterGain);
    const active = { key, priority, onFinish, stopped: false };
    audio.activeSources.set(source, active);
    source.onended = () => finishSource(source, !active.stopped);
    source.start(0);
    return true;
  } catch (error) {
    warnAudio(`SE source could not be started: ${key}`, error);
    return false;
  }
}

function startSourceToEnd(key, buffer, priority) {
  return new Promise(resolve => {
    if (!startSource(key, buffer, priority, resolve)) resolve(false);
  });
}

function finishSource(source, completed) {
  const active = audio.activeSources.get(source);
  if (!active) return;
  audio.activeSources.delete(source);
  source.onended = null;
  try { source.disconnect(); } catch (_error) {}
  active.onFinish?.(completed);
}

function stopSource(source) {
  const active = audio.activeSources.get(source);
  if (!active) return;
  active.stopped = true;
  try { source.stop(0); } catch (_error) {}
  finishSource(source, false);
}

function getActiveSources(key) {
  return [...audio.activeSources.entries()]
    .filter(([, active]) => active.key === key)
    .map(([source]) => source);
}

function reservePlaybackSlot(priority) {
  if (audio.activeSources.size + audio.pendingRequests.size < MAX_CONCURRENT_SE) return true;
  const lowerActive = [...audio.activeSources.entries()]
    .filter(([, active]) => active.priority < priority)
    .sort((a, b) => a[1].priority - b[1].priority)[0];
  const lowerPending = [...audio.pendingRequests.entries()]
    .filter(([, pending]) => pending.priority < priority)
    .sort((a, b) => a[1].priority - b[1].priority)[0];
  if (!lowerActive && !lowerPending) return false;
  if (lowerPending && (!lowerActive || lowerPending[1].priority <= lowerActive[1].priority)) {
    cancelPendingRequest(lowerPending[0]);
  } else {
    stopSource(lowerActive[0]);
  }
  return true;
}

function cancelPendingRequest(key) {
  const pending = audio.pendingRequests.get(key);
  if (!pending) return;
  audio.requestIds.set(key, pending.requestId + 1);
  audio.pendingRequests.delete(key);
}

function isCurrentRequest(key, requestId) {
  return audio.requestIds.get(key) === requestId && audio.pendingRequests.get(key)?.requestId === requestId;
}

function clearPendingRequest(key, requestId) {
  if (audio.pendingRequests.get(key)?.requestId === requestId) audio.pendingRequests.delete(key);
}

function warnAudio(message, error) {
  console.warn(message, error || "");
}

function isTouchLayout() {
  return document.body.classList.contains("layout-mobile") || document.body.classList.contains("layout-tablet");
}
