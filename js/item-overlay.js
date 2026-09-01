import { ITEMS } from "../data/items.js";
import { getItemCount } from "../data/inventory.js";
import { getItemUnavailableReason, getItemUnavailableReasonForEnemies } from "../combat/resolve-item-use.js";

const BATTLE_ITEMS_PER_COLUMN = 6;
const BATTLE_ITEMS_PER_PAGE = BATTLE_ITEMS_PER_COLUMN * 2;

const overlay = {
  root: null, list: null, pageEl: null, prevButton: null, nextButton: null, backButton: null, messageEl: null,
  active: false, selectedIndex: 0, page: 0, items: [], character: null, context: "dungeon",
  lastSelectionByContext: {},
  enemy: null, enemies: null, torchFuel: 0, treasureCompassActive: false, onUse: async () => ({ accepted: false }),
  onClose: () => {}, playSe: () => {}, previousMessage: ""
};

export function configureItemOverlay(options) {
  Object.assign(overlay, options);
  overlay.list = overlay.root.querySelector("[data-item-list]");
  overlay.pageEl = overlay.root.querySelector("[data-item-page]");
  overlay.prevButton = overlay.root.querySelector("[data-item-prev]");
  overlay.nextButton = overlay.root.querySelector("[data-item-next]");
  overlay.backButton = overlay.root.querySelector("[data-item-back]");
  overlay.backButton.addEventListener("click", () => closeItemOverlay());
  overlay.prevButton?.addEventListener("click", () => changePage(-1));
  overlay.nextButton?.addEventListener("click", () => changePage(1));
}

export function openItemOverlay({ context = "dungeon", character, enemy = null, enemies = null, torchFuel = 0, treasureCompassActive = false, onUse, onClose } = {}) {
  if (overlay.active || !character) return false;
  overlay.active = true;
  overlay.context = context;
  overlay.character = character;
  overlay.enemy = enemy;
  overlay.enemies = enemies;
  overlay.torchFuel = torchFuel;
  overlay.treasureCompassActive = Boolean(treasureCompassActive);
  overlay.items = ITEMS.filter(item =>
    getItemCount(character.inventory, item.id) > 0 && item.usableIn?.includes(context)
  );
  overlay.selectedIndex = restoreSelectedIndex(overlay.items, overlay.lastSelectionByContext[context]);
  overlay.page = context === "battle" ? Math.floor(overlay.selectedIndex / BATTLE_ITEMS_PER_PAGE) : 0;
  overlay.onUse = onUse || overlay.onUse;
  overlay.onClose = onClose || (() => {});
  overlay.previousMessage = overlay.messageEl.textContent;
  overlay.root.classList.toggle("is-battle-items", context === "battle");
  overlay.root.hidden = false;
  document.body.classList.add("item-overlay-open");
  render();
  return true;
}

export function closeItemOverlay({ restoreMessage = true } = {}) {
  if (!overlay.active) return false;
  overlay.active = false;
  overlay.root.hidden = true;
  overlay.root.classList.remove("is-battle-items");
  document.body.classList.remove("item-overlay-open");
  overlay.messageEl.classList.remove("is-skill-description");
  if (restoreMessage) overlay.messageEl.textContent = overlay.previousMessage;
  overlay.onClose();
  return true;
}

export function handleItemOverlayInput(action) {
  if (!overlay.active) return false;
  if (action === "cancel") {
    overlay.playSe("cancel");
    closeItemOverlay();
  } else if (action === "up") {
    moveVertical(-1);
  } else if (action === "down") {
    moveVertical(1);
  } else if (action === "left") {
    moveHorizontal(-1);
  } else if (action === "right") {
    moveHorizontal(1);
  } else if (action === "confirm") {
    activate();
  }
  return true;
}

function moveLinear(amount) {
  const count = overlay.items.length + 1;
  overlay.selectedIndex = (overlay.selectedIndex + amount + count) % count;
  overlay.playSe("cursorMove");
  renderSelection();
}

function moveVertical(amount) {
  if (overlay.context !== "battle") return moveLinear(amount);
  const { start, items } = getCurrentPage();
  if (!items.length) return selectBack();
  if (overlay.selectedIndex === overlay.items.length) {
    overlay.selectedIndex = amount < 0 ? start + items.length - 1 : start;
  } else {
    const local = overlay.selectedIndex - start;
    const columnStart = Math.floor(local / BATTLE_ITEMS_PER_COLUMN) * BATTLE_ITEMS_PER_COLUMN;
    const columnLength = Math.min(BATTLE_ITEMS_PER_COLUMN, items.length - columnStart);
    const row = local - columnStart;
    const nextRow = row + amount;
    overlay.selectedIndex = nextRow >= 0 && nextRow < columnLength
      ? start + columnStart + nextRow
      : overlay.items.length;
  }
  overlay.playSe("cursorMove");
  renderSelection();
}

function moveHorizontal(amount) {
  if (overlay.context !== "battle") return moveLinear(amount);
  const { start, items } = getCurrentPage();
  if (overlay.selectedIndex === overlay.items.length) return changePage(amount);
  const local = overlay.selectedIndex - start;
  const targetLocal = local + amount * BATTLE_ITEMS_PER_COLUMN;
  if (targetLocal >= 0 && targetLocal < items.length) {
    overlay.selectedIndex = start + targetLocal;
    overlay.playSe("cursorMove");
    renderSelection();
    return;
  }
  changePage(amount, local % BATTLE_ITEMS_PER_COLUMN);
}

