export const CHARACTER_NAME_MAX_LENGTH = 12;
export const CHARACTER_RENAME_COST = 10000;

export function normalizeCharacterName(value) {
  return String(value ?? "").trim().slice(0, CHARACTER_NAME_MAX_LENGTH);
}

export function renameCharacter(character, value, cost = CHARACTER_RENAME_COST) {
  const name = normalizeCharacterName(value);
  if (!character) return { accepted: false, reason: "noCharacter", character, name };
  if (!name) return { accepted: false, reason: "emptyName", character, name };
  const fee = Math.max(0, Math.floor(Number(cost) || 0));
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < fee) return { accepted: false, reason: "insufficientGold", character, name };
  return {
    accepted: true,
    reason: "",
    name,
    cost: fee,
    character: { ...character, name, gold: gold - fee }
  };
}
