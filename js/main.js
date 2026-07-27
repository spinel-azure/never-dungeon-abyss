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
  startFloorLapNotice,
  setNpcTypewriterOptions
} from "./player.js?v=20260724-1";
import { configureRenderer, startRenderLoop, setScreenShakeEnabled, setTorchFlickerEnabled, setMistOptions, setWallColor, setFloorColor } from "./renderer.js?v=20260722-8";
import { drawMinimap, getMinimapBounds, setMinimapRevealOptions } from "./minimap.js?v=20260722-1";
import { configureInput } from "./input.js?v=20260726-1";
import { configureVirtualStick } from "./virtualStick.js?v=20260724-1";
import { configureCompass, drawCompass } from "./compass.js";
import { configureMenu, handleMenuInput, getDungeonColors, setDungeonColors, isMenuOpen, openStatusMenu } from "./menu.js?v=20260727-2";
import { resolveFloorTheme } from "./floorTheme.js?v=20260722-1";
import {
  configureAutoReturn,
  startAutoReturn,
  continueAutoReturn,
  cancelAutoReturn,
  updateAutoReturnButton
} from "./autoReturn.js?v=20260723-1";
import { configureEvents, messageFor, say } from "./events.js";
import { configureDevice } from "./device.js?v=20260722-1";
import {
  configurePresence,
  getPresence,
  restorePresence,
  resetPresence,
  setPresenceDisabled
} from "./presence.js";
import { configureTreasure, showTreasure, playTreasureOpening, hideTreasure } from "./treasure.js?v=20260726-1";
import { configureAudio, setSeOptions, playSe, playSeSequence } from "./audio.js?v=20260727-9";
import { loadGame, writeGame } from "./save-data.js";
import { configureTown, openTown, closeTown, getTownState, handleTownInput, isTownOpen, renderCharacterStatus, showTownArrival } from "./town.js?v=20260725-1";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js?v=20260727-3";
import { getEquipmentItem } from "../data/equipment.js";
import { createEnemyCombatant, getRandomEnemy } from "../data/enemies.js?v=20260727-2";
import { configureBattle, handleBattleInput, isBattleActive, startBattle } from "./battle.js?v=20260726-4";
import { awardBattleExperience, createTempleRevival, resolveInnStay } from "./character-services.js?v=20260727-3";
import { deriveDetailStats } from "../combat/derive-detail-stats.js?v=20260726-1";
import { getNextLevelExperience, MAX_LEVEL } from "../data/growth.js?v=20260727-2";
import { resolveFieldSkill } from "../combat/resolve-field-skill.js?v=20260727-1";
import { configureSkillOverlay, openSkillOverlay, handleSkillOverlayInput } from "./skill-overlay.js?v=20260727-1";

