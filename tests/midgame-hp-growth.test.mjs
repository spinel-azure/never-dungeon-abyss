import test from "node:test";
import assert from "node:assert/strict";

import { createBattleState } from "../combat/battle-engine.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard, setDeckSlot } from "../data/deck.js";
import { createEnemyCombatant, getEnemyById } from "../data/enemies.js";
import {
  getExperienceForLevel,
  getLevelGrowth,
  getMidgameHpProgressBonus,
  JOB_GROWTH,
  MAX_LEVEL
} from "../data/growth.js";
import { resolveInnStay } from "../js/character-services.js";

const JOBS = Object.freeze(["warrior", "thief", "priest", "mage"]);
const LEVEL_54_HP_RANGES = Object.freeze({
  warrior: Object.freeze([220, 230]),
  thief: Object.freeze([185, 195]),
  priest: Object.freeze([165, 170]),
  mage: Object.freeze([140, 145])
});

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  clear() { storage.clear(); }
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};

const { loadGame, writeGame } = await import("../js/save-data.js");

function getPreviousVitalProgress(level) {
  const progress = (level - 1) / (MAX_LEVEL - 1);
  const standardProgress = progress ** 1.35;
  if (level >= 50) return standardProgress;
  return Math.min(1, standardProgress + 0.009 * Math.sin(Math.PI * (level - 1) / 49));
}

function getPreviousGrowth(job, level) {
  const profile = JOB_GROWTH[job];
  const progress = getPreviousVitalProgress(level);
  return {
    hp: Math.round(profile.hp + (profile.hpMax - profile.hp) * progress),
    sp: Math.round(profile.sp + (profile.spMax - profile.sp) * progress)
  };
}

function createLevelCharacter(job, level, overrides = {}) {
  return normalizeCharacter({
    ...createInitialCharacter({ name: "TEST", job }),
    level,
    experience: getExperienceForLevel(level),
    ...overrides
  });
}

function equipCards(character, cardIds) {
  let cards = character.cards;
  for (const [index, cardId] of cardIds.entries()) {
    cards = grantCard(cards, cardId, 1, character.deckCost).cards;
    cards = setDeckSlot(cards, index, cardId, character.deckCost);
  }
  return normalizeCharacter({ ...character, cards });
}

function makeSaveSnapshot(character) {
  return {
    character,
    player: { gridX: 1, gridY: 1, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };
}

test.beforeEach(() => storage.clear());

test("midgame HP bonus joins the existing curve at levels 20 and 100 and peaks at level 60", () => {
  assert.equal(getMidgameHpProgressBonus(20), 0);
  assert.equal(getMidgameHpProgressBonus(100), 0);
  assert.equal(getMidgameHpProgressBonus(101), 0);
  assert.ok(Math.abs(getMidgameHpProgressBonus(60) - 0.03) < Number.EPSILON);
  assert.ok(getMidgameHpProgressBonus(60) > getMidgameHpProgressBonus(54));
  assert.ok(getMidgameHpProgressBonus(60) > getMidgameHpProgressBonus(80));
  assert.ok(getMidgameHpProgressBonus(80) > getMidgameHpProgressBonus(99));
});

test("levels 1 and 20 retain old HP while level 54 enters every requested job range", () => {
  const expectedLevel54 = { warrior: 224, thief: 190, priest: 166, mage: 142 };
  for (const job of JOBS) {
    for (const level of [1, 20]) {
      assert.equal(getLevelGrowth(job, level).hp, getPreviousGrowth(job, level).hp, `${job} Lv${level}`);
    }
    const hp = getLevelGrowth(job, 54).hp;
    const [minimum, maximum] = LEVEL_54_HP_RANGES[job];
    assert.equal(hp, expectedLevel54[job], `${job} Lv54 exact regression value`);
    assert.ok(hp >= minimum && hp <= maximum, `${job} Lv54 requested range`);
  }
});

test("levels 100 through 197 retain the old HP curve and B100F level-100 bases", () => {
  const expectedLevel100 = { warrior: 415, thief: 353, priest: 310, mage: 268 };
  const expectedLevel197 = { warrior: 999, thief: 850, priest: 750, mage: 650 };
  for (const job of JOBS) {
    assert.equal(getLevelGrowth(job, 100).hp, expectedLevel100[job], `${job} B100F base`);
    assert.equal(getLevelGrowth(job, 197).hp, expectedLevel197[job], `${job} final cap`);
    for (let level = 100; level <= MAX_LEVEL; level += 1) {
      assert.equal(getLevelGrowth(job, level).hp, getPreviousGrowth(job, level).hp, `${job} Lv${level}`);
    }
  }
});

test("all jobs retain monotonic HP growth, including the level-99 to level-100 join", () => {
  for (const job of JOBS) {
    let previousHp = 0;
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const hp = getLevelGrowth(job, level).hp;
      assert.ok(hp >= previousHp, `${job} Lv${level - 1} ${previousHp} -> Lv${level} ${hp}`);
      previousHp = hp;
    }
    assert.ok(getLevelGrowth(job, 100).hp >= getLevelGrowth(job, 99).hp, `${job} Lv99 -> Lv100`);
  }
});

