export function createRenderDebugMonitor(panel, enabled = false) {
  const state = {
    enabled: Boolean(enabled && panel),
    frameTimes: [],
    lastPanelUpdate: 0,
  };

  if (panel) panel.hidden = !state.enabled;

  function recordFrame(timestamp, drawTime, mode, cacheStats) {
    if (!state.enabled) return;
    state.frameTimes.push(timestamp);
    while (state.frameTimes.length && timestamp - state.frameTimes[0] > 1000) {
      state.frameTimes.shift();
    }
    if (timestamp - state.lastPanelUpdate < 250) return;
    state.lastPanelUpdate = timestamp;

    panel.textContent = [
      `MODE  ${mode.toUpperCase()}`,
      `FPS   ${state.frameTimes.length}`,
      `DRAW  ${drawTime.toFixed(2)} ms`,
      `ICON  ${cacheStats.icons.entries}/${cacheStats.icons.maximumEntries}`,
      `       H${cacheStats.icons.hits} M${cacheStats.icons.misses}`,
      `CARD  ${cacheStats.cards.entries}/${cacheStats.cards.maximumEntries}`,
      `       H${cacheStats.cards.hits} M${cacheStats.cards.misses}`,
      "C KEY CLEAR CACHE",
    ].join("\n");
  }

  return Object.freeze({
    enabled: state.enabled,
    recordFrame,
  });
}
