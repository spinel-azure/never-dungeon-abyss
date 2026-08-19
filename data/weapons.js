export const WEAPON_TYPES = Object.freeze({
  LONGSWORD: Object.freeze({
    id: "longsword",
    hitCount: 1,
    powerPerHit: 1,
    speedModifier: 0,
    defensePenetration: 0
  }),
  DAGGER: Object.freeze({
    id: "dagger",
    hitCount: 2,
    powerPerHit: 0.6,
    speedModifier: 5,
    defensePenetration: 0,
    damageDexMultiplier: 0.25
  }),
  FIVE_HIT_DAGGER: Object.freeze({
    id: "five_hit_dagger",
    hitCount: 5,
    powerPerHit: 0.25,
    speedModifier: 5,
    defensePenetration: 0,
    damageDexMultiplier: 0.25
  }),
  DUAL_BLADE: Object.freeze({
    id: "dual_blade",
    hitCount: 2,
    powerPerHit: 0.65,
    speedModifier: 0,
    defensePenetration: 0,
    shieldAllowed: false
  }),
  GREATSWORD: Object.freeze({
    id: "greatsword",
    hitCount: 1,
    powerPerHit: 1.5,
    speedModifier: -8,
    defensePenetration: 0,
    shieldAllowed: false
  }),
  BLUNT: Object.freeze({
    id: "blunt",
    hitCount: 1,
    powerPerHit: 1,
    speedModifier: 0,
    defensePenetration: 0.25
  }),
  STAFF: Object.freeze({
    id: "staff",
    hitCount: 1,
    powerPerHit: 1,
    speedModifier: 0,
    defensePenetration: 0
  })
});

