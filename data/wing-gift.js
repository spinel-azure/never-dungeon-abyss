export function wingGiftUses(character) { return Math.max(0, Math.min(4, Math.floor(Number(character?.wingGiftUses) || 0))); }
export function wingGiftMaxHp(base, uses) { return Math.max(1, Math.floor(base * (5 - uses) / 5)); }
export function applyWingGift(character) {
 const uses=wingGiftUses(character);
 const base=Number(character.wingGiftBaseMaxHp) || character.maxHp;
 character.wingGiftBaseMaxHp=base;
 character.wingGiftUses=uses+1;
 character.maxHp=wingGiftMaxHp(base,uses+1);
 character.hp=Math.min(character.hp,character.maxHp);
}
