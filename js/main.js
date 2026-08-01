import {
  MAP_W,
  MAP_H,
  DIRS
} from "./config.js";
import {
  cells,
  explored,
  resetExplored,
  buildBoundaryWallMap,
  chooseStartDirection,
  inBounds,
  wallOnCell,
  closedDoorOnCell,
  openDoorOnCell,
  getDoorState,
  getDoorKind,
  setStartPosition,
  randomizeStartPosition
} from "./dungeon.js";
import {
  state,
  configurePlayer,
  resetPlayer,
  refillTorch,
  setTorchFuelDisabled,
  setPlayerInputEnabled,
  updateAnimation,
  manualMove,
  manualTurn,
  openDoorAhead,
  handleOverlayEventInput,
  resumeDismissedStairsPrompt,
  playArrivalSequence,
  startRandomEncounterNotice,
  startAmbushEncounterNotice,
  startFloorLapNotice,
  setNpcTypewriterOptions
} from "./player.js";
import { configureRenderer, startRenderLoop, setScreenShakeEnabled, setTorchFlickerEnabled, setMistOptions, setWallColor, setFloorColor } from "./renderer.js";
import { drawMinimap, getMinimapBounds, setMinimapRevealOptions } from "./minimap.js";
import { configureInput } from "./input.js";
import { configureVirtualStick } from "./virtualStick.js";
import { configureCompass, drawCompass } from "./compass.js";
import { configureMenu, handleMenuInput, getDungeonColors, setDungeonColors, isMenuOpen, openStatusMenu, openDeckEditor } from "./menu.js";
import { resolveFloorTheme } from "./floorTheme.js";
import {
  configureAutoReturn,
  startAutoReturn,
  continueAutoReturn,
  cancelAutoReturn,
  updateAutoReturnButton
} from "./autoReturn.js";
import { configureEvents, messageFor, say } from "./events.js";
import { configureDevice } from "./device.js";
import {
  configurePresence,
  getPresence,
  getPresenceSuppressedSteps,
  restorePresence,
  resetPresence,
  suppressPresence,
  setPresenceDisabled
} from "./presence.js";
import { configureTreasure, showTreasure, playTreasureOpening, hideTreasure } from "./treasure.js";
import {
  configureAudio,
  setBgmOptions,
  setSeOptions,
  playSe,
  playSeSequence,
  startLoopSe,
  stopLoopSe,
  startBgm,
  stopBgm
} from "./audio.js";
import { getSaveSlotSummaries, loadGame, writeGame } from "./save-data.js";
import { configureTown, openTown, closeTown, getTownState, handleTownInput, isTownOpen, renderCharacterStatus, showTownArrival, setTownTypewriterOptions } from "./town.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getEquipmentItem } from "../data/equipment.js";
import { createEnemyCombatant, getEnemyById, getRandomEnemy } from "../data/enemies.js";
import { configureBattle, handleBattleInput, isBattleActive, startBattle } from "./battle.js";
import { awardBattleExperience, createTempleRevival, grantEventItems, resolveDungeonDefeat, resolveInnStay, unlockGuildRequest } from "./character-services.js";
import { deriveDetailStats } from "../combat/derive-detail-stats.js";
import { resolveTreasureTrap } from "../combat/resolve-trap.js";
import { collectStats } from "../combat/collect-stats.js";
import { resolveSurprise } from "../combat/resolve-environment-save.js";
import { resolveDefeatRecovery } from "../combat/resolve-defeat-recovery.js";
import {
  createDepthReturnSettlement,
  formatDepthReturnSettlement
} from "../data/experience-settlement.js";
import { getNonlethalPoisonDamage } from "../combat/status-lifecycle.js";
import { getNextLevelExperience, MAX_LEVEL } from "../data/growth.js";
import { resolveFieldSkill } from "../combat/resolve-field-skill.js";
import { configureSkillOverlay, openSkillOverlay, handleSkillOverlayInput } from "./skill-overlay.js";
import { configureItemOverlay, openItemOverlay, handleItemOverlayInput } from "./item-overlay.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { grantCard } from "../data/deck.js";
import { collectCardStatBonuses, getCardById, hasCardEffect } from "../data/cards.js";
import { drawCardCanvas } from "./card-canvas.js";
import { getItem } from "../data/items.js";
import { purchaseItem } from "../data/commerce.js";
import {
  abandonQuest,
  acceptQuest,
  FLOOR_SURVEY_QUEST_ID,
  hasActiveQuest,
  isDungeonDepthUnlocked,
  recordEnemyDefeat,
  recordFloorExploration,
  reportQuest,
  shouldForceEnemy
} from "../data/quests.js";

