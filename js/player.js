import {
  TAU,
  STEP_MS,
  TURN_MS,
  DIRS
} from "./config.js";
import {
  getCellType,
  markExplored,
  inBounds,
  wallOnCell,
  closedDoorOnCell,
  openDoorOnCell,
  openDoor,
  closeDoor,
  getDoorKind,
  getStartPosition,
  getNpcAt,
  removeNpcAt,
  getTreasureAt,
  removeTreasureAt,
  discoverTreasureAt
} from "./dungeon.js";
import { getNpcEncounter } from "../data/npcs.js";
import { onPlayerStep, resetPresence } from "./presence.js";

const hooks = {
  say: () => {},
  cancelAutoReturn: () => {},
  continueAutoReturn: () => {},
  messageFor: () => "",
  descendFloor: () => {},
  playSe: () => {},
  playStairsSequence: () => Promise.resolve(),
  showTreasure: () => {},
  playTreasureOpening: (_type, onComplete) => onComplete(),
  hideTreasure: () => {},
  onStateChanged: () => {}
};

const NPC_AWARENESS_MESSAGE = "前方に何かいるようだ";

const TORCH_FUEL_MAX = 100;
const TORCH_FUEL_STEP = 1;
const DOOR_OPEN_MS = 520;
const NPC_TYPEWRITER_DELAYS = { slow: 75, normal: 42, fast: 20 };
const npcTypewriter = { enabled: true, speed: "normal", timer: 0 };
let torchFuelDisabled = false;

export const state = createPlayerState(2);

export function configurePlayer(callbacks) {
  Object.assign(hooks, callbacks);
}

export function setNpcTypewriterOptions({ enabled, speed } = {}) {
  if (typeof enabled === "boolean") npcTypewriter.enabled = enabled;
  if (speed in NPC_TYPEWRITER_DELAYS) npcTypewriter.speed = speed;
  const event = state.overlayEvent;
  if (!npcTypewriter.enabled && event?.type === "npcTalk" && event.typing?.active) completeNpcTypewriter(event);
}

export function createPlayerState(startDir) {
  const start = getStartPosition();
  return {
    gridX: start.x,
    gridY: start.y,
    dir: startDir,
    x: start.x + .5,
    y: start.y + .5,
    angle: DIRS[startDir].angle,
    anim: null,
    shake: 0,
    torch: 0,
    torchFuel: TORCH_FUEL_MAX,
    autoReturning: false,
    autoPath: [],
    overlayEvent: null,
    npcAwarenessShown: false,
    npcEncounterCounts: {},
    stairsPromptDismissed: false
  };
}

export function resetPlayer(startDir) {
  stopNpcTypewriter();
  const start = getStartPosition();
  state.anim = null;
  state.gridX = start.x;
  state.gridY = start.y;
  state.dir = startDir;
  state.x = start.x + .5;
  state.y = start.y + .5;
  state.angle = DIRS[startDir].angle;
  state.shake = 0;
  state.torchFuel = TORCH_FUEL_MAX;
  state.autoPath = [];
  state.overlayEvent = null;
  state.npcAwarenessShown = false;
  state.stairsPromptDismissed = false;
  markExplored(start.x, start.y);
}

export function refillTorch() {
  state.torchFuel = TORCH_FUEL_MAX;
}

export function setTorchFuelDisabled(disabled) {
  torchFuelDisabled = Boolean(disabled);
  if (torchFuelDisabled) refillTorch();
}

