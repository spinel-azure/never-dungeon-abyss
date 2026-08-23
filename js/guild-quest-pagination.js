const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function getGuildQuestPageSize({ width = 1280, height = 720, layout = "desktop" } = {}) {
  const safeWidth = Number.isFinite(width) ? width : 1280;
  const safeHeight = Number.isFinite(height) ? height : 720;
  if (layout === "mobile") return safeHeight < 640 ? 3 : 4;
  if (layout === "tablet") return safeHeight < 720 ? 4 : 5;
  const heightBasedSize = safeHeight < 700 ? 4 : safeHeight < 850 ? 5 : 6;
  const widthBasedSize = safeWidth < 760 ? 4 : safeWidth < 1100 ? 5 : 6;
  return clamp(Math.min(heightBasedSize, widthBasedSize), 3, 6);
}
