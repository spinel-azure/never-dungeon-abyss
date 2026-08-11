export const CARD_RARITIES = Object.freeze(["C", "R", "SR", "L", "Z"]);
export const GODDESS_GRACE_CARD_ID = "common_goddess_grace";

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
    id: "rare_strength_up_plus", rarity: "R", cost: 2,
    name: "Strength Up +", nameJa: "腕力上昇＋", concept: "STR +2",
    category: "ability", effectId: "strength_up_plus", effectValue: 2,
    statBonus: Object.freeze({ str: 2 }), iconId: "strength",
    maxOwned: 99, maxCopies: 6
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
    name: "Ability Boost", nameJa: "能力向上", concept: "STR / INT / AGI / DEX / LUC +2",
    descriptionJa: "STR、INT、AGI、DEX、LUCがそれぞれ2上昇する。",
    category: "ability", effectId: "all_ability_up", effectValue: 2,
    statBonus: Object.freeze({ str: 2, int: 2, agi: 2, dex: 2, luc: 2 }),
    iconId: "power-pose", maxOwned: 99, maxCopies: 6
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
    name: "Floor Detection", nameJa: "階層探知", concept: "下り階段 / 宝箱探知",
    descriptionJa: "たいまつが灯っている間、下り階段と宝箱をミニマップに表示する。",
    category: "exploration", effectId: "floor_detection",
    iconId: "alertness", maxOwned: 1, maxCopies: 1
  },
  {
    id: "legendary_unlimited_torch_gauge", rarity: "L", cost: 6,
    name: "UNLIMITED TORCH GAUGE", nameJa: "永久の導き", concept: "たいまつ消費なし",
    category: "exploration", effectId: "unlimited_torch_gauge",
    iconId: "torch", maxOwned: 1, maxCopies: 1
  },
  {
    id: "legendary_ability_boost_plus", rarity: "L", cost: 6,
    name: "Ability Boost +", nameJa: "能力向上＋", concept: "STR / INT / AGI / DEX / LUC +5",
    descriptionJa: "STR、INT、AGI、DEX、LUCがそれぞれ5上昇する。",
    category: "ability", effectId: "all_ability_up_plus", effectValue: 5,
    statBonus: Object.freeze({ str: 5, int: 5, agi: 5, dex: 5, luc: 5 }),
    iconId: "power-pose", maxOwned: 99, maxCopies: 6
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
  category: "zodiac", effectId: `zodiac_${id}`,
  maxOwned: 1, maxCopies: 1
}));

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
  return deckSlots.some(cardId => getCardById(cardId)?.effectId === effectId);
}
