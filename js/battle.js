import {
  createBattleState,
  resolveJireneScriptedRound,
  resolveBattleRound,
  resolveEnemyAmbush
} from "../combat/battle-engine.js";
import { getEquipmentAdjustedEscapeRate, resolveEscapeAttempt } from "../combat/resolve-escape.js";
import { clearBattleOnlyStatuses } from "../combat/status-lifecycle.js";
import { playPlayerChargePresentation } from "./player-charge-presentation.js";
import { playBattleSkillPresentation } from "./battle-skill-presentation.js";
import { getSkill } from "../data/skills.js";
import { getItem } from "../data/items.js";
import { getItemUnavailableReason } from "../combat/resolve-item-use.js";

const COMMANDS = Object.freeze([
  ["attack", "戦う"],
  ["skills", "スキル"],
  ["guard", "防御"],
  ["items", "アイテム"],
  ["auto", "オート"],
  ["escape", "逃げる"]
]);

const battleUi = {
  root: null,
  commandRoot: null,
  messageEl: null,
  normalButtons: [],
  battleButtons: [],
  active: false,
  mode: "commands",
  selectedIndex: 0,
  battle: null,
  concealed: false,
  autoActive: false,
  autoTimer: 0,
  presenting: false,
  presentationHp: null,
  presentationBarrier: null,
  pendingCommand: null,
  getCharacter: () => null,
  onCharacterChanged: () => {},
  onVictory: () => {},
  onDefeat: () => {},
  onEscape: () => {},
  onScriptedDefeat: () => {},
  openItems: () => false,
  openSkills: () => false,
  playSe: () => {},
  onNpcSupport: () => {},
  onNpcCharge: () => {}
};

export function configureBattle(options) {
  Object.assign(battleUi, options);
  battleUi.normalButtons = [...battleUi.commandRoot.children];
  battleUi.battleButtons = COMMANDS.map(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.battleCommand = id;
    button.textContent = label;
    button.addEventListener("click", () => selectByPointer(
      battleUi.mode === "skills" ? button.dataset.skillId || button.dataset.battleCommand : button.dataset.battleCommand
    ));
    return button;
  });
}

export function startBattle(enemy, { playStartSe = true, ambush = false, concealed = false, enemies = null, targetIndex = 0, scriptedBattleType = "" } = {}) {
  const character = battleUi.getCharacter();
  if (!character || battleUi.active) return false;
  battleUi.active = true;
  battleUi.mode = "commands";
  battleUi.selectedIndex = 0;
  battleUi.autoActive = false;
  battleUi.concealed = Boolean(concealed);
  clearAutoTimer();
  battleUi.battle = createBattleState({ character, enemy, enemies, targetIndex });
  if (scriptedBattleType) {
    battleUi.battle.scriptedBattleType = scriptedBattleType;
    battleUi.battle.scriptedTurn = 1;
    battleUi.battle.scriptedNonlethal = true;
    battleUi.battle.npcSupportSuppressed = true;
    battleUi.battle.scriptedInitialPlayerCharge = structuredClone(battleUi.battle.player.playerCharge);
    battleUi.battle.log = ["甘い歌声に意識を絡め取られた！", "仲間たちは魅了され、身体を動かすことができない！"];
  }
  battleUi.battle.encounterBossId = enemy.id;
  battleUi.root.hidden = false;
  document.body.classList.add("battle-active");
  showCommandButtons();
  if (playStartSe) battleUi.playSe("battleStart");
  renderBattle();
  if (battleUi.battle.manaBoosterRecovery > 0) {
    battleUi.onCharacterChanged({ sp: battleUi.battle.player.sp });
    const openingBattle = battleUi.battle;
    window.setTimeout(() => {
      if (battleUi.active && battleUi.battle === openingBattle) {
        showBattleNumber("player", openingBattle.manaBoosterRecovery, "healing");
      }
    }, 300);
  }
  if (scriptedBattleType === "jirene_first_encounter") scheduleJireneScriptedRound(900);
  else if (ambush) void executeAmbushOpening();
  return true;
}

export function isBattleActive() {
  return battleUi.active;
}

export function isJireneScriptedBattleActive() {
  return Boolean(battleUi.active && battleUi.battle?.scriptedBattleType === "jirene_first_encounter");
}

export function openBattleItems() {
  if (!battleUi.active || battleUi.presenting || battleUi.battle?.outcome || battleUi.autoActive) return false;
  battleUi.playSe("confirm");
  battleUi.openItems({ character: battleUi.battle.player, enemy: battleUi.battle.enemy, enemies: battleUi.battle.enemies, onUse: useBattleItem });
  return true;
}

