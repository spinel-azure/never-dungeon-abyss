const DEFAULT_RING_DURATION_MS = 2600;
const DEFAULT_MESSAGE_DURATION_MS = 3000;
const DEFAULT_FADE_DURATION_MS = 420;

function waitFor(milliseconds, signal) {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    let timer = 0;
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve(false);
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve(true);
    }, Math.max(0, Number(milliseconds) || 0));
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

async function waitForPlaybackOrTimeout(play, timeoutMs, signal, onTimeout) {
  const timeoutController = new AbortController();
  const abortTimeout = () => timeoutController.abort();
  signal?.addEventListener("abort", abortTimeout, { once: true });
  const playback = Promise.resolve()
    .then(play)
    .catch(() => false)
    .finally(() => timeoutController.abort());
  const timeout = waitFor(timeoutMs, timeoutController.signal).then(completed => {
    if (completed) onTimeout?.();
    return false;
  });
  try {
    return await Promise.race([playback, timeout]);
  } finally {
    signal?.removeEventListener("abort", abortTimeout);
    timeoutController.abort();
  }
}

export function createPassiveNotificationCoordinator({
  canPresent = () => true,
  observeRoot = typeof document !== "undefined" ? document.body : null
} = {}) {
  const queuedIds = new Set();
  const queue = [];
  let active = null;
  let disposed = false;
  let pumpQueued = false;
  let generation = 0;

  const observer = typeof MutationObserver === "function" && observeRoot
    ? new MutationObserver(() => updateAvailability())
    : null;
  observer?.observe(observeRoot, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden"]
  });

  function schedulePump() {
    if (disposed || pumpQueued) return;
    pumpQueued = true;
    queueMicrotask(() => {
      pumpQueued = false;
      void pump();
    });
  }

  function enqueue(entry) {
    const id = String(entry?.id || "");
    if (!id || typeof entry?.play !== "function" || queuedIds.has(id) || active?.id === id) return false;
    queuedIds.add(id);
    queue.push({ ...entry, id });
    schedulePump();
    return true;
  }

  async function pump() {
    if (disposed || active || !queue.length || !canPresent()) return false;
    const entry = queue.shift();
    queuedIds.delete(entry.id);
    const controller = new AbortController();
    const sessionGeneration = generation;
    const session = { ...entry, controller, generation: sessionGeneration };
    active = session;
    let completed = false;
    try {
      completed = await entry.play({ signal: controller.signal }) !== false;
    } catch (error) {
      if (!controller.signal.aborted) console.warn("Passive notification failed.", error);
    } finally {
      if (active === session) active = null;
    }
    if (!disposed && generation === sessionGeneration && !completed && !queuedIds.has(entry.id)) {
      queuedIds.add(entry.id);
      queue.unshift(entry);
    }
    schedulePump();
    return completed;
  }

  function updateAvailability() {
    if (disposed) return;
    if (active && !canPresent()) active.controller.abort();
    schedulePump();
  }

  function reset() {
    generation += 1;
    active?.controller.abort();
    active = null;
    queuedIds.clear();
    queue.length = 0;
  }

  function dispose() {
    disposed = true;
    reset();
    observer?.disconnect();
  }

  return {
    enqueue,
    updateAvailability,
    reset,
    dispose,
    get activeChannel() { return active?.channel || ""; },
    get queuedCount() { return queue.length; }
  };
}

export function createPassiveBellNotificationController({
  root,
  bell,
  copy,
  detail,
  coordinator,
  getPending = () => [],
  markShown = () => {},
  save = () => {},
  playBell = () => Promise.resolve(false),
  stopBell = () => {},
  queueId = "passive-bell:new",
  channel = "passive-bell",
  getDetailText = pending => String(pending.length),
  ringDurationMs = DEFAULT_RING_DURATION_MS,
  messageDurationMs = DEFAULT_MESSAGE_DURATION_MS,
  fadeDurationMs = DEFAULT_FADE_DURATION_MS
} = {}) {
  let disposed = false;
  let generation = 0;

  function conceal() {
    stopBell();
    if (!root) return;
    root.classList.remove("is-ringing", "is-message", "is-fading");
    root.hidden = true;
    if (copy) copy.hidden = true;
  }

  async function play({ signal }) {
    if (disposed || !root || !bell || !copy || !detail) return true;
    const sessionGeneration = generation;
    const pending = [...new Map(
      (getPending() || []).filter(entry => entry?.notificationId).map(entry => [entry.notificationId, entry])
    ).values()];
    if (!pending.length) return true;
    const notificationIds = pending.map(entry => entry.notificationId);
    detail.textContent = getDetailText(pending);
    copy.hidden = true;
    root.hidden = false;
    root.classList.remove("is-message", "is-fading");
    root.classList.add("is-ringing");
    void bell.offsetWidth;

    const stopOnAbort = () => stopBell();
    signal.addEventListener("abort", stopOnAbort, { once: true });
    const [ringCompleted] = await Promise.all([
      waitFor(ringDurationMs, signal),
      waitForPlaybackOrTimeout(
        playBell,
        Math.max(ringDurationMs * 2, ringDurationMs + 1000),
        signal,
        stopBell
      )
    ]);
    signal.removeEventListener("abort", stopOnAbort);
    if (!ringCompleted || signal.aborted) {
      conceal();
      return false;
    }
    root.classList.remove("is-ringing");
    root.classList.add("is-message");
    copy.hidden = false;
    if (!await waitFor(messageDurationMs, signal)) {
      conceal();
      return false;
    }
    root.classList.add("is-fading");
    if (!await waitFor(fadeDurationMs, signal)) {
      conceal();
      return false;
    }
    markShown(notificationIds);
    save();
    conceal();
    queueMicrotask(() => queueMicrotask(() => {
      if (!disposed && generation === sessionGeneration) request();
    }));
    return true;
  }

  function request() {
    if (disposed || !(getPending() || []).length) return false;
    return coordinator?.enqueue({ id: queueId, channel, play }) || false;
  }

  function reset() {
    generation += 1;
    conceal();
  }

  function dispose() {
    disposed = true;
    generation += 1;
    conceal();
  }

  conceal();
  return { request, reset, dispose, isVisible: () => Boolean(root && !root.hidden) };
}

export function createRumorNotificationController(options = {}) {
  return createPassiveBellNotificationController({
    ...options,
    queueId: "rumor:new",
    channel: "rumor",
    getDetailText: pending => pending.length === 1
      ? "酒場で新しい噂が聞けます"
      : `酒場で新しい噂が${pending.length}件聞けます`
  });
}

export function createGuildQuestNotificationController(options = {}) {
  return createPassiveBellNotificationController({
    ...options,
    queueId: "quest:new",
    channel: "quest",
    getDetailText: () => "ギルド依頼が追加されました"
  });
}
