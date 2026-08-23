import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("warehouse uses the inventory-style ten-entry paged interface", async () => {
  const [html, town, main, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../css/town.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /townStorageDescription/);
  assert.match(html, /townStoragePager[\s\S]*data-storage-nav="back"[\s\S]*data-storage-nav="next"/);
  assert.match(town, /Math\.ceil\(town\.commerceItems\.length \/ 10\)/);
  assert.match(town, /slice\(town\.storagePage \* 10, town\.storagePage \* 10 \+ 10\)/);
  assert.match(town, /storageFocus === "tabs"/);
  assert.match(town, /action === "pageLeft" \|\| action === "pageRight"/);
  assert.match(town, /changeStoragePage\(action === "left" \? -1 : 1\)/);
  assert.match(main, /worldLocation === "town" && handleTownInput\(action\)/);
  assert.match(css, /town-commerce-overlay\.is-storage[^{]*\{[^}]*grid-template-rows/);
  assert.match(css, /repeat\(10,minmax\(22px,1fr\)\)/);
  assert.match(css, /town-storage-tabs button\.is-cursor/);
});
