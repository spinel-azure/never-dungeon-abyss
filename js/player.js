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
  getBossRemainsAt,
  removeNpcAt,
  getFountainAt,
  getFixedWarpAt,
  getFixedEventAt,
  removeFixedEventAt,
  getQuicksandAt,
  getRapidCurrentAt,
  discoverRapidCurrent,
  removeFountainAt,
  getTreasureAt,
  getTreasureTrapAt,
  getTreasureEventAt,
  removeTreasureAt,
  discoverTreasureAt,
  getSpecialRoomEntryAt,
  getSpecialRoomAt,
  getQuestEventAt,
  removeQuestEventAt
} from "./dungeon.js";
import { getNpcEncounter } from "../data/npcs.js";
import { DESERT_OASIS, DESERT_OASIS_MIRAGE, getFountainById } from "../data/fountains.js";
import { getBossById } from "../data/bosses.js";
import { getFloorZoneName } from "../data/floor-zone-names.js";
import { onExplorationStep, resetPresence } from "./presence.js";
import { getRapidCurrentForcedPath, RAPID_CURRENT, RAPID_CURRENT_DIRECTIONS } from "../data/rapid-currents.js";

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
  runQuicksandTransition: (onDark) => Promise.resolve().then(onDark),
  runFixedWarpTransition: (onDark) => Promise.resolve().then(onDark),
  startRapidCurrentFlow: () => {},
  stopRapidCurrentFlow: () => {},
  showTreasure: () => {},
  playTreasureOpening: (_type, onComplete) => onComplete(),
  hideTreasure: () => {},
  resolveTreasureTrap: () => ({ message: "" }),
  awardTreasure: () => ({ message: "中には何も入っていなかった！" }),
  unlockBossDoor: () => ({ accepted: false, message: "鍵がかかっている。" }),
  getBossRoomEntryBlock: () => ({ blocked: false }),
  getSpecialDoorLockInfo: () => null,
  getSpecialDoorAccessBlock: () => ({ blocked: false }),
  attemptSpecialDoorUnlock: () => ({ accepted: false }),
  isBossDefeated: () => false,
  isBossRematch: () => false,
  isBossRetryBlocked: () => false,
  getBossEncounterImageId: boss => boss?.encounterImageId || boss?.imageId || "",
  getBossEncounterPrompt: boss => boss?.event?.prompt,
  getBossStartMessage: boss => boss?.event?.start,
  hasSphinxAnswer: () => false,
  onSphinxRiddleHeard: () => false,
  onSphinxPeaceResolved: () => ({ accepted: false }),
  beginBossBattle: () => false,
  beginMimicBattle: () => false,
  restAtFountain: () => Promise.resolve(false),
  returnToTown: () => {},
  beginBattle: () => {},
  beginRareEnemyBattle: () => false,
  beginQuestEnemyBattle: () => false,
  inspectWaspHive: () => ({ canBattle: false, message: "巨大な蜂の巣がある。" }),
  inspectKirkeHouse: () => ({ canDeliver: false, message: "巨大な蔓に囲まれた家が建っている。" }),
  deliverBeeswaxToKirke: () => ({ accepted: false, message: "" }),
  playNpcVoice: () => {},
  onNpcEncountered: () => {},
  isQueenShadowFinaleCompleted: () => false,
  onQueenShadowFinaleComplete: () => false,
  isSecondQueenShadowFinaleCompleted: () => false,
  onSecondQueenShadowFinaleComplete: () => false,
  isThirdQueenShadowFinaleCompleted: () => false,
  onThirdQueenShadowFinaleComplete: () => false,
  onQuestEvent: () => "",
  onFixedFloorEvent: () => "",
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
let torchConsumptionDisabledByCard = false;
let playerInputEnabled = true;
let rapidCurrentTransitionToken = 0;
const rapidCurrentTimers = new Set();
let rapidCurrentRejectUntil = 0;

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
    torchEffectForced: false,
    minimapEffectForced: false,
    lightbringerActive: false,
    treasureCompassActive: false,
    autoReturning: false,
    autoWalkerActive: false,
    autoReturnPaused: false,
    autoPath: [],
    overlayEvent: null,
    npcAwarenessShown: false,
    npcEncounterCounts: {},
    stairsPromptDismissed: false,
    rapidCurrentTransitionActive: false,
    rapidCurrentMotionStartedAt: 0
  };
}

