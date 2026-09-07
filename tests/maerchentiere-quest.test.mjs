import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { createBossCombatant, getBossById } from "../data/bosses.js";
import { getCardById, sumCardEffectValues } from "../data/cards.js";
import { getOwnedCardCount } from "../data/deck.js";
import { getItem } from "../data/items.js";
import { getItemCount, grantItem } from "../data/inventory.js";
import { getKeyItem, getKeyItemCount, grantKeyItem, hasKeyItem } from "../data/key-items.js";
import {
  BEESWAX_COLLECTION_QUEST_ID,
  JIRENE_SONG_INVESTIGATION_QUEST_ID,
  MAERCHENTIERE_QUEST_ID,
  QUESTS,
  acceptQuest,
  completeMaerchentiereCapture,
  getKirkeHouseInteraction,
  getQuestById,
  getQuestProgress,
  getWaspHiveInteraction,
  grantKirkeSpecialBirdlime,
  isQuestAvailable,
  reportQuest
} from "../data/quests.js";
import { getSpecialRoomDefinition } from "../data/special-rooms.js";
import {
  createBattleState,
  createEnemyAction,
  isCaptureAvailable,
  resolveBattleRound
} from "../combat/battle-engine.js";
import { applyNpcAfterPlayerAttack } from "../combat/npc-support.js";
import {
  addPresence,
  getPresence,
  resetPresence,
  setPassivePresenceIncreaseReduction
} from "../js/presence.js";
import {
  configurePlayer,
  handleOverlayEventInput,
  startKirkeMaerchentiereResultEvent,
  state as playerState
} from "../js/player.js";

function questReadyCharacter() {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat",
    "guild_002_cave_slime",
    "guild_003_b1f_survey"
  );
  character.highestDungeonDepthReached = 80;
  return character;
}

function acceptedMaerchentiereQuest() {
  const character = questReadyCharacter();
  character.quests.completedQuestIds.push(
    JIRENE_SONG_INVESTIGATION_QUEST_ID,
    BEESWAX_COLLECTION_QUEST_ID
  );
  return acceptQuest(character, MAERCHENTIERE_QUEST_ID).character;
}

function birdlimeBattleCharacter({ stones = 0 } = {}) {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.keyItems = grantKeyItem(character.keyItems, "kirke_special_birdlime").keyItems;
  if (stones > 0) character.inventory = grantItem(character.inventory, "stone", stones).inventory;
  character.npcSystem = { registeredIds: [], activeIds: [], records: {} };
  return character;
}

test("quest 029 hive moves to B8 and starts from active quest state without rumor 007", () => {
  assert.equal(getSpecialRoomDefinition(8).content.type, "waspHive");
  assert.equal(getSpecialRoomDefinition(8).content.image, "images/background/dungeon_event_10.avif");
  assert.equal(getSpecialRoomDefinition(18).content, null);

  let character = questReadyCharacter();
  character.eventFlags.jirene_scripted_defeat_seen = true;
  assert.equal(getWaspHiveInteraction(character).canBattle, false);
  character = acceptQuest(character, BEESWAX_COLLECTION_QUEST_ID).character;
  assert.equal(character.eventFlags.tavern_rumor_007_base_read, undefined);
  assert.equal(getWaspHiveInteraction(character).canBattle, true);
  assert.match(getWaspHiveInteraction(character).message, /ワスプ/);
});

test("quest 029 paper uses the objective heading and requested objective", () => {
  const quest = getQuestById(BEESWAX_COLLECTION_QUEST_ID);
  assert.equal(quest.objectiveHeading, "目的");
  assert.equal(quest.objectiveLabel, "蜂の巣を見つけて蜜蝋を15個採取する");
  assert.doesNotMatch(quest.objectiveLabel, /密林区域|討伐数/);
});