export function handleBattleInput(action) {
  if (!battleUi.active || document.body.classList.contains("menu-open")) return false;
  if (battleUi.autoActive) {
    if (action === "cancel") stopAutoBattle();
    return true;
  }
  if (battleUi.presenting) return true;
  if (battleUi.battle?.outcome) {
    if (action === "confirm") finishBattle();
    return true;
  }
  if (action === "cancel") {
    if (battleUi.mode === "targets") {
      battleUi.pendingCommand = null;
      battleUi.mode = "commands";
      battleUi.selectedIndex = 0;
      showCommandButtons();
      renderEnemyPartySelection();
      battleUi.playSe("cancel");
    }
    return true;
  }
  if (["up", "down", "left", "right"].includes(action)) {
    moveSelection(action);
    return true;
  }
  if (action === "confirm") {
    activateSelected();
    return true;
  }
  return true;
}

function selectByPointer(id) {
  if (!battleUi.active || battleUi.presenting || battleUi.battle?.outcome) return;
  const index = battleUi.battleButtons.findIndex(button =>
    (battleUi.mode === "skills" ? button.dataset.skillId : button.dataset.battleCommand) === id
  );
  if (index < 0) return;
  battleUi.selectedIndex = index;
  renderSelection();
  activateSelected();
}

function selectEnemyTarget(index) {
  if (!battleUi.battle?.enemies || battleUi.presenting || battleUi.battle.outcome) return;
  const enemy = battleUi.battle.enemies[index];
  if (!enemy?.alive) return;
  battleUi.battle.targetIndex = index;
  battleUi.battle.enemy = enemy;
  battleUi.playSe("cursorMove");
  renderBattle();
}

function moveSelection(action) {
  const columns = 3;
  const rows = 2;
  const row = Math.floor(battleUi.selectedIndex / columns);
  const column = battleUi.selectedIndex % columns;
  let nextRow = row;
  let nextColumn = column;
  if (action === "left") nextColumn = (column + columns - 1) % columns;
  if (action === "right") nextColumn = (column + 1) % columns;
  if (action === "up") nextRow = (row + rows - 1) % rows;
  if (action === "down") nextRow = (row + 1) % rows;
  let next = nextRow * columns + nextColumn;
  if (battleUi.battleButtons[next]?.disabled) {
    const available = battleUi.battleButtons.findIndex(button => !button.disabled);
    if (available < 0) return;
    next = available;
  }
  battleUi.selectedIndex = next;
  battleUi.playSe("cursorMove");
  renderSelection();
  renderEnemyPartySelection();
}

function activateSelected() {
  const button = battleUi.battleButtons[battleUi.selectedIndex];
  if (!button || button.disabled) return;
  battleUi.playSe("confirm");
  if (battleUi.mode === "targets") {
    const targetIndex = Number(button.dataset.targetIndex);
    const command = { ...(battleUi.pendingCommand || {}), targetIndex };
    battleUi.pendingCommand = null;
    battleUi.mode = "commands";
    executeCommand(command);
    return;
  }
  const command = button.dataset.battleCommand;
  if (command === "skills") {
    battleUi.openSkills({
      character: battleUi.battle.player,
      enemy: battleUi.battle.enemy,
      onUse: useBattleSkill
    });
    return;
  }
  if (command === "items") {
    battleUi.openItems({
      character: battleUi.battle.player,
      enemy: battleUi.battle.enemy,
      enemies: battleUi.battle.enemies,
      onUse: useBattleItem
    });
    return;
  }
  if (command === "attack") executeOrSelectTarget({ type: "attack" });
  else if (command === "guard") executeCommand({ type: "guard" });
  else if (command === "auto") startAutoBattle();
  else if (command === "escape") attemptEscape();
  else {
    battleUi.messageEl.textContent = `${button.textContent}は現在未実装です。`;
  }
}

async function useBattleSkill(skillId) {
  const skill = getSkill(skillId);
  if (battleUi.battle?.enemies && skill?.target === "enemy") showTargetButtons({ type: "skill", skillId });
  else await executeCommand({ type: "skill", skillId, targetIndex: battleUi.battle.targetIndex });
  return { accepted: true };
}

async function useBattleItem(itemId) {
  const item = getItem(itemId);
  const targetsEnemy = item?.effects?.some(effect => effect.id === "strong_herbicide");
  if (battleUi.battle?.enemies && targetsEnemy) showTargetButtons({ type: "item", itemId });
  else await executeCommand({ type: "item", itemId, targetIndex: battleUi.battle.targetIndex });
  return { accepted: true };
}

function executeOrSelectTarget(command) {
  if (battleUi.battle?.enemies) showTargetButtons(command);
  else executeCommand({ ...command, targetIndex: battleUi.battle?.targetIndex });
}

function showTargetButtons(command) {
  battleUi.pendingCommand = command;
  battleUi.mode = "targets";
  const targetAvailability = battleUi.battle.enemies.map(enemy => isCommandTargetAvailable(command, enemy));
  const currentTargetIndex = Math.max(0, battleUi.battle.targetIndex || 0);
  battleUi.selectedIndex = targetAvailability[currentTargetIndex]
    ? currentTargetIndex
    : Math.max(0, targetAvailability.findIndex(Boolean));
  battleUi.battleButtons.forEach((button, index) => {
    const enemy = battleUi.battle.enemies[index];
    button.dataset.battleCommand = `target-${index}`;
    button.dataset.targetIndex = String(index);
    button.textContent = enemy?.alive ? enemy.name : "";
    button.disabled = !targetAvailability[index];
  });
  mountButtons("攻撃対象");
  renderEnemyPartySelection();
  battleUi.messageEl.textContent = "攻撃する相手を選んでください。\n＊Bボタンで戻る";
}