test("SP remains byte-for-byte identical to the previous curve at every level", () => {
  for (const job of JOBS) {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      assert.equal(getLevelGrowth(job, level).sp, getPreviousGrowth(job, level).sp, `${job} Lv${level}`);
    }
  }
});

test("fixed HP cards and HP multipliers keep their existing addition and rounding order", () => {
  const base = createLevelCharacter("priest", 54);
  assert.equal(base.maxHp, 166);

  const fixed = equipCards(base, ["legendary_vital_surge"]);
  assert.equal(fixed.maxHp, 266);

  const taurusAndLife = equipCards(base, ["zodiac_taurus", "legendary_life_booster"]);
  assert.equal(taurusAndLife.maxHp, Math.ceil(Math.ceil(166 * 1.5) * 1.2));

  const fixedAndVirgo = equipCards(base, ["legendary_vital_surge", "zodiac_virgo"]);
  assert.equal(fixedAndVirgo.maxHp, Math.ceil((166 + 100) * 1.25));
  assert.equal(fixedAndVirgo.maxSp, Math.ceil(getLevelGrowth("priest", 54).sp * 1.25));

  const innInput = {
    ...fixed,
    equipmentStatBonuses: { ...fixed.equipmentStatBonuses, maxHp: 7 },
    carriedExperience: 0
  };
  const inn = resolveInnStay(innInput);
  assert.equal(inn.changes.maxHp, 273);
});

test("save-load normalization recalculates max HP without healing or clearing persistent state", () => {
  const oldLevel54Priest = {
    ...createLevelCharacter("priest", 54),
    maxHp: 145,
    hp: 47,
    statuses: [{ statusId: "deadly_poison" }],
    condition: "TOXIC",
    alive: true
  };
  assert.equal(writeGame(makeSaveSnapshot(oldLevel54Priest), "auto"), true);
  const loaded = normalizeCharacter(loadGame("auto").character);
  assert.equal(loaded.maxHp, 166);
  assert.equal(loaded.hp, 47);
  assert.equal(loaded.alive, true);
  assert.deepEqual(loaded.statuses, [{ statusId: "deadly_poison" }]);

  const overCap = normalizeCharacter({ ...oldLevel54Priest, hp: 999 });
  assert.equal(overCap.hp, overCap.maxHp);
  const dead = normalizeCharacter({
    ...oldLevel54Priest,
    hp: 0,
    alive: false,
    statuses: [{ statusId: "bleeding" }]
  });
  assert.equal(dead.hp, 0);
  assert.equal(dead.alive, false);
  assert.deepEqual(dead.statuses, [{ statusId: "bleeding" }]);
});

test("normal lodging heals to the new maximum and level-up HP gain matches the actual growth delta", () => {
  const rested = createLevelCharacter("priest", 54, { hp: 1, sp: 1 });
  const restResult = resolveInnStay(rested);
  assert.equal(restResult.changes.maxHp, 166);
  assert.equal(restResult.changes.hp, 166);

  const previousLevel = 53;
  const nextLevel = 54;
  const experience = getExperienceForLevel(previousLevel);
  const levelUp = createLevelCharacter("priest", previousLevel, {
    experience,
    carriedExperience: getExperienceForLevel(nextLevel) - experience,
    hp: 1
  });
  const levelUpResult = resolveInnStay(levelUp);
  const expectedGain = getLevelGrowth("priest", nextLevel).hp - getLevelGrowth("priest", previousLevel).hp;
  assert.equal(levelUpResult.changes.level, nextLevel);
  assert.equal(levelUpResult.hpGained, expectedGain);
  assert.equal(levelUpResult.changes.maxHp, getLevelGrowth("priest", nextLevel).hp);
  assert.equal(levelUpResult.changes.hp, levelUpResult.changes.maxHp);
});

test("a level-54 priest enters an actual jungle battle with the recalculated maximum HP", () => {
  const priest = createLevelCharacter("priest", 54);
  priest.hp = priest.maxHp;
  const tiger = createEnemyCombatant(getEnemyById("abyss_tiger"));
  const battle = createBattleState({ character: priest, enemy: tiger });
  assert.equal(priest.maxHp, 166);
  assert.equal(battle.player.maxHp, 166);
  assert.equal(battle.player.hp, 166);
  assert.equal(battle.enemy.id, "abyss_tiger");
});
