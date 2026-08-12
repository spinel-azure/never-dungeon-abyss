export const ITEMS = Object.freeze([
  Object.freeze({
    number: 1, id: "healing_potion", name: "回復薬（小）", category: "recovery",
    buyPrice: 20, sellPrice: 10, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "heal_hp", value: 30 }]),
    description: "HPを30回復する。", maxOwned: 99, iconId: "healing-potion", version: 1
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
    buyPrice: 50, sellPrice: 25, source: "temple", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "reset_presence", value: 0 }, { id: "suppress_presence_steps", value: 30 }]),
    description: "気配を0に戻し、30歩の間、気配の上昇を抑える。", maxOwned: 99,
    iconId: "exorcism-talisman", version: 1
  }),
  Object.freeze({
    number: 5, id: "holy_water", name: "聖水", category: "battle",
    buyPrice: 20, sellPrice: 10, source: "temple", usableIn: Object.freeze(["battle"]),
    effects: Object.freeze([{ id: "banish_undead", value: 1 }]),
    description: "アンデッドを即座に消滅させる。経験値は得られず、ボスには無効。", maxOwned: 99,
    iconId: "holy-water", version: 1
  }),
  Object.freeze({
    number: 6, id: "treasure_compass", name: "トレジャーコンパス", category: "exploration",
    buyPrice: 100, sellPrice: 50, source: "shop", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "reveal_treasures_until_return", value: 1 }]),
    description: "帰還するまで、迷宮内の宝箱をミニマップに★で表示する。", maxOwned: 99,
    iconId: "treasure-compass", version: 1
  }),
  Object.freeze({
    number: 7, id: "auto_walker", name: "オートウォーカー", category: "exploration",
    buyPrice: 100, sellPrice: 50, source: "shop", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "auto_walk_to_stairs_up", value: 1 }]),
    description: "確定エリアを経由して上り階段までオート移動する。移動中、何か操作すると移動中断。移動中に戦闘した場合、戦闘終了後効果継続。",
    maxOwned: 99, iconId: "auto-walker", version: 1
  }),
  Object.freeze({
    number: 8, id: "rat_tail", name: "ネズミのしっぽ", category: "material",
    buyPrice: 0, sellPrice: 3, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "奈落ネズミのしっぽ。売却専用。", maxOwned: 99,
    repurchasable: false, iconId: "rat-tail", version: 1
  }),
  Object.freeze({
    number: 9, id: "slime_jelly", name: "スライムゼリー", category: "material",
    buyPrice: 0, sellPrice: 5, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "洞窟スライムから採れるゼリー。売却専用。", maxOwned: 99,
    repurchasable: false, iconId: "slime-jelly", version: 1
  }),
  Object.freeze({
    number: 10, id: "rabbit_fur", name: "ウサギの毛皮", category: "material",
    buyPrice: 0, sellPrice: 10, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "奈落ウサギの毛皮。売却専用。", maxOwned: 99,
    repurchasable: false, iconId: "rabbit-fur", version: 1
  }),
  Object.freeze({
    number: 11, id: "dead_bones", name: "亡者の遺骨", category: "material",
    buyPrice: 0, sellPrice: 0, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "さまよう亡者が遺した骨。用途はまだ分からない。", maxOwned: 99,
    iconId: "dead-bones", version: 1
  }),
  Object.freeze({
    number: 12, id: "snake_skin", name: "蛇皮", category: "material",
    buyPrice: 0, sellPrice: 30, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "ヴァイパーから剥ぎ取った丈夫な皮。売却専用。", maxOwned: 99,
    repurchasable: false, iconId: "snake-skin", version: 1
  }),
  Object.freeze({
    number: 13, id: "bat_wing", name: "コウモリの羽", category: "material",
    buyPrice: 0, sellPrice: 20, source: "drop", usableIn: Object.freeze([]),
    effects: Object.freeze([]), description: "吸血コウモリの羽。売却専用。", maxOwned: 99,
    repurchasable: false, iconId: "bat-wing", version: 1
  }),
  Object.freeze({
    number: 14, id: "healing_potion_medium", name: "回復薬（中）", category: "recovery",
    buyPrice: 60, sellPrice: 30, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "heal_hp", value: 60 }]),
    description: "HPを60回復する。B10F到達後に商店へ入荷する。", maxOwned: 99,
    iconId: "healing-potion", version: 1, shopUnlockDepth: 10
  }),
  Object.freeze({
    number: 15, id: "healing_potion_large", name: "回復薬（大）", category: "recovery",
    buyPrice: 120, sellPrice: 60, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "heal_hp", value: 120 }]),
    description: "HPを120回復する。B20F到達後に商店へ入荷する。", maxOwned: 99,
    iconId: "healing-potion", version: 1, shopUnlockDepth: 20
  }),
  Object.freeze({
    number: 16, id: "styptic", name: "止血剤", category: "recovery",
    buyPrice: 30, sellPrice: 15, source: "shop", usableIn: Object.freeze(["town", "dungeon", "battle"]),
    effects: Object.freeze([{ id: "cure_bleeding", value: 1 }, { id: "heal_hp", value: 15 }]),
    description: "出血を治療し、HPを15回復する。出血していなくても使用可能。", maxOwned: 99,
    iconId: "styptic", version: 1
  }),
  Object.freeze({
    number: 17, id: "emergency_escape", name: "緊急脱出", category: "exploration",
    buyPrice: 2000, sellPrice: 1000, source: "shop", usableIn: Object.freeze(["dungeon"]),
    effects: Object.freeze([{ id: "emergency_escape", value: 1 }]),
    description: "ダンジョンから強制的に脱出する。", maxOwned: 99,
    iconId: "emergency-escape", version: 1
  })
]);

const BASE_SHOP_ITEM_IDS = Object.freeze([
  "healing_potion", "antidote", "styptic", "guiding_torch", "treasure_compass", "auto_walker", "emergency_escape"
]);

export function getShopItemIdsForDepth(depth = 1) {
  const reached = Math.max(1, Math.floor(Number(depth) || 1));
  return [
    "healing_potion",
    ...(reached >= 10 ? ["healing_potion_medium"] : []),
    ...(reached >= 20 ? ["healing_potion_large"] : []),
    ...BASE_SHOP_ITEM_IDS.slice(1)
  ];
}

export function getShopItemIdsForCharacter(character) {
  const flags = character?.eventFlags || {};
  return [
    "healing_potion",
    ...(flags.transfer_portal_b10f_unlocked ? ["healing_potion_medium"] : []),
    ...(flags.shop_stock_b20f_unlocked ? ["healing_potion_large"] : []),
    ...BASE_SHOP_ITEM_IDS.slice(1)
  ];
}

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
