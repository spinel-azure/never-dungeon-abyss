export const TOWN_FACILITIES = Object.freeze([
  {
    id: "inn",
    label: "宿屋",
    keeper: "女将",
    image: "images/npc/NPC_11.avif",
    greeting: "おかえりなさい。まずは身体を休めていってくださいな。",
    services: ["HP/SP回復", "持ち帰った経験値の精算", "レベルアップ"]
  },
  {
    id: "guild",
    label: "ギルド",
    keeper: "ギルド長",
    image: "images/npc/NPC_10.avif",
    greeting: "見ない顔だな。流れ者か？",
    services: ["キャラクター登録", "依頼受注", "依頼報告"]
  },
  {
    id: "temple",
    label: "寺院",
    keeper: "司祭",
    image: "images/npc/NPC_12.avif",
    greeting: "迷える魂に、女神の導きがありますように。",
    services: ["死亡した冒険者の蘇生"]
  },
  {
    id: "shop",
    label: "商店",
    keeper: "女主人",
    image: "images/npc/NPC_13.avif",
    greeting: "買うのかい、売るのかい？　冷やかしならお断りだよ。",
    services: ["装備品の売買", "アイテムの売買"]
  },
  {
    id: "transfer",
    label: "？？？？？",
    keeper: "？？？？？",
    image: null,
    greeting: "古びた転送陣は、まだ沈黙している。",
    services: ["転送陣（予定）"],
    unavailable: true
  },
  {
    id: "dungeon",
    label: "ダンジョン",
    keeper: "",
    image: null,
    greeting: "奈落へ続く階段が、静かに口を開けている。",
    services: ["ダンジョンへ潜る"]
  }
]);

export const CHARACTER_JOBS = Object.freeze([
  { id: "warrior", label: "WARRIOR" },
  { id: "mage", label: "MAGE" },
  { id: "thief", label: "THIEF" }
]);

export function getTownFacility(id) {
  return TOWN_FACILITIES.find(facility => facility.id === id) || null;
}