(() => {
  const canvas = document.getElementById("screen");
  const ctx = canvas.getContext("2d", { alpha: false });
  const eventOverlayCanvas = document.getElementById("eventOverlay");
  const eventOverlayCtx = eventOverlayCanvas.getContext("2d");
  const treasureCanvas = document.getElementById("treasureCanvas");
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
  const battleScreen = document.getElementById("battleScreen");
  const skillOverlay = document.getElementById("skillOverlay");
  const sceneTransition = document.getElementById("sceneTransition");
  const sceneTransitionTitle = document.getElementById("sceneTransitionTitle");
  let sceneTransitionRunning = false;
  let currentDepth = 1;
  configureDevice();
  configureEvents({ messageEl: msgEl });
  configurePresence({
    onEncounter: startRandomEncounterNotice
  });
  configureTreasure({ canvas: treasureCanvas });
  configureAudio();
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
    returnToTown,
    beginBattle: beginRandomBattle,
    playNpcVoice: playSe,
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
    playSe
  });

  configureSkillOverlay({
    root: skillOverlay,
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
        runElapsedMs: Math.max(0, now - runStartedAt),
        floorElapsedMs: Math.max(0, now - floorStartedAt)
      }
    };
  }

  function saveGame({ announce = false } = {}) {
    if (!saveEnabled) return false;
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = 0;
    }
    const saved = writeGame(makeSaveSnapshot());
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
        Object.assign(cells[y][x], structuredClone(dungeon.cells[y][x]));
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
    state.autoReturning = false;
    state.autoPath = [];
    state.overlayEvent = null;
    state.npcAwarenessShown = false;
    state.npcEncounterCounts = player.npcEncounterCounts && typeof player.npcEncounterCounts === "object" ? { ...player.npcEncounterCounts } : {};
    state.stairsPromptDismissed = Boolean(player.stairsPromptDismissed);
    character = normalizeCharacter(save.character);
    restorePresence(dungeon.presence);
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
      setPlayerInputEnabled(false);
      openTown({
        registrationRequired: !character,
        facilityId: save.world?.town?.facilityId,
        mode: save.world?.town?.mode
      });
    } else {
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
    setPlayerInputEnabled(false);
    updateCharacterUi();
    openTown({ registrationRequired: true, facilityId: "guild" });
    saveGame();
  }

  function continueGame() {
    const save = loadGame();
    saveEnabled = true;
    if (!restoreGame(save)) startNewGame();
  }

  function registerCharacter({ name, job, jobLabel }) {
    character = createInitialCharacter({ name, job, jobLabel });
    updateCharacterUi();
    saveGame();
  }

  function updateCharacterUi() {
    renderCharacterStatus();
    const quickName = document.getElementById("quickName");
    const quickLevel = document.getElementById("quickLevel");
    const quickJob = document.getElementById("quickJob");
    const statusName = document.getElementById("statusName");
    const statusJob = document.getElementById("statusJob");
    const statusLevel = document.getElementById("statusLevel");
    const statusCondition = document.getElementById("statusCondition");
    if (quickName) quickName.textContent = character?.name || "NO_NAME";
    if (quickLevel) quickLevel.textContent = character ? String(character.level).padStart(3, "0") : "---";
    if (quickJob) quickJob.textContent = character?.jobLabel || "-";
    if (statusName) statusName.textContent = character?.name || "NO_NAME";
    if (statusJob) statusJob.textContent = character?.jobLabel || "UNKNOWN";
    if (statusLevel) statusLevel.textContent = character ? String(character.level).padStart(3, "0") : "---";
    if (statusCondition) statusCondition.textContent = character?.condition || "----";
    const vitals = document.querySelector(".nde-status-vitals");
    if (vitals) vitals.innerHTML = character
      ? `<span>HP ${character.hp} / ${character.maxHp}</span><span>SP ${character.sp} / ${character.maxSp}</span><span>DECK COST : ${character.deckCost}</span>`
      : "<span>HP ---- / ----</span><span>SP ---- / ----</span><span>DECK COST : --</span>";
    renderStatusGauges(character);
    renderEquipment(character);
    renderDetailStats(character);
    renderExperience(character);
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
    const carriedText = carried > 0 ? `+${carried}` : "";
    const suffix = target.level >= MAX_LEVEL ? " MAX LEVEL" : " NEXT LEVEL";
    element.textContent = `${String(experience).padStart(7, "0")}${carriedText} / ${String(next).padStart(7, "0")}${suffix}`;
  }

  function beginRandomBattle() {
    if (!character || worldLocation !== "dungeon" || isBattleActive()) return false;
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    const enemy = createEnemyCombatant(getRandomEnemy({ depth: currentDepth }));
    const started = startBattle(enemy);
    if (!started) setPlayerInputEnabled(true);
    return started;
  }

  function updateCharacterFromBattle(changes) {
    if (!character) return;
    Object.assign(character, changes);
    updateCharacterUi();
    scheduleAutosave();
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

  function finishBattleVictory(battle) {
    const reward = Math.max(0, Math.floor(Number(battle?.enemy?.experienceReward) || 0));
    if (character && reward > 0) Object.assign(character, awardBattleExperience(character, reward));
    resetPresence();
    say(reward > 0
      ? `戦闘に勝利した。${reward}EXPを持ち帰った。`
      : "戦闘に勝利した。");
    setPlayerInputEnabled(true);
    updateCharacterUi();
    saveGame();
  }

  function finishBattleDefeat() {
    if (character) {
      Object.assign(character, createTempleRevival(character));
    }
    worldLocation = "town";
    cancelAutoReturn(false);
    setPlayerInputEnabled(false);
    openTown({ registrationRequired: false, facilityId: "temple", mode: "facilityMenu" });
    updateCharacterUi();
    say("司祭：おお…！女神へ祈りが届いたか…！迷える魂よ、今一度目覚めよ！");
    saveGame();
  }

  function finishBattleEscape() {
    resetPresence();
    setPlayerInputEnabled(true);
    say("戦闘から逃げ切った。");
    updateCharacterUi();
    saveGame();
  }

  function stayAtInn() {
    if (!character) return;
    const result = resolveInnStay(character);
    Object.assign(character, result.changes);
    updateCharacterUi();
    if (result.levelsGained > 0) {
      showLevelUpEffect();
      const deckBonus = result.deckCostGained > 0
        ? `、特別ボーナス DECK COST+${result.deckCostGained}`
        : "";
      say(`LVが上がった！HP+${result.hpGained}、SP+${result.spGained}${deckBonus}`);
    } else if (result.gainedExperience > 0) {
      say(`女将：お代はいらないよ。ゆっくりと身体を休めるんだよ。\n${result.gainedExperience}EXPを精算した。`);
    } else {
      say("女将：お代はいらないよ。ゆっくりと身体を休めるんだよ。");
    }
    saveGame();
  }

  function showLevelUpEffect() {
    if (!levelUpEffect) return;
    playSe("levelUp");
    levelUpEffect.hidden = false;
    levelUpEffect.classList.remove("is-active");
    void levelUpEffect.offsetWidth;
    levelUpEffect.classList.add("is-active");
    levelUpEffect.addEventListener("animationend", () => {
      levelUpEffect.classList.remove("is-active");
      levelUpEffect.hidden = true;
    }, { once: true });
  }

  function healAtTemple() {
    if (!character) return;
    if (character.alive && character.hp > 0) {
      say("司祭：治療の必要はないようですね。");
      return;
    }
    Object.assign(character, createTempleRevival(character));
    updateCharacterUi();
    say("司祭：おお…！女神へ祈りが届いたか…！迷える魂よ、今一度目覚めよ！");
    saveGame();
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
        resetDungeon("", null, true);
        worldLocation = "dungeon";
        closeTown();
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
    sceneTransition.classList.remove("is-black", "is-revealing");
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
    worldLocation = "town";
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
    handleOverlayInput: handleOverlayEventInput,
    handleBattleInput,
    handleTownInput,
    handleDoorInput: openDoorAhead,
    handleMenuInput
  });
  configureMenu({
    root: menuScreen,
    commandRoot: dungeonCommands,
    getCharacter: () => character,
    generateRandomDungeon,
    startAutoReturn,
    refillTorch,
    setTorchFuelDisabled,
    setScreenShakeEnabled,
    setTorchFlickerEnabled,
    setMistOptions,
    setWallColor,
    setFloorColor,
    setSeOptions,
    playSe,
    setPresenceDisabled,
    setMinimapRevealOptions,
    setNpcTypewriterOptions,
    setStopwatchVisible,
    resetStopwatch,
    saveGame: () => saveGame({ announce: true }),
    openSkills: () => openSkillOverlay({
      context: "field",
      character,
      onUse: useFieldSkill
    }),
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
    handleBattleInput,
    handleTownInput,
    handleMenuInput
  });

  updateAutoReturnButton();
  startRenderLoop();
  window.addEventListener("nda:new-game", startNewGame);
  window.addEventListener("nda:continue", continueGame);
  window.addEventListener("pagehide", () => saveGame());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveGame(); });
})();