export function updateAnimation(now) {
  if (!state.anim) return;
  const a = state.anim;
  const p = Math.min(1, (now - a.start) / a.duration);
  const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  if (a.type === "move") {
    state.x = a.fromX + (a.toX - a.fromX) * e;
    state.y = a.fromY + (a.toY - a.fromY) * e;
  } else if (a.type === "turn") {
    state.angle = normalize(a.fromA + angleDelta(a.fromA, a.toA) * e);
  }
  if (p >= 1) {
    if (a.type === "move") {
      state.gridX = a.toGX;
      state.gridY = a.toGY;
      state.x = state.gridX + .5;
      state.y = state.gridY + .5;
      if (a.npcRetreat) {
        markExplored(state.gridX, state.gridY);
        updateNpcAwareness();
      } else {
        markExplored(state.gridX, state.gridY);
        const movedInDarkness = state.torchFuel <= 0;
        if (!torchFuelDisabled) state.torchFuel = Math.max(0, state.torchFuel - TORCH_FUEL_STEP);
        const npc = getNpcAt(state.gridX, state.gridY);
        const treasure = getTreasureAt(state.gridX, state.gridY);
        const isStairs = a.cellType === "stairsUp" || a.cellType === "stairsDown";
        const isSpecialEventCell = Boolean(npc) || Boolean(treasure) || isStairs;
        const encounterTriggered = !isSpecialEventCell && onPlayerStep({ inDarkness: movedInDarkness });
        if (encounterTriggered) hooks.cancelAutoReturn(false);
        if (npc) {
          startNpcTalkEvent(npc, a.fromGX, a.fromGY);
        } else if (treasure) {
          startTreasureEvent(treasure, a.fromGX, a.fromGY);
        } else if (isStairs) {
          startStairsPrompt(a.cellType);
        } else if (encounterTriggered) {
          state.npcAwarenessShown = false;
        } else {
          hooks.say(hooks.messageFor(state.gridX, state.gridY, a.cellType));
          updateNpcAwareness();
        }
      }
      if (a.crossedDoor) {
        closeDoor(a.crossedDoor.x, a.crossedDoor.y, a.crossedDoor.dirKey);
      }
    } else if (a.type === "turn") {
      state.dir = a.toDir;
      state.angle = DIRS[state.dir].angle;
      updateNpcAwareness();
    } else if (a.type === "door") {
      openDoor(a.x, a.y, a.dirKey);
      hooks.say("扉が　ひらいた。");
      updateNpcAwareness();
    }
    state.anim = null;
    hooks.onStateChanged();
    if (state.autoReturning) hooks.continueAutoReturn();
  }
}

export function tryMove(amount, automated = false) {
  if (state.anim) return;
  if (!automated) hooks.cancelAutoReturn(false);
  const currentDir = amount > 0 ? DIRS[state.dir] : DIRS[(state.dir + 2) % 4];
  if (closedDoorOnCell(state.gridX, state.gridY, currentDir.key)) {
    hooks.playSe("blocked");
    state.shake = amount > 0 ? -12 : 9;
    const doorKind = getDoorKind(state.gridX, state.gridY, currentDir.key);
    if (doorKind === "boss") {
      hooks.say("＊ボス部屋用扉（未実装）Aボタンで開く");
    } else if (doorKind === "locked") {
      hooks.say("＊施錠扉（未実装）Aボタンで開く");
    } else {
      hooks.say("扉がある。\n＊Aボタンで開く");
    }
    return;
  }
  if (wallOnCell(state.gridX, state.gridY, currentDir.key)) {
    hooks.playSe("blocked");
    state.shake = amount > 0 ? -12 : 9;
    hooks.say("そちらには進めない。");
    return;
  }
  const nx = state.gridX + currentDir.dx;
  const ny = state.gridY + currentDir.dy;
  if (!inBounds(nx, ny)) {
    hooks.playSe("blocked");
    state.shake = amount > 0 ? -7 : 5;
    hooks.say("外周の向こうは闇に閉ざされている。");
    return;
  }
  state.stairsPromptDismissed = false;
  hooks.playSe("step");
  const crossedDoor = openDoorOnCell(state.gridX, state.gridY, currentDir.key)
    ? { x: state.gridX, y: state.gridY, dirKey: currentDir.key }
    : null;
  state.anim = {
    type: "move",
    start: performance.now(),
    duration: STEP_MS,
    fromX: state.x,
    fromY: state.y,
    fromGX: state.gridX,
    fromGY: state.gridY,
    toX: nx + .5,
    toY: ny + .5,
    toGX: nx,
    toGY: ny,
    cellType: getCellType(nx, ny),
    crossedDoor
  };
  state.shake = amount > 0 ? 3 : -2;
}

