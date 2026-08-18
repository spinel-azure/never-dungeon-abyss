import { SPELLS } from "./spells.js";

export const SKILLS = Object.freeze({
  magic_wall: Object.freeze({
    id: "magic_wall",
    name: "壁よ、守りを！",
    description: "魔力の壁を作り、弱い物理攻撃を3回まで無効化する。",
    actionType: "buff",
    category: "supportSpell",
    spCost: 3,
    target: "self",
    speedModifier: 15,
    preventWhileStatusActive: "magic_wall",
    effects: Object.freeze([{ statusId: "magic_wall", trigger: "perAction", guaranteed: true }])
  }),
  armor_break: Object.freeze({
    id: "armor_break",
    name: "鎧砕き",
    description: "威力90%の攻撃。命中時、敵のDEFを\n3ターンの間25%低下させる。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 4,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 0.9,
    effects: Object.freeze([{
      statusId: "armor_break",
      trigger: "firstHitOnly",
      guaranteed: true
    }])
  }),
  power_strike: Object.freeze({
    id: "power_strike",
    name: "強打",
    description: "行動速度－3。武器で\n威力140%の強力な一撃を放つ。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 5,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 1.4,
    speedModifier: -3,
    effects: Object.freeze([])
  }),
  unyielding_stance: Object.freeze({
    id: "unyielding_stance",
    name: "不屈の構え",
    description: "行動速度＋15。2ターンの間、\n受ける物理ダメージを50%軽減する。",
    actionType: "buff",
    category: "combatArt",
    spCost: 8,
    target: "self",
    speedModifier: 15,
    effects: Object.freeze([{ statusId: "unyielding_stance", trigger: "perAction", guaranteed: true }])
  }),
  quick_strike: Object.freeze({
    id: "quick_strike",
    name: "素早い一撃",
    description: "行動速度＋15。武器の攻撃回数で\n威力90%の素早い連撃を放つ。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 3,
    target: "enemy",
    hitCountMode: "weapon",
    powerPerHit: 0.9,
    speedModifier: 15,
    effects: Object.freeze([])
  }),
  poison_blade: Object.freeze({
    id: "poison_blade",
    name: "毒刃",
    description: "武器の攻撃回数で威力80%の攻撃。\n最初の命中時65%で毒（最大HP5%×3回）。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 5,
    target: "enemy",
    hitCountMode: "weapon",
    powerPerHit: 0.8,
    effects: Object.freeze([{
      statusId: "poison",
      trigger: "firstHitOnly",
      statusKind: "physical",
      baseRate: 0.65
    }])
  }),
  shadow_bind: Object.freeze({
    id: "shadow_bind",
    name: "影縫い",
    description: "威力60%の攻撃。命中時、55%で\n敵の次の行動を1回封じる。",
    actionType: "physicalAttack",
    category: "combatArt",
    spCost: 8,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 0.6,
    effects: Object.freeze([{
      statusId: "action_skip",
      trigger: "firstHitOnly",
      statusKind: "physical",
      baseRate: 0.55
    }])
  }),
  gale_blades: Object.freeze({
    id: "gale_blades", name: "疾風連刃",
    description: "行動速度＋15。武器の攻撃回数で\n威力180%の高速連撃を放つ。",
    actionType: "physicalAttack", category: "combatArt", spCost: 6, target: "enemy",
    hitCountMode: "weapon", powerPerHit: 1.8, speedModifier: 15, effects: Object.freeze([])
  }),
  art_sealing_stab: Object.freeze({
    id: "art_sealing_stab", name: "封技の一刺し",
    description: "威力90%の攻撃。命中時、敵の特殊行動を封じる。\n通常敵3ターン、ボス1ターン。",
    actionType: "physicalAttack", category: "combatArt", spCost: 10, target: "enemy",
    hitCount: 1, powerPerHit: 0.9, speedModifier: 5,
    effects: Object.freeze([{ statusId: "action_seal", trigger: "firstHitOnly", guaranteed: true }])
  }),
  crushing_break: Object.freeze({
    id: "crushing_break", name: "鎧砕き・改",
    description: "威力130%の攻撃。命中時、敵のDEFを\n3ターンの間25%低下させる。",
    actionType: "physicalAttack", category: "combatArt", spCost: 8, target: "enemy",
    hitCount: 1, powerPerHit: 1.3,
    effects: Object.freeze([{ statusId: "armor_break", trigger: "firstHitOnly", guaranteed: true }])
  }),
  immovable_stance: Object.freeze({
    id: "immovable_stance", name: "不動の構え",
    description: "2ターンの間、物理ダメージを40%軽減し、\n行動不能耐性を50上昇させる。",
    actionType: "buff", category: "combatArt", spCost: 10, target: "self", speedModifier: 10,
    effects: Object.freeze([{ statusId: "immovable_stance", trigger: "perAction", guaranteed: true }])
  }),
  greater_healing: Object.freeze({
    id: "greater_healing", name: "大治癒",
    description: "自分のHPを大きく回復する。\n回復量は35＋INT×1.0。",
    actionType: "healing", category: "miracle", spCost: 10, target: "self",
    baseHealing: 35, intelligenceMultiplier: 1, speedModifier: 0
  }),
  holy_light: Object.freeze({
    id: "holy_light", name: "聖光",
    description: "必中する聖属性攻撃。\nアンデッドには与えるダメージが1.5倍。",
    actionType: "spell", category: "miracle", spCost: 12, target: "enemy", element: "holy",
    spellPower: 22, powerMultiplier: 1, unavoidable: true, speedModifier: -3,
    raceDamageMultipliers: Object.freeze({ undead: 1.5 }), effects: Object.freeze([])
  }),
  lightning_bolt: Object.freeze({
    id: "lightning_bolt", name: "雷撃",
    description: "必中する雷属性攻撃。\n25%で敵の次の行動を1回封じる。",
    actionType: "spell", category: "attackSpell", spCost: 9, target: "enemy", element: "lightning",
    spellPower: 18, powerMultiplier: 1, unavoidable: true, speedModifier: -3,
    effects: Object.freeze([{ statusId: "action_skip", trigger: "perAction", statusKind: "magical", baseRate: 0.25 }])
  }),
  magic_focus: Object.freeze({
    id: "magic_focus", name: "魔力集中",
    description: "次に使う攻撃呪文の最終ダメージを\n1回だけ1.5倍にする。",
    actionType: "buff", category: "supportSpell", spCost: 8, target: "self", speedModifier: 10,
    preventWhileStatusActive: "magic_focus",
    effects: Object.freeze([{ statusId: "magic_focus", trigger: "perAction", guaranteed: true }])
  }),
  conceal_presence: Object.freeze({
    id: "conceal_presence",
    name: "気配消し",
    description: "帰還するまで気配ゲージの上昇量を50％軽減する。",
    actionType: "dungeonEffect",
    category: "combatArt",
    spCost: 10,
    target: "self",
    environmentEffect: "presenceIncreaseReduction",
    effectValue: 0.5,
    effects: Object.freeze([])
  }),
  holy_strike: Object.freeze({
    id: "holy_strike",
    name: "聖なる打撃",
    description: "敵のDEFを25%貫通する、\n威力100%の物理攻撃。",
    actionType: "physicalAttack",
    category: "miracle",
    spCost: 4,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 1,
    defensePenetration: 0.25,
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  healing_prayer: SPELLS.healing_prayer,
  guardian_prayer: Object.freeze({
    id: "guardian_prayer",
    name: "守護の祈り",
    description: "3ターンの間、物理ダメージを30%軽減し、\n状態異常耐性を20上昇させる。",
    actionType: "buff",
    category: "miracle",
    spCost: 8,
    target: "self",
    speedModifier: 0,
    effects: Object.freeze([{ statusId: "guardian_prayer", trigger: "perAction", guaranteed: true }])
  }),
  antidote: Object.freeze({
    id: "antidote",
    name: "アンチドート",
    description: "毒状態を回復する。\nHPは回復しない。",
    actionType: "cureStatus",
    category: "miracle",
    spCost: 3,
    target: "self",
    statusId: "poison",
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  hemostasis: Object.freeze({
    id: "hemostasis", name: "ヘモスタシス",
    description: "出血状態を回復する。\nHPは回復しない。",
    actionType: "cureStatus", category: "miracle", spCost: 3,
    target: "self", statusId: "bleeding", speedModifier: 0, effects: Object.freeze([])
  }),
  exorcism: Object.freeze({
    id: "exorcism",
    name: "エクソシズム",
    description: "通常のアンデッドを聖なる光で浄化する。\n経験値は得られず、ボスには無効。",
    actionType: "banishUndead",
    category: "miracle",
    spCost: 5,
    target: "enemy",
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  illusion: Object.freeze({
    id: "illusion",
    name: "幻影",
    description: "3ターンの間、敵の物理命中率を20%低下。\nただし命中率は50%未満にならない。",
    actionType: "buff",
    category: "supportSpell",
    spCost: 4,
    target: "self",
    speedModifier: -5,
    effects: Object.freeze([{ statusId: "illusion", trigger: "perAction", guaranteed: true }])
  }),
  staff_light: Object.freeze({
    id: "staff_light",
    name: "杖よ、灯りを！",
    description: "たいまつゲージを50％回復する。",
    actionType: "dungeonEffect",
    category: "supportSpell",
    spCost: 4,
    target: "self",
    environmentEffect: "restoreTorch",
    effectValue: 50,
    effects: Object.freeze([])
  }),
  wisdom_to_power: Object.freeze({
    id: "wisdom_to_power",
    name: "知恵よ、力を！",
    description: "通常攻撃時、INTをSTRに上乗せする。\n樫の杖装備時は発動しない。",
    actionType: "passive",
    category: "passive",
    spCost: 0,
    target: "self",
    effects: Object.freeze([])
  }),
  flash_slash: Object.freeze({
    id: "flash_slash",
    name: "一閃",
    description: "通常攻撃の命中ごとに即死判定。\nSTRが高く、AGIが低いほど成功率上昇。",
    actionType: "passive",
    category: "passive",
    spCost: 0,
    target: "self",
    effects: Object.freeze([])
  }),
  assassination: Object.freeze({
    id: "assassination",
    name: "暗殺術",
    description: "通常攻撃の命中ごとに即死判定。\nDEXが高く、STRが低いほど成功率上昇。",
    actionType: "passive",
    category: "passive",
    spCost: 0,
    target: "self",
    effects: Object.freeze([])
  }),
  survival_instinct: Object.freeze({
    id: "survival_instinct",
    name: "生存本能",
    description: "毒状態を回復するが、最大HPの50％分のダメージを受ける。HPは1未満にならない。",
    actionType: "sacrificialCure",
    category: "combatArt",
    spCost: 0,
    target: "self",
    statusId: "poison",
    damageRate: 0.5,
    effects: Object.freeze([])
  }),
  falcon_schnitt: Object.freeze({
    id: "falcon_schnitt", name: "ファルケン・シュニット",
    description: "チャージ100で発動。敵をV字に切り裂く\n威力150%の2連撃。一閃判定あり。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 2, powerPerHit: 1.5, chargeSkill: true, presentationId: "falcon_schnitt", passiveInstantDeathId: "flash_slash",
    effects: Object.freeze([])
  }),
  twin_rapid_strike: Object.freeze({
    id: "twin_rapid_strike", name: "双連撃",
    description: "チャージ100で発動。電光石火の\n威力90%・4連撃。暗殺術判定あり。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 4, powerPerHit: 0.9, chargeSkill: true, presentationId: "twin_rapid_strike", passiveInstantDeathId: "assassination",
    effects: Object.freeze([])
  }),
  twilight_flash: Object.freeze({
    id: "twilight_flash", name: "宵闇の一閃",
    description: "チャージ100で発動。敵のDEFを無視する\n氷属性2連撃。一撃ごとにINT×5。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 2, powerPerHit: 1, chargeSkill: true, presentationId: "twilight_flash", attackStat: "int",
    attackStatMultiplier: 5, ignoresDefense: true, ignoreWeaponAttack: true, element: "ice",
    effects: Object.freeze([])
  }),
  tunguska: Object.freeze({
    id: "tunguska", name: "ツングースカ",
    description: "チャージ100で発動。炎属性の大爆発を起こす。\n威力はINT×15。",
    actionType: "spell", category: "chargeSkill", spCost: 0, target: "enemy",
    element: "fire", spellPower: 0, intelligenceMultiplier: 15, powerMultiplier: 1,
    unavoidable: true, chargeSkill: true, presentationId: "tunguska", effects: Object.freeze([])
  }),
  fireball: SPELLS.fireball,
  ice_bind: SPELLS.ice_bind
});

export function getSkill(id) {
  return SKILLS[id] || null;
}

export function getSkills(ids = []) {
  return ids.map(getSkill).filter(Boolean);
}

export const LEVEL_SKILL_UNLOCKS = Object.freeze([
  Object.freeze({ job: "thief", level: 22, skillId: "gale_blades" }),
  Object.freeze({ job: "warrior", level: 24, skillId: "crushing_break" }),
  Object.freeze({ job: "priest", level: 24, skillId: "greater_healing" }),
  Object.freeze({ job: "mage", level: 24, skillId: "lightning_bolt" }),
  Object.freeze({ job: "thief", level: 32, skillId: "art_sealing_stab" }),
  Object.freeze({ job: "warrior", level: 34, skillId: "immovable_stance" }),
  Object.freeze({ job: "priest", level: 34, skillId: "holy_light" }),
  Object.freeze({ job: "mage", level: 34, skillId: "magic_focus" }),
  Object.freeze({ job: "mage", level: 4, skillId: "staff_light" }),
  Object.freeze({ job: "mage", level: 25, skillId: "wisdom_to_power" }),
  Object.freeze({ job: "warrior", level: 5, skillId: "survival_instinct" }),
  Object.freeze({ job: "warrior", level: 38, skillId: "flash_slash" }),
  Object.freeze({ job: "priest", level: 3, skillId: "antidote" }),
  Object.freeze({ job: "priest", level: 5, skillId: "exorcism" }),
  Object.freeze({ job: "priest", level: 7, skillId: "hemostasis" }),
  Object.freeze({ job: "thief", level: 8, skillId: "conceal_presence" }),
  Object.freeze({ job: "thief", level: 38, skillId: "assassination" }),
  Object.freeze({ job: "warrior", level: 55, skillId: "falcon_schnitt" }),
  Object.freeze({ job: "thief", level: 55, skillId: "twin_rapid_strike" }),
  Object.freeze({ job: "priest", level: 55, skillId: "twilight_flash" }),
  Object.freeze({ job: "mage", level: 55, skillId: "tunguska" })
]);

export function getLevelUnlockedSkillIds(job, level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return LEVEL_SKILL_UNLOCKS
    .filter(unlock => unlock.job === job && unlock.level <= normalizedLevel)
    .map(unlock => unlock.skillId);
}