export const WEAPONS = Object.freeze({
  iron_longsword: Object.freeze({
    id: "iron_longsword",
    name: "鉄の長剣",
    type: "longsword",
    attack: 8,
    element: "physical"
  }),
  iron_dagger: Object.freeze({
    id: "iron_dagger",
    name: "鉄の短剣",
    type: "dagger",
    attack: 5,
    element: "physical"
  }),
  iron_mace: Object.freeze({
    id: "iron_mace",
    name: "鉄のメイス",
    type: "blunt",
    attack: 6,
    element: "physical"
  }),
  oak_staff: Object.freeze({
    id: "oak_staff",
    name: "樫の杖",
    type: "staff",
    attack: 3,
    element: "physical",
    normalAttackStat: "int",
    normalAttackStatMultiplier: 0.75,
    normalAttackIgnoresDefense: true
  }),
  salamander_staff: Object.freeze({
    id: "salamander_staff", name: "火蜥蜴の杖", type: "staff", attack: 3,
    attackByEnhancement: Object.freeze([3, 3, 3, 3]),
    statBonuses: Object.freeze({ int: 1, fireSpellDamageBonus: 0.15, iceDamageTakenBonus: 0.1 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ int: 1, fireSpellDamageBonus: 0.15, iceDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 2, fireSpellDamageBonus: 0.15, iceDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 3, fireSpellDamageBonus: 0.15, iceDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 4, fireSpellDamageBonus: 0.15, iceDamageTakenBonus: 0.1 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["mage"]), twoHanded: true, sellPrice: 600
  }),
  ice_lizard_staff: Object.freeze({
    id: "ice_lizard_staff", name: "氷蜥蜴の杖", type: "staff", attack: 3,
    attackByEnhancement: Object.freeze([3, 3, 3, 3]),
    statBonuses: Object.freeze({ int: 1, iceSpellDamageBonus: 0.15, fireDamageTakenBonus: 0.1 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ int: 1, iceSpellDamageBonus: 0.15, fireDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 2, iceSpellDamageBonus: 0.15, fireDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 3, iceSpellDamageBonus: 0.15, fireDamageTakenBonus: 0.1 }),
      Object.freeze({ int: 4, iceSpellDamageBonus: 0.15, fireDamageTakenBonus: 0.1 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["mage"]), twoHanded: true, sellPrice: 600
  }),
  training_greatsword: Object.freeze({
    id: "training_greatsword",
    name: "訓練用の両手剣",
    type: "greatsword",
    attack: 10,
    element: "physical"
  }),
  iron_greatsword: Object.freeze({
    id: "iron_greatsword", name: "鉄の両手剣", type: "greatsword", attack: 12,
    element: "physical", allowedJobs: Object.freeze(["warrior"]), twoHanded: true,
    buyPrice: 100, sellPrice: 50, shopUnlockDepth: 1
  }),
  poison_dagger: Object.freeze({
    id: "poison_dagger", name: "ポイズンダガー", type: "dagger", attack: 6,
    element: "physical", allowedJobs: Object.freeze(["thief"]), poisonChance: 0.15,
    effects: Object.freeze([Object.freeze({ statusId: "poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.15 })]),
    buyPrice: 100, sellPrice: 50, shopUnlockDepth: 1
  }),
  morgenstern: Object.freeze({
    id: "morgenstern", name: "モルゲンシュテルン", type: "blunt", attack: 8,
    element: "physical", allowedJobs: Object.freeze(["priest"]), buyPrice: 100, sellPrice: 50, shopUnlockDepth: 1
  }),
  steel_longsword: Object.freeze({
    id: "steel_longsword", name: "鋼の長剣", type: "longsword", attack: 11,
    attackByEnhancement: Object.freeze([11, 12, 13, 14]),
    statBonuses: Object.freeze({}),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({}), Object.freeze({}), Object.freeze({ str: 1 }), Object.freeze({ str: 2 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["warrior"]),
    buyPrice: 1200, sellPrice: 600, shopUnlockDepth: 10,
    shopRequiredFlags: Object.freeze(["transfer_portal_b10f_unlocked", "boss_strange_knight_statue_b9f_defeated"])
  }),
  baselard: Object.freeze({
    id: "baselard", name: "バゼラード", type: "dagger", attack: 8,
    attackByEnhancement: Object.freeze([8, 9, 9, 10]),
    statBonuses: Object.freeze({ dex: 2 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ dex: 2 }), Object.freeze({ dex: 2 }), Object.freeze({ dex: 3 }), Object.freeze({ dex: 4 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["thief"]),
    buyPrice: 1200, sellPrice: 600, shopUnlockDepth: 10,
    shopRequiredFlags: Object.freeze(["transfer_portal_b10f_unlocked", "boss_strange_knight_statue_b9f_defeated"])
  }),
  silver_flail: Object.freeze({
    id: "silver_flail", name: "銀のフレイル", type: "blunt", attack: 10,
    attackByEnhancement: Object.freeze([10, 11, 11, 12]),
    statBonuses: Object.freeze({ luc: 1 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ luc: 1 }), Object.freeze({ luc: 1 }), Object.freeze({ luc: 2 }), Object.freeze({ luc: 3 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["priest"]),
    buyPrice: 1200, sellPrice: 600, shopUnlockDepth: 10,
    shopRequiredFlags: Object.freeze(["transfer_portal_b10f_unlocked", "boss_strange_knight_statue_b9f_defeated"])
  }),
  blacksteel_longsword: Object.freeze({
    id: "blacksteel_longsword", name: "黒鋼の長剣", type: "longsword", attack: 17,
    attackByEnhancement: Object.freeze([17, 18, 19, 21]),
    statBonuses: Object.freeze({ str: 4 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ str: 4 }), Object.freeze({ str: 4 }), Object.freeze({ str: 5 }), Object.freeze({ str: 6 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["warrior"]), sellPrice: 3000,
    sellPriceByEnhancement: Object.freeze([3000, 3600, 4500, 6000])
  }),
  abyss_fang: Object.freeze({
    id: "abyss_fang", name: "奈落の牙", type: "dagger", attack: 12,
    attackByEnhancement: Object.freeze([12, 13, 14, 15]),
    statBonuses: Object.freeze({ dex: 4 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ dex: 4 }), Object.freeze({ dex: 4 }), Object.freeze({ dex: 5 }), Object.freeze({ dex: 6 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["thief"]), sellPrice: 3000,
    sellPriceByEnhancement: Object.freeze([3000, 3600, 4500, 6000])
  }),
  sacred_tree_mace: Object.freeze({
    id: "sacred_tree_mace", name: "聖樹のメイス", type: "blunt", attack: 15,
    attackByEnhancement: Object.freeze([15, 16, 17, 19]),
    statBonuses: Object.freeze({ luc: 3 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ luc: 3 }), Object.freeze({ luc: 3 }), Object.freeze({ luc: 4 }), Object.freeze({ luc: 5 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["priest"]), sellPrice: 3000,
    sellPriceByEnhancement: Object.freeze([3000, 3600, 4500, 6000])
  }),
  ancient_tree_staff: Object.freeze({
    id: "ancient_tree_staff", name: "古樹の杖", type: "staff", attack: 5,
    attackByEnhancement: Object.freeze([5, 5, 5, 5]),
    statBonuses: Object.freeze({ int: 8 }),
    statBonusesByEnhancement: Object.freeze([
      Object.freeze({ int: 8 }), Object.freeze({ int: 9 }), Object.freeze({ int: 10 }), Object.freeze({ int: 11 })
    ]),
    element: "physical", allowedJobs: Object.freeze(["mage"]), twoHanded: true, sellPrice: 3000,
    sellPriceByEnhancement: Object.freeze([3000, 3600, 4500, 6000])
  }),
  stiletto: Object.freeze({
    id: "stiletto", name: "スティレット", type: "dagger", attack: 7,
    element: "physical", allowedJobs: Object.freeze(["thief"]), sellPrice: 75,
    penetrationByEnhancement: Object.freeze([0.2, 0.25, 0.3, 0.35])
  }),
  vorpal_sword: Object.freeze({
    id: "vorpal_sword", name: "ヴォーパル・スウォード", type: "longsword", attack: 1,
    element: "physical", sellPrice: 5000, buybackPrice: 10000,
    hiddenBossSlayerIds: Object.freeze(["jabberwock_event_boss"])
  }),
  the_five_star: Object.freeze({
    id: "the_five_star", name: "ザ・ファイブスター", type: "five_hit_dagger", attack: 1,
    element: "physical", allowedJobs: Object.freeze(["thief"]), sellPrice: 0
  }),
  musashi_blade: Object.freeze({
    id: "musashi_blade", name: "ムサシブレード", type: "dual_blade", attack: 15,
    element: "physical", allowedJobs: Object.freeze(["warrior"]), twoHanded: true, sellPrice: 0
  }),
  glacies_hammer: Object.freeze({
    id: "glacies_hammer", name: "グラキエスハンマー", type: "blunt", attack: 24,
    element: "ice", allowedJobs: Object.freeze(["warrior"]), twoHanded: true,
    statBonuses: Object.freeze({ str: 4 }),
    sellPrice: 6000, buybackPrice: 12000
  })
});

export function getWeapon(id, enhancement = 0) {
  const weapon = WEAPONS[id] || WEAPONS.iron_longsword;
  const level = Math.max(0, Math.min(3, Math.floor(Number(enhancement) || 0)));
  const penetration = weapon.penetrationByEnhancement?.[level];
  const attack = weapon.attackByEnhancement?.[level];
  const statBonuses = weapon.statBonusesByEnhancement?.[level];
  if (penetration == null && attack == null && statBonuses == null) return weapon;
  return {
    ...weapon,
    ...(penetration == null ? {} : { defensePenetration: penetration }),
    ...(attack == null ? {} : { attack }),
    ...(statBonuses == null ? {} : { statBonuses })
  };
}

export function getWeaponType(id) {
  return Object.values(WEAPON_TYPES).find(type => type.id === id) || WEAPON_TYPES.LONGSWORD;
}