function isCommandTargetAvailable(command, enemy) {
  if (!enemy?.alive || Number(enemy.hp) <= 0) return false;
  if (command?.type !== "item") return true;
  return !getItemUnavailableReason({
    character: battleUi.battle.player,
    itemId: command.itemId,
    context: "battle",
    enemy
  });
}

async function executeCommand(command) {
  const startingHp = {
    player: battleUi.battle.player.hp,
    enemy: battleUi.battle.enemy.hp,
    enemies: battleUi.battle.enemies?.map(enemy => enemy.hp) || null
  };
  const startingBarrier = Math.max(0, Math.floor(Number(battleUi.battle.sphinxBarrier) || 0));
  const resolved = battleUi.battle.scriptedBattleType === "jirene_first_encounter"
    ? resolveJireneScriptedRound({ battle: battleUi.battle })
    : resolveBattleRound({ battle: battleUi.battle, playerCommand: command });
  if (!resolved.accepted) {
    const messages = {
      insufficientSp: "SPが足りない。",
      noEffect: "毒状態ではない。",
      fieldOnly: "このスキルは探索中のみ使用できる。",
      undeadOnly: "アンデッドにしか効果がない。",
      bossImmune: "この敵には効かない。",
      plantOnly: "植物型の障害物にしか効果がない。",
      chargeNotReady: "チャージが満タンではない。",
      oncePerBattle: "活性回復薬（小）は1戦闘に1回だけ使用できる。"
    };
    battleUi.messageEl.textContent = messages[resolved.reason] || "現在使用できません。";
    return;
  }
  battleUi.battle = resolved.battle;
  battleUi.presenting = battleUi.battle.presentationEvents?.length > 0;
  battleUi.presentationHp = battleUi.presenting ? startingHp : null;
  battleUi.presentationBarrier = battleUi.presenting ? startingBarrier : null;
  battleUi.onCharacterChanged({
    hp: battleUi.presenting ? startingHp.player : battleUi.battle.player.hp,
    sp: battleUi.battle.player.sp,
    statuses: structuredClone(battleUi.battle.player.statuses),
    inventory: structuredClone(battleUi.battle.player.inventory),
    herbicideTrialUses: Number(battleUi.battle.player.herbicideTrialUses) || 0,
    playerCharge: structuredClone(battleUi.battle.player.playerCharge),
    alive: battleUi.presenting ? startingHp.player > 0 : battleUi.battle.player.alive
  });
  if (battleUi.battle.outcome) {
    battleUi.autoActive = false;
    clearAutoTimer();
  }
  if (battleUi.battle.outcome) {
    battleUi.autoActive = false;
    clearAutoTimer();
  }
  battleUi.mode = "commands";
  battleUi.selectedIndex = 0;
  showCommandButtons();
  renderBattle();
  if (battleUi.presenting) await playPresentationEvents();
  if (!battleUi.active) return;
  syncFinalPlayerState();
  if (battleUi.battle.outcome === "victory") battleUi.playSe("battleVictory");
  else if (battleUi.battle.outcome === "defeat") battleUi.playSe("playerDamage");
  else if (
    !battleUi.battle.presentationEvents?.some(event => event.type === "healing")
    && battleUi.battle.log.some(line => line.includes("回復"))
  ) battleUi.playSe("heal");
  battleUi.presenting = false;
  battleUi.presentationHp = null;
  battleUi.presentationBarrier = null;
  renderBattle();
  if (battleUi.autoActive && !battleUi.battle.outcome) scheduleAutoRound();
  else if (battleUi.battle.scriptedBattleType === "jirene_first_encounter" && !battleUi.battle.outcome) {
    scheduleJireneScriptedRound(700);
  }
}

function scheduleJireneScriptedRound(delayMs = 700) {
  clearAutoTimer();
  battleUi.autoTimer = window.setTimeout(() => {
    battleUi.autoTimer = 0;
    if (!battleUi.active || battleUi.presenting || battleUi.battle?.outcome
      || battleUi.battle?.scriptedBattleType !== "jirene_first_encounter") return;
    void executeCommand({ type: "wait" });
  }, delayMs);
}

