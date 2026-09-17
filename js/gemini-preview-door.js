// Temporary public-build entrance for the unfinished Gemini event.
const bumps = new WeakMap();
export function inspectGeminiPreviewDoor(room, bumped = false) {
  if (room?.content?.type !== 'geminiPreview') return null;
  const count = Math.min(20, (bumps.get(room) || 0) + (bumped ? 1 : 0));
  bumps.set(room, count);
  return { unlocked: count >= 20, message: room.content.accessBlockedMessage };
}
