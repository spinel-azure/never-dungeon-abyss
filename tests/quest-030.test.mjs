import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createBattleState } from "../combat/battle-engine.js";
import { getCardById } from "../data/cards.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantCard, getOwnedCardCount } from "../data/deck.js";
import { acceptQuest, getQuestById, getQuestProgress, isQuestAvailable, reportQuest } from "../data/quests.js";

const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const townSource = fs.readFileSync(new URL("../js/town.js", import.meta.url), "utf8");

function questReadyCharacter() {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = 80;
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_029"
  );
  return character;
}

test("quest 030 unlocks after quest 029 and B80F without rolling back accepted saves", () => {
  const beforePrerequisite = createInitialCharacter({ name: "TEST", job: "warrior" });
  beforePrerequisite.highestDungeonDepthReached = 80;
  beforePrerequisite.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_028"
  );
  assert.equal(isQuestAvailable(beforePrerequisite, "guild_030"), false);

  beforePrerequisite.quests.active.guild_030 = { progress: 0 };
  assert.equal(getQuestProgress(beforePrerequisite, "guild_030").active, true);

  const ready = questReadyCharacter();
  assert.equal(isQuestAvailable(ready, "guild_030"), true);
  const accepted = acceptQuest(ready, "guild_030");
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.acceptanceKeyItemId, "trapezohedron");
  assert.equal(getQuestProgress(accepted.character, "guild_030").active, true);
});

test("quest 030 uses the requested copy and grants Life Booster plus forty thousand gold", () => {
  const quest = getQuestById("guild_030");
  assert.equal(quest.objectiveLabel, "B89Fの赤い扉のある部屋へ行く");
  assert.ok(quest.description.every(line => Array.from(line).length <= 23));
  assert.deepEqual(quest.prerequisiteQuestIds, ["guild_029"]);
  assert.deepEqual(quest.reward, {
    type: "card", label: "デッキカード×1", amount: 1,
    cardId: "legendary_life_booster", bonusGold: 40000
  });

  let character = acceptQuest(questReadyCharacter(), "guild_030").character;
  character.eventFlags.boss_b89f_defeated = true;
  const reported = reportQuest(character, "guild_030");
  assert.equal(reported.accepted, true);
  assert.equal(reported.rewardCardId, "legendary_life_booster");
  assert.equal(reported.bonusGold, 40000);
  assert.equal(reported.character.gold, 40000);
  assert.equal(getOwnedCardCount(reported.character.cards, "legendary_life_booster"), 1);
});

test("Life Booster mirrors Mana Booster for HP and presents recovery over HP", () => {
  const card = getCardById("legendary_life_booster");
  assert.deepEqual(
    [card.rarity, card.cost, card.effectId, card.effectValue, card.battleStartRecoveryRate],
    ["L", 6, "life_booster", 0.2, 0.05]
  );
  let character = createInitialCharacter({ name: "BOOST", job: "warrior" });
  character.level = 50;
  character = normalizeCharacter(character);
  const before = character.maxHp;
  character.cards = grantCard(character.cards, card.id, 1, 99).cards;
  character.cards.deckSlots[0] = card.id;
  character = normalizeCharacter(character);
  assert.equal(character.maxHp, Math.ceil(before * 1.2));
  character.hp = 1;
  const battle = createBattleState({
    character,
    enemy: { id: "dummy", name: "DUMMY", hp: 1, maxHp: 1, sp: 0, maxSp: 0, attack: 0, def: 0, stats: {}, statuses: [] }
  });
  assert.equal(battle.lifeBoosterRecovery, Math.ceil(character.maxHp * 0.05));
  assert.equal(battle.player.hp, 1 + battle.lifeBoosterRecovery);
  assert.match(mainSource, /clientPortrait: "images\/npc\/NPC_25\.avif"/);
  assert.match(mainSource, /clientPortraitStartIndex: 1/);
  assert.match(mainSource, /依頼人がお前に会いたいそうだ/);
  assert.match(townSource, /questClientDialogueIndex === town\.questClientPortraitStartIndex/);
  assert.match(mainSource, /"zodiac_taurus", "legendary_life_booster"/);
});
