import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { createBossCombatant, getFloorBossByDepth } from "../data/bosses.js";
import { getKeyItem, grantKeyItem, hasKeyItem } from "../data/key-items.js";
import { getQuestEventForDepth } from "../data/quest-events.js";
import { createInitialCharacter } from "../data/classes.js";
import { acceptQuest, isDungeonDepthUnlocked } from "../data/quests.js";

test("B95F provides the persistent Lichtbringer key-item pickup", () => {
  const event = getQuestEventForDepth(95, { activeQuestIds: [], eventFlags: {} });
  assert.deepEqual(event, {
    id: "lichtbringer_b95f_event",
    keyItemId: "lichtbringer",
    flag: "lichtbringer_b95f_found",
    alwaysAvailable: true
  });
  assert.equal(getQuestEventForDepth(95, { eventFlags: { lichtbringer_b95f_found: true } }), null);
  const granted = grantKeyItem(null, "lichtbringer");
  assert.equal(hasKeyItem(granted.keyItems, "lichtbringer"), true);
  assert.equal(getKeyItem("lichtbringer").consumable, false);
});

test("B99F Soul Strangler has all three specials and Lichtbringer weakens it", async () => {
  const boss = getFloorBossByDepth(99);
  assert.equal(boss.id, "seelenwuerger_b99f");
  assert.deepEqual(boss.actions.map(entry => entry.action.name), [
    "魂食い", "終焉の漆黒", "トーデス・ルーフ"
  ]);
  const normal = createBossCombatant(boss);
  const weakened = createBossCombatant(boss, { lightbringerActive: true });
  assert.ok(weakened.maxHp < normal.maxHp);
  assert.ok(weakened.attack < normal.attack);
  assert.ok(weakened.stats.int < normal.stats.int);
  assert.ok(weakened.actions[2].action.effects[0].baseRate
    < normal.actions[2].action.effects[0].baseRate);
  assert.equal(isDungeonDepthUnlocked({ eventFlags: {} }, 100), false);
  assert.equal(isDungeonDepthUnlocked({ eventFlags: { boss_b99f_defeated: true } }, 100), true);
  await access(new URL("../images/bosses/boss_17.avif", import.meta.url));
});

test("the Trapezohedron is a consumable important item reserved for B89F summoning", () => {
  const item = getKeyItem("trapezohedron");
  assert.equal(item.name, "トラペツォエーダー");
  assert.equal(item.sellable, false);
  assert.equal(item.consumable, true);
  assert.equal(getFloorBossByDepth(89).room.summonKeyItemId, item.id);
});

test("accepting request 030 grants the Trapezohedron once", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.highestDungeonDepthReached = 80;
  character.quests.completedQuestIds = [
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_028"
  ];
  const accepted = acceptQuest(character, "guild_030");
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.acceptanceKeyItemId, "trapezohedron");
  assert.equal(hasKeyItem(accepted.character.keyItems, "trapezohedron"), true);
});

test("Lichtbringer restores both normal vision and the minimap in the dark region", async () => {
  const [main, player, renderer] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.match(main, /state\.lightbringerActive = currentDepth >= 90 && currentDepth <= 99/);
  assert.match(main, /concealed: state\.torchFuel <= 0 && !state\.torchEffectForced && !state\.lightbringerActive/);
  assert.match(player, /movedInDarkness = state\.torchFuel <= 0 && !state\.torchEffectForced && !state\.lightbringerActive/);
  assert.match(renderer, /hasEffectiveTorch[\s\S]*state\?\.lightbringerActive/);
});