export function turn(amount, automated = false) {
  if (state.anim) return;
  if (!automated) hooks.cancelAutoReturn(false);
  const next = (state.dir + amount + 4) % 4;
  state.anim = {
    type: "turn",
    start: performance.now(),
    duration: TURN_MS,
    fromA: state.angle,
    toA: DIRS[next].angle,
    toDir: next
  };
  state.shake = amount > 0 ? 2 : -2;
}

export function manualMove(amount) {
  if (state.overlayEvent) return;
  if (state.autoReturning) {
    hooks.cancelAutoReturn(false);
    hooks.say("帰還を中断した。");
  }
  if (!state.anim) tryMove(amount);
}

export function manualTurn(amount) {
  if (state.overlayEvent) return;
  if (state.autoReturning) {
    hooks.cancelAutoReturn(false);
    hooks.say("帰還を中断した。");
  }
  if (!state.anim) turn(amount);
}

export function openDoorAhead() {
  if (state.overlayEvent || state.anim || state.autoReturning) return false;
  const dir = DIRS[state.dir];
  if (!closedDoorOnCell(state.gridX, state.gridY, dir.key)) return false;
  state.anim = {
    type: "door",
    start: performance.now(),
    duration: DOOR_OPEN_MS,
    x: state.gridX,
    y: state.gridY,
    dirKey: dir.key
  };
  hooks.playSe("door");
  hooks.say("ギィ……");
  return true;
}

export function handleOverlayEventInput(action) {
  if (!state.overlayEvent) return false;
  if (state.overlayEvent.type === "stairsTransition") return true;
  if (state.overlayEvent.type === "floorLap") {
    state.overlayEvent = null;
    hooks.say("");
    return true;
  }
  if (action === "cancel") {
    cancelOverlayEvent();
    return true;
  }
  if (action === "confirm") {
    if (state.overlayEvent.type === "npcTalk") advanceNpcTalkEvent();
    else if (state.overlayEvent.type === "stairsPrompt") confirmStairsPrompt();
    else if (state.overlayEvent.type === "randomEncounter") confirmRandomEncounter();
    else if (state.overlayEvent.type === "treasure") confirmTreasureEvent();
    return true;
  }
  return false;
}

export function startRandomEncounterNotice() {
  startOverlayEvent({
    type: "randomEncounter",
    showOverlay: true,
    overlayMessage: "＊　なにものかと　そうぐうした！　＊",
    message: "戦闘は未実装です。（Aボタンで次へ）"
  });
}

export function startFloorLapNotice(depth, lapTime) {
  startOverlayEvent({
    type: "floorLap",
    showOverlay: false,
    overlayMessage: `＊　B${depth}F　＊\n＊　LAP TIME ${lapTime}　＊`
  });
}

function confirmRandomEncounter() {
  state.overlayEvent = null;
  resetPresence();
  hooks.say("");
  updateNpcAwareness();
}

function startStairsPrompt(cellType) {
  state.stairsPromptDismissed = false;
  startOverlayEvent({
    type: "stairsPrompt",
    cellType,
    showOverlay: false,
    message: hooks.messageFor(state.gridX, state.gridY, cellType),
    canCancel: true
  });
}

function confirmStairsPrompt() {
  const cellType = state.overlayEvent?.cellType;
  state.stairsPromptDismissed = false;
  if (cellType === "stairsDown") {
    const transition = { type: "stairsTransition", canCancel: false };
    state.overlayEvent = transition;
    hooks.say("");
    hooks.playStairsSequence().finally(() => {
      if (state.overlayEvent !== transition) return;
      state.overlayEvent = null;
      hooks.descendFloor();
    });
    return;
  }
  state.overlayEvent = null;
  hooks.say("地上への帰還はまだ実装されていません。");
}

