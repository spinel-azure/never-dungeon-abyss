import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("new characters see the deck tutorial while legacy recipients do not repeat it", () => {
  const newcomer = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(newcomer.deckTutorialSeen, false);

  const legacyRecipient = createInitialCharacter({ name: "OLD", job: "warrior" });
  delete legacyRecipient.deckTutorialSeen;
  legacyRecipient.eventFlags.inn_first_talk_card = true;
  assert.equal(normalizeCharacter(legacyRecipient).deckTutorialSeen, true);

  const legacyNewcomer = createInitialCharacter({ name: "OLD2", job: "warrior" });
  delete legacyNewcomer.deckTutorialSeen;
  assert.equal(normalizeCharacter(legacyNewcomer).deckTutorialSeen, false);
});

test("deck tutorial isolates and highlights the inn deck command", () => {
  assert.match(html, /id="deckTutorial"[\s\S]*?deck-tutorial-shade-top[\s\S]*?deck-tutorial-highlight/);
  assert.match(html, /手に入れたカードは宿屋にある「デッキ編成」で/);
  assert.match(css, /\.deck-tutorial-shade[\s\S]*?background:\s*rgba\(0, 0, 0, \.6\)/);
  assert.match(css, /\.deck-tutorial-highlight[\s\S]*?box-shadow:[^;]*rgba\(80, 232, 255, \.95\)/);
  assert.match(css, /\.deck-tutorial-content[\s\S]*?left:\s*50%[\s\S]*?translateX\(-50%\)/);
  assert.match(css, /\.deck-tutorial-content p[\s\S]*?margin:\s*0 auto[\s\S]*?text-align:\s*left/);
  assert.match(main, /querySelector\('\[data-facility-command="deck"\]'\)/);
  assert.match(main, /--deck-hole-left[\s\S]*?--deck-hole-top[\s\S]*?--deck-hole-width[\s\S]*?--deck-hole-height/);
});

test("lucky charm acquisition starts one locked three-second tutorial", () => {
  assert.match(main, /gained && facilityId === "inn" && !character\?\.deckTutorialSeen/);
  assert.match(main, /setPlayerInputEnabled\(false\)[\s\S]*?deckTutorialTimer = window\.setTimeout\([\s\S]*?say\("＊Aボタンで次へ"\);[\s\S]*?3000\)/);
  assert.match(main, /function handleBlockingTutorialInput[\s\S]*?if \(!deckTutorialActive\) return false;[\s\S]*?action === "confirm"/);
  assert.match(main, /character\.deckTutorialSeen = true;[\s\S]*?saveGame\(\);[\s\S]*?setPlayerInputEnabled\(true\)/);
  assert.match(html, /js\/main\.js\?v=20260904-02/);
});
