import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createInitialCharacter, normalizeCharacter, getCharacterClass } from "../data/classes.js";
import {
  MAX_LEVEL,
  getExperienceForLevel,
  getLevelForExperience,
  getLevelGrowth,
  getNextLevelExperience,
  normalizeExperience
} from "../data/growth.js";
import { grantKeyItem, hasKeyItem } from "../data/key-items.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import {
  REINCARNATION_GODDESSES,
  getPhysicalReincarnationMultiplier,
  getSpellReincarnationMultiplier,
  normalizeReincarnationCount
} from "../data/reincarnation.js";
import {
  applyReincarnation,
  getReincarnationPreview,
  hasReincarnationQualification
} from "../js/reincarnation-service.js";
import { preparePlayerPhysicalAttack } from "../combat/player-physical-attack.js";
import { resolveSpell } from "../combat/resolve-spell.js";
import { getAdventureChronicle } from "../data/adventure-records.js";

function eligible(job = "warrior", count = 0) {
  let character = createInitialCharacter({ name: "転生試験", job });
  character.level = MAX_LEVEL;
  character.reincarnationCount = count;
  character.experience = getExperienceForLevel(MAX_LEVEL, count);
  character.gold = 9_000_000;
  character.eventFlags.boss_amayenak_b100f_defeated = true;
  character.keyItems = grantKeyItem(character.keyItems, "royal_cat_medal").keyItems;
  return normalizeCharacter(character);
}

test("reincarnation growth adds exactly one Lv1-to-Lv197 cycle per reincarnation", () => {
  const jobs = {
    warrior: [[999, 650], [1968, 1285], [2937, 1920], [3906, 2555]],
    thief: [[850, 750], [1675, 1480], [2500, 2210], [3325, 2940]],
    priest: [[750, 850], [1480, 1675], [2210, 2500], [2940, 3325]],
    mage: [[650, 999], [1285, 1968], [1920, 2937], [2555, 3906]]
  };
  for (const [job, expected] of Object.entries(jobs)) {
    for (let count = 0; count <= 3; count += 1) {
      const growth = getLevelGrowth(job, 197, count);
      assert.deepEqual([growth.hp, growth.sp], expected[count], `${job} reincarnation ${count}`);
      if (count > 0) {
        const before = getLevelGrowth(job, 197, count - 1);
        const after = getLevelGrowth(job, 1, count);
        assert.deepEqual([after.hp, after.sp], [before.hp, before.sp]);
      }
    }
  }
});

test("experience thresholds use the base cumulative table and reincarnation multipliers", () => {
  const caps = [9_999_999, 12_499_999, 14_999_999, 19_999_998];
  for (let count = 0; count <= 3; count += 1) {
    const cap = caps[count];
    assert.equal(getExperienceForLevel(197, count), cap);
    assert.equal(getLevelForExperience(cap - 1, count), 196);
    assert.equal(getLevelForExperience(cap, count), 197);
    assert.equal(getNextLevelExperience(197, count), cap);
    assert.equal(normalizeExperience(cap + 99_999_999, count), cap);
  }
});

test("physical and attack-spell reincarnation coefficients follow the approved continuity tables", () => {
  assert.deepEqual([
    getPhysicalReincarnationMultiplier(197, 0),
    getPhysicalReincarnationMultiplier(1, 1),
    getPhysicalReincarnationMultiplier(197, 1),
    getPhysicalReincarnationMultiplier(1, 3),
    getPhysicalReincarnationMultiplier(197, 3)
  ], [1.98, 1.98, 2.96, 3.94, 4.92]);
  assert.deepEqual([
    getSpellReincarnationMultiplier(197, 0),
    getSpellReincarnationMultiplier(1, 1),
    getSpellReincarnationMultiplier(197, 1),
    getSpellReincarnationMultiplier(1, 2),
    getSpellReincarnationMultiplier(197, 3)
  ], [1, 1, 1.98, 1.98, 3.94]);

  const normal = { id: "normal_attack", weapon: { attack: 100, type: "sword" }, additionalAttackStats: [] };
  assert.equal(preparePlayerPhysicalAttack(normal, { str: 10 }, 1, 1).weapon.attack, 217.8);
  const dedicated = { ...normal, attackStat: "int", attackStatMultiplier: 5 };
  assert.equal(preparePlayerPhysicalAttack(dedicated, { str: 10 }, 197, 3), dedicated);

  const spell = { id: "test_spell", element: "fire", spellPower: 0, intelligenceMultiplier: 10, powerMultiplier: 1, effects: [] };
  const base = resolveSpell({ attacker: { int: 10 }, defender: {}, spell, rng: () => 0.5 }).totalDamage;
  const reincarnated = resolveSpell({ attacker: { int: 10, spellReincarnationMultiplier: 1.98 }, defender: {}, spell, rng: () => 0.5 }).totalDamage;
  assert.equal(reincarnated, Math.floor(base * 1.98));
});