(() => {
  const canvas = document.getElementById("screen");
  const ctx = canvas.getContext("2d", { alpha: false });
  const eventOverlayCanvas = document.getElementById("eventOverlay");
  const eventOverlayCtx = eventOverlayCanvas.getContext("2d");
  const treasureCanvas = document.getElementById("treasureCanvas");
  const trapResultEffect = document.getElementById("trapResultEffect");
  const W = canvas.width;
  let runStartedAt = performance.now();
  let floorStartedAt = runStartedAt;
  let saveEnabled = false;
  let autosaveTimer = 0;
  let worldLocation = "dungeon";
  let character = null;


  randomizeStartPosition();
  buildBoundaryWallMap();
  let startDir = chooseStartDirection();

  resetPlayer(startDir);


  const posEl = document.getElementById("pos");
  const depthEl = document.getElementById("depth");
  const msgEl = document.getElementById("message");
  const itemOverlay = document.getElementById("itemOverlay");
  const viewportEl = document.querySelector(".viewport");
  const townPortraitFrame = document.querySelector(".town-portrait-frame");
  const torchMeterEl = document.getElementById("torchMeter");
  const presenceMeterEl = document.getElementById("presenceMeter");
  const compassCanvas = document.getElementById("compass");
  const stopwatchEl = document.getElementById("stopwatch");
  const forwardBtn = document.getElementById("forward");
  const backBtn = document.getElementById("back");
  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const autoReturnBtn = document.getElementById("autoReturn");
  const randomGenerateBtn = document.getElementById("randomGenerate");
  const virtualStickEl = document.getElementById("virtualStick");
  const buttonA = document.getElementById("buttonA");
  const buttonB = document.getElementById("buttonB");
  const menuScreen = document.getElementById("menuScreen");
  const dungeonCommands = document.getElementById("dungeonCommands");
  const townScreen = document.getElementById("townScreen");
  const levelUpEffect = document.getElementById("levelUpEffect");
  const questCompleteEffect = document.getElementById("questCompleteEffect");
  const cardGetEffect = document.getElementById("cardGetEffect");
  const cardGetCanvas = document.getElementById("cardGetCanvas");
  const itemGetEffect = document.getElementById("itemGetEffect");
  const itemGetItems = document.getElementById("itemGetItems");
  const bonusGetEffect = document.getElementById("bonusGetEffect");
  const bonusGetAmount = document.getElementById("bonusGetAmount");
  const experienceSettlementOverlay = document.getElementById("experienceSettlementOverlay");
  const experienceSettlementDetail = document.getElementById("experienceSettlementDetail");
  const battleScreen = document.getElementById("battleScreen");
  const skillOverlay = document.getElementById("skillOverlay");
  const sceneTransition = document.getElementById("sceneTransition");
  const sceneTransitionTitle = document.getElementById("sceneTransitionTitle");
  const defeatMessage = document.getElementById("defeatMessage");
  const questTutorialOverlay = document.getElementById("questTutorialOverlay");
  let sceneTransitionRunning = false;
  let templeRevivalJinglePending = false;
  let cardGetTimer = 0;
  let itemGetTimer = 0;
  let bonusGetTimer = 0;
  let trapResultTimer = 0;
  let experienceSettlementCloseCallback = null;
  let currentDepth = 1;
  let pendingEncounter = null;
  configureDevice();
  configureEvents({ messageEl: msgEl });
  configurePresence({
    onEncounter: prepareRandomEncounter
  });
  configureTreasure({ canvas: treasureCanvas });
  configureAudio();
  startBgm("title");
  configureCompass({ canvas: compassCanvas, state });
  configureRenderer({
    canvas,
    ctx,
    eventOverlayCanvas,
    eventOverlayCtx,
    state,
    wallOnCell,
    closedDoorOnCell,
    openDoorOnCell,
    getDoorState,
    getDoorKind,
    inBounds,
    handleOverlayInput: handleOverlayEventInput,
    updateAnimation,
    updateHud,
    drawMinimap,
    getMinimapOptions: () => ({
      W,
      H: canvas.height,
      MAP_W,
      MAP_H,
      cells,
      explored,
      state
    }),
    getMinimapBounds
  });
  configureAutoReturn({ autoReturnBtn, say, playArrivalSe: playArrivalSequence });
  configurePlayer({
    say,
    cancelAutoReturn,
    continueAutoReturn,
    messageFor,
    getDescendBlockMessage: () => (
      isDungeonDepthUnlocked(character, currentDepth + 1)
        ? ""
        : "まだこの先に進むのは止めた方がよさそうだ。"
    ),
    descendFloor,
    playSe,
    playStairsSequence: () => playSeSequence("stairs", 3),
    runStairsTransition: (onDark) => runSceneTransition({
      playAudio: () => playSeSequence("stairs", 3),
      onDark
    }),
    showTreasure,
    playTreasureOpening,
    hideTreasure,
    resolveTreasureTrap: resolveCurrentTreasureTrap,
    returnToTown,
    beginBattle: beginRandomBattle,
    playNpcVoice: playSe,
    onDungeonStep: handleDungeonStep,
    onStateChanged: scheduleAutosave
  });
  configureTown({
    root: townScreen,
    messageEl: msgEl,
    commandRoot: dungeonCommands,
    getCharacter: () => character,
    onRegister: registerCharacter,
    onEnterDungeon: enterDungeonFromTown,
    onStay: stayAtInn,
    onHeal: healAtTemple,
    onPurchaseItem: purchaseTownItem,
    onEditDeck: openDeckEditor,
    onTalk: talkAtFacility,
    onAcceptRequest: acceptGuildRequest,
    onAbandonRequest: abandonGuildRequest,
    onReportRequest: reportGuildRequest,
    onAmbienceChanged: enabled => {
      if (enabled) startLoopSe("townAmbience");
      else stopLoopSe("townAmbience");
    },
    onBgmChanged: key => {
      if (key === "temple" && (templeRevivalJinglePending || (character && (!character.alive || character.hp <= 0)))) stopBgm();
      else if (key) startBgm(key);
      else stopBgm();
    },
    onFacilityVoice: facilityId => {
      if (facilityId !== "inn") return;
      const voices = ["catVoice01", "catVoice02", "catVoice03"];
      playSe(voices[Math.floor(Math.random() * voices.length)]);
    },
    onStateChanged: scheduleAutosave,
    isMenuOpen,
    playSe
  });
  configureBattle({
    root: battleScreen,
    commandRoot: dungeonCommands,
    messageEl: msgEl,
    getCharacter: () => character,
    onCharacterChanged: updateCharacterFromBattle,
    onVictory: finishBattleVictory,
    onDefeat: finishBattleDefeat,
    onEscape: finishBattleEscape,
    openSkills: ({ character: battleCharacter, onUse }) => openSkillOverlay({
      context: "battle",
      character: battleCharacter,
      onUse
    }),
    openItems: ({ character: battleCharacter, enemy, onUse }) => {
      viewportEl.append(itemOverlay);
      return openItemOverlay({
        context: "battle",
        character: battleCharacter,
        enemy,
        onUse
      });
    },
    playSe
  });

  configureSkillOverlay({
    root: skillOverlay,
    messageEl: msgEl,
    playSe
  });
  configureItemOverlay({
    root: itemOverlay,
    messageEl: msgEl,
    playSe
  });

  function makeSaveSnapshot() {
    const now = performance.now();
    return {
      player: {
        gridX: state.gridX,
        gridY: state.gridY,
        dir: state.dir,
        torchFuel: state.torchFuel,
        treasureCompassActive: state.treasureCompassActive,
        npcEncounterCounts: { ...state.npcEncounterCounts },
        stairsPromptDismissed: state.stairsPromptDismissed
      },
      character: character ? { ...character } : null,
      world: {
        location: worldLocation,
        town: getTownState()
      },
      dungeon: {
        depth: currentDepth,
        cells: structuredClone(cells),
        explored: explored.map(row => row.slice()),
        startPosition: cells.flat().find(cell => cell.type === "stairsUp") || { x: state.gridX, y: state.gridY },
        theme: getDungeonColors(),
        presence: getPresence(),
        presenceSuppressedSteps: getPresenceSuppressedSteps(),
        runElapsedMs: Math.max(0, now - runStartedAt),
        floorElapsedMs: Math.max(0, now - floorStartedAt)
      }
    };
  }

  function saveGame({ announce = false, slot = "auto" } = {}) {
    if (!saveEnabled) return false;
    const isManualSave = /^manual[1-3]$/.test(slot);
    if (isManualSave && worldLocation !== "town") return false;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = 0;
    }
    const snapshot = makeSaveSnapshot();
    const autoSaved = writeGame(snapshot, "auto");
    const saved = isManualSave
      ? autoSaved && writeGame(snapshot, slot)
      : autoSaved;
    if (announce) say(saved ? "セーブしました。" : "セーブに失敗しました。");
    return saved;
  }

  function scheduleAutosave() {
    if (!saveEnabled) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => saveGame(), 250);
  }

  function restoreGame(save) {
    const dungeon = save?.dungeon;
    const player = save?.player;
    if (!dungeon || !player || dungeon.cells.length !== MAP_H || dungeon.explored.length !== MAP_H) return false;
    if (!dungeon.cells.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!dungeon.explored.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!inBounds(player.gridX, player.gridY) || !Number.isInteger(player.dir) || !DIRS[player.dir]) return false;

    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const savedCell = structuredClone(dungeon.cells[y][x]);
        Object.assign(cells[y][x], savedCell);
        cells[y][x].treasureTrapId = savedCell.treasureTrapId || null;
        explored[y][x] = Boolean(dungeon.explored[y][x]);
      }
    }
    const start = dungeon.startPosition;
    if (start && inBounds(start.x, start.y)) setStartPosition(start.x, start.y);
    currentDepth = Math.max(1, Math.floor(Number(dungeon.depth) || 1));
    setDungeonColors(dungeon.theme || {});
    state.anim = null;
    state.gridX = player.gridX;
    state.gridY = player.gridY;
    state.dir = player.dir;
    state.x = player.gridX + .5;
    state.y = player.gridY + .5;
    state.angle = DIRS[player.dir].angle;
    state.shake = 0;
    state.torchFuel = Math.max(0, Math.min(100, Number(player.torchFuel) || 0));
    state.treasureCompassActive = Boolean(player.treasureCompassActive);
    state.autoReturning = false;
    state.autoPath = [];
    state.overlayEvent = null;
    state.npcAwarenessShown = false;
    state.npcEncounterCounts = player.npcEncounterCounts && typeof player.npcEncounterCounts === "object" ? { ...player.npcEncounterCounts } : {};
    state.stairsPromptDismissed = Boolean(player.stairsPromptDismissed);
    character = normalizeCharacter(save.character);
    restorePresence(dungeon.presence, dungeon.presenceSuppressedSteps);
    const now = performance.now();
    runStartedAt = now - Math.max(0, Number(dungeon.runElapsedMs) || 0);
    floorStartedAt = now - Math.max(0, Number(dungeon.floorElapsedMs) || 0);
    cancelAutoReturn(false);
    updateAutoReturnButton();
    updateHud();
    updateCharacterUi();
    const savedLocation = save.world?.location === "town" ? "town" : "dungeon";
    worldLocation = savedLocation;
    if (savedLocation === "town") {
      state.treasureCompassActive = false;
      stopBgm();
      setPlayerInputEnabled(false);
      openTown({
        registrationRequired: !character,
        facilityId: save.world?.town?.facilityId,
        mode: save.world?.town?.mode
      });
    } else {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
      closeTown();
      say("冒険を再開しました。");
    }
    return true;
  }

  function startNewGame() {
    saveEnabled = true;
    currentDepth = 1;
    setDungeonColors({ wall: "default", floor: "default" });
    resetDungeon("", null, true);
    character = null;
    worldLocation = "town";
    state.treasureCompassActive = false;
    stopBgm();
    setPlayerInputEnabled(false);
    updateCharacterUi();
    openTown({ registrationRequired: true, facilityId: "guild" });
    saveGame();
  }

  function continueGame(slot = "auto") {
    const save = loadGame(slot);
    saveEnabled = true;
    if (!restoreGame(save)) {
      startNewGame();
      return;
    }
    if (slot !== "auto") saveGame();
  }

  function registerCharacter({ name, job, jobLabel }) {
    character = createInitialCharacter({ name, job, jobLabel });
    acquireEventCard("guild_registration_card", "common_strength_up");
    updateCharacterUi();
    saveGame();
    startBgm("townFacilities");
    return {
      message: "ギルド長：これを持っていけ。ついでに町を見て回ったらどうだ？一通り回ったら、また戻ってこい。"
    };
  }

  function acquireEventCard(flagId, cardId) {
    if (!character || character.eventFlags?.[flagId]) return false;
    const result = grantCard(character.cards, cardId, 1, character.deckCost);
    character.cards = result.cards;
    character.eventFlags = { ...(character.eventFlags || {}), [flagId]: true };
    character.cardStatBonuses = collectCardStatBonuses(character.cards.deckSlots);
    if (result.gained > 0) setTimeout(() => showCardGetEffect(cardId), 0);
    return result.gained > 0;
  }

  function showCardGetEffect(cardId) {
    const card = getCardById(cardId);
    if (!cardGetEffect || !cardGetCanvas || !card) return;
    window.clearTimeout(cardGetTimer);
    playSe("battleVictory");
    drawCardCanvas(cardGetCanvas, card);
    cardGetEffect.hidden = false;
    cardGetEffect.classList.remove("is-active");
    void cardGetEffect.offsetWidth;
    cardGetEffect.classList.add("is-active");
    cardGetTimer = window.setTimeout(() => {
      cardGetEffect.classList.remove("is-active");
      cardGetEffect.hidden = true;
    }, 3400);
  }

  function acquireEventItems(flagId, itemIds) {
    const result = grantEventItems(character, flagId, itemIds);
    if (result.alreadyReceived) return false;
    character = result.character;
    if (result.gainedItemIds.length > 0) {
      setTimeout(() => showItemGetEffect(result.gainedItemIds), 0);
    }
    return true;
  }

  function showItemGetEffect(itemIds, { important = false } = {}) {
    const items = itemIds.map(getItem).filter(Boolean);
    if (!itemGetEffect || !itemGetItems || items.length === 0) return;
    window.clearTimeout(itemGetTimer);
    playSe(important ? "importantItem" : "itemGet");
    itemGetItems.replaceChildren(...items.map(item => {
      const row = document.createElement("span");
      row.textContent = `${item.name} ×1`;
      return row;
    }));
    itemGetEffect.hidden = false;
    itemGetEffect.classList.remove("is-active");
    void itemGetEffect.offsetWidth;
    itemGetEffect.classList.add("is-active");
    itemGetTimer = window.setTimeout(() => {
      itemGetEffect.classList.remove("is-active");
      itemGetEffect.hidden = true;
    }, 3400);
  }

  function talkAtFacility(facilityId) {
    if (facilityId === "guild" && character?.eventFlags?.guild_registration_card) {
      const unlock = unlockGuildRequest(character);
      if (unlock.unlocked) {
        character = unlock.character;
        updateCharacterUi();
        saveGame();
        return {
          message: "ギルド長：ふっ…。俺以外にもお節介がいたようだな。…ところで、お前に仕事を頼みたい。",
          focusCommand: "accept"
        };
      }
      if (hasActiveQuest(character)) {
        return "ギルド長：依頼の件、頼んだぞ。";
      }
      if (character.eventFlags?.guild_first_request_unlocked) {
        return "ギルド長：仕事の話だ。依頼受注を選んでくれ。";
      }
      return "ギルド長：これを持っていけ。ついでに町を見て回ったらどうだ？一通り回ったら、また戻ってこい。";
    }
    const rewards = {
      guild: {
        flag: "guild_registration_card",
        cardId: "common_strength_up",
        first: "ギルド長：これを持っていけ。ついでに町を見て回ったらどうだ？\n腕力上昇のカードを手に入れた！",
        repeat: "ギルド長：よぉ。今日はどうした？"
      },
      inn: {
        flag: "inn_first_talk_card",
        cardId: "common_lucky_charm",
        first: "女将：旅のお守りに、これを持っておいき。\n幸運のお守りのカードを手に入れた！",
        repeat: "女将：お代はいらないよ。ゆっくりと身体を休めるんだよ。"
      },
      library: {
        flag: "library_first_talk_card",
        cardId: "common_knowledge_book",
        first: "司書：…この本なら、あなたの役に立つかしら…？\n知識の書のカードを手に入れた！",
        repeat: "司書：…何を…見たいのかしら…？"
      },
      temple: {
        flag: "temple_first_talk_items",
        itemIds: ["exorcism_talisman", "holy_water"],
        first: "司祭：試練へ赴く貴方に、これを授けよと女神様より啓示がありました。退魔の護符と聖水です。どうかご武運を。……次からは寄進もお忘れなく。",
        repeat: "司祭：迷える魂よ、女神のご加護があらんことを。"
      },
      shop: {
        flag: "shop_first_talk_items",
        itemIds: ["healing_potion", "antidote", "guiding_torch"],
        first: "女主人：奈落の迷宮に行くんだろ？だったらこれを持っていきな。回復薬に解毒剤、それと導きのたいまつ。長い付き合いになりそうな気がするからね。今回はサービスだよ。",
        repeat: "女主人：買いたいのかい、売るのかい？　冷やかしならお断りだよ。"
      }
    };
    const reward = rewards[facilityId];
    if (!reward) return "";
    const gained = reward.cardId
      ? acquireEventCard(reward.flag, reward.cardId)
      : acquireEventItems(reward.flag, reward.itemIds);
    if (gained) {
      updateCharacterUi();
      saveGame();
    }
    return gained ? reward.first : reward.repeat;
  }

  function acceptGuildRequest(questId) {
    if (!character?.eventFlags?.guild_first_request_unlocked) return "";
    const result = acceptQuest(character, questId);
    if (!result.accepted) return result;
    character = {
      ...result.character,
      eventFlags: {
        ...(result.character.eventFlags || {}),
        guild_first_request_accepted: true
      }
    };
    updateCharacterUi();
    saveGame();
    if (questId === FLOOR_SURVEY_QUEST_ID) showQuestTutorial();
    return { ...result, character };
  }

  function showQuestTutorial() {
    if (questTutorialOverlay) questTutorialOverlay.hidden = false;
  }

  function hideQuestTutorial() {
    if (!questTutorialOverlay || questTutorialOverlay.hidden) return false;
    questTutorialOverlay.hidden = true;
    return true;
  }

  questTutorialOverlay?.addEventListener("click", hideQuestTutorial);
  window.addEventListener("keydown", event => {
    if (questTutorialOverlay?.hidden || !["KeyX", "KeyZ", "Enter", "Escape"].includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hideQuestTutorial();
  }, { capture: true });
  const dismissTutorialFromControl = event => {
    if (!hideQuestTutorial()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  ["click", "touchend"].forEach(type => {
    buttonA?.addEventListener(type, dismissTutorialFromControl, { capture: true });
    buttonB?.addEventListener(type, dismissTutorialFromControl, { capture: true });
  });

  function abandonGuildRequest(questId) {
    const result = abandonQuest(character, questId);
    if (!result.accepted) return result;
    character = {
      ...result.character,
      eventFlags: {
        ...(result.character.eventFlags || {}),
        guild_first_request_accepted: hasActiveQuest(result.character)
      }
    };
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function reportGuildRequest(questId) {
    const result = reportQuest(character, questId);
    if (!result.accepted) return result;
    character = {
      ...result.character,
      eventFlags: {
        ...(result.character.eventFlags || {}),
        guild_first_request_accepted: hasActiveQuest(result.character)
      }
    };
    let eventRewardCardId = null;
    if (
      isDungeonDepthUnlocked(character, 2)
      && !character.eventFlags?.guild_all_trial_quests_card
    ) {
      const eventReward = grantCard(
        character.cards,
        "common_goddess_grace",
        1,
        character.deckCost
      );
      character = {
        ...character,
        cards: eventReward.cards,
        eventFlags: {
          ...(character.eventFlags || {}),
          guild_all_trial_quests_card: true
        }
      };
      if (eventReward.gained > 0) eventRewardCardId = "common_goddess_grace";
    }
    character.cardStatBonuses = collectCardStatBonuses(character.cards.deckSlots);
    updateCharacterUi();
    saveGame();
    setTimeout(() => {
      void showGuildQuestRewardSequence({
        rewardCardId: result.rewardCardId,
        bonusGold: result.bonusGold,
        eventRewardCardId
      });
    }, 0);
    return { ...result, character, eventRewardCardId };
  }

  async function showGuildQuestRewardSequence({
    rewardCardId,
    bonusGold,
    eventRewardCardId
  } = {}) {
    await showTimedEffect(questCompleteEffect, "importantItem", 3400);
    if (bonusGold > 0) {
      await showBonusGetEffect(bonusGold);
    }
    if (rewardCardId) {
      showCardGetEffect(rewardCardId);
      if (eventRewardCardId) await wait(3400);
    }
    if (eventRewardCardId) {
      showCardGetEffect(eventRewardCardId);
    }
  }

  function showBonusGetEffect(gold) {
    if (!bonusGetEffect || !bonusGetAmount) return Promise.resolve();
    bonusGetAmount.textContent = `${Math.max(0, Math.floor(Number(gold) || 0))}G`;
    window.clearTimeout(bonusGetTimer);
    return showTimedEffect(bonusGetEffect, "battleVictory", 3400, timer => {
      bonusGetTimer = timer;
    });
  }

  function showTimedEffect(element, seId, duration, captureTimer = () => {}) {
    if (!element) return Promise.resolve();
    playSe(seId);
    element.hidden = false;
    element.classList.remove("is-active");
    void element.offsetWidth;
    element.classList.add("is-active");
    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        element.classList.remove("is-active");
        element.hidden = true;
        resolve();
      }, duration);
      captureTimer(timer);
    });
  }

  function updateCharacterUi() {
    renderCharacterStatus();
    const statusName = document.getElementById("statusName");
    const statusJob = document.getElementById("statusJob");
    const statusLevel = document.getElementById("statusLevel");
    const statusCondition = document.getElementById("statusCondition");
    const statusGold = document.getElementById("statusGold");
    if (statusName) statusName.textContent = character?.name || "NO_NAME";
    if (statusJob) statusJob.textContent = character?.jobLabel || "UNKNOWN";
    if (statusLevel) statusLevel.textContent = character ? String(character.level).padStart(3, "0") : "---";
    if (statusCondition) statusCondition.textContent = character?.condition || "----";
    statusCondition?.classList.toggle("condition-poison", character?.condition === "POISON");
    if (statusGold) statusGold.textContent = String(Math.max(0, Math.floor(Number(character?.gold) || 0)));
    const vitals = document.querySelector(".nde-status-vitals");
    if (vitals) {
      if (character) {
        const hpClass = hasMaxVitalBonus(character, "maxHp") ? "vital-max-bonus" : "";
        const spClass = hasMaxVitalBonus(character, "maxSp") ? "vital-max-bonus" : "";
        vitals.innerHTML = `<span>HP ${character.hp} / <strong class="${hpClass}">${character.maxHp}</strong></span><span>SP ${character.sp} / <strong class="${spClass}">${character.maxSp}</strong></span><span>DECK COST : ${character.deckCost}</span>`;
      } else {
        vitals.innerHTML = "<span>HP ---- / ----</span><span>SP ---- / ----</span><span>DECK COST : --</span>";
      }
    }
    renderStatusGauges(character);
    renderEquipment(character);
    renderDetailStats(character);
    renderExperience(character);
  }

  function hasMaxVitalBonus(target, key) {
    return Number(target?.equipmentStatBonuses?.[key]) > 0
      || Number(target?.cardStatBonuses?.[key]) > 0;
  }

  function renderStatusGauges(target) {
    const statRows = document.getElementById("ndeStatRows");
    if (!statRows) return;
    const definitions = [
      ["STR", "str"], ["INT", "int"], ["AGI", "agi"],
      ["DEX", "dex"], ["LUC", "luc"], ["DEF", "def"]
    ];
    statRows.replaceChildren(...definitions.map(([label, key]) => {
      const base = Math.max(0, Math.floor(Number(
        key === "def" ? target?.def : target?.baseStats?.[key]
      ) || 0));
      const equipment = Math.max(0, Math.floor(Number(target?.equipmentStatBonuses?.[key]) || 0));
      const cards = Math.max(0, Math.floor(Number(target?.cardStatBonuses?.[key]) || 0));
      const total = Math.min(30, base + equipment + cards);
      const row = document.createElement("div");
      row.className = "nde-stat-row";
      const name = document.createElement("strong");
      name.textContent = label;
      const gauge = document.createElement("span");
      gauge.className = "nde-empty-gauge";
      gauge.setAttribute("aria-label", `${label} ${total}/30`);
      for (let index = 0; index < 30; index += 1) {
        const cell = document.createElement("i");
        if (index < Math.min(base, 30)) cell.className = "is-base";
        else if (index < Math.min(base + equipment, 30)) cell.className = "is-equipment";
        else if (index < total) cell.className = "is-card";
        gauge.append(cell);
      }
      const value = document.createElement("output");
      value.textContent = String(total).padStart(2, "0");
      row.append(name, gauge, value);
      return row;
    }));
  }

  function renderEquipment(target) {
    document.querySelectorAll("[data-equipment-slot]").forEach(element => {
      const slot = element.dataset.equipmentSlot;
      const equippedId = slot === "rightArmId"
        ? target?.equipment?.rightArmId || target?.equipment?.weaponId
        : target?.equipment?.[slot];
      const item = getEquipmentItem(equippedId, slot);
      const name = document.createElement("span");
      name.className = "nde-equipment-name";
      name.textContent = item?.name || "―";
      const bonus = document.createElement("span");
      bonus.className = "nde-equipment-bonus";
      bonus.textContent = formatEquipmentBonuses(item);
      element.replaceChildren(name, bonus);
    });
  }

  function formatEquipmentBonuses(item) {
    if (!item) return "";
    if (Number.isFinite(item.attack)) return `ATK +${item.attack}`;
    return Object.entries(item.statBonuses || {})
      .map(([key, value]) => `${key.toUpperCase()} ${Number(value) >= 0 ? "+" : ""}${value}`)
      .join(" ");
  }

  function renderDetailStats(target) {
    const details = target ? deriveDetailStats(target) : {};
    document.querySelectorAll("[data-detail-stat]").forEach(element => {
      const value = details[element.dataset.detailStat];
      const suffix = element.dataset.detailFormat === "number" ? "" : "%";
      element.textContent = Number.isFinite(value) ? `${formatPercent(value)}${suffix}` : `---${suffix}`;
    });
  }

  function formatPercent(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function renderExperience(target) {
    const element = document.querySelector(".nde-experience");
    if (!element) return;
    if (!target) {
      element.textContent = "------- / ------- NEXT LEVEL";
      return;
    }
    const experience = Math.max(0, Math.floor(Number(target.experience) || 0));
    const carried = Math.max(0, Math.floor(Number(target.carriedExperience) || 0));
    const next = getNextLevelExperience(target.level);
    const suffix = target.level >= MAX_LEVEL ? " MAX LEVEL" : " NEXT LEVEL";
    const settled = document.createTextNode(String(experience).padStart(7, "0"));
    const carriedElement = document.createElement("span");
    carriedElement.textContent = carried > 0 ? `+${carried}` : "";
    carriedElement.classList.toggle(
      "experience-protected",
      carried > 0 && hasCardEffect(
        target.cards?.deckSlots,
        "preserve_experience_on_defeat"
      )
    );
    const remainder = document.createTextNode(
      ` / ${String(next).padStart(7, "0")}${suffix}`
    );
    element.replaceChildren(settled, carriedElement, remainder);
  }

  function getRandomEncounterEnemyData() {
    const forcedEnemyId = shouldForceEnemy(character, {
      depth: currentDepth,
      enemyId: "abyss_rabbit"
    })
      ? "abyss_rabbit"
      : shouldForceEnemy(character, {
      depth: currentDepth,
      enemyId: "cave_slime"
    })
      ? "cave_slime"
      : shouldForceEnemy(character, {
        depth: currentDepth,
        enemyId: "abyss_rat"
      })
        ? "abyss_rat"
        : null;
    return forcedEnemyId
      ? getEnemyById(forcedEnemyId)
      : getRandomEnemy({ depth: currentDepth });
  }

  function prepareRandomEncounter() {
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const enemyData = getRandomEncounterEnemyData();
    const surprise = resolveSurprise({
      player: collectStats(character),
      enemyBaseRate: enemyData.surpriseRate,
      enemyMaximum: enemyData.surpriseRateMaximum,
      ignoreNormalCap: Boolean(enemyData.ignoreNormalSurpriseCap),
      forceAmbush: state.torchFuel <= 0
    });
    pendingEncounter = {
      enemyData,
      ambush: surprise.ambush,
      surpriseRate: surprise.rate,
      concealed: state.torchFuel <= 0
    };
    if (pendingEncounter.ambush) startAmbushEncounterNotice();
    else startRandomEncounterNotice();
    return true;
  }

  function beginRandomBattle() {
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    const encounter = pendingEncounter;
    pendingEncounter = null;
    const enemyData = encounter?.enemyData || getRandomEncounterEnemyData();
    const enemy = createEnemyCombatant(enemyData);
    startBgm(selectBattleBgm(enemyData));
    const started = startBattle(enemy, {
      playStartSe: false,
      ambush: Boolean(encounter?.ambush),
      concealed: Boolean(encounter?.concealed)
    });
    if (!started) {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function selectDungeonBgm() {
    return currentDepth >= 101 ? "deepDungeon" : "dungeon";
  }

  function selectBattleBgm(enemyData) {
    if (enemyData?.isEventBoss || enemyData?.bossKind === "event") return "eventBoss";
    if (enemyData?.isBoss) return "floorBoss";
    return "normalBattle";
  }

  function updateCharacterFromBattle(changes) {
    if (!character) return;
    Object.assign(character, changes);
    character.condition = hasCharacterStatus(character, "poison") ? "POISON" : "GOOD";
    updateCharacterUi();
    scheduleAutosave();
  }

  function applyDungeonPoisonStep() {
    if (!character || worldLocation !== "dungeon" || !hasCharacterStatus(character, "poison")) return 0;
    const damage = getNonlethalPoisonDamage(character.hp, 1);
    if (damage <= 0) return 0;
    character.hp -= damage;
    character.alive = true;
    character.condition = "POISON";
    updateCharacterUi();
    showPoisonStepDamage(damage);
    return damage;
  }

  function showPoisonStepDamage(damage) {
    const layer = document.getElementById("poisonStepDamage");
    if (!layer || damage <= 0) return;
    const popup = document.createElement("i");
    popup.textContent = `－${damage}`;
    layer.append(popup);
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
  }

  function handleDungeonStep() {
    applyDungeonPoisonStep();
    if (!character) return;
    const next = recordFloorExploration(character, { depth: currentDepth, explored });
    if (next === character) return;
    character = next;
    updateCharacterUi();
  }

  function resolveCurrentTreasureTrap(treasureType, trapId) {
    if (!character) return { message: "" };
    const result = resolveTreasureTrap({ character, treasureType, trapId });
    character = result.character;
    updateCharacterUi();
    if (result.trap) showTrapResultEffect(result.disarmed);
    return result;
  }

  function showTrapResultEffect(disarmed) {
    if (!trapResultEffect) return;
    window.clearTimeout(trapResultTimer);
    trapResultEffect.textContent = disarmed ? "SUCCESS!!" : "Oops!!";
    trapResultEffect.hidden = false;
    trapResultEffect.classList.remove("is-active");
    void trapResultEffect.offsetWidth;
    trapResultEffect.classList.add("is-active");
    trapResultTimer = window.setTimeout(() => {
      trapResultEffect.classList.remove("is-active");
      trapResultEffect.hidden = true;
    }, 1700);
  }

  function purchaseTownItem(itemId) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = purchaseItem(character, itemId);
    if (!result.accepted) return result;
    character = result.character;
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function hasCharacterStatus(target, statusId) {
    return (target?.statuses || []).some(status => (status.statusId || status.id) === statusId);
  }

  async function useFieldSkill(skillId) {
    const result = resolveFieldSkill({ character, skillId });
    if (!result.accepted) return result;
    character = result.character;
    updateCharacterUi();
    say(`${result.skill.name}を使った。HPが${result.healing}回復した。`);
    saveGame();
    playSe("heal");
    return result;
  }

  function openFieldItems() {
    const context = isTownOpen() ? "town" : "dungeon";
    (context === "town" ? townPortraitFrame : viewportEl).append(itemOverlay);
    return openItemOverlay({
      context,
      character,
      torchFuel: state.torchFuel,
      treasureCompassActive: state.treasureCompassActive,
      onUse: useFieldItem,
      onClose: () => viewportEl.append(itemOverlay)
    });
  }

  async function useFieldItem(itemId) {
    const context = isTownOpen() ? "town" : "dungeon";
    const result = resolveFieldItemUse({
      character,
      itemId,
      context,
      torchFuel: state.torchFuel,
      treasureCompassActive: state.treasureCompassActive
    });
    if (!result.accepted) return result;
    character = result.character;
    if (Number.isFinite(result.environment.torchFuel)) {
      state.torchFuel = result.environment.torchFuel;
    }
    if (result.environment.resetPresence) resetPresence();
    if (result.environment.suppressPresenceSteps) {
      suppressPresence(result.environment.suppressPresenceSteps);
    }
    if (result.environment.treasureCompassActive) {
      state.treasureCompassActive = true;
    }
    updateHud();
    updateCharacterUi();
    say(result.message);
    playSe(result.healing > 0 ? "heal" : "confirm");
    saveGame();
    return result;
  }

  function finishBattleVictory(battle) {
    startBgm(selectDungeonBgm());
    const reward = Math.max(0, Math.floor(Number(battle?.enemy?.experienceReward) || 0));
    if (character && battle?.enemy?.id) {
      character = recordEnemyDefeat(character, battle.enemy.id);
    }
    if (character && reward > 0) Object.assign(character, awardBattleExperience(character, reward));
    resetPresence();
    say(reward > 0
      ? `戦闘に勝利した。${reward}EXPを持ち帰った。`
      : "戦闘に勝利した。");
    setPlayerInputEnabled(true);
    updateCharacterUi();
    saveGame();
  }

  async function finishBattleDefeat(battle) {
    const recovery = resolveDefeatRecovery({
      character,
      battle,
      recoveryResolvers: getDefeatRecoveryResolvers()
    });
    if (recovery.recovered) {
      character = recovery.character;
      setPlayerInputEnabled(true);
      startBgm(selectDungeonBgm());
      updateCharacterUi();
      saveGame();
      return;
    }
    stopBgm();
    await runDefeatPresentation(() => completeDungeonDefeat());
  }

  function getDefeatRecoveryResolvers() {
    // Future effects such as causality alteration or reincarnation plug in here.
    // A resolver must return a living character with HP above zero to suppress
    // the final defeat presentation.
    return [];
  }

  function completeDungeonDefeat() {
    let lostExperience = 0;
    let preservedExperience = 0;
    if (character) {
      const carriedExperience = Math.max(
        0,
        Math.floor(Number(character.carriedExperience) || 0)
      );
      const preserveExperience = hasCardEffect(
        character.cards?.deckSlots,
        "preserve_experience_on_defeat"
      );
      Object.assign(character, resolveDungeonDefeat(character, { preserveExperience }));
      lostExperience = preserveExperience ? 0 : carriedExperience;
      preservedExperience = preserveExperience ? carriedExperience : 0;
      character = recordFloorExploration(character, { depth: 0, explored: [] });
    }
    worldLocation = "town";
    state.treasureCompassActive = false;
    stopBgm();
    templeRevivalJinglePending = true;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    openTown({ registrationRequired: false, facilityId: "temple", mode: "facilityMenu" });
    updateCharacterUi();
    const experienceMessage = preservedExperience > 0
      ? `\n女神の恩寵により${preservedExperience}EXPを守った。`
      : lostExperience > 0
        ? `\n持ち帰るはずだった${lostExperience}EXPを失った。`
        : "";
    say(`司祭：おお…！女神へ祈りが届いたか…！迷える魂よ、今一度目覚めよ！${experienceMessage}`);
    saveGame();
    void playSeSequence("revival", 1).finally(() => {
      templeRevivalJinglePending = false;
      if (worldLocation === "town" && getTownState().facilityId === "temple") {
        startBgm("temple");
      }
    });
  }

  async function runDefeatPresentation(onBlack = () => {}) {
    if (sceneTransitionRunning) return false;
    sceneTransitionRunning = true;
    sceneTransition.hidden = false;
    sceneTransition.classList.remove("is-black", "is-revealing", "is-inn-stay");
    sceneTransition.classList.add("is-running", "is-defeat");
    sceneTransitionTitle.hidden = true;
    defeatMessage.hidden = false;
    document.body.classList.add("scene-transition-active");
    void sceneTransition.offsetWidth;
    requestAnimationFrame(() => sceneTransition.classList.add("is-black"));
    await Promise.all([wait(15000), playSeSequence("gameOver", 1)]);
    await onBlack();
    sceneTransition.classList.add("is-revealing");
    sceneTransition.classList.remove("is-black");
    await wait(1200);
    defeatMessage.hidden = true;
    sceneTransition.classList.remove("is-running", "is-revealing", "is-defeat");
    sceneTransition.hidden = true;
    document.body.classList.remove("scene-transition-active");
    sceneTransitionRunning = false;
    return true;
  }

  function finishBattleEscape() {
    startBgm(selectDungeonBgm());
    resetPresence();
    setPlayerInputEnabled(true);
    say("戦闘から逃げ切った。");
    updateCharacterUi();
    saveGame();
  }

  async function stayAtInn() {
    if (!character || sceneTransitionRunning) return;
    sceneTransitionRunning = true;
    stopBgm();
    sceneTransition.hidden = false;
    sceneTransition.classList.remove("is-black", "is-revealing", "is-defeat");
    sceneTransition.classList.add("is-running", "is-inn-stay");
    sceneTransitionTitle.hidden = true;
    document.body.classList.add("scene-transition-active");
    void sceneTransition.offsetWidth;
    requestAnimationFrame(() => sceneTransition.classList.add("is-black"));
    await Promise.all([wait(6000), playSeSequence("goodNight", 1)]);

    const result = resolveInnStay(character);
    Object.assign(character, result.changes);
    updateCharacterUi();
    saveGame();

    sceneTransition.classList.add("is-revealing");
    sceneTransition.classList.remove("is-black");
    await wait(700);
    sceneTransition.classList.remove("is-running", "is-revealing", "is-inn-stay", "is-defeat");
    sceneTransition.hidden = true;
    document.body.classList.remove("scene-transition-active");
    sceneTransitionRunning = false;

    const finishPresentation = async () => {
      const deckBonus = result.deckCostGained > 0
        ? `、特別ボーナス DECK COST+${result.deckCostGained}`
        : "";
      if (result.levelsGained > 0) {
        const levelUpPresentation = showLevelUpEffect();
        say(`LVが上がった！HP+${result.hpGained}、SP+${result.spGained}${deckBonus}`);
        await levelUpPresentation;
      } else {
        say("女将：お代はいらないよ。ゆっくりと身体を休めるんだよ。");
      }
      if (worldLocation === "town" && getTownState().facilityId === "inn") {
        startBgm("townFacilities");
      }
    };
    if (result.hadPendingSettlement) {
      showExperienceSettlement(result.settlement, finishPresentation);
    } else {
      finishPresentation();
    }
  }

  function showExperienceSettlement(settlement, onClose = () => {}) {
    if (!experienceSettlementOverlay || !experienceSettlementDetail) {
      onClose();
      return;
    }
    experienceSettlementDetail.textContent = formatDepthReturnSettlement(settlement);
    experienceSettlementCloseCallback = onClose;
    experienceSettlementOverlay.hidden = false;
    experienceSettlementOverlay.focus({ preventScroll: true });
  }

  function dismissExperienceSettlement(event) {
    if (!experienceSettlementOverlay || experienceSettlementOverlay.hidden) return false;
    event?.preventDefault();
    event?.stopImmediatePropagation();
    experienceSettlementOverlay.hidden = true;
    const onClose = experienceSettlementCloseCallback;
    experienceSettlementCloseCallback = null;
    onClose?.();
    return true;
  }

  function handleExperienceSettlementInput(action) {
    if (!experienceSettlementOverlay || experienceSettlementOverlay.hidden) return false;
    if (action === "confirm" || action === "cancel") dismissExperienceSettlement();
    return true;
  }

  function showLevelUpEffect() {
    if (!levelUpEffect) return Promise.resolve();
    playSe("levelUpJingle");
    levelUpEffect.hidden = false;
    levelUpEffect.classList.remove("is-active");
    void levelUpEffect.offsetWidth;
    levelUpEffect.classList.add("is-active");
    return new Promise((resolve) => {
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        clearTimeout(fallbackTimer);
        levelUpEffect.removeEventListener("animationend", finish);
        levelUpEffect.classList.remove("is-active");
        levelUpEffect.hidden = true;
        resolve();
      };
      const fallbackTimer = setTimeout(finish, 3500);
      levelUpEffect.addEventListener("animationend", finish, { once: true });
    });
  }

  async function healAtTemple() {
    if (!character) return;
    if (character.alive && character.hp > 0) {
      say("司祭：治療の必要はないようですね。");
      return;
    }
    stopBgm();
    Object.assign(character, createTempleRevival(character));
    updateCharacterUi();
    say("司祭：おお…！女神へ祈りが届いたか…！迷える魂よ、今一度目覚めよ！");
    saveGame();
    await playSeSequence("revival", 1);
    if (worldLocation === "town" && getTownState().facilityId === "temple") {
      startBgm("temple");
    }
  }

  async function enterDungeonFromTown() {
    if (!character) {
      openTown({ registrationRequired: true, facilityId: "guild" });
      return;
    }
    setPlayerInputEnabled(false);
    await runSceneTransition({
      showEnteringTitle: true,
      playAudio: () => playSeSequence("stairs", 3),
      onDark: () => {
        currentDepth = 1;
        state.treasureCompassActive = false;
        resetDungeon("", null, true);
        character.pendingExperienceSettlement = null;
        worldLocation = "dungeon";
        closeTown();
        startBgm(selectDungeonBgm());
        say("奈落へ足を踏み入れた。");
        saveGame();
      }
    });
    setPlayerInputEnabled(true);
  }

  async function runSceneTransition({
    showEnteringTitle = false,
    playAudio = () => Promise.resolve(),
    onDark = () => {}
  } = {}) {
    if (sceneTransitionRunning) return false;
    sceneTransitionRunning = true;
    sceneTransition.hidden = false;
    sceneTransition.classList.remove("is-black", "is-revealing", "is-inn-stay", "is-defeat");
    sceneTransition.classList.add("is-running");
    document.body.classList.add("scene-transition-active");
    sceneTransitionTitle.hidden = !showEnteringTitle;
    void sceneTransition.offsetWidth;

    const audioPromise = Promise.resolve().then(playAudio).catch(() => false);
    requestAnimationFrame(() => sceneTransition.classList.add("is-black"));
    await Promise.all([wait(2700), audioPromise]);
    await onDark();
    await wait(120);

    sceneTransitionTitle.hidden = true;
    sceneTransition.classList.add("is-revealing");
    sceneTransition.classList.remove("is-black");
    await wait(700);
    sceneTransition.classList.remove("is-running", "is-revealing");
    sceneTransition.hidden = true;
    document.body.classList.remove("scene-transition-active");
    sceneTransitionRunning = false;
    return true;
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  function returnToTown() {
    const returnFloor = currentDepth;
    if (character) {
      character.pendingExperienceSettlement = createDepthReturnSettlement(
        character,
        returnFloor
      );
      character = recordFloorExploration(character, { depth: 0, explored: [] });
      updateCharacterUi();
    }
    worldLocation = "town";
    state.treasureCompassActive = false;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    openTown({ registrationRequired: !character, facilityId: "guild", mode: "arrival" });
    saveGame();
  }

  function resetDungeon(message = "", nextStart = null, resetTimer = false) {
    cancelAutoReturn(false);
    if (resetTimer) {
      runStartedAt = performance.now();
      floorStartedAt = runStartedAt;
    }
    if (nextStart) setStartPosition(nextStart.x, nextStart.y);
    else randomizeStartPosition();
    buildBoundaryWallMap();
    startDir = chooseStartDirection();
    resetExplored();
    resetPlayer(startDir);
    if (character) {
      character = recordFloorExploration(character, { depth: currentDepth, explored });
      updateCharacterUi();
    }
    resetPresence();
    updateAutoReturnButton();
    updateHud();
    if (message) say(message);
    scheduleAutosave();
  }

  function generateRandomDungeon() {
    resetDungeon("", null, true);
  }

  function descendFloor() {
    const descendedAt = performance.now();
    const lapTime = formatElapsedTime(descendedAt - floorStartedAt);
    const nextStart = { x: state.gridX, y: state.gridY };
    currentDepth += 1;
    startBgm(selectDungeonBgm());
    setDungeonColors(resolveFloorTheme(currentDepth, getDungeonColors()));
    floorStartedAt = descendedAt;
    resetDungeon("", nextStart);
    startFloorLapNotice(currentDepth, lapTime);
    scheduleAutosave();
  }

  function updateHud() {
    posEl.textContent = `X:${state.gridX} Y:${state.gridY}`;
    depthEl.textContent = `B${currentDepth}F`;
    stopwatchEl.textContent = formatElapsedTime(performance.now() - runStartedAt);
    drawCompass();
    torchMeterEl.style.width = `${state.torchFuel}%`;
    torchMeterEl.parentElement.classList.toggle("is-critical", state.torchFuel <= 20);
    const presence = getPresence();
    presenceMeterEl.style.setProperty("--presence", `${presence}%`);
    presenceMeterEl.setAttribute("aria-valuenow", String(presence));
  }

  function formatElapsedTime(elapsedMs) {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
  }

  function setStopwatchVisible(visible) {
    stopwatchEl.hidden = !visible;
  }

  function resetStopwatch() {
    runStartedAt = performance.now();
    updateHud();
  }

  configureInput({
    forwardBtn,
    backBtn,
    leftBtn,
    rightBtn,
    autoReturnBtn,
    randomGenerateBtn,
    manualMove,
    manualTurn,
    startAutoReturn,
    generateRandomDungeon,
    buttonA,
    buttonB,
    commandRoot: dungeonCommands,
    openStatusMenu,
    handleSkillInput: handleSkillOverlayInput,
    handleItemInput: handleItemOverlayInput,
    handleOverlayInput: handleOverlayEventInput,
    handleBattleInput,
    handleTownInput: action => (
      sceneTransitionRunning || handleExperienceSettlementInput(action) || handleTownInput(action)
    ),
    handleDoorInput: openDoorAhead,
    handleMenuInput
  });
  configureMenu({
    root: menuScreen,
    commandRoot: dungeonCommands,
    getCharacter: () => character,
    onDeckChanged: cards => {
      character = normalizeCharacter({ ...character, cards });
      updateCharacterUi();
      scheduleAutosave();
    },
    generateRandomDungeon,
    startAutoReturn,
    refillTorch,
    setTorchFuelDisabled,
    setScreenShakeEnabled,
    setTorchFlickerEnabled,
    setMistOptions,
    setWallColor,
    setFloorColor,
    setBgmOptions,
    setSeOptions,
    playSe,
    setPresenceDisabled,
    setMinimapRevealOptions,
    setNpcTypewriterOptions: options => {
      setNpcTypewriterOptions(options);
      setTownTypewriterOptions(options);
    },
    setStopwatchVisible,
    resetStopwatch,
    saveGame: slot => saveGame({ announce: true, slot }),
    canManualSave: () => worldLocation === "town",
    getSaveSlotSummaries,
    openSkills: () => openSkillOverlay({
      context: "field",
      character,
      onUse: useFieldSkill
    }),
    openItems: openFieldItems,
    onReturnToDungeon: () => {
      if (isTownOpen()) showTownArrival();
      else resumeDismissedStairsPrompt();
    }
  });
  configureVirtualStick({
    stickEl: virtualStickEl,
    manualMove,
    manualTurn,
    handleSkillInput: handleSkillOverlayInput,
    handleItemInput: handleItemOverlayInput,
    handleBattleInput,
    handleTownInput: action => (
      sceneTransitionRunning || handleExperienceSettlementInput(action) || handleTownInput(action)
    ),
    handleMenuInput
  });

  updateAutoReturnButton();
  experienceSettlementOverlay?.addEventListener("pointerdown", dismissExperienceSettlement, true);
  experienceSettlementOverlay?.addEventListener("click", dismissExperienceSettlement);
  startRenderLoop();
  window.addEventListener("nda:new-game", startNewGame);
  window.addEventListener("nda:continue", () => continueGame("auto"));
  window.addEventListener("nda:load-game", event => continueGame(event.detail?.slot || "auto"));
  window.addEventListener("pagehide", () => saveGame());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveGame(); });
})();










