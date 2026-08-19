import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter } from "../data/classes.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { grantItemWithOverflow } from "../data/inventory.js";
import { getUnreadTavernRumor, markTavernRumorRead } from "../data/tavern-rumors.js";
import { acceptQuest, getQuestById, isQuestAvailable, recordBossDefeat, reportQuest } from "../data/quests.js";
import { getKeyItemCount, grantKeyItem } from "../data/key-items.js";
import { getOwnedCardCount } from "../data/deck.js";
import { purchaseItem, sellItem } from "../data/commerce.js";

function rumorReadyCharacter() {
  const character = createInitialCharacter("香料採集者", "thief");
  character.quests.completedQuestIds.push("guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_020");
  character.adventureStats.shopPurchaseCount = 500;
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true,
    tavern_rumor_004_medicine_read: true,
    tavern_rumor_005_base_read: true,
    tavern_rumor_005_outfit_read: true
  };
  return character;
}

test("Helen rumor requires both 500 recorded purchases and quest 020 completion", () => {
  const character = rumorReadyCharacter();
  character.adventureStats.shopPurchaseCount = 499;
  assert.notEqual(getUnreadTavernRumor(character)?.id, "rumor_006_base");
  character.adventureStats.shopPurchaseCount = 500;
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_006_base");
  character.quests.completedQuestIds = [];
  assert.notEqual(getUnreadTavernRumor(character)?.id, "rumor_006_base");
});

test("quest 021 consumes the scent gland and grants Mana Barrier plus its shop-event flag", () => {
  let character = rumorReadyCharacter();
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  assert.equal(isQuestAvailable(character, "guild_021"), true);
  character = acceptQuest(character, "guild_021").character;
  character = recordBossDefeat(character, "musk_beast_b56f", 56);
  character.keyItems = grantKeyItem(character.keyItems, "scent_gland").keyItems;
  const report = reportQuest(character, "guild_021");
  assert.equal(report.accepted, true);
  assert.equal(getKeyItemCount(report.character.keyItems, "scent_gland"), 0);
  assert.equal(getOwnedCardCount(report.character.cards, "legendary_mana_barrier"), 1);
  assert.equal(report.bonusGold, 20000);
  assert.equal(report.character.eventFlags.helen_hidden_event_pending, true);
  assert.match(report.reportMessage, /店に寄ってくれ/);
});

test("Musk Beast formation supports independent targets and herbicide removes only a vine", () => {
  let character = createInitialCharacter("除草係", "warrior");
  character = grantItemWithOverflow(character, "strong_herbicide", 1).character;
  const ids = getBossById("musk_beast_b56f").encounterEnemyIds;
  const enemies = ids.map(id => createBossCombatant(id));
  const battle = createBattleState({ character, enemy: enemies[1], enemies, targetIndex: 0 });
  const result = resolveBattleRound({ battle, playerCommand: { type: "item", itemId: "strong_herbicide", targetIndex: 0 }, rng: () => 0.99 });
  assert.equal(result.accepted, true);
  assert.equal(result.battle.enemies[0].alive, false);
  assert.equal(result.battle.enemies[1].alive, true);
  assert.equal(result.battle.enemies[2].alive, true);
  assert.equal(result.battle.outcome, null);
});

test("Discount Pass halves ordinary purchases and prevents resale profit", () => {
  let character = createInitialCharacter("常連客", "mage");
  character.gold = 100000;
  character.keyItems = grantKeyItem(character.keyItems, "discount_pass").keyItems;
  const item = getQuestById("guild_021");
  assert.ok(item);
  const bought = purchaseItem(character, "healing_potion", { amount: 1 });
  assert.equal(bought.accepted, true);
  assert.equal(bought.unitCost * 2, bought.item.buyPrice);
  const sold = sellItem(bought.character, "healing_potion", { amount: 1 });
  assert.equal(sold.accepted, true);
  assert.ok(sold.unitValue <= bought.unitCost);
});

test("facility dialogue completion restores the facility menu after granting the Discount Pass", async () => {
  const source = await readFile(new URL("../js/town.js", import.meta.url), "utf8");
  assert.match(source, /town\.facilityTalkCompletionFlag = "";\s*town\.mode = "facilityMenu";\s*renderFacility\(\);/);
});
