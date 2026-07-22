export const ZODIAC_RULES = Object.freeze({
  rarity: "Z",
  defaultCost: 8,
  totalCards: 12,
  maximumWorldCopies: 1,
  maximumOwnedCopies: 1,
  maximumDeckCopies: 1,
});

const ZODIAC_DEFINITIONS = Object.freeze([
  ["aries", "ARIES", "エアリーズ", "牡羊座", "開幕火力"],
  ["taurus", "TAURUS", "トーラス", "牡牛座", "超耐久"],
  ["gemini", "GEMINI", "ジェミニ", "双子座", "複製"],
  ["cancer", "CANCER", "キャンサー", "蟹座", "防御反撃"],
  ["leo", "LEO", "リーオー", "獅子座", "火力特化"],
  ["virgo", "VIRGO", "ヴァルゴ", "乙女座", "回復・継戦"],
  ["libra", "LIBRA", "リーブラ", "天秤座", "格上対策"],
  ["scorpio", "SCORPIO", "スコルピオ", "蠍座", "毒・継続"],
  ["sagittarius", "SAGITTARIUS", "サジタリウス", "射手座", "必中"],
  ["capricorn", "CAPRICORN", "カプリコーン", "山羊座", "長期戦"],
  ["aquarius", "AQUARIUS", "アクエリアス", "水瓶座", "魔力解放"],
  ["pisces", "PISCES", "パイシーズ", "魚座", "復活"],
]);

export const ZODIAC_CARDS = Object.freeze(Object.fromEntries(
  ZODIAC_DEFINITIONS.map(([zodiac, name, nameJa, constellationJa, concept]) => [
    `zodiac${name[0]}${name.slice(1).toLowerCase()}`,
    Object.freeze({
      id: `zodiac_${zodiac}`,
      rarity: ZODIAC_RULES.rarity,
      cost: ZODIAC_RULES.defaultCost,
      name,
      footerText: name,
      nameJa,
      constellationJa,
      concept,
      zodiac,
      category: "zodiac",
      effectId: `zodiac_${zodiac}`,
      maxCopies: ZODIAC_RULES.maximumDeckCopies,
      version: 2,
    }),
  ]),
));
