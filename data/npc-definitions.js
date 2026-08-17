export const NPC_SUPPORT_ENABLED = true;
export const NPC_PARTY_LIMIT = 3;

export const NPC_DEFINITIONS = Object.freeze([
  npc("alec", "アレク", "warrior", "戦士", "戦", "images/npc/NPC_adventurer_01.avif", "攻撃後の追撃と防御時の援護", { atk: 12, def: 9 }),
  npc("rebecca", "レベッカ", "thief", "盗賊", "盗", "images/npc/NPC_adventurer_04.avif", "ターン開始時の二連撃と防御力低下", { atk: 8, dex: 12 }),
  npc("erika", "エリカ", "priest", "僧侶", "僧", "images/npc/NPC_adventurer_02.avif", "ターン終了時の祈りによる回復", { int: 10 }),
  npc("johan", "ヨハン", "mage", "魔術師", "魔", "images/npc/NPC_adventurer_03.avif", "ターン開始時の無属性攻撃呪文", { int: 13 })
]);

function npc(id, name, job, jobLabel, jobShort, image, supportDescription, baseStats) {
  return Object.freeze({ id, name, job, jobLabel, jobShort, image, supportDescription, registrationFee: 0, baseStats: Object.freeze(baseStats) });
}

export function getNpcDefinition(id) {
  return NPC_DEFINITIONS.find(npc => npc.id === id) || null;
}