test("quest 026 has a unique number and unlocks only after reported quests 028 and 029", () => {
  const quest = getQuestById(MAERCHENTIERE_QUEST_ID);
  assert.equal(quest.number, "026");
  assert.equal(quest.title, "メルヒェンティーレ");
  assert.equal(QUESTS.filter(entry => entry.number === "026").length, 1);
  assert.deepEqual(quest.prerequisiteQuestIds, [JIRENE_SONG_INVESTIGATION_QUEST_ID, BEESWAX_COLLECTION_QUEST_ID]);

  const character = questReadyCharacter();
  assert.equal(isQuestAvailable(character, quest), false);
  character.quests.completedQuestIds.push(JIRENE_SONG_INVESTIGATION_QUEST_ID);
  assert.equal(isQuestAvailable(character, quest), false);
  character.quests.completedQuestIds.push(BEESWAX_COLLECTION_QUEST_ID);
  assert.equal(isQuestAvailable(character, quest), true);
});

test("Kirke gives one reusable birdlime and capture progress survives normalization", () => {
  let character = acceptedMaerchentiereQuest();
  assert.equal(getKirkeHouseInteraction(character).mode, "maerchentiere");
  const first = grantKirkeSpecialBirdlime(character);
  assert.equal(first.accepted, true);
  assert.equal(first.gained, true);
  character = first.character;
  assert.equal(hasKeyItem(character.keyItems, "kirke_special_birdlime"), true);
  assert.equal(getKeyItem("kirke_special_birdlime").sellable, false);

  const second = grantKirkeSpecialBirdlime(character);
  assert.equal(second.accepted, true);
  assert.equal(second.gained, false);
  assert.equal(getKeyItemCount(second.character.keyItems, "kirke_special_birdlime"), 1);

  const captured = completeMaerchentiereCapture(second.character);
  assert.equal(captured.accepted, true);
  assert.equal(getQuestProgress(captured.character, MAERCHENTIERE_QUEST_ID).readyToReport, true);
  assert.equal(getKirkeHouseInteraction(captured.character).mode, "normal");
  const restored = normalizeCharacter(JSON.parse(JSON.stringify(captured.character)));
  assert.equal(restored.eventFlags.quest_026_birdlime_received, true);
  assert.equal(restored.eventFlags.quest_026_maerchentiere_captured, true);
  assert.equal(hasKeyItem(restored.keyItems, "kirke_special_birdlime"), true);
  assert.equal(getQuestProgress(restored, MAERCHENTIERE_QUEST_ID).readyToReport, true);
});

test("Maerchentiere uses a deterministic harmless three-action cycle", async () => {
  const boss = createBossCombatant(getBossById("maerchentiere_b58f"));
  assert.equal(boss.maxHp, 30);
  assert.equal(boss.battleBgmKey, "maerchentiereBoss");
  const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(mainSource, /function beginMaerchentiereBattle[\s\S]*?startBgm\(selectBattleBgm\(boss\)\)/);
  assert.equal(boss.hp, 30);
  assert.equal(boss.experienceReward, 0);
  assert.equal(boss.noDrop, true);
  const messages = [1, 2, 3, 4].map(turn => createEnemyAction(boss, () => 0.99, { battle: { turn } }).waitMessage);
  assert.match(messages[0], /カニンヒェン「Ja…!!」/);
  assert.match(messages[1], /ニートリヒ「Woo…!!」/);
  assert.match(messages[2], /ブレッセ「蜂蜜こぼして怒られない…？」/);
  assert.equal(messages[3], messages[0]);
});

test("three successful stones leave 3 HP and birdlime captures without being consumed", () => {
  const character = birdlimeBattleCharacter({ stones: 3 });
  let battle = createBattleState({ character, enemy: createBossCombatant("maerchentiere_b58f") });
  for (const expectedHp of [21, 12, 3]) {
    const round = resolveBattleRound({
      battle,
      playerCommand: { type: "item", itemId: "stone" },
      rng: () => 0
    });
    assert.equal(round.accepted, true);
    battle = round.battle;
    assert.equal(battle.enemy.hp, expectedHp);
  }
  assert.equal(isCaptureAvailable({ ...battle.enemy, hp: 4 }), false);
  assert.equal(isCaptureAvailable(battle.enemy), true);
  assert.equal(getItemCount(battle.player.inventory, "stone"), 0);

  const captured = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "kirke_special_birdlime" },
    rng: () => 0
  });
  assert.equal(captured.battle.outcome, "maerchentiereCaptured");
  assert.equal(captured.battle.enemy.captured, true);
  assert.equal(captured.battle.enemy.image, "images/npc/NPC_event_24.avif");
  assert.equal(hasKeyItem(captured.battle.player.keyItems, "kirke_special_birdlime"), true);
  assert.equal(captured.battle.log.some(line => /蜂蜜を舐めている|興奮している|うろたえている/.test(line)), false);
});

