import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { createInitialCharacter } from "../data/classes.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { getKeyItem } from "../data/key-items.js";
import { isDungeonDepthUnlocked } from "../data/quests.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import {
  createBattleState,
  getJireneScriptedCommand,
  resolveJireneScriptedRound
} from "../combat/battle-engine.js";

test("Jirene is the keyed B79F checkpoint boss with supplied artwork and future reward left empty", async () => {
  const boss = getBossById("jirene_b79f");
  assert.equal(boss.name, "ジレーネ");
  assert.equal(boss.level, 90);
  assert.equal(boss.floor, 79);
  assert.equal(boss.maxHp, 7000);
  assert.equal(boss.experienceReward, 40000);
  assert.equal(boss.elementMultipliers.lightning, 1.5);
  assert.equal(boss.elementMultipliers.ice, 0.75);
  assert.equal(boss.room.keyItemId, "red_rust_key_b79f");
  assert.equal(boss.room.unlockFlag, "red_door_b79f_unlocked");
  assert.deepEqual(boss.reward, { type: "none" });
  assert.equal(getKeyItem("red_rust_key_b79f").sellable, false);
  await Promise.all([
    access(new URL("../images/bosses/boss_15.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_17.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_18.avif", import.meta.url))
  ]);
});

test("B79F generates Jirene's isolated boss room and a red-rust-key chest", () => {
  buildBoundaryWallMap(79, () => 0.5, {});
  const room = cells.flat().filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "jirene_b79f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  const keyChests = cells.flat().filter(cell => cell.eventTreasureId === "red_rust_key_b79f_chest");
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
});

test("Jirene's song selects only attacks, guard, or affordable hostile skills", () => {
  const character = createInitialCharacter({ name: "TEST", job: "priest" });
  character.skillIds = ["greater_healing", "holy_light"];
  character.sp = 12;
  const battle = createBattleState({ character, enemy: createBossCombatant("jirene_b79f") });
  assert.deepEqual(getJireneScriptedCommand(battle, () => 0.1), { type: "attack" });
  assert.deepEqual(getJireneScriptedCommand(battle, () => 0.45), { type: "guard" });
  assert.deepEqual(getJireneScriptedCommand(battle, () => 0.8), { type: "skill", skillId: "holy_light" });
  battle.player.sp = 0;
  assert.deepEqual(getJireneScriptedCommand(battle, () => 0.8), { type: "attack" });
});

test("Jirene's first encounter runs three protected automatic turns without NPC support", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.str = 999;
  character.npcSystem = {
    activeParty: ["alec"],
    records: { alec: { registered: true, growthStage: 10, charge: 100, chargeCooldown: 0 } }
  };
  let battle = createBattleState({ character, enemy: createBossCombatant("jirene_b79f") });
  battle.enemy.hp = 1;
  battle.scriptedBattleType = "jirene_first_encounter";
  battle.scriptedTurn = 1;
  battle.scriptedNonlethal = true;
  battle.npcSupportSuppressed = true;
  const originalCharge = battle.player.npcSystem.records.alec.charge;
  for (let turn = 1; turn <= 3; turn += 1) {
    const result = resolveJireneScriptedRound({ battle, rng: () => 0.1 });
    assert.equal(result.accepted, true);
    battle = result.battle;
    assert.ok(battle.player.hp >= 1);
    assert.ok(battle.enemy.hp >= 1);
  }
  assert.equal(battle.outcome, "jireneScriptedDefeat");
  assert.equal(battle.player.npcSystem.records.alec.charge, originalCharge);
  assert.match(battle.log.join("\n"), /もう、お眠りなさい/);
});

test("B80 remains locked until Jirene is genuinely defeated", () => {
  assert.equal(isDungeonDepthUnlocked({ eventFlags: { jirene_scripted_defeat_seen: true } }, 80), false);
  assert.equal(isDungeonDepthUnlocked({ eventFlags: { boss_jirene_b79f_defeated: true } }, 80), true);
});

test("the scripted battle blocks saving, returns to B79F stairs, and prevents unprotected re-entry", async () => {
  const [mainSource, playerSource, battleSource] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  assert.match(mainSource, /if \(isJireneScriptedBattleActive\(\)\) return false/);
  assert.match(mainSource, /jirene_scripted_defeat_seen && !flags\.jirene_countermeasure_obtained/);
  assert.match(mainSource, /cells\.flat\(\)\.find\(cell => cell\.type === "stairsUp"\)/);
  assert.match(mainSource, /finishJireneScriptedDefeat[\s\S]*?finally\s*\{[\s\S]*?setPlayerInputEnabled\(true\)/);
  assert.match(mainSource, /今はこれ以上進むべきではない…/);
  assert.match(mainSource, /……ここは…？確か、歌声が聞こえて…その後の記憶がない。/);
  assert.match(playerSource, /getBossRoomEntryBlock/);
  assert.match(battleSource, /jireneScriptedDefeat/);
});