async function executeAmbushOpening() {
  const startingHp = {
    player: battleUi.battle.player.hp,
    enemy: battleUi.battle.enemy.hp
  };
  const resolved = resolveEnemyAmbush({ battle: battleUi.battle });
  battleUi.battle = resolved.battle;
  battleUi.presenting = true;
  battleUi.presentationHp = startingHp;
  battleUi.onCharacterChanged({
    hp: startingHp.player,
    sp: battleUi.battle.player.sp,
    statuses: structuredClone(battleUi.battle.player.statuses),
    inventory: structuredClone(battleUi.battle.player.inventory),
    herbicideTrialUses: Number(battleUi.battle.player.herbicideTrialUses) || 0,
    alive: startingHp.player > 0
  });
  renderBattle();
  if (battleUi.battle.presentationEvents?.length) await playPresentationEvents();
  if (!battleUi.active) return;
  syncFinalPlayerState();
  if (battleUi.battle.outcome === "defeat") battleUi.playSe("playerDamage");
  battleUi.presenting = false;
  battleUi.presentationHp = null;
  renderBattle();
}

async function playPresentationEvents() {
  const events = battleUi.battle.presentationEvents || [];
  const image = battleUi.root.querySelector("#battleEnemyImage");
  for (const event of events) {
    if (!battleUi.active) return;
    if (event.playerChargePresentationId && event.hitIndex === 0) {
      await playPlayerChargePresentation({
        root: battleUi.root,
        skillId: event.playerChargePresentationId,
        playSe: battleUi.playSe
      });
    }
    if (event.type === "npcChargeSkill") {
      battleUi.onNpcSupport(event.npcId);
      battleUi.onNpcCharge(event.npcId, 100);
      battleUi.messageEl.textContent = event.message;
      battleUi.messageEl.classList.add("is-npc-charge-skill");
      await playNpcChargeCutIn(event);
      battleUi.messageEl.classList.remove("is-npc-charge-skill");
      battleUi.onNpcCharge(event.npcId, 0);
      continue;
    }
    applyPresentationHp(event);
    if (event.type === "barrierDamage") battleUi.presentationBarrier = Math.max(0, Number(event.remaining) || 0);
    if (event.npcId) battleUi.onNpcSupport(event.npcId);
    renderBattleVitals();
    if (event.targetSide === "player") {
      const hp = battleUi.presentationHp?.player ?? battleUi.battle.player.hp;
      battleUi.onCharacterChanged({ hp, alive: hp > 0 });
    }
    battleUi.messageEl.textContent = formatPresentationMessage(event);
    const dedicatedPresentationPlayed = event.targetSide === "enemy" && event.hit
      ? await playBattleSkillPresentation({
        root: battleUi.root,
        presentationId: event.battlePresentationId,
        damage: event.damage
      })
      : false;
    if (event.type === "healing") {
      showBattleNumber(event.targetSide, event.amount, "healing");
      battleUi.playSe("heal");
    } else if (event.type === "barrierDamage") {
      showBattleNumber("player", event.amount, "barrier");
    } else if (!dedicatedPresentationPlayed && (event.hit || event.type === "damage" || event.type === "poisonDamage" || event.type === "bleedingDamage")) {
      showBattleNumber(
        event.targetSide,
        event.damage ?? event.amount,
        event.type === "poisonDamage" ? "poison" : "damage",
        event.hitIndex,
        event.hitCount,
        event.targetIndex
      );
    }
    const targetImage = event.targetSide === "enemy" && battleUi.battle.enemies
      ? battleUi.root.querySelector(`.battle-enemy-member[data-index="${event.targetIndex ?? battleUi.battle.targetIndex}"] .battle-enemy-member-image`)
      : image;
    if (event.targetSide === "enemy" && event.hit && !dedicatedPresentationPlayed) {
      targetImage?.classList.remove("is-hit");
      if (targetImage) void targetImage.offsetWidth;
      targetImage?.classList.add("is-hit");
      battleUi.playSe("attackHit");
    } else if (event.targetSide === "player" && event.hit && Number(event.damage) > 0 && !event.blockedByNpcWall) {
      battleUi.playSe("playerDamage");
    }
    const duration = dedicatedPresentationPlayed ? 0 : event.targetSide === "player" && event.hit ? 520 : event.hit ? 360 : 280;
    await delay(duration);
    targetImage?.classList.remove("is-hit");
    if (event.slashExecution) await playSlashEffect(targetImage);
  }
}

async function playNpcChargeCutIn(event) {
  const cutIn = battleUi.root.querySelector("#npcChargeCutIn");
  const image = cutIn?.querySelector("img");
  if (!cutIn || !image || !event.cutIn) return;
  image.src = event.cutIn;
  image.alt = `${event.skillName || "NPCチャージスキル"} カットイン`;
  cutIn.classList.remove("is-active");
  void cutIn.offsetWidth;
  cutIn.classList.add("is-active");
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  await delay(reduced ? 450 : 2500);
  cutIn.classList.remove("is-active");
}

function syncFinalPlayerState() {
  battleUi.onCharacterChanged({
    hp: battleUi.battle.player.hp,
    sp: battleUi.battle.player.sp,
    statuses: structuredClone(battleUi.battle.player.statuses),
    inventory: structuredClone(battleUi.battle.player.inventory),
    herbicideTrialUses: Number(battleUi.battle.player.herbicideTrialUses) || 0,
    alive: battleUi.battle.player.alive,
    npcSystem: structuredClone(battleUi.battle.player.npcSystem),
    playerCharge: structuredClone(battleUi.battle.player.playerCharge)
  });
}

