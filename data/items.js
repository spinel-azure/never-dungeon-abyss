export const ITEMS = Object.freeze([
  Object.freeze({
    number: 1, id: "healing_potion", name: "回復薬", category: "recovery",
    buyPrice: 20, sellPrice: 10, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "heal_hp", value: 20 }]),
    description: "HPを20回復する。", maxOwned: 99, iconId: "healing-potion", version: 1
  }),
  Object.freeze({
    number: 2, id: "antidote", name: "解毒剤", category: "recovery",
    buyPrice: 30, sellPrice: 15, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "cure_poison", value: 1 }, { id: "heal_hp", value: 15 }]),
    description: "毒を治療し、HPを15回復する。毒でなくても使用可能。", maxOwned: 99,
    iconId: "antidote", version: 1
  }),
  Object.freeze({
    number: 3, id: "guiding_torch", name: "導きのたいまつ", category: "exploration",
    buyPrice: 40, sellPrice: 20, source: "shop", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "restore_torch", value: 100 }]),
    description: "たいまつの残量を最大まで回復する。", maxOwned: 99, iconId: "guiding-torch", version: 1
  }),
  Object.freeze({
    number: 4, id: "exorcism_talisman", name: "退魔の護符", category: "exploration",
    buyPrice: 50, sellPrice: 0, source: "temple", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "reset_presence", value: 0 }, { id: "suppress_presence_steps", value: 30 }]),
    description: "気配を0に戻し、30歩の間、気配の上昇を抑える。", maxOwned: 99,
    iconId: "exorcism-talisman", version: 1
  }),
  Object.freeze({
    number: 5, id: "holy_water", name: "聖水", category: "battle",
    buyPrice: 70, sellPrice: 0, source: "temple", usableIn: Object.freeze(["battle"]),
    effects: Object.freeze([{ id: "banish_undead", value: 1 }]),
    description: "アンデッドを即座に消滅させる。経験値は得られず、ボスには無効。", maxOwned: 99,
    iconId: "holy-water", version: 1
  }),
  Object.freeze({
    number: 6, id: "treasure_compass", name: "トレジャーコンパス", category: "exploration",
    buyPrice: 500, sellPrice: 250, source: "shop", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "reveal_treasures_until_return", value: 1 }]),
    description: "帰還するまで、迷宮内の宝箱をミニマップに★で表示する。", maxOwned: 99,
    iconId: "treasure-compass", version: 1
  })
]);

const ITEMS_BY_ID = Object.freeze(Object.fromEntries(ITEMS.map(item => [item.id, item])));

export function getItem(id) {
  return ITEMS_BY_ID[String(id || "")] || null;
}

export function getItems(ids) {
  return (ids || []).map(getItem).filter(Boolean);
}

export function canUseItemIn(item, context) {
  return Boolean(item?.usableIn?.includes(context));
}
