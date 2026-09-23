// Display-only catalog entries; item mechanics remain in items.js / key-items.js.
export const ITEM_COMPENDIUM_TABS = Object.freeze(["すべて", "消耗品", "換金・素材", "貴重品"]);
export function filterItemCompendiumEntries(entries, tab = "すべて") {
  return entries.filter(entry => tab === "すべて" || entry.category === tab);
}
export const ITEM_COMPENDIUM_ENTRIES = Object.freeze({
  queen_necklace: Object.freeze({
    id: "queen_necklace",
    name: "女王の首飾り",
    category: "貴重品",
    acquisition: "依頼032「女王の影を追え――その3」",
    purchasePrice: null,
    description: "カッツェンラントの女王が身に着けていたと言われる首飾り。柑橘系の匂いがする。所持しているだけでそのフロアのミニマップを全て表示する。ただしB100Fでは無効。"
  }),
  warding_incense: Object.freeze({
    "id": "warding_incense",
    "name": "魔除けのお香",
    "category": "消耗品",
    "acquisition": "イベント入手",
    "purchasePrice": null,
    "description": "迷宮探検家トレリーレンから譲り受けたお香。使用すると気配ゲージが上昇しなくなる。帰還または、別区域に移動するまで効果が持続する。このお香のおかげで、彼女は危険な奈落を安全に闊歩出来るのである。"
  }),
  queen_earring: Object.freeze({
    "id": "queen_earring",
    "name": "女王のイヤリング",
    "category": "貴重品",
    "acquisition": "依頼024「女王の影を追え――その2」",
    "purchasePrice": null,
    "description": "カッツェンラントの女王が身に着けていたと言われるイヤリング。柑橘系の匂いがする。所持しているだけで「階段探知」および「宝箱探知」と同じ効果がある。"
  }),
  lichtbringer: Object.freeze({
    id: "lichtbringer",
    name: "リヒトブリンガー",
    category: "貴重品",
    acquisition: "イベント入手",
    purchasePrice: null,
    description: "ドイツ語で「光もたらすもの」を意味する光の球。完全なる闇に閉ざされた漆黒区域を照らし出す。英語でライトブリンガーでも良かったんだけど、こっちの方が何となく語感がいいじゃない？ｗ"
  }),
  wing_gift: Object.freeze({
    id: "wing_gift",
    name: "ウィングギフト",
    category: "消耗品",
    acquisition: "商店購入",
    purchasePrice: 10000,
    description: "飲むと何かを授けられそうな滋養飲料。使用するとSPが50%回復するがその冒険中、ベース最大HPが20％減算される。効果は累積し最大4回まで使用可。カフェインの取り過ぎにはご用心…。"
  }),
  queen_tiara: Object.freeze({
    id: "queen_tiara",
    name: "女王のティアラ",
    category: "貴重品",
    acquisition: "依頼008「女王の影を追え」",
    purchasePrice: null,
    description: "カッツェンラントの女王が身に着けていたと言われるティアラ。柑橘系の匂いがする。所持しているだけで「人捜し」と同じ効果がある。"
  })
});

export function getItemCompendiumEntry(id) {
  return ITEM_COMPENDIUM_ENTRIES[id] || null;
}
