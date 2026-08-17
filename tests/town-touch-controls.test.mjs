import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("town overlays expose touch controls for quantities and paged lists", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const source = await readFile(new URL("js/town.js", root), "utf8");

  assert.equal((html.match(/data-commerce-step=/g) || []).length, 4);
  assert.match(html, /data-quest-page="-1"[\s\S]*data-quest-page="1"/);
  assert.match(html, /data-transfer-page="-1"[\s\S]*data-transfer-page="1"/);
  assert.match(source, /data-commerce-step[\s\S]*handleCommerceQuantityInput\(action\)/);
  assert.match(source, /data-quest-page[\s\S]*changeQuestPage/);
  assert.match(source, /data-transfer-page[\s\S]*changeTransferPage/);
});

test("transfer destinations require selection before a second tap activates them", async () => {
  const source = await readFile(new URL("js/town.js", root), "utf8");

  assert.match(source, /transferPointerArmedIndex === index[\s\S]*activateTransferSelection\(index\)/);
  assert.match(source, /transferIndex = index;[\s\S]*transferPointerArmedIndex = index/);
  assert.match(source, /changeTransferPage[\s\S]*transferPointerArmedIndex = -1/);
});
