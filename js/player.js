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
import { HEALING_FOUNTAIN } from "../data/fountains.js";
import { getBossById } from "../data/bosses.js";
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
  getSpecialDoorLockInfo: () => null,
  getSpecialDoorAccessBlock: () => ({ blocked: false }),
  attemptSpecialDoorUnlock: () => ({ accepted: false }),
  isBossDefeated: () => false,
  beginBossBattle: () => false,
  beginMimicBattle: () => false,
  restAtFountain: () => Promise.resolve(false),
  returnToTown: () => {},
  beginBattle: () => {},
  playNpcVoice: () => {},
  onNpcEncountered: () => {},
  isQueenShadowFinaleCompleted: () => false,
  onQueenShadowFinaleComplete: () => false,
  onQuestEvent: () => "",
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
        const bossRemainsId = getBossRemainsAt(state.gridX, state.gridY);
        const fountain = getFountainAt(state.gridX, state.gridY);
        const treasure = getTreasureAt(state.gridX, state.gridY);
        const specialRoom = getSpecialRoomAt(state.gridX, state.gridY);
        const questEvent = getQuestEventAt(state.gridX, state.gridY);
        const isStairs = a.cellType === "stairsUp" || a.cellType === "stairsDown";
        const isSpecialEventCell = Boolean(npc) || Boolean(bossId) || Boolean(bossRemainsId) || Boolean(fountain) || Boolean(treasure) || Boolean(questEvent) || Boolean(specialRoom?.content) || isStairs;
        const encounterTriggered = !isSpecialEventCell && onPlayerStep({ inDarkness: movedInDarkness });
        if (encounterTriggered && state.autoWalkerActive) state.autoReturnPaused = true;
        else if (encounterTriggered) hooks.cancelAutoReturn(false);
        if (bossId) {
          startBossEvent(bossId, a.fromGX, a.fromGY);
        } else if (bossRemainsId) {
          startBossRemainsEvent(bossRemainsId);
        } else if (npc) {
          startNpcTalkEvent(npc, a.fromGX, a.fromGY);
        } else if (fountain) {
          startFountainEvent(a.fromGX, a.fromGY);
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
    if (state.autoReturning) hooks.continueAutoReturn();
  }
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
  const specialRoomEntry = openDoorOnCell(state.gridX, state.gridY, currentDir.key)
    ? getSpecialRoomEntryAt(state.gridX, state.gridY, currentDir.key)
    : null;
  if (amount > 0 && specialRoomEntry?.dangerWarning && !specialEntryConfirmed) {
    startOverlayEvent({
      type: "specialRoomWarning",
      showOverlay: false,
      moveAmount: amount,
      canCancel: true,
      message: "扉の向こうから、身の毛もよだつような気配を感じる。\nそれでも中へ入りますか？\n＊Aボタン：入る　Bボタン：立ち去る"
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
  if (!["repeatableBoss", "eventBoss"].includes(content?.type)) return;
  const boss = getBossById(content.bossId);
  if (!boss || hooks.isBossDefeated(boss.id)) return;
  if (boss.event?.immediateStart) {
    const event = {
      type: "specialRoomBoss",
      bossId: boss.id,
      imageId: boss.encounterImageId || boss.imageId || "",
      canCancel: false,
      showOverlay: true,
      awaitingStartConfirmation: Boolean(boss.event.confirmBeforeStart)
    };
    startOverlayEvent(event);
    hooks.say(`${boss.event.start}${event.awaitingStartConfirmation ? "\n＊Aボタン：次へ" : ""}`);
    if (!event.awaitingStartConfirmation) scheduleSpecialRoomBossBattle(event, boss);
    return;
  }
  startOverlayEvent({
    type: "specialRoomBoss",
    bossId: boss.id,
    imageId: boss.encounterImageId ?? "",
    imageFit: "cover",
    canCancel: boss.event?.canCancel !== false,
    retreatOnCancel: boss.event?.canCancel !== false,
    message: boss.event?.prompt || "部屋に入ると、古ぼけた机の上に所狭しと本が積み上げられている。\n机の中央には、一冊だけ開かれた本がある。調べますか？\n＊Aボタン：はい　Bボタン：いいえ"
  });
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

function confirmSpecialRoomBossEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "specialRoomBoss") return;
  event.canCancel = false;
  const boss = getBossById(event.bossId);
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
  hooks.say(boss?.event?.start || "本に手を触れようとした瞬間、突然声が響く。「軽々しく、それに触るな！」\n何かが襲ってきた！");
  event.autoStartTimer = window.setTimeout(() => {
    if (state.overlayEvent !== event) return;
    state.overlayEvent = null;
    hooks.beginBossBattle(event.bossId);
  }, 1200);
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
    else if (state.overlayEvent.type === "bossRemains") finishBossRemainsEvent();
    else if (state.overlayEvent.type === "fountain") confirmFountainEvent();
    else if (state.overlayEvent.type === "stairsPrompt") confirmStairsPrompt();
    else if (state.overlayEvent.type === "treasure") confirmTreasureEvent();
    else if (state.overlayEvent.type === "specialDoorLock") confirmSpecialDoorLockEvent();
    else if (state.overlayEvent.type === "specialRoomWarning") confirmSpecialRoomWarningEvent();
    else if (state.overlayEvent.type === "specialRoomBoss") confirmSpecialRoomBossEvent();
    else if (state.overlayEvent.type === "queenShadowFinale") advanceQueenShadowFinaleEvent();
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

export function startFloorLapNotice(depth) {
  startOverlayEvent({
    type: "floorLap",
    showOverlay: false,
    overlayMessage: `B${depth}F`
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
  const boss = getBossById(bossId);
  startOverlayEvent({
    type: "bossPrompt",
    bossId,
    imageId: boss?.encounterImageId ?? "",
    fromGX,
    fromGY,
    message: boss?.event?.prompt || "部屋の中央に騎士の彫像がある。まるで行く手を遮っているようだ。調べてみますか？\n＊Aボタン：はい　Bボタン：いいえ",
    canCancel: true,
    retreatOnCancel: true
  });
}

function confirmBossEvent() {
  const event = state.overlayEvent;
  if (!event || event.type !== "bossPrompt") return;
  event.canCancel = false;
  const boss = getBossById(event.bossId);
  hooks.say(boss?.event?.start || "あなたが近づいた途端、彫像が動き出した！こちらに向かってくる！");
  const timer = window.setTimeout(() => {
    if (state.overlayEvent !== event) return;
    state.overlayEvent = null;
    hooks.beginBossBattle(event.bossId);
  }, 1000);
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
    hooks.say("癒やしの噴水で休息した。HPとSP、たいまつゲージが全回復した。");
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
