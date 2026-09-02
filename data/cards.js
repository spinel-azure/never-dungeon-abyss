export const CARD_RARITIES = Object.freeze(["C", "R", "SR", "L", "Z"]);
export const GODDESS_GRACE_CARD_ID = "common_goddess_grace";
export const GODDESS_MERCY_CARD_ID = "legendary_goddess_mercy";
export const PERPETUAL_TORCH_CARD_ID = "legendary_unlimited_torch_gauge";
export const DEADLY_POISON_IMMUNITY_CARD_ID = "legendary_deadly_poison_immunity";
export const MANA_ACTIVATION_CARD_ID = "legendary_mana_activation";
export const GODDESS_BREATH_CARD_ID = "legendary_goddess_breath";
export const SPHINX_WISDOM_CARD_ID = "legendary_sphinx_wisdom";
export const SPHINX_MAJESTY_CARD_ID = "legendary_sphinx_majesty";
export const DEEP_FLOOR_PROOF_CARD_ID = "legendary_deep_floor_proof";
export const MANA_BOOSTER_CARD_ID = "legendary_mana_booster";
export const LIFE_BOOSTER_CARD_ID = "legendary_life_booster";
export const MIRAGE_CARD_ID = "sr_mirage";
export const VIRGO_CARD_ID = "zodiac_virgo";

