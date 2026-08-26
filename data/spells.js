export const SPELLS = Object.freeze({
  fireball: Object.freeze({
    id: "fireball",
    name: "炎よ、燃やせ！",
    description: "必中する小威力の火属性攻撃。\n自身の行動順－5。DEFを無視する。",
    actionType: "spell",
    category: "attackSpell",
    spCost: 3,
    target: "enemy",
    element: "fire",
    spellPower: 10,
    powerMultiplier: 1,
    unavoidable: true,
    presentationId: "fire_ball",
    speedModifier: -5,
    effects: []
  }),
  ice_bind: Object.freeze({
    id: "ice_bind",
    name: "氷よ、貫け！",
    description: "必中する小威力の氷属性攻撃。\n自身の行動順－5。DEFを無視する。\n70％の確率で敵の行動順－20（3ターン持続）。",
    actionType: "spell",
    category: "attackSpell",
    spCost: 5,
    target: "enemy",
    element: "ice",
    spellPower: 8,
    powerMultiplier: 0.8,
    unavoidable: true,
    speedModifier: -5,
    effects: Object.freeze([{
      statusId: "speed_down",
      trigger: "perAction",
      statusKind: "magical",
      baseRate: 0.7
    }])
  }),
  lightning_pierce: Object.freeze({
    id: "lightning_pierce",
    name: "雷よ、穿て！",
    description: "必中する小威力の雷属性攻撃。\n自身の行動順－5。DEFを無視する。\n30％の確率で敵を感電させる。",
    actionType: "spell",
    category: "attackSpell",
    spCost: 7,
    target: "enemy",
    element: "lightning",
    spellPower: 8,
    powerMultiplier: 0.8,
    unavoidable: true,
    speedModifier: -5,
    effects: Object.freeze([{
      statusId: "electrified",
      trigger: "perAction",
      statusKind: "magical",
      baseRate: 0.3
    }])
  }),
  healing_prayer: Object.freeze({
    id: "healing_prayer",
    name: "癒やしの祈り",
    description: "自分のHPを回復する。\n回復量は10＋INT×1.0。",
    actionType: "healing",
    category: "miracle",
    spCost: 3,
    target: "self",
    baseHealing: 10,
    intelligenceMultiplier: 1,
    speedModifier: 0
  })
});

export function getSpell(id) {
  return SPELLS[id] || null;
}
