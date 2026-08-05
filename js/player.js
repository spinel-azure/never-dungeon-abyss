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
  setDoor,
  getStartPosition,
  getNpcAt,
  getBossAt,
  removeNpcAt,
  getFountainAt,
  removeFountainAt,
  getTreasureAt,
  getTreasureTrapAt,
  getTreasureEventAt,
  removeTreasureAt,
  discoverTreasureAt
} from "./dungeon.js";
import { getNpcEncounter } from "../data/npcs.js";
import { HEALING_FOUNTAIN } from "../data/fountains.js";
import { onPlayerStep, resetPresence } from "./presence.js";

const hooks = {
  say: () => {},
  cancelAutoReturn: () => {},
  continueAutoReturn: () => {},
  messageFor: () => "",
  getDescendBlockMessage: () => "",
  descendFloor: () => {},
  playSe: () => {},
  playStairsSequence: () => Promise.resolve(),
  runStairsTransition: (onDark) => Promise.resolve().then(onDark),
  showTreasure: () => {},
  playTreasureOpening: (_type, onComplete) => onComplete(),
  hideTreasure: () => {},
  resolveTreasureTrap: () => ({ message: "" }),
  awardTreasure: () => ({ message: "中には何も入っていなかった！" }),
  unlockBossDoor: () => ({ accepted: false, message: "鍵がかかっている。" }),
  beginBossBattle: () => false,
  restAtFountain: () => Promise.resolve(false),
  returnToTown: () => {},
  beginBattle: () => {},
  playNpcVoice: () => {},
  onDungeonStep: () => {},
  onStateChanged: () => {}
};

const NPC_AWARENESS_MESSAGE = "前方に何かいるようだ";

const TORCH_FUEL_MAX = 100;
const TORCH_FUEL_STEP = 1;
const DOOR_OPEN_MS = 520;
const NPC_TYPEWRITER_DELAYS = { slow: 75, normal: 42, fast: 20 };
const npcTypewriter = { enabled: true, speed: "normal", timer: 0 };
let torchFuelDisabled = false;
let playerInputEnabled = true;

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
    treasureCompassActive: false,
    autoReturning: false,
    autoWalkerActive: false,
    autoReturnPaused: false,
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
  state.autoWalkerActive = false;
  state.autoReturnPaused = false;
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

export function setPlayerInputEnabled(enabled) {
  playerInputEnabled = Boolean(enabled);
  if (!playerInputEnabled) {
    if (!state.autoWalkerActive) {
      state.autoReturning = false;
      state.autoPath = [];
    }
  }
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
        hooks.onDungeonStep();
        const npc = getNpcAt(state.gridX, state.gridY);
        const bossId = getBossAt(state.gridX, state.gridY);
        const fountain = getFountainAt(state.gridX, state.gridY);
        const treasure = getTreasureAt(state.gridX, state.gridY);
        const isStairs = a.cellType === "stairsUp" || a.cellType === "stairsDown";
        const isSpecialEventCell = Boolean(npc) || Boolean(bossId) || Boolean(fountain) || Boolean(treasure) || isStairs;
        const encounterTriggered = !isSpecialEventCell && onPlayerStep({ inDarkness: movedInDarkness });
        if (encounterTriggered && state.autoWalkerActive) state.autoReturnPaused = true;
        else if (encounterTriggered) hooks.cancelAutoReturn(false);
        if (bossId) {
          startBossEvent(bossId, a.fromGX, a.fromGY);
        } else if (npc) {
          startNpcTalkEvent(npc, a.fromGX, a.fromGY);
        } else if (fountain) {
          startFountainEvent(a.fromGX, a.fromGY);
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
  if (!playerInputEnabled) return;
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
  if (!playerInputEnabled) return;
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
  if (!playerInputEnabled) return;
  if (state.overlayEvent) return;
  if (state.autoReturning) {
    hooks.cancelAutoReturn(false);
    hooks.say("帰還を中断した。");
  }
  if (!state.anim) tryMove(amount);
}

export function manualTurn(amount) {
  if (!playerInputEnabled) return;
  if (state.overlayEvent) return;
  if (state.autoReturning) {
    hooks.cancelAutoReturn(false);
    hooks.say("帰還を中断した。");
  }
  if (!state.anim) turn(amount);
}

export function openDoorAhead(automated = false) {
  if (!playerInputEnabled) return false;
  if (state.overlayEvent || state.anim || (state.autoReturning && !automated)) return false;
  const dir = DIRS[state.dir];
  if (!closedDoorOnCell(state.gridX, state.gridY, dir.key)) return false;
  if (getDoorKind(state.gridX, state.gridY, dir.key) === "boss") {
    const result = hooks.unlockBossDoor({ x: state.gridX, y: state.gridY, dirKey: dir.key }) || {};
    if (!result.accepted) {
      hooks.playSe("blocked");
      hooks.say(result.message || "赤い扉には鍵がかかっている。");
      return true;
    }
    setDoor(state.gridX, state.gridY, dir.key, "closed", "bossUnlocked");
    hooks.say(result.message || "赤錆びた鍵を使った。赤い扉の鍵が開いた。");
  }
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
    else if (state.overlayEvent.type === "bossPrompt") confirmBossEvent();
    else if (state.overlayEvent.type === "fountain") confirmFountainEvent();
    else if (state.overlayEvent.type === "stairsPrompt") confirmStairsPrompt();
    else if (state.overlayEvent.type === "treasure") confirmTreasureEvent();
    return true;
  }
  return false;
}