async function playSlashEffect(image) {
  const stage = image?.closest(".battle-enemy-stage");
  if (!stage || !image.src) return;
  const stageRect = stage.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  const fragments = ["upper", "lower"].map(part => {
    const fragment = image.cloneNode(false);
    fragment.removeAttribute("id");
    fragment.className = `battle-slash-fragment is-${part}`;
    fragment.style.left = `${imageRect.left - stageRect.left}px`;
    fragment.style.top = `${imageRect.top - stageRect.top}px`;
    fragment.style.width = `${imageRect.width}px`;
    fragment.style.height = `${imageRect.height}px`;
    stage.append(fragment);
    return fragment;
  });
  const slash = document.createElement("span");
  slash.className = "battle-slash-line";
  stage.append(slash);
  image.style.visibility = "hidden";
  await delay(1250);
  fragments.forEach(fragment => fragment.remove());
  slash.remove();
  image.style.visibility = "";
}

function applyPresentationHp(event) {
  if (!battleUi.presentationHp || !["player", "enemy"].includes(event.targetSide)) return;
  battleUi.presentationHp = applyHpPresentationEvent(battleUi.presentationHp, battleUi.battle, event);
}

export function applyHpPresentationEvent(presentationHp, battle, event) {
  if (!presentationHp || !["player", "enemy"].includes(event?.targetSide)) return presentationHp;
  const next = { ...presentationHp };
  if (Array.isArray(presentationHp.enemies)) next.enemies = [...presentationHp.enemies];
  const amount = Math.max(0, Math.floor(Number(event.damage ?? event.amount) || 0));
  if (event.targetSide === "enemy" && Array.isArray(next.enemies) && battle?.enemies) {
    const targetIndex = Number.isInteger(event.targetIndex) ? event.targetIndex : battle.targetIndex;
    const enemy = battle.enemies[targetIndex];
    if (!enemy || !Number.isFinite(next.enemies[targetIndex])) return next;
    if (event.type === "healing") {
      next.enemies[targetIndex] = Math.min(enemy.maxHp, next.enemies[targetIndex] + amount);
    } else if (event.hit || ["damage", "poisonDamage", "bleedingDamage"].includes(event.type)) {
      next.enemies[targetIndex] = Math.max(0, next.enemies[targetIndex] - amount);
    }
    return next;
  }
  if (event.type === "healing") {
    const maximum = battle?.[event.targetSide]?.maxHp ?? Number.MAX_SAFE_INTEGER;
    next[event.targetSide] = Math.min(maximum, next[event.targetSide] + amount);
  } else if (event.hit || ["damage", "poisonDamage", "bleedingDamage"].includes(event.type)) {
    const minimum = battle?.scriptedNonlethal ? 1 : 0;
    next[event.targetSide] = Math.max(minimum, next[event.targetSide] - amount);
  }
  return next;
}

function formatPresentationMessage(event) {
  if (event.type !== "attackHit" || !event.actorName) return event.message;
  const actorName = battleUi.concealed && event.actorSide === "enemy" ? "？？？？？" : event.actorName;
  return `${actorName}の${event.actionName || "攻撃"}！\n${event.message}`;
}

function showBattleNumber(targetSide, amount, kind, hitIndex = null, hitCount = 1, targetIndex = null) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) return;
  const layerId = targetSide === "enemy" ? "battleEnemyNumbers" : "battlePlayerNumbers";
  const layer = targetSide === "enemy" && battleUi.battle?.enemies
    ? battleUi.root.querySelector(`.battle-enemy-member[data-index="${targetIndex ?? battleUi.battle.targetIndex}"] .battle-number-layer`)
    : document.getElementById(layerId);
  if (!layer) return;
  const number = document.createElement("span");
  const multiLevel = hitCount > 1
    ? Number(hitIndex) % 2 === 0 ? " is-multi-high" : " is-multi-low"
    : "";
  number.className = `battle-number is-${kind}${multiLevel}`;
  number.textContent = String(value);
  layer.append(number);
  number.addEventListener("animationend", () => number.remove(), { once: true });
  window.setTimeout(() => number.remove(), 900);
}

function startAutoBattle() {
  battleUi.autoActive = true;
  battleUi.messageEl.textContent = "オート戦闘を開始した。\n＊Bボタンで中断";
  scheduleAutoRound();
}

function scheduleAutoRound() {
  clearAutoTimer();
  battleUi.autoTimer = window.setTimeout(() => {
    battleUi.autoTimer = 0;
    if (!battleUi.active || !battleUi.autoActive || battleUi.battle?.outcome) return;
    executeCommand({ type: "attack" });
  }, 450);
}

function stopAutoBattle() {
  battleUi.autoActive = false;
  clearAutoTimer();
  battleUi.playSe("cancel");
  battleUi.messageEl.textContent = "オート戦闘を中断した。";
}

