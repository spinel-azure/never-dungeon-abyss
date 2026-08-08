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
  stiletto: Object.freeze({
    id: "stiletto", name: "スティレット", type: "dagger", attack: 7,
    element: "physical", allowedJobs: Object.freeze(["thief"]), sellPrice: 75,
    penetrationByEnhancement: Object.freeze([0.2, 0.25, 0.3, 0.35])
  }),
  vorpal_sword: Object.freeze({
    id: "vorpal_sword", name: "ヴォーパル・スウォード", type: "longsword", attack: 1,
    element: "physical", sellPrice: 5000, buybackPrice: 10000,
    hiddenBossSlayerIds: Object.freeze(["jabberwock_event_boss"])
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