export function startRandomEncounterNotice() {
  startEncounterNotice("normal");
}

export function startAmbushEncounterNotice() {
  startEncounterNotice("ambush");
}

export function startBattleTreasureEvent(treasureType, trapId, victoryMessage = "") {
  const typeLabel = treasureType === "red" ? "赤い宝箱" : treasureType === "black" ? "黒い宝箱" : "金色の宝箱";
  startOverlayEvent({
    type: "treasure",
    treasureType,
    trapId: trapId || null,
    phase: "prompt",
    transientAfterBattle: true,
    message: `${victoryMessage ? `${victoryMessage}\n` : ""}${typeLabel}がある。開けますか？\n＊Aボタン：はい　Bボタン：開けずに立ち去る。（宝箱はなくなります）`,
    canCancel: true,
    retreatOnCancel: false
  });
  hooks.showTreasure(treasureType);
}

function startEncounterNotice(encounterType) {
  const ambush = encounterType === "ambush";
  startOverlayEvent({
    type: "randomEncounter",
    showOverlay: true,
    encounterType: ambush ? "ambush" : "normal",
    encounterLabel: ambush ? "AMBUSH!!" : "ENCOUNTER!!",
    encounterAnimationStartedAt: performance.now(),
    message: ""
  });
  const encounterEvent = state.overlayEvent;
  hooks.say("");
  hooks.playSe("battleStart");
  encounterEvent.autoStartTimer = window.setTimeout(() => {
    if (state.overlayEvent === encounterEvent) confirmRandomEncounter();
  }, 1400);
}

export function startFloorLapNotice(depth, lapTime) {
  startOverlayEvent({
    type: "floorLap",
    showOverlay: false,
    overlayMessage: `＊　B${depth}F　＊\n＊　LAP TIME ${lapTime}　＊`
  });
}

function confirmRandomEncounter() {
  if (state.overlayEvent?.autoStartTimer) {
    window.clearTimeout(state.overlayEvent.autoStartTimer);
  }
  state.overlayEvent = null;
  resetPresence();
  hooks.say("");
  hooks.beginBattle();
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

function startBossEvent(bossId, fromGX, fromGY) {
  startOverlayEvent({
    type: "bossPrompt",
    bossId,
    fromGX,
    fromGY,
    message: "部屋の中央に騎士の彫像がある。まるで行く手を遮っているようだ。調べてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
    canCancel: true,
    retreatOnCancel: true
  });
}

function confirmBossEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "bossPrompt") return;
  event.canCancel = false;
  hooks.say("あなたが近づいた途端、彫像が動き出した！こちらに向かってくる！");
  const timer = window.setTimeout(() => {
    if (state.overlayEvent !== event) return;
    state.overlayEvent = null;
    hooks.beginBossBattle(event.bossId);
  }, 1000);
  event.autoStartTimer = timer;
}