function selectBack() {
  overlay.selectedIndex = overlay.items.length;
  overlay.playSe("cursorMove");
  renderSelection();
}

function changePage(amount, preferredRow = 0) {
  if (overlay.context !== "battle") return false;
  const pageCount = Math.max(1, Math.ceil(overlay.items.length / BATTLE_ITEMS_PER_PAGE));
  if (pageCount <= 1) return false;
  overlay.page = (overlay.page + amount + pageCount) % pageCount;
  const { start, items } = getCurrentPage();
  overlay.selectedIndex = items.length ? start + Math.min(preferredRow, items.length - 1) : overlay.items.length;
  overlay.playSe("cursorMove");
  render();
  return true;
}

function getCurrentPage() {
  const pageSize = overlay.context === "battle" ? BATTLE_ITEMS_PER_PAGE : Math.max(1, overlay.items.length);
  const start = overlay.page * pageSize;
  return { start, items: overlay.items.slice(start, start + pageSize) };
}

async function activate() {
  if (overlay.selectedIndex === overlay.items.length) {
    overlay.playSe("cancel");
    closeItemOverlay();
    return;
  }
  const item = overlay.items[overlay.selectedIndex];
  const reason = unavailableReason(item);
  if (reason) {
    overlay.playSe(reason === "deadlyPoisonNotCurable" ? "costOver" : "cancel");
    showReason(reason);
    return;
  }
  overlay.playSe("confirm");
  overlay.lastSelectionByContext[overlay.context] = { id: item.id, index: overlay.selectedIndex };
  if (overlay.context === "battle") closeItemOverlay();
  const result = await overlay.onUse(item.id);
  if (!result?.accepted) {
    showReason(result?.reason);
    if (overlay.active) render();
    return;
  }
  if (overlay.active) closeItemOverlay({ restoreMessage: false });
}

function restoreSelectedIndex(items, remembered) {
  if (!items.length) return 0;
  const matchingIndex = items.findIndex(item => item.id === remembered?.id);
  if (matchingIndex >= 0) return matchingIndex;
  return Math.min(Math.max(0, Math.floor(Number(remembered?.index) || 0)), items.length - 1);
}

function render() {
  const { start, items } = getCurrentPage();
  const buttons = items.map((item, localIndex) => {
    const index = start + localIndex;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-overlay-item";
    const reason = unavailableReason(item);
    button.disabled = Boolean(reason && reason !== "deadlyPoisonNotCurable");
    button.classList.toggle("is-unavailable", Boolean(reason));
    button.setAttribute("aria-disabled", reason ? "true" : "false");
    button.innerHTML = `<span>${item.name}</span><small>×${getItemCount(overlay.character.inventory, item.id)}</small>`;
    button.addEventListener("click", () => {
      overlay.selectedIndex = index;
      renderSelection();
      activate();
    });
    return button;
  });
  overlay.list.replaceChildren(...buttons);
  const pageCount = overlay.context === "battle" ? Math.max(1, Math.ceil(overlay.items.length / BATTLE_ITEMS_PER_PAGE)) : 1;
  overlay.pageEl.textContent = `${overlay.page + 1}/${pageCount}`;
  if (overlay.prevButton) overlay.prevButton.hidden = overlay.context !== "battle" || pageCount <= 1;
  if (overlay.nextButton) overlay.nextButton.hidden = overlay.context !== "battle" || pageCount <= 1;
  renderSelection();
}

function renderSelection() {
  const { start } = getCurrentPage();
  [...overlay.list.children].forEach((button, index) => button.classList.toggle("is-selected", start + index === overlay.selectedIndex));
  const backSelected = overlay.selectedIndex === overlay.items.length;
  overlay.backButton.classList.toggle("is-selected", backSelected);
  const item = overlay.items[overlay.selectedIndex];
  overlay.messageEl.classList.toggle("is-skill-description", !backSelected && Boolean(item));
  overlay.messageEl.textContent = backSelected
    ? (overlay.items.length ? "アイテム選択を終了する。" : "アイテムを所持していない。")
    : item.description;
}

function unavailableReason(item) {
  const options = {
    character: overlay.character, itemId: item.id, context: overlay.context,
    enemy: overlay.enemy, torchFuel: overlay.torchFuel,
    treasureCompassActive: overlay.treasureCompassActive
  };
  return overlay.context === "battle" && overlay.enemies?.length
    ? getItemUnavailableReasonForEnemies({ ...options, enemies: overlay.enemies })
    : getItemUnavailableReason(options);
}

function showReason(reason) {
  overlay.messageEl.classList.remove("is-skill-description");
  overlay.messageEl.textContent = ({
    fullHp: "HPは満タンだ。",
    fullSp: "SPは満タンだ。",
    noEffect: "今使っても効果がない。",
    deadlyPoisonNotCurable: "解毒剤では猛毒を治療できません。",
    fullTorch: "たいまつは十分に明るい。",
    battleOnly: "このアイテムは戦闘中のみ使用できる。",
    fieldOnly: "このアイテムは戦闘中には使用できない。",
    dungeonOnly: "このアイテムはダンジョン探索中のみ使用できる。",
    undeadOnly: "アンデッドにしか効果がない。",
    bossImmune: "ボスには効果がない。",
    notOwned: "そのアイテムは所持していない。",
    allheilmittelOncePerBattle: "アルハイルミッテルは1戦闘に1回だけ使用できる。"
  })[reason] || "現在使用できない。";
}