export function resetPlayer(startDir) {
  cancelRapidCurrentTransition();
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

export function setTorchCardEffects({ consumptionDisabled = false, effectForced = false } = {}) {
  torchConsumptionDisabledByCard = Boolean(consumptionDisabled);
  state.torchEffectForced = Boolean(effectForced);
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

export function isPlayerInputEnabled() {
  return playerInputEnabled;
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
        const movedInDarkness = state.torchFuel <= 0 && !state.torchEffectForced && !state.lightbringerActive;
        if (!torchFuelDisabled && !torchConsumptionDisabledByCard) {
          state.torchFuel = Math.max(0, state.torchFuel - TORCH_FUEL_STEP);
        }
        hooks.onDungeonStep();
        const npc = getNpcAt(state.gridX, state.gridY);
        const bossId = getBossAt(state.gridX, state.gridY);
        const bossRemainsId = getBossRemainsAt(state.gridX, state.gridY);
        const fountain = getFountainAt(state.gridX, state.gridY);
        const fixedWarp = getFixedWarpAt(state.gridX, state.gridY);
        const fixedEvent = getFixedEventAt(state.gridX, state.gridY);
        const quicksand = getQuicksandAt(state.gridX, state.gridY);
        const rapidCurrent = getRapidCurrentAt(state.gridX, state.gridY);
        const treasure = getTreasureAt(state.gridX, state.gridY);
        const specialRoom = getSpecialRoomAt(state.gridX, state.gridY);
        const questEvent = getQuestEventAt(state.gridX, state.gridY);
        const isStairs = a.cellType === "stairsUp" || a.cellType === "stairsDown";
        const isSpecialEventCell = Boolean(npc) || Boolean(bossId) || Boolean(bossRemainsId) || Boolean(fountain) || Boolean(fixedWarp) || Boolean(fixedEvent) || Boolean(quicksand) || Boolean(rapidCurrent) || Boolean(treasure) || Boolean(questEvent) || Boolean(specialRoom?.content) || isStairs;
        const encounterTriggered = onExplorationStep({
          autoWalkerActive: state.autoWalkerActive,
          isSpecialEventCell,
          inDarkness: movedInDarkness
        });
        if (encounterTriggered) hooks.cancelAutoReturn(false);
        if (fixedWarp) {
          startFixedFloorWarpEvent(fixedWarp);
        } else if (bossId) {
          startBossEvent(bossId, a.fromGX, a.fromGY);
        } else if (bossRemainsId) {
          startBossRemainsEvent(bossRemainsId);
        } else if (npc) {
          startNpcTalkEvent(npc, a.fromGX, a.fromGY);
        } else if (fountain) {
          startFountainEvent(fountain, a.fromGX, a.fromGY);
        } else if (fixedEvent) {
          startFixedFloorEvent(fixedEvent);
        } else if (quicksand) {
          startQuicksandEvent(quicksand);
        } else if (rapidCurrent) {
          startRapidCurrentEvent(rapidCurrent, a.fromGX, a.fromGY);
        } else if (treasure) {
          startTreasureEvent(treasure, a.fromGX, a.fromGY);
        } else if (questEvent) {
          const message = hooks.onQuestEvent(questEvent) || "手掛かりを見つけた。";
          removeQuestEventAt(state.gridX, state.gridY);
          hooks.say(message);
        } else if (specialRoom?.content) {
          startSpecialRoomContentEvent(specialRoom.content, a.fromGX, a.fromGY);
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
      hooks.say(getDoorKind(a.x, a.y, a.dirKey) === "specialUnlocked"
        ? "解錠に成功した！\n黒い扉が　ひらいた。"
        : "扉が　ひらいた。");
      updateNpcAwareness();
    }
    state.anim = null;
    hooks.onStateChanged();
    if (a.type === "door" && a.enterAfterOpening) {
      tryMove(a.entryMoveAmount || 1, false, true);
      return;
    }
    if (state.autoReturning) hooks.continueAutoReturn();
  }
}

function startFixedFloorWarpEvent(warp) {
  startOverlayEvent({
    type: "fixedFloorWarp",
    warp: structuredClone(warp),
    showOverlay: true,
    imageId: "warp_portal_b100f",
    glow: "paleBlue",
    message: "足を踏み入れた途端、転送陣がまばゆい光に包まれる――――！\n＊Aボタンで次へ",
    canCancel: false
  });
}

function confirmFixedFloorWarpEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "fixedFloorWarp") return;
  const transition = { type: "fixedWarpTransition", canCancel: false };
  state.overlayEvent = transition;
  hooks.say("");
  hooks.runFixedWarpTransition(() => applyFixedFloorWarp(event.warp)).finally(() => {
    if (state.overlayEvent === transition) state.overlayEvent = null;
    hooks.onStateChanged();
  });
}

function applyFixedFloorWarp(warp) {
  const target = warp?.to;
  if (!target || !inBounds(target.x, target.y)) return false;
  hooks.cancelAutoReturn(false);
  state.gridX = target.x;
  state.gridY = target.y;
  state.x = target.x + .5;
  state.y = target.y + .5;
  const facingIndex = DIRS.findIndex(direction => direction.key === warp?.facing);
  if (facingIndex >= 0) {
    state.dir = facingIndex;
    state.angle = DIRS[facingIndex].angle;
  }
  markExplored(target.x, target.y);
  state.npcAwarenessShown = false;
  hooks.onStateChanged();
  return true;
}

