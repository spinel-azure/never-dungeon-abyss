import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  RARE_REVIVAL_GODDESS_IMAGE,
  REVIVAL_GODDESS_IMAGE,
  selectRevivalGoddessImage
} from "../data/revival-presentation.js";
import {
  ANASTASIA_ASSIGNED_FLAG,
  ANASTASIA_OUTFIT_EVENT_FLAG,
  getTempleRevivalMessage
} from "../data/anastasia-event.js";

test("revival prayer selects Lumina at exactly the five-percent boundary", () => {
  assert.equal(selectRevivalGoddessImage(() => 0), RARE_REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.049999), RARE_REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.05), REVIVAL_GODDESS_IMAGE);
  assert.equal(selectRevivalGoddessImage(() => 0.999999), REVIVAL_GODDESS_IMAGE);
});

test("revival prayer chooses its image once before the existing animation starts", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const start = source.indexOf("async function runRevivalPrayer()");
  const end = source.indexOf("function prepareRevivalBlackout()", start);
  const prayer = source.slice(start, end);
  assert.ok(prayer.indexOf("selectRevivalGoddessImage()") < prayer.indexOf('classList.add("is-active")'));
  assert.match(prayer, /goddessImage === RARE_REVIVAL_GODDESS_IMAGE[\s\S]*?achievement_lumina_revival_seen: true[\s\S]*?saveGame\(\)[\s\S]*?detectAchievementUnlocks\(\)/);
});

test("the achievement popup can appear above the revival scene", async () => {
  const css = await readFile(new URL("../css/town.css", import.meta.url), "utf8");
  assert.match(css, /\.achievement-unlocked-effect\{z-index:10050\}/);
});

test("temple defeat revival uses the assigned keeper for normal and festival outfits", () => {
  const irvine = { eventFlags: {} };
  const anastasia = { eventFlags: { [ANASTASIA_ASSIGNED_FLAG]: true } };
  const festivalAnastasia = {
    eventFlags: {
      [ANASTASIA_ASSIGNED_FLAG]: true,
      [ANASTASIA_OUTFIT_EVENT_FLAG]: true
    }
  };
  assert.equal(
    getTempleRevivalMessage(irvine),
    "司祭アーヴァイン：おお…！女神の祈りが届いたか…！よくぞ目覚めた…！"
  );
  for (const character of [anastasia, festivalAnastasia]) {
    assert.equal(
      getTempleRevivalMessage(character),
      "助祭アナスタシア：ああ…！女神様に祈りが届いたのですね…！お気づきになって、本当によかった……。"
    );
  }
});

test("temple defeat revival preserves protected and lost experience messages", () => {
  const character = { eventFlags: { [ANASTASIA_ASSIGNED_FLAG]: true } };
  assert.match(getTempleRevivalMessage(character, "\n女神の慈愛により1200EXPを守った。"), /女神の慈愛により1200EXPを守った。$/);
  assert.match(getTempleRevivalMessage(character, "\n持ち帰るはずだった900EXPを失った。"), /持ち帰るはずだった900EXPを失った。$/);
});

test("loot and no-loot defeat paths clear the message until the revival prayer finishes", async () => {
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  const start = source.indexOf("async function completeDungeonDefeat()");
  const end = source.indexOf("async function runDefeatPresentation()", start);
  const defeat = source.slice(start, end);
  const lootBranch = defeat.indexOf("if (character && bagHasLoot(bag))");
  const clear = defeat.indexOf('say("");');
  const prayer = defeat.indexOf("await runRevivalPrayer();");
  const dialogue = defeat.indexOf("say(getTempleRevivalMessage(character, experienceMessage));");
  assert.ok(lootBranch >= 0 && clear > lootBranch, "both loot branches converge before the message is cleared");
  assert.ok(prayer > clear, "the prayer begins only after the previous town message is cleared");
  assert.ok(dialogue > prayer, "the keeper dialogue appears only after the prayer has finished");
});
