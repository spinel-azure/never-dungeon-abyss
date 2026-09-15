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

test("draft detail is not wired into the shipped game", async () => {
  for (const file of ["../index.html", "../js/main.js", "../js/town.js"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:import.*|src=.*|href=.*)item-compendium/);
  }
  const town = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
  assert.match(town, /\["monsters", "records", "cards"\]\.includes\(command\)/);
});