export function tryMove(amount, automated = false, specialEntryConfirmed = false) {
  if (!playerInputEnabled) return;
  if (state.anim) return;
  if (!automated) hooks.cancelAutoReturn(false);
  const currentDir = amount > 0 ? DIRS[state.dir] : DIRS[(state.dir + 2) % 4];
  const currentDoorKind = getDoorKind(state.gridX, state.gridY, currentDir.key);
  if (currentDoorKind === "specialLocked" && !openDoorOnCell(state.gridX, state.gridY, currentDir.key)) {
    hooks.playSe("blocked");
    state.shake = amount > 0 ? -12 : 9;
    startSpecialDoorLockEvent(state.gridX, state.gridY, currentDir.key);
    return;
  }
  if (closedDoorOnCell(state.gridX, state.gridY, currentDir.key)) {
    hooks.playSe("blocked");
    state.shake = amount > 0 ? -12 : 9;
    const doorKind = getDoorKind(state.gridX, state.gridY, currentDir.key);
    if (doorKind === "boss") {
      hooks.say("＊ボス部屋用扉（未実装）Aボタンで開く");
    } else if (doorKind === "specialLocked") {
      startSpecialDoorLockEvent(state.gridX, state.gridY, currentDir.key);
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
  const destinationCurrent = getRapidCurrentAt(nx, ny);
  if (destinationCurrent && destinationCurrent.direction !== currentDir.key) {
    if (performance.now() >= rapidCurrentRejectUntil) {
      rapidCurrentRejectUntil = performance.now() + 650;
      hooks.playSe("blocked");
      hooks.say("流れが激しく、こちらから進むことはできない。");
    }
    if (automated) hooks.cancelAutoReturn(false);
    return;
  }
  const bossRoomBlock = hooks.getBossRoomEntryBlock({ fromX: state.gridX, fromY: state.gridY, toX: nx, toY: ny }) || {};
  if (bossRoomBlock.blocked) {
    hooks.playSe("blocked");
    hooks.say(bossRoomBlock.message || "今はこれ以上進むべきではない…。");
    if (automated) hooks.cancelAutoReturn(false);
    return;
  }
  const specialRoomEntry = openDoorOnCell(state.gridX, state.gridY, currentDir.key)
    ? getSpecialRoomEntryAt(state.gridX, state.gridY, currentDir.key)
    : null;
  const specialRoomBossDefeated = Boolean(
    specialRoomEntry?.content?.bossId
    && hooks.isBossDefeated(specialRoomEntry.content.bossId)
  );
  const specialRoomWarningMessage = !specialRoomBossDefeated && (specialRoomEntry?.content?.accessConfirmMessage
    || (specialRoomEntry?.dangerWarning
      ? "扉の向こうから、身の毛もよだつような気配を感じる。\nそれでも中へ入りますか？\n＊Aボタン：入る　Bボタン：立ち去る"
      : ""));
  if (amount > 0 && specialRoomWarningMessage && !specialEntryConfirmed) {
    startOverlayEvent({
      type: "specialRoomWarning",
      showOverlay: false,
      moveAmount: amount,
      canCancel: true,
      message: specialRoomWarningMessage
    });
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
  const doorKind = getDoorKind(state.gridX, state.gridY, dir.key);
  if (doorKind === "specialLocked") {
    startSpecialDoorLockEvent(state.gridX, state.gridY, dir.key);
    return true;
  }
  if (!closedDoorOnCell(state.gridX, state.gridY, dir.key)) return false;
  if (doorKind === "boss") {
    const result = hooks.unlockBossDoor({ x: state.gridX, y: state.gridY, dirKey: dir.key }) || {};
    if (!result.accepted) {
      hooks.playSe("blocked");
      hooks.say(result.message || "赤い扉には鍵がかかっている。");
      return true;
    }
    setDoor(state.gridX, state.gridY, dir.key, "closed", "bossUnlocked");
    hooks.say(result.message || "赤錆びた鍵を使った。赤い扉の鍵が開いた。");
  }
  startDoorOpening(state.gridX, state.gridY, dir.key);
  return true;
}

function startDoorOpening(x, y, dirKey, message = "ギィ……") {
  state.anim = {
    type: "door",
    start: performance.now(),
    duration: DOOR_OPEN_MS,
    x,
    y,
    dirKey
  };
  hooks.playSe("door");
  hooks.say(message);
}

function startSpecialDoorLockEvent(x, y, dirKey) {
  const access = hooks.getSpecialDoorAccessBlock({ x, y, dirKey }) || {};
  if (access.blocked) {
    hooks.playSe("blocked");
    hooks.say(access.message || "今はこの扉を開けられないようだ。");
    return;
  }
  if (access.confirmAfterUnlock) {
    const result = hooks.attemptSpecialDoorUnlock({ x, y, dirKey }) || {};
    if (result.unlocked) {
      startDoorOpening(x, y, dirKey, "12星座の紋様が妖しく輝いた。\nギィ……");
      hooks.onStateChanged();
      return;
    }
    hooks.playSe("blocked");
    hooks.say("扉は固く閉ざされている。");
    return;
  }
  if (access.confirmMessage) {
    startOverlayEvent({
      type: "specialDoorAccessConfirm",
      showOverlay: false,
      x,
      y,
      dirKey,
      canCancel: true,
      message: access.confirmMessage
    });
    return;
  }
  const info = hooks.getSpecialDoorLockInfo({ x, y, dirKey }) || {};
  startOverlayEvent({
    type: "specialDoorLock",
    showOverlay: false,
    x,
    y,
    dirKey,
    canCancel: true,
    message: specialDoorPrompt(info)
  });
}

function confirmSpecialDoorAccessEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "specialDoorAccessConfirm") return;
  state.overlayEvent = null;
  setDoor(event.x, event.y, event.dirKey, "closed", "specialUnlocked");
  startDoorOpening(event.x, event.y, event.dirKey, "12星座の紋様が妖しく輝いた。\nギィ……");
  state.anim.enterAfterOpening = true;
  state.anim.entryMoveAmount = event.dirKey === DIRS[state.dir].key ? 1 : -1;
  hooks.onStateChanged();
}

function specialDoorPrompt(info, failed = false) {
  const remaining = Math.max(0, Math.floor(Number(info?.remaining) || 0));
  if (remaining <= 0) {
    return "解錠に失敗した。\nこの探索中は、もう解錠を試みられない。\n＊Bボタン：立ち去る";
  }
  const rate = Math.max(0, Math.min(100, Math.round((Number(info?.rate) || 0) * 100)));
  return failed
    ? `解錠に失敗した。黒い扉はまだ開かない。\n再び解錠を試みますか？（成功率：${rate}％　残り${remaining}回）\n＊Aボタン：挑戦　Bボタン：立ち去る`
    : `黒い扉には複雑な錠前が掛けられている。\n解錠を試みますか？（成功率：${rate}％　残り${remaining}回）\n＊Aボタン：挑戦　Bボタン：立ち去る`;
}

function confirmSpecialDoorLockEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "specialDoorLock") return;
  const result = hooks.attemptSpecialDoorUnlock({ x: event.x, y: event.y, dirKey: event.dirKey }) || {};
  if (!result.accepted) {
    event.canCancel = true;
    hooks.say(specialDoorPrompt(result, true));
    return;
  }
  if (result.unlocked) {
    state.overlayEvent = null;
    startDoorOpening(event.x, event.y, event.dirKey, "解錠に成功した！\nギィ……");
    hooks.onStateChanged();
    return;
  }
  event.canCancel = true;
  event.message = specialDoorPrompt(result, true);
  hooks.playSe("blocked");
  hooks.say(event.message);
  hooks.onStateChanged();
}

function confirmSpecialRoomWarningEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "specialRoomWarning") return;
  state.overlayEvent = null;
  hooks.say("");
  tryMove(event.moveAmount, false, true);
}

