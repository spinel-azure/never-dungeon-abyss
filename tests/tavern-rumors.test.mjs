import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { getPastTavernRumors, getTavernRumorTypewriterParts, getUnreadTavernRumor, markTavernRumorRead } from "../data/tavern-rumors.js";

test("tavern rumor typewriter isolates only customer and Rosa dialogue", () => {
  assert.deepEqual(
    getTavernRumorTypewriterParts("あなたはカウンターから耳を澄ます……。\n客「おい、知ってるか？」\n＊Aボタンで次へ"),
    {
      prefix: "あなたはカウンターから耳を澄ます……。\n客「",
      dialogue: "おい、知ってるか？",
      suffix: "」\n＊Aボタンで次へ"
    }
  );
  assert.equal(getTavernRumorTypewriterParts("あなたはカウンターから耳を澄ます……。"), null);
});

test("tavern rumor becomes read and is unavailable until its Mikan update", () => {
  let character = createInitialCharacter("噂好き", "thief");
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_001_base");
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);
  const updated = getUnreadTavernRumor(character, { mikanEncountered: true });
  assert.equal(updated.id, "rumor_001_mikan");
  assert.match(updated.dialogue.at(-1), /みかんにゃんこ/);
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character, { mikanEncountered: true }), null);
});

test("meeting Mikan before hearing the rumor starts with the updated version", () => {
  let character = createInitialCharacter("猫好き", "mage");
  const updated = getUnreadTavernRumor(character, { mikanEncountered: true });
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character), null);
});

test("B2 unlocks the lingering ghost rumor and victory unlocks its update", () => {
  let character = createInitialCharacter("亡霊見物", "priest");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  character.highestDungeonDepthReached = 2;

  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_002_base");
  assert.match(base.dialogue[0], /地下2階に亡霊/);
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);

  const updated = getUnreadTavernRumor(character, { lingeringGhostDefeated: true });
  assert.equal(updated.id, "rumor_002_ghost");
  assert.match(updated.dialogue.at(-1), /何度も出てくる/);
  character = markTavernRumorRead(character, updated);
  assert.equal(getUnreadTavernRumor(character, { lingeringGhostDefeated: true }), null);
});

test("unread tavern rumors are returned in registration order", () => {
  const character = createInitialCharacter("聞き込み屋", "warrior");
  character.highestDungeonDepthReached = 2;
  assert.equal(getUnreadTavernRumor(character).id, "rumor_001_base");
});

test("past rumors list only heard topics without a current unread update", () => {
  let character = createInitialCharacter("噂の記録係", "thief");
  assert.deepEqual(getPastTavernRumors(character), []);

  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  assert.deepEqual(
    getPastTavernRumors(character).map(entry => `${entry.number} ${entry.title}`),
    ["001 喋る猫の噂"]
  );

  assert.deepEqual(getPastTavernRumors(character, { mikanEncountered: true }), []);
  const update = getUnreadTavernRumor(character, { mikanEncountered: true });
  character = markTavernRumorRead(character, update);
  const history = getPastTavernRumors(character, { mikanEncountered: true });
  assert.equal(history.length, 1);
  assert.equal(history[0].title, "喋る猫の噂");
  assert.match(history[0].description.at(-1), /みかんにゃんこ/);
});

test("past rumor descriptions preserve the two customers and Rosa", () => {
  let character = createInitialCharacter("聞き書き", "priest");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  const [entry] = getPastTavernRumors(character);
  assert.equal(entry.description.length, 3);
  assert.match(entry.description[0], /^客：/);
  assert.match(entry.description[1], /^客：/);
  assert.match(entry.description[2], /^ローザ：/);
});

