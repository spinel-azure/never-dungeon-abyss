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
  crystal_cracked: Object.freeze({ id: "crystal_cracked", name: "ひび割れ", kind: "debuff", duration: 3, defenseMultiplier: 0.7 }),
  resonance_collapse: Object.freeze({ id: "resonance_collapse", name: "共鳴崩壊", kind: "debuff", duration: 2, defenseMultiplier: 0.45 }),
  crystal_defense: Object.freeze({ id: "crystal_defense", name: "結晶防御", kind: "buff", duration: 2, defenseMultiplier: 1.25 }),
  crystal_accuracy_down: Object.freeze({ id: "crystal_accuracy_down", name: "命中低下", kind: "debuff", duration: 3, physicalHitPenalty: 0.2, physicalHitRateFloor: 0.35 }),
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
  electrified: Object.freeze({
    id: "electrified",
    name: "感電",
    kind: "ailment",
    actionSkips: 1,
    expiresAfterBattle: true
  }),
  guardian_prayer: Object.freeze({
    id: "guardian_prayer",
    name: "守護",
    kind: "buff",
    defenseBonus: 5,
    expiresAfterBattle: true
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
  }),
  charge_defense_down_15: Object.freeze({
    id: "charge_defense_down_15", name: "DEF低下", kind: "debuff", duration: 5,
    defenseMultiplier: 0.85
  }),
  charge_defense_down_25: Object.freeze({
    id: "charge_defense_down_25", name: "DEF低下", kind: "debuff", duration: 5,
    defenseMultiplier: 0.75
  }),
  charge_blindness: Object.freeze({
    id: "charge_blindness", name: "命中低下", kind: "debuff", duration: 5,
    physicalHitPenalty: 0.5, physicalHitRateFloor: 0.05
  }),
  deadly_poison: Object.freeze({
    id: "deadly_poison", name: "猛毒", kind: "ailment",
    damageMaxHpRate: 0.05, minimumDamage: 1
  }),
  death_poison: Object.freeze({
    id: "death_poison", name: "死毒", kind: "ailment",
    damageMaxHpRate: 0.1, minimumDamage: 1, expiresAfterBattle: true
  }),
  charge_budding: Object.freeze({
    id: "charge_budding", name: "新緑の芽吹き", kind: "buff", duration: 5,
    turnEndHealMaxHpRate: 0.05
  }),
  charge_green_healing_guard: Object.freeze({
    id: "charge_green_healing_guard", name: "新緑の守り", kind: "buff", duration: 5,
    physicalDamageReduction: 0.25
  }),
  charge_mana_spring: Object.freeze({
    id: "charge_mana_spring", name: "マナの泉", kind: "buff", duration: 5
  }),
  charge_mana_amplification: Object.freeze({
    id: "charge_mana_amplification", name: "マナ増幅", kind: "buff",
    attackSpellDamageMultiplier: 1.5, expiresAfterBattle: true
  }),
  charge_ultimate_used: Object.freeze({
    id: "charge_ultimate_used", name: "奥義使用済み", kind: "system",
    expiresAfterBattle: true
  })
});

export function getStatusEffect(id) {
  return STATUS_EFFECTS[id] || null;
}
