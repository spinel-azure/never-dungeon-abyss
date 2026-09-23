// Display-only catalog entries; item mechanics remain in items.js / key-items.js.
export const ITEM_COMPENDIUM_TABS = Object.freeze(["すべて", "消耗品", "換金・素材", "貴重品"]);
export function filterItemCompendiumEntries(entries, tab = "すべて") {
  return entries.filter(entry => tab === "すべて" || entry.category === tab);
}
export const ITEM_COMPENDIUM_ENTRIES = Object.freeze({
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
