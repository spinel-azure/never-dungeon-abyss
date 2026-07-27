export const CARD_RARITIES = Object.freeze(["C", "R", "SR", "L", "Z"]);

const STANDARD_CARDS = [
  { id: "common_strength_up", rarity: "C", cost: 1, name: "Strength Up", nameJa: "腕力上昇", concept: "STR+3", maxCopies: 1 },
  { id: "rare_defense_up", rarity: "R", cost: 2, name: "Defense Up", nameJa: "防御力上昇", concept: "DEF+5", maxCopies: 1 },
  { id: "super_rare_max_hp_up", rarity: "SR", cost: 4, name: "MAX HP+10%", nameJa: "最大HP割合上昇", concept: "MAX HP+10%", maxCopies: 1 },
  { id: "legendary_unlimited_torch_gauge", rarity: "L", cost: 6, name: "UNLIMITED TORCH GAUGE", nameJa: "たいまつゲージ無制限", concept: "たいまつ消費なし", maxCopies: 1 }
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
  id: `zodiac_${id}`,
  rarity: "Z",
  cost: 8,
  name,
  nameJa,
  concept,
  maxCopies: 1
}));

export const CARDS = Object.freeze(
  [...STANDARD_CARDS, ...ZODIAC_CARDS].map(card => Object.freeze(card))
);

export function getCardById(cardId) {
  return CARDS.find(card => card.id === cardId) || null;
}