function startSpecialRoomContentEvent(content, fromGX, fromGY) {
  if (content?.type === "waspHive") {
    const result = hooks.inspectWaspHive();
    startOverlayEvent({
      type: "waspHive", content, canBattle: Boolean(result?.canBattle),
      imageId: content.imageId || "", imageFit: "cover", showOverlay: true, canCancel: false,
      message: `${result?.message || "巨大な蜂の巣がある。"}\n＊Aボタン：${result?.canBattle ? "次へ" : "戻る"}`
    });
    return;
  }
  if (content?.type === "kirkeHouse") {
    const result = hooks.inspectKirkeHouse();
    startOverlayEvent({
      type: "kirkeHouse", content, canDeliver: Boolean(result?.canDeliver), phase: "house",
      imageId: content.imageId,
      imageFit: "cover", showOverlay: true, canCancel: false,
      message: `${result?.message || "巨大な蔓に囲まれて今にも朽ちそうな家が建っている。"}\n＊Aボタン：${result?.canDeliver ? "次へ" : "戻る"}`
    });
    return;
  }
  if (content?.type === "rareEnemy") {
    if (content.consumed) return;
    startOverlayEvent({
      type: "rareEnemyRoom",
      content,
      fromGX,
      fromGY,
      imageId: content.imageId || "",
      imageFit: "cover",
      showOverlay: true,
      canCancel: false,
      message: "金色の甲虫が、こちらに気づいて飛び上がった！\n＊Aボタン：次へ"
    });
    return;
  }
  if (content?.type === "queenShadowFinale") {
    if (hooks.isQueenShadowFinaleCompleted()) return;
    startOverlayEvent({
      type: "queenShadowFinale",
      phase: "prompt",
      imageId: "NPC_01b",
      glow: "paleBlue",
      fromGX,
      fromGY,
      canCancel: true,
      retreatOnCancel: true,
      message: "部屋の中に誰かいるようだ。近づきますか？\n＊Aボタン：はい　Bボタン：いいえ"
    });
    return;
  }
  if (content?.type === "secondQueenShadowFinale") {
    if (hooks.isSecondQueenShadowFinaleCompleted()) return;
    startOverlayEvent({
      type: "secondQueenShadowFinale",
      phase: "prompt",
      imageId: "NPC_01b",
      glow: "paleBlue",
      fromGX,
      fromGY,
      canCancel: true,
      retreatOnCancel: true,
      message: "部屋の奥に女王の影が佇んでいる。近づきますか？\n＊Aボタン：はい　Bボタン：いいえ"
    });
    return;
  }
  if (content?.type === "thirdQueenShadowFinale") {
    if (hooks.isThirdQueenShadowFinaleCompleted()) return;
    startOverlayEvent({
      type: "thirdQueenShadowFinale",
      phase: "prompt",
      imageId: "NPC_01b",
      glow: "paleBlue",
      fromGX,
      fromGY,
      canCancel: true,
      retreatOnCancel: true,
      message: "部屋の奥にミカエラの影が佇んでいる。近づきますか？\n＊Aボタン：はい　Bボタン：いいえ"
    });
    return;
  }
  if (!["repeatableBoss", "eventBoss", "multiEnemyBoss"].includes(content?.type)) return;
  const boss = getBossById(content.bossId);
  if (!boss || hooks.isBossDefeated(boss.id)) return;
  if (hooks.isBossRetryBlocked(boss.id)) {
    state.gridX = fromGX;
    state.gridY = fromGY;
    state.x = fromGX + 0.5;
    state.y = fromGY + 0.5;
    hooks.playSe("blocked");
    hooks.say("今は開けるのをやめておこう…。");
    hooks.onStateChanged();
    return;
  }
  if (boss.event?.immediateStart) {
    const event = {
      type: "specialRoomBoss",
      bossId: boss.id,
      fromGX,
      fromGY,
      imageId: hooks.getBossEncounterImageId(boss),
      imageFit: "cover",
      canCancel: false,
      showOverlay: true,
      awaitingStartConfirmation: Boolean(boss.event.confirmBeforeStart),
      reserveMessageLines: boss.event.reserveMessageLines || 0
    };
    startOverlayEvent(event);
    hooks.say(`${boss.event.start}${event.awaitingStartConfirmation ? "\n＊Aボタン：次へ" : ""}`);
    if (!event.awaitingStartConfirmation) scheduleSpecialRoomBossBattle(event, boss);
    return;
  }
  startOverlayEvent({
    type: "specialRoomBoss",
    bossId: boss.id,
    fromGX,
    fromGY,
    imageId: hooks.getBossEncounterImageId(boss),
    imageFit: "cover",
    reserveMessageLines: boss.event?.reserveMessageLines || 0,
    canCancel: boss.event?.canCancel !== false,
    retreatOnCancel: boss.event?.canCancel !== false,
    message: boss.event?.prompt || "部屋に入ると、古ぼけた机の上に所狭しと本が積み上げられている。\n机の中央には、一冊だけ開かれた本がある。調べますか？\n＊Aボタン：はい　Bボタン：いいえ"
  });
}

function confirmRareEnemyRoomEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "rareEnemyRoom") return;
  event.content.consumed = true;
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
  hooks.beginRareEnemyBattle(event.content.enemyId);
}

function advanceQueenShadowFinaleEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "queenShadowFinale") return;
  event.canCancel = false;
  if (event.phase === "prompt") {
    event.phase = "vanished";
    event.imageId = "";
    event.glow = "";
    hooks.say("部屋の奥に佇んでいた影へ近づこうとした瞬間、\n青白い光が揺らぎ、その姿がかき消えた。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "vanished") {
    event.phase = "mikan";
    event.imageId = "NPC_01";
    hooks.say("みかんにゃんこ「…にゃ～？　どうしたにゃ？\nここに誰かいたかにゃあ？　知らないにゃあ…。」\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "mikan") {
    event.phase = "departed";
    event.imageId = "";
    hooks.say("みかんにゃんこは去っていった。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "departed") {
    event.phase = "found";
    hooks.say("みかんにゃんこがいた場所に何か落ちている。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "found") {
    event.phase = "acquired";
    hooks.onQueenShadowFinaleComplete();
    hooks.say("「女王のティアラ」を手に入れた！\n＊Aボタン：次へ");
    hooks.onStateChanged();
    return;
  }
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
}

function advanceSecondQueenShadowFinaleEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "secondQueenShadowFinale") return;
  event.canCancel = false;
  if (event.phase === "prompt") {
    event.phase = "vanished";
    event.imageId = "";
    event.glow = "";
    hooks.say("女王の影へ近づこうとした瞬間、砂を巻き上げて姿を消した。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "vanished") {
    event.phase = "mikan";
    event.imageId = "NPC_01";
    hooks.say("みかんにゃんこ「にゃあ…。どこにいっても暑いにゃあ…。うみゅん…？女王…？何言ってるにゃあ？」\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "mikan") {
    event.phase = "departed";
    event.imageId = "";
    hooks.say("みかんにゃんこは去って行った。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "departed") {
    event.phase = "found";
    hooks.say("…何か落ちている。\n＊Aボタン：次へ");
    return;
  }
  if (event.phase === "found") {
    event.phase = "acquired";
    hooks.onSecondQueenShadowFinaleComplete();
    hooks.say("「女王のイヤリング」を手に入れた！\n＊Aボタン：次へ");
    hooks.onStateChanged();
    return;
  }
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
}

function advanceThirdQueenShadowFinaleEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "thirdQueenShadowFinale") return;
  event.canCancel = false;
  if (event.phase === "prompt") {
    event.phase = "mikan";
    event.imageId = "NPC_01";
    event.glow = "";
    hooks.say("みかんにゃんこ「…真っ暗で怖かったにゃあ…。何も、何も見えなかったにゃん。うみゅん？女王…？何を言ってるにゃあ…？」\n＊Aボタンで次へ");
    return;
  }
  if (event.phase === "mikan") {
    event.phase = "queenVoice";
    hooks.say("「…頼みましたよ…。必ず、真実の杖を取り戻してください…。」\n＊Aボタンで次へ");
    return;
  }
  if (event.phase === "queenVoice") {
    event.phase = "departed";
    event.imageId = "";
    hooks.say("みかんにゃんこは去って行った。\n＊Aボタンで次へ");
    return;
  }
  if (event.phase === "departed") {
    event.phase = "found";
    hooks.say("何かが落ちている。\n＊Aボタンで次へ");
    return;
  }
  if (event.phase === "found") {
    event.phase = "acquired";
    hooks.onThirdQueenShadowFinaleComplete();
    hooks.say("「女王の首飾り」を手に入れた！\n＊Aボタンで次へ");
    hooks.onStateChanged();
    return;
  }
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
}

function confirmSpecialRoomBossEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "specialRoomBoss") return;
  event.canCancel = false;
  const boss = getBossById(event.bossId);
  if (boss?.event?.transformationImageId && event.imageId !== boss.event.transformationImageId && !event.transformationCompleted) {
    event.transformationCompleted = true;
    event.canCancel = false;
    hooks.say("");
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion) {
      event.imageId = boss.event.transformationImageId;
      beginSpecialRoomBossBattle(event, boss);
      return;
    }
    const originalImageId = event.imageId;
    const pulses = [700, 600, 520, 450, 380, 350];
    let elapsed = 0;
    pulses.forEach((duration, index) => {
      elapsed += duration;
      window.setTimeout(() => {
        if (state.overlayEvent !== event) return;
        event.imageId = index === pulses.length - 1 || index % 2 === 0
          ? boss.event.transformationImageId
          : originalImageId;
        hooks.onStateChanged();
      }, elapsed);
    });
    window.setTimeout(() => {
      if (state.overlayEvent !== event) return;
      event.imageId = boss.event.transformationImageId;
      beginSpecialRoomBossBattle(event, boss);
    }, elapsed + 180);
    return;
  }
  if (event.awaitingStartConfirmation) {
    event.awaitingStartConfirmation = false;
    event.imageId = "";
    hooks.say("");
    hooks.onStateChanged();
    scheduleSpecialRoomBossBattle(event, boss);
    return;
  }
  if (boss?.event?.treasureOpening) {
    hooks.showTreasure(boss.event.treasureOpening);
    hooks.say("");
    hooks.playTreasureOpening(boss.event.treasureOpening, () => {
      hooks.hideTreasure();
      if (state.overlayEvent !== event) return;
      beginSpecialRoomBossBattle(event, boss);
    });
    return;
  }
  beginSpecialRoomBossBattle(event, boss);
}

function beginSpecialRoomBossBattle(event, boss) {
  if (boss?.event?.fadeBeforeStart) {
    event.imageId = "";
    hooks.say("");
    hooks.onStateChanged();
    scheduleSpecialRoomBossBattle(event, boss);
    return;
  }
  hooks.say(boss?.event?.start || "本に手を触れようとした瞬間、突然声が響く。「軽々しく、それに触るな！」\n何かが襲ってきた！");
  scheduleSpecialRoomBossBattle(event, boss);
}

function scheduleSpecialRoomBossBattle(event, boss) {
  event.autoStartTimer = window.setTimeout(() => {
    if (state.overlayEvent !== event) return;
    state.overlayEvent = null;
    hooks.beginBossBattle(event.bossId);
  }, Math.max(0, Number(boss?.event?.autoStartDelay) || 1200));
}

