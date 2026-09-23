import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getItemCompendiumEntry } from "../data/item-compendium.js";
import { getKeyItem } from "../data/key-items.js";

test("tiara draft has exact display copy without altering the real item", () => {
  const entry = getItemCompendiumEntry("queen_tiara");
  assert.equal(entry.name, getKeyItem(entry.id).name);
  assert.equal(entry.acquisition, "依頼008「女王の影を追え」");
  assert.equal(entry.purchasePrice, null);
  assert.equal(entry.description, "カッツェンラントの女王が身に着けていたと言われるティアラ。柑橘系の匂いがする。所持しているだけで「人捜し」と同じ効果がある。");
  assert.ok(Array.from(entry.description).length <= 90);
  assert.notEqual(entry.description, getKeyItem(entry.id).description);
  assert.equal(getItemCompendiumEntry("missing"), null);
});

test("library item catalog is wired into the menu", async () => {
  const main=await readFile(new URL('../js/main.js',import.meta.url),'utf8');
  const town=await readFile(new URL('../js/town.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(main.includes('onOpenItemCompendium: openLibraryItemCompendium'));
  assert.ok(town.includes('town.onOpenItemCompendium()'));
  assert.ok(html.includes('data-menu-view="itemCompendium"'));
});
test("wing gift catalog preserves the requested wording and display price",()=>{
  const entry=getItemCompendiumEntry('wing_gift');
  assert.equal(entry.category,'消耗品');
  assert.equal(entry.acquisition,'商店購入');assert.equal(entry.purchasePrice,10000);
  assert.equal(entry.description,'飲むと何かを授けられそうな滋養飲料。使用するとSPが50%回復するがその冒険中、ベース最大HPが20％減算される。効果は累積し最大4回まで使用可。カフェインの取り過ぎにはご用心…。');
});