test("reincarnation resets growth resources but preserves inventory, progress, equipment and NPC state", () => {
  let character = eligible("mage");
  character.cards = grantCard(character.cards, "common_hp_up", 1, character.deckCost).cards;
  character.cards = setDeckSlot(character.cards, 0, "common_hp_up", character.deckCost);
  character.inventory.counts.healing_potion = 7;
  character.npcSystem = {
    registeredIds: ["rebecca"],
    activeIds: ["rebecca"],
    records: { rebecca: { maxDepth: 80, charge: 42 } },
    renewal: null,
    expeditionMaxDepth: 80
  };
  character.statuses = [{ id: "poison", statusId: "poison", active: true }];
  character.carriedExperience = 123;
  character.guildExperiencePool = 456;
  character.pendingExperienceSettlement = { baseSettlementExp: 100 };
  character.adventureDefeatRecoveryUsed = true;
  character.playerCharge = { value: 99, cooldown: 1 };
  const oldEquipment = structuredClone(character.equipmentInventory);
  const result = applyReincarnation(character);
  assert.equal(result.accepted, true);
  const next = result.character;
  assert.equal(next.level, 1);
  assert.equal(next.reincarnationCount, 1);
  assert.equal(next.experience, 0);
  assert.equal(next.carriedExperience, 0);
  assert.equal(next.guildExperiencePool, 0);
  assert.equal(next.pendingExperienceSettlement, null);
  assert.equal(next.deckCost, 3);
  assert.ok(next.cards.deckSlots.every(cardId => cardId == null));
  assert.equal(next.cards.ownedCardCounts.common_hp_up, 1);
  assert.deepEqual(next.skillIds.sort(), [...getCharacterClass("mage").initialSkillIds].sort());
  assert.deepEqual(next.statuses, []);
  assert.equal(next.adventureDefeatRecoveryUsed, false);
  assert.equal(next.maxHp, 650, "equipped HP card is not folded into the reincarnation base");
  assert.equal(next.maxSp, 999, "mage Lv197 base SP is preserved at reincarnation Lv1");
  assert.equal(next.hp, next.maxHp);
  assert.equal(next.sp, next.maxSp);
  assert.equal(next.inventory.counts.healing_potion, 7);
  assert.deepEqual(next.equipmentInventory, oldEquipment);
  assert.equal(next.npcSystem.records.rebecca.maxDepth, 80);
  assert.equal(next.npcSystem.records.rebecca.charge, 42);
  assert.deepEqual(next.playerCharge, { value: 0, cooldown: 0 });
  assert.equal(hasKeyItem(next.keyItems, "royal_cat_medal"), true);
  assert.equal(next.gold, character.gold - 500_000);
});

test("eligibility explains every gate, enforces costs and caps the count", () => {
  const base = createInitialCharacter({ name: "条件", job: "priest" });
  assert.equal(getReincarnationPreview(base).reason, "levelRequired");
  let character = eligible("priest");
  assert.equal(hasReincarnationQualification(character), true);
  character.gold = 499_999;
  assert.equal(getReincarnationPreview(character).reason, "insufficientGold");
  assert.equal(getReincarnationPreview(eligible("priest", 1)).fee, 1_000_000);
  assert.equal(getReincarnationPreview(eligible("priest", 2)).fee, 2_000_000);
  assert.equal(getReincarnationPreview(eligible("priest", 3)).reason, "maximumReached");
  assert.equal(normalizeReincarnationCount(-10), 0);
  assert.equal(normalizeReincarnationCount(99), 3);
});

test("Lv197 achievement survives reincarnation and old Lv197 saves are backfilled", () => {
  const old = eligible("thief");
  delete old.eventFlags.achievement_level_197_reached;
  const normalized = normalizeCharacter(old);
  assert.equal(normalized.eventFlags.achievement_level_197_reached, true);
  const reincarnated = applyReincarnation(normalized).character;
  const entry = getAdventureChronicle(reincarnated).find(record => record.id === "level197");
  assert.equal(entry.achieved, true);
});

test("temple flow, rollback hook, medals and Japanese reset warnings are wired", () => {
  const town = readFileSync(new URL("../js/town.js", import.meta.url), "utf8");
  const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(town, /templeReincarnationExplain/);
  assert.match(town, /templeReincarnationPreview/);
  assert.match(town, /templeReincarnationFinal/);
  assert.match(town, /town\.facilityCommandIndex = 0/);
  assert.match(town, /レベルは1、デッキコストは3/);
  assert.match(town, /習得したスキルも職業の初期スキルだけ/);
  assert.match(main, /if \(!saveGame\(\)\)[\s\S]*?character = previous/);
  assert.match(main, /runReincarnationCeremony/);
  assert.deepEqual(REINCARNATION_GODDESSES.slice(1).map(entry => [entry.name, entry.image]), [
    ["女神ゼレーナ", "images/npc/NPC_19e.avif"],
    ["女神ノクティア", "images/npc/NPC_19d.avif"],
    ["女神ルミナ", "images/npc/NPC_19c.avif"]
  ]);
  assert.match(main, /REINCARNATION_GODDESSES\[reincarnationCount\]/);
  assert.match(main, /たましい――[\s\S]*?きおく――[\s\S]*?めぐり――[\s\S]*?あらたなせいを――！/);
  assert.match(main, /is-reincarnation-whiteout[\s\S]*?const result = commit\(\)/);
  assert.match(html, /id="reincarnationMedal"/);
  assert.match(html, /id="statusReincarnation"/);
});
