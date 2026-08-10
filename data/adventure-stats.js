export const PLAY_TIME_ERA = "mvp";

export function normalizeAdventureStats(stats) {
  const storedEra = typeof stats?.playTimeEra === "string" ? stats.playTimeEra : "mvp";
  return {
    playTimeSeconds: storedEra === PLAY_TIME_ERA
      ? Math.max(0, Math.floor(Number(stats?.playTimeSeconds) || 0))
      : 0,
    playTimeEra: PLAY_TIME_ERA
  };
}

export function formatPlayTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${String(hours).padStart(4, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function getActivePlayTimeDelta({ elapsedMs, hasCharacter, visible, idleMs, idleLimitMs }) {
  if (!hasCharacter || !visible || idleMs > idleLimitMs) return 0;
  return Math.max(0, Number(elapsedMs) || 0) / 1000;
}
