// Display-only drafts. Not connected to the public library menu yet.
export const ITEM_COMPENDIUM_TABS = Object.freeze(["すべて", "消耗品", "換金・素材", "貴重品"]);
export function filterItemCompendiumEntries(entries, tab = "すべて") {
  return entries.filter(entry => tab === "すべて" || entry.category === tab);
}
export const ITEM_COMPENDIUM_ENTRIES = Object.freeze({
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