function confirmStairsPrompt() {
  const cellType = state.overlayEvent?.cellType;
  state.stairsPromptDismissed = false;
  if (cellType === "stairsDown") {
    const blockedMessage = hooks.getDescendBlockMessage();
    if (blockedMessage) {
      state.overlayEvent = null;
      hooks.say(blockedMessage);
      hooks.onStateChanged();
      return;
    }
    const transition = { type: "stairsTransition", canCancel: false };
    state.overlayEvent = transition;
    hooks.say("");
    hooks.runStairsTransition(() => hooks.descendFloor()).finally(() => {
      if (state.overlayEvent === transition) state.overlayEvent = null;
    });
    return;
  }
  const transition = { type: "stairsTransition", canCancel: false };
  state.overlayEvent = transition;
  hooks.say("");
  hooks.runStairsTransition(() => hooks.returnToTown()).finally(() => {
    if (state.overlayEvent === transition) state.overlayEvent = null;
  });
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

function startFountainEvent(fromGX, fromGY) {
  startOverlayEvent({
    type: "fountain",
    imageId: HEALING_FOUNTAIN.id,
    phase: "prompt",
    fromGX,
    fromGY,
    fountainGX: state.gridX,
    fountainGY: state.gridY,
    message: "癒やしの噴水がある。ここで休息できそうだ。休みますか？\n＊Aボタン：はい　Bボタン：いいえ",
    canCancel: true,
    retreatOnCancel: true
  });
}

function confirmFountainEvent() {
  const event = state.overlayEvent;
  if (!event || event.phase !== "prompt") return;
  event.phase = "resting";
  event.canCancel = false;
  hooks.say("");
  Promise.resolve(hooks.restAtFountain()).then(rested => {
    if (state.overlayEvent !== event) return;
    if (!rested) {
      event.phase = "prompt";
      event.canCancel = true;
      hooks.say(event.message);
      return;
    }
    removeFountainAt(event.fountainGX, event.fountainGY);
    state.overlayEvent = null;
    hooks.say("癒やしの噴水で休息した。HPとSPが全回復した。");
    updateNpcAwareness();
    hooks.onStateChanged();
  });
}

function startTreasureEvent(treasureType, fromGX, fromGY) {
  startOverlayEvent({
    type: "treasure",
    treasureType,
    trapId: getTreasureTrapAt(state.gridX, state.gridY),
    eventTreasureId: getTreasureEventAt(state.gridX, state.gridY),
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
  const trapResult = hooks.resolveTreasureTrap(event.treasureType, event.trapId) || {};
  hooks.playSe("door");
  event.canCancel = false;
  hooks.say("");
  hooks.playTreasureOpening(event.treasureType, () => {
    if (state.overlayEvent !== event) return;
    if (!event.transientAfterBattle) removeTreasureAt(event.treasureGX, event.treasureGY);
    state.overlayEvent = null;
    hooks.hideTreasure();
    const trapMessage = trapResult.message ? `${trapResult.message}\n` : "";
    if (event.treasureType === "red") {
      const reward = hooks.awardTreasure(event.treasureType, event.eventTreasureId) || {};
      hooks.say(`${trapMessage}${reward.message || "戦利品をロット袋へ入れた。"}`);
    } else if (event.treasureType === "black") {
      hooks.say(`${trapMessage}宝箱はミミックだった！（未実装）`);
    } else if (event.treasureType === "gold") {
      const reward = hooks.awardTreasure(event.treasureType, event.eventTreasureId) || {};
      hooks.say(`${trapMessage}${reward.message || "中にはレアアイテムが…入っていなかった！"}`);
    } else {
      hooks.say(`${trapMessage}中には何も入っていなかった！`);
    }
    updateNpcAwareness();
    hooks.onStateChanged();
    resumeAutoReturnAfterTransientTreasure(event);
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
    if (!event.transientAfterBattle) discoverTreasureAt(event.treasureGX, event.treasureGY);
    hooks.hideTreasure();
  }
  hooks.onStateChanged();
  if (event.retreatOnCancel) startNpcRetreat(event);
  resumeAutoReturnAfterTransientTreasure(event);
}

function resumeAutoReturnAfterTransientTreasure(event) {
  if (!event?.transientAfterBattle) return;
  state.autoReturnPaused = false;
  if (state.autoWalkerActive) window.setTimeout(hooks.continueAutoReturn, 0);
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
  if (!typing.active && !event.voicePlayed && Array.isArray(event.npc.voiceSe) && event.npc.voiceSe.length) {
    event.voicePlayed = true;
    hooks.playNpcVoice(event.npc.voiceSe[Math.floor(Math.random() * event.npc.voiceSe.length)]);
  }
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