export function handleOverlayEventInput(action) {
  if (!state.overlayEvent) return false;
  if (["stairsTransition", "fixedWarpTransition"].includes(state.overlayEvent.type)) return true;
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
    else if (state.overlayEvent.type === "bossRemains") finishBossRemainsEvent();
    else if (state.overlayEvent.type === "fountain") confirmFountainEvent();
    else if (state.overlayEvent.type === "fixedFloorWarp") confirmFixedFloorWarpEvent();
    else if (state.overlayEvent.type === "fixedFloorEvent") finishFixedFloorEvent();
    else if (state.overlayEvent.type === "stairsPrompt") confirmStairsPrompt();
    else if (state.overlayEvent.type === "treasure") confirmTreasureEvent();
    else if (state.overlayEvent.type === "specialDoorLock") confirmSpecialDoorLockEvent();
    else if (state.overlayEvent.type === "specialDoorAccessConfirm") confirmSpecialDoorAccessEvent();
    else if (state.overlayEvent.type === "specialRoomWarning") confirmSpecialRoomWarningEvent();
    else if (state.overlayEvent.type === "specialRoomBoss") confirmSpecialRoomBossEvent();
    else if (state.overlayEvent.type === "rareEnemyRoom") confirmRareEnemyRoomEvent();
    else if (state.overlayEvent.type === "waspHive") {
      const event = state.overlayEvent;
      state.overlayEvent = null;
      hooks.say("");
      if (event.canBattle) hooks.beginQuestEnemyBattle("wasp", 3);
      else hooks.onStateChanged();
    }
    else if (state.overlayEvent.type === "kirkeHouse") {
      const event = state.overlayEvent;
      if (event.phase === "house" && event.canDeliver) {
        const result = hooks.deliverBeeswaxToKirke();
        if (result?.accepted) {
          event.phase = "kirke";
          event.canDeliver = false;
          event.imageId = event.content.portraitId;
          hooks.say(`${result.message}\n＊Aボタン：戻る`);
          hooks.onStateChanged();
          return true;
        }
      }
      state.overlayEvent = null;
      hooks.say("");
      hooks.onStateChanged();
    }
    else if (state.overlayEvent.type === "queenShadowFinale") advanceQueenShadowFinaleEvent();
    else if (state.overlayEvent.type === "secondQueenShadowFinale") advanceSecondQueenShadowFinaleEvent();
    else if (state.overlayEvent.type === "thirdQueenShadowFinale") advanceThirdQueenShadowFinaleEvent();
    else if (state.overlayEvent.type === "jireneAwakening") {
      state.overlayEvent = null;
      hooks.say("");
      hooks.onStateChanged();
    }
    else if (state.overlayEvent.type === "npcContact") {
      state.overlayEvent = null;
      hooks.say("");
      hooks.onStateChanged();
    }
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
  const typeLabel = treasureType === "red" ? "赤い宝箱"
    : treasureType === "black" ? "黒い宝箱"
      : treasureType === "purple" ? "紫色の宝箱"
        : "金色の宝箱";
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

export function startFloorLapNotice(depth) {
  startOverlayEvent({
    type: "floorLap",
    showOverlay: false,
    overlayMessage: `B${depth}F`,
    overlaySubtitle: getFloorZoneName(depth)
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

function startFixedFloorEvent(eventDefinition) {
  const message = hooks.onFixedFloorEvent(eventDefinition) || eventDefinition?.description || "何かの気配を感じる…。";
  startOverlayEvent({
    type: "fixedFloorEvent",
    imageId: "NPC_01b",
    message: `${message}\n＊Aボタンで次へ`,
    canCancel: false,
    fadeOut: Boolean(eventDefinition?.fadeOut),
    reserveMessageLines: 5,
    phase: "message"
  });
}

function finishFixedFloorEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "fixedFloorEvent") return;
  if (event.fadeOut && event.phase !== "fading") {
    event.phase = "fading";
    event.fadeStartedAt = performance.now();
    hooks.say("");
    hooks.onStateChanged();
    event.fadeTimer = window.setTimeout(() => {
      if (state.overlayEvent !== event) return;
      removeFixedEventAt(state.gridX, state.gridY);
      state.overlayEvent = null;
      hooks.onStateChanged();
    }, 650);
    return;
  }
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
}

function startBossEvent(bossId, fromGX, fromGY) {
  const boss = getBossById(bossId);
  state.bossEncounterOrigin = { x: fromGX, y: fromGY };
  const isRematch = hooks.isBossRematch(bossId);
  const hasSphinxAnswer = boss?.event?.sphinxChoice && !isRematch && hooks.hasSphinxAnswer();
  startOverlayEvent({
    type: "bossPrompt",
    bossId,
    imageId: boss?.encounterImageId ?? "",
    silhouette: isRematch,
    fromGX,
    fromGY,
    phase: hasSphinxAnswer ? "sphinxAnswer" : boss?.event?.sphinxChoice && !isRematch ? "sphinxIntro" : "prompt",
    message: hasSphinxAnswer
      ? "スピンクス「ふむ。正解だ。知恵ある者よこれを授けよう。そして以後、自由にここを通るがよい。」\n＊Aボタン：次へ"
      : hooks.getBossEncounterPrompt(boss) || "部屋の中央に騎士の彫像がある。まるで行く手を遮っているようだ。調べてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
    canCancel: !boss?.event?.sphinxChoice || isRematch || hasSphinxAnswer,
    retreatOnCancel: true
  });
}

function confirmBossEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "bossPrompt") return;
  event.canCancel = false;
  const boss = getBossById(event.bossId);
  if (boss?.event?.sphinxChoice && !hooks.isBossRematch(boss.id)) {
    if (event.phase === "sphinxAnswer") {
      hooks.onSphinxPeaceResolved();
      state.overlayEvent = null;
      hooks.say("");
      hooks.onStateChanged();
      return;
    }
    if (event.phase === "sphinxIntro") {
      event.phase = "prompt";
      event.canCancel = true;
      hooks.say("スピンクス「…小さき者よ。妾の問いに答えよ。見事答える事が出来たならば、ここを通してやろう。」\n＊問いに答えますか？\nAボタン：はい　Bボタン：いいえ");
      hooks.onStateChanged();
      return;
    }
    if (event.phase === "prompt") {
      hooks.onSphinxRiddleHeard();
      event.phase = "sphinxRiddle";
      event.canCancel = false;
      hooks.say("スピンクス「失せ物をすぐに見つける事ができるものがいるという。ここに連れてくるがよい。」\n＊Aボタン：次へ");
      hooks.onStateChanged();
      return;
    }
    if (event.phase === "sphinxRiddle") {
      state.overlayEvent = null;
      hooks.say("");
      hooks.onStateChanged();
      if (Number.isInteger(event.fromGX) && Number.isInteger(event.fromGY)) startNpcRetreat(event);
      return;
    }
    if (event.phase === "sphinxFightConfirm") {
      event.canCancel = false;
      hooks.say(boss.event.start);
      event.autoStartTimer = window.setTimeout(() => {
        if (state.overlayEvent !== event) return;
        state.overlayEvent = null;
        hooks.beginBossBattle(event.bossId);
      }, Math.max(0, Number(boss.event.autoStartDelay) || 2000));
      return;
    }
  }
  hooks.say(hooks.getBossStartMessage(boss) || "あなたが近づいた途端、彫像が動き出した！こちらに向かってくる！");
  const timer = window.setTimeout(() => {
    if (state.overlayEvent !== event) return;
    state.overlayEvent = null;
    hooks.beginBossBattle(event.bossId);
  }, Math.max(0, Number(boss?.event?.autoStartDelay) || 1000));
  event.autoStartTimer = timer;
}