export function resumeDismissedStairsPrompt() {
  if (!state.stairsPromptDismissed || state.overlayEvent || state.anim) return false;
  const cellType = getCellType(state.gridX, state.gridY);
  if (cellType !== "stairsUp" && cellType !== "stairsDown") {
    state.stairsPromptDismissed = false;
    return false;
  }
  startStairsPrompt(cellType);
  return true;
}

export function playArrivalSequence() {
  if (state.overlayEvent || state.anim) return Promise.resolve(false);
  const transition = { type: "stairsTransition", canCancel: false };
  state.overlayEvent = transition;
  return hooks.playStairsSequence().finally(() => {
    if (state.overlayEvent === transition) state.overlayEvent = null;
  });
}

function startNpcTalkEvent(npc, fromGX, fromGY) {
  const encounterCount = getNpcEncounterCount(npc.id);
  const encounter = getNpcEncounter(npc, encounterCount);
  const greeting = npc.greeting ? `${npc.name}「${npc.greeting}」\n` : "";
  startOverlayEvent({
    type: "npcTalk",
    imageId: npc.imageId,
    npc,
    fromGX,
    fromGY,
    npcGX: state.gridX,
    npcGY: state.gridY,
    dialogue: encounter?.dialogue || [],
    dialogueIndex: -1,
    encounterCount,
    leaveAfterTalk: encounter?.leaveAfterTalk || false,
    message: `${greeting}＊Aボタンで会話　Bボタンで抜けます`,
    canCancel: npc.canCancel,
    retreatOnCancel: npc.retreatOnCancel
  });
}

function startTreasureEvent(treasureType, fromGX, fromGY) {
  startOverlayEvent({
    type: "treasure",
    treasureType,
    phase: "prompt",
    fromGX,
    fromGY,
    treasureGX: state.gridX,
    treasureGY: state.gridY,
    message: "宝箱がある。開けますか？\n＊Aボタンで開ける　Bボタンで開けずに立ち去る",
    canCancel: true,
    retreatOnCancel: true
  });
  hooks.showTreasure(treasureType);
}

function confirmTreasureEvent() {
  const event = state.overlayEvent;
  if (!event || event.phase !== "prompt") return;
  event.phase = "opening";
  hooks.playSe("door");
  event.canCancel = false;
  hooks.say("");
  hooks.playTreasureOpening(event.treasureType, () => {
    if (state.overlayEvent !== event) return;
    removeTreasureAt(event.treasureGX, event.treasureGY);
    state.overlayEvent = null;
    hooks.hideTreasure();
    if (event.treasureType === "black") {
      hooks.say("宝箱はミミックだった！（未実装）");
    } else if (event.treasureType === "gold") {
      hooks.say("中にはレアアイテムが…入っていなかった！");
    } else {
      hooks.say("中には何も入っていなかった！");
    }
    updateNpcAwareness();
    hooks.onStateChanged();
  });
}

function advanceNpcTalkEvent() {
  const event = state.overlayEvent;
  if (event.typing?.active) {
    completeNpcTypewriter(event);
    return;
  }
  const nextIndex = event.dialogueIndex + 1;
  if (nextIndex < event.dialogue.length) {
    event.dialogueIndex = nextIndex;
    startNpcTypewriter(event, event.dialogue[nextIndex]);
    return;
  }

  stopNpcTypewriter();
  state.npcEncounterCounts[event.npc.id] = event.encounterCount + 1;
  state.overlayEvent = null;
  if (event.leaveAfterTalk) {
    removeNpcAt(event.npcGX, event.npcGY);
    hooks.say(`${event.npc.name}は去っていった。`);
    hooks.onStateChanged();
    return;
  }

  hooks.say("");
  hooks.onStateChanged();
  startNpcRetreat(event);
}

export function getNpcEncounterCount(npcId) {
  return state.npcEncounterCounts[npcId] || 0;
}

