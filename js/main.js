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
  isCellCompletelySealed,
  wallOnCell,
  closedDoorOnCell,
  openDoorOnCell,
  getDoorState,
  getDoorKind,
  getSpecialRoomLockInfo,
  attemptSpecialRoomUnlock,
  markBossDefeatedAt,
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
  startBattleTreasureEvent,
  startFloorLapNotice,
  setNpcTypewriterOptions
} from "./player.js";
import { configureRenderer, startRenderLoop, setScreenShakeEnabled, setTorchFlickerEnabled, setMistOptions, setWallColor, setFloorColor } from "./renderer.js";
import { drawMinimap, getMinimapBounds, setMinimapRevealOptions } from "./minimap.js";
import { configureInput } from "./input.js";
import { configureGamepadInput } from "./gamepad-input.js";
import { configureVirtualStick } from "./virtualStick.js";
import { configureCompass, drawCompass } from "./compass.js";
import { configureMenu, handleMenuInput, getDungeonColors, getDungeonMistOptions, setDungeonColors, isMenuOpen, openStatusMenu, openDeckEditor, openQuestHistory, openAdventureRecords, openLibraryCardGallery, openTitleOptions, refreshAdventureRecordsPlayTime, openShopSellInventory, openShopPurchaseInventory, closeCampMenu } from "./menu.js";
import { resolveFloorTheme } from "./floorTheme.js";
import {
  configureAutoReturn,
  startAutoReturn,
  continueAutoReturn,
  cancelAutoReturn,
  updateAutoReturnButton,
  getAutoReturnAvailability
} from "./autoReturn.js";
import { configureEvents, messageFor, say } from "./events.js";
import { configureDevice } from "./device.js";
import {
  configurePresence,
  getPresence,
  getPresenceIncreaseReduction,
  getPresenceSuppressedSteps,
  restorePresence,
  resetPresence,
  clearPresenceIncreaseReduction,
  setPresenceIncreaseReduction,
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
import { EffectEngine } from "./effects/effect-engine.js";
import { hasUncertainLoot, isHighlightedLotCardRarity, isHighlightedLotEquipment } from "./loot-identification.js";
import { configureTown, openTown, closeTown, getTownState, handleTownInput, isTownOpen, renderCharacterStatus, showTownArrival, showTownNameBanner, setTownTypewriterOptions, setTransferUnlocked } from "./town.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getActivePlayTimeDelta, normalizeAdventureStats, recordInnStay, recordShopPurchase, recordTempleDonation } from "../data/adventure-stats.js";
import { getEquipmentItem } from "../data/equipment.js";
import { getEquipmentInstanceDefinition, getEquipmentInstanceName, grantEquipmentInstance } from "../data/equipment-inventory.js";
import { createEnemyCombatant, getEnemyById, getRandomEnemy } from "../data/enemies.js";
import { applyBossVictory, createBossCombatant, getBossById, getFloorBossByDepth, isBossDefeated } from "../data/bosses.js";
import { consumeKeyItem, getKeyItem, grantKeyItem, hasKeyItem } from "../data/key-items.js";
import { configureBattle, handleBattleInput, isBattleActive, startBattle } from "./battle.js";
import { awardBattleExperience, createTempleRevival, getInnStayFee, grantEventItems, resolveDungeonDefeat, resolveInnStableStay, resolveInnStay, resolveTemplePoisonTreatment, unlockGuildRequest } from "./character-services.js";
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
import { isCriticalHp } from "../data/quick-status.js";
import { purchaseBuybackEquipment, purchaseBuybackItem, purchaseEquipment, purchaseItem, sellEquipmentInstance, sellItem } from "../data/commerce.js";
import { addLootCard, addLootEquipment, addLootGold, addLootItem, depositItemInWarehouse, grantItemWithOverflow, settleLootBag, withdrawItemFromWarehouse } from "../data/inventory.js";
import { rollEnemyDrop, rollRedChestLoot } from "../data/loot.js";
import { rollTreasureTrap } from "../data/traps.js";
import { restAtHealingFountain as restoreAtHealingFountain } from "../data/fountains.js";
import { getSkill } from "../data/skills.js";
import { getQuestRequiredSpecialRoomAccess, getSpecialRoomAccessRestriction, getSpecialRoomDefinition } from "../data/special-rooms.js";
import { acknowledgeShopStockAnnouncement, getShopEquipmentOffer, getShopStockState, markShopCategorySeen } from "../data/shop-stock.js";
import { getUnreadTavernRumor, markTavernRumorRead } from "../data/tavern-rumors.js";
import { renameCharacter as applyCharacterRename } from "../data/character-name.js";
import { isTransferDestinationUnlocked } from "../data/transfer-destinations.js";
import { getFireFloorStepDamage, isFireFloorDepth } from "../data/fire-floor.js";
import {
  invalidateMarathonChallenge,
  MARATHON_BOSS_FLOORS,
  MARATHON_REWARD_CARD_ID,
  recordMarathonDescent,
  startMarathonChallenge
} from "../data/marathon-challenge.js";
import {
  abandonQuest,
  acceptQuest,
  completeQueenShadowInvestigation,
  grantRedDoorInvestigationSupply,
  FLOOR_SURVEY_QUEST_ID,
  getForcedEnemyId,
  getQuestProgress,
  hasActiveQuest,
  isDungeonDepthUnlocked,
  recordEnemyDefeat,
  recordBossDefeat,
  recordCustomQuestProgress,
  recordFloorExploration,
  recordQueenShadowEncounter,
  reportQuest
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
  let currentDepth = 1;
  let playTimeLastTick = performance.now();
  let lastUserOperationAt = playTimeLastTick;
  const PLAY_TIME_IDLE_LIMIT_MS = 5 * 60 * 1000;


  randomizeStartPosition();
  buildBoundaryWallMap(currentDepth);
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
  const lootIdentifyOverlay = document.getElementById("lootIdentifyOverlay");
  const lootIdentifyList = document.getElementById("lootIdentifyList");
  const lootIdentifyAction = document.getElementById("lootIdentifyAction");
  const lootIdentifyTitle = document.getElementById("lootIdentifyTitle");
  const lootIdentifyEffectCanvas = document.getElementById("lootIdentifyEffectCanvas");
  const lootIdentifyEffectText = document.getElementById("lootIdentifyEffectText");
  const lootIdentifyEffectEngine = lootIdentifyEffectCanvas
    ? new EffectEngine(lootIdentifyEffectCanvas, { transparent: true, backdrop: false })
    : null;
  let lootIdentifyEffectReady = null;
  const battleScreen = document.getElementById("battleScreen");
  const skillOverlay = document.getElementById("skillOverlay");
  const sceneTransition = document.getElementById("sceneTransition");
  const sceneTransitionTitle = document.getElementById("sceneTransitionTitle");
  const defeatMessage = document.getElementById("defeatMessage");
  const revivalPrayer = document.getElementById("revivalPrayer");
  const revivalPrayerText = document.getElementById("revivalPrayerText");
  const revivalGoddess = document.getElementById("revivalGoddess");
  const questTutorialOverlay = document.getElementById("questTutorialOverlay");
  let sceneTransitionRunning = false;
  let templeRevivalJinglePending = false;
  let cardGetTimer = 0;
  let itemGetTimer = 0;
  let bonusGetTimer = 0;
  let trapResultTimer = 0;
  let experienceSettlementCloseCallback = null;
  let pendingLootIdentification = null;

  let lootIdentifyTouchHandled = false;

  function activateLootIdentifyAction() {
    if (!pendingLootIdentification || pendingLootIdentification.identifying) return;
    if (!pendingLootIdentification.identified) {
      const identification = pendingLootIdentification;
      if (!identification.requiresIdentification) {
        completeLootIdentification(identification);
        return;
      }
      identification.identifying = true;
      lootIdentifyAction.disabled = true;
      const finishIdentification = () => {
        if (pendingLootIdentification !== identification || identification.identified) return;
        lootIdentifyEffectText?.removeEventListener("animationend", finishIdentification);
        completeLootIdentification(identification);
      };
      lootIdentifyEffectCanvas.hidden = false;
      lootIdentifyEffectText.hidden = false;
      lootIdentifyEffectText.classList.remove("is-active");
      void lootIdentifyEffectText.offsetWidth;
      lootIdentifyEffectText.classList.add("is-active");
      lootIdentifyEffectText.addEventListener("animationend", finishIdentification, { once: true });
      void prepareLootIdentifyEffect().then(ready => {
        if (ready && pendingLootIdentification === identification) lootIdentifyEffectEngine.play();
      });
      window.setTimeout(finishIdentification, 1800);
      return;
    }
    lootIdentifyOverlay.hidden = true;
    document.body.classList.remove("loot-identify-open");
    stopBgm();
    const onClose = pendingLootIdentification.onClose;
    pendingLootIdentification = null;
    onClose?.();
  }

  lootIdentifyAction?.addEventListener("touchend", event => {
    if (!document.body.classList.contains("layout-mobile") && !document.body.classList.contains("layout-tablet")) return;
    event.preventDefault();
    event.stopPropagation();
    lootIdentifyTouchHandled = true;
    activateLootIdentifyAction();
    window.setTimeout(() => {
      lootIdentifyTouchHandled = false;
    }, 350);
  }, { passive: false });

  lootIdentifyAction?.addEventListener("click", event => {
    if (lootIdentifyTouchHandled) {
      event.preventDefault();
      return;
    }
    activateLootIdentifyAction();
  });
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
      state: {
        ...state,
        floorDetectionActive: hasCardEffect(character?.cards?.deckSlots, "floor_detection"),
        stairsDetectionActive: hasCardEffect(character?.cards?.deckSlots, "stairs_detection"),
        npcDetectionActive: hasCardEffect(character?.cards?.deckSlots, "npc_detection"),
        treasureDetectionActive: hasCardEffect(character?.cards?.deckSlots, "treasure_detection")
      }
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
    awardTreasure: awardTreasureLoot,
    unlockBossDoor: unlockCurrentBossDoor,
    getSpecialDoorLockInfo: getCurrentSpecialDoorLockInfo,
    getSpecialDoorAccessBlock: getCurrentSpecialDoorAccessBlock,
    attemptSpecialDoorUnlock: attemptCurrentSpecialDoorUnlock,
    isBossDefeated: bossId => isBossDefeated(character, bossId),
    restAtFountain: restAtHealingFountain,
    returnToTown,
    beginBattle: beginRandomBattle,
    beginBossBattle,
    beginMimicBattle,
    playNpcVoice: playSe,
    onNpcEncountered: npc => {
      if (character && npc?.id === "queen_shadow") {
        character = recordQueenShadowEncounter(character, currentDepth);
        updateCharacterUi();
        saveGame();
        return;
      }
      if (!character || !String(npc?.id || "").startsWith("NPC_01")) return;
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), mikan_nyanko_encountered: true }
      };
    },
    isQueenShadowFinaleCompleted: () => Boolean(character?.eventFlags?.quest_008_tiara_found),
    onQueenShadowFinaleComplete: () => {
      if (!character || character.eventFlags?.quest_008_tiara_found) return false;
      const granted = grantKeyItem(character.keyItems, "queen_tiara");
      if (!granted.gained && granted.reason !== "alreadyOwned") return false;
      character = completeQueenShadowInvestigation({ ...character, keyItems: granted.keyItems });
      updateCharacterUi();
      saveGame();
      setTimeout(() => showNamedItemGetEffect(["女王のティアラ"]), 0);
      return true;
    },
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
    onUseTransfer: enterFloorFromTransfer,
    onStay: stayAtInn,
    onHeal: healAtTemple,
    onRename: renameCharacterAtTemple,
    onPurchaseItem: purchaseTownItem,
    onPurchaseEquipment: purchaseTownEquipment,
    onBuybackEquipment: buybackTownEquipment,
    onBuybackItem: buybackTownItem,
    onSellItem: sellTownItem,
    onOpenSellInventory: openShopSellInventory,
    onOpenPurchaseInventory: openShopPurchaseInventory,
    onEnterShop: enterShop,
    getShopStockState: () => getShopStockState(character),
    onViewShopCategory: viewShopCategory,
    onWithdrawItem: withdrawTownItem,
    onDepositItem: depositTownItem,
    onEditDeck: openDeckEditor,
    onOpenQuestHistory: openQuestHistory,
    onOpenAdventureRecords: openAdventureRecords,
    onOpenCardGallery: openLibraryCardGallery,
    getUnreadRumor: () => getUnreadTavernRumor(character, {
      mikanEncountered: Boolean(character?.eventFlags?.mikan_nyanko_encountered)
        || Object.entries(state.npcEncounterCounts || {}).some(
          ([npcId, count]) => npcId.startsWith("NPC_01") && Number(count) > 0
        ),
      depthReached: character?.highestDungeonDepthReached,
      lingeringGhostDefeated: Boolean(character?.eventFlags?.lingering_ghost_b2f_defeated_once)
    }),
    onCompleteRumor: rumor => {
      character = markTavernRumorRead(character, rumor);
      updateCharacterUi();
      saveGame();
    },
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
    openSkills: ({ character: battleCharacter, enemy, onUse }) => openSkillOverlay({
      context: "battle",
      character: battleCharacter,
      enemy,
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
        presenceIncreaseReduction: getPresenceIncreaseReduction(),
        runElapsedMs: Math.max(0, now - runStartedAt),
        floorElapsedMs: Math.max(0, now - floorStartedAt)
      }
    };
  }

  function saveGame({ announce = false, slot = "auto" } = {}) {
    if (!saveEnabled) return false;
    accruePlayTime();
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

  function accruePlayTime(now = performance.now()) {
    const elapsedMs = Math.max(0, now - playTimeLastTick);
    const gainedSeconds = getActivePlayTimeDelta({
      elapsedMs,
      hasCharacter: Boolean(character),
      visible: document.visibilityState === "visible",
      idleMs: now - lastUserOperationAt,
      idleLimitMs: PLAY_TIME_IDLE_LIMIT_MS
    });
    playTimeLastTick = now;
    if (!character || gainedSeconds <= 0) return;
    const stats = character.adventureStats && typeof character.adventureStats === "object"
      ? character.adventureStats
      : normalizeAdventureStats();
    character.adventureStats = {
      ...stats,
      playTimeSeconds: Math.max(0, Number(stats.playTimeSeconds) || 0) + gainedSeconds
    };
  }

  function markUserOperation() {
    const now = performance.now();
    accruePlayTime(now);
    lastUserOperationAt = now;
  }

  function restoreGame(save) {
    const dungeon = save?.dungeon;
    const player = save?.player;
    if (!dungeon || !player || dungeon.cells.length !== MAP_H || dungeon.explored.length !== MAP_H) return false;
    if (!dungeon.cells.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!dungeon.explored.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!inBounds(player.gridX, player.gridY) || !Number.isInteger(player.dir) || !DIRS[player.dir]) return false;
    currentDepth = Math.max(1, Math.floor(Number(dungeon.depth) || 1));

    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const savedCell = structuredClone(dungeon.cells[y][x]);
        if (savedCell.treasure && currentDepth <= 4) savedCell.treasure = "red";
        if (currentDepth > 4 && !savedCell.eventTreasureId && !(savedCell.treasure === "black" && save.character?.eventFlags?.black_chests_unlocked)) savedCell.treasure = null;
        Object.assign(cells[y][x], savedCell);
        cells[y][x].specialRoom = savedCell.specialRoom || null;
        if (cells[y][x].specialRoom) {
          cells[y][x].specialRoom.content = getSpecialRoomDefinition(currentDepth)?.content ?? null;
        }
        cells[y][x].featureReservation = savedCell.featureReservation || null;
        cells[y][x].featureApproach = savedCell.featureApproach || null;
        cells[y][x].treasureTrapId = savedCell.treasureTrapId || null;
        explored[y][x] = Boolean(dungeon.explored[y][x]);
      }
    }
    const start = dungeon.startPosition;
    if (start && inBounds(start.x, start.y)) setStartPosition(start.x, start.y);
    setDungeonColors(resolveFloorTheme(currentDepth, getDungeonColors()));
    applyCurrentFloorMist();
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
    const quest007Supply = grantRedDoorInvestigationSupply(character);
    character = quest007Supply.character;
    character.highestDungeonDepthReached = Math.max(
      character.highestDungeonDepthReached || 1,
      currentDepth
    );
    if (cells[state.gridY][state.gridX]?.bossId && !isBossDefeated(character, cells[state.gridY][state.gridX].bossId)) {
      const retreat = cells.flat().find(cell => cell.reserved === "bossRoom" && cell.type === "floor" && !cell.bossId);
      if (retreat) {
        state.gridX = retreat.x;
        state.gridY = retreat.y;
        state.x = retreat.x + .5;
        state.y = retreat.y + .5;
      }
    }
    setTransferUnlocked(Boolean(character?.eventFlags?.transfer_portal_b10f_unlocked));
    restorePresence(dungeon.presence, dungeon.presenceSuppressedSteps, dungeon.presenceIncreaseReduction);
    const now = performance.now();
    runStartedAt = now - Math.max(0, Number(dungeon.runElapsedMs) || 0);
    floorStartedAt = now - Math.max(0, Number(dungeon.floorElapsedMs) || 0);
    cancelAutoReturn(false);
    updateAutoReturnButton();
    updateHud();
    updateCharacterUi();
    const savedLocation = save.world?.location === "town" ? "town" : "dungeon";
    if (savedLocation === "town") clearPresenceIncreaseReduction();
    worldLocation = savedLocation;
    if (savedLocation === "dungeon" && isCellCompletelySealed(state.gridX, state.gridY)) {
      returnToTown();
      say("移動できない場所から救出され、ダンジョン入口へ戻った。");
      return true;
    }
    if (savedLocation === "town") {
      state.treasureCompassActive = false;
      stopBgm();
      setPlayerInputEnabled(false);
      openTown({
        registrationRequired: !character,
        facilityId: save.world?.town?.facilityId,
        mode: save.world?.town?.mode,
        firstTownArrivalPending: save.world?.town?.firstTownArrivalPending
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
    setTransferUnlocked(false);
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
    if (slot !== "auto" || character?.eventFlags?.guild_007_defense_card_received !== save?.character?.eventFlags?.guild_007_defense_card_received) saveGame();
  }

  function registerCharacter({ name, job, jobLabel }) {
    character = createInitialCharacter({ name, job, jobLabel });
    acquireEventCard("guild_registration_card", "common_strength_up");
    updateCharacterUi();
    saveGame();
    startBgm("townFacilities");
    return {
      message: "ギルドマスター：これを持っていけ。ついでに町を見て回ったらどうだ？一通り回ったら、また戻ってこい。"
    };
  }

  function renameCharacterAtTemple(name) {
    const result = applyCharacterRename(character, name);
    if (!result.accepted) return result;
    character = result.character;
    updateCharacterUi();
    renderCharacterStatus();
    saveGame();
    return result;
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

  function showCardGetEffect(cardId, { seId = "battleVictory" } = {}) {
    const card = getCardById(cardId);
    if (!cardGetEffect || !cardGetCanvas || !card) return;
    window.clearTimeout(cardGetTimer);
    playSe(seId);
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
    showNamedItemGetEffect(items.map(item => item.name), { important });
  }

  function showNamedItemGetEffect(itemNames, { important = false } = {}) {
    if (!itemGetEffect || !itemGetItems || itemNames.length === 0) return;
    window.clearTimeout(itemGetTimer);
    playSe(important ? "importantItem" : "itemGet");
    itemGetItems.replaceChildren(...itemNames.map(itemName => {
      const row = document.createElement("span");
      row.textContent = `${itemName} ×1`;
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
          message: "ギルドマスター：ふっ…。俺以外にもお節介がいたようだな。…ところで、お前に仕事を頼みたい。",
          focusCommand: "accept"
        };
      }
      if (hasActiveQuest(character)) {
        return "ギルドマスター：依頼の件、頼んだぞ。";
      }
      if (character.eventFlags?.guild_first_request_unlocked) {
        return "ギルドマスター：仕事の話だ。依頼受注を選んでくれ。";
      }
      return "ギルドマスター：これを持っていけ。ついでに町を見て回ったらどうだ？一通り回ったら、また戻ってこい。";
    }
    const rewards = {
      guild: {
        flag: "guild_registration_card",
        cardId: "common_strength_up",
        first: "ギルドマスター：これを持っていけ。ついでに町を見て回ったらどうだ？\n腕力上昇のカードを手に入れた！",
        repeat: "ギルドマスター：よぉ。今日はどうした？"
      },
      inn: {
        flag: "inn_first_talk_card",
        cardId: "common_lucky_charm",
        first: "女将ヨハンナ：焦らなくてもいいんだよ。身体を休める事だって必要さぁね。\n旅のお守りに、これを持っておいき。幸運のお守りのカードを手に入れた！",
        repeat: "女将ヨハンナ：たとえお金が足りなくても泊まりにおいで。何とかしてあげるから。"
      },
      library: {
        flag: "library_first_talk_card",
        cardId: "common_knowledge_book",
        first: "司書イライザ：…この本なら、あなたの役に立つかしら…？\n知識の書のカードを手に入れた！",
        repeat: "司書イライザ：…何を…見たいのかしら…？"
      },
      temple: {
        flag: "temple_first_talk_items",
        itemIds: ["exorcism_talisman", "holy_water"],
        first: "司祭アーヴァイン：試練へ赴く貴方に、これを授けよと女神様より啓示がありました。退魔の護符と聖水です。どうかご武運を。……次からは寄進もお忘れなく。",
        repeat: "司祭アーヴァイン：迷える魂よ、女神のご加護があらんことを。"
      },
      shop: {
        flag: "shop_first_talk_items",
        itemIds: ["healing_potion", "antidote", "guiding_torch"],
        first: "女主人ヘレン：奈落の迷宮に行くのでしょう？　だったら、これを持っていって。回復薬に解毒剤、それと導きのたいまつ。今回はサービスよ。",
        repeat: "女主人ヘレン：必要なものがあるなら、ゆっくり見ていってね。"
      },
      tavern: {
        flag: "tavern_first_talk_emergency_escape",
        itemIds: ["emergency_escape"],
        first: "ローザ：いらっしゃい。はじめまして、よね？お近づきのしるしにこれをどうぞ。とても貴重な物だから大切にしてね。\n「緊急脱出」を手に入れた！",
        repeat: "ローザ：いらっしゃい。何か飲む？それとも…私に会いにきたのかしら？"
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
    return {
      ...result,
      character,
      acceptedMessage: result.acceptanceRewardCardId
        ? "ギルドマスター：何が起こるか分からない危険な調査になるだろう。これを持っていけ。"
        : "",
      acceptanceRewardMessage: result.acceptanceRewardCardId
        ? "Rカード「防御力上昇」を手に入れた！"
        : ""
    };
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
    statusCondition?.classList.toggle("condition-bleeding", character?.condition === "BLEED");
    if (statusGold) statusGold.textContent = String(Math.max(0, Math.floor(Number(character?.gold) || 0)));
    const vitals = document.querySelector(".nde-status-vitals");
    if (vitals) {
      if (character) {
        const hpClass = hasMaxVitalBonus(character, "maxHp") ? "vital-max-bonus" : "";
        const spClass = hasMaxVitalBonus(character, "maxSp") ? "vital-max-bonus" : "";
        const currentHpClass = isCriticalHp(character.hp, character.maxHp) ? "vital-critical" : "";
        vitals.innerHTML = `<span>HP <strong class="${currentHpClass}">${character.hp}</strong> / <strong class="${hpClass}">${character.maxHp}</strong></span><span>SP ${character.sp} / <strong class="${spClass}">${character.maxSp}</strong></span><span>DECK COST : ${character.deckCost}</span>`;
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
      const cards = Math.floor(Number(target?.cardStatBonuses?.[key]) || 0);
      const totalBeforePenalty = Math.min(30, base + equipment + Math.max(0, cards));
      const total = key === "def"
        ? Math.max(0, totalBeforePenalty + Math.min(0, cards))
        : Math.max(1, totalBeforePenalty + Math.min(0, cards));
      const row = document.createElement("div");
      row.className = "nde-stat-row";
      const name = document.createElement("strong");
      name.textContent = label;
      const gauge = document.createElement("span");
      gauge.className = "nde-empty-gauge";
      gauge.setAttribute("aria-label", `${label} ${total}/30`);
      for (let index = 0; index < 30; index += 1) {
        const cell = document.createElement("i");
        if (index >= total && index < totalBeforePenalty) cell.className = "is-penalty";
        else if (index < Math.min(base, total)) cell.className = "is-base";
        else if (index < Math.min(base + equipment, total)) cell.className = "is-equipment";
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
      const equippedInstanceId = target?.equippedInstanceIds?.[slot];
      const equippedInstance = target?.equipmentInventory?.instances?.find(
        instance => instance.instanceId === equippedInstanceId && instance.slot === slot
      );
      const equippedId = slot === "rightArmId"
        ? target?.equipment?.rightArmId || target?.equipment?.weaponId
        : target?.equipment?.[slot];
      const item = equippedInstance
        ? getEquipmentInstanceDefinition(equippedInstance)
        : getEquipmentItem(equippedId, slot);
      const name = document.createElement("span");
      name.className = "nde-equipment-name";
      name.textContent = equippedInstance ? getEquipmentInstanceName(equippedInstance) : item?.name || "―";
      const bonus = document.createElement("span");
      bonus.className = "nde-equipment-bonus";
      bonus.textContent = formatEquipmentBonuses(item);
      element.replaceChildren(name, bonus);
    });
  }

  function formatEquipmentBonuses(item) {
    if (!item) return "";
    const bonuses = [];
    if (Number.isFinite(item.attack)) bonuses.push(`ATK +${item.attack}`);
    bonuses.push(...Object.entries(item.statBonuses || {})
      .map(([key, value]) => {
        const percentLabels = {
          magicDamageReduction: "魔法耐性",
          nonElementalMagicDamageReduction: "無属性呪文耐性",
          elementalMagicDamageReduction: "属性呪文耐性",
          fireSpellDamageBonus: "炎魔法威力",
          iceSpellDamageBonus: "氷魔法威力",
          fireDamageTakenBonus: "被炎ダメージ",
          iceDamageTakenBonus: "被氷ダメージ"
        };
        return percentLabels[key]
          ? `${percentLabels[key]} ${Number(value) >= 0 ? "+" : ""}${Math.round(Number(value) * 100)}%`
          : `${key.toUpperCase()} ${Number(value) >= 0 ? "+" : ""}${value}`;
      }));
    return bonuses.join(" ");
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
    const forcedEnemyId = getForcedEnemyId(character, { depth: currentDepth });
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
    if (!state.autoWalkerActive) cancelAutoReturn(false);
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
      state.autoReturnPaused = false;
      if (state.autoWalkerActive) continueAutoReturn();
    }
    return started;
  }

  function beginBossBattle(bossId) {
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const boss = getBossById(bossId);
    if (!boss || isBossDefeated(character, boss)) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    pendingEncounter = null;
    startBgm(selectBattleBgm(boss));
    const started = startBattle(createBossCombatant(boss), {
      playStartSe: true,
      ambush: false,
      concealed: state.torchFuel <= 0
    });
    if (!started) {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function beginMimicBattle() {
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const enemyData = getEnemyById("mimic");
    if (!enemyData) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    pendingEncounter = null;
    startBgm(selectBattleBgm(enemyData));
    const mimic = createEnemyCombatant(enemyData);
    mimic.depth = currentDepth;
    const started = startBattle(mimic, {
      playStartSe: true,
      ambush: false,
      concealed: state.torchFuel <= 0
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
    character.condition = currentCondition(character);
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

  function applyDungeonBleedingStep() {
    if (!character || worldLocation !== "dungeon" || !hasCharacterStatus(character, "bleeding")) return 0;
    character.bleedingStepCount = (Math.max(0, Number(character.bleedingStepCount) || 0) + 1) % 5;
    if (character.bleedingStepCount !== 0) return 0;
    const requested = Math.max(1, Math.floor(character.maxHp * 0.05));
    const damage = getNonlethalPoisonDamage(character.hp, requested);
    if (damage <= 0) return 0;
    character.hp -= damage; character.alive = true; character.condition = "BLEED";
    updateCharacterUi(); showPoisonStepDamage(damage); return damage;
  }

  function applyFireFloorStep() {
    if (!character || worldLocation !== "dungeon") return 0;
    const requested = getFireFloorStepDamage(character, currentDepth);
    const damage = getNonlethalPoisonDamage(character.hp, requested);
    if (damage <= 0) return 0;
    character.hp -= damage;
    character.alive = true;
    updateCharacterUi();
    showPoisonStepDamage(damage);
    return damage;
  }

  function currentCondition(target) {
    return hasCharacterStatus(target, "bleeding") ? "BLEED" : hasCharacterStatus(target, "poison") ? "POISON" : "GOOD";
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
    applyDungeonBleedingStep();
    applyFireFloorStep();
    if (!character) return;
    character.condition = hasCharacterStatus(character, "bleeding") ? "BLEED"
      : hasCharacterStatus(character, "poison") ? "POISON" : "GOOD";
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

  function addRolledLoot(drop) {
    if (!character || !drop || drop.kind === "none") return "";
    if (drop.kind === "gold") {
      character.lootBag = addLootGold(character.lootBag, drop.amount).lootBag;
      return `${drop.amount}Gをロット袋へ入れた。`;
    }
    if (drop.kind === "item") {
      character.lootBag = addLootItem(character.lootBag, drop.itemId, drop.amount || 1).lootBag;
      return `${drop.unidentifiedName || getItem(drop.itemId)?.name || "戦利品"}をロット袋へ入れた。`;
    }
    if (drop.kind === "equipment") {
      character.lootBag = addLootEquipment(character.lootBag, drop).lootBag;
      return `${drop.unidentifiedName || "？装備品"}をロット袋へ入れた。`;
    }
    if (drop.kind === "card") {
      character.lootBag = addLootCard(character.lootBag, drop.cardId, drop.amount || 1).lootBag;
      return `${drop.unidentifiedName || "？カード"}をロット袋へ入れた。`;
    }
    return "";
  }

  function awardTreasureLoot(treasureType, eventTreasureId = null) {
    const eventKeyItemId = String(eventTreasureId || "").endsWith("_chest")
      ? String(eventTreasureId).slice(0, -"_chest".length)
      : "";
    const eventKeyItem = getKeyItem(eventKeyItemId);
    if (eventKeyItem) {
      const granted = grantKeyItem(character?.keyItems, eventKeyItem.id);
      if (!granted.gained && granted.reason !== "alreadyOwned") return { message: "鍵は見つからなかった。" };
      if (granted.gained) character = { ...character, keyItems: granted.keyItems };
      updateCharacterUi();
      saveGame();
      return { message: "赤錆びた鍵を手に入れた！" };
    }
    if (treasureType !== "red" && treasureType !== "black") return { message: "中には何も入っていなかった！" };
    const message = addRolledLoot(
      treasureType === "black" ? rollEnemyDrop({ dropProfile: "blackChest", depth: currentDepth }) : rollRedChestLoot(Math.random, currentDepth)
    );
    updateCharacterUi();
    saveGame();
    return { message };
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

  function purchaseTownItem(itemId, amount = 1) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = purchaseItem(character, itemId, { amount });
    if (!result.accepted) return result;
    character = result.character;
    character.adventureStats = recordShopPurchase(character.adventureStats, result.cost);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function purchaseTownEquipment(equipmentId) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const offer = getShopEquipmentOffer(character, equipmentId);
    const result = purchaseEquipment(character, offer || equipmentId);
    if (!result.accepted) return result;
    character = result.character;
    character.adventureStats = recordShopPurchase(character.adventureStats, result.cost);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function sellTownItem(itemId, amount = 1) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = sellItem(character, itemId, { amount });
    if (!result.accepted) return result;
    character = result.character;
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function sellTownEquipment(instanceId) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = sellEquipmentInstance(character, instanceId);
    if (!result.accepted) return result;
    character = normalizeCharacter(result.character);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function buybackTownItem(itemId) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = purchaseBuybackItem(character, itemId);
    if (!result.accepted) return result;
    character = normalizeCharacter(result.character);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function enterShop() {
    const result = acknowledgeShopStockAnnouncement(character);
    if (!result.announced) return null;
    character = result.character;
    saveGame();
    return { message: "女主人ヘレン：あら、いらっしゃい。ちょうど新しい品を仕入れたところなの。見ていかない？" };
  }

  function viewShopCategory(category) {
    character = markShopCategorySeen(character, category);
    saveGame();
  }

  function buybackTownEquipment(instanceId) {
    const result = purchaseBuybackEquipment(character, instanceId);
    if (!result.accepted) return result;
    character = normalizeCharacter(result.character);
    character.adventureStats = recordShopPurchase(character.adventureStats, result.cost);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function withdrawTownItem(itemId, amount = 1) {
    const result = withdrawItemFromWarehouse(character, itemId, amount);
    if (!result.accepted) return result;
    character = result.character;
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function depositTownItem(itemId, amount = 1) {
    const result = depositItemInWarehouse(character, itemId, amount);
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
    const result = resolveFieldSkill({
      character,
      skillId,
      torchFuel: state.torchFuel,
      presenceIncreaseReduction: getPresenceIncreaseReduction()
    });
    if (!result.accepted) return result;
    character = result.character;
    if (Number.isFinite(result.environment?.torchFuel)) state.torchFuel = result.environment.torchFuel;
    if (Number.isFinite(result.environment?.presenceIncreaseReduction)) {
      setPresenceIncreaseReduction(result.environment.presenceIncreaseReduction);
    }
    updateHud();
    updateCharacterUi();
    say(result.skill.actionType === "sacrificialCure"
      ? `${result.skill.name}を使った。毒が消え、${result.damage}ダメージを受けた。`
      : result.skill.environmentEffect === "restoreTorch"
        ? `${result.skill.name}を使った。たいまつゲージが回復した。`
        : result.skill.environmentEffect === "presenceIncreaseReduction"
          ? `${result.skill.name}を使った。気配を消して進めるようになった。`
          : result.skill.actionType === "cureStatus"
            ? `${result.skill.name}を使った。${result.skill.statusId === "bleeding" ? "出血が止まった。" : "毒が消え去った。"}`
            : `${result.skill.name}を使った。HPが${result.healing}回復した。`);
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
    if (itemId === "auto_walker") {
      const availability = getAutoReturnAvailability();
      if (!availability.accepted) {
        if (availability.reason === "alreadyAtStart") say("すでに上り階段にいる。");
        else if (availability.reason === "noPath") say("踏破済みの道だけでは上り階段へ戻れない。");
        return { accepted: false, reason: availability.reason };
      }
    }
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
    if (result.environment.startAutoWalker) {
      closeCampMenu("main");
      startAutoReturn({ persistentThroughBattle: true });
    }
    if (result.environment.emergencyEscape) {
      closeCampMenu("main");
      returnToTown();
      say("緊急脱出を使い、ダンジョンから脱出した。");
      playSe("confirm");
      return result;
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
    let bossRewardMessage = "";
    if (character && battle?.enemy?.isBoss) {
      if (battle.enemy.id === "lingering_ghost_b2f") {
        character = {
          ...character,
          eventFlags: {
            ...(character.eventFlags || {}),
            lingering_ghost_b2f_defeated_once: true
          }
        };
      }
      const victory = applyBossVictory(character, battle.enemy.id);
      if (victory.accepted) {
        character = victory.character;
        character = recordBossDefeat(character, battle.enemy.id, currentDepth);
        markBossDefeatedAt(state.gridX, state.gridY, battle.enemy.id);
        if (victory.reward?.type === "routeCard" && battle.enemy.id === "jabberwock_event_boss") {
          const usedVorpalSword = Boolean(battle.vorpalSwordEquippedAtStart);
          const cardId = usedVorpalSword ? "legendary_spirit_surge" : "legendary_vital_surge";
          const cardReward = grantCard(character.cards, cardId, 1, character.deckCost);
          character = {
            ...character,
            cards: cardReward.cards,
            eventFlags: {
              ...(character.eventFlags || {}),
              quest_009_vorpal_sword_used: usedVorpalSword,
              quest_009_reward_route_fixed: true
            }
          };
          const card = getCardById(cardId);
          if (cardReward.gained > 0) {
            setTimeout(() => showCardGetEffect(cardId, { seId: "itemGet" }), 0);
          }
          bossRewardMessage = cardReward.gained > 0
            ? `\nLカード「${card?.nameJa || cardId}」を手に入れた！`
            : `\nLカード「${card?.nameJa || cardId}」は所持上限に達している。`;
        } else if (victory.reward?.type === "card" && victory.reward.cardId) {
          const cardReward = grantCard(
            character.cards,
            victory.reward.cardId,
            victory.reward.amount || 1,
            character.deckCost
          );
          character = { ...character, cards: cardReward.cards };
          const card = getCardById(victory.reward.cardId);
          bossRewardMessage = cardReward.gained > 0
            ? `\nZカード「${card?.nameJa || victory.reward.cardId}」を手に入れた！`
            : `\nZカード「${card?.nameJa || victory.reward.cardId}」はすでに所持している。`;
        } else if (victory.reward?.type === "equipment" && victory.reward.equipmentId) {
          const granted = grantEquipmentInstance(character, victory.reward.equipmentId, victory.reward.slot || "rightArmId");
          if (granted.accepted) {
            character = granted.character;
            const equipment = getEquipmentInstanceDefinition(granted.instance);
            bossRewardMessage = `\n${equipment?.name || victory.reward.equipmentId}を手に入れた！`;
          }
        } else if (victory.reward?.type === "item" && victory.reward.itemId) {
          const amount = Math.max(1, Math.floor(Number(victory.reward.amount) || 1));
          const granted = grantItemWithOverflow(character, victory.reward.itemId, amount);
          character = granted.character;
          const item = getItem(victory.reward.itemId);
          bossRewardMessage = `\n${item?.name || victory.reward.itemId}を手に入れた！`;
        }
        if (battle.enemy.questProgressId) {
          character = recordCustomQuestProgress(character, battle.enemy.questProgressId, 1);
        }
      }
    }
    if (character && battle?.enemy?.id) {
      character = recordEnemyDefeat(character, battle.enemy.id, currentDepth);
    }
    if (character && reward > 0) Object.assign(character, awardBattleExperience(character, reward));
    const drop = rollEnemyDrop(battle?.enemy);
    const dropMessage = drop.kind === "redChest" ? "" : addRolledLoot(drop);
    const victoryMessage = `${reward > 0 ? `戦闘に勝利した。${reward}EXPを獲得した。` : "戦闘に勝利した。"}${bossRewardMessage}${dropMessage ? `\n${dropMessage}` : ""}`;
    resetPresence();
    setPlayerInputEnabled(true);
    if (drop.kind === "redChest") {
      startBattleTreasureEvent("red", rollTreasureTrap("red"), victoryMessage);
    } else {
      say(victoryMessage);
      state.autoReturnPaused = false;
      if (state.autoWalkerActive) window.setTimeout(continueAutoReturn, 0);
    }
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
    await runDefeatPresentation();
    await completeDungeonDefeat();
  }

  function getDefeatRecoveryResolvers() {
    // Future effects such as causality alteration or reincarnation plug in here.
    // A resolver must return a living character with HP above zero to suppress
    // the final defeat presentation.
    return [];
  }

  async function completeDungeonDefeat() {
    let lostExperience = 0;
    let preservedExperience = 0;
    let bag = null;
    let settled = null;
    if (character) {
      character = invalidateMarathonChallenge(character);
      const carriedExperience = Math.max(
        0,
        Math.floor(Number(character.carriedExperience) || 0)
      );
      const preserveExperience = hasCardEffect(
        character.cards?.deckSlots,
        "preserve_experience_on_defeat"
      );
      Object.assign(character, resolveDungeonDefeat(character, { preserveExperience }));
      bag = structuredClone(character.lootBag);
      settled = settleLootBag(character);
      character = settled.character;
      lostExperience = preserveExperience ? 0 : carriedExperience;
      preservedExperience = preserveExperience ? carriedExperience : 0;
      character = recordFloorExploration(character, { depth: 0, explored: [] });
    }
    worldLocation = "town";
    clearPresenceIncreaseReduction();
    state.treasureCompassActive = false;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    templeRevivalJinglePending = true;
    const experienceMessage = preservedExperience > 0
      ? `\n女神の恩寵により${preservedExperience}EXPを守った。`
      : lostExperience > 0
        ? `\n持ち帰るはずだった${lostExperience}EXPを失った。`
        : "";
    saveGame();
    if (character && bagHasLoot(bag)) {
      openTown({ registrationRequired: false, facilityId: "temple", mode: "facilityMenu" });
      updateCharacterUi();
      await new Promise(resolve => showLootIdentification(bag, settled, {
        playBgm: false,
        onClose: () => {
          prepareRevivalBlackout();
          resolve();
        }
      }));
    } else {
      prepareRevivalBlackout();
      openTown({ registrationRequired: false, facilityId: "temple", mode: "facilityMenu" });
      updateCharacterUi();
    }
    await runRevivalPrayer();
    say(`司祭アーヴァイン：おお…！女神の祈りが届いたか…！よくぞ目覚めた…！${experienceMessage}`);
    if (worldLocation === "town" && getTownState().facilityId === "temple") startBgm("temple");
  }

  async function runDefeatPresentation() {
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

  async function runRevivalPrayer() {
    if (!revivalPrayer || !revivalPrayerText || !revivalGoddess) return;
    revivalPrayer.hidden = false;
    revivalGoddess.hidden = true;
    revivalGoddess.classList.remove("is-active");
    document.body.classList.add("scene-transition-active");
    const audioPromise = playSeSequence("revival", 1);
    for (const phrase of ["こんじき――", "いなほ――", "みのり――", "しゅくふくを――！"]) {
      revivalPrayerText.textContent = phrase;
      await wait(1500);
    }
    revivalPrayerText.textContent = "";
    revivalGoddess.hidden = false;
    void revivalGoddess.offsetWidth;
    revivalGoddess.classList.add("is-active");
    await Promise.all([audioPromise, wait(4000)]);
    sceneTransition.classList.add("is-revealing");
    sceneTransition.classList.remove("is-black");
    await wait(1200);
    revivalPrayer.hidden = true;
    revivalGoddess.hidden = true;
    revivalGoddess.classList.remove("is-active");
    sceneTransition.className = "scene-transition";
    sceneTransition.hidden = true;
    document.body.classList.remove("scene-transition-active");
    sceneTransitionRunning = false;
    templeRevivalJinglePending = false;
  }

  function prepareRevivalBlackout() {
    templeRevivalJinglePending = true;
    sceneTransitionRunning = true;
    sceneTransition.hidden = false;
    sceneTransition.className = "scene-transition is-running is-black is-revival";
    defeatMessage.hidden = true;
    sceneTransitionTitle.hidden = true;
    revivalPrayer.hidden = false;
    revivalPrayerText.textContent = "";
    revivalGoddess.hidden = true;
    revivalGoddess.classList.remove("is-active");
    document.body.classList.add("scene-transition-active");
  }

  function finishBattleEscape() {
    startBgm(selectDungeonBgm());
    resetPresence();
    setPlayerInputEnabled(true);
    state.autoReturnPaused = false;
    if (state.autoWalkerActive) window.setTimeout(continueAutoReturn, 0);
    say("戦闘から逃げ切った。");
    updateCharacterUi();
    saveGame();
  }

  async function stayAtInn() {
    if (!character || sceneTransitionRunning) return;
    const fee = getInnStayFee(character);
    if (Math.max(0, Math.floor(Number(character.gold) || 0)) < fee) {
      say("女将ヨハンナ：おや。持ち合わせがないのかい？夜露がしのげればいいなら、馬小屋を使っておくれ。");
      await stayAtInnStable();
      return;
    }
    character.gold -= fee;
    say(`女将ヨハンナ：${fee}Gいただくよ。さぁ、部屋に上がってゆっくりお休み。`);
    updateCharacterUi();
    saveGame();
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
    character.adventureStats = recordInnStay(character.adventureStats);
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
        say(`LVが上がった！HP+${result.hpGained}、SP+${result.spGained}${deckBonus}${formatLearnedSkills(result.learnedSkillIds)}`);
        await levelUpPresentation;
      } else {
        say("女将ヨハンナ：ゆっくり休めたかい？");
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

  async function restAtHealingFountain() {
    if (!character || sceneTransitionRunning || worldLocation !== "dungeon") return false;
    stopBgm();
    const completed = await runSceneTransition({
      playAudio: () => playSeSequence("goodNight", 1),
      onDark: () => {
        character = restoreAtHealingFountain(character);
        refillTorch();
        resetPresence();
        updateCharacterUi();
        updateHud();
        saveGame();
      }
    });
    if (worldLocation === "dungeon") {
      startBgm(selectDungeonBgm());
    }
    return completed;
  }

  async function stayAtInnStable() {
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

    const stableBackground = document.getElementById("townBackground");
    const stablePortrait = document.getElementById("townPortrait");
    const facilityBadge = document.getElementById("townFacilityName");
    stableBackground.src = "images/background/town_02b.avif";
    stableBackground.alt = "馬小屋の風景";
    stableBackground.hidden = false;
    stablePortrait.src = "images/npc/NPC_18.avif";
    stablePortrait.alt = "馬小屋の住人";
    stablePortrait.hidden = false;
    facilityBadge.textContent = "馬小屋";
    facilityBadge.hidden = false;

    sceneTransition.classList.remove("is-inn-stay");
    sceneTransition.classList.add("is-revealing");
    sceneTransition.classList.remove("is-black");
    await Promise.all([
      wait(2500),
      (async () => {
        await playSeSequence("horseVoice", 1);
        await playSeSequence("roosterVoice", 1);
      })()
    ]);
    sceneTransition.classList.remove("is-running", "is-revealing", "is-defeat");
    sceneTransition.hidden = true;
    document.body.classList.remove("scene-transition-active");
    sceneTransitionRunning = false;

    const result = resolveInnStableStay(character);
    Object.assign(character, result.changes);
    character.adventureStats = recordInnStay(character.adventureStats);
    updateCharacterUi();
    saveGame();

    const finishPresentation = async () => {
      const deckBonus = result.deckCostGained > 0
        ? `、特別ボーナス DECK COST+${result.deckCostGained}`
        : "";
      if (result.levelsGained > 0) {
        const levelUpPresentation = showLevelUpEffect();
        say(`LVが上がった！HP+${result.hpGained}、SP+${result.spGained}${deckBonus}${formatLearnedSkills(result.learnedSkillIds)}`);
        await levelUpPresentation;
      } else {
        say("馬小屋で夜露をしのぎ、少し身体を休めた。");
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
      const treatment = resolveTemplePoisonTreatment(character);
      if (treatment.reason === "notPoisoned") {
        say("司祭アーヴァイン：治療の必要はないようですね。");
        return;
      }
      if (treatment.reason === "insufficientGold") {
        say(`司祭アーヴァイン：毒を浄めるには${treatment.fee}Gの寄進が必要です。`);
        return;
      }
      character = treatment.character;
      character.adventureStats = recordTempleDonation(character.adventureStats, treatment.fee);
      updateCharacterUi();
      say(`司祭アーヴァイン：${treatment.fee}Gの寄進を受け取りました。傷と穢れは癒やされました。`);
      playSe("heal");
      saveGame();
      return;
    }
    stopBgm();
    Object.assign(character, createTempleRevival(character));
    updateCharacterUi();
    say("司祭アーヴァイン：おお…！女神へ祈りが届いたか…！迷える魂よ、今一度目覚めよ！");
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
        character = startMarathonChallenge(character);
        setDungeonColors(resolveFloorTheme(currentDepth, getDungeonColors()));
        applyCurrentFloorMist();
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

  async function enterFloorFromTransfer(depth = 10) {
    const destination = Math.max(1, Math.floor(Number(depth) || 0));
    if (!isTransferDestinationUnlocked(character, destination)) return false;
    setPlayerInputEnabled(false);
    await runSceneTransition({
      playAudio: () => playSeSequence("stairs", 3),
      onDark: () => {
        currentDepth = destination;
        character = invalidateMarathonChallenge(character);
        setDungeonColors(resolveFloorTheme(currentDepth, getDungeonColors()));
        applyCurrentFloorMist();
        character.highestDungeonDepthReached = Math.max(
          character.highestDungeonDepthReached || 1,
          currentDepth
        );
        state.treasureCompassActive = false;
        resetDungeon("", null, true);
        character.pendingExperienceSettlement = null;
        worldLocation = "dungeon";
        closeTown();
        startBgm(selectDungeonBgm());
        say(`転送門を抜け、B${destination}Fへ到達した。`);
        saveGame();
      }
    });
    setPlayerInputEnabled(true);
    return true;
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

  function formatLearnedSkills(skillIds = []) {
    return skillIds.map(id => getSkill(id)?.name).filter(Boolean).map(name => `\n${name}を習得した！`).join("");
  }

  function returnToTown() {
    const returnFloor = currentDepth;
    let bag = null;
    let settled = null;
    if (character) {
      character = invalidateMarathonChallenge(character);
      character.pendingExperienceSettlement = createDepthReturnSettlement(
        character,
        returnFloor
      );
      bag = structuredClone(character.lootBag);
      settled = settleLootBag(character);
      character = settled.character;
      character = recordFloorExploration(character, { depth: 0, explored: [] });
      updateCharacterUi();
    }
    worldLocation = "town";
    clearPresenceIncreaseReduction();
    state.treasureCompassActive = false;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    openTown({ registrationRequired: !character, facilityId: "dungeon", mode: "dungeonEntrance" });
    if (character && bagHasLoot(bag)) {
      showLootIdentification(bag, settled);
    }
    saveGame();
  }

  function bagHasLoot(bag) {
    return Number(bag?.gold) > 0
      || Object.keys(bag?.items || {}).length > 0
      || Object.keys(bag?.cards || {}).length > 0
      || (bag?.equipmentInstances || []).length > 0;
  }

  function showLootIdentification(bag, settled, { onClose = null, playBgm = true } = {}) {
    if (!lootIdentifyOverlay || !bagHasLoot(bag)) return;
    const requiresIdentification = hasUncertainLoot(bag, getItem);
    pendingLootIdentification = { bag, settled, identified: false, identifying: false, requiresIdentification, onClose };
    const unknown = [];
    if (Number(bag.gold) > 0) unknown.push({ label: `${Number(bag.gold).toLocaleString()}GOLD`, count: "" });
    for (const [itemId, count] of Object.entries(bag.items || {})) {
      const item = getItem(itemId);
      if (item?.category === "material") unknown.push({ label: item.name, count: `×${count}` });
    }
    for (const [itemId, count] of Object.entries(bag.items || {})) {
      if (getItem(itemId)?.category !== "material") unknown.push({ label: "？道具", count: `×${count}` });
    }
    for (const [cardId, count] of Object.entries(bag.cards || {})) {
      unknown.push({ label: "？カード", count: `×${count}`,
        className: isHighlightedLotCardRarity(getCardById(cardId)?.rarity) ? "is-super-rare" : "" });
    }
    for (const instance of bag.equipmentInstances || []) unknown.push({
      label: instance.unidentifiedName || "？装備",
      count: "×1",
      className: isHighlightedLotEquipment(instance) ? "is-super-rare" : ""
    });
    renderLootIdentificationRows(unknown);
    lootIdentifyTitle.textContent = "LOT BAG";
    lootIdentifyAction.textContent = requiresIdentification ? "鑑定する" : "次へ";
    lootIdentifyAction.disabled = false;
    lootIdentifyEffectCanvas.hidden = true;
    lootIdentifyEffectText.hidden = true;
    lootIdentifyEffectText.classList.remove("is-active");
    lootIdentifyOverlay.hidden = false;
    document.body.classList.add("loot-identify-open");
    if (playBgm) startBgm("lotBag");
  }

  function prepareLootIdentifyEffect() {
    if (!lootIdentifyEffectEngine) return Promise.resolve(false);
    if (!lootIdentifyEffectReady) {
      lootIdentifyEffectReady = lootIdentifyEffectEngine.loadFromUrl("data/effects/lot_bag_identify.json")
        .then(() => true)
        .catch(error => {
          console.warn("Lot bag effect could not be loaded.", error);
          return false;
        });
    }
    return lootIdentifyEffectReady;
  }

  function completeLootIdentification(identification) {
    if (pendingLootIdentification !== identification || identification.identified) return;
    identification.identifying = false;
    identification.identified = true;
    lootIdentifyEffectEngine?.stop(false);
    lootIdentifyEffectCanvas.hidden = true;
    lootIdentifyEffectText.hidden = true;
    lootIdentifyEffectText.classList.remove("is-active");
    lootIdentifyAction.disabled = false;
    lootIdentifyTitle.textContent = "INVENTORY";
    renderLootIdentificationRows(formatIdentifiedLoot(identification));
    lootIdentifyAction.textContent = "閉じる";
    playSe("item");
  }

  function formatIdentifiedLoot({ bag, settled }) {
    const lines = [];
    if (Number(bag.gold) > 0) lines.push({ label: `${Number(bag.gold).toLocaleString()}GOLD`, count: "→ 所持金" });
    const results = settled.results || [];
    for (const result of results.filter(entry => getItem(entry.itemId)?.category === "material")) {
      const destination = result.warehouse > 0 ? `インベントリ${result.inventory}／倉庫${result.warehouse}` : "インベントリ";
      lines.push({ label: getItem(result.itemId)?.name || result.itemId, count: `×${result.count} → ${destination}` });
    }
    for (const result of results.filter(entry => getItem(entry.itemId)?.category !== "material")) {
      const destination = result.warehouse > 0 ? `インベントリ${result.inventory}／倉庫${result.warehouse}` : "インベントリ";
      lines.push({ label: getItem(result.itemId)?.name || result.itemId, count: `×${result.count} → ${destination}` });
    }
    for (const result of settled.cardResults || []) {
      const card = getCardById(result.cardId);
      const discarded = result.convertedGold > 0
        ? `（上限超過${result.discarded}枚は${result.convertedGold}Gに変換）`
        : result.discarded > 0 ? `（上限超過${result.discarded}枚は破棄）` : "";
      lines.push({ label: `${card?.rarity || ""}カード「${card?.nameJa || result.cardId}」`,
        count: `×${result.gained} → カード${discarded}`,
        className: isHighlightedLotCardRarity(card?.rarity) ? "is-super-rare" : "" });
    }
    for (const instance of settled.equipmentResults || []) {
      lines.push({
        label: getEquipmentInstanceName(instance),
        count: "→ インベントリ",
        className: isHighlightedLotEquipment(instance) ? "is-super-rare" : ""
      });
    }
    return lines;
  }

  function renderLootIdentificationRows(rows) {
    lootIdentifyList.replaceChildren(...rows.map(({ label, count, className = "" }) => {
      const row = document.createElement("div");
      row.className = `loot-identify-entry ${className}`.trim();
      const name = document.createElement("span");
      name.textContent = label;
      const amount = document.createElement("strong");
      amount.textContent = count;
      row.append(name, amount);
      return row;
    }));
  }

  function handleLootIdentifyInput(action) {
    if (!lootIdentifyOverlay || lootIdentifyOverlay.hidden) return false;
    if (action === "confirm" || action === "cancel") lootIdentifyAction.click();
    return true;
  }

  function resetDungeon(message = "", nextStart = null, resetTimer = false) {
    cancelAutoReturn(false);
    if (resetTimer) {
      runStartedAt = performance.now();
      floorStartedAt = runStartedAt;
    }
    if (nextStart) setStartPosition(nextStart.x, nextStart.y);
    else randomizeStartPosition();
    buildBoundaryWallMap(currentDepth, Math.random, getDungeonProgress());
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
    const nextStart = { x: state.gridX, y: state.gridY };
    const previousDepth = currentDepth;
    currentDepth += 1;
    let marathonCompleted = false;
    if (character) {
      character.highestDungeonDepthReached = Math.max(
        character.highestDungeonDepthReached || 1,
        currentDepth
      );
      const marathon = recordMarathonDescent(character, {
        fromDepth: previousDepth,
        toDepth: currentDepth,
        defeatedBossFloors: MARATHON_BOSS_FLOORS.filter(floor => {
          const boss = getFloorBossByDepth(floor);
          return Boolean(boss && isBossDefeated(character, boss));
        })
      });
      character = marathon.character;
      marathonCompleted = marathon.completed;
      if (marathonCompleted) {
        const reward = grantCard(character.cards, MARATHON_REWARD_CARD_ID, 1, character.deckCost);
        character = { ...character, cards: reward.cards };
      }
    }
    if (currentDepth === 10 && character) {
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), transfer_portal_b10f_unlocked: true }
      };
      setTransferUnlocked(true);
    }
    if (currentDepth === 20 && character) {
      character = {
        ...character,
        eventFlags: {
          ...(character.eventFlags || {}),
          shop_stock_b20f_unlocked: true,
          transfer_portal_b20f_unlocked: true
        }
      };
    }
    if (currentDepth === 30 && character) {
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), shop_stock_b30f_unlocked: true }
      };
    }
    startBgm(selectDungeonBgm());
    setDungeonColors(resolveFloorTheme(currentDepth, getDungeonColors()));
    applyCurrentFloorMist();
    floorStartedAt = descendedAt;
    resetDungeon("", nextStart);
    startFloorLapNotice(currentDepth);
    if (marathonCompleted) {
      say("――長い、長い旅路の果てに、\nあなたは一度も地上へ戻ることなくB42Fへ到達した。\n\nZカード「カプリコーン」を手に入れた！");
      setTimeout(() => showCardGetEffect(MARATHON_REWARD_CARD_ID, { seId: "itemGet" }), 0);
    }
    scheduleAutosave();
  }

  function applyCurrentFloorMist() {
    const options = getDungeonMistOptions();
    setMistOptions({ ...options, color: isFireFloorDepth(currentDepth) ? "red" : options.color });
  }

  function getDungeonProgress() {
    const floorBoss = getFloorBossByDepth(currentDepth);
    const room = floorBoss?.room || {};
    const queenShadowQuest = getQuestProgress(character, "guild_008");
    return {
      bossDefeated: isBossDefeated(character, "strange_knight_statue_b9f"),
      bossDefeatedById: {
        ...(floorBoss ? { [floorBoss.id]: isBossDefeated(character, floorBoss) } : {}),
        quest_mimic_b6f: isBossDefeated(character, "quest_mimic_b6f")
      },
      blackChestsUnlocked: Boolean(character?.eventFlags?.black_chests_unlocked),
      redDoorUnlocked: Boolean(room.unlockFlag && character?.eventFlags?.[room.unlockFlag]),
      hasRedKey: Boolean(room.keyItemId && hasKeyItem(character?.keyItems, room.keyItemId)),
      queenShadowQuest: {
        active: queenShadowQuest.active,
        completed: queenShadowQuest.completed,
        progress: queenShadowQuest.progress
      }
    };
  }

  function getCurrentSpecialDoorLockInfo({ x, y, dirKey } = {}) {
    return getSpecialRoomLockInfo({
      x,
      y,
      dirKey,
      dex: collectStats(character).dex
    });
  }

  function getCurrentSpecialDoorAccessBlock() {
    const room = getSpecialRoomDefinition(currentDepth);
    if (room?.content?.requiredQuestId) {
      const progress = getQuestProgress(character, room.content.requiredQuestId);
      const questAccess = getQuestRequiredSpecialRoomAccess(room, progress);
      if (questAccess.blocked) return questAccess;
    }
    return getSpecialRoomAccessRestriction({
      forcedEnemyId: getForcedEnemyId(character, { depth: currentDepth })
    });
  }

  function attemptCurrentSpecialDoorUnlock({ x, y, dirKey } = {}) {
    const result = attemptSpecialRoomUnlock({
      x,
      y,
      dirKey,
      dex: collectStats(character).dex
    });
    scheduleAutosave();
    return result;
  }

  function unlockCurrentBossDoor() {
    const boss = getFloorBossByDepth(currentDepth);
    const keyItemId = boss?.room?.keyItemId;
    const unlockFlag = boss?.room?.unlockFlag;
    if (!boss?.room?.requiresKey || !keyItemId || !unlockFlag) {
      return { accepted: true, message: "赤い扉を開けた。" };
    }
    if (character?.eventFlags?.[unlockFlag]) return { accepted: true, message: "赤い扉を開けた。" };
    if (!hasKeyItem(character?.keyItems, keyItemId)) {
      return { accepted: false, message: "赤い扉には鍵がかかっている。" };
    }
    const consumed = consumeKeyItem(character.keyItems, keyItemId);
    if (!consumed.consumed) return { accepted: false, message: "赤い扉には鍵がかかっている。" };
    character = {
      ...character,
      keyItems: consumed.keyItems,
      eventFlags: { ...(character.eventFlags || {}), [unlockFlag]: true }
    };
    updateCharacterUi();
    saveGame();
    return { accepted: true, message: "赤錆びた鍵を使った。赤い扉の鍵が開いた。" };
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

  function recordUserInput() {
    markUserOperation();
    if (!state.autoWalkerActive || isBattleActive()) return;
    cancelAutoReturn(false);
    say("オート移動を中断した。");
  }

  function dispatchGamepadAction(action) {
    recordUserInput();
    if (handleItemOverlayInput(action) || handleSkillOverlayInput(action) || handleBattleInput(action)) return true;
    if (sceneTransitionRunning || handleLootIdentifyInput(action) || handleExperienceSettlementInput(action) || handleTownInput(action)) return true;
    if (["up", "down", "left", "right"].includes(action)) {
      if (handleOverlayEventInput("dismiss") || handleMenuInput(action)) return true;
      if (action === "up") return manualMove(1);
      if (action === "down") return manualMove(-1);
      if (action === "left") return manualTurn(-1);
      return manualTurn(1);
    }
    if (action === "confirm") return handleOverlayEventInput("confirm") || handleMenuInput("confirm") || openDoorAhead();
    if (action === "cancel") return handleOverlayEventInput("cancel") || handleMenuInput("cancel");
    return false;
  }

  configureGamepadInput({
    dispatchAction: dispatchGamepadAction,
    openStatusMenu: () => {
      recordUserInput();
      handleItemOverlayInput("cancel");
      handleSkillOverlayInput("cancel");
      handleBattleInput("cancel");
      openStatusMenu();
    }
  });

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
      sceneTransitionRunning || handleLootIdentifyInput(action) || handleExperienceSettlementInput(action) || handleTownInput(action)
    ),
    handleDoorInput: openDoorAhead,
    onUserOperation: recordUserInput,
    handleMenuInput
  });
  configureMenu({
    root: menuScreen,
    commandRoot: dungeonCommands,
    getCharacter: () => character,
    getInventoryContext: () => isTownOpen() ? "town" : "dungeon",
    onUseInventoryItem: useFieldItem,
    onEquipmentChanged: next => {
      character = next;
      updateCharacterUi();
      saveGame();
    },
    onSellInventoryItem: sellTownItem,
    onSellInventoryEquipment: sellTownEquipment,
    onInventorySaleClosed: renderCharacterStatus,
    onPurchaseInventoryItem: purchaseTownItem,
    onPurchaseInventoryEquipment: purchaseTownEquipment,
    onInventoryPurchaseClosed: renderCharacterStatus,
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
    emergencyEscape: () => {
      if (worldLocation !== "dungeon") return false;
      returnToTown();
      say("緊急脱出を実行し、ダンジョン入口へ戻った。");
      return true;
    },
    saveGame: slot => saveGame({ announce: true, slot }),
    canManualSave: () => worldLocation === "town",
    getSaveSlotSummaries,
    openSkills: () => {
      if (isTownOpen()) townPortraitFrame.append(skillOverlay);
      else viewportEl.append(skillOverlay);
      const opened = openSkillOverlay({
        context: "field",
        character,
        onUse: useFieldSkill,
        onClose: () => viewportEl.append(skillOverlay)
      });
      if (!opened) viewportEl.append(skillOverlay);
      return opened;
    },
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
  window.setInterval(() => {
    accruePlayTime();
    refreshAdventureRecordsPlayTime();
  }, 1000);
  window.addEventListener("nda:new-game", startNewGame);
  window.addEventListener("nda:continue", () => continueGame("auto"));
  window.addEventListener("nda:load-game", event => continueGame(event.detail?.slot || "auto"));
  window.addEventListener("nda:title-options", openTitleOptions);
  document.documentElement.dataset.ndaMainReady = "true";
  window.dispatchEvent(new CustomEvent("nda:main-ready"));
  window.addEventListener("pointerdown", markUserOperation, { capture: true, passive: true });
  window.addEventListener("pagehide", () => saveGame());
  document.addEventListener("visibilitychange", () => {
    accruePlayTime();
    if (document.visibilityState === "hidden") saveGame();
    else playTimeLastTick = performance.now();
  });
})();










