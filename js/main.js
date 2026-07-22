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
} from "./player.js?v=20260722-3";
import { configureRenderer, startRenderLoop, setScreenShakeEnabled, setTorchFlickerEnabled, setMistOptions, setWallColor, setFloorColor } from "./renderer.js?v=20260722-8";
import { drawMinimap, getMinimapBounds, setMinimapRevealOptions } from "./minimap.js?v=20260722-1";
import { configureInput } from "./input.js";
import { configureVirtualStick } from "./virtualStick.js";
import { configureCompass, drawCompass } from "./compass.js";
import { configureMenu, handleMenuInput, getDungeonColors, setDungeonColors } from "./menu.js?v=20260722-13";
import { resolveFloorTheme } from "./floorTheme.js?v=20260722-1";
import {
  configureAutoReturn,
  startAutoReturn,
  continueAutoReturn,
  cancelAutoReturn,
  updateAutoReturnButton
} from "./autoReturn.js?v=20260722-1";
import { configureEvents, messageFor, say } from "./events.js";
import { configureDevice } from "./device.js?v=20260722-1";
import {
  configurePresence,
  getPresence,
  restorePresence,
  resetPresence,
  setPresenceDisabled
} from "./presence.js";
import { configureTreasure, showTreasure, playTreasureOpening, hideTreasure } from "./treasure.js";
import { configureAudio, setSeOptions, playSe, playSeSequence } from "./audio.js?v=20260722-6";
import { loadGame, writeGame } from "./save-data.js";

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
    showTreasure,
    playTreasureOpening,
    hideTreasure,
    onStateChanged: scheduleAutosave
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
    restorePresence(dungeon.presence);
    const now = performance.now();
    runStartedAt = now - Math.max(0, Number(dungeon.runElapsedMs) || 0);
    floorStartedAt = now - Math.max(0, Number(dungeon.floorElapsedMs) || 0);
    cancelAutoReturn(false);
    updateAutoReturnButton();
    updateHud();
    say("冒険を再開しました。");
    return true;
  }

  function startNewGame() {
    saveEnabled = true;
    currentDepth = 1;
    setDungeonColors({ wall: "default", floor: "default" });
    resetDungeon("", null, true);
    saveGame();
  }

  function continueGame() {
    const save = loadGame();
    saveEnabled = true;
    if (!restoreGame(save)) startNewGame();
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
    handleOverlayInput: handleOverlayEventInput,
    handleDoorInput: openDoorAhead,
    handleMenuInput
  });
  configureMenu({
    root: menuScreen,
    commandRoot: dungeonCommands,
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
    onReturnToDungeon: resumeDismissedStairsPrompt
  });
  configureVirtualStick({
    stickEl: virtualStickEl,
    manualMove,
    manualTurn,
    handleMenuInput
  });

  updateAutoReturnButton();
  startRenderLoop();
  window.addEventListener("nda:new-game", startNewGame);
  window.addEventListener("nda:continue", continueGame);
  window.addEventListener("pagehide", () => saveGame());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveGame(); });
})();