function attemptEscape() {
  const escapeRate = getEquipmentAdjustedEscapeRate({
    escapeRate: battleUi.battle.enemy.escapeRate,
    weaponId: battleUi.battle.player.equipment?.weaponId,
    isBoss: battleUi.battle.enemy.isBoss
  });
  const result = resolveEscapeAttempt({
    escapeRate
  });
  if (result.success) {
    battleUi.battle.player.playerCharge = { value: 0, cooldown: 0 };
    battleUi.onCharacterChanged({
      playerCharge: { ...battleUi.battle.player.playerCharge }
    });
    battleUi.battle.outcome = "escaped";
    battleUi.battle.phase = "complete";
    battleUi.battle.log = ["戦闘から逃げ切った！"];
    renderBattle();
    return;
  }
  battleUi.battle.log = ["逃げられなかった！"];
  executeCommand({ type: "wait" });
  battleUi.battle.log.unshift("逃げられなかった！");
  renderBattle();
}

function finishBattle() {
  const outcome = battleUi.battle.outcome;
  if (outcome === "jireneScriptedDefeat") {
    battleUi.battle.player.playerCharge = structuredClone(
      battleUi.battle.scriptedInitialPlayerCharge || { value: 0, cooldown: 0 }
    );
  }
  battleUi.battle.player.hp = Math.min(battleUi.battle.player.maxHp, battleUi.battle.player.hp);
  battleUi.battle.player.statuses = clearBattleOnlyStatuses(battleUi.battle.player.statuses);
  battleUi.onCharacterChanged({
    hp: battleUi.battle.player.hp,
    alive: battleUi.battle.player.hp > 0,
    statuses: structuredClone(battleUi.battle.player.statuses),
    npcSystem: structuredClone(battleUi.battle.player.npcSystem)
  });
  const snapshot = structuredClone(battleUi.battle);
  if (snapshot.enemies) {
    snapshot.enemy = snapshot.enemies.find(enemy => enemy.id === snapshot.encounterBossId) || snapshot.enemy;
    snapshot.enemy.experienceReward = snapshot.enemies.reduce(
      (sum, enemy) => sum + Math.max(0, Math.floor(Number(enemy.experienceReward) || 0)),
      0
    );
  }
  closeBattle();
  if (outcome === "victory") battleUi.onVictory(snapshot);
  else if (outcome === "defeat") battleUi.onDefeat(snapshot);
  else if (outcome === "jireneScriptedDefeat") battleUi.onScriptedDefeat(snapshot);
  else battleUi.onEscape(snapshot);
}

function closeBattle() {
  clearAutoTimer();
  battleUi.autoActive = false;
  battleUi.presenting = false;
  battleUi.presentationHp = null;
  battleUi.presentationBarrier = null;
  battleUi.active = false;
  battleUi.root.hidden = true;
  document.body.classList.remove("battle-active");
  battleUi.commandRoot.replaceChildren(...battleUi.normalButtons);
  delete battleUi.commandRoot.dataset.battleActive;
  delete battleUi.commandRoot.dataset.battleComplete;
  battleUi.messageEl.classList.remove("is-skill-description");
  battleUi.battle = null;
  const barrier = document.getElementById("sphinxBarrierStatus");
  if (barrier) barrier.hidden = true;
}

function showCommandButtons() {
  battleUi.messageEl.classList.remove("is-skill-description");
  battleUi.pendingCommand = null;
  if (battleUi.battle?.scriptedBattleType === "jirene_first_encounter") {
    hideBattleCommands();
    battleUi.messageEl.textContent = formatBattleMessage(battleUi.battle);
    return;
  }
  battleUi.battleButtons.forEach((button, index) => {
    const [id, label] = COMMANDS[index];
    button.dataset.battleCommand = id;
    delete button.dataset.skillId;
    delete button.dataset.targetIndex;
    button.textContent = label;
    button.disabled = false;
    button.classList.remove("is-unavailable");
  });
  mountButtons("戦闘コマンド");
  if (battleUi.battle) battleUi.messageEl.textContent = formatBattleMessage(battleUi.battle);
}

function mountButtons(label) {
  battleUi.commandRoot.replaceChildren(...battleUi.battleButtons);
  battleUi.commandRoot.dataset.battleActive = "true";
  delete battleUi.commandRoot.dataset.battleComplete;
  battleUi.commandRoot.setAttribute("aria-label", label);
  renderSelection();
}

function hideBattleCommands() {
  battleUi.battleButtons.forEach(button => {
    button.textContent = "";
    button.disabled = true;
    button.classList.remove("is-selected", "is-unavailable");
  });
  battleUi.commandRoot.dataset.battleActive = "true";
  battleUi.commandRoot.dataset.battleComplete = "true";
  battleUi.commandRoot.setAttribute("aria-label", "戦闘終了");
}

function renderSelection() {
  battleUi.battleButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === battleUi.selectedIndex && !button.disabled);
  });
}