export function startOverlayEvent(event) {
  stopNpcTypewriter();
  state.overlayEvent = {
    canCancel: false,
    retreatOnCancel: false,
    showOverlay: true,
    ...event
  };
  state.npcAwarenessShown = false;
  hooks.cancelAutoReturn(false);
  if (state.overlayEvent.message) hooks.say(state.overlayEvent.message);
}

function cancelOverlayEvent() {
  const event = state.overlayEvent;
  if (!event?.canCancel) return;
  stopNpcTypewriter();
  if (event.type === "stairsPrompt") state.stairsPromptDismissed = true;
  state.overlayEvent = null;
  hooks.say("");
  if (event.type === "treasure") {
    discoverTreasureAt(event.treasureGX, event.treasureGY);
    hooks.hideTreasure();
  }
  hooks.onStateChanged();
  if (event.retreatOnCancel) startNpcRetreat(event);
}

function startNpcTypewriter(event, dialogue) {
  stopNpcTypewriter();
  const characters = Array.from(dialogue);
  event.typing = { active: npcTypewriter.enabled && characters.length > 0, characters, visibleLength: npcTypewriter.enabled ? 0 : characters.length };
  renderNpcTypewriter(event);
  if (event.typing.active) scheduleNpcTypewriter(event);
}

function scheduleNpcTypewriter(event) {
  npcTypewriter.timer = window.setTimeout(() => {
    if (state.overlayEvent !== event || !event.typing?.active) return;
    event.typing.visibleLength += 1;
    if (event.typing.visibleLength >= event.typing.characters.length) event.typing.active = false;
    renderNpcTypewriter(event);
    if (event.typing.active) scheduleNpcTypewriter(event);
    else npcTypewriter.timer = 0;
  }, NPC_TYPEWRITER_DELAYS[npcTypewriter.speed]);
}

function renderNpcTypewriter(event) {
  const typing = event.typing;
  const dialogue = typing.characters.slice(0, typing.visibleLength).join("");
  const closingQuote = typing.active ? "" : "」";
  hooks.say(`${event.npc.name}「${dialogue}${closingQuote}\n＊Aボタンで次へ`);
}

function completeNpcTypewriter(event) {
  if (!event.typing) return;
  stopNpcTypewriter();
  event.typing.visibleLength = event.typing.characters.length;
  event.typing.active = false;
  renderNpcTypewriter(event);
}

function stopNpcTypewriter() {
  if (npcTypewriter.timer) window.clearTimeout(npcTypewriter.timer);
  npcTypewriter.timer = 0;
}

function startNpcRetreat(event) {
  if (state.anim) return;
  state.anim = {
    type: "move",
    start: performance.now(),
    duration: STEP_MS,
    fromX: state.x,
    fromY: state.y,
    toX: event.fromGX + .5,
    toY: event.fromGY + .5,
    toGX: event.fromGX,
    toGY: event.fromGY,
    cellType: getCellType(event.fromGX, event.fromGY),
    npcRetreat: true
  };
}

function updateNpcAwareness() {
  if (state.overlayEvent) return;
  const dir = DIRS[state.dir];
  const isBlocked = wallOnCell(state.gridX, state.gridY, dir.key);
  const npc = isBlocked ? null : getNpcAt(state.gridX + dir.dx, state.gridY + dir.dy);
  if (npc) {
    state.npcAwarenessShown = true;
    hooks.say(NPC_AWARENESS_MESSAGE);
  } else if (state.npcAwarenessShown) {
    state.npcAwarenessShown = false;
    hooks.say("");
  }
}

export function turnToward(from, to) {
  const diff = (to - from + 4) % 4;
  return diff === 3 ? -1 : 1;
}

export function normalize(a) {
  while (a <= -Math.PI) a += TAU;
  while (a > Math.PI) a -= TAU;
  return a;
}

export function angleDelta(from, to) {
  return normalize(to - from);
}
