import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const townSource = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
const townCss = await readFile(new URL("../css/town.css", import.meta.url), "utf8");

test("borrowing Johanna's cat locks input for two seconds and swaps the portrait while dark", () => {
  assert.match(mainSource, /completionFlag: "johanna_cat_borrow_transition"[\s\S]*autoCompleteAfterMs: 2000/);
  assert.match(townSource, /beginJohannaCatBlackout\(result\.completionFlag, result\.autoCompleteAfterMs\)/);
  assert.match(townSource, /town\.transitioning = true;[\s\S]*classList\.add\("is-inn-cat-blackout"\)[\s\S]*renderFacility\(\)/);
  assert.match(townCss, /\.town-screen\.is-inn-cat-blackout::after\{opacity:1\}/);
});

test("returning Johanna's cat waits for her dialogue and removes it during blackout", () => {
  assert.match(mainSource, /危ない目には遭わなかったかい？";[\s\S]*completionFlag: "johanna_cat_return_transition"/);
  assert.match(townSource, /JOHANNA_CAT_RETURN_TRANSITION_FLAG[\s\S]*beginJohannaCatBlackout/);
  assert.match(mainSource, /flag === "johanna_cat_return_transition"[\s\S]*consumeKeyItem\(character\.keyItems, "johanna_calico_cat"\)/);
});

test("the peaceful Sphinx reward displays its card popup after state settlement", () => {
  assert.match(mainSource, /showCardGetEffect\("legendary_sphinx_wisdom", \{ seId: "itemGet" \}\), 120/);
});
