import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantKeyItem, hasKeyItem, getKeyItem } from "../data/key-items.js";
import { completeEndingStory, completeEndingCredits, getEndingResumeMode, getEndingCredits,
  ENDING_ASSETS, ENDING_FLAGS, EPILOGUE, EPILOGUE_AFTER_MEDAL } from "../data/ending.js";
import { getQueenRegaliaMinimapEffects } from "../js/queen-regalia-effects.js";
import { getEndingFrame, createArrivalConfetti } from "../js/ending.js";
import { hasCompleteQueenRegalia } from "../data/quests.js";
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const regalia = ["queen_tiara", "queen_earring", "queen_necklace"];
function restored() {
  let character = createInitialCharacter({ name: "ENDING", job: "warrior" });
  for (const id of [...regalia, "truth_staff"]) character.keyItems = grantKeyItem(character.keyItems, id).keyItems;
  character.eventFlags.boss_amayenak_b100f_defeated = true;
  character.eventFlags.michaela_restored = true;
  return character;
}
test("old characters default to no ending, medal, or blessing without losing regalia", () => {
  const source = restored(); delete source.eventFlags;
  const normalized = normalizeCharacter(source);
  for (const key of ENDING_FLAGS) assert.equal(normalized.eventFlags[key], false);
  for (const id of regalia) assert.equal(hasKeyItem(normalized.keyItems, id), true);
  assert.equal(getEndingResumeMode(normalized), "none");
  assert.equal(completeEndingStory(normalized), normalized);
});
test("story commits the return and unique medal once and leaves credits pending", () => {
  const source = restored(), snapshot = structuredClone(source);
  const result = completeEndingStory(source);
  assert.deepEqual(source, snapshot);
  for (const id of regalia) assert.equal(hasKeyItem(result.keyItems, id), false);
  assert.equal(hasKeyItem(result.keyItems, "truth_staff"), true);
  assert.equal(hasKeyItem(result.keyItems, "royal_cat_medal"), true);
  assert.equal(result.eventFlags.queen_blessing_unlocked, true);
  assert.equal(getEndingResumeMode(result), "credits");
  assert.equal(completeEndingStory(result), result);
  assert.equal(getKeyItem("royal_cat_medal").sellable, false);
  assert.equal(getKeyItem("royal_cat_medal").consumable, false);
});
test("completed ending survives normalization and credits completion without duplicate rewards", () => {
  const pending = normalizeCharacter(completeEndingStory(restored()));
  assert.equal(getEndingResumeMode(pending), "credits");
  const finished = normalizeCharacter(completeEndingCredits(pending));
  assert.equal(finished.eventFlags.ending_credits_pending, false);
  assert.equal(finished.eventFlags.ending_credits_watched, true);
  assert.equal(getEndingResumeMode(finished), "none");
  assert.deepEqual(finished.keyItems, pending.keyItems);
  assert.equal(completeEndingStory(finished), finished);
  assert.equal(hasCompleteQueenRegalia(finished), true); // No cat respawn or B100 gate regression.
});
test("resume chooses restoration, automatic arrival, then credits only", () => {
  const source = restored(); source.eventFlags.michaela_restored = false;
  assert.equal(getEndingResumeMode(source), "restoration");
  source.eventFlags.michaela_restored = true;
  assert.equal(getEndingResumeMode(source), "arrival");
  assert.equal(getEndingResumeMode(completeEndingStory(source)), "credits");
});
for (const depth of [1, 9, 10, 50, 99, 100, 101, 200]) {
  test(`Queen's Blessing has the correct scope at B${depth}F`, () => {
    const character = completeEndingStory(restored());
    const effects = getQueenRegaliaMinimapEffects(character.keyItems, { depth, eventFlags: character.eventFlags });
    assert.deepEqual(Object.values(effects), Array(4).fill(depth <= 99));
    if (depth <= 99) assert.deepEqual(effects, getQueenRegaliaMinimapEffects(restored().keyItems));
  });
}
test("town and B100 block regalia while torch and minimap blocking remain renderer responsibilities", () => {
  assert.deepEqual(Object.values(getQueenRegaliaMinimapEffects(restored().keyItems, { depth: 100 })), Array(4).fill(false));
  const c = completeEndingStory(restored());
  assert.deepEqual(Object.values(getQueenRegaliaMinimapEffects(c.keyItems, { depth: 1, location: "town", eventFlags: c.eventFlags })), Array(4).fill(false));
});
test("assets exist, epilogue is ordered and credits omit empty test players", () => {
  for (const asset of Object.values(ENDING_ASSETS)) assert.equal(existsSync(new URL(`../${asset}`, import.meta.url)), true);
  assert.equal(EPILOGUE.length, 7);
  assert.match(EPILOGUE[0], /^――かくして/);
  assert.equal(EPILOGUE.at(-1), "その勲章には、女王の加護が宿っているといいます。");
  assert.match(EPILOGUE_AFTER_MEDAL, /末永く語り継がれてゆくことでしょう――。$/);
  assert.deepEqual(getEndingCredits().map(([heading]) => heading), ["企画・原案・ゲームデザイン", "制作相談・シナリオ・画像生成", "実装・検証・デバッグ", "BGM", "効果音", "制作"]);
  assert.deepEqual(getEndingCredits(["TEST"])[5], ["テストプレイ", ["TEST"]]);
});
test("roll timing reserves the medal pause, stationary final image, and final five-second fade", () => {
  assert.deepEqual([0, 4, 29, 35, 41, 73, 81, 91].map(t => getEndingFrame(t).stage), ["intro", "epilogue", "medal", "after", "credits", "thanks", "end", "end"]);
  assert.equal(getEndingFrame(29).progress, getEndingFrame(34).progress);
  assert.equal(getEndingFrame(82).progress, getEndingFrame(90).progress);
  assert.equal(getEndingFrame(91).opacity, 1);
  assert.equal(getEndingFrame(93.5).opacity, .5);
  assert.equal(getEndingFrame(96).done, true);
});
test("confetti reuses cracker renderer with one inward burst from four corners", () => {
  const full = createArrivalConfetti(), reduced = createArrivalConfetti(true);
  assert.equal(full.duration, 1800);
  assert.equal(full.parts.length, 4);
  for (let i = 0; i < 4; i++) {
    const p = full.parts[i]; assert.equal(p.type, "cracker");
    assert.equal(p.start, 0); assert.ok(reduced.parts[i].count < p.count);
    const dx = Math.cos(p.direction * Math.PI / 180), dy = Math.sin(p.direction * Math.PI / 180);
    assert.equal(dx > 0, p.x === 0); assert.equal(dy > 0, p.y === 0);
  }
});
test("main bridges real victory to automatic entrance, common return settlement, and story autosave", () => {
  const main = read("js/main.js");
  assert.match(main, /defeatedEnemyId === "amayenak_b100f"\s*&& !character\?\.eventFlags\?\.ending_story_completed/);
  assert.match(main, /waitForEnding\(1500\)[\s\S]*?returnToTown\(\{ ending: true \}\)/);
  assert.match(main, /settleLootBag\(character\)/);
  assert.match(main, /character = completeEndingStory\(character\);\s*updateCharacterUi\(\);\s*return saveGame\(\)/);
  for (const name of ["prepareRandomEncounter", "beginRandomBattle", "beginBossBattle", "beginQuestEnemyBattle"]) {
    assert.match(main, new RegExp(`function ${name}\\([^)]*\\) \\{\\s*if \\(endingSequenceActive\\) return false`));
  }
  assert.match(main, /endingController.handleAction\(action\)/);
  assert.match(main, /medal.hidden = !character\?\.eventFlags\?\.royal_cat_medal_awarded/);
});
