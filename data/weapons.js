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
    defensePenetration: 0
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
    element: "physical"
  }),
  training_greatsword: Object.freeze({
    id: "training_greatsword",
    name: "訓練用の両手剣",
    type: "greatsword",
    attack: 10,
    element: "physical"
  })
});

export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS.iron_longsword;
}

export function getWeaponType(id) {
  return Object.values(WEAPON_TYPES).find(type => type.id === id) || WEAPON_TYPES.LONGSWORD;
}
