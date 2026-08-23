import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("inventory separates page navigation from tab navigation", async () => {
  const [menu, main, gamepad, css] = await Promise.all([
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/gamepad-input.js", import.meta.url), "utf8"),
    readFile(new URL("../css/game-menu.css", import.meta.url), "utf8")
  ]);
  assert.match(menu, /action === "left" \|\| action === "right"[\s\S]*?movePage/);
  assert.match(menu, /action === "pageLeft" \|\| action === "pageRight"[\s\S]*?switchTab/);
  assert.match(menu, /inventoryFocus === "tabs"/);
  assert.match(menu, /backButton\.disabled = menu\.inventoryPage <= 0/);
  assert.match(menu, /inventoryFocus: "tabs"[\s\S]*?renderInventory/);
  assert.match(gamepad, /pageLeft" \|\| action === "pageRight"\) dispatchAction\?\.\(action\)/);
  assert.match(main, /pageLeft" \|\| action === "pageRight"\)[\s\S]*?handleMenuInput\(action\)/);
  assert.match(css, /inventory-tabs button\.is-cursor/);
  assert.match(css, /inventory-tab-cursor-glow/);
  assert.match(css, /prefers-reduced-motion:reduce[^}]*inventory-tabs button\.is-cursor/);
  assert.match(menu, /装備可能職：\$\{allowedJobs\.map/);
  assert.match(menu, /allowedJobs\.includes\(character\?\.job\)/);
});