function renderBattle() {
  const battle = battleUi.battle;
  if (!battle) return;
  if (battle.outcome) hideBattleCommands();
  battleUi.messageEl.classList.remove("is-skill-description");
  setText("battlePlayerName", `${battle.player.name} [${battle.player.jobLabel || battle.player.job}]`);
  battleUi.root.querySelector("#battlePlayerName")?.classList.toggle(
    "condition-poison",
    ["POISON", "DEATH POISON"].includes(statusText(battle.player))
  );
  renderBattleVitals();
  setText("battlePlayerSp", `${battle.player.sp} / ${battle.player.maxSp}`);
  setText("battlePlayerCondition", statusText(battle.player));
  const party = battleUi.root.querySelector("#battleEnemyParty");
  if (battle.enemies) renderEnemyParty(battle);
  else if (party) party.hidden = true;
  const enemyName = battleUi.root.querySelector("#battleEnemyName");
  setText("battleEnemyName", battleUi.concealed ? "？？？？？" : battle.enemy.name);
  renderEnemyWeakness(battle.enemy);
  enemyName?.classList.toggle("is-defense-down", hasEnemyDefenseDown(battle.enemy));
  setText("battleEnemyCondition", statusText(battle.enemy));
  const image = battleUi.root.querySelector("#battleEnemyImage");
  image.src = battle.enemy.image || "";
  image.alt = battleUi.concealed ? "正体不明の敵" : battle.enemy.name;
  const defeated = ["victory", "enemyEscaped"].includes(battle.outcome) && !battleUi.presenting;
  image.classList.toggle("is-defeated", defeated);
  image.classList.toggle("is-concealed", battleUi.concealed);
  image.classList.toggle("is-jabberwock", battle.enemy.id === "jabberwock_event_boss");
  image.classList.toggle("is-iron-maiden", battle.enemy.id === "iron_maiden_b29f");
  image.classList.toggle("is-thief-leader", battle.enemy.id === "thief_leader_event_boss");
  image.classList.toggle("is-glacies", battle.enemy.id === "glacies_event_boss");
  image.classList.toggle("is-eiskoenigin", battle.enemy.id === "eiskoenigin_b49f");
  image.classList.toggle("is-fleischfresser", battle.enemy.id === "fleischfresser_b59f");
  image.classList.toggle("is-otherworldly-wisdom", battle.enemy.id === "otherworldly_wisdom_b4f");
  image.classList.toggle("is-todes-scorpio", battle.enemy.id === "todes_scorpio_b64f");
  image.classList.toggle("is-sphinx", battle.enemy.id === "sphinx_b69f");
  image.classList.toggle("is-jirene", battle.enemy.id === "jirene_b79f");
  const enemyStage = battleUi.root.querySelector(".battle-enemy-stage");
  enemyStage.hidden = Boolean(battle.enemies);
  enemyStage?.classList.toggle("is-defeated", defeated);
  enemyStage?.classList.toggle("is-eiskoenigin", battle.enemy.id === "eiskoenigin_b49f" && !defeated && !battleUi.concealed);
  battleUi.messageEl.textContent = formatBattleMessage(battle);
}

function renderEnemyParty(battle) {
  const party = battleUi.root.querySelector("#battleEnemyParty");
  if (!party) return;
  party.hidden = false;
  if (party.children.length !== battle.enemies.length) {
    party.replaceChildren(...battle.enemies.map((enemy, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "battle-enemy-member";
      button.dataset.index = String(index);
      button.innerHTML = '<strong class="battle-enemy-member-name"></strong><span class="battle-enemy-member-weakness"></span><img class="battle-enemy-member-image" alt=""><span class="battle-enemy-member-hp"><i></i></span><span class="battle-number-layer" aria-hidden="true"></span>';
      button.addEventListener("click", () => selectEnemyTarget(index));
      return button;
    }));
  }
  [...party.children].forEach((member, index) => {
    const enemy = battle.enemies[index];
    const presentedHp = battleUi.presentationHp?.enemies?.[index];
    const displayEnemy = Number.isFinite(presentedHp) ? { ...enemy, hp: presentedHp } : enemy;
    const selectedIndex = battleUi.mode === "targets" ? battleUi.selectedIndex : battle.targetIndex;
    member.classList.toggle("is-selected", index === selectedIndex && enemy.alive);
    member.classList.toggle("is-defeated", !enemy.alive);
    member.disabled = !enemy.alive;
    member.querySelector(".battle-enemy-member-name").textContent = battleUi.concealed ? "？？？？？" : enemy.name;
    renderWeaknessIcons(member.querySelector(".battle-enemy-member-weakness"), enemy);
    const img = member.querySelector(".battle-enemy-member-image");
    img.src = enemy.image || "";
    img.alt = battleUi.concealed ? "正体不明の敵" : enemy.name;
    member.querySelector(".battle-enemy-member-hp > i").style.width = `${getBattleHpPercent(displayEnemy)}%`;
  });
}

