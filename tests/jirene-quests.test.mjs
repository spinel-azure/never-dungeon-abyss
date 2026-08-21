import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getCardById } from "../data/cards.js";
import { getEquipmentItem } from "../data/equipment.js";
import { grantCard } from "../data/deck.js";
import { getKeyItem, hasKeyItem } from "../data/key-items.js";
import {
  BEESWAX_COLLECTION_QUEST_ID,
  BEESWAX_REQUIRED_COUNT,
  JIRENE_SONG_INVESTIGATION_QUEST_ID,
  acceptQuest,
  deliverQuestBeeswax,
  getQuestById,
  getQuestProgress,
  isQuestAvailable,
  recordQuestBeeswax,
  reportQuest
} from "../data/quests.js";
import { getSpecialRoomDefinition } from "../data/special-rooms.js";
import { getUnreadTavernRumor } from "../data/tavern-rumors.js";
import { createBattleState } from "../combat/battle-engine.js";
import { getPlayerWeaponElement } from "../combat/battle-engine.js";
import { setDeckSlot } from "../data/deck.js";
import { getWeapon } from "../data/weapons.js";
import { collectStats } from "../combat/collect-stats.js";

function completed027() {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_027"
  );
  character.highestDungeonDepthReached = 79;
  return character;
}

test("quests 028 and 029 use the requested unlock flow and fifteen-count beeswax counter", () => {
  let character = completed027();
  assert.equal(isQuestAvailable(character, JIRENE_SONG_INVESTIGATION_QUEST_ID), true);
  character = acceptQuest(character, JIRENE_SONG_INVESTIGATION_QUEST_ID).character;
  assert.equal(getQuestProgress(character, JIRENE_SONG_INVESTIGATION_QUEST_ID).progress, 0);
  character.eventFlags.jirene_scripted_defeat_seen = true;
  assert.equal(getQuestProgress(character, JIRENE_SONG_INVESTIGATION_QUEST_ID).progress, 1);
  assert.equal(isQuestAvailable(character, BEESWAX_COLLECTION_QUEST_ID), true);
  character = acceptQuest(character, BEESWAX_COLLECTION_QUEST_ID).character;
  character = recordQuestBeeswax(character, 3);
  character = recordQuestBeeswax(character, 99);
  assert.equal(BEESWAX_REQUIRED_COUNT, 15);
  assert.equal(getQuestProgress(character, BEESWAX_COLLECTION_QUEST_ID).progress, 15);
  assert.equal(getQuestProgress(character, BEESWAX_COLLECTION_QUEST_ID).readyToReport, false);
  const delivery = deliverQuestBeeswax(character);
  assert.equal(delivery.accepted, true);
  assert.equal(delivery.character.eventFlags.jirene_countermeasure_obtained, true);
  assert.equal(getQuestProgress(delivery.character, BEESWAX_COLLECTION_QUEST_ID).readyToReport, true);
  const report = reportQuest(delivery.character, BEESWAX_COLLECTION_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.bonusGold, 30000);
  assert.equal(report.rewardCardId, "sr_lightning_armament");
});

test("quest copy stays within 23 full-width characters and rewards are registered", () => {
  for (const id of [JIRENE_SONG_INVESTIGATION_QUEST_ID, BEESWAX_COLLECTION_QUEST_ID]) {
    const quest = getQuestById(id);
    assert.ok(quest.description.every(line => Array.from(line).length <= 23), `${id} has an overlong line`);
  }
  assert.equal(getCardById("legendary_mana_booster").cost, 6);
  assert.equal(getCardById("sr_lightning_armament").effectValue, "lightning");
  assert.equal(getKeyItem("beeswax_earplugs").consumable, false);
});

test("Lightning Armament applies lightning after weapon and temporary imbue priority", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.cards = grantCard(character.cards, "sr_lightning_armament", 1, 8).cards;
  character.cards = setDeckSlot(character.cards, 0, "sr_lightning_armament", 8);
  const action = { actionType: "physicalAttack", weapon: getWeapon("iron_longsword") };
  assert.equal(getPlayerWeaponElement(character, action), "lightning");
  assert.equal(getPlayerWeaponElement(character, { ...action, weapon: getWeapon("glacies_hammer") }), "ice");
});

test("Mana Booster applies after additive max SP bonuses and recovers five percent once at battle start", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.level = 50;
  character = normalizeCharacter(character);
  const before = character.maxSp;
  character.cards = grantCard(character.cards, "legendary_mana_booster", 1, 99).cards;
  character.cards.deckSlots[0] = "legendary_mana_booster";
  character = normalizeCharacter(character);
  assert.equal(character.maxSp, Math.ceil(before * 1.2));
  character.sp = 0;
  const battle = createBattleState({ character, enemy: { id: "dummy", name: "DUMMY", hp: 1, maxHp: 1, sp: 0, maxSp: 0, attack: 0, def: 0, stats: {}, statuses: [] } });
  assert.equal(battle.player.sp, Math.ceil(character.maxSp * 0.05));
});

test("Musa's Crown exposes DEF while retaining hidden future temptation immunity", () => {
  const crown = getEquipmentItem("musa_crown", "accessoryId");
  assert.equal(crown.statBonuses.def, 6);
  assert.equal(crown.statBonuses.temptationResistance, 1);
  assert.ok(crown.hiddenStatBonusKeys.includes("temptationResistance"));
  assert.equal(collectStats({ equipmentStatBonuses: crown.statBonuses }).temptationResistance, 1);
});

test("B20 hive and B58 Kirke house use the supplied event art", async () => {
  assert.equal(getSpecialRoomDefinition(20).content.type, "waspHive");
  assert.equal(getSpecialRoomDefinition(58).content.type, "kirkeHouse");
  await Promise.all([
    access(new URL("../images/background/dungeon_event_10.avif", import.meta.url)),
    access(new URL("../images/background/dungeon_event_11.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_23.avif", import.meta.url))
  ]);
});

test("the giant hive rumor follows quest 029 and delivery state", () => {
  let character = completed027();
  character.eventFlags.jirene_scripted_defeat_seen = true;
  character = acceptQuest(character, BEESWAX_COLLECTION_QUEST_ID).character;
  Object.assign(character.eventFlags, {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true
  });
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_007_base");
  character.eventFlags.quest_029_beeswax_delivered = true;
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_007_delivered");
});

test("quest presentation and safe Jirene transformation remain wired outside exploration data", async () => {
  const [main, town, player] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8"),
    readFile(new URL("../js/player.js", import.meta.url), "utf8")
  ]);
  assert.match(main, /clientPortrait: "images\/npc\/NPC_22\.avif"/);
  assert.match(town, /questClientDialogue/);
  assert.match(player, /prefers-reduced-motion/);
  assert.match(player, /transformationImageId/);
  assert.match(main, /type: "jireneAwakening",[\s\S]*?imageId: "",[\s\S]*?showOverlay: false/);
  assert.match(player, /type: "kirkeHouse", content, canDeliver:[\s\S]*?imageId: content\.imageId/);
  assert.match(player, /event\.phase === "house" && event\.canDeliver[\s\S]*?event\.imageId = event\.content\.portraitId/);
});
