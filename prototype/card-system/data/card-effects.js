export const CARD_EFFECTS = Object.freeze({
  strengthUp: Object.freeze({
    id: "strength_up",
    nameJa: "腕力上昇",
    descriptionJa: "STR+3",
  }),
  defenseUp: Object.freeze({
    id: "defense_up",
    nameJa: "防御力上昇",
    descriptionJa: "DEF+5",
  }),
  maxHpPercentUp: Object.freeze({
    id: "max_hp_percent_up",
    nameJa: "最大HP割合上昇",
    descriptionJa: "MAX HP+10%",
  }),
  unlimitedTorchGauge: Object.freeze({
    id: "unlimited_torch_gauge",
    nameJa: "たいまつゲージ無制限",
    descriptionJa: "探索中、たいまつゲージを消費しない。",
  }),
  zodiacAries: Object.freeze({
    id: "zodiac_aries",
    nameJa: "開幕火力",
    descriptionJa: "戦闘開始時に必ず先制。最初の攻撃のみ威力2倍・防御50%貫通。",
  }),
  zodiacTaurus: Object.freeze({
    id: "zodiac_taurus",
    nameJa: "超耐久",
    descriptionJa: "最大HP+50%。HP50%以上の間、被ダメージ30%軽減＋状態異常無効。",
  }),
  zodiacGemini: Object.freeze({
    id: "zodiac_gemini",
    nameJa: "複製",
    descriptionJa: "最初に使用したスキル・魔法をSP消費なしでもう一度発動（1戦闘1回）。",
  }),
  zodiacCancer: Object.freeze({
    id: "zodiac_cancer",
    nameJa: "防御反撃",
    descriptionJa: "防御時ダメージ大幅軽減。軽減分の一部を次の攻撃へ加算。",
  }),
  zodiacLeo: Object.freeze({
    id: "zodiac_leo",
    nameJa: "火力特化",
    descriptionJa: "攻撃力+30%。敵撃破ごとに攻撃力+10%。ボス戦は会心率+25%。",
  }),
  zodiacVirgo: Object.freeze({
    id: "zodiac_virgo",
    nameJa: "回復・継戦",
    descriptionJa: "戦闘終了時HP/SP20%回復。致死ダメージを1度だけHP1で耐える。",
  }),
  zodiacLibra: Object.freeze({
    id: "zodiac_libra",
    nameJa: "格上対策",
    descriptionJa: "格上の敵との能力差の50%を一時的に自分へ加算。",
  }),
  zodiacScorpio: Object.freeze({
    id: "zodiac_scorpio",
    nameJa: "毒・継続",
    descriptionJa: "死毒付与。毒状態の敵への会心率上昇。",
  }),
  zodiacSagittarius: Object.freeze({
    id: "zodiac_sagittarius",
    nameJa: "必中",
    descriptionJa: "命中率100%。回避・幻影無視。弱点攻撃1.75倍。",
  }),
  zodiacCapricorn: Object.freeze({
    id: "zodiac_capricorn",
    nameJa: "長期戦",
    descriptionJa: "ターン経過で全能力上昇。",
  }),
  zodiacAquarius: Object.freeze({
    id: "zodiac_aquarius",
    nameJa: "魔力解放",
    descriptionJa: "SP消費0を3回付与。最大SP+20%。",
  }),
  zodiacPisces: Object.freeze({
    id: "zodiac_pisces",
    nameJa: "復活",
    descriptionJa: "1探索につき1回、HP50%で復活。復活直後1ターン完全回避。",
  }),
});

export function getCardEffectById(effectId) {
  return Object.values(CARD_EFFECTS).find((effect) => effect.id === effectId) ?? null;
}
