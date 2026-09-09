import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getKeyItemCount } from "../data/key-items.js";
import { getQuestEventForDepth } from "../data/quest-events.js";
import {
  JOHANNA_RESCUE_QUEST_ID,
  MAERCHENTIERE_QUEST_ID,
  acceptQuest
} from "../data/quests.js";
import {
  FLEISCHFRESSERKNOSPE_DEFEATED_FLAG,
  JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG,
  JOHANNA_RESCUE_KIRKE_CONSULTED_FLAG,
  JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG,
  consultKirkeForJohannaMedicine,
  getJohannaRescueSpringMode,
  grantJohannaRescueFlower,
  markJohannaRescueSpringIntroSeen,
  recordFleischfresserknospeDefeat
} from "../data/quest-031.js";
import { getSpecialRoomDefinition } from "../data/special-rooms.js";
import {
  buildBoundaryWallMap,
  cells,
  getCellType,
  setStartPosition
} from "../js/dungeon.js";
import {
  configurePlayer,
  handleOverlayEventInput,
  startJohannaMedicineSpringResultEvent,
  state as playerState,
  updateAnimation
} from "../js/player.js";

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function acceptedJohannaRescue() {
  const character = createInitialCharacter({ name: "SPRING", job: "priest" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat",
    "guild_002_cave_slime",
    "guild_003_b1f_survey",
    MAERCHENTIERE_QUEST_ID
  );
  character.eventFlags.quest_031_anna_request_unlocked = true;
  const accepted = acceptQuest(character, JOHANNA_RESCUE_QUEST_ID);
  assert.equal(accepted.accepted, true);
  return accepted.character;
}

function resetPlayerOverlay() {
  Object.assign(playerState, {
    gridX: 0,
    gridY: 0,
    x: 0.5,
    y: 0.5,
    anim: null,
    overlayEvent: null,
    autoReturning: false,
    autoWalkerActive: false,
    autoReturnPaused: false,
    torchFuel: 100
  });
}

function enterGeneratedSpecialRoom(roomCell) {
  const fromGX = roomCell.x === 0 ? 1 : roomCell.x - 1;
  const fromGY = roomCell.y;
  Object.assign(playerState, {
    gridX: fromGX,
    gridY: fromGY,
    x: fromGX + 0.5,
    y: fromGY + 0.5,
    anim: {
      type: "move",
      start: 0,
      duration: 1,
      fromX: fromGX + 0.5,
      fromY: fromGY + 0.5,
      fromGX,
      fromGY,
      toX: roomCell.x + 0.5,
      toY: roomCell.y + 0.5,
      toGX: roomCell.x,
      toGY: roomCell.y,
      cellType: getCellType(roomCell.x, roomCell.y)
    }
  });
  updateAnimation(2);
}

function springInspection(character) {
  const mode = getJohannaRescueSpringMode(character);
  return {
    available: ["intro", "retry", "flowerHandoff"].includes(mode),
    introSeen: mode === "retry",
    bossDefeated: mode === "flowerHandoff",
    flowerReceived: mode === "resolved",
    message: "木々の奥に泉がある。"
  };
}

test("B57 has the fixed medicine spring while the B57 ingredient and B58 Kirke room remain intact", async () => {
  const spring = getSpecialRoomDefinition(57);
  assert.equal(spring.lock.mode, "alwaysSuccess");
  assert.deepEqual(spring.content, {
    type: "johannaMedicineSpring",
    bossId: "fleischfresserknospe_b57f",
    backgroundImageId: "johanna_medicine_spring_b57f",
    backgroundImage: "images/background/dungeon_event_14.avif",
    reachingImageId: "maerchentiere_reaching_flower_b57f",
    reachingImage: "images/npc/NPC_event_28.avif",
    offeringImageId: "maerchentiere_offering_flower_b57f",
    offeringImage: "images/npc/NPC_event_29.avif",
    minimapMarker: "E",
    revealBeforeExploration: true
  });
  assert.equal(getSpecialRoomDefinition(58).content.type, "kirkeHouse");
  assert.equal(getSpecialRoomDefinition(58).content.bossId, undefined);

  const ingredient = getQuestEventForDepth(57, {
    activeQuestIds: ["guild_016"],
    eventFlags: {}
  });
  assert.equal(ingredient.id, "special_medicine_ingredient_b57f_event");

  setStartPosition(0, 0);
  buildBoundaryWallMap(57, seeded(31057), {
    activeQuestIds: ["guild_016", JOHANNA_RESCUE_QUEST_ID],
    eventFlags: {}
  });
  const roomCell = cells.flat().find(cell => cell.specialRoom?.content?.type === "johannaMedicineSpring");
  const ingredientCell = cells.flat().find(cell => cell.questEvent?.id === ingredient.id);
  assert.ok(roomCell);
  assert.ok(ingredientCell);
  assert.notEqual(roomCell, ingredientCell);
  assert.equal(roomCell.treasure, null);

  await Promise.all([
    access(new URL("../images/background/dungeon_event_14.avif", import.meta.url)),
    access(new URL("../images/bosses/boss_23.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_28.avif", import.meta.url)),
    access(new URL("../images/npc/NPC_event_29.avif", import.meta.url))
  ]);
});

test("the B57 spring cannot start its boss before Kirke has been consulted", () => {
  let character = acceptedJohannaRescue();
  const messages = [];
  let battles = 0;
  let introMarks = 0;
  configurePlayer({
    say: message => messages.push(message),
    inspectJohannaMedicineSpring: () => springInspection(character),
    markJohannaMedicineSpringIntroSeen: () => { introMarks += 1; return true; },
    beginJohannaMedicineSpringBattle: () => { battles += 1; return true; },
    onDungeonStep: () => {},
    onRoamingEnemyPlayerStep: () => ({ handled: false }),
    updateRoamingEnemyAnimation: () => ({ contact: false }),
    onStateChanged: () => {},
    playSe: () => {},
    cancelAutoReturn: () => {}
  });
  resetPlayerOverlay();
  setStartPosition(0, 0);
  buildBoundaryWallMap(57, seeded(41057), {
    activeQuestIds: [JOHANNA_RESCUE_QUEST_ID],
    eventFlags: character.eventFlags
  });
  enterGeneratedSpecialRoom(cells.flat().find(cell => cell.specialRoom?.content?.type === "johannaMedicineSpring"));

  assert.equal(getJohannaRescueSpringMode(character), "unavailable");
  assert.equal(playerState.overlayEvent?.phase, "inactive");
  assert.match(messages.at(-1), /木々の奥に泉がある/);
  assert.equal(introMarks, 0);
  assert.equal(battles, 0);
  handleOverlayEventInput("confirm");
  assert.equal(battles, 0);
});

test("the first spring visit is nine input-driven pages, changes to NPC_event_28, then starts one boss battle", () => {
  let character = consultKirkeForJohannaMedicine(acceptedJohannaRescue()).character;
  const messages = [];
  let battles = 0;
  let introMarks = 0;
  configurePlayer({
    say: message => messages.push(message),
    inspectJohannaMedicineSpring: () => springInspection(character),
    markJohannaMedicineSpringIntroSeen: () => {
      introMarks += 1;
      const result = markJohannaRescueSpringIntroSeen(character);
      character = result.character;
      return result.accepted;
    },
    beginJohannaMedicineSpringBattle: ({ fromGX, fromGY }) => {
      battles += 1;
      assert.equal(Number.isInteger(fromGX), true);
      assert.equal(Number.isInteger(fromGY), true);
      return true;
    },
    onDungeonStep: () => {},
    onRoamingEnemyPlayerStep: () => ({ handled: false }),
    updateRoamingEnemyAnimation: () => ({ contact: false }),
    onStateChanged: () => {},
    playSe: () => {},
    cancelAutoReturn: () => {}
  });
  resetPlayerOverlay();
  setStartPosition(0, 0);
  buildBoundaryWallMap(57, seeded(51057), {
    activeQuestIds: [JOHANNA_RESCUE_QUEST_ID],
    eventFlags: character.eventFlags
  });
  const roomCell = cells.flat().find(cell => cell.specialRoom?.content?.type === "johannaMedicineSpring");
  enterGeneratedSpecialRoom(roomCell);

  assert.equal(playerState.overlayEvent?.phase, "intro");
  assert.equal(playerState.overlayEvent?.pages.length, 9);
  assert.equal(playerState.overlayEvent?.pageIndex, 0);
  assert.equal(playerState.overlayEvent?.backgroundImageId, "johanna_medicine_spring_b57f");
  assert.equal(playerState.overlayEvent?.imageId, undefined);
  assert.equal(introMarks, 1);
  assert.equal(character.eventFlags[JOHANNA_RESCUE_SPRING_INTRO_SEEN_FLAG], true);

  for (let page = 1; page < 9; page += 1) {
    assert.equal(handleOverlayEventInput("confirm"), true);
    assert.equal(playerState.overlayEvent?.pageIndex, page);
    if (page < 5) assert.equal(playerState.overlayEvent?.imageId, undefined);
  }
  assert.equal(playerState.overlayEvent?.imageId, "maerchentiere_reaching_flower_b57f");
  assert.equal(playerState.overlayEvent?.imageFit, "cover");
  assert.match(messages.at(-1), /巨大な蕾と対峙した/);
  assert.equal(battles, 0);

  assert.equal(handleOverlayEventInput("confirm"), true);
  assert.equal(playerState.overlayEvent, null);
  assert.equal(battles, 1);
});

test("a revisit skips the long introduction and starts the retry from its confirmation", () => {
  let character = consultKirkeForJohannaMedicine(acceptedJohannaRescue()).character;
  character = markJohannaRescueSpringIntroSeen(character).character;
  let battles = 0;
  let introMarks = 0;
  configurePlayer({
    say: () => {},
    inspectJohannaMedicineSpring: () => springInspection(character),
    markJohannaMedicineSpringIntroSeen: () => { introMarks += 1; return true; },
    beginJohannaMedicineSpringBattle: () => { battles += 1; return true; },
    onDungeonStep: () => {},
    onRoamingEnemyPlayerStep: () => ({ handled: false }),
    updateRoamingEnemyAnimation: () => ({ contact: false }),
    onStateChanged: () => {},
    playSe: () => {},
    cancelAutoReturn: () => {}
  });
  resetPlayerOverlay();
  setStartPosition(0, 0);
  buildBoundaryWallMap(57, seeded(61057), {
    activeQuestIds: [JOHANNA_RESCUE_QUEST_ID],
    eventFlags: character.eventFlags
  });
  enterGeneratedSpecialRoom(cells.flat().find(cell => cell.specialRoom?.content?.type === "johannaMedicineSpring"));

  assert.equal(playerState.overlayEvent?.phase, "retryPrompt");
  assert.equal(playerState.overlayEvent?.pages, undefined);
  assert.equal(introMarks, 0);
  handleOverlayEventInput("confirm");
  assert.equal(playerState.overlayEvent, null);
  assert.equal(battles, 1);
});

test("victory resumes the NPC_event_29 flower handoff and grants the saved key item only once", () => {
  let character = consultKirkeForJohannaMedicine(acceptedJohannaRescue()).character;
  character = recordFleischfresserknospeDefeat(character).character;
  const content = getSpecialRoomDefinition(57).content;
  const messages = [];
  let grantCalls = 0;
  configurePlayer({
    say: message => messages.push(message),
    grantNightDewFlower: () => {
      grantCalls += 1;
      const result = grantJohannaRescueFlower(character);
      character = result.character;
      return result;
    },
    onStateChanged: () => {},
    cancelAutoReturn: () => {}
  });
  resetPlayerOverlay();

  assert.equal(getJohannaRescueSpringMode(character), "flowerHandoff");
  startJohannaMedicineSpringResultEvent({ content, fromGX: 2, fromGY: 3 });
  assert.equal(playerState.overlayEvent?.pages.length, 7);
  assert.equal(playerState.overlayEvent?.backgroundImageId, "johanna_medicine_spring_b57f");
  assert.equal(playerState.overlayEvent?.imageId, "");
  handleOverlayEventInput("confirm");
  assert.equal(playerState.overlayEvent?.imageId, "");
  handleOverlayEventInput("confirm");
  assert.equal(playerState.overlayEvent?.imageId, "maerchentiere_offering_flower_b57f");
  assert.equal(playerState.overlayEvent?.imageFit, "containFull");
  handleOverlayEventInput("confirm");
  handleOverlayEventInput("confirm");
  assert.equal(grantCalls, 1);
  assert.equal(getKeyItemCount(character.keyItems, "night_dew_flower"), 1);
  assert.equal(character.eventFlags[JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG], true);
  assert.match(messages.at(-1), /『夜露の花』を手に入れた/);
  assert.equal(getJohannaRescueSpringMode(character), "resolved");
  while (playerState.overlayEvent) handleOverlayEventInput("confirm");

  const duplicate = grantJohannaRescueFlower(character);
  assert.equal(duplicate.accepted, true);
  assert.equal(duplicate.gained, false);
  assert.equal(duplicate.changed, false);
  assert.equal(getKeyItemCount(duplicate.character.keyItems, "night_dew_flower"), 1);
  const restored = normalizeCharacter(JSON.parse(JSON.stringify(duplicate.character)));
  assert.equal(restored.eventFlags[FLEISCHFRESSERKNOSPE_DEFEATED_FLAG], true);
  assert.equal(restored.eventFlags[JOHANNA_RESCUE_FLOWER_RECEIVED_FLAG], true);
  assert.equal(getKeyItemCount(restored.keyItems, "night_dew_flower"), 1);
});

test("main wires the B57 battle identity, saved victory handoff, retry origin, and renderer assets", async () => {
  const [mainSource, rendererSource] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8")
  ]);
  assert.match(mainSource, /function beginJohannaMedicineSpringBattle[\s\S]*currentDepth !== 57[\s\S]*getBossById\("fleischfresserknospe_b57f"\)/);
  assert.match(mainSource, /activeRareRoomEncounterId = "quest_031_fleischfresserknospe"[\s\S]*startBattle\(combatant/);
  assert.match(mainSource, /questJohannaMedicineBossVictory[\s\S]*recordFleischfresserknospeDefeat\(character\)[\s\S]*saveGame\(\)[\s\S]*startJohannaMedicineSpringResultEvent/);
  assert.match(mainSource, /resumeJohannaFlowerHandoff = currentDepth === 57[\s\S]*getJohannaRescueSpringMode\(character\) === "flowerHandoff"[\s\S]*featureApproach\?\.id === springDefinition\?\.id[\s\S]*startJohannaMedicineSpringResultEvent/);
  assert.match(mainSource, /escapedJohannaMedicineBoss[\s\S]*state\.gridX = johannaMedicineEncounterOrigin\.x[\s\S]*もう一度クスノペに挑戦できる/);
  assert.match(mainSource, /fixedContent \?\? savedCell\.specialRoom\?\.content \?\? null/);
  assert.match(rendererSource, /loadCharacterImage\("johanna_medicine_spring_b57f", "images\/background\/dungeon_event_14\.avif"\)/);
  assert.match(rendererSource, /loadCharacterImage\("maerchentiere_reaching_flower_b57f", "images\/npc\/NPC_event_28\.avif"\)/);
  assert.match(rendererSource, /loadCharacterImage\("maerchentiere_offering_flower_b57f", "images\/npc\/NPC_event_29\.avif"\)/);
});
