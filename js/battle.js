import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { resolveEscapeAttempt } from "../combat/resolve-escape.js";

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
  autoActive: false,
  autoTimer: 0,
  presenting: false,
  getCharacter: () => null,
  onCharacterChanged: () => {},
  onVictory: () => {},
  onDefeat: () => {},
  onEscape: () => {},
  openSkills: () => false,
  playSe: () => {}
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

export function startBattle(enemy) {
  const character = battleUi.getCharacter();
  if (!character || battleUi.active) return false;
  battleUi.active = true;
  battleUi.mode = "commands";
  battleUi.selectedIndex = 0;
  battleUi.autoActive = false;
  clearAutoTimer();
  battleUi.battle = createBattleState({ character, enemy });
  battleUi.root.hidden = false;
  document.body.classList.add("battle-active");
  showCommandButtons();
  battleUi.playSe("battleStart");
  renderBattle();
  return true;
}

export function isBattleActive() {
  return battleUi.active;
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
  if (action === "cancel") return true;
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
}

function activateSelected() {
  const button = battleUi.battleButtons[battleUi.selectedIndex];
  if (!button || button.disabled) return;
  battleUi.playSe("confirm");
  const command = button.dataset.battleCommand;
  if (command === "skills") {
    battleUi.openSkills({
      character: battleUi.battle.player,
      onUse: useBattleSkill
    });
    return;
  }
  if (command === "attack") executeCommand({ type: "attack" });
  else if (command === "guard") executeCommand({ type: "guard" });
  else if (command === "auto") startAutoBattle();
  else if (command === "escape") attemptEscape();
  else {
    battleUi.messageEl.textContent = `${button.textContent}は現在未実装です。`;
  }
}

async function useBattleSkill(skillId) {
  await executeCommand({ type: "skill", skillId });
  return { accepted: true };
}

async function executeCommand(command) {
  const resolved = resolveBattleRound({
    battle: battleUi.battle,
    playerCommand: command
  });
  if (!resolved.accepted) {
    battleUi.messageEl.textContent = resolved.reason === "insufficientSp"
      ? "SPが足りない。"
      : "現在使用できません。";
    return;
  }
  battleUi.battle = resolved.battle;
  battleUi.presenting = battleUi.battle.presentationEvents?.length > 0;
  battleUi.onCharacterChanged({
    hp: battleUi.battle.player.hp,
    sp: battleUi.battle.player.sp,
    statuses: structuredClone(battleUi.battle.player.statuses),
    alive: battleUi.battle.player.alive
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
  if (battleUi.battle.outcome === "victory") battleUi.playSe("battleVictory");
  else if (battleUi.battle.outcome === "defeat") battleUi.playSe("playerDamage");
  else if (
    !battleUi.battle.presentationEvents?.some(event => event.type === "healing")
    && battleUi.battle.log.some(line => line.includes("回復"))
  ) battleUi.playSe("heal");
  battleUi.presenting = false;
  renderBattle();
  if (battleUi.autoActive && !battleUi.battle.outcome) scheduleAutoRound();
}

async function playPresentationEvents() {
  const events = battleUi.battle.presentationEvents || [];
  const image = battleUi.root.querySelector("#battleEnemyImage");
  for (const event of events) {
    if (!battleUi.active) return;
    battleUi.messageEl.textContent = event.message;
    if (event.type === "healing") {
      showBattleNumber(event.targetSide, event.amount, "healing");
      battleUi.playSe("heal");
    } else if (event.hit || event.type === "damage" || event.type === "poisonDamage") {
      showBattleNumber(
        event.targetSide,
        event.damage ?? event.amount,
        event.type === "poisonDamage" ? "poison" : "damage",
        event.hitIndex,
        event.hitCount
      );
    }
    if (event.targetSide === "enemy" && event.hit) {
      image.classList.remove("is-hit");
      void image.offsetWidth;
      image.classList.add("is-hit");
      battleUi.playSe("attackHit");
    } else if (event.targetSide === "player" && event.hit) {
      battleUi.playSe("playerDamage");
    }
    await delay(event.hit ? 320 : 240);
    image.classList.remove("is-hit");
  }
}

function showBattleNumber(targetSide, amount, kind, hitIndex = null, hitCount = 1) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) return;
  const layerId = targetSide === "enemy" ? "battleEnemyNumbers" : "battlePlayerNumbers";
  const layer = document.getElementById(layerId);
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
  const result = resolveEscapeAttempt({
    escapeRate: battleUi.battle.enemy.escapeRate
  });
  if (result.success) {
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
  const snapshot = structuredClone(battleUi.battle);
  closeBattle();
  if (outcome === "victory") battleUi.onVictory(snapshot);
  else if (outcome === "defeat") battleUi.onDefeat(snapshot);
  else battleUi.onEscape(snapshot);
}

function closeBattle() {
  clearAutoTimer();
  battleUi.autoActive = false;
  battleUi.presenting = false;
  battleUi.active = false;
  battleUi.root.hidden = true;
  document.body.classList.remove("battle-active");
  battleUi.commandRoot.replaceChildren(...battleUi.normalButtons);
  delete battleUi.commandRoot.dataset.battleActive;
  delete battleUi.commandRoot.dataset.battleComplete;
  battleUi.messageEl.classList.remove("is-skill-description");
  battleUi.battle = null;
}

function showCommandButtons() {
  battleUi.messageEl.classList.remove("is-skill-description");
  battleUi.battleButtons.forEach((button, index) => {
    const [id, label] = COMMANDS[index];
    button.dataset.battleCommand = id;
    delete button.dataset.skillId;
    button.textContent = label;
    button.disabled = false;
    button.classList.toggle("is-unavailable", id === "items");
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
  setText("battlePlayerHp", `${battle.player.hp} / ${battle.player.maxHp}`);
  setText("battlePlayerSp", `${battle.player.sp} / ${battle.player.maxSp}`);
  setText("battlePlayerCondition", statusText(battle.player));
  setText("battleEnemyName", battle.enemy.name);
  setText("battleEnemyHp", `${battle.enemy.hp} / ${battle.enemy.maxHp}`);
  setText("battleEnemyCondition", statusText(battle.enemy));
  const image = battleUi.root.querySelector("#battleEnemyImage");
  image.src = battle.enemy.image || "";
  image.alt = battle.enemy.name;
  const defeated = battle.outcome === "victory" && !battleUi.presenting;
  image.classList.toggle("is-defeated", defeated);
  battleUi.root.querySelector(".battle-enemy-stage")?.classList.toggle("is-defeated", defeated);
  battleUi.messageEl.textContent = formatBattleMessage(battle);
}

function formatBattleMessage(battle) {
  const prompt = battle.outcome ? "＊Aボタンで次へ" : "";
  const visibleLogLines = battle.log.slice(-(prompt ? 1 : 2));
  return [...visibleLogLines, prompt].filter(Boolean).join("\n");
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
