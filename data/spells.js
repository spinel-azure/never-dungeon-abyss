export const SPELLS = Object.freeze({
  fireball: Object.freeze({
    id: "fireball",
    name: "火球",
    description: "必中する炎属性攻撃（魔法威力10＋INT×0.5）。\n行動速度－5。DEFを無視する。",
    actionType: "spell",
    category: "attackSpell",
    spCost: 5,
    target: "enemy",
    element: "fire",
    spellPower: 10,
    powerMultiplier: 1,
    unavoidable: true,
    speedModifier: -5,
    effects: []
  }),
  ice_bind: Object.freeze({
    id: "ice_bind",
    name: "氷縛",
    description: "必中の氷属性攻撃（魔法威力8＋INT×0.5）×0.8。\n行動速度－5。70%で速度－20（3ターン）。",
    actionType: "spell",
    category: "attackSpell",
    spCost: 8,
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
  healing_prayer: Object.freeze({
    id: "healing_prayer",
    name: "癒やしの祈り",
    description: "自分のHPを回復する。\n回復量は10＋INT×0.5。",
    actionType: "healing",
    category: "miracle",
    spCost: 5,
    target: "self",
    baseHealing: 10,
    speedModifier: 0
  })
});

export function getSpell(id) {
  return SPELLS[id] || null;
}