function startBossRemainsEvent(bossId) {
  const boss = getBossById(bossId);
  startOverlayEvent({
    type: "bossRemains",
    bossId,
    imageId: boss?.defeatedEncounterImageId ?? "",
    message: boss?.event?.remains || "粉々になった彫像が床一面に散らばっている。もう動き出す事はなさそうだ。\n＊Aボタン：次へ",
    canCancel: false
  });
}

function finishBossRemainsEvent() {
  if (state.overlayEvent?.type !== "bossRemains") return;
  state.overlayEvent = null;
  hooks.say("");
  hooks.onStateChanged();
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
  if (npc.interactionType === "contact") {
    removeNpcAt(state.gridX, state.gridY);
    hooks.onNpcEncountered(npc);
    startOverlayEvent({
      type: "npcContact",
      showOverlay: false,
      message: `${npc.contactMessage || "ここに誰かがいたはずだが…？"}\n＊Aボタン：次へ`
    });
    hooks.onStateChanged();
    return;
  }
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

function startFountainEvent(fountainId, fromGX, fromGY) {
  const fountain = getFountainById(fountainId);
  const oasis = [DESERT_OASIS.id, DESERT_OASIS_MIRAGE.id].includes(fountain.id);
  startOverlayEvent({
    type: "fountain",
    imageId: fountain.id,
    fountainId: fountain.id,
    phase: "prompt",
    fromGX,
    fromGY,
    fountainGX: state.gridX,
    fountainGY: state.gridY,
    message: oasis
      ? "オアシスがある。ここで休んでいけそうだ。休みますか？\n＊Aボタン：はい　Bボタン：いいえ"
      : "癒やしの噴水がある。ここで休息できそうだ。休みますか？\n＊Aボタン：はい　Bボタン：いいえ",
    canCancel: true,
    retreatOnCancel: true
  });
}

function startQuicksandEvent(quicksand) {
  const event = {
    type: "quicksand",
    imageId: "desert_quicksand",
    phase: "sinking",
    message: "足元の砂が崩れ、流砂へ呑み込まれた！",
    canCancel: false
  };
  const activeEvent = startOverlayEvent(event);
  activeEvent.autoStartTimer = window.setTimeout(async () => {
    if (state.overlayEvent !== activeEvent) return;
    let moved = false;
    const moveToDestination = () => {
      if (moved || state.overlayEvent !== activeEvent) return;
      moved = true;
      state.gridX = quicksand.targetX;
      state.gridY = quicksand.targetY;
      state.x = state.gridX + .5;
      state.y = state.gridY + .5;
      markExplored(state.gridX, state.gridY);
      state.overlayEvent = null;
      hooks.say("流砂に押し流され、別の場所へ辿り着いた。");
      updateNpcAwareness();
      hooks.onStateChanged();
    };
    await runQuicksandTransitionWithFallback(
      hooks.runQuicksandTransition,
      moveToDestination
    );
  }, 900);
}

function startRapidCurrentEvent(rapidCurrent, safeX, safeY) {
  if (state.rapidCurrentTransitionActive) return false;
  const direction = RAPID_CURRENT_DIRECTIONS[rapidCurrent.direction];
  if (!direction) return false;
  const token = ++rapidCurrentTransitionToken;
  state.rapidCurrentTransitionActive = true;
  state.rapidCurrentMotionStartedAt = performance.now();
  discoverRapidCurrent(rapidCurrent.streamId);
  hooks.cancelAutoReturn(false);
  setPlayerInputEnabled(false);
  const event = startOverlayEvent({
    type: "rapidCurrent",
    imageId: RAPID_CURRENT.imageId,
    phase: "starting",
    message: "足元を激流に掬われた！",
    canCancel: false
  });
  hooks.playSe(RAPID_CURRENT.startSeId);
  void runRapidCurrentTransition({ rapidCurrent, direction, event, token, safeX, safeY });
  return true;
}

async function runRapidCurrentTransition({ rapidCurrent, direction, event, token, safeX, safeY }) {
  try {
    await rapidCurrentWait(650, token);
    assertRapidCurrentToken(token);
    if (state.overlayEvent === event) state.overlayEvent = null;
    hooks.startRapidCurrentFlow(RAPID_CURRENT.movementSeId);
    const path = getRapidCurrentForcedPath({ x: state.gridX, y: state.gridY, rapidCurrent });
    for (const point of path) {
      await rapidCurrentWait(prefersReducedMotion() ? 90 : 165, token);
      assertRapidCurrentToken(token);
      state.gridX = point.x;
      state.gridY = point.y;
      state.x = state.gridX + .5;
      state.y = state.gridY + .5;
      state.dir = DIRS.findIndex(item => item.key === direction.key);
      state.angle = DIRS[state.dir].angle;
      markExplored(state.gridX, state.gridY);
    }
    hooks.stopRapidCurrentFlow(RAPID_CURRENT.movementSeId);
    hooks.playSe(RAPID_CURRENT.startSeId);
    state.overlayEvent = {
      type: "rapidCurrent",
      imageId: RAPID_CURRENT.imageId,
      phase: "arrived",
      message: "激流に押し流され、安全な岸へ辿り着いた。",
      canCancel: false,
      showOverlay: true
    };
    hooks.say(state.overlayEvent.message);
    hooks.onStateChanged();
    await rapidCurrentWait(750, token);
  } catch (error) {
    if (error?.message !== "rapid-current-cancelled") {
      console.error("Rapid current transition failed:", error);
      state.gridX = safeX;
      state.gridY = safeY;
      state.x = safeX + .5;
      state.y = safeY + .5;
    }
  } finally {
    if (token === rapidCurrentTransitionToken) finishRapidCurrentTransition(true);
  }
}

function rapidCurrentWait(delay, token) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      rapidCurrentTimers.delete(timer);
      if (token !== rapidCurrentTransitionToken) reject(new Error("rapid-current-cancelled"));
      else resolve();
    }, delay);
    rapidCurrentTimers.add(timer);
  });
}

