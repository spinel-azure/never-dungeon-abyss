export const TOWN_FACILITIES = Object.freeze([
  {
    id: "inn",
    label: "宿屋",
    keeper: "女将",
    image: "images/npc/NPC_11.avif",
    background: "images/background/town_02.avif",
    greeting: "おかえりなさい。まずは身体を休めていってくださいな。",
    services: ["HP/SP回復", "持ち帰った経験値の精算", "レベルアップ"]
  },
  {
    id: "guild",
    label: "ギルド",
    keeper: "ギルド長",
    image: "images/npc/NPC_10.avif",
    background: "images/background/town_05.avif",
    greeting: "見ない顔だな。流れ者か？",
    services: ["キャラクター登録", "依頼受注", "依頼報告"]
  },
  {
    id: "temple",
    label: "寺院",
    keeper: "司祭",
    image: "images/npc/NPC_12.avif",
    background: "images/background/town_03.avif",
    greeting: "迷える魂に、女神の導きがありますように。",
    services: ["死亡した冒険者の蘇生"]
  },
  {
    id: "shop",
    label: "商店",
    keeper: "女主人",
    image: "images/npc/NPC_13.avif",
    background: "images/background/town_04.avif",
    greeting: "買うのかい、売るのかい？　冷やかしならお断りだよ。",
    services: ["装備品の売買", "アイテムの売買"]
  },
  {
    id: "library",
    label: "図書館",
    keeper: "",
    portraitAlt: "図書館の主",
    image: "images/npc/NPC_14.avif",
    background: "images/background/town_06.avif",
    greeting: "…何を…見たいのかしら…？",
    services: ["魔物図鑑", "アイテム図鑑", "カード図鑑", "冒険記録"]
  },
  {
    id: "dungeon",
    label: "ダンジョン",
    keeper: "",
    image: null,
    background: "images/background/dungeon_01.avif",
    greeting: "奈落へ続く階段が、静かに口を開けている。",
    services: ["ダンジョンへ潜る"]
  }
]);

export const CHARACTER_JOBS = Object.freeze([
  { id: "warrior", label: "WARRIOR" },
  { id: "mage", label: "MAGE" },
  { id: "thief", label: "THIEF" },
  { id: "priest", label: "PRIEST" }
]);

export function getTownFacility(id) {
  return TOWN_FACILITIES.find(facility => facility.id === id) || null;
}
