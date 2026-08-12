export const STATUS_EFFECTS = Object.freeze({
  magic_wall: Object.freeze({
    id: "magic_wall",
    name: "魔力の壁",
    kind: "buff",
    barrierDamageThreshold: 7,
    barrierCharges: 3,
    expiresAfterBattle: true
  }),
  armor_break: Object.freeze({
    id: "armor_break",
    name: "DEF低下",
    kind: "debuff",
    duration: 3,
    defenseMultiplier: 0.75
  }),
  unyielding_stance: Object.freeze({
    id: "unyielding_stance",
    name: "不屈",
    kind: "buff",
    duration: 2,
    physicalDamageReduction: 0.5
  }),
  immovable_stance: Object.freeze({
    id: "immovable_stance", name: "不動", kind: "buff", duration: 2,
    physicalDamageReduction: 0.4, statusResistancePointsById: Object.freeze({ action_skip: 50 })
  }),
  action_seal: Object.freeze({
    id: "action_seal", name: "封技", kind: "debuff", duration: 3, bossDuration: 1
  }),
  magic_focus: Object.freeze({
    id: "magic_focus", name: "魔力集中", kind: "buff", attackSpellDamageMultiplier: 1.5,
    expiresAfterBattle: true
  }),
  poison: Object.freeze({
    id: "poison",
    name: "毒",
    kind: "ailment",
    damageMaxHpRate: 0.05,
    minimumDamage: 1
  }),
  bleeding: Object.freeze({
    id: "bleeding", name: "出血", kind: "ailment",
    damageMaxHpRate: 0.05, minimumDamage: 1
  }),
  action_skip: Object.freeze({
    id: "action_skip",
    name: "行動不能",
    kind: "ailment",
    actionSkips: 1
  }),
  guardian_prayer: Object.freeze({
    id: "guardian_prayer",
    name: "守護",
    kind: "buff",
    duration: 3,
    physicalDamageReduction: 0.3,
    statusResistancePoints: 20
  }),
  illusion: Object.freeze({
    id: "illusion",
    name: "幻影",
    kind: "buff",
    duration: 3,
    physicalHitPenalty: 0.2,
    physicalHitRateFloor: 0.5
  }),
  speed_down: Object.freeze({
    id: "speed_down",
    name: "速度低下",
    kind: "debuff",
    duration: 3,
    speedModifier: -20
  }),
  guard: Object.freeze({
    id: "guard",
    name: "防御",
    kind: "buff",
    duration: 1,
    physicalDamageReduction: 0.5
  })
});

export function getStatusEffect(id) {
  return STATUS_EFFECTS[id] || null;
}