test("B4 unlocks the terrifying presence rumor and Otherworldly Wisdom adds Rosa's follow-up", () => {
  let character = createInitialCharacter("生還者", "warrior");
  character = markTavernRumorRead(character, getUnreadTavernRumor(character));
  character.highestDungeonDepthReached = 4;
  character = markTavernRumorRead(character, getUnreadTavernRumor(character, { lingeringGhostDefeated: false }));

  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_003_base");
  assert.equal(base.dialogue[0].includes("\u304a\u3044\u3001\u77e5\u3063\u3066\u308b\u304b\uff1f"), false);
  assert.equal(base.dialogue[1].includes("\u3042\u3042\u3002\u3042\u3042\u3002"), false);
  assert.match(base.dialogue[0], /地下4階に恐ろしい何か/);
  assert.equal(base.dialogue.length, 3);
  character = markTavernRumorRead(character, base);
  assert.equal(getUnreadTavernRumor(character), null);

  const updated = getUnreadTavernRumor(character, { otherworldlyWisdomDefeated: true });
  assert.equal(updated.id, "rumor_003_wisdom");
  assert.equal(updated.dialogue.length, 4);
  assert.match(updated.dialogue.at(-1), /あなた…よく生きて/);
  assert.deepEqual(updated.readFlags, ["tavern_rumor_003_base_read", "tavern_rumor_003_wisdom_read"]);
  character = markTavernRumorRead(character, updated);

  const history = getPastTavernRumors(character, { otherworldlyWisdomDefeated: true });
  const rumor = history.find(entry => entry.id === "rumor_003");
  assert.equal(rumor.number, "003");
  assert.equal(rumor.title, "恐ろしい何かの噂");
  assert.equal(rumor.description.length, 4);
});

test("priest rumor requires quest 019 plus one hundred donations and updates after quest 016", () => {
  let character = createInitialCharacter("寄進者", "priest");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true
  };
  character.highestDungeonDepthReached = 50;
  character.adventureStats.templeDonationCount = 100;
  assert.equal(getUnreadTavernRumor(character), null);

  character.quests.completedQuestIds.push("guild_019");
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_004_base");
  assert.match(base.dialogue[0], /司祭様が腰を痛められて/);
  assert.match(base.dialogue[1], /若い助祭/);
  character = markTavernRumorRead(character, base);
  assert.equal(character.eventFlags.tavern_rumor_004_base_read, true);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_004")?.title, "司祭様の噂");

  character.quests.completedQuestIds.push("guild_016");
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_004"), false);
  const update = getUnreadTavernRumor(character);
  assert.equal(update.id, "rumor_004_medicine");
  assert.match(update.dialogue.at(-1), /特効薬の材料/);
  character = markTavernRumorRead(character, update);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_004")?.description.length, 4);
});


test("acolyte rumor unlocks at five hundred donations and continues after the hidden temple event", () => {
  let character = createInitialCharacter("祝祭見物", "mage");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true,
    tavern_rumor_004_medicine_read: true
  };
  character.adventureStats.templeDonationCount = 499;
  assert.equal(getUnreadTavernRumor(character), null);
  character.adventureStats.templeDonationCount = 500;
  const base = getUnreadTavernRumor(character);
  assert.equal(base.id, "rumor_005_base");
  assert.match(base.dialogue[0], /大胆な格好/);
  character = markTavernRumorRead(character, base);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_005")?.title, "助祭の噂");

  character.eventFlags.anastasia_festival_outfit_unlocked = true;
  assert.equal(getPastTavernRumors(character).some(entry => entry.id === "rumor_005"), false);
  const update = getUnreadTavernRumor(character);
  assert.equal(update.id, "rumor_005_outfit");
  assert.match(update.dialogue.at(-1), /とても大胆な格好だった/);
  character = markTavernRumorRead(character, update);
  assert.equal(getPastTavernRumors(character).find(entry => entry.id === "rumor_005")?.description.length, 4);
});

test("acolyte rumor stays hidden at five hundred donations until the priest rumor is complete", () => {
  const character = createInitialCharacter("先行寄進者", "priest");
  character.eventFlags = {
    tavern_rumor_001_base_read: true,
    tavern_rumor_002_base_read: true,
    tavern_rumor_003_base_read: true
  };
  character.adventureStats.templeDonationCount = 500;
  assert.equal(getUnreadTavernRumor(character), null);
  character.eventFlags.tavern_rumor_004_medicine_read = true;
  assert.equal(getUnreadTavernRumor(character)?.id, "rumor_005_base");
});
