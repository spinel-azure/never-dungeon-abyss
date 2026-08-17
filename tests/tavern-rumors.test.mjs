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
