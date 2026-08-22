import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getBossById } from "../data/bosses.js";
import { grantCard, getOwnedCardCount } from "../data/deck.js";
import { getCardById } from "../data/cards.js";
import { createBattleState } from "../combat/battle-engine.js";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const battleSource = fs.readFileSync(new URL("../js/battle.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("Mana Booster restores only SP and presents it in the SP status area", () => {
  let character = createInitialCharacter({ name: "BOOST", job: "mage" });
  character.level = 50;
  character = normalizeCharacter(character);
  character.cards = grantCard(character.cards, "legendary_mana_booster", 1, 99).cards;
  character.cards.deckSlots[0] = "legendary_mana_booster";
  character = normalizeCharacter(character);
  character.hp = 3;
  character.sp = 0;
  const battle = createBattleState({
    character,
    enemy: { id: "dummy", name: "DUMMY", hp: 1, maxHp: 1, sp: 0, maxSp: 0, attack: 0, def: 0, stats: {}, statuses: [] }
  });
  assert.equal(battle.player.hp, 3);
  assert.ok(battle.player.sp > 0);
  assert.match(html, /id="battlePlayerSpNumbers"/);
  assert.match(battleSource, /kind === "sp-healing" \? "battlePlayerSpNumbers" : "battlePlayerNumbers"/);
});

test("Todes Scorpio grants the unique Zodiac Scorpio card through the boss reward path", () => {
  const boss = getBossById("todes_scorpio_b64f");
  assert.deepEqual(boss.reward, { type: "card", cardId: "zodiac_scorpio", amount: 1 });
  const card = getCardById(boss.reward.cardId);
  assert.equal(card.nameJa, "スコルピオ");
  assert.equal(card.rarity, "Z");
  assert.equal(card.maxOwned, 1);
  const once = grantCard(null, boss.reward.cardId, boss.reward.amount, 99);
  const twice = grantCard(once.cards, boss.reward.cardId, boss.reward.amount, 99);
  assert.equal(getOwnedCardCount(once.cards, boss.reward.cardId), 1);
  assert.equal(twice.gained, 0);
  assert.match(mainSource, /showCardGetEffect\(victory\.reward\.cardId, \{ seId: "itemGet" \}\), 120/);
  assert.match(mainSource, /Zカード「\$\{card\?\.nameJa/);
});
