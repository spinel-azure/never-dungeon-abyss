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
    defensePenetration: 0,
    normalAttackStat: "int",
    normalAttackIgnoresDefense: true
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
    element: "physical"
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
    buyPrice: 100, sellPrice: 50
  }),
  poison_dagger: Object.freeze({
    id: "poison_dagger", name: "ポイズンダガー", type: "dagger", attack: 6,
    element: "physical", allowedJobs: Object.freeze(["thief"]), poisonChance: 0.15,
    effects: Object.freeze([Object.freeze({ statusId: "poison", trigger: "firstHitOnly", statusKind: "physical", baseRate: 0.15 })]),
    buyPrice: 100, sellPrice: 50
  }),
  morgenstern: Object.freeze({
    id: "morgenstern", name: "モルゲンシュテルン", type: "blunt", attack: 8,
    element: "physical", allowedJobs: Object.freeze(["priest"]), buyPrice: 100, sellPrice: 50
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
  return penetration == null ? weapon : { ...weapon, defensePenetration: penetration };
}

export function getWeaponType(id) {
  return Object.values(WEAPON_TYPES).find(type => type.id === id) || WEAPON_TYPES.LONGSWORD;
}
