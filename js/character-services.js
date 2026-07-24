export function createInnRecovery(character) {
  return {
    hp: character.maxHp,
    sp: character.maxSp,
    statuses: [],
    condition: "GOOD",
    alive: true
  };
}

export function createTempleRevival(character) {
  return {
    hp: 1,
    sp: character.sp,
    statuses: [],
    condition: "GOOD",
    alive: true
  };
}
