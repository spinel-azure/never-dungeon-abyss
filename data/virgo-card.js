import { hasCardEffect } from "./cards.js";

export function applyVirgoFloorRecovery(character) {
  if (!character || !hasCardEffect(character.cards?.deckSlots, "zodiac_virgo")) {
    return { character, hpRecovered: 0, spRecovered: 0 };
  }
  const hpBefore = Math.max(0, Math.floor(Number(character.hp) || 0));
  const spBefore = Math.max(0, Math.floor(Number(character.sp) || 0));
  const hpRecovery = Math.ceil(Math.max(1, Number(character.maxHp) || 1) * 0.1);
  const spRecovery = Math.ceil(Math.max(0, Number(character.maxSp) || 0) * 0.1);
  const hp = Math.min(character.maxHp, hpBefore + hpRecovery);
  const sp = Math.min(character.maxSp, spBefore + spRecovery);
  return {
    character: { ...character, hp, sp },
    hpRecovered: Math.max(0, hp - hpBefore),
    spRecovered: Math.max(0, sp - spBefore)
  };
}
