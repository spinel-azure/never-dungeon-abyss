export function getRestoredTreasureType(savedCell, {
  depth = 1,
  blackChestsUnlocked = false,
  specialRoomHasFixedContent = false
} = {}) {
  const treasure = savedCell?.treasure || null;
  if (!treasure) return null;

  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  if (floor <= 4) return treasure === "purple" ? treasure : "red";
  if (savedCell.eventTreasureId) return treasure;
  if (treasure === "red") return treasure;
  if (["black", "gold"].includes(treasure) && blackChestsUnlocked) return treasure;
  if (treasure === "purple" && savedCell.specialRoom && !specialRoomHasFixedContent) return treasure;
  return null;
}
