import test from "node:test";
import assert from "node:assert/strict";

import { QUESTS } from "../data/quests.js";
import { getTownFacility } from "../data/town.js";

test("town facilities use the formal character names", () => {
  assert.equal(getTownFacility("inn").keeper, "女将ヨハンナ");
  assert.equal(getTownFacility("temple").keeper, "司祭アーヴァイン");
  assert.equal(getTownFacility("shop").keeper, "女主人ヘレン");
  assert.equal(getTownFacility("library").keeper, "司書イライザ");
  assert.equal(getTownFacility("guild").keeper, "ギルドマスター");
});

test("shop greeting and guild quest client names stay synchronized", () => {
  assert.equal(getTownFacility("shop").greeting, "あら、いらっしゃい。");
  assert.ok(QUESTS.every(quest => quest.id === "guild_016" ? quest.client === "アナスタシア" : quest.client === "ギルドマスター"));
});
