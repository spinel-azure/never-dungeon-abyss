// Keep the legacy content type compatible with existing generated floors.
export function inspectGeminiPreviewDoor(room) {
  return room?.content?.type === 'geminiPreview' ? {unlocked:true} : null;
}