function assertRapidCurrentToken(token) {
  if (token !== rapidCurrentTransitionToken) throw new Error("rapid-current-cancelled");
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function finishRapidCurrentTransition(restoreInput) {
  hooks.stopRapidCurrentFlow(RAPID_CURRENT.movementSeId);
  for (const timer of rapidCurrentTimers) window.clearTimeout(timer);
  rapidCurrentTimers.clear();
  state.rapidCurrentTransitionActive = false;
  state.rapidCurrentMotionStartedAt = 0;
  if (state.overlayEvent?.type === "rapidCurrent") state.overlayEvent = null;
  if (restoreInput) setPlayerInputEnabled(true);
  updateNpcAwareness();
  hooks.onStateChanged();
}

export function cancelRapidCurrentTransition({ restoreInput = false } = {}) {
  const active = state.rapidCurrentTransitionActive || rapidCurrentTimers.size > 0 || state.overlayEvent?.type === "rapidCurrent";
  rapidCurrentTransitionToken += 1;
  if (!active) {
    hooks.stopRapidCurrentFlow(RAPID_CURRENT.movementSeId);
    return false;
  }
  finishRapidCurrentTransition(restoreInput);
  return true;
}

export async function runQuicksandTransitionWithFallback(runTransition, moveToDestination) {
  try {
    const transitioned = await runTransition(moveToDestination);
    if (transitioned === false) moveToDestination();
  } catch (error) {
    console.error("Quicksand transition failed:", error);
    moveToDestination();
  }
}

function confirmFountainEvent() {
  const event = state.overlayEvent;
  if (!event || event.phase !== "prompt") return;
  if (event.fountainId === DESERT_OASIS_MIRAGE.id) {
    event.phase = "mirageFading";
    event.canCancel = false;
    event.mirageFadeStartedAt = performance.now();
    hooks.say("ひと休みしようと更に近づいたところ、\nオアシスはゆらゆらと陽炎のごとく消え去った……。");
    window.setTimeout(() => {
      if (state.overlayEvent !== event) return;
      removeFountainAt(event.fountainGX, event.fountainGY);
      state.overlayEvent = null;
      updateNpcAwareness();
      hooks.onStateChanged();
    }, 1500);
    return;
  }
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
    hooks.say(event.fountainId === DESERT_OASIS.id
      ? "オアシスで休息した。HPとSP、たいまつゲージが全回復した。"
      : "癒やしの噴水で休息した。HPとSP、たいまつゲージが全回復した。");
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
    if (event.treasureType === "red" || event.treasureType === "purple") {
      const reward = hooks.awardTreasure(event.treasureType, event.eventTreasureId) || {};
      hooks.say(`${trapMessage}${reward.message || "戦利品をロット袋へ入れた。"}`);
    } else if (event.treasureType === "black" && trapResult.trap && !trapResult.disarmed) {
      hooks.say(`${trapMessage}宝箱はミミックだった！`);
      hooks.beginMimicBattle();
      hooks.onStateChanged();
      return;
    } else if (event.treasureType === "black") {
      const reward = hooks.awardTreasure(event.treasureType, event.eventTreasureId) || {};
      hooks.say(`${trapMessage}${reward.message || "戦利品をロット袋へ入れた。"}`);
    } else if (event.treasureType === "gold") {
      const reward = hooks.awardTreasure(event.treasureType, event.eventTreasureId) || {};
      hooks.say(`${trapMessage}${reward.message || "中にはレアアイテムが…入っていなかった！"}`);
    } else {
      hooks.say(`${trapMessage}中には何も入っていなかった！`);
    }
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
  hooks.onNpcEncountered(event.npc);
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
  return state.overlayEvent;
}

function cancelOverlayEvent() {
  const event = state.overlayEvent;
  if (!event?.canCancel) return;
  if (event.type === "bossPrompt" && event.bossId === "sphinx_b69f" && event.phase === "prompt") {
    event.phase = "sphinxFightConfirm";
    event.canCancel = true;
    hooks.say("スピンクス「ふむ。妾に刃を向けるつもりか？」\nAボタン：はい　Bボタン：いいえ");
    hooks.onStateChanged();
    return;
  }
  stopNpcTypewriter();
  if (event.type === "stairsPrompt") state.stairsPromptDismissed = true;
  state.overlayEvent = null;
  hooks.say("");
  if (event.type === "treasure") {
    if (!event.transientAfterBattle) discoverTreasureAt(event.treasureGX, event.treasureGY);
    hooks.hideTreasure();
  }
  hooks.onStateChanged();
  if (event.retreatOnCancel && Number.isInteger(event.fromGX) && Number.isInteger(event.fromGY)) startNpcRetreat(event);
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
