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
  removeBossAt,
  refreshB100FinalBoss,
  setStartPosition,
  randomizeStartPosition
} from "./dungeon.js";
import {
  state,
  configurePlayer,
  resetPlayer,
  refillTorch,
  setTorchFuelDisabled,
  setTorchCardEffects,
  setPlayerInputEnabled,
  isPlayerInputEnabled,
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
  startOverlayEvent,
  setNpcTypewriterOptions,
  cancelRapidCurrentTransition,
  applyFixedFloorWarp
} from "./player.js";
import { configureRenderer, startRenderLoop, setScreenShakeEnabled, setTorchFlickerEnabled, setFrameRateMode, getEffectiveFrameRate, setMistOptions, setWallColor, setFloorColor, toggleMinimapOverlay } from "./renderer.js";
import { drawMinimap, getMinimapBounds, setMinimapRevealOptions } from "./minimap.js";
import { getQueenRegaliaMinimapEffects } from "./queen-regalia-effects.js";
import { configureInput } from "./input.js";
import { configureGamepadInput } from "./gamepad-input.js";
import { configureFloatingStick } from "./floating-stick.js";
import { configureCompass, drawCompass } from "./compass.js";
import { configureMenu, handleMenuInput, getDungeonColors, getDungeonMistOptions, setDungeonColors, getGamepadBindings, getGamepadCaptureAction, completeGamepadBinding, setGamepadPressedButtons, getTouchControlsMode, getTouchMovementMode, isMenuOpen, openItemInventory, openStatusMenu, openDeckEditor, openQuestHistory, openRumorHistory, openAdventureRecords, openLibraryMonsterCompendium, openLibraryCardGallery, openTitleOptions, refreshAdventureRecordsPlayTime, openShopSellInventory, openShopPurchaseInventory, closeCampMenu, resetDebugSettingsForNewGame } from "./menu.js";
import { isForcedTorchZeroFloor, resolveFloorTheme } from "./floorTheme.js";
import { applyCrystalFloorSpStep } from "../data/crystal-floor.js";
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
  setPresenceDisabled,
  setPassivePresenceIncreaseReduction
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
import { getLotEquipmentHighlightClass, hasUncertainLoot, isHighlightedLotCardRarity } from "./loot-identification.js";
import { configureTown, setTownEndingSuspended, openPendingNpcRenewal, openTown, closeTown, getTownState, handleTownInput, isTownOpen, renderCharacterStatus, showTownArrival, showTownNameBanner, setTownTypewriterOptions, setTransferUnlocked } from "./town.js";
import { flashNpcPartyStatus, renderNpcPartyStatus, renderNpcStatusPage, setNpcPartyCharge } from "./npc-party-ui.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { applyNpcExplorationPassives, beginNpcRenewal, hireNpc, recordNpcExpeditionDepth, registerNpc, resolveNpcRenewal } from "../data/npc-party.js";
import { getActivePlayTimeDelta, normalizeAdventureStats, recordInnStay, recordShopPurchase, recordTempleDonation } from "../data/adventure-stats.js";
import { getAdventureChronicle } from "../data/adventure-records.js";
import { getEquipmentItem } from "../data/equipment.js";
import { getEquipmentInstanceDefinition, getEquipmentInstanceName, grantEquipmentInstance } from "../data/equipment-inventory.js";
import { createEnemyCombatant, getEnemyById, getEnemyEncounterCount, getRandomEncounterEnemy, getMagicRegionEncounterFormation, getTortureRegionEncounterFormation, getWaterRegionEncounterFormation, getCrystalRegionEncounterFormation, getDarkRegionEncounterFormation } from "../data/enemies.js";
import { applyBossVictory, bossLeavesRemains, createBossCombatant, getBossById, getFloorBossByDepth, isBossDefeated } from "../data/bosses.js";
import { B100_GAUNTLET_BOSS_IDS, getB100GauntletFlag } from "../data/fixed-floor-maps.js";
import { consumeKeyItem, getKeyItem, grantKeyItem, hasKeyItem } from "../data/key-items.js";
import { configureBattle, createPersistentBattlePlayerChanges, handleBattleInput, isBattleActive, isJireneScriptedBattleActive, openBattleItems, startBattle } from "./battle.js";
import { awardBattleExperience, calculateBattleExperienceReward, createTempleRevival, getInnStayFee, grantEventItems, resolveDungeonDefeat, resolveInnStableStay, resolveInnStay, resolveTemplePoisonTreatment, unlockGuildRequest } from "./character-services.js";
import { deriveDetailStats } from "../combat/derive-detail-stats.js";
import { resolveTreasureTrap } from "../combat/resolve-trap.js";
import { collectStats } from "../combat/collect-stats.js";
import { resolveSurprise } from "../combat/resolve-environment-save.js";
import { resolveDefeatRecovery } from "../combat/resolve-defeat-recovery.js";
import {
  createDepthReturnSettlement,
  formatDepthReturnSettlement
} from "../data/experience-settlement.js";
import { getDeadlyPoisonStepDamage, getNonlethalPoisonDamage } from "../combat/status-lifecycle.js";
import { getConditionLabel } from "../combat/condition-label.js";
import { getNextLevelExperience, MAX_LEVEL } from "../data/growth.js";
import { resolveFieldSkill } from "../combat/resolve-field-skill.js";
import { configureSkillOverlay, openSkillOverlay, handleSkillOverlayInput } from "./skill-overlay.js";
import { configureItemOverlay, openItemOverlay, handleItemOverlayInput } from "./item-overlay.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";
import { grantCard } from "../data/deck.js";
import { CARDS, collectCardStatBonuses, getCardById, hasCardEffect, sumCardEffectValues } from "../data/cards.js";
import { drawCardCanvas } from "./card-canvas.js";
import { getItem } from "../data/items.js";
import { isCriticalHp } from "../data/quick-status.js";
import { applyTaurusDepthBonus } from "../data/taurus.js";
import { scaleBlackChestMimic } from "../data/mimic-scaling.js";
import { purchaseBuybackEquipment, purchaseBuybackItem, purchaseEquipment, purchaseItem, sellEquipmentInstance, sellItem } from "../data/commerce.js";
import { addLootCard, addLootEquipment, addLootGold, addLootItem, depositEquipmentInWarehouse, depositItemInWarehouse, grantItemWithOverflow, settleLootBag, withdrawEquipmentFromWarehouse, withdrawItemFromWarehouse } from "../data/inventory.js";
import { calculateFixedGoldPerDefeat, isGoldChestWeaponEligible, rollEnemyDrop, rollGoldChestLoot, rollPurpleChestLoot, rollRedChestLoot } from "../data/loot.js";
import { rollTreasureTrap } from "../data/traps.js";
import { restAtHealingFountain as restoreAtHealingFountain } from "../data/fountains.js";
import { getSkill } from "../data/skills.js";
import { getQuestRequiredSpecialRoomAccess, getSpecialRoomAccessRestriction, getSpecialRoomDefinition } from "../data/special-rooms.js";
import { acknowledgeShopStockAnnouncement, getShopEquipmentOffer, getShopStockState, markShopCategorySeen } from "../data/shop-stock.js";
import { getPastTavernRumors, getUnreadTavernRumor, markTavernRumorRead } from "../data/tavern-rumors.js";
import { renameCharacter as applyCharacterRename } from "../data/character-name.js";
import { isTransferDestinationUnlocked } from "../data/transfer-destinations.js";
import { selectRevivalGoddessImage } from "../data/revival-presentation.js";
import { ANASTASIA_OUTFIT_EVENT_FLAG } from "../data/anastasia-event.js";
import { createMichaelaRestorationController } from "./michaela-restoration.js";
import { createEndingController } from "./ending.js";
import { completeEndingStory, completeEndingCredits, getEndingResumeMode } from "../data/ending.js";
import { HELEN_HIDDEN_EVENT_PENDING_FLAG, HELEN_HIDDEN_EVENT_SEEN_FLAG, isHelenHiddenEventPending } from "../data/helen-event.js";
import { getFireFloorStepDamage, isFireFloorDepth } from "../data/fire-floor.js";
import { getColdFloorStepDamage, isColdFloorDepth } from "../data/cold-floor.js";
import {
  invalidateLongMarchChallenge,
  invalidateMarathonChallenge,
  LONG_MARCH_REWARD_CARD_ID,
  MARATHON_BOSS_FLOORS,
  MARATHON_REWARD_CARD_ID,
  recordLongMarchDescent,
  recordMarathonDescent,
  startLongMarchChallenge,
  startMarathonChallenge
} from "../data/marathon-challenge.js";
import { applyVirgoFloorRecovery } from "../data/virgo-card.js";
import { backfillCompendiumFromCharacter, recordMonsterDefeat as recordCompendiumMonsterDefeat, recordMonsterDrop, recordMonsterEncounter } from "../data/compendium.js";
import {
  abandonQuest,
  acceptQuest,
  completeQueenShadowInvestigation,
  completeSecondQueenShadowInvestigation,
  completeThirdQueenShadowInvestigation,
  grantRedDoorInvestigationSupply,
  getForcedEnemyId,
  getActiveDefeatQuestProgress,
  formatDefeatQuestProgressUpdates,
  getQuestProgress,
  hasActiveQuest,
  hasCompleteQueenRegalia,
  hasActiveFullFloorSurvey,
  isDungeonDepthUnlocked,
  recordEnemyDefeat,
  recordBossDefeat,
  recordCustomQuestProgress,
  recordFloorExploration,
  recordQuestBeeswax,
  deliverQuestBeeswax,
  recordQueenShadowEncounter,
  recordSecondQueenShadowEncounter,
  recordThirdQueenShadowEncounter,
  recordThievesClue,
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
  function getContextualCharacter() {
    return applyTaurusDepthBonus(character, {
      location: worldLocation,
      depth: currentDepth
    });
  }
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
  const firstDungeonTutorial = document.getElementById("firstDungeonTutorial");
  const deckTutorial = document.getElementById("deckTutorial");
  const viewportEl = document.querySelector(".viewport");
  const townPortraitFrame = document.querySelector(".town-portrait-frame");
  const torchMeterEl = document.getElementById("torchMeter");
  const presenceMeterEl = document.getElementById("presenceMeter");
  const compassCanvas = document.getElementById("compass");
  const fpsIndicator = document.getElementById("fpsIndicator");
  const stopwatchEl = document.getElementById("stopwatch");
  const forwardBtn = document.getElementById("forward");
  const backBtn = document.getElementById("back");
  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const autoReturnBtn = document.getElementById("autoReturn");
  const randomGenerateBtn = document.getElementById("randomGenerate");
  const virtualStickEl = document.getElementById("virtualStick");
  const floatingStickZone = document.getElementById("floatingStickZone");
  const touchDpad = document.getElementById("touchDpad");
  const buttonA = document.getElementById("buttonA");
  const buttonB = document.getElementById("buttonB");
  const gamepadNotification = document.getElementById("gamepadNotification");
  const menuScreen = document.getElementById("menuScreen");
  const dungeonCommands = document.getElementById("dungeonCommands");
  const npcPartyStatus = document.querySelector(".npc-party-status");
  const townScreen = document.getElementById("townScreen");
  const levelUpEffect = document.getElementById("levelUpEffect");
  const questCompleteEffect = document.getElementById("questCompleteEffect");
  const achievementUnlockedEffect = document.getElementById("achievementUnlockedEffect");
  if (achievementUnlockedEffect) document.body.append(achievementUnlockedEffect);
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
  const lootBagTutorial = document.getElementById("lootBagTutorial");
  const lootBagTutorialPrompt = document.getElementById("lootBagTutorialPrompt");
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
  const lichtbringerWhiteout = document.getElementById("lichtbringerWhiteout");
  const michaelaRestorationRoot = document.getElementById("michaelaRestoration");
  const michaelaRestorationController = createMichaelaRestorationController({
    root: michaelaRestorationRoot,
    flash: document.getElementById("michaelaRestorationFlash"),
    onMessage: say,
    onComplete: completeMichaelaRestoration
  });
  let michaelaRestorationStarting = false;
  let endingSequenceActive = false;
  let mainEndingStarting = false;
  let endingInputAbort = null;
  function setEndingInputLocked(locked) {
    endingSequenceActive = locked;
    if (!locked) { endingInputAbort?.abort(); endingInputAbort = null; return; }
    if (endingInputAbort) return;
    endingInputAbort = new AbortController();
    const blockOutsideEnding = event => {
      if (event.target instanceof Element && event.target.closest("#endingScreen, #michaelaRestoration")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    for (const type of ["pointerdown", "click", "touchend"]) {
      document.addEventListener(type, blockOutsideEnding, { capture: true, passive: false, signal: endingInputAbort.signal });
    }
  }
  const endingWaits = new Map();
  function waitForEnding(milliseconds) {
    return new Promise(resolve => {
      const timer = window.setTimeout(() => { endingWaits.delete(timer); resolve(true); }, milliseconds);
      endingWaits.set(timer, resolve);
    });
  }
  const endingController = createEndingController({
    parent: document.querySelector(".game"),
    getFrameRate: getEffectiveFrameRate,
    onSuspendTown: suspended => {
      setTownEndingSuspended(suspended);
      if (!suspended) {
        setEndingInputLocked(false);
        state.autoReturnPaused = false;
        openTown({ registrationRequired: false });
        updateCharacterUi();
      }
    },
    onSaveStory: () => {
      character = completeEndingStory(character);
      updateCharacterUi();
      return saveGame();
    },
    onFinish: ({ replay }) => {
      const previous = character;
      if (!replay) character = completeEndingCredits(character);
      const saved = replay || saveGame();
      if (!saved) character = previous;
      return saved;
    }
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    const mode = getEndingResumeMode(character);
    if (mode === "restoration") void runMichaelaRestoration();
    else if (mode === "arrival" || mode === "credits") void runMainEnding();
  });
  let sceneTransitionRunning = false;
  let templeRevivalJinglePending = false;
  let cardGetTimer = 0;
  let itemGetTimer = 0;
  let bonusGetTimer = 0;
  let knownAchievementIds = null;
  const achievementNotificationQueue = [];
  let achievementNotificationRunning = false;
  let gamepadNotificationTimer = 0;
  let trapResultTimer = 0;
  let experienceSettlementCloseCallback = null;
  let pendingLootIdentification = null;
  let firstDungeonTutorialActive = false;
  let firstDungeonTutorialReady = false;
  let firstDungeonTutorialTimer = 0;
  let resolveFirstDungeonTutorial = null;
  let deckTutorialActive = false;
  let deckTutorialReady = false;
  let deckTutorialTimer = 0;
  let deckTutorialReturnMessage = "";
  let lootBagTutorialActive = false;
  let lootBagTutorialReady = false;
  let lootBagTutorialTimer = 0;

  let lootIdentifyTouchHandled = false;

  function activateLootIdentifyAction() {
    if (lootBagTutorialActive) {
      if (!lootBagTutorialReady) return;
      finishLootBagTutorial();
    }
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
  function finishFirstDungeonTutorial() {
    if (!firstDungeonTutorialActive || !firstDungeonTutorialReady) return false;
    window.clearTimeout(firstDungeonTutorialTimer);
    firstDungeonTutorialActive = false;
    firstDungeonTutorialReady = false;
    firstDungeonTutorial.hidden = true;
    if (character) character.firstDungeonTutorialSeen = true;
    say("奈落へ足を踏み入れた。");
    saveGame();
    setPlayerInputEnabled(true);
    const resolve = resolveFirstDungeonTutorial;
    resolveFirstDungeonTutorial = null;
    resolve?.();
    return true;
  }

  function handleFirstDungeonTutorialInput(action) {
    if (!firstDungeonTutorialActive) return false;
    if (action === "confirm") finishFirstDungeonTutorial();
    return true;
  }

  function showFirstDungeonTutorial() {
    if (!firstDungeonTutorial) {
      setPlayerInputEnabled(true);
      return Promise.resolve();
    }
    setPlayerInputEnabled(false);
    firstDungeonTutorialActive = true;
    firstDungeonTutorialReady = false;
    firstDungeonTutorial.hidden = false;
    window.clearTimeout(firstDungeonTutorialTimer);
    firstDungeonTutorialTimer = window.setTimeout(() => {
      if (!firstDungeonTutorialActive) return;
      firstDungeonTutorialReady = true;
      say("＊Aボタンで次へ");
    }, 3000);
    return new Promise(resolve => {
      resolveFirstDungeonTutorial = resolve;
    });
  }

  function updateDeckTutorialTarget() {
    if (!deckTutorialActive || !deckTutorial || !dungeonCommands) return;
    const deckButton = dungeonCommands.querySelector('[data-facility-command="deck"]');
    if (!deckButton) return;
    const tutorialRect = deckTutorial.getBoundingClientRect();
    const buttonRect = deckButton.getBoundingClientRect();
    const padding = 5;
    deckTutorial.style.setProperty("--deck-hole-left", `${Math.max(0, buttonRect.left - tutorialRect.left - padding)}px`);
    deckTutorial.style.setProperty("--deck-hole-top", `${Math.max(0, buttonRect.top - tutorialRect.top - padding)}px`);
    deckTutorial.style.setProperty("--deck-hole-width", `${Math.min(tutorialRect.width, buttonRect.width + padding * 2)}px`);
    deckTutorial.style.setProperty("--deck-hole-height", `${Math.min(tutorialRect.height, buttonRect.height + padding * 2)}px`);
  }

  function finishDeckTutorial() {
    if (!deckTutorialActive || !deckTutorialReady) return false;
    window.clearTimeout(deckTutorialTimer);
    deckTutorialActive = false;
    deckTutorialReady = false;
    deckTutorial.hidden = true;
    if (character) character.deckTutorialSeen = true;
    say(deckTutorialReturnMessage);
    deckTutorialReturnMessage = "";
    saveGame();
    setPlayerInputEnabled(true);
    return true;
  }

  function showDeckTutorial(returnMessage = "") {
    if (!deckTutorial || character?.deckTutorialSeen) return;
    setPlayerInputEnabled(false);
    deckTutorialReturnMessage = returnMessage || msgEl?.textContent || "";
    deckTutorialActive = true;
    deckTutorialReady = false;
    deckTutorial.hidden = false;
    updateDeckTutorialTarget();
    window.clearTimeout(deckTutorialTimer);
    deckTutorialTimer = window.setTimeout(() => {
      if (!deckTutorialActive) return;
      deckTutorialReady = true;
      say("＊Aボタンで次へ");
    }, 3000);
  }

  function handleBlockingTutorialInput(action) {
    if (firstDungeonTutorialActive) return handleFirstDungeonTutorialInput(action);
    if (!deckTutorialActive) return false;
    if (action === "confirm") finishDeckTutorial();
    return true;
  }
  firstDungeonTutorial?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    if (firstDungeonTutorialReady) finishFirstDungeonTutorial();
  });
  deckTutorial?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    if (deckTutorialReady) finishDeckTutorial();
  });
  window.addEventListener("resize", updateDeckTutorialTarget);
  let pendingEncounter = null;
  let activeRareRoomEncounterId = null;
  const escapedSpecialBossesThisExploration = new Set();
  const b100GauntletDefeatedThisExploration = new Set();
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
    handleOverlayInput: action => handleBlockingTutorialInput(action) || handleOverlayEventInput(action),
    updateAnimation,
    updateHud,
    drawMinimap,
    getMinimapOptions: () => {
      const regaliaEffects = getQueenRegaliaMinimapEffects(character?.keyItems, { depth: currentDepth, eventFlags: character?.eventFlags, location: worldLocation });
      return {
        W,
        H: canvas.height,
        MAP_W,
        MAP_H,
        cells,
        explored,
        state: {
          ...state,
          fullMapRevealActive: regaliaEffects.fullMapRevealActive,
          floorDetectionActive: hasCardEffect(character?.cards?.deckSlots, "floor_detection"),
          stairsDetectionActive: hasCardEffect(character?.cards?.deckSlots, "stairs_detection")
            || regaliaEffects.stairsDetectionActive,
          npcDetectionActive: hasCardEffect(character?.cards?.deckSlots, "npc_detection")
            || regaliaEffects.npcDetectionActive,
          treasureDetectionActive: hasCardEffect(character?.cards?.deckSlots, "treasure_detection")
            || regaliaEffects.treasureDetectionActive
        }
      };
    },
    getMinimapBounds,
    isMobileDevice: () => document.body.classList.contains("layout-mobile")
      || document.body.classList.contains("layout-tablet")
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
        : currentDepth === 99
          && character?.eventFlags?.boss_b99f_defeated
          && !hasCompleteQueenRegalia(character)
          ? "あなたを拒む絶対的な力を感じる。この力に抗うには何かが足りないようだ…。"
          : "まだこの先に進むのは止めた方がよさそうだ。"
    ),
    descendFloor,
    playSe,
    playStairsSequence: () => playSeSequence("stairs", 3),
    runStairsTransition: (onDark) => runSceneTransition({
      playAudio: () => playSeSequence("stairs", 3),
      onDark
    }),
    runQuicksandTransition: (onDark) => runSceneTransition({
      onDark,
      darkenMs: 650,
      holdMs: 100,
      revealMs: 550
    }),
    runFixedWarpTransition: async (onDark) => {
      await playSe("fixedWarp");
      return runSceneTransition({ onDark, darkenMs: 650, holdMs: 100, revealMs: 550 });
    },
    startRapidCurrentFlow: startLoopSe,
    stopRapidCurrentFlow: stopLoopSe,
    showTreasure,
    playTreasureOpening,
    hideTreasure,
    resolveTreasureTrap: resolveCurrentTreasureTrap,
    awardTreasure: awardTreasureLoot,
    unlockBossDoor: unlockCurrentBossDoor,
    getBossRoomEntryBlock: ({ toX, toY }) => {
      const enteringBossRoom = cells[toY]?.[toX]?.reserved === "bossRoom";
      const flags = character?.eventFlags || {};
      const investigation = getQuestProgress(character, "guild_028");
      return enteringBossRoom && currentDepth === 79
        && ((!flags.jirene_scripted_defeat_seen && !investigation.active)
          || (flags.jirene_scripted_defeat_seen && !hasKeyItem(character?.keyItems, "beeswax_earplugs")))
        ? { blocked: true, message: "今はこれ以上進むべきではない…。" }
        : { blocked: false };
    },
    getSpecialDoorLockInfo: getCurrentSpecialDoorLockInfo,
    getSpecialDoorAccessBlock: getCurrentSpecialDoorAccessBlock,
    attemptSpecialDoorUnlock: attemptCurrentSpecialDoorUnlock,
    isBossDefeated: isCurrentBossDefeated,
    isBossRematch: isB100GauntletBossId,
    isBossRetryBlocked: bossId => escapedSpecialBossesThisExploration.has(bossId),
    getBossEncounterImageId: boss => currentDepth === 79 && boss?.id === "jirene_b79f" && character?.eventFlags?.jirene_scripted_defeat_seen
      ? boss.event?.transformationImageId
      : boss?.encounterImageId || boss?.imageId || "",
    getBossEncounterPrompt: boss => isB100GauntletBossId(boss?.id)
      ? `${boss.name}の幻影が行く手に立ちはだかっている。\n＊Aボタンで次へ`
      : currentDepth === 79 && boss?.id === "jirene_b79f" && character?.eventFlags?.jirene_scripted_defeat_seen
        ? "ジレーネ「ああ…！また来たのね…。また、私…いえ、妾の歌を…聴きたいのね…！」\n＊Aボタンで次へ"
        : boss?.event?.prompt,
    getBossStartMessage: boss => isB100GauntletBossId(boss?.id)
      ? `B100Fの守護者として、${boss.name}が襲いかかってきた！`
      : currentDepth === 79 && boss?.id === "jirene_b79f" && character?.eventFlags?.jirene_scripted_defeat_seen
        ? "ジレーネが歌声を響かせる。しかし、蜜蝋の耳栓が魔性の響きを遮った！"
        : boss?.event?.start,
    hasSphinxAnswer: () => hasKeyItem(character?.keyItems, "johanna_calico_cat"),
    onSphinxRiddleHeard: () => {
      if (!character) return false;
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), sphinx_b69f_riddle_heard: true }
      };
      updateCharacterUi();
      saveGame();
      return true;
    },
    onSphinxPeaceResolved: () => {
      if (!character || !hasKeyItem(character.keyItems, "johanna_calico_cat")) return { accepted: false };
      const reward = grantCard(character.cards, "legendary_sphinx_wisdom", 1, character.deckCost);
      character = {
        ...character,
        cards: reward.cards,
        eventFlags: {
          ...(character.eventFlags || {}),
          boss_b69f_defeated: true,
          sphinx_b69f_peaceful: true,
          sphinx_b69f_route_fixed: true
        }
      };
      markBossDefeatedAt(state.gridX, state.gridY, "sphinx_sleeping_b69f");
      if (reward.gained > 0) setTimeout(() => showCardGetEffect("legendary_sphinx_wisdom", { seId: "itemGet" }), 120);
      updateCharacterUi();
      saveGame();
      return { accepted: true, gained: reward.gained };
    },
    restAtFountain: restAtHealingFountain,
    returnToTown,
    beginBattle: beginRandomBattle,
    beginRareEnemyBattle,
    beginQuestEnemyBattle,
    inspectWaspHive: () => {
      const progress = getQuestProgress(character, "guild_029");
      if (!progress.active) return {
        canBattle: false,
        message: "巨大な蜂の巣がある。無数の羽音が聞こえる。今は近づかない方がよさそうだ。"
      };
      if (progress.progress >= 15) return {
        canBattle: false,
        message: "依頼に必要な蜜蝋は集まった。キルケの家へ届けよう。"
      };
      return { canBattle: true, message: "巨大な蜂の巣からワスプの群れが飛び出してきた！" };
    },
    inspectKirkeHouse: () => {
      const progress = getQuestProgress(character, "guild_029");
      const delivered = Boolean(character?.eventFlags?.quest_029_beeswax_delivered);
      if (delivered) return { canDeliver: false, message: "ここは魔女キルケの家だ。" };
      const introduction = "巨大な蔓に囲まれて今にも朽ちそうな家が建っている。こんな所に人が住んでいるのだろうか…？";
      return { canDeliver: Boolean(progress.active && progress.progress >= 15), message: introduction };
    },
    deliverBeeswaxToKirke: () => {
      const delivery = deliverQuestBeeswax(character);
      if (!delivery.accepted) return { accepted: false, message: "" };
      const earplugs = grantKeyItem(delivery.character.keyItems, "beeswax_earplugs");
      character = { ...delivery.character, keyItems: earplugs.keyItems };
      updateCharacterUi();
      saveGame();
      if (earplugs.gained) setTimeout(() => showNamedItemGetEffect(["蜜蝋の耳栓"], { important: true }), 0);
      return {
        accepted: true,
        message: "キルケ「わざわざこんな所まで届けさせて悪かったね。あたしも歳だからね。足を悪くして遠出は厳しいのさ。\nお礼にコイツをあげるよ。今のアンタにちょうどいいんじゃないかねぇ…？ひっひっひ…。」\n「蜜蝋の耳栓」を手に入れた！"
      };
    },
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
      if (character && npc?.id === "queen_shadow_desert") {
        character = recordSecondQueenShadowEncounter(character, currentDepth);
        updateCharacterUi();
        saveGame();
        return;
      }
      if (character && npc?.id === "queen_shadow_dark") {
        character = recordThirdQueenShadowEncounter(character, currentDepth);
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
    isSecondQueenShadowFinaleCompleted: () => Boolean(character?.eventFlags?.quest_024_earring_found),
    onSecondQueenShadowFinaleComplete: () => {
      if (!character || character.eventFlags?.quest_024_earring_found) return false;
      const granted = grantKeyItem(character.keyItems, "queen_earring");
      if (!granted.gained && granted.reason !== "alreadyOwned") return false;
      character = completeSecondQueenShadowInvestigation({ ...character, keyItems: granted.keyItems });
      updateCharacterUi();
      saveGame();
      setTimeout(() => showNamedItemGetEffect(["女王のイヤリング"], { important: true }), 0);
      return true;
    },
    isThirdQueenShadowFinaleCompleted: () => Boolean(character?.eventFlags?.quest_032_necklace_found),
    onThirdQueenShadowFinaleComplete: () => {
      if (!character || character.eventFlags?.quest_032_necklace_found) return false;
      const granted = grantKeyItem(character.keyItems, "queen_necklace");
      if (!granted.gained && granted.reason !== "alreadyOwned") return false;
      character = completeThirdQueenShadowInvestigation({ ...character, keyItems: granted.keyItems });
      updateCharacterUi();
      saveGame();
      setTimeout(() => showNamedItemGetEffect(["女王の首飾り"], { important: true }), 0);
      return true;
    },
    onQuestEvent: event => {
      if (event?.type === "lootPickup" && event.itemId && character) {
        const item = getItem(event.itemId);
        if (!item) return "何も見つからなかった。";
        const gained = addLootItem(character.lootBag, item.id, event.amount || 1);
        character = { ...character, lootBag: gained.lootBag };
        updateCharacterUi();
        saveGame();
        return `${item.name}を拾い、ロット袋へ入れた。`;
      }
      const keyItem = getKeyItem(event?.keyItemId);
      if (!keyItem || !character) return "何も見つからなかった。";
      const granted = grantKeyItem(character.keyItems, keyItem.id);
      const withItem = { ...character, keyItems: granted.keyItems };
      character = event.questId === "guild_011"
        ? recordThievesClue(withItem, event.flag)
        : event.questId ? recordCustomQuestProgress({
          ...withItem,
          eventFlags: { ...(withItem.eventFlags || {}), [event.flag]: true }
        }, event.questId, 1) : {
          ...withItem,
          eventFlags: { ...(withItem.eventFlags || {}), [event.flag]: true }
        };
      if (keyItem.id === "lichtbringer") {
        state.torchFuel = 100;
        state.lightbringerActive = false;
        state.minimapEffectForced = false;
        updateHud();
        setTimeout(() => runLichtbringerWhiteout(), 0);
      }
      updateCharacterUi();
      saveGame();
      if (granted.gained) setTimeout(() => showNamedItemGetEffect([keyItem.name], { important: true }), keyItem.id === "lichtbringer" ? 1100 : 0);
      return `貴重品「${keyItem.name}」を手に入れた！`;
    },
    onFixedFloorEvent: event => event?.description || "女王の影が静かに揺らめいている。",
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
    onEnterInn: enterInn,
    getShopStockState: () => getShopStockState(character),
    onViewShopCategory: viewShopCategory,
    onWithdrawItem: withdrawTownItem,
    onDepositItem: depositTownItem,
    onWithdrawEquipment: withdrawTownEquipment,
    onDepositEquipment: depositTownEquipment,
    onEditDeck: openDeckEditor,
    onOpenQuestHistory: openQuestHistory,
    onOpenRumorHistory: openRumorHistory,
    onRegisterNpc: npcId => {
      const result = registerNpc(character?.npcSystem, npcId);
      if (result.accepted) {
        character = { ...character, npcSystem: result.system };
        updateCharacterUi();
        saveGame();
      }
      return result;
    },
    onHireNpc: npcId => {
      const result = hireNpc(character, npcId);
      if (result.accepted) {
        character = result.character;
        updateCharacterUi();
        saveGame();
      }
      return result;
    },
    onRenewNpc: (npcId, continued) => {
      const result = resolveNpcRenewal(character, npcId, continued);
      if (result.accepted) {
        character = result.character;
        updateCharacterUi();
        saveGame();
      }
      return result;
    },
    onOpenAdventureRecords: openAdventureRecords,
    onOpenMonsterCompendium: openLibraryMonsterCompendium,
    onOpenCardGallery: openLibraryCardGallery,
    getUnreadRumor: () => getUnreadTavernRumor(character, {
      mikanEncountered: Boolean(character?.eventFlags?.mikan_nyanko_encountered)
        || Object.entries(state.npcEncounterCounts || {}).some(
          ([npcId, count]) => npcId.startsWith("NPC_01") && Number(count) > 0
        ),
      depthReached: character?.highestDungeonDepthReached,
      lingeringGhostDefeated: Boolean(character?.eventFlags?.lingering_ghost_b2f_defeated_once),
      otherworldlyWisdomDefeated: Boolean(character?.eventFlags?.boss_otherworldly_wisdom_b4f_defeated)
    }),
    onCompleteRumor: rumor => {
      character = markTavernRumorRead(character, rumor);
      updateCharacterUi();
      saveGame();
    },
    onCompleteFacilityTalk: flag => {
      if (!flag || !character) return;
      if (flag === "johanna_cat_return_transition") {
        const returned = consumeKeyItem(character.keyItems, "johanna_calico_cat");
        character = {
          ...character,
          keyItems: returned.keyItems,
          eventFlags: { ...(character.eventFlags || {}), johanna_cat_return_pending: false }
        };
        updateCharacterUi();
        saveGame();
        return;
      }
      character = {
        ...character,
        eventFlags: {
          ...(character.eventFlags || {}),
          [flag]: true,
          ...(flag === HELEN_HIDDEN_EVENT_SEEN_FLAG ? { [HELEN_HIDDEN_EVENT_PENDING_FLAG]: false } : {})
        }
      };
      if (flag === HELEN_HIDDEN_EVENT_SEEN_FLAG) {
        const granted = grantKeyItem(character.keyItems, "discount_pass");
        character = { ...character, keyItems: granted.keyItems };
        if (granted.gained > 0) setTimeout(() => showNamedItemGetEffect(["ディスカウントパス"], { important: true }), 0);
      }
      updateCharacterUi();
      saveGame();
      if (flag === ANASTASIA_OUTFIT_EVENT_FLAG) void runSceneTransition();
    },
    onTalk: talkAtFacility,
    onAcceptRequest: acceptGuildRequest,
    onAbandonRequest: abandonGuildRequest,
    onReportRequest: reportGuildRequest,
    onAmbienceChanged: enabled => {
      if (endingSequenceActive) { stopLoopSe("townAmbience"); return; }
      if (enabled) startLoopSe("townAmbience");
      else stopLoopSe("townAmbience");
    },
    onBgmChanged: key => {
      if (endingSequenceActive) return;
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
    getFrameRate: getEffectiveFrameRate,
    isMobileDevice: () => document.body.classList.contains("layout-mobile")
      || document.body.classList.contains("layout-tablet"),
    getCharacter: () => getContextualCharacter(),
    onCharacterChanged: updateCharacterFromBattle,
    onVictory: finishBattleVictory,
    onDefeat: finishBattleDefeat,
    onEscape: finishBattleEscape,
    onScriptedDefeat: finishJireneScriptedDefeat,
    openSkills: ({ character: battleCharacter, enemy, onUse }) => openSkillOverlay({
      context: "battle",
      character: battleCharacter,
      enemy,
      onUse
    }),
    openItems: ({ character: battleCharacter, enemy, enemies, onUse }) => {
      viewportEl.append(itemOverlay);
      return openItemOverlay({
        context: "battle",
        character: battleCharacter,
        enemy,
        enemies,
        onUse
      });
    },
    playSe,
    onNpcSupport: npcId => flashNpcPartyStatus(npcPartyStatus, npcId),
    onNpcCharge: (npcId, charge) => setNpcPartyCharge(npcPartyStatus, npcId, charge)
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
        fixedMapVersion: currentDepth === 100 ? 4 : null,
        b100GauntletDefeatedBossIds: currentDepth === 100
          ? [...b100GauntletDefeatedThisExploration]
          : [],
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
    if (state.rapidCurrentTransitionActive) return false;
    if (isJireneScriptedBattleActive()) return false;
    accruePlayTime();
    const isManualSave = /^manual[1-3]$/.test(slot);
    if (isManualSave && worldLocation !== "town") return false;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = 0;
    }
    if (character) {
      character = {
        ...character,
        compendium: backfillCompendiumFromCharacter(character.compendium, character)
      };
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
    cancelRapidCurrentTransition();
    const dungeon = save?.dungeon;
    const player = save?.player;
    if (!dungeon || !player || dungeon.cells.length !== MAP_H || dungeon.explored.length !== MAP_H) return false;
    if (!dungeon.cells.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!dungeon.explored.every(row => Array.isArray(row) && row.length === MAP_W)) return false;
    if (!inBounds(player.gridX, player.gridY) || !Number.isInteger(player.dir) || !DIRS[player.dir]) return false;
    currentDepth = Math.max(1, Math.floor(Number(dungeon.depth) || 1));
    const rebuildB100FixedMap = currentDepth === 100 && Number(dungeon.fixedMapVersion) !== 4;
    b100GauntletDefeatedThisExploration.clear();
    if (!rebuildB100FixedMap && currentDepth === 100) {
      for (const bossId of dungeon.b100GauntletDefeatedBossIds || []) {
        if (B100_GAUNTLET_BOSS_IDS.includes(bossId)) b100GauntletDefeatedThisExploration.add(bossId);
      }
    }
    if (rebuildB100FixedMap) {
      buildBoundaryWallMap(100, Math.random, {
        eventFlags: { ...(save.character?.eventFlags || {}) },
        b100GauntletDefeatedBossIds: []
      });
    }

    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        if (rebuildB100FixedMap) {
          explored[y][x] = false;
          continue;
        }
        const savedCell = structuredClone(dungeon.cells[y][x]);
        if (savedCell.bossRemainsId && !bossLeavesRemains(savedCell.bossRemainsId)) {
          savedCell.bossRemainsId = null;
        }
        const unusedSpecialRoomPurple = savedCell.treasure === "purple"
          && Boolean(savedCell.specialRoom)
          && !getSpecialRoomDefinition(currentDepth)?.content;
        if (savedCell.treasure && currentDepth <= 4 && savedCell.treasure !== "purple") savedCell.treasure = "red";
        if (currentDepth > 4 && !savedCell.eventTreasureId
          && !(savedCell.treasure === "black" && save.character?.eventFlags?.black_chests_unlocked)
          && !unusedSpecialRoomPurple) savedCell.treasure = null;
        Object.assign(cells[y][x], savedCell);
        cells[y][x].specialRoom = savedCell.specialRoom || null;
        cells[y][x].questEvent = savedCell.questEvent || null;
        if (cells[y][x].specialRoom) {
          const fixedContent = getSpecialRoomDefinition(currentDepth)?.content;
          cells[y][x].specialRoom.content = fixedContent ?? savedCell.specialRoom?.content ?? null;
          if (fixedContent?.type === "keyItemPickup") {
            const pickupQuest = getQuestProgress(save.character, fixedContent.requiredQuestId || fixedContent.questId);
            const pickupAlreadyResolved = Boolean(save.character?.eventFlags?.[fixedContent.flag])
              || hasKeyItem(save.character?.keyItems, fixedContent.keyItemId);
            cells[y][x].questEvent = pickupQuest.active && !pickupAlreadyResolved
              ? structuredClone(fixedContent)
              : null;
          }
        }
        cells[y][x].featureReservation = savedCell.featureReservation || null;
        cells[y][x].featureApproach = savedCell.featureApproach || null;
        cells[y][x].treasureTrapId = savedCell.treasureTrapId || null;
        cells[y][x].quicksand = savedCell.quicksand || null;
        cells[y][x].rapidCurrent = savedCell.rapidCurrent || null;
        cells[y][x].rapidCurrentDiscovered = Boolean(savedCell.rapidCurrentDiscovered);
        explored[y][x] = Boolean(dungeon.explored[y][x]);
      }
    }
    const start = rebuildB100FixedMap ? cells.flat().find(cell => cell.type === "stairsUp") : dungeon.startPosition;
    if (start && inBounds(start.x, start.y)) setStartPosition(start.x, start.y);
    setDungeonColors(resolveCurrentFloorTheme());
    applyCurrentFloorMist();
    state.anim = null;
    state.gridX = rebuildB100FixedMap ? start.x : player.gridX;
    state.gridY = rebuildB100FixedMap ? start.y : player.gridY;
    state.dir = player.dir;
    state.x = state.gridX + .5;
    state.y = state.gridY + .5;
    if (rebuildB100FixedMap) explored[state.gridY][state.gridX] = true;
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
    const resumeMichaelaRestoration = Boolean(
      character?.eventFlags?.boss_amayenak_b100f_defeated
      && !character?.eventFlags?.michaela_restored
    );
    if (resumeMichaelaRestoration) {
      const truthStaff = grantKeyItem(character.keyItems, "truth_staff");
      character = {
        ...character,
        keyItems: truthStaff.keyItems,
        eventFlags: {
          ...(character.eventFlags || {}),
          truth_staff_obtained: true
        }
      };
    }
    let restoredLongMarchReward = false;
    if (character?.eventFlags?.b1_b84_long_march_completed) {
      const reward = grantCard(character.cards, LONG_MARCH_REWARD_CARD_ID, 1, character.deckCost);
      character = { ...character, cards: reward.cards };
      restoredLongMarchReward = reward.gained > 0;
    }
    knownAchievementIds = new Set(getAdventureChronicle(character).filter(entry => entry.achieved).map(entry => entry.id));
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
    const endingResume = getEndingResumeMode(character);
    if (endingResume === "credits" || endingResume === "arrival") {
      setPlayerInputEnabled(false);
      void runMainEnding();
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
      if (currentDepth === 100 && resumeMichaelaRestoration) {
        setPlayerInputEnabled(false);
        window.setTimeout(() => void runMichaelaRestoration(), 150);
      }
    }
    if (restoredLongMarchReward) {
      setTimeout(() => showCardGetEffect(LONG_MARCH_REWARD_CARD_ID, { seId: "itemGet" }), 120);
      scheduleAutosave();
    }
    return true;
  }

  function startNewGame() {
    resetDebugSettingsForNewGame();
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

  function renderPlayerChargeGauge() {
    const gauge = document.getElementById("playerChargeGauge");
    const fill = document.getElementById("playerChargeFill");
    if (!gauge || !fill) return;
    const value = Math.max(0, Math.min(100, Math.floor(Number(character?.playerCharge?.value) || 0)));
    fill.style.width = `${value}%`;
    gauge.setAttribute("aria-valuenow", String(value));
    gauge.classList.toggle("is-charged", value >= 100 && Number(character?.playerCharge?.cooldown) <= 0);
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
    const townPortraitFrame = townScreen?.querySelector(".town-portrait-frame");
    const viewport = document.querySelector(".viewport");
    if (townScreen?.hidden && viewport && cardGetEffect.parentElement !== viewport) {
      viewport.append(cardGetEffect);
    }
    playSe(seId);
    drawCardCanvas(cardGetCanvas, card);
    cardGetEffect.hidden = false;
    cardGetEffect.classList.remove("is-active");
    void cardGetEffect.offsetWidth;
    cardGetEffect.classList.add("is-active");
    cardGetTimer = window.setTimeout(() => {
      cardGetEffect.classList.remove("is-active");
      cardGetEffect.hidden = true;
      if (townPortraitFrame && cardGetEffect.parentElement !== townPortraitFrame) {
        townPortraitFrame.append(cardGetEffect);
      }
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

  function showNamedItemGetEffect(itemNames, { important = false, amounts = [] } = {}) {
    if (!itemGetEffect || !itemGetItems || itemNames.length === 0) return;
    window.clearTimeout(itemGetTimer);
    playSe(important ? "importantItem" : "itemGet");
    itemGetItems.replaceChildren(...itemNames.map((itemName, index) => {
      const row = document.createElement("span");
      const amount = Math.max(1, Math.floor(Number(amounts[index]) || 1));
      row.textContent = `${itemName} ×${amount}`;
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

  function templeKeeperName() {
    return character?.eventFlags?.tavern_rumor_004_base_read ? "助祭アナスタシア" : "司祭アーヴァイン";
  }

  function enterInn() {
    if (!character?.eventFlags?.johanna_cat_return_pending) return null;
    if (!hasKeyItem(character.keyItems, "johanna_calico_cat")) {
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), johanna_cat_return_pending: false }
      };
      saveGame();
      return null;
    }
    const message = "女将ヨハンナ：あらまあ、おかえり。危ない目には遭わなかったかい？";
    return {
      message,
      dialogue: [message],
      completionFlag: "johanna_cat_return_transition"
    };
  }

  function talkAtFacility(facilityId) {
    if (facilityId === "inn"
      && character?.eventFlags?.sphinx_b69f_riddle_heard
      && !character?.eventFlags?.sphinx_b69f_route_fixed
      && !hasKeyItem(character.keyItems, "johanna_calico_cat")) {
      const granted = grantKeyItem(character.keyItems, "johanna_calico_cat");
      character = { ...character, keyItems: granted.keyItems };
      updateCharacterUi();
      saveGame();
      if (granted.gained > 0) setTimeout(() => showNamedItemGetEffect(["ヨハンナの愛猫"], { important: true }), 0);
      const message = "女将ヨハンナ：おや？一体どうしたんだい？この子を見つめて。えっ？ちょっとこの子を貸して欲しいって？\nどこへ連れて行くつもりだい？危ない目には遭わせないでおくれよ？";
      return {
        dialogue: [message],
        completionFlag: "johanna_cat_borrow_transition",
        autoCompleteAfterMs: 2000
      };
    }
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
    if (facilityId === "temple" && character?.eventFlags?.tavern_rumor_004_base_read) {
      if (!character.eventFlags?.anastasia_first_talk_completed) {
        return {
          dialogue: [
            "助祭アナスタシア：黄金の稲穂の女神様に祈りを捧げにいらしたのですか？えっ？わたくしはアナスタシアと申します。\n＊Aボタンで次へ",
            "助祭アナスタシア：アーヴァイン様は腰を痛められてご静養なさっております。ですので、その間わたくしが代わりを務めております。\n＊Aボタンで戻る"
          ],
          completionFlag: "anastasia_first_talk_completed"
        };
      }
      return "助祭アナスタシア：さぁ、女神様に祈りを捧げましょう。";
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
    if (gained && facilityId === "inn" && !character?.deckTutorialSeen) {
      window.setTimeout(() => showDeckTutorial(reward.first), 0);
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
    if (result.acceptanceSupplyItemId) {
      const supplyItemName = getItem(result.acceptanceSupplyItemId)?.name || result.acceptanceSupplyItemId;
      setTimeout(() => showNamedItemGetEffect(
        [supplyItemName],
        { important: true, amounts: [result.acceptanceSupplyAmount] }
      ), 0);
    }
    if (result.acceptanceKeyItemId) {
      const keyItemName = getKeyItem(result.acceptanceKeyItemId)?.name || result.acceptanceKeyItemId;
      setTimeout(() => showNamedItemGetEffect([keyItemName], { important: true }), 0);
    }
    return {
      ...result,
      character,
      ...(questId === "guild_028" ? {
        clientName: "パルテノペー",
        clientPortrait: "images/npc/NPC_22.avif",
        clientDialogue: [
          "ギルドマスター：依頼人が来ている。お前に直接話したいそうだ。\n＊Aボタンで次へ",
          "パルテノペー「…あ、あなたが依頼を受けてくれた…人？まるで何かを誘うような歌声がずっと聞こえてくるの…。\n誰が歌っているのか気になって…。よかったら調べてほしいの。お願い…。」\n＊Aボタンで次へ",
          "それだけ言い残すと、上目遣いでこちらを見つめていた女性は去って行った…。\n＊Aボタンで次へ"
        ]
      } : questId === "guild_030" ? {
        clientName: "怪しげな男",
        clientPortrait: "images/npc/NPC_25.avif",
        clientPortraitStartIndex: 1,
        clientDialogue: [
          "ギルドマスター：依頼人がお前に会いたいそうだ。\n＊Aボタンで次へ",
          "怪しげな男「…依頼を受けてくれて感謝する…。そんなに難しい依頼では…ない。あんたに預けた『トラペツォエーダー』――その多面体を指定した場所で使うだけでいい…。頼んだぞ…。」\n＊Aボタンで次へ"
        ]
      } : questId === "guild_033" ? {
        clientName: "キルケ",
        clientPortrait: "images/npc/NPC_23.avif",
        clientPortraitStartIndex: 1,
        clientDialogue: [
          "ギルドマスター：依頼人がお前に会いたいそうだ。\n＊Aボタンで次へ",
          "キルケ「漆黒の闇を手探りで進むのは容易ではない…。くれぐれも気をつけるのじゃ…。\nそして必ずや女王様をお助けするのじゃ…。」\n＊Aボタンで次へ"
        ]
      } : {}),
      acceptedMessage: questId === "guild_020"
        ? "ギルドマスター：これがヘレンから預かった除草剤の試供品だ。持っていけ。"
        : result.acceptanceRewardCardId
        ? "ギルドマスター：何が起こるか分からない危険な調査になるだろう。これを持っていけ。"
        : result.acceptanceSupplyItemId
          ? "ギルドマスター：危険な調査だ。事前支給品を受け取れ。"
        : result.acceptanceKeyItemId
          ? "怪しげな男：これをB89Fで掲げてくれ。何が現れても、最後まで見届けるんだ。"
        : "",
      acceptanceRewardMessage: result.acceptanceRewardCardId
        ? "Rカード「防御力上昇」を手に入れた！"
        : result.acceptanceSupplyItemId
          ? `「${getItem(result.acceptanceSupplyItemId)?.name || result.acceptanceSupplyItemId}」を${result.acceptanceSupplyAmount}個受け取った！`
        : result.acceptanceKeyItemId
          ? `貴重品「${getKeyItem(result.acceptanceKeyItemId)?.name || result.acceptanceKeyItemId}」を受け取った！`
        : ""
    };
  }

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
        rewardCardIds: result.rewardCardIds,
        rewardEquipmentId: result.rewardEquipmentId,
        rewardItemId: result.rewardItemId,
        rewardItemAmount: result.rewardItemAmount,
        bonusGold: result.bonusGold,
        presentationOrder: result.presentationOrder,
        eventRewardCardId
      });
    }, 0);
    return { ...result, character, eventRewardCardId, message: result.reportMessage };
  }

  async function showGuildQuestRewardSequence({
    rewardCardId,
    rewardCardIds = [],
    rewardEquipmentId,
    rewardItemId,
    rewardItemAmount,
    bonusGold,
    presentationOrder,
    eventRewardCardId
  } = {}) {
    await showTimedEffect(questCompleteEffect, "importantItem", 3400);
    if (presentationOrder === "cardsThenGold") {
      for (const cardId of rewardCardIds) {
        showCardGetEffect(cardId);
        await wait(3400);
      }
      if (bonusGold > 0) await showBonusGetEffect(bonusGold);
      return;
    }
    if (bonusGold > 0) {
      await showBonusGetEffect(bonusGold);
    }
    if (rewardCardId) {
      showCardGetEffect(rewardCardId);
      if (eventRewardCardId || rewardEquipmentId) await wait(3400);
    }
    if (rewardEquipmentId) {
      const equipment = getEquipmentItem(rewardEquipmentId, "footId");
      showNamedItemGetEffect([equipment?.name || rewardEquipmentId], { important: true });
      if (eventRewardCardId) await wait(3400);
    }
    if (rewardItemId) {
      const item = getItem(rewardItemId);
      const amount = Math.max(1, Math.floor(Number(rewardItemAmount) || 1));
      showNamedItemGetEffect([item?.name || rewardItemId], { important: true, amounts: [amount] });
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
    const medal = document.getElementById("royalMedal");
    if (medal) medal.hidden = !character?.eventFlags?.royal_cat_medal_awarded;
    const statusCharacter = getContextualCharacter();
    setPassivePresenceIncreaseReduction(sumCardEffectValues(
      character?.cards?.deckSlots,
      "presence_gain_reduction"
    ));
    setTorchCardEffects({
      consumptionDisabled: hasCardEffect(character?.cards?.deckSlots, "torch_consumption_disabled"),
      effectForced: hasCardEffect(character?.cards?.deckSlots, "force_torch_effect_active")
    });
    renderCharacterStatus(statusCharacter);
    renderPlayerChargeGauge();
    renderNpcPartyStatus(npcPartyStatus, character);
    renderNpcStatusPage(document.querySelector("[data-npc-status-list]"), character);
    const statusName = document.getElementById("statusName");
    const statusJob = document.getElementById("statusJob");
    const statusLevel = document.getElementById("statusLevel");
    const statusCondition = document.getElementById("statusCondition");
    const statusGold = document.getElementById("statusGold");
    if (statusName) statusName.textContent = character?.name || "NO_NAME";
    if (statusJob) statusJob.textContent = character?.jobLabel || "UNKNOWN";
    if (statusLevel) statusLevel.textContent = character ? String(character.level).padStart(3, "0") : "---";
    if (statusCondition) statusCondition.textContent = character?.condition || "----";
    statusCondition?.classList.toggle("condition-poison", ["POISON", "TOXIC", "DEATH POISON"].includes(character?.condition));
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
    renderStatusGauges(statusCharacter);
    renderEquipment(statusCharacter);
    renderDetailStats(statusCharacter);
    renderExperience(statusCharacter);
    detectAchievementUnlocks();
  }

  function detectAchievementUnlocks() {
    if (!character) {
      knownAchievementIds = null;
      return;
    }
    const achieved = getAdventureChronicle(character).filter(entry => entry.achieved);
    if (knownAchievementIds == null) {
      knownAchievementIds = new Set(achieved.map(entry => entry.id));
      return;
    }
    const newlyUnlocked = achieved.filter(entry => !knownAchievementIds.has(entry.id));
    achieved.forEach(entry => knownAchievementIds.add(entry.id));
    if (!newlyUnlocked.length) return;
    achievementNotificationQueue.push(...newlyUnlocked);
    void playNextAchievementNotification();
  }

  async function playNextAchievementNotification() {
    if (achievementNotificationRunning || !achievementUnlockedEffect) return;
    const achievement = achievementNotificationQueue.shift();
    if (!achievement) return;
    achievementNotificationRunning = true;
    achievementUnlockedEffect.textContent = "実績解除";
    achievementUnlockedEffect.hidden = false;
    achievementUnlockedEffect.classList.remove("is-active");
    void achievementUnlockedEffect.offsetWidth;
    playSe("achievementUnlocked");
    achievementUnlockedEffect.classList.add("is-active");
    await wait(4200);
    achievementUnlockedEffect.classList.remove("is-active");
    achievementUnlockedEffect.hidden = true;
    achievementNotificationRunning = false;
    void playNextAchievementNotification();
  }

  function hasMaxVitalBonus(target, key) {
    return Number(target?.equipmentStatBonuses?.[key]) > 0
      || Number(target?.cardStatBonuses?.[key]) > 0
      || (key === "maxHp" && target?.cards?.deckSlots?.some(cardId => ["zodiac_taurus", "legendary_life_booster", "zodiac_virgo"].includes(cardId)))
      || (key === "maxSp" && target?.cards?.deckSlots?.some(cardId => ["legendary_mana_booster", "zodiac_virgo"].includes(cardId)));
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
      const maximum = key === "def" ? 60 : 30;
      const totalBeforePenalty = Math.min(maximum, base + equipment + Math.max(0, cards));
      const total = key === "def"
        ? Math.max(0, totalBeforePenalty + Math.min(0, cards))
        : Math.max(1, totalBeforePenalty + Math.min(0, cards));
      const row = document.createElement("div");
      row.className = "nde-stat-row";
      if (key === "def" && total > 30) row.classList.add(total >= 60 ? "is-def-maximum" : "is-def-overcap");
      const name = document.createElement("strong");
      name.textContent = label;
      const gauge = document.createElement("span");
      gauge.className = "nde-empty-gauge";
      gauge.setAttribute("aria-label", `${label} ${total}/${maximum}`);
      for (let index = 0; index < 30; index += 1) {
        const cell = document.createElement("i");
        if (total > 30 && index < total - 30) {
          cell.className = `is-overcap${total >= 60 ? " is-maximum" : ""}`;
          cell.style.borderColor = total >= 60 ? "#fff0a0" : "#3f9f63";
          cell.style.background = total >= 60 ? "#e6bd35" : "#43d86f";
          cell.style.boxShadow = total >= 60
            ? "0 0 7px rgba(255,218,75,.9)"
            : "0 0 4px rgba(81,255,137,.55)";
        }
        else if (index >= total && index < totalBeforePenalty) cell.className = "is-penalty";
        else if (index < Math.min(base, total)) cell.className = "is-base";
        else if (index < Math.min(base + equipment, total)) cell.className = "is-equipment";
        else if (index < total) cell.className = "is-card";
        gauge.append(cell);
      }
      const value = document.createElement("output");
      value.textContent = `${total} / ${maximum}`;
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
    if (item.fireFloorDamageImmunity) bonuses.push("火炎床無効");
    if (item.coldFloorDamageImmunity) bonuses.push("氷結床無効");
    bonuses.push(...Object.entries(item.statBonuses || {})
      .filter(([key]) => !item.hiddenStatBonusKeys?.includes(key))
      .map(([key, value]) => {
        if (key === "actionSkipResistance") {
          return `行動不能耐性${Math.round(Number(value) * 100)}%`;
        }
        const percentLabels = {
          magicDamageReduction: "魔法耐性",
          nonElementalMagicDamageReduction: "無属性呪文耐性",
          elementalMagicDamageReduction: "属性呪文耐性",
          fireSpellDamageBonus: "炎魔法威力",
          iceSpellDamageBonus: "氷魔法威力",
          fireDamageTakenBonus: "被炎ダメージ",
          iceDamageTakenBonus: "被氷ダメージ",
          attackSpellDamageBonus: "攻撃呪文威力",
          healingMiracleBonus: "回復奇蹟威力",
          passiveInstantDeathRateBonus: "一閃・暗殺術",
          poisonResistance: "毒・猛毒耐性",
          bleedingResistance: "出血耐性"
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

  function getRandomEncounterEnemyPartyData() {
    const forcedEnemyId = getForcedEnemyId(character, { depth: currentDepth });
    if (forcedEnemyId) return [getEnemyById(forcedEnemyId)].filter(Boolean);
    const enemyData = getRandomEncounterEnemy({ depth: currentDepth });
    if (enemyData.id === "maikaefer") return [enemyData];
    if (currentDepth >= 10 && currentDepth <= 19) {
      return getMagicRegionEncounterFormation({ depth: currentDepth, flags: character?.eventFlags });
    }
    if (currentDepth >= 20 && currentDepth <= 29) {
      return getTortureRegionEncounterFormation({ depth: currentDepth, flags: character?.eventFlags });
    }
    if (currentDepth >= 70 && currentDepth <= 79) {
      return getWaterRegionEncounterFormation({ depth: currentDepth, flags: character?.eventFlags });
    }
    if (currentDepth >= 80 && currentDepth <= 88) {
      return getCrystalRegionEncounterFormation({ depth: currentDepth, flags: character?.eventFlags });
    }
    if (currentDepth >= 90 && currentDepth <= 99) {
      return getDarkRegionEncounterFormation({ depth: currentDepth, flags: character?.eventFlags });
    }
    return Array.from({ length: getEnemyEncounterCount(enemyData) }, () => enemyData);
  }

  function prepareRandomEncounter() {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive() || currentDepth === 100) return false;
    const enemyPartyData = getRandomEncounterEnemyPartyData();
    const enemyData = enemyPartyData[0];
    const surprise = resolveSurprise({
      player: collectStats(getContextualCharacter()),
      enemyBaseRate: enemyData.surpriseRate,
      enemyMaximum: enemyData.surpriseRateMaximum,
      ignoreNormalCap: Boolean(enemyData.ignoreNormalSurpriseCap),
      forceAmbush: state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive
    });
    const ariesActive = hasCardEffect(character?.cards?.deckSlots, "zodiac_aries");
    pendingEncounter = {
      enemyData,
      enemyPartyData,
      ambush: surprise.ambush && !ariesActive,
      surpriseRate: surprise.rate,
      concealed: state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive
    };
    if (pendingEncounter.ambush) startAmbushEncounterNotice();
    else startRandomEncounterNotice();
    return true;
  }

  function beginRandomBattle() {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    if (!state.autoWalkerActive) cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    const encounter = pendingEncounter;
    pendingEncounter = null;
    const enemyPartyData = encounter?.enemyPartyData || getRandomEncounterEnemyPartyData();
    const enemyData = encounter?.enemyData || enemyPartyData[0];
    const encounterEnemies = enemyPartyData.length > 1
      ? enemyPartyData.map((member, index) => ({ ...createEnemyCombatant(member), formationIndex: index }))
      : null;
    const enemy = encounterEnemies?.[0] || createEnemyCombatant(enemyData);
    startBgm(selectBattleBgm(enemyData));
    const started = startBattle(enemy, {
      playStartSe: false,
      ambush: Boolean(encounter?.ambush),
      concealed: Boolean(encounter?.concealed),
      enemies: encounterEnemies,
      targetIndex: 0
    });
    if (started) recordCompendiumEncounter(encounterEnemies || [enemy]);
    if (!started) {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
      state.autoReturnPaused = false;
      if (state.autoWalkerActive) continueAutoReturn();
    }
    return started;
  }

  function beginRareEnemyBattle(enemyId) {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const baseEnemy = getEnemyById(enemyId);
    if (!baseEnemy) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    pendingEncounter = null;
    const enemyData = enemyId === "maikaefer"
      ? { ...baseEnemy, level: currentDepth, experienceReward: currentDepth * 1000 }
      : baseEnemy;
    const enemy = createEnemyCombatant(enemyData);
    activeRareRoomEncounterId = enemyId;
    startBgm(selectBattleBgm(enemyData));
    const started = startBattle(enemy, {
      playStartSe: true,
      ambush: false,
      concealed: state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive
    });
    if (started) recordCompendiumEncounter([enemy]);
    if (!started) {
      activeRareRoomEncounterId = null;
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function beginQuestEnemyBattle(enemyId, count = 1) {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const enemyData = getEnemyById(enemyId);
    if (!enemyData) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    const enemies = Array.from({ length: Math.max(1, count) }, (_, index) => ({
      ...createEnemyCombatant(enemyData), formationIndex: index
    }));
    activeRareRoomEncounterId = "quest_029_wasp_hive";
    startBgm(selectBattleBgm(enemyData));
    const started = startBattle(enemies[0], { playStartSe: true, enemies, targetIndex: 0 });
    if (started) recordCompendiumEncounter(enemies);
    if (!started) {
      activeRareRoomEncounterId = null;
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function isB100GauntletBossId(bossId) {
    return currentDepth === 100 && B100_GAUNTLET_BOSS_IDS.includes(bossId);
  }

  function isCurrentBossDefeated(bossId) {
    return isB100GauntletBossId(bossId)
      ? b100GauntletDefeatedThisExploration.has(bossId)
      : isBossDefeated(character, bossId);
  }

  function beginBossBattle(bossId) {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const boss = getBossById(bossId);
    if (!boss || isCurrentBossDefeated(boss.id)) return false;
    const summonKeyItemId = boss.room?.summonKeyItemId;
    const alreadySummoned = summonKeyItemId && character.eventFlags?.boss_b89f_summoned;
    if (currentDepth === 89 && summonKeyItemId && !alreadySummoned) {
      if (!hasKeyItem(character.keyItems, summonKeyItemId)) {
        say("輝く多面体がなければ、異界の存在を呼び出すことはできない。");
        setPlayerInputEnabled(true);
        return false;
      }
      const consumed = consumeKeyItem(character.keyItems, summonKeyItemId);
      if (!consumed.consumed) return false;
      character = {
        ...character,
        keyItems: consumed.keyItems,
        eventFlags: { ...(character.eventFlags || {}), boss_b89f_summoned: true }
      };
      updateCharacterUi();
      saveGame();
    }
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    pendingEncounter = null;
    startBgm(selectBattleBgm(boss));
    const lightbringerActive = boss.id === "seelenwuerger_b99f"
      && hasKeyItem(character.keyItems, "lichtbringer");
    const bossCombatant = createBossCombatant(boss, { lightbringerActive });
    if (isB100GauntletBossId(boss.id) && character?.eventFlags?.[getB100GauntletFlag(boss.id)]) {
      bossCombatant.experienceReward = 0;
    }
    const encounterEnemies = Array.isArray(boss.encounterEnemyIds)
      ? boss.encounterEnemyIds.map((enemyId, index) => {
        const definition = getBossById(enemyId) || getEnemyById(enemyId);
        const combatant = getBossById(enemyId) ? createBossCombatant(definition) : createEnemyCombatant(definition);
        combatant.formationIndex = index;
        return combatant;
      })
      : null;
    const started = startBattle(bossCombatant, {
      playStartSe: true,
      ambush: false,
      concealed: state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive,
      phantom: isB100GauntletBossId(boss.id),
      enemies: encounterEnemies,
      targetIndex: encounterEnemies ? Math.max(0, encounterEnemies.findIndex(enemy => enemy.id === bossId)) : 0,
      scriptedBattleType: currentDepth === 79 && bossId === "jirene_b79f" && !character?.eventFlags?.jirene_scripted_defeat_seen
        ? "jirene_first_encounter"
        : ""
    });
    if (started) recordCompendiumEncounter(encounterEnemies || [bossCombatant]);
    if (!started) {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function beginMimicBattle() {
    if (endingSequenceActive) return false;
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    const enemyData = getEnemyById("mimic");
    if (!enemyData) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    pendingEncounter = null;
    startBgm(selectBattleBgm(enemyData));
    const mimic = createEnemyCombatant(scaleBlackChestMimic(enemyData, currentDepth));
    const started = startBattle(mimic, {
      playStartSe: true,
      ambush: false,
      concealed: state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive
    });
    if (started) recordCompendiumEncounter([mimic]);
    if (!started) {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
    return started;
  }

  function recordCompendiumEncounter(combatants) {
    if (!character) return;
    character = {
      ...character,
      compendium: recordMonsterEncounter(character.compendium, (combatants || []).map(combatant => combatant?.id))
    };
  }

  function selectDungeonBgm() {
    if (currentDepth >= 50 && currentDepth <= 59) return "jungleZone";
    if (currentDepth >= 60 && currentDepth <= 69) return "desertZone";
    return currentDepth >= 101 ? "deepDungeon" : "dungeon";
  }

  function selectBattleBgm(enemyData) {
    if (enemyData?.battleBgmKey) return enemyData.battleBgmKey;
    if (["erzdaemonin_b100f", "amayenak_b100f"].includes(enemyData?.id)) return "finalBoss";
    if (enemyData?.isEventBoss || enemyData?.bossKind === "event") return "eventBoss";
    if (enemyData?.isBoss) return "floorBoss";
    return "normalBattle";
  }

  function updateCharacterFromBattle(changes) {
    if (!character) return;
    const previousHerbicideUses = Math.max(0, Math.floor(Number(character.herbicideTrialUses) || 0));
    Object.assign(character, changes);
    const nextHerbicideUses = Math.max(previousHerbicideUses, Math.floor(Number(character.herbicideTrialUses) || 0));
    if (nextHerbicideUses > previousHerbicideUses) {
      character = recordCustomQuestProgress(character, "guild_020", nextHerbicideUses - previousHerbicideUses);
    }
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
    character.condition = getConditionLabel(character.statuses);
    updateCharacterUi();
    showPoisonStepDamage(damage);
    return damage;
  }

  function applyDungeonDeadlyPoisonStep() {
    if (!character || worldLocation !== "dungeon" || !hasCharacterStatus(character, "deadly_poison")) return 0;
    const damage = getDeadlyPoisonStepDamage({ currentHp: character.hp, maxHp: character.maxHp });
    if (damage <= 0) return 0;
    character.hp -= damage;
    character.alive = true;
    character.condition = getConditionLabel(character.statuses);
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

  function applyCrystalFloorStep() {
    if (!character || worldLocation !== "dungeon") return 0;
    const result = applyCrystalFloorSpStep(character, currentDepth);
    character = result.character;
    if (result.drained > 0) {
      updateCharacterUi();
      showStepSpDamage(result.drained);
    }
    return result.drained;
  }

  function applyColdFloorStep() {
    if (!character || worldLocation !== "dungeon") return 0;
    const requested = getColdFloorStepDamage(character, currentDepth);
    const damage = getNonlethalPoisonDamage(character.hp, requested);
    if (damage <= 0) return 0;
    character.hp -= damage;
    character.alive = true;
    updateCharacterUi();
    showPoisonStepDamage(damage);
    return damage;
  }

  function currentCondition(target) {
    return getConditionLabel(target?.statuses);
  }

  function showPoisonStepDamage(damage) {
    const layer = document.getElementById("poisonStepDamage");
    if (!layer || damage <= 0) return;
    const popup = document.createElement("i");
    popup.textContent = `－${damage}`;
    layer.append(popup);
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
  }

  function showStepSpDamage(amount) {
    const layer = document.getElementById("crystalStepSpDamage");
    if (!layer || amount <= 0) return;
    const popup = document.createElement("i");
    popup.className = "is-sp-damage";
    popup.textContent = `SP－${amount}`;
    layer.append(popup);
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
  }

  function showStepHpRecovery(amount) {
    const layer = document.getElementById("poisonStepDamage");
    if (!layer || amount <= 0) return;
    const popup = document.createElement("i");
    popup.className = "is-healing";
    popup.textContent = `＋${amount}`;
    layer.append(popup);
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
  }

  function showStepSpRecovery(amount) {
    const layer = document.getElementById("crystalStepSpDamage");
    if (!layer || amount <= 0) return;
    const popup = document.createElement("i");
    popup.className = "is-healing";
    popup.textContent = `＋${amount}`;
    layer.append(popup);
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
  }
  function handleDungeonStep() {
    applyDungeonPoisonStep();
    applyDungeonDeadlyPoisonStep();
    applyDungeonBleedingStep();
    applyFireFloorStep();
    applyColdFloorStep();
    applyCrystalFloorStep();
    if (!character) return;
    const hpBeforePassives = character.hp;
    const spBeforePassives = character.sp;
    character = recordNpcExpeditionDepth(character, currentDepth);
    character = applyNpcExplorationPassives(character);
    character.cardPassiveStepCount = (Math.max(0, Math.floor(Number(character.cardPassiveStepCount) || 0)) + 1) % 5;
    if (character.cardPassiveStepCount === 0) {
      if (hasCardEffect(character.cards?.deckSlots, "step_hp_recovery")) character.hp = Math.min(character.maxHp, character.hp + 1);
      if (hasCardEffect(character.cards?.deckSlots, "step_sp_recovery")) character.sp = Math.min(character.maxSp, character.sp + 1);
    }
    showStepHpRecovery(character.hp - hpBeforePassives);
    showStepSpRecovery(character.sp - spBeforePassives);
    character.condition = currentCondition(character);
    character = recordFloorExploration(character, { depth: currentDepth, explored });
    updateCharacterUi();
  }

  function resolveCurrentTreasureTrap(treasureType, trapId) {
    if (!character) return { message: "" };
    const result = resolveTreasureTrap({ character: getContextualCharacter(), treasureType, trapId });
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
    if (treasureType !== "red" && treasureType !== "black" && treasureType !== "purple" && treasureType !== "gold") return { message: "中には何も入っていなかった！" };
    const message = addRolledLoot(
      treasureType === "black"
        ? rollEnemyDrop({ dropProfile: "blackChest", depth: currentDepth, job: character?.job })
        : treasureType === "gold"
          ? rollGoldChestLoot(character)
        : treasureType === "purple"
          ? rollPurpleChestLoot(Math.random, currentDepth)
          : rollRedChestLoot(Math.random, currentDepth)
    );
    updateCharacterUi();
    saveGame();
    return { message: message || (treasureType === "gold" ? "金色の宝箱は空だった。" : message) };
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

  function purchaseTownItem(itemId, amount = 1, { donation = false } = {}) {
    if (!character) return { accepted: false, reason: "noCharacter" };
    const result = purchaseItem(character, itemId, { amount });
    if (!result.accepted) return result;
    character = result.character;
    character.adventureStats = donation
      ? recordTempleDonation(character.adventureStats, result.cost)
      : recordShopPurchase(character.adventureStats, result.cost);
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
    if (isHelenHiddenEventPending(character)) {
      return {
        dialogue: [
          "ヘレン：依頼を引き受けてくれてありがと。この間の件もそうだけど、あなたが引き受けてくれてよかった…。\n＊Aボタンで次へ",
          "ヘレン：今回手に入れてもらった素材はね《奈落麝香》を精製する為に必要なの。…え？麝香って何かって？\n＊Aボタンで次へ",
          "ヘレン：《奈落麝香》は香水の原料になるのだけれど、希少でなかなか手に入らないのよ。でも、どうしても欲しかった。\nあたし、他の人よりも匂いがキツくて…。これまで色々な香水を試してはみたの。でも、どれもイマイチだった…。\n＊Aボタンで次へ",
          "ヘレン：そんな時《奈落麝香》の噂を聞いて、どうしても欲しくなったのよ。…とにかくありがとう。また何かあったら\nあなたにお願いするわ。これ、あたしの気持ちよ。"
        ],
        completionFlag: HELEN_HIDDEN_EVENT_SEEN_FLAG
      };
    }
    if (character?.eventFlags?.strong_herbicide_shop_reward_pending) {
      const granted = grantItemWithOverflow(character, "strong_herbicide", 10);
      character = {
        ...granted.character,
        eventFlags: { ...(granted.character.eventFlags || {}), strong_herbicide_shop_reward_pending: false }
      };
      updateCharacterUi();
      saveGame();
      const herbicideAmount = Math.max(0, (Number(granted.gained) || 0) + (Number(granted.stored) || 0));
      if (herbicideAmount > 0) setTimeout(() => showNamedItemGetEffect(
        [getItem("strong_herbicide")?.name || "強力除草剤"],
        { important: true, amounts: [herbicideAmount] }
      ), 0);
      return { message: "ヘレン：依頼を受けてくれてありがと。助かったわ。これを受け取って。\n「強力除草剤」×10個を手に入れた！" };
    }
    const result = acknowledgeShopStockAnnouncement(character);
    if (!result.announced) return null;
    character = result.character;
    saveGame();
    return { message: "女主人ヘレン：あら、いらっしゃい。ちょうど新しい品を仕入れたところなの。見ていかない？" };
  }

  function viewShopCategory(category) {
    const newStockIds = getShopStockState(character).newStockIds?.[category] || [];
    character = markShopCategorySeen(character, category);
    saveGame();
    return newStockIds;
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

  function withdrawTownEquipment(instanceId) {
    const result = withdrawEquipmentFromWarehouse(character, instanceId);
    if (!result.accepted) return result;
    character = normalizeCharacter(result.character);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function depositTownEquipment(instanceId) {
    const result = depositEquipmentInWarehouse(character, instanceId);
    if (!result.accepted) return result;
    character = normalizeCharacter(result.character);
    updateCharacterUi();
    saveGame();
    return { ...result, character };
  }

  function hasCharacterStatus(target, statusId) {
    return (target?.statuses || []).some(status => (status.statusId || status.id) === statusId);
  }

  async function useFieldSkill(skillId) {
    if (["staff_light", "grain_glow"].includes(skillId)
      && isForcedTorchZeroFloor(currentDepth)
      && !hasKeyItem(character?.keyItems, "lichtbringer")) {
      say("この区域では、たいまつの光を補充できない。");
      return { accepted: false, reason: "forcedTorchZero" };
    }
    const autoReturnAvailability = skillId === "full_sprint"
      ? getAutoReturnAvailability()
      : null;
    const result = resolveFieldSkill({
      character,
      skillId,
      context: worldLocation,
      torchFuel: state.torchFuel,
      presenceIncreaseReduction: getPresenceIncreaseReduction(),
      autoReturnAvailability
    });
    if (!result.accepted) return result;
    if (result.environment?.startAutoWalker) {
      closeCampMenu("main");
      const started = startAutoReturn({
        persistentThroughBattle: true,
        availability: autoReturnAvailability
      });
      if (!started) return { accepted: false, reason: "noPath" };
    }
    character = result.character;
    if (Number.isFinite(result.environment?.torchFuel)) state.torchFuel = result.environment.torchFuel;
    if (Number.isFinite(result.environment?.presenceIncreaseReduction)) {
      setPresenceIncreaseReduction(result.environment.presenceIncreaseReduction);
    }
    updateHud();
    updateCharacterUi();
    say(result.environment?.startAutoWalker
      ? `${result.skill.name}を使い、踏破済みの道をたどって上り階段へ向かう。`
      : result.skill.actionType === "sacrificialCure"
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
    if (context === "dungeon"
      && itemId === "guiding_torch"
      && isForcedTorchZeroFloor(currentDepth)
      && !hasKeyItem(character?.keyItems, "lichtbringer")) {
      say("この区域では、たいまつの光を補充できない。");
      return { accepted: false, reason: "forcedTorchZero" };
    }
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
    if (character && battle?.player) {
      updateCharacterFromBattle(createPersistentBattlePlayerChanges(battle.player));
    }
    const questWaspHiveVictory = activeRareRoomEncounterId === "quest_029_wasp_hive";
    const defeatedEnemyId = battle?.defeatedEnemyId || battle?.encounterBossId || battle?.enemy?.id || "";
    const startMichaelaRestoration = defeatedEnemyId === "amayenak_b100f"
      && !character?.eventFlags?.ending_story_completed;
    activeRareRoomEncounterId = null;
    startBgm(selectDungeonBgm());
    const rewardEnemies = Array.isArray(battle?.enemies) ? battle.enemies : [battle?.enemy];
    const baseReward = rewardEnemies.reduce(
      (total, enemy) => total + Math.max(0, Math.floor(Number(enemy?.experienceReward) || 0)),
      0
    );
    const reward = calculateBattleExperienceReward(character, baseReward);
    let bossRewardMessage = "";
    const nextBoss = battle?.enemy?.nextBossId ? getBossById(battle.enemy.nextBossId) : null;
    if (character && battle?.enemy?.isDungeonObstacle) {
      removeBossAt(state.gridX, state.gridY);
    } else if (character && battle?.enemy?.isBoss) {
      if (battle.enemy.id === "lingering_ghost_b2f") {
        character = {
          ...character,
          eventFlags: {
            ...(character.eventFlags || {}),
            lingering_ghost_b2f_defeated_once: true
          }
        };
      }
      const b100Rematch = isB100GauntletBossId(battle.enemy.id);
      const victory = b100Rematch
        ? {
            character: {
              ...character,
              eventFlags: {
                ...(character.eventFlags || {}),
                [getB100GauntletFlag(battle.enemy.id)]: true
              }
            },
            accepted: true,
            reward: { type: "none" }
          }
        : applyBossVictory(character, battle.enemy.id);
      if (victory.accepted) {
        character = victory.character;
        if (startMichaelaRestoration) {
          const truthStaff = grantKeyItem(character.keyItems, "truth_staff");
          character = {
            ...character,
            keyItems: truthStaff.keyItems,
            eventFlags: {
              ...(character.eventFlags || {}),
              truth_staff_obtained: true
            }
          };
        }
        if (b100Rematch) b100GauntletDefeatedThisExploration.add(battle.enemy.id);
        character = recordBossDefeat(character, battle.enemy.id, currentDepth);
        if (!b100Rematch && battle.enemy.id === "sphinx_b69f") {
          character = {
            ...character,
            eventFlags: {
              ...(character.eventFlags || {}),
              sphinx_b69f_defeated: true,
              sphinx_b69f_route_fixed: true
            }
          };
        }
        if (b100Rematch) removeBossAt(state.gridX, state.gridY);
        else if (bossLeavesRemains(battle.enemy)) markBossDefeatedAt(state.gridX, state.gridY, battle.enemy.id);
        else removeBossAt(state.gridX, state.gridY);
        if (victory.reward?.type === "routeCard" && battle.enemy.id === "sphinx_b69f") {
          const cardId = "legendary_sphinx_majesty";
          const cardReward = grantCard(character.cards, cardId, 1, character.deckCost);
          character = { ...character, cards: cardReward.cards };
          const card = getCardById(cardId);
          if (cardReward.gained > 0) setTimeout(() => showCardGetEffect(cardId, { seId: "itemGet" }), 120);
          bossRewardMessage = `\nスピンクス「小さき者よ…。力にのみ頼るか…。愚かな…！」\nLカード「${card?.nameJa || cardId}」を手に入れた！`;
        } else if (victory.reward?.type === "routeCard" && battle.enemy.id === "jabberwock_event_boss") {
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
          if (cardReward.gained > 0) {
            setTimeout(() => showCardGetEffect(victory.reward.cardId, { seId: "itemGet" }), 120);
          }
          bossRewardMessage = cardReward.gained > 0
            ? `\nZカード「${card?.nameJa || victory.reward.cardId}」を手に入れた！`
            : `\nZカード「${card?.nameJa || victory.reward.cardId}」はすでに所持している。`;
        } else if (victory.reward?.type === "equipment" && victory.reward.equipmentId) {
          const granted = grantEquipmentInstance(character, victory.reward.equipmentId, victory.reward.slot || "rightArmId");
          if (granted.accepted) {
            character = granted.character;
            const equipment = getEquipmentInstanceDefinition(granted.instance);
            bossRewardMessage = `\n${equipment?.name || victory.reward.equipmentId}を手に入れた！`;
            if (battle.enemy.id === "jirene_b79f") {
              setTimeout(() => showNamedItemGetEffect([equipment?.name || victory.reward.equipmentId], { important: true }), 0);
            }
          }
        } else if (victory.reward?.type === "item" && victory.reward.itemId) {
          const amount = Math.max(1, Math.floor(Number(victory.reward.amount) || 1));
          const granted = grantItemWithOverflow(character, victory.reward.itemId, amount);
          character = granted.character;
          const item = getItem(victory.reward.itemId);
          bossRewardMessage = `\n${item?.name || victory.reward.itemId}を手に入れた！`;
        } else if (victory.reward?.type === "keyItem" && victory.reward.keyItemId) {
          const granted = grantKeyItem(character.keyItems, victory.reward.keyItemId);
          character = { ...character, keyItems: granted.keyItems };
          const keyItem = getKeyItem(victory.reward.keyItemId);
          bossRewardMessage = granted.gained > 0
            ? `\n${keyItem?.name || victory.reward.keyItemId}を手に入れた！`
            : "";
          if (granted.gained > 0) setTimeout(() => showNamedItemGetEffect([keyItem?.name || victory.reward.keyItemId], { important: true }), 0);
        }
        if (battle.enemy.questProgressId) {
          character = recordCustomQuestProgress(character, battle.enemy.questProgressId, 1);
        }
        if (b100Rematch && B100_GAUNTLET_BOSS_IDS.every(id => b100GauntletDefeatedThisExploration.has(id))) {
          refreshB100FinalBoss(character.eventFlags, [...b100GauntletDefeatedThisExploration]);
          bossRewardMessage = "\n十の守護者をすべて退けた。迷宮最奥で、新たな気配が目覚める――！";
        }
      }
    }
    const defeatQuestProgressBefore = character ? getActiveDefeatQuestProgress(character) : [];
    if (character && battle?.enemy?.id) {
      const defeatedEnemies = battle.enemy.isBoss ? [battle.enemy] : rewardEnemies;
      for (const defeatedEnemy of defeatedEnemies) {
        if (defeatedEnemy?.id) character = recordEnemyDefeat(character, defeatedEnemy.id, currentDepth);
      }
      for (const defeatedEnemy of rewardEnemies.filter(enemy => enemy?.id && Number(enemy.hp) <= 0)) {
        character = {
          ...character,
          compendium: recordCompendiumMonsterDefeat(character.compendium, defeatedEnemy.id)
        };
      }
    }
    const defeatQuestProgressMessage = character
      ? formatDefeatQuestProgressUpdates(defeatQuestProgressBefore, getActiveDefeatQuestProgress(character))
        .map(line => `\n${line}`).join("")
      : "";
    let questCollectionMessage = "";
    if (character && questWaspHiveVictory) {
      const before = Math.min(15, getQuestProgress(character, "guild_029").progress);
      character = recordQuestBeeswax(character, rewardEnemies.filter(enemy => enemy?.id === "wasp" && enemy.hp <= 0).length);
      const after = Math.min(15, getQuestProgress(character, "guild_029").progress);
      if (after > before) questCollectionMessage = `\n依頼用の蜜蝋を${after - before}個採取した。（${after}/15）`;
    }
    if (character && reward > 0) Object.assign(character, awardBattleExperience(character, reward));
    const fixedGoldPerDefeat = calculateFixedGoldPerDefeat(rewardEnemies);

    const drop = fixedGoldPerDefeat > 0 ? { kind: "gold", amount: fixedGoldPerDefeat } : rollEnemyDrop(battle?.enemy);
    if (character && drop?.itemId && battle?.enemy?.id) {
      character = {
        ...character,
        compendium: recordMonsterDrop(character.compendium, battle.enemy.id, drop.itemId)
      };
    }
    const dropMessage = drop.kind === "redChest" ? "" : addRolledLoot(drop);
    const chainedBattleMessage = nextBoss && !isBossDefeated(character, nextBoss)
      ? `\nしかし、その奥から${nextBoss.name}が姿を現した――！`
      : "";
    const victoryMessage = `${reward > 0 ? `戦闘に勝利した。${reward}EXPを獲得した。` : "戦闘に勝利した。"}${bossRewardMessage}${questCollectionMessage}${dropMessage ? `\n${dropMessage}` : ""}${defeatQuestProgressMessage}${chainedBattleMessage}`;
    resetPresence();
    if (startMichaelaRestoration) {
      setPlayerInputEnabled(false);
      state.autoReturnPaused = true;
      say(victoryMessage);
      updateCharacterUi();
      saveGame();
      void runMichaelaRestoration();
      return;
    }
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
    if (nextBoss && !isBossDefeated(character, nextBoss)) {
      setPlayerInputEnabled(false);
      window.setTimeout(() => {
        say(nextBoss.event?.start || `${nextBoss.name}が現れた！`);
        window.setTimeout(() => beginBossBattle(nextBoss.id), 1800);
      }, 900);
    }
  }

  async function runMichaelaRestoration() {
    if (character?.eventFlags?.michaela_restored) return runMainEnding();
    if (!character || character.eventFlags?.michaela_restored
      || michaelaRestorationStarting || michaelaRestorationController.isActive()) return false;
    michaelaRestorationStarting = true;
    setEndingInputLocked(true);
    cancelAutoReturn(false);
    closeCampMenu();
    setPlayerInputEnabled(false);
    try {
      stopBgm();
      showNamedItemGetEffect(["真実の杖"], { important: true });
      say("「真実の杖」を手に入れた！");
      if (!await waitForEnding(3500)) return false;
      return await michaelaRestorationController.start();
    } finally {
      michaelaRestorationStarting = false;
    }
  }

  async function completeMichaelaRestoration() {
    if (!character) return false;
    character = {
      ...character,
      eventFlags: {
        ...(character.eventFlags || {}),
        truth_staff_obtained: true,
        michaela_restored: true
      }
    };
    await playSe("fixedWarp");
    const returnPoint = cells.flat().find(cell => cell.fixedReturnPoint);
    if (returnPoint) applyFixedFloorWarp({ to: { x: returnPoint.x, y: returnPoint.y }, facing: "W" });
    setPlayerInputEnabled(false);
    state.autoReturnPaused = true;
    updateCharacterUi();
    saveGame();
    await runMainEnding();
    return true;
  }

  async function runMainEnding({ replay = false } = {}) {
    if (endingController.isActive() || mainEndingStarting) return false;
    const mode = getEndingResumeMode(character);
    if (!replay && !["arrival", "credits"].includes(mode)) return false;
    if (replay && (!character?.eventFlags?.ending_credits_watched || worldLocation !== "town")) return false;
    mainEndingStarting = true;
    setEndingInputLocked(true);
    setPlayerInputEnabled(false);
    cancelAutoReturn(false);
    state.autoReturnPaused = true;
    state.overlayEvent = null;
    pendingEncounter = null;
    closeCampMenu();
    stopBgm();
    stopLoopSe("townAmbience");
    if (mode === "arrival" && worldLocation === "dungeon") {
      const entrance = cells.flat().find(cell => cell.fixedReturnPoint);
      if (currentDepth === 100 && entrance) applyFixedFloorWarp({ to: { x: entrance.x, y: entrance.y }, facing: "W" });
      say("");
      if (!await waitForEnding(1500)) { mainEndingStarting = false; return false; }
      returnToTown({ ending: true });
    } else {
      worldLocation = "town";
      openTown({ registrationRequired: false });
    }
    try {
      await endingController.start({ arrival: !replay && mode === "arrival", isReplay: replay });
      return true;
    } finally { mainEndingStarting = false; }
  }

  async function finishBattleDefeat(battle) {
    activeRareRoomEncounterId = null;
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

  async function finishJireneScriptedDefeat() {
    activeRareRoomEncounterId = null;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    try {
      await runSceneTransition({
        darkenMs: 900,
        holdMs: 500,
        revealMs: 900,
        onDark: () => {
          const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
          if (stairsUp) {
            state.gridX = stairsUp.x;
            state.gridY = stairsUp.y;
            state.x = stairsUp.x + 0.5;
            state.y = stairsUp.y + 0.5;
            explored[stairsUp.y][stairsUp.x] = true;
          }
          state.anim = null;
          state.autoReturnPaused = false;
          state.bossEncounterOrigin = null;
          character = {
            ...character,
            alive: true,
            eventFlags: {
              ...(character?.eventFlags || {}),
              jirene_encountered: true,
              jirene_scripted_defeat_seen: true
            }
          };
          resetPresence();
          updateCharacterUi();
          updateHud();
          saveGame();
        }
      });
      startOverlayEvent({
        type: "jireneAwakening",
        imageId: "",
        showOverlay: false,
        message: "ここは…。確か、パルテノペーが…歌声が…よく思い出せない…。ひとまず町に帰って、酒場でゆっくりするか…。\n＊Aボタン：次へ"
      });
    } finally {
      startBgm(selectDungeonBgm());
      setPlayerInputEnabled(true);
    }
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
    let experienceProtectionName = "女神の恩寵";
    let bag = null;
    let settled = null;
    if (character) {
      character = invalidateMarathonChallenge(character);
      character = invalidateLongMarchChallenge(character);
      const carriedExperience = Math.max(
        0,
        Math.floor(Number(character.carriedExperience) || 0)
      );
      const preserveExperience = hasCardEffect(
        character.cards?.deckSlots,
        "preserve_experience_on_defeat"
      );
      experienceProtectionName = hasCardEffect(
        character.cards?.deckSlots,
        "goddess_mercy"
      ) ? "女神の慈愛" : "女神の恩寵";
      Object.assign(character, resolveDungeonDefeat(character, { preserveExperience }));
      bag = structuredClone(character.lootBag);
      settled = settleLootBag(character);
      character = settled.character;
      lostExperience = preserveExperience ? 0 : carriedExperience;
      preservedExperience = preserveExperience ? carriedExperience : 0;
      character = recordFloorExploration(character, { depth: 0, explored: [] });
      character = beginNpcRenewal(character, `defeat-${Date.now()}`);
    }
    worldLocation = "town";
    clearPresenceIncreaseReduction();
    state.treasureCompassActive = false;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    templeRevivalJinglePending = true;
    const experienceMessage = preservedExperience > 0
      ? `\n${experienceProtectionName}により${preservedExperience}EXPを守った。`
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
    window.setTimeout(() => openPendingNpcRenewal(), 0);
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
    revivalGoddess.src = selectRevivalGoddessImage();
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

  function finishBattleEscape(battle) {
    const escapedRareRoomEnemy = battle?.outcome === "enemyEscaped"
      && activeRareRoomEncounterId === battle.enemy?.id;
    activeRareRoomEncounterId = null;
    if (battle?.outcome === "escaped" && battle.enemy?.id === "todes_scorpio_b64f") {
      escapedSpecialBossesThisExploration.add(battle.enemy.id);
    }
    startBgm(selectDungeonBgm());
    resetPresence();
    setPlayerInputEnabled(true);
    const cellBossId = cells[state.gridY]?.[state.gridX]?.bossId;
    if (["giant_vine_obstacle", "fleischfresser_b59f"].includes(cellBossId) && state.bossEncounterOrigin) {
      state.gridX = state.bossEncounterOrigin.x;
      state.gridY = state.bossEncounterOrigin.y;
      state.x = state.gridX + 0.5;
      state.y = state.gridY + 0.5;
    }
    state.autoReturnPaused = false;
    if (state.autoWalkerActive) window.setTimeout(continueAutoReturn, 0);
    say(battle?.outcome === "enemyEscaped"
      ? escapedRareRoomEnemy
        ? "マイケーファーは勝ち誇るように羽音を響かせ、闇へ消えた……。"
        : `${battle.enemy?.name || "敵"}は逃げ去った。`
      : "戦闘から逃げ切った。");
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
        say(`${templeKeeperName()}：治療の必要はないようですね。`);
        return;
      }
      if (treatment.reason === "insufficientGold") {
        say(`${templeKeeperName()}：状態異常を治療するには${treatment.fee}Gの寄進が必要です。`);
        return;
      }
      character = treatment.character;
      character.adventureStats = recordTempleDonation(character.adventureStats, treatment.fee);
      updateCharacterUi();
      say(`${templeKeeperName()}：${treatment.fee}Gの寄進を受け取りました。傷と穢れは癒やされました。`);
      playSe("heal");
      saveGame();
      return;
    }
    stopBgm();
    Object.assign(character, createTempleRevival(character));
    updateCharacterUi();
    say(`${templeKeeperName()}：女神様へ祈りが届きました…！迷える魂よ、今一度目覚めてください！`);
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
        escapedSpecialBossesThisExploration.clear();
        b100GauntletDefeatedThisExploration.clear();
        currentDepth = 1;
        character = startMarathonChallenge(character);
        character = startLongMarchChallenge(character);
        setDungeonColors(resolveCurrentFloorTheme());
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
    if (!character.firstDungeonTutorialSeen) await showFirstDungeonTutorial();
    else setPlayerInputEnabled(true);
  }

  async function enterFloorFromTransfer(depth = 10) {
    const destination = Math.max(1, Math.floor(Number(depth) || 0));
    if (!isTransferDestinationUnlocked(character, destination)) return false;
    setPlayerInputEnabled(false);
    await runSceneTransition({
      playAudio: () => playSeSequence("stairs", 3),
      onDark: () => {
        escapedSpecialBossesThisExploration.clear();
        b100GauntletDefeatedThisExploration.clear();
        currentDepth = destination;
        character = invalidateMarathonChallenge(character);
        character = invalidateLongMarchChallenge(character);
        setDungeonColors(resolveCurrentFloorTheme());
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
    startFloorLapNotice(destination);
    setPlayerInputEnabled(true);
    return true;
  }

  async function runSceneTransition({
    showEnteringTitle = false,
    playAudio = () => Promise.resolve(),
    onDark = () => {},
    darkenMs = 2700,
    holdMs = 120,
    revealMs = 700
  } = {}) {
    if (sceneTransitionRunning) return false;
    sceneTransitionRunning = true;
    try {
      sceneTransition.hidden = false;
      sceneTransition.classList.remove("is-black", "is-revealing", "is-inn-stay", "is-defeat");
      sceneTransition.classList.add("is-running");
      sceneTransition.style.transitionDuration = `${darkenMs}ms`;
      document.body.classList.add("scene-transition-active");
      sceneTransitionTitle.hidden = !showEnteringTitle;
      void sceneTransition.offsetWidth;

      const audioPromise = Promise.resolve().then(playAudio).catch(() => false);
      requestAnimationFrame(() => sceneTransition.classList.add("is-black"));
      await Promise.all([wait(darkenMs), audioPromise]);
      await onDark();
      await wait(holdMs);

      sceneTransitionTitle.hidden = true;
      sceneTransition.style.transitionDuration = `${revealMs}ms`;
      sceneTransition.classList.add("is-revealing");
      sceneTransition.classList.remove("is-black");
      await wait(revealMs);
      return true;
    } finally {
      sceneTransitionTitle.hidden = true;
      sceneTransition.classList.remove("is-black", "is-running", "is-revealing");
      sceneTransition.style.removeProperty("transition-duration");
      sceneTransition.hidden = true;
      document.body.classList.remove("scene-transition-active");
      sceneTransitionRunning = false;
    }
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  function formatLearnedSkills(skillIds = []) {
    return skillIds.map(id => getSkill(id)?.name).filter(Boolean).map(name => `\n${name}を習得した！`).join("");
  }

  function returnToTown({ ending = false } = {}) {
    escapedSpecialBossesThisExploration.clear();
    b100GauntletDefeatedThisExploration.clear();
    cancelRapidCurrentTransition();
    const returnFloor = currentDepth;
    let bag = null;
    let settled = null;
    if (character) {
      character = invalidateMarathonChallenge(character);
      character = invalidateLongMarchChallenge(character);
      character.pendingExperienceSettlement = createDepthReturnSettlement(
        character,
        returnFloor
      );
      bag = structuredClone(character.lootBag);
      settled = settleLootBag(character);
      character = settled.character;
      character = recordFloorExploration(character, { depth: 0, explored: [] });
      character = beginNpcRenewal(character, `return-${Date.now()}`);
      updateCharacterUi();
    }
    worldLocation = "town";
    clearPresenceIncreaseReduction();
    state.treasureCompassActive = false;
    stopBgm();
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    openTown(ending ? { registrationRequired: false } : { registrationRequired: !character, facilityId: "dungeon", mode: "dungeonEntrance" });
    if (ending) return;
    if (character && bagHasLoot(bag)) {
      showLootIdentification(bag, settled, { onClose: () => openPendingNpcRenewal() });
    } else {
      window.setTimeout(() => openPendingNpcRenewal(), 0);
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
      className: getLotEquipmentHighlightClass(instance, getEquipmentItem(instance.equipmentId, instance.slot))
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
    if (!character?.lootBagTutorialSeen) startLootBagTutorial();
  }

  function updateLootBagTutorialTarget() {
    if (!lootBagTutorialActive || !lootBagTutorial || !lootIdentifyAction) return;
    const rootRect = lootIdentifyOverlay.getBoundingClientRect();
    const targetRect = lootIdentifyAction.getBoundingClientRect();
    const padding = 8;
    lootBagTutorial.style.setProperty("--loot-hole-left", `${targetRect.left - rootRect.left - padding}px`);
    lootBagTutorial.style.setProperty("--loot-hole-top", `${targetRect.top - rootRect.top - padding}px`);
    lootBagTutorial.style.setProperty("--loot-hole-width", `${targetRect.width + padding * 2}px`);
    lootBagTutorial.style.setProperty("--loot-hole-height", `${targetRect.height + padding * 2}px`);
  }

  function startLootBagTutorial() {
    if (!lootBagTutorial || !lootBagTutorialPrompt || !lootIdentifyAction) return;
    window.clearTimeout(lootBagTutorialTimer);
    lootBagTutorialActive = true;
    lootBagTutorialReady = false;
    lootBagTutorialPrompt.hidden = true;
    lootIdentifyAction.disabled = true;
    lootBagTutorial.hidden = false;
    requestAnimationFrame(updateLootBagTutorialTarget);
    lootBagTutorialTimer = window.setTimeout(() => {
      if (!lootBagTutorialActive) return;
      lootBagTutorialReady = true;
      lootBagTutorialPrompt.hidden = false;
      lootIdentifyAction.disabled = false;
    }, 3000);
  }

  function finishLootBagTutorial() {
    if (!lootBagTutorialActive || !lootBagTutorialReady) return false;
    window.clearTimeout(lootBagTutorialTimer);
    lootBagTutorialActive = false;
    lootBagTutorialReady = false;
    lootBagTutorial.hidden = true;
    character = { ...character, lootBagTutorialSeen: true };
    saveGame();
    return true;
  }

  window.addEventListener("resize", updateLootBagTutorialTarget);

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
        className: getLotEquipmentHighlightClass(instance, getEquipmentItem(instance.equipmentId, instance.slot))
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
    if (lootBagTutorialActive && !lootBagTutorialReady) return true;
    if (lootBagTutorialActive && action === "cancel") return true;
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
    startDir = currentDepth === 100 ? DIRS.findIndex(direction => direction.key === "N") : chooseStartDirection();
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
    let longMarchCompleted = false;
    let longMarchRewardGained = false;
    if (character) {
      if (currentDepth === 80) {
        character = { ...character, eventFlags: { ...(character.eventFlags || {}), floor_b80_reached: true } };
      }
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
      const longMarch = recordLongMarchDescent(character, {
        fromDepth: previousDepth,
        toDepth: currentDepth
      });
      character = longMarch.character;
      longMarchCompleted = longMarch.completed;
      if (marathonCompleted) {
        const reward = grantCard(character.cards, MARATHON_REWARD_CARD_ID, 1, character.deckCost);
        character = { ...character, cards: reward.cards };
      }
      if (longMarchCompleted) {
        const reward = grantCard(character.cards, LONG_MARCH_REWARD_CARD_ID, 1, character.deckCost);
        character = { ...character, cards: reward.cards };
        longMarchRewardGained = reward.gained > 0;
      }
      character = recordNpcExpeditionDepth(character, currentDepth);
      const virgoRecovery = applyVirgoFloorRecovery(character);
      character = virgoRecovery.character;
      if (virgoRecovery.hpRecovered > 0) {
        setTimeout(() => showStepHpRecovery(virgoRecovery.hpRecovered), 420);
      }
      if (virgoRecovery.spRecovered > 0) {
        setTimeout(() => showStepSpRecovery(virgoRecovery.spRecovered), 420);
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
        eventFlags: {
          ...(character.eventFlags || {}),
          shop_stock_b30f_unlocked: true,
          transfer_portal_b30f_unlocked: true
        }
      };
    }
    if (currentDepth === 40 && character) {
      character = {
        ...character,
        eventFlags: {
          ...(character.eventFlags || {}),
          transfer_portal_b40f_unlocked: true
        }
      };
    }
    if (currentDepth === 50 && character) {
      character = {
        ...character,
        eventFlags: {
          ...(character.eventFlags || {}),
          transfer_portal_b50f_unlocked: true
        }
      };
    }
    if (currentDepth === 60 && character) {
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), transfer_portal_b60f_unlocked: true }
      };
    }
    if (currentDepth === 70 && character) {
      character = {
        ...character,
        eventFlags: { ...(character.eventFlags || {}), transfer_portal_b70f_unlocked: true }
      };
    }
    startBgm(selectDungeonBgm());
    setDungeonColors(resolveCurrentFloorTheme());
    applyCurrentFloorMist();
    floorStartedAt = descendedAt;
    resetDungeon("", nextStart);
    startFloorLapNotice(currentDepth);
    if (marathonCompleted) {
      say("――長い、長い旅路の果てに、\nあなたは一度も地上へ戻ることなくB42Fへ到達した。\n\nZカード「カプリコーン」を手に入れた！");
      setTimeout(() => showCardGetEffect(MARATHON_REWARD_CARD_ID, { seId: "itemGet" }), 0);
    }
    if (longMarchCompleted) {
      say("――長き道の果てに、あなたはB84Fへ到達した。\n\nZカード「トーラス」を手に入れた！");
      if (longMarchRewardGained) {
        setTimeout(() => showCardGetEffect(LONG_MARCH_REWARD_CARD_ID, { seId: "itemGet" }), 4300);
      }
    }
    scheduleAutosave();
  }

  function resolveCurrentFloorTheme() {
    return resolveFloorTheme(currentDepth, getDungeonColors(), {
      lichtbringerOwned: hasKeyItem(character?.keyItems, "lichtbringer")
    });
  }

  async function runLichtbringerWhiteout() {
    if (!lichtbringerWhiteout || currentDepth < 90 || currentDepth > 99) {
      setDungeonColors(resolveCurrentFloorTheme());
      applyCurrentFloorMist();
      return;
    }
    setPlayerInputEnabled(false);
    lichtbringerWhiteout.hidden = false;
    lichtbringerWhiteout.style.transitionDuration = ".45s";
    void lichtbringerWhiteout.offsetWidth;
    requestAnimationFrame(() => { lichtbringerWhiteout.style.opacity = "1"; });
    await wait(450);
    setDungeonColors(resolveCurrentFloorTheme());
    applyCurrentFloorMist();
    updateHud();
    lichtbringerWhiteout.style.transitionDuration = ".65s";
    lichtbringerWhiteout.style.opacity = "0";
    await wait(650);
    lichtbringerWhiteout.style.removeProperty("transition-duration");
    lichtbringerWhiteout.hidden = true;
    setPlayerInputEnabled(true);
  }
  function applyCurrentFloorMist() {
    const options = getDungeonMistOptions();
    const color = currentDepth >= 20 && currentDepth <= 29 ? "torture"
      : currentDepth >= 10 && currentDepth <= 19 ? "magic"
      : currentDepth >= 1 && currentDepth <= 9 ? "slate"
      : isFireFloorDepth(currentDepth) ? "red"
      : isColdFloorDepth(currentDepth) ? "blue"
        : currentDepth >= 50 && currentDepth <= 59 ? "green"
          : currentDepth >= 60 && currentDepth <= 69 ? "yellow"
            : currentDepth >= 70 && currentDepth <= 79 ? "water"
            : currentDepth >= 80 && currentDepth <= 89 ? "crystal"
            : currentDepth >= 90 && currentDepth <= 99 ? (hasKeyItem(character?.keyItems, "lichtbringer") ? "light" : "black")
            : currentDepth === 100 ? "acacia"
          : options.color;
    setMistOptions({ ...options, color });
  }

  function getDungeonProgress() {
    const floorBoss = getFloorBossByDepth(currentDepth);
    const room = floorBoss?.room || {};
    const queenShadowQuest = getQuestProgress(character, "guild_008");
    const secondQueenShadowQuest = getQuestProgress(character, "guild_024");
    const thirdQueenShadowQuest = getQuestProgress(character, "guild_032");
    return {
      bossDefeated: isBossDefeated(character, "strange_knight_statue_b9f"),
      bossDefeatedById: {
        ...(floorBoss ? { [floorBoss.id]: isBossDefeated(character, floorBoss) } : {}),
        ...(floorBoss?.nextBossId ? { [floorBoss.nextBossId]: isBossDefeated(character, floorBoss.nextBossId) } : {}),
        quest_mimic_b6f: isBossDefeated(character, "quest_mimic_b6f"),
        otherworldly_wisdom_b4f: isBossDefeated(character, "otherworldly_wisdom_b4f"),
        todes_scorpio_b64f: isBossDefeated(character, "todes_scorpio_b64f")
      },
      bossRemainsById: floorBoss?.id === "sphinx_b69f"
        ? {
            sphinx_b69f: character?.eventFlags?.sphinx_b69f_peaceful
              ? "sphinx_sleeping_b69f"
              : character?.eventFlags?.sphinx_b69f_defeated
                ? "sphinx_b69f"
                : null
          }
        : {},
      blackChestsUnlocked: Boolean(character?.eventFlags?.black_chests_unlocked),
      goldWeaponEligible: isGoldChestWeaponEligible(character),
      redDoorUnlocked: Boolean(room.unlockFlag && character?.eventFlags?.[room.unlockFlag]),
      hasRedKey: Boolean(room.keyItemId && hasKeyItem(character?.keyItems, room.keyItemId)),
      queenShadowQuest: {
        active: queenShadowQuest.active,
        completed: queenShadowQuest.completed,
        progress: queenShadowQuest.progress
      },
      secondQueenShadowQuest: {
        active: secondQueenShadowQuest.active,
        completed: secondQueenShadowQuest.completed,
        progress: secondQueenShadowQuest.progress
      },
      thirdQueenShadowQuest: {
        active: thirdQueenShadowQuest.active,
        completed: thirdQueenShadowQuest.completed,
        progress: thirdQueenShadowQuest.progress
      },
      queenRegaliaComplete: hasCompleteQueenRegalia(character),
      activeQuestIds: Object.keys(character?.quests?.active || {}),
      forcedEnemyId: getForcedEnemyId(character, { depth: currentDepth }),
      maikaeferNestRoll: Math.random(),
      eventFlags: { ...(character?.eventFlags || {}) },
      b100GauntletDefeatedBossIds: [...b100GauntletDefeatedThisExploration]
    };
  }

  function getCurrentSpecialDoorLockInfo({ x, y, dirKey } = {}) {
    return getSpecialRoomLockInfo({
      x,
      y,
      dirKey,
      dex: collectStats(getContextualCharacter()).dex,
      guaranteed: hasActiveFullFloorSurvey(character, currentDepth)
    });
  }

  function getCurrentSpecialDoorAccessBlock() {
    const room = getSpecialRoomDefinition(currentDepth);
    const forcedAccess = getSpecialRoomAccessRestriction({
      forcedEnemyId: getForcedEnemyId(character, { depth: currentDepth })
    });
    if (forcedAccess.blocked) return forcedAccess;
    if (room?.content?.requiredZodiacCount) {
      const required = Math.max(1, Math.floor(Number(room.content.requiredZodiacCount) || 1));
      const ownedCounts = character?.cards?.ownedCardCounts || {};
      const owned = CARDS.filter(card => card.category === "zodiac")
        .reduce((count, card) => count + (Math.max(0, Number(ownedCounts[card.id]) || 0) > 0 ? 1 : 0), 0);
      if (owned < required) {
        return { blocked: true, reason: "zodiacCardsRequired", message: room.content.accessBlockedMessage };
      }
      return room.content.confirmAfterUnlock
        ? { blocked: false, reason: "", message: "", confirmAfterUnlock: true }
        : { blocked: false, reason: "", message: "", confirmMessage: room.content.accessConfirmMessage };
    }
    if (room?.content?.requiredQuestId) {
      const progress = getQuestProgress(character, room.content.requiredQuestId);
      const questAccess = getQuestRequiredSpecialRoomAccess(room, progress);
      if (questAccess.blocked) return questAccess;
    }
    return forcedAccess;
  }

  function attemptCurrentSpecialDoorUnlock({ x, y, dirKey } = {}) {
    const result = attemptSpecialRoomUnlock({
      x,
      y,
      dirKey,
      dex: collectStats(getContextualCharacter()).dex,
      guaranteed: hasActiveFullFloorSurvey(character, currentDepth)
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
    const lightbringerOwned = currentDepth >= 90 && currentDepth <= 99
      && hasKeyItem(character?.keyItems, "lichtbringer");
    state.lightbringerActive = false;
    state.minimapEffectForced = false;
    state.minimapBlocked = currentDepth === 100;
    if (isForcedTorchZeroFloor(currentDepth) && !lightbringerOwned) state.torchFuel = 0;
    const displayGridY = currentDepth === 100 ? MAP_H - 1 - state.gridY : state.gridY;
    posEl.textContent = `X:${state.gridX} Y:${displayGridY}`;
    depthEl.textContent = `B${currentDepth}F`;
    stopwatchEl.textContent = formatElapsedTime(performance.now() - runStartedAt);
    drawCompass();
    if (fpsIndicator) fpsIndicator.textContent = `${getEffectiveFrameRate()}fps`;
    const displayedTorchFuel = isForcedTorchZeroFloor(currentDepth) && !lightbringerOwned
      ? 0
      : state.torchEffectForced ? 100 : state.torchFuel;
    torchMeterEl.style.width = `${displayedTorchFuel}%`;
    torchMeterEl.parentElement.classList.toggle(
      "is-critical",
      (isForcedTorchZeroFloor(currentDepth) && !lightbringerOwned)
        || (!state.torchEffectForced && state.torchFuel <= 20)
    );
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
    if (document.body.classList.contains("title-active")) {
      window.dispatchEvent(new CustomEvent("nda:title-input", { detail: { action } }));
      return true;
    }
    if (endingController.handleAction(action)) return true;
    if (michaelaRestorationController.handleAction(action)) return true;
    if (endingSequenceActive) return true;
    if (handleBlockingTutorialInput(action)) return true;
    recordUserInput();
    if (action === "items") {
      if (handleMenuInput("lock")) return true;
      if (!itemOverlay.hidden || !skillOverlay.hidden) return true;
      if (isBattleActive()) return openBattleItems();
      if (worldLocation === "dungeon" && !sceneTransitionRunning && !state.overlayEvent) return openItemInventory();
      return false;
    }
    if ((action === "pageLeft" || action === "pageRight") && worldLocation === "town" && handleTownInput(action)) return true;
    if ((action === "pageLeft" || action === "pageRight") && handleMenuInput(action)) return true;
    if (action === "pageLeft") action = "left";
    if (action === "pageRight") action = "right";
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

  function showGamepadConnectionNotification({ connected, id } = {}) {
    if (!gamepadNotification) return;
    window.clearTimeout(gamepadNotificationTimer);
    gamepadNotification.querySelector("strong").textContent = connected
      ? "GAMEPAD CONNECTED"
      : "GAMEPAD DISCONNECTED";
    gamepadNotification.querySelector("span").textContent = String(id || "GAMEPAD");
    gamepadNotification.hidden = false;
    gamepadNotification.classList.remove("is-visible");
    void gamepadNotification.offsetWidth;
    gamepadNotification.classList.add("is-visible");
    gamepadNotificationTimer = window.setTimeout(() => {
      gamepadNotification.classList.remove("is-visible");
      gamepadNotification.hidden = true;
    }, 3400);
  }

  configureGamepadInput({
    dispatchAction: dispatchGamepadAction,
    getBindings: getGamepadBindings,
    getCaptureAction: getGamepadCaptureAction,
    onBindingCaptured: completeGamepadBinding,
    onButtonPreviewChange: setGamepadPressedButtons,
    onConnectionChange: showGamepadConnectionNotification,
    toggleMinimap: () => {
      if (endingSequenceActive || michaelaRestorationController.isActive()) return true;
      if (handleBlockingTutorialInput("dismiss")) return true;
      recordUserInput();
      if (worldLocation !== "dungeon" || isBattleActive() || isMenuOpen()
        || sceneTransitionRunning || state.overlayEvent) return false;
      return toggleMinimapOverlay();
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
    openStatusMenu: () => {
      if (endingSequenceActive) return true;
      if (handleBlockingTutorialInput("dismiss")) return true;
      return openStatusMenu();
    },
    handleSkillInput: action => endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleBlockingTutorialInput(action) || handleSkillOverlayInput(action),
    handleItemInput: action => endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleBlockingTutorialInput(action) || handleItemOverlayInput(action),
    handleOverlayInput: action => endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleBlockingTutorialInput(action) || handleOverlayEventInput(action),
    handleBattleInput: action => endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleBlockingTutorialInput(action) || handleBattleInput(action),
    handleTownInput: action => (
      endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleBlockingTutorialInput(action) || sceneTransitionRunning || handleLootIdentifyInput(action) || handleExperienceSettlementInput(action) || handleTownInput(action)
    ),
    handleDoorInput: openDoorAhead,
    onUserOperation: recordUserInput,
    handleMenuInput: action => endingController.handleAction(action) || michaelaRestorationController.handleAction(action) || endingSequenceActive || handleMenuInput(action)
  });
  let virtualStickController = null;
  configureMenu({
    root: menuScreen,
    commandRoot: dungeonCommands,
    getCharacter: () => character,
    onStatusOpened: updateCharacterUi,
    canReplayEnding: () => worldLocation === "town" && Boolean(character?.eventFlags?.ending_credits_watched),
    replayEnding: () => void runMainEnding({ replay: true }),
    getRumorHistory: () => getPastTavernRumors(character, {
      mikanEncountered: Boolean(character?.eventFlags?.mikan_nyanko_encountered)
        || Object.entries(state.npcEncounterCounts || {}).some(
          ([npcId, count]) => npcId.startsWith("NPC_01") && Number(count) > 0
        ),
      depthReached: character?.highestDungeonDepthReached,
      lingeringGhostDefeated: Boolean(character?.eventFlags?.lingering_ghost_b2f_defeated_once),
      otherworldlyWisdomDefeated: Boolean(character?.eventFlags?.boss_otherworldly_wisdom_b4f_defeated)
    }),
    getInventoryContext: () => isTownOpen() ? "town" : "dungeon",
    onUseInventoryItem: useFieldItem,
    onEquipmentChanged: next => {
      character = next;
      updateCharacterUi();
      saveGame();
    },
    onEquipmentLockChanged: next => {
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
    setFrameRateMode,
    getEffectiveFrameRate,
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
    setTouchControlsMode: mode => virtualStickController?.setMode(mode),
    setTouchMovementMode: mode => virtualStickController?.setMovementMode(mode),
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
  virtualStickController = configureFloatingStick({
    zoneEl: floatingStickZone,
    stickEl: virtualStickEl,
    dpadEl: touchDpad,
    mode: getTouchControlsMode(),
    movementMode: getTouchMovementMode(),
    isInputAllowed: () => Boolean(
      character
      && !sceneTransitionRunning
      && !endingSequenceActive
      && !document.body.classList.contains("title-active")
    ),
    manualMove: amount => dispatchGamepadAction(amount > 0 ? "up" : "down"),
    manualTurn: amount => dispatchGamepadAction(amount < 0 ? "left" : "right"),
    onUserOperation: recordUserInput
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
  window.addEventListener("pagehide", () => {
    saveGame();
    for (const [timer, resolve] of endingWaits) { clearTimeout(timer); resolve(false); }
    endingWaits.clear();
    if (endingSequenceActive) {
      michaelaRestorationController.dispose();
      endingController.dispose(false);
      setEndingInputLocked(false); mainEndingStarting = false;
    }
  });
  document.addEventListener("visibilitychange", () => {
    accruePlayTime();
    if (document.visibilityState === "hidden") saveGame();
    else playTimeLastTick = performance.now();
  });
})();