test("birdlime fails at HP4, ignores unsupported targets, and HP0 is an unrewarded escape", () => {
  const character = birdlimeBattleCharacter({ stones: 1 });
  let battle = createBattleState({ character, enemy: createBossCombatant("maerchentiere_b58f") });
  battle.enemy.hp = 4;
  const tooHealthy = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "kirke_special_birdlime" },
    rng: () => 0
  });
  assert.equal(tooHealthy.battle.outcome, null);
  assert.match(tooHealthy.battle.log.join("\n"), /まだ元気すぎて拘束できない/);
  assert.equal(hasKeyItem(tooHealthy.battle.player.keyItems, "kirke_special_birdlime"), true);

  battle = createBattleState({ character, enemy: createBossCombatant("maerchentiere_b58f") });
  battle.enemy.hp = 9;
  const escaped = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "stone" },
    rng: () => 0
  });
  assert.equal(escaped.battle.enemy.hp, 0);
  assert.equal(escaped.battle.outcome, "maerchentiereEscaped");
  assert.equal(escaped.battle.enemy.experienceReward, 0);
  assert.equal(escaped.battle.enemy.noDrop, true);
  assert.match(escaped.battle.log.at(-1), /逃げていった/);

  const outside = {
    id: "dummy", name: "DUMMY", hp: 10, maxHp: 10, sp: 0, maxSp: 0,
    stats: { str: 1, int: 1, agi: 1, dex: 1, luc: 1 }, def: 0, attack: 0,
    statuses: [], actions: [], alive: true
  };
  const unsupported = resolveBattleRound({
    battle: createBattleState({ character, enemy: outside }),
    playerCommand: { type: "item", itemId: "kirke_special_birdlime" },
    rng: () => 0
  });
  assert.match(unsupported.battle.log.join("\n"), /効果がなかった/);
  assert.equal(hasKeyItem(unsupported.battle.player.keyItems, "kirke_special_birdlime"), true);
});

test("capture battles suppress NPC instant-death bonus damage without suppressing the NPC attack", () => {
  const character = birdlimeBattleCharacter();
  character.npcSystem = {
    registeredIds: ["alec"],
    activeIds: ["alec"],
    records: { alec: { growthStage: 10, charge: 0, chargeCooldown: 0 } }
  };
  const enemy = createBossCombatant("maerchentiere_b58f");
  enemy.hp = 1000;
  enemy.maxHp = 1000;
  const battle = createBattleState({ character, enemy });
  applyNpcAfterPlayerAttack(battle, () => 0);
  const event = battle.presentationEvents.find(entry => entry.type === "attackHit" && entry.npcId === "alec");
  assert.ok(event);
  assert.ok(event.damage > 0);
  assert.equal(battle.enemy.hp, 1000 - event.damage);
  assert.equal(event.passiveExecutionId, null);
  assert.doesNotMatch(battle.log.join("\n"), /一閃・極|追加\d+ダメージ/);
});

test("quest 026 report grants Swift Foot and five Zaubertrank once", () => {
  let character = acceptedMaerchentiereQuest();
  character = grantKirkeSpecialBirdlime(character).character;
  character = completeMaerchentiereCapture(character).character;
  const report = reportQuest(character, MAERCHENTIERE_QUEST_ID);
  assert.equal(report.accepted, true);
  assert.equal(report.rewardCardId, "legendary_swift_foot");
  assert.deepEqual(report.rewardItems, [{ itemId: "zaubertrank", amount: 5 }]);
  assert.equal(getOwnedCardCount(report.character.cards, "legendary_swift_foot"), 1);
  assert.equal(getItemCount(report.character.inventory, "zaubertrank"), 5);
  assert.equal(reportQuest(report.character, MAERCHENTIERE_QUEST_ID).accepted, false);
});

