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
    description: "自分のHPを大きく回復する。\n回復量は20＋最大HPの30％＋INT×1.0。",
    actionType: "healing", category: "miracle", spCost: 10, target: "self",
    baseHealing: 20, maxHpMultiplier: 0.3, intelligenceMultiplier: 1, speedModifier: 0
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
    description: "敵のDEFを無視する聖属性攻撃。\n威力は（STR＋INT）×0.8。",
    actionType: "physicalAttack",
    category: "miracle",
    spCost: 4,
    target: "enemy",
    hitCount: 1,
    powerPerHit: 1,
    attackStat: "str",
    attackStatMultiplier: 0.8,
    additionalAttackStats: Object.freeze([{ stat: "int", multiplier: 0.8 }]),
    ignoreWeaponAttack: true,
    ignoresDefense: true,
    element: "holy",
    speedModifier: 0,
    effects: Object.freeze([])
  }),
  healing_prayer: SPELLS.healing_prayer,
  guardian_prayer: Object.freeze({
    id: "guardian_prayer",
    name: "守護の祈り",
    description: "その戦闘中、自分のDEFを5上昇させる。\n効果は重複しない。",
    actionType: "buff",
    category: "miracle",
    spCost: 6,
    target: "self",
    speedModifier: 0,
    preventWhileStatusActive: "guardian_prayer",
    effects: Object.freeze([{ statusId: "guardian_prayer", trigger: "perAction", guaranteed: true }])
  }),
  triage: Object.freeze({
    id: "triage",
    name: "トリアージュ",
    description: "最優先で自分のHPを回復する。\n回復量は25＋INT×0.7。",
    actionType: "healing",
    category: "miracle",
    spCost: 6,
    target: "self",
    baseHealing: 25,
    intelligenceMultiplier: 0.7,
    turnPriority: 100,
    speedModifier: 0,
    battleOnly: true
  }),
  die_triage: Object.freeze({
    id: "die_triage",
    name: "ディー・トリアージュ",
    description: "最優先で自分のHPを大きく回復する。\n回復量は40＋最大HPの40％＋INT×1.0。",
    actionType: "healing",
    category: "miracle",
    spCost: 20,
    target: "self",
    baseHealing: 40,
    maxHpMultiplier: 0.4,
    intelligenceMultiplier: 1,
    turnPriority: 100,
    speedModifier: 0,
    battleOnly: true
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
  die_antidote: Object.freeze({
    id: "die_antidote",
    name: "ディー・アンチドート",
    description: "毒および猛毒状態を回復する。\nHPは回復しない。",
    actionType: "cureStatus",
    category: "miracle",
    spCost: 5,
    target: "self",
    statusIds: Object.freeze(["poison", "deadly_poison"]),
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
  grain_glow: Object.freeze({
    id: "grain_glow",
    name: "稲穂の輝き",
    description: "たいまつゲージを50％回復する。",
    actionType: "dungeonEffect",
    category: "miracle",
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
  nieder_schlag: Object.freeze({
    id: "nieder_schlag", name: "ニーダーシュラーク",
    description: "チャージ100で発動。威力200%の物理攻撃。\n命中時、敵のDEFを5ターン15%低下。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 1, powerPerHit: 2, chargeSkill: true, presentationId: "nieder_schlag",
    effects: Object.freeze([{ statusId: "charge_defense_down_15", trigger: "firstHitOnly", guaranteed: true }])
  }),
  blindheit: Object.freeze({
    id: "blindheit", name: "ブリントハイト",
    description: "チャージ100で発動。5ターンの間、敵の\n物理命中率を50%低下。ボスは成功率25%。",
    actionType: "chargeDebuff", category: "chargeSkill", spCost: 0, target: "enemy",
    chargeSkill: true, presentationId: "blindheit", statusId: "charge_blindness",
    normalSuccessRate: 1, bossSuccessRate: 0.25, effects: Object.freeze([])
  }),
  green_budding: Object.freeze({
    id: "green_budding", name: "新緑の芽吹き",
    description: "チャージ100で発動。5ターンの間、\nターン終了時に最大HPの5%を回復。",
    actionType: "buff", category: "chargeSkill", spCost: 0, target: "self",
    chargeSkill: true, presentationId: "green_budding",
    effects: Object.freeze([{ statusId: "charge_budding", trigger: "perAction", guaranteed: true }])
  }),
  mana_spring: Object.freeze({
    id: "mana_spring", name: "マナの泉",
    description: "チャージ100で発動。5ターンの間、\nチャージ技以外の攻撃呪文の消費SPを0にする。",
    actionType: "buff", category: "chargeSkill", spCost: 0, target: "self",
    chargeSkill: true, presentationId: "mana_spring",
    effects: Object.freeze([{ statusId: "charge_mana_spring", trigger: "perAction", guaranteed: true }])
  }),
  auf_schlag: Object.freeze({
    id: "auf_schlag", name: "アウフシュラーク",
    description: "チャージ100で発動。威力300%の物理攻撃。\n命中時、敵のDEFを5ターン25%低下。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 1, powerPerHit: 3, chargeSkill: true, presentationId: "auf_schlag",
    effects: Object.freeze([{ statusId: "charge_defense_down_25", trigger: "firstHitOnly", guaranteed: true }])
  }),
  todes_gift: Object.freeze({
    id: "todes_gift", name: "トーデス・ギフト",
    description: "チャージ100で発動。敵を戦闘終了まで猛毒にする。\n毎ターン最大HPの5%ダメージ。",
    actionType: "chargeDebuff", category: "chargeSkill", spCost: 0, target: "enemy",
    chargeSkill: true, presentationId: "todes_gift", statusId: "deadly_poison",
    normalSuccessRate: 1, bossSuccessRate: 1, effects: Object.freeze([])
  }),
  green_healing: Object.freeze({
    id: "green_healing", name: "新緑の癒し",
    description: "チャージ100で発動。最大HPの70%を回復し、\n5ターンの間、物理ダメージを25%軽減。",
    actionType: "chargeHealingBuff", category: "chargeSkill", spCost: 0, target: "self",
    chargeSkill: true, presentationId: "green_healing", healingMaxHpRate: 0.7,
    statusId: "charge_green_healing_guard", effects: Object.freeze([])
  }),
  mana_amplification: Object.freeze({
    id: "mana_amplification", name: "マナ増幅",
    description: "チャージ100で発動。戦闘終了まで攻撃呪文の\n威力を1.5倍にする。Lv80奥義は対象外。",
    actionType: "buff", category: "chargeSkill", spCost: 0, target: "self",
    chargeSkill: true, presentationId: "mana_amplification",
    effects: Object.freeze([{ statusId: "charge_mana_amplification", trigger: "perAction", guaranteed: true }])
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
    description: "チャージ100で発動。敵のDEFを50％無視する\n威力90%・4連撃。暗殺術判定あり。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 0, target: "enemy",
    hitCount: 4, powerPerHit: 0.9, defensePenetration: 0.5,
    chargeSkill: true, presentationId: "twin_rapid_strike", passiveInstantDeathId: "assassination",
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
  drachen_fang: Object.freeze({
    id: "drachen_fang", name: "ドラッヘン・ファング",
    description: "チャージ100とSP100で発動。STR×100の\n単体物理攻撃。DEFを50%無視。1戦闘1回。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 100, target: "enemy",
    hitCount: 1, powerPerHit: 1, attackStat: "str", attackStatMultiplier: 100,
    ignoreSpCostReduction: true,
    ignoreWeaponAttack: true, defensePenetration: 0.5, chargeSkill: true,
    ultimateChargeSkill: true, presentationId: "drachen_fang", effects: Object.freeze([])
  }),
  acht_streich: Object.freeze({
    id: "acht_streich", name: "アハト・シュトライヒ",
    description: "チャージ100とSP100で発動。敵へランダムに\nDEX×12.5の8連撃。暗殺術なし。1戦闘1回。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 100, target: "enemy",
    hitCount: 8, powerPerHit: 1, attackStat: "dex", attackStatMultiplier: 12.5,
    ignoreSpCostReduction: true,
    ignoreWeaponAttack: true, chargeSkill: true, ultimateChargeSkill: true, randomlyDistributeHits: true,
    presentationId: "acht_streich", effects: Object.freeze([])
  }),
  call_goddess_name: Object.freeze({
    id: "call_goddess_name", name: "呼べ、女神の名を",
    description: "チャージ100とSP100で発動。全体へINT×100の\n聖属性物理攻撃。DEF無視。1戦闘1回。",
    actionType: "physicalAttack", category: "chargeSkill", spCost: 100, target: "allEnemies",
    hitCount: 1, powerPerHit: 1, attackStat: "int", attackStatMultiplier: 100,
    ignoreSpCostReduction: true,
    ignoreWeaponAttack: true, ignoresDefense: true, element: "holy", unavoidable: true,
    instantKillNormalUndead: true, raceDamageMultipliers: Object.freeze({ undead: 1.25 }),
    chargeSkill: true, ultimateChargeSkill: true, presentationId: "call_goddess_name", effects: Object.freeze([])
  }),
  apocalypse: Object.freeze({
    id: "apocalypse", name: "アポカリプス",
    description: "チャージ100とSP100で発動。全体へINT×100の\n無属性魔法攻撃。魔法耐性無視。1戦闘1回。",
    actionType: "spell", category: "chargeSkill", spCost: 100, target: "allEnemies",
    element: "arcane", spellPower: 0, intelligenceMultiplier: 100, powerMultiplier: 1,
    ignoreSpCostReduction: true,
    unavoidable: true, ignoresMagicResistance: true, chargeSkill: true,
    ultimateChargeSkill: true, presentationId: "apocalypse", effects: Object.freeze([])
  }),
  fall_the_meteor: Object.freeze({
    id: "fall_the_meteor", name: "フォール・ザ・ミーティア",
    description: "コメットブースター装備中のみ使用可能。\n敵全体へINT×10の無属性魔法攻撃。",
    actionType: "spell", category: "spell", spCost: 45, target: "allEnemies",
    element: "arcane", spellPower: 0, intelligenceMultiplier: 10, powerMultiplier: 1,
    unavoidable: true, equipmentGranted: true, effects: Object.freeze([])
  }),
  fireball: SPELLS.fireball,
  ice_bind: SPELLS.ice_bind,
  lightning_pierce: SPELLS.lightning_pierce
});

export function getSkill(id) {
  return SKILLS[id] || null;
}

export function getSkills(ids = []) {
  return ids.map(getSkill).filter(Boolean);
}

export const LEVEL_SKILL_UNLOCKS = Object.freeze([
  Object.freeze({ job: "mage", level: 8, skillId: "lightning_pierce" }),
  Object.freeze({ job: "warrior", level: 10, skillId: "nieder_schlag" }),
  Object.freeze({ job: "thief", level: 10, skillId: "blindheit" }),
  Object.freeze({ job: "priest", level: 10, skillId: "green_budding" }),
  Object.freeze({ job: "priest", level: 10, skillId: "triage" }),
  Object.freeze({ job: "mage", level: 10, skillId: "mana_spring" }),
  Object.freeze({ job: "warrior", level: 30, skillId: "auf_schlag" }),
  Object.freeze({ job: "thief", level: 30, skillId: "todes_gift" }),
  Object.freeze({ job: "priest", level: 30, skillId: "green_healing" }),
  Object.freeze({ job: "mage", level: 30, skillId: "mana_amplification" }),
  Object.freeze({ job: "thief", level: 22, skillId: "gale_blades" }),
  Object.freeze({ job: "warrior", level: 24, skillId: "crushing_break" }),
  Object.freeze({ job: "priest", level: 24, skillId: "greater_healing" }),
  Object.freeze({ job: "mage", level: 24, skillId: "lightning_bolt" }),
  Object.freeze({ job: "thief", level: 32, skillId: "art_sealing_stab" }),
  Object.freeze({ job: "warrior", level: 34, skillId: "immovable_stance" }),
  Object.freeze({ job: "priest", level: 34, skillId: "holy_light" }),
  Object.freeze({ job: "mage", level: 34, skillId: "magic_focus" }),
  Object.freeze({ job: "mage", level: 4, skillId: "staff_light" }),
  Object.freeze({ job: "priest", level: 4, skillId: "grain_glow" }),
  Object.freeze({ job: "mage", level: 25, skillId: "wisdom_to_power" }),
  Object.freeze({ job: "warrior", level: 5, skillId: "survival_instinct" }),
  Object.freeze({ job: "warrior", level: 38, skillId: "flash_slash" }),
  Object.freeze({ job: "priest", level: 3, skillId: "antidote" }),
  Object.freeze({ job: "priest", level: 5, skillId: "exorcism" }),
  Object.freeze({ job: "priest", level: 7, skillId: "hemostasis" }),
  Object.freeze({ job: "priest", level: 25, skillId: "die_antidote" }),
  Object.freeze({ job: "priest", level: 40, skillId: "die_triage" }),
  Object.freeze({ job: "thief", level: 8, skillId: "conceal_presence" }),
  Object.freeze({ job: "thief", level: 38, skillId: "assassination" }),
  Object.freeze({ job: "warrior", level: 55, skillId: "falcon_schnitt" }),
  Object.freeze({ job: "thief", level: 55, skillId: "twin_rapid_strike" }),
  Object.freeze({ job: "priest", level: 55, skillId: "twilight_flash" }),
  Object.freeze({ job: "mage", level: 55, skillId: "tunguska" }),
  Object.freeze({ job: "warrior", level: 80, skillId: "drachen_fang" }),
  Object.freeze({ job: "thief", level: 80, skillId: "acht_streich" }),
  Object.freeze({ job: "priest", level: 80, skillId: "call_goddess_name" }),
  Object.freeze({ job: "mage", level: 80, skillId: "apocalypse" })
]);

export function getLevelUnlockedSkillIds(job, level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return LEVEL_SKILL_UNLOCKS
    .filter(unlock => unlock.job === job && unlock.level <= normalizedLevel)
    .map(unlock => unlock.skillId);
}
