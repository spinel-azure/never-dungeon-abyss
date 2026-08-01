export function resolveDefeatRecovery({
  character,
  battle = null,
  recoveryResolvers = []
} = {}) {
  const original = character && typeof character === "object" ? character : null;
  if (!original || (original.hp > 0 && original.alive !== false)) {
    return { recovered: Boolean(original), character: original, sourceId: null };
  }
  for (const resolver of recoveryResolvers) {
    if (typeof resolver !== "function") continue;
    const result = resolver({ character: original, battle });
    const recoveredCharacter = result?.character;
    if (recoveredCharacter?.hp > 0 && recoveredCharacter.alive !== false) {
      return {
        recovered: true,
        character: recoveredCharacter,
        sourceId: result.sourceId || null
      };
    }
  }
  return { recovered: false, character: original, sourceId: null };
}