test("Swift Foot makes final presence gain zero and removing it restores normal gain", () => {
  const card = getCardById("legendary_swift_foot");
  assert.equal(card.rarity, "L");
  assert.equal(card.cost, 6);
  assert.equal(card.effectId, "presence_gain_reduction");
  assert.equal(card.effectValue, 1);
  assert.equal(getItem("kirke_special_birdlime").reusable, true);

  resetPresence();
  setPassivePresenceIncreaseReduction(sumCardEffectValues([card.id], "presence_gain_reduction"));
  addPresence(8);
  assert.equal(getPresence(), 0);
  setPassivePresenceIncreaseReduction(0);
  addPresence(8);
  assert.equal(getPresence(), 8);
  resetPresence();
});

test("Kirke result dialogue waits for input and exits only after every requested page", () => {
  const messages = [];
  configurePlayer({
    say: message => messages.push(message),
    cancelAutoReturn: () => {},
    onStateChanged: () => {}
  });
  playerState.overlayEvent = null;
  playerState.anim = null;
  startKirkeMaerchentiereResultEvent({ captured: true });
  assert.equal(playerState.overlayEvent.pages.length, 5);
  assert.match(messages.at(-1), /大鍋で煮込んじまおうかねえ/);
  assert.equal(playerState.overlayEvent.pageIndex, 0);
  for (let index = 1; index < 5; index += 1) {
    assert.equal(handleOverlayEventInput("confirm"), true);
    assert.equal(playerState.overlayEvent.pageIndex, index);
  }
  assert.match(messages.at(-1), /女王様を必ず見つけ出しておくれ/);
  assert.equal(handleOverlayEventInput("confirm"), true);
  assert.equal(playerState.overlayEvent, null);

  startKirkeMaerchentiereResultEvent({ captured: false });
  assert.equal(playerState.overlayEvent.pages.length, 2);
  assert.match(messages.at(-1), /逃げちまったじゃないか/);
  assert.equal(handleOverlayEventInput("confirm"), true);
  assert.match(messages.at(-1), /アンタひとりで来た方がいい/);
  assert.equal(handleOverlayEventInput("confirm"), true);
  assert.equal(playerState.overlayEvent, null);
});

test("quest 026 assets and input-driven event wiring are present", async () => {
  const [main, player, town, battle, css] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/player.js", import.meta.url), "utf8"),
    readFile(new URL("../js/town.js", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8"),
    readFile(new URL("../css/battle.css", import.meta.url), "utf8")
  ]);
  await Promise.all([
    access(new URL("../images/background/dungeon_event_12.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_23.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_24.avif", import.meta.url)),
    access(new URL("../images/bosses/boss_20.avif", import.meta.url))
  ]);
  assert.match(main, /ギルドマスター「蜜蝋集めか。蜂の巣を探すのは骨が折れそうだ。酒場で情報でも集めたらどうだ？\\n＊Aボタンで次へ/);
  assert.match(main, /function showNamedItemGetEffect[\s\S]*?townScreen\?\.hidden[\s\S]*?viewport\.append\(itemGetEffect\)/);
  assert.match(town, /quest\.objectiveHeading \|\|/);
  assert.match(player, /maerchentierePrompt[\s\S]*?＊Aボタン：はい　Bボタン：いいえ/);
  assert.match(player, /maerchentiereBirdlime[\s\S]*?grantKirkeSpecialBirdlime/);
  assert.match(player, /type: "kirkeMaerchentiereResult"/);
  assert.match(player, /キルケ「女王様を必ず見つけ出しておくれ/);
  assert.match(battle, /event\.type === "capture"[\s\S]*?targetImage\.src = event\.image/);
  assert.match(css, /is-capture-available/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