const STANDARD_CARDS = [
  {
    id: "common_strength_up", rarity: "C", cost: 1,
    name: "Strength Up", nameJa: "腕力上昇", concept: "STR +1",
    category: "ability", effectId: "strength_up", effectValue: 1,
    statBonus: Object.freeze({ str: 1 }), iconId: "strength",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_knowledge_book", rarity: "C", cost: 1,
    name: "Knowledge Book", nameJa: "知識の書", concept: "INT +1",
    category: "ability", effectId: "intelligence_up", effectValue: 1,
    statBonus: Object.freeze({ int: 1 }), iconId: "knowledge",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_dexterity_lesson", rarity: "C", cost: 1,
    name: "Dexterity Lesson", nameJa: "技巧の心得", concept: "DEX +1",
    category: "ability", effectId: "dexterity_up", effectValue: 1,
    statBonus: Object.freeze({ dex: 1 }), iconId: "dexterity",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_lucky_charm", rarity: "C", cost: 1,
    name: "Lucky Charm", nameJa: "幸運のお守り", concept: "LUC +1",
    category: "ability", effectId: "luck_up", effectValue: 1,
    statBonus: Object.freeze({ luc: 1 }), iconId: "luck",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_gale_feather", rarity: "C", cost: 1,
    name: "Gale Feather", nameJa: "疾風の羽根", concept: "AGI +1",
    category: "ability", effectId: "agility_up", effectValue: 1,
    statBonus: Object.freeze({ agi: 1 }), iconId: "agility",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_hp_up", rarity: "C", cost: 1,
    name: "HP +5", nameJa: "HP+5", concept: "MAX HP +5",
    category: "ability", effectId: "max_hp_up", effectValue: 5,
    statBonus: Object.freeze({ maxHp: 5 }), iconId: "health-pulse",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_sp_up", rarity: "C", cost: 1,
    name: "SP +5", nameJa: "SP+5", concept: "MAX SP +5",
    category: "ability", effectId: "max_sp_up", effectValue: 5,
    statBonus: Object.freeze({ maxSp: 5 }), iconId: "mana-core",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: GODDESS_GRACE_CARD_ID, rarity: "C", cost: 1,
    name: "Goddess's Grace", nameJa: "女神の恩寵", concept: "探索EXPロスト無効",
    descriptionJa: "ダンジョン内で力尽きても、その探索で獲得した経験値を失わずに復活できる。",
    category: "exploration", effectId: "preserve_experience_on_defeat",
    iconId: "goddess-silhouette",
    maxOwned: 1, maxCopies: 1
  },
  {
    id: "common_alertness", rarity: "C", cost: 1,
    name: "Alertness", nameJa: "警戒心", concept: "不意打ち耐性 +2%",
    descriptionJa: "敵から不意打ちされる確率を2％軽減する。",
    category: "exploration", effectId: "surprise_resistance", effectValue: 0.02,
    statBonus: Object.freeze({ surpriseResistance: 0.02 }), iconId: "alertness",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_strength_down", rarity: "C", cost: 1,
    name: "STR -3", nameJa: "STR-3", concept: "STR -3",
    descriptionJa: "STRを3下げる。ただし、カードによって1未満にはならない。",
    category: "ability", effectId: "strength_down", effectValue: -3,
    statBonus: Object.freeze({ str: -3 }), iconId: "strength",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_agility_down", rarity: "C", cost: 1,
    name: "AGI -3", nameJa: "AGI-3", concept: "AGI -3",
    descriptionJa: "AGIを3下げる。ただし、カードによって1未満にはならない。",
    category: "ability", effectId: "agility_down", effectValue: -3,
    statBonus: Object.freeze({ agi: -3 }), iconId: "agility",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_stairs_detection", rarity: "C", cost: 1,
    name: "Stairs Detection", nameJa: "階段探知", concept: "下り階段探知",
    descriptionJa: "たいまつが灯っている間、下り階段をミニマップに表示する。",
    category: "exploration", effectId: "stairs_detection", iconId: "stairs-detection",
    maxOwned: 1, maxCopies: 1, sellPrice: 100, buybackPrice: 1000, overflowGold: 100
  },
  {
    id: "common_person_detection", rarity: "C", cost: 1,
    name: "People Finder", nameJa: "人捜し", concept: "NPC探知",
    descriptionJa: "たいまつが灯っている間、NPCをミニマップに表示する。",
    category: "exploration", effectId: "npc_detection", iconId: "person-detection",
    maxOwned: 1, maxCopies: 1, sellPrice: 100, buybackPrice: 1000, overflowGold: 100
  },
  {
    id: "common_treasure_detection", rarity: "C", cost: 1,
    name: "Treasure Detection", nameJa: "宝箱探知", concept: "宝箱探知",
    descriptionJa: "たいまつが灯っている間、宝箱をミニマップに表示する。",
    category: "exploration", effectId: "treasure_detection", iconId: "treasure-detection",
    maxOwned: 1, maxCopies: 1, sellPrice: 100, buybackPrice: 1000, overflowGold: 100
  },
  {
    id: "rare_search_and_destroy", rarity: "R", cost: 2,
    name: "Search and Destroy", nameJa: "必敵必殺", concept: "投擲アイテム必中",
    descriptionJa: "サーチ・アンド・デストロイ。投擲アイテムの命中率を100％にする。",
    category: "battle", effectId: "throwing_item_guaranteed_hit", iconId: "dexterity",
    maxOwned: 1, maxCopies: 1, sellPrice: 1000, buybackPrice: 10000, overflowGold: 1000
  },
  {
    id: "common_first_aid", rarity: "R", cost: 2,
    name: "First Aid", nameJa: "応急措置", concept: "出血耐性 +30%",
    descriptionJa: "出血状態になる確率を30％軽減する。",
    category: "resistance", effectId: "bleeding_resistance", effectValue: 0.3,
    statBonus: Object.freeze({ bleedingResistance: 0.3 }), iconId: "bandage",
    maxOwned: 1, maxCopies: 1
  },
  {
    id: "rare_resistance_spirit", rarity: "R", cost: 2,
    name: "Resistance Spirit", nameJa: "抵抗心", concept: "行動不能耐性 +20%",
    descriptionJa: "行動不能になる確率を20％軽減する。",
    category: "resistance", effectId: "action_skip_resistance", effectValue: 0.2,
    statBonus: Object.freeze({ actionSkipResistance: 0.2 }), iconId: "alertness",
    maxOwned: 99, maxCopies: 3
  },
  {
    id: "rare_defense_up", rarity: "R", cost: 2,
    name: "Defense Up", nameJa: "防御力上昇", concept: "DEF +3",
    category: "ability", effectId: "defense_up", effectValue: 3,
    statBonus: Object.freeze({ def: 3 }), iconId: "quartered-shield",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_spell_resistance", rarity: "R", cost: 2,
    name: "Elemental Spell Resistance", nameJa: "属性呪文耐性", concept: "属性呪文ダメージ -5%",
    descriptionJa: "炎・氷・雷など、属性を持つ呪文によるダメージを5％軽減する。",
    category: "resistance", effectId: "elemental_magic_damage_reduction", effectValue: 0.05,
    statBonus: Object.freeze({ elementalMagicDamageReduction: 0.05 }),
    iconId: "quartered-shield", maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_strength_up_plus", rarity: "R", cost: 2,
    name: "Strength Up +", nameJa: "腕力上昇＋", concept: "STR +2",
    category: "ability", effectId: "strength_up_plus", effectValue: 2,
    statBonus: Object.freeze({ str: 2 }), iconId: "strength",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "common_sp_saver", rarity: "C", cost: 1,
    name: "SP Saver", nameJa: "節約術", concept: "消費SP -1",
    descriptionJa: "スキル・呪文・奇蹟の消費SPを1減らす。ただし消費SPは1未満にならない。",
    category: "ability", effectId: "sp_cost_reduction", effectValue: 1,
    statBonus: Object.freeze({ spCostReduction: 1 }), iconId: "mana-core",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_magic_resistance", rarity: "R", cost: 2,
    name: "Non-Elemental Spell Resistance", nameJa: "無属性呪文耐性", concept: "無属性呪文ダメージ -5%",
    descriptionJa: "属性を持たない呪文によるダメージを5％軽減する。炎・氷などの属性攻撃には効果がない。",
    category: "resistance", effectId: "non_elemental_magic_damage_reduction", effectValue: 0.05,
    statBonus: Object.freeze({ nonElementalMagicDamageReduction: 0.05 }),
    iconId: "quartered-shield", maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_dexterity_lesson_plus", rarity: "R", cost: 2,
    name: "Dexterity Lesson +", nameJa: "技巧の心得＋", concept: "DEX +2",
    category: "ability", effectId: "dexterity_up_plus", effectValue: 2,
    statBonus: Object.freeze({ dex: 2 }), iconId: "dexterity",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_lucky_charm_plus", rarity: "R", cost: 2,
    name: "Lucky Charm +", nameJa: "幸運のお守り＋", concept: "LUC +2",
    category: "ability", effectId: "luck_up_plus", effectValue: 2,
    statBonus: Object.freeze({ luc: 2 }), iconId: "luck",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_knowledge_book_plus", rarity: "R", cost: 2,
    name: "Knowledge Book +", nameJa: "知識の書＋", concept: "INT +2",
    category: "ability", effectId: "intelligence_up_plus", effectValue: 2,
    statBonus: Object.freeze({ int: 2 }), iconId: "knowledge",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_gale_feather_plus", rarity: "R", cost: 2,
    name: "Gale Feather +", nameJa: "疾風の羽根＋", concept: "AGI +2",
    category: "ability", effectId: "agility_up_plus", effectValue: 2,
    statBonus: Object.freeze({ agi: 2 }), iconId: "agility",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_hp_up", rarity: "R", cost: 2,
    name: "HP +10", nameJa: "HP+10", concept: "MAX HP +10",
    category: "ability", effectId: "max_hp_up_rare", effectValue: 10,
    statBonus: Object.freeze({ maxHp: 10 }), iconId: "health-pulse",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "rare_sp_up", rarity: "R", cost: 2,
    name: "SP +10", nameJa: "SP+10", concept: "MAX SP +10",
    category: "ability", effectId: "max_sp_up_rare", effectValue: 10,
    statBonus: Object.freeze({ maxSp: 10 }), iconId: "mana-core",
    maxOwned: 99, maxCopies: 6
  },
  {
    id: "super_rare_max_hp_up", rarity: "SR", cost: 4,
    name: "MAX HP+10%", nameJa: "最大HP割合上昇", concept: "MAX HP +10%",
    category: "ability", effectId: "max_hp_percent_up", effectValue: 10,
    iconId: "vital-heart", maxOwned: 99, maxCopies: 1
  },
  {
    id: "sr_ability_boost", rarity: "SR", cost: 4,
    name: "Ability Boost", nameJa: "能力向上", concept: "STR / INT / AGI / DEX / LUC +5",
    descriptionJa: "STR、INT、AGI、DEX、LUCがそれぞれ5上昇する。",
    category: "ability", effectId: "all_ability_up", effectValue: 5,
    statBonus: Object.freeze({ str: 5, int: 5, agi: 5, dex: 5, luc: 5 }),
    iconId: "power-pose", maxOwned: 99, maxCopies: 3
  },
  {
    id: "sr_indomitable_spirit", rarity: "SR", cost: 4,
    name: "Indomitable Spirit", nameJa: "不屈の闘志", concept: "MAX HP +15 / DEF +3",
    descriptionJa: "最大HPが15、防御力が3上昇する。",
    category: "ability", effectId: "indomitable_spirit",
    statBonus: Object.freeze({ maxHp: 15, def: 3 }),
    iconId: "quartered-shield", maxOwned: 99, maxCopies: 6,
    acquisition: Object.freeze({ type: "blackChest", minDepth: 6, maxDepth: 10, excludedDepths: Object.freeze([9]) })
  },
  {
    id: "sr_floor_detection", rarity: "SR", cost: 4,
    name: "Floor Detection", nameJa: "階層探知", concept: "下り階段 / 宝箱 / NPC探知",
    descriptionJa: "たいまつが灯っている間、下り階段と宝箱、NPCをミニマップに表示する。",
    category: "exploration", effectId: "floor_detection",
    iconId: "alertness", maxOwned: 1, maxCopies: 1
  },
  {
    id: "sr_magic_barrier", rarity: "SR", cost: 4,
    name: "Magic Barrier", nameJa: "魔力障壁", concept: "魔法ダメージ -20%",
    descriptionJa: "受ける魔法ダメージを20％軽減する。軽減率の上限は75％。",
    category: "resistance", effectId: "magic_damage_reduction", effectValue: 0.2,
    statBonus: Object.freeze({ magicDamageReduction: 0.2 }),
    iconId: "quartered-shield", maxOwned: 3, maxCopies: 3
  },
  {
    id: "sr_scorching_resistance", rarity: "SR", cost: 4,
    name: "Scorching Resistance", nameJa: "灼熱耐性", concept: "MAX HP +15 / 炎ダメージ -20%",
    descriptionJa: "最大HPを15上げ、戦闘中に受ける炎属性ダメージを20％軽減する。火炎床には効果がない。",
    category: "resistance", effectId: "fire_damage_reduction", effectValue: 0.2,
    statBonus: Object.freeze({ maxHp: 15, fireDamageReduction: 0.2 }),
    iconId: "vital-heart", maxOwned: 99, maxCopies: 3
  },
  {
    id: "sr_silent_steps", rarity: "SR", cost: 4,
    name: "Silent Steps", nameJa: "忍び足", concept: "気配ゲージ上昇量 -25%",
    descriptionJa: "気配ゲージの上昇量を25％軽減する。盗賊の「気配消し」と重複する。",
    category: "exploration", effectId: "presence_gain_reduction", effectValue: 0.25,
    iconId: "alertness", maxOwned: 2, maxCopies: 2,
    sellPrice: 5000, buybackPrice: 50000, overflowGold: 5000
  },
  {
    id: "sr_golden_beetle", rarity: "SR", cost: 4,
    name: "Golden Beetle", nameJa: "黄金虫", concept: "獲得経験値 +25%",
    descriptionJa: "戦闘で獲得する経験値が25％増加する。深層帰還ボーナスと重複する。",
    category: "exploration", effectId: "experience_gain_bonus", effectValue: 0.25,
    iconId: "luck", maxOwned: 1, maxCopies: 1,
    sellPrice: 5000, buybackPrice: 50000, overflowGold: 5000,
    acquisition: Object.freeze({ type: "rareEnemy", enemyId: "maikaefer", dropRate: 0.01 })
  },
  {
    id: "sr_flame_armament", rarity: "SR", cost: 4,
    name: "Flame Armament", nameJa: "炎の武装", concept: "物理攻撃に炎属性付与",
    descriptionJa: "通常攻撃と物理攻撃スキルに炎属性を付与する。武器固有属性と戦闘中の属性油が優先される。",
    category: "ability", effectId: "weapon_fire_imbue", effectValue: "fire",
    exclusiveGroup: "weapon_element_imbue", iconId: "flame-sword",
    maxOwned: 1, maxCopies: 1, sellPrice: 5000, buybackPrice: 50000
  },
  {
    id: "sr_ice_armament", rarity: "SR", cost: 4,
    name: "Ice Armament", nameJa: "氷の武装", concept: "物理攻撃に氷属性付与",
    descriptionJa: "通常攻撃と物理攻撃スキルに氷属性を付与する。武器固有属性と戦闘中の属性油が優先される。",
    category: "ability", effectId: "weapon_ice_imbue", effectValue: "ice",
    exclusiveGroup: "weapon_element_imbue", iconId: "ice-sword",
    maxOwned: 1, maxCopies: 1, sellPrice: 5000, buybackPrice: 50000
  },
  {
    id: GODDESS_MERCY_CARD_ID, rarity: "L", cost: 6,
    name: "Goddess's Mercy", nameJa: "女神の慈愛", concept: "女神の恩寵 / 階層探知",
    descriptionJa: "戦闘不能時の探索経験値を守り、たいまつ点灯中は下り階段、宝箱、NPCを表示する。深層帰還ボーナスは無効。",
    category: "exploration", effectId: "goddess_mercy",
    effectIds: Object.freeze(["preserve_experience_on_defeat", "floor_detection"]),
    conflictsWith: Object.freeze([GODDESS_GRACE_CARD_ID, "sr_floor_detection"]),
    iconId: "goddess-silhouette", maxOwned: 1, maxCopies: 1
  },
  {
    id: PERPETUAL_TORCH_CARD_ID, rarity: "L", cost: 6,
    name: "Perpetual Torch", nameJa: "恒久の灯火", concept: "たいまつ消費なし / 強制点灯",
    descriptionJa: "たいまつゲージを消費せず、ゲージが0になる階層でもたいまつの効果を発揮する。",
    category: "exploration", effectId: "unlimited_torch_gauge",
    effectIds: Object.freeze(["torch_consumption_disabled", "force_torch_effect_active"]),
    iconId: "torch", maxOwned: 1, maxCopies: 1
  },
  {
    id: MANA_ACTIVATION_CARD_ID, rarity: "L", cost: 6,
    name: "Mana Activation", nameJa: "マナ活性化", concept: "5歩ごとにSP1回復",
    descriptionJa: "ダンジョンを5歩進むごとにSPを1回復する。ヨハンのマナ活性化と重複する。",
    category: "exploration", effectId: "step_sp_recovery", effectValue: 1,
    iconId: "knowledge", maxOwned: 1, maxCopies: 1
  },
  {
    id: GODDESS_BREATH_CARD_ID, rarity: "L", cost: 6,
    name: "Goddess's Breath", nameJa: "女神の息吹", concept: "5歩ごとにHP1回復",
    descriptionJa: "ダンジョンを5歩進むごとにHPを1回復する。エリカの女神の息吹と重複する。",
    category: "exploration", effectId: "step_hp_recovery", effectValue: 1,
    iconId: "goddess-silhouette", maxOwned: 1, maxCopies: 1
  },
  {
    id: DEADLY_POISON_IMMUNITY_CARD_ID, rarity: "L", cost: 6,
    name: "Deadly Poison Immunity", nameJa: "猛毒無効", concept: "猛毒耐性 100%",
    descriptionJa: "猛毒状態になるのを完全に防ぐ。",
    category: "resistance", effectId: "deadly_poison_immunity",
    statBonus: Object.freeze({ deadlyPoisonResistance: 1 }), iconId: "alertness",
    maxOwned: 1, maxCopies: 1
  },
  {
    id: "legendary_mana_barrier", rarity: "L", cost: 6,
    name: "Mana Barrier", nameJa: "マナ障壁", concept: "呪文耐性 50%",
    descriptionJa: "受ける呪文ダメージを50％軽減する。軽減率の上限は75％。",
    category: "resistance", effectId: "magic_damage_reduction", effectValue: 0.5,
    statBonus: Object.freeze({ magicDamageReduction: 0.5 }),
    iconId: "quartered-shield", maxOwned: 1, maxCopies: 1,
    sellPrice: 5000, buybackPrice: 50000, overflowGold: 5000
  },
  {
    id: SPHINX_WISDOM_CARD_ID, rarity: "L", cost: 6,
    name: "Sphinx's Wisdom", nameJa: "スピンクスの叡智", concept: "弱点表示 / 弱点ダメージ +15%",
    descriptionJa: "敵の弱点属性を表示し、弱点属性で与えるダメージを15％増加させる。",
    category: "battle", effectId: "sphinx_weakness_insight", effectValue: 0.15,
    iconId: "knowledge", maxOwned: 1, maxCopies: 1
  },
  {
    id: SPHINX_MAJESTY_CARD_ID, rarity: "L", cost: 6,
    name: "Sphinx's Majesty", nameJa: "スピンクスの威容", concept: "戦闘開始時 MAX HP15%障壁",
    descriptionJa: "戦闘開始時、最大HPの15％分の障壁を展開する。障壁は直接ダメージを肩代わりし、戦闘ごとに再生成される。",
    category: "battle", effectId: "sphinx_battle_barrier", effectValue: 0.15,
    iconId: "quartered-shield", maxOwned: 1, maxCopies: 1
  },
  {
    id: DEEP_FLOOR_PROOF_CARD_ID, rarity: "L", cost: 6,
    name: "Proof of Deep Exploration", nameJa: "深層踏破の証", concept: "深層帰還ボーナス +10ポイント",
    descriptionJa: "深層への到達をギルドから認められた証。帰還時の深層帰還ボーナスに10ポイント加算する。",
    category: "exploration", effectId: "depth_return_bonus_points", effectValue: 0.1,
    iconId: "knowledge", maxOwned: 1, maxCopies: 1
  },
  {
    id: MANA_BOOSTER_CARD_ID, rarity: "L", cost: 6,
    name: "Mana Booster", nameJa: "マナブースター", concept: "MAX SP +20% / 開幕SP回復",
    descriptionJa: "最大SPを20％増加し、戦闘開始時に最大SPの5％を回復する。",
    category: "ability", effectId: "mana_booster", effectValue: 0.2,
    battleStartRecoveryRate: 0.05, iconId: "mana-core", maxOwned: 1, maxCopies: 1
  },
  {
    id: LIFE_BOOSTER_CARD_ID, rarity: "L", cost: 6,
    name: "Life Booster", nameJa: "ライフブースター", concept: "MAX HP +20% / 開幕HP回復",
    descriptionJa: "最大HPを20％増加し、戦闘開始時に最大HPの5％を回復する。",
    category: "ability", effectId: "life_booster", effectValue: 0.2,
    battleStartRecoveryRate: 0.05, iconId: "health-pulse", maxOwned: 1, maxCopies: 1
  },
  {
    id: "sr_lightning_armament", rarity: "SR", cost: 4,
    name: "Lightning Armament", nameJa: "雷の武装", concept: "物理攻撃に雷属性付与",
    descriptionJa: "通常攻撃と物理攻撃スキルに雷属性を付与する。武器固有属性と戦闘中の属性油が優先される。",
    category: "ability", effectId: "weapon_lightning_imbue", effectValue: "lightning",
    exclusiveGroup: "weapon_element_imbue", iconId: "lightning-sword",
    maxOwned: 1, maxCopies: 1, sellPrice: 5000, buybackPrice: 50000
  },
  {
    id: MIRAGE_CARD_ID, rarity: "SR", cost: 4,
    name: "Mirage", nameJa: "蜃気楼", concept: "最初の被攻撃を50％で完全回避",
    descriptionJa: "戦闘開始後、最初に受ける攻撃を50％の確率で完全に回避する。",
    category: "battle", effectId: "mirage_first_attack_evasion", effectValue: 0.5,
    iconId: "agility", maxOwned: 1, maxCopies: 1, sellPrice: 5000, buybackPrice: 50000
  },
  {
    id: "legendary_ability_boost_plus", rarity: "L", cost: 6,
    name: "Ability Boost +", nameJa: "能力向上＋", concept: "STR / INT / AGI / DEX / LUC +10",
    descriptionJa: "STR、INT、AGI、DEX、LUCがそれぞれ10上昇する。",
    category: "ability", effectId: "all_ability_up_plus", effectValue: 10,
    statBonus: Object.freeze({ str: 10, int: 10, agi: 10, dex: 10, luc: 10 }),
    iconId: "power-pose", maxOwned: 99, maxCopies: 3
  },
  {
    id: "legendary_vital_surge", rarity: "L", cost: 6,
    name: "Vital Surge", nameJa: "生命躍動", concept: "MAX HP +100",
    descriptionJa: "最大HPが100上昇する。",
    category: "ability", effectId: "max_hp_up_legendary", effectValue: 100,
    statBonus: Object.freeze({ maxHp: 100 }), iconId: "vital-heart",
    maxOwned: 99, maxCopies: 6,
    acquisition: Object.freeze({ type: "bossRouteReward", bossId: "jabberwock_event_boss", vorpalSwordUsed: false })
  },
  {
    id: "legendary_spirit_surge", rarity: "L", cost: 6,
    name: "Spirit Surge", nameJa: "精神躍動", concept: "MAX SP +100",
    descriptionJa: "最大SPが100上昇する。",
    category: "ability", effectId: "max_sp_up_legendary", effectValue: 100,
    statBonus: Object.freeze({ maxSp: 100 }), iconId: "mana-core",
    maxOwned: 99, maxCopies: 6,
    acquisition: Object.freeze({ type: "bossRouteReward", bossId: "jabberwock_event_boss", vorpalSwordUsed: true })
  }
];