function renderEnemyPartySelection() {
  const battle = battleUi.battle;
  if (!battle?.enemies) return;
  const selectedIndex = battleUi.mode === "targets" ? battleUi.selectedIndex : battle.targetIndex;
  const party = battleUi.root.querySelector("#battleEnemyParty");
  [...(party?.children || [])].forEach((member, index) => {
    member.classList.toggle("is-selected", index === selectedIndex && battle.enemies[index]?.alive);
  });
}

export function hasEnemyDefenseDown(enemy) {
  return Boolean(enemy?.statuses?.some(status =>
    ["npc_defense_down", "armor_break", "charge_defense_down_15", "charge_defense_down_25"]
      .includes(status?.id || status?.statusId)
    && status.active !== false
    && (!Number.isFinite(Number(status.remainingTurns)) || Number(status.remainingTurns) > 0)
  ));
}

function renderBattleVitals() {
  const battle = battleUi.battle;
  if (!battle) return;
  const playerHp = battleUi.presentationHp?.player ?? battle.player.hp;
  const enemyHp = battleUi.presentationHp?.enemy ?? battle.enemy.hp;
  setText("battlePlayerHp", `${playerHp} / ${battle.player.maxHp}`);
  renderSphinxBarrier();
  setText("battleEnemyHp", `${enemyHp} / ${battle.enemy.maxHp}`);
  renderBossHpMeter({ ...battle.enemy, hp: enemyHp });
  if (battle.enemies) renderEnemyParty(battle);
}

const WEAKNESS_ICONS = Object.freeze({
  fire: "images/ui/effect_01.webp",
  ice: "images/ui/effect_02.webp",
  lightning: "images/ui/effect_03.webp",
  holy: "images/ui/effect_04.webp",
  dark: "images/ui/effect_05.webp"
});

function getVisibleWeaknesses(enemy) {
  if (!battleUi.battle?.sphinxWisdomActiveAtStart || battleUi.concealed) return [];
  return Object.entries(enemy?.elementMultipliers || {})
    .filter(([element, multiplier]) => WEAKNESS_ICONS[element] && Number(multiplier) > 1)
    .map(([element]) => element);
}

function renderWeaknessIcons(root, enemy) {
  if (!root) return;
  const elements = getVisibleWeaknesses(enemy);
  root.replaceChildren(...elements.map(element => {
    const image = document.createElement("img");
    image.src = WEAKNESS_ICONS[element];
    image.alt = element;
    return image;
  }));
  root.hidden = elements.length === 0;
}

function renderEnemyWeakness(enemy) {
  const root = battleUi.root.querySelector("#battleEnemyWeakness");
  const icons = root?.querySelector("span");
  if (!root || !icons) return;
  renderWeaknessIcons(icons, enemy);
  root.hidden = icons.hidden;
}

function renderSphinxBarrier() {
  const root = document.getElementById("sphinxBarrierStatus");
  if (!root) return;
  const amount = Math.max(0, Math.floor(Number(
    battleUi.presentationBarrier ?? battleUi.battle?.sphinxBarrier
  ) || 0));
  root.hidden = amount <= 0;
  const output = root.querySelector("output");
  if (output) output.textContent = String(amount);
}

function renderBossHpMeter(enemy) {
  const meter = battleUi.root.querySelector("#battleBossHpMeter");
  const fill = battleUi.root.querySelector("#battleBossHpFill");
  if (!meter || !fill) return;
  const isBoss = Boolean(enemy?.isBoss);
  meter.hidden = !isBoss;
  if (!isBoss) return;
  const percent = getBattleHpPercent(enemy);
  fill.style.width = `${percent}%`;
  meter.setAttribute("aria-valuenow", String(percent));
  meter.classList.toggle("is-critical", percent > 0 && percent < 10);
}

export function getBattleHpPercent(enemy) {
  const maxHp = Math.max(1, Number(enemy?.maxHp) || 1);
  const hp = Math.max(0, Math.min(maxHp, Number(enemy?.hp) || 0));
  return Math.ceil((hp / maxHp) * 100);
}

function formatBattleMessage(battle) {
  const prompt = battle.outcome ? "＊Aボタンで次へ" : "";
  const visibleLogLines = battle.log.slice(-(prompt ? 1 : 2));
  const lines = battleUi.concealed
    ? visibleLogLines.map(line => line.replaceAll(battle.enemy.name, "？？？？？"))
    : visibleLogLines;
  return [...lines, prompt].filter(Boolean).join("\n");
}

function clearAutoTimer() {
  if (!battleUi.autoTimer) return;
  window.clearTimeout(battleUi.autoTimer);
  battleUi.autoTimer = 0;
}

function delay(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function statusText(combatant) {
  const names = (combatant.statuses || []).map(status => status.name).filter(Boolean);
  return names.length ? names.join("・") : "GOOD";
}

function setText(id, text) {
  const element = battleUi.root.querySelector(`#${id}`);
  if (element) element.textContent = text;
}
