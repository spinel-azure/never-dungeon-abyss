// Debounce ordinary updates, but save at a settled boundary after prolonged input.
// Explicit saves (rewards, manual saves, pagehide) bypass this scheduler.
export function createAutosaveScheduler({
  save, isBusy, now = () => performance.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = timer => clearTimeout(timer),
  quietMs = 250, maxWaitMs = 5000, retryMs = 50
}) {
  let timer = null;
  let firstRequestAt = null;
  let generation = 0;
  function cancel() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    firstRequestAt = null;
    generation++;
  }
  function flush() {
    if (firstRequestAt === null) return;
    if (isBusy()) { arm(retryMs); return; }
    cancel();
    save();
  }
  function arm(delay) {
    if (timer !== null) clearTimer(timer);
    const request = ++generation;
    timer = setTimer(() => {
      if (request !== generation) return;
      timer = null;
      flush();
    }, delay);
  }
  function request() {
    const time = now();
    if (firstRequestAt === null) firstRequestAt = time;
    const remaining = maxWaitMs - (time - firstRequestAt);
    // The movement-complete notification reaches here before the next step starts.
    if (remaining <= 0 && !isBusy()) { flush(); return; }
    arm(remaining <= 0 ? retryMs : Math.min(quietMs, remaining));
  }
  return { request, cancel };
}
