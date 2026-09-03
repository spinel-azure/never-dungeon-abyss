import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import { grantCard } from "../data/deck.js";
import { applyTaurusDepthBonus, getTaurusDepthDefBonus } from "../data/taurus.js";
import { collectStats } from "../combat/collect-stats.js";

function heroWithTaurus() {
  let character = createInitialCharacter({ name: "TAURUS", job: "warrior" });
  character.level = 80;
  character = normalizeCharacter(character);
  character.cards = grantCard(character.cards, "zodiac_taurus", 1, 99).cards;
  character.cards.deckSlots[0] = "zodiac_taurus";
  return normalizeCharacter(character);
}

test("Taurus is a unique cost-eight Zodiac card with only the confirmed public description", () => {
  const card = getCardById("zodiac_taurus");
  assert.equal(card.rarity, "Z");
  assert.equal(card.cost, 8);
  assert.equal(card.maxOwned, 1);
  assert.equal(card.maxCopies, 1);
  assert.equal(card.maxHpMultiplier, 1.5);
  assert.equal(card.descriptionJa, "最大HPが50％上昇する。\n迷宮を深く潜るほどDEFが上昇する。");
  assert.doesNotMatch(card.descriptionJa, /10|3|60|200/);
  assert.equal("damageReduction" in card, false);
  assert.equal("statusImmunity" in card, false);
});

test("Taurus raises maximum HP by fifty percent after additive bonuses", () => {
  let base = createInitialCharacter({ name: "BASE", job: "warrior" });
  base.level = 80;
  base = normalizeCharacter(base);
  const before = base.maxHp;
  const taurus = heroWithTaurus();
  assert.equal(taurus.maxHp, Math.ceil(before * 1.5));
});

test("Taurus depth DEF follows ten-floor bands and caps its bonus at sixty", () => {
  const slots = ["zodiac_taurus"];
  assert.equal(getTaurusDepthDefBonus(slots, { location: "town", depth: 200 }), 0);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 1 }), 0);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 9 }), 0);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 10 }), 3);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 19 }), 3);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 100 }), 30);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 200 }), 60);
  assert.equal(getTaurusDepthDefBonus(slots, { location: "dungeon", depth: 999 }), 60);
});

test("Taurus applies a derived DEF bonus without storing or accumulating it", () => {
  const character = heroWithTaurus();
  const baseCardDef = Number(character.cardStatBonuses.def) || 0;
  const floor100 = applyTaurusDepthBonus(character, { location: "dungeon", depth: 100 });
  const floor10 = applyTaurusDepthBonus(character, { location: "dungeon", depth: 10 });
  const town = applyTaurusDepthBonus(character, { location: "town", depth: 200 });
  assert.equal(character.cardStatBonuses.def || 0, baseCardDef);
  assert.equal(floor100.cardStatBonuses.def, baseCardDef + 30);
  assert.equal(floor10.cardStatBonuses.def, baseCardDef + 3);
  assert.equal(town.cardStatBonuses.def, baseCardDef);
  assert.equal(collectStats(floor100).def, Math.min(60, collectStats(character).def + 30));
  assert.equal(applyTaurusDepthBonus(character, { location: "dungeon", depth: 100 }).cardStatBonuses.def, baseCardDef + 30);
});

test("main uses contextual Taurus stats for status, battle, traps, and lock checks", () => {
  const source = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const menuSource = fs.readFileSync(new URL("../js/menu.js", import.meta.url), "utf8");
  assert.match(source, /function getContextualCharacter\(\)/);
  assert.match(source, /getCharacter: \(\) => getContextualCharacter\(\)/);
  assert.match(source, /player: collectStats\(getContextualCharacter\(\)\)/);
  assert.match(source, /resolveTreasureTrap\(\{ character: getContextualCharacter\(\)/);
  assert.match(source, /onStatusOpened: updateCharacterUi/);
  assert.match(menuSource, /openStatusMenu\(\)[\s\S]*?menu\.onStatusOpened\(\)/);
  assert.match(menuSource, /key === "status"[\s\S]*?menu\.onStatusOpened\(\)/);
});

test("town receives the persistent character instead of a Taurus presentation copy", () => {
  const source = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const townStart = source.indexOf("configureTown({");
  const battleStart = source.indexOf("configureBattle({", townStart);
  const townConfiguration = source.slice(townStart, battleStart);

  assert.ok(townStart >= 0);
  assert.ok(battleStart > townStart);
  assert.match(townConfiguration, /getCharacter:\s*\(\)\s*=>\s*character,/);
  assert.doesNotMatch(townConfiguration, /getCharacter:\s*\(\)\s*=>\s*getContextualCharacter\(\),/);

  const character = createInitialCharacter({ name: "INN", job: "warrior" });
  const presentation = applyTaurusDepthBonus(character, { location: "town", depth: 1 });
  presentation.eventFlags = { ...presentation.eventFlags, inn_visited: true };

  assert.notEqual(presentation, character);
  assert.equal(character.eventFlags.inn_visited, undefined);
});