const ZODIAC_CARDS = [
  ["aries", "ARIES", "エアリーズ", "開幕火力"],
  ["taurus", "TAURUS", "トーラス", "超耐久"],
  ["gemini", "GEMINI", "ジェミニ", "複製"],
  ["cancer", "CANCER", "キャンサー", "防御反撃"],
  ["leo", "LEO", "リーオー", "火力特化"],
  ["virgo", "VIRGO", "ヴァルゴ", "回復・継戦"],
  ["libra", "LIBRA", "リーブラ", "格上対策"],
  ["scorpio", "SCORPIO", "スコルピオ", "毒・継続"],
  ["sagittarius", "SAGITTARIUS", "サジタリウス", "必中"],
  ["capricorn", "CAPRICORN", "カプリコーン", "長期戦"],
  ["aquarius", "AQUARIUS", "アクエリアス", "魔力解放"],
  ["pisces", "PISCES", "パイシーズ", "復活"]
].map(([id, name, nameJa, concept]) => ({
  id: `zodiac_${id}`, rarity: "Z", cost: 8, name, nameJa, concept,
  zodiac: id, category: "zodiac", effectId: `zodiac_${id}`,
  maxOwned: 1, maxCopies: 1
})).map(card => card.id === "zodiac_capricorn" ? {
  ...card,
  descriptionJa: "戦闘が5ターン経過するごとに与えるダメージが10％上昇し、受けるダメージが10％減少する。最大3段階。",
  longBattleTurnStep: 5,
  longBattleMaximumStacks: 3,
  longBattleDamagePerStack: 0.1,
  longBattleReductionPerStack: 0.1
} : card.id === "zodiac_aries" ? {
  ...card,
  concept: "必ず先制／初回攻撃必中・威力2倍・DEF50％貫通",
  descriptionJa: "戦闘開始時に必ず先制する。最初に行う攻撃は全Hitが必ず命中し、与えるダメージが2倍になり、DEFを50％貫通する。",
  openingDamageMultiplier: 2,
  openingDefensePenetration: 0.5,
  openingUnavoidable: true
} : card.id === "zodiac_taurus" ? {
  ...card,
  concept: "最大HP＋50％／深層ほどDEF上昇",
  descriptionJa: "最大HPが50％上昇する。\n迷宮を深く潜るほどDEFが上昇する。",
  maxHpMultiplier: 1.5
} : card.id === VIRGO_CARD_ID ? {
  ...card,
  concept: "最大HP・SP＋25％／階層移動回復",
  descriptionJa: "最大HPと最大SPが25％上昇する。階段で次の階層へ進むとHPとSPを10％回復する。",
  maxHpMultiplier: 1.25,
  maxSpMultiplier: 1.25,
  floorRecoveryRate: 0.1
} : card.id === "zodiac_libra" ? {
  ...card,
  concept: "強敵への与ダメージ＋30％／被ダメージ－30％",
  descriptionJa: "ボス、または自分より内部レベルが高い敵に与えるダメージが30％上昇し、その敵から受けるダメージが30％減少する。",
  strongerEnemyDamageMultiplier: 1.3,
  strongerEnemyReceivedDamageMultiplier: 0.7
} : card.id === "zodiac_scorpio" ? {
  ...card,
  concept: "毒・猛毒・死毒無効／攻撃命中時に死毒付与",
  descriptionJa: "毒系完全無効。命中時20％で死毒付与（ボス10％）。死毒は行動ごとに最大HPの5％ダメージ。",
  deathPoisonApplicationRate: 0.2,
  bossDeathPoisonApplicationMultiplier: 0.5,
  deathPoisonDamageMaxHpRate: 0.05,
  poisonImmunity: true,
  deadlyPoisonImmunity: true,
  deathPoisonImmunity: true
} : card);

export const CARDS = Object.freeze(
  [...STANDARD_CARDS, ...ZODIAC_CARDS].map(card => Object.freeze(card))
);

export function getCardById(cardId) {
  return CARDS.find(card => card.id === cardId) || null;
}

export function collectCardStatBonuses(deckSlots = []) {
  return deckSlots.reduce((bonuses, cardId) => {
    const card = getCardById(cardId);
    Object.entries(card?.statBonus || {}).forEach(([stat, value]) => {
      bonuses[stat] = (bonuses[stat] || 0) + value;
    });
    return bonuses;
  }, {});
}

export function hasCardEffect(deckSlots = [], effectId = "") {
  return deckSlots.some(cardId => {
    const card = getCardById(cardId);
    return card?.effectId === effectId || card?.effectIds?.includes(effectId);
  });
}


export function sumCardEffectValues(deckSlots = [], effectId = "") {
  return deckSlots.reduce((total, cardId) => {
    const card = getCardById(cardId);
    if (card?.effectId !== effectId) return total;
    return total + (Number(card.effectValue) || 0);
  }, 0);
}
