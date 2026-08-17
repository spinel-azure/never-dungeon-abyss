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
