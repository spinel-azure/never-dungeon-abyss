import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialCharacter } from "../data/classes.js";
import { recordMonsterDefeat, recordMonsterDrop, recordMonsterEncounter } from "../data/compendium.js";
import {
  getMonsterCompendiumCatalog,
  getMonsterCompendiumCompletion,
  getMonsterCompendiumEntries,
  MONSTER_COMPENDIUM_FILTERS
} from "../data/monster-compendium.js";
import { getAdventureRecords } from "../data/adventure-records.js";

test("monster compendium exposes the requested floor filters and masks unknown public entries", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const entries = getMonsterCompendiumEntries(character, "1");
  assert.deepEqual(MONSTER_COMPENDIUM_FILTERS, ["ALL", "1", "10", "20", "30", "40", "50", "60", "70", "80", "90"]);
  assert.ok(entries.some(entry => entry.id === "abyss_rat"));
  assert.ok(entries.some(entry => entry.id === "strange_knight_statue_b9f"));
  assert.equal(entries.find(entry => entry.id === "abyss_rat").name, "？？？？？");
  assert.equal(entries.find(entry => entry.id === "abyss_rat").image, "");
  assert.equal(entries.find(entry => entry.id === "abyss_rat").habitat, "？？？？？");
});

test("secret and event monsters have no pre-encounter slot but appear after encounter", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(getMonsterCompendiumEntries(character).some(entry => entry.id === "todes_scorpio_b64f"), false);
  assert.equal(getMonsterCompendiumEntries(character).some(entry => entry.id === "amayenak_b100f"), false);
  character.compendium = recordMonsterEncounter(character.compendium, "todes_scorpio_b64f");
  const encountered = getMonsterCompendiumEntries(character, "60").find(entry => entry.id === "todes_scorpio_b64f");
  assert.equal(encountered.name, "トーデス・スコルピオ");
  assert.equal(encountered.defeated, false);
  assert.equal(encountered.maxHp, "？？？");
});

test("encounter, defeat, and discovered drop progressively unlock monster details", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.compendium = recordMonsterEncounter(character.compendium, "abyss_rat");
  let rat = getMonsterCompendiumEntries(character, "1").find(entry => entry.id === "abyss_rat");
  assert.equal(rat.name, "奈落ネズミ");
  assert.equal(rat.habitat, "B1F～B10F");
  assert.equal(rat.maxHp, "？？？");
  assert.equal(rat.drops, "討伐後に記録");

  character.compendium = recordMonsterDefeat(character.compendium, "abyss_rat", 2);
  rat = getMonsterCompendiumEntries(character, "1").find(entry => entry.id === "abyss_rat");
  assert.equal(rat.maxHp, "12");
  assert.equal(rat.defeatCount, 2);
  assert.equal(rat.drops, "？？？？");

  character.compendium = recordMonsterDrop(character.compendium, "abyss_rat", "rat_tail");
  rat = getMonsterCompendiumEntries(character, "1").find(entry => entry.id === "abyss_rat");
  assert.equal(rat.drops, "ネズミのしっぽ");
});

test("completion rate counts defeated public entries without leaking hidden catalog size", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const catalog = getMonsterCompendiumCatalog();
  const publicTotal = catalog.filter(entry => !entry.hiddenUntilEncounter).length;
  let completion = getMonsterCompendiumCompletion(character);
  assert.equal(completion.total, publicTotal);
  assert.equal(completion.percentage, 0);

  character.compendium = recordMonsterDefeat(character.compendium, "abyss_rat");
  character.compendium = recordMonsterDefeat(character.compendium, "todes_scorpio_b64f");
  completion = getMonsterCompendiumCompletion(character);
  assert.equal(completion.defeated, 1);
  assert.equal(completion.total, publicTotal);
  assert.equal(completion.percentage, Math.floor(100 / publicTotal));

  const record = getAdventureRecords(character).find(entry => entry.id === "bestiaryCompletion");
  assert.equal(record.disabled, undefined);
  assert.equal(record.value, `${completion.percentage}%`);
});

test("library and menu connect the monster compendium without versioned internal imports", async () => {
  const [main, menu, town, html] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(main, /onOpenMonsterCompendium: openLibraryMonsterCompendium/);
  assert.match(menu, /from "\.\/monster-compendium\.js"/);
  assert.doesNotMatch(menu, /monster-compendium\.js\?v=/);
  assert.match(town, /town\.onOpenMonsterCompendium\(\)/);
  assert.match(html, /data-menu-view="monsterCompendium"/);
  assert.match(html, /data-monster-compendium-filter="90"/);
});
