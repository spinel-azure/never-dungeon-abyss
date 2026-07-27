import { ITEMS } from "../data/items.js";
import { getItemCount } from "../data/inventory.js";
import { getItemUnavailableReason } from "../combat/resolve-item-use.js";

const overlay = {
  root: null, list: null, pageEl: null, backButton: null, messageEl: null,
  active: false, selectedIndex: 0, items: [], character: null, context: "dungeon",
  enemy: null, torchFuel: 0, onUse: async () => ({ accepted: false }),
  onClose: () => {}, playSe: () => {}, previousMessage: ""
};

export function configureItemOverlay(options) {
  Object.assign(overlay, options);
  overlay.list = overlay.root.querySelector("[data-item-list]");
  overlay.pageEl = overlay.root.querySelector("[data-item-page]");
  overlay.backButton = overlay.root.querySelector("[data-item-back]");
  overlay.backButton.addEventListener("click", () => closeItemOverlay());
}

export function openItemOverlay({ context = "dungeon", character, enemy = null, torchFuel = 0, onUse, onClose } = {}) {
  if (overlay.active || !character) return false;
  overlay.active = true;
  overlay.context = context;
  overlay.character = character;
  overlay.enemy = enemy;
  overlay.torchFuel = torchFuel;
  overlay.items = ITEMS.filter(item => getItemCount(character.inventory, item.id) > 0);
  overlay.selectedIndex = 0;
  overlay.onUse = onUse || overlay.onUse;
  overlay.onClose = onClose || (() => {});
  overlay.previousMessage = overlay.messageEl.textContent;
  overlay.root.hidden = false;
  document.body.classList.add("item-overlay-open");
  render();
  return true;
}

export function closeItemOverlay({ restoreMessage = true } = {}) {
  if (!overlay.active) return false;
  overlay.active = false;
  overlay.root.hidden = true;
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
  } else if (action === "up" || action === "left") {
    move(-1);
  } else if (action === "down" || action === "right") {
    move(1);
  } else if (action === "confirm") {
    activate();
  }
  return true;
}

function move(amount) {
  const count = overlay.items.length + 1;
  overlay.selectedIndex = (overlay.selectedIndex + amount + count) % count;
  overlay.playSe("cursorMove");
  renderSelection();
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
    overlay.playSe("cancel");
    showReason(reason);
    return;
  }
  overlay.playSe("confirm");
  if (overlay.context === "battle") closeItemOverlay();
  const result = await overlay.onUse(item.id);
  if (!result?.accepted) {
    showReason(result?.reason);
    if (overlay.active) render();
    return;
  }
  if (overlay.active) closeItemOverlay({ restoreMessage: false });
}

function render() {
  const buttons = overlay.items.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-overlay-item";
    button.disabled = Boolean(unavailableReason(item));
    button.innerHTML = `<span>${item.name}</span><small>×${getItemCount(overlay.character.inventory, item.id)}</small>`;
    button.addEventListener("click", () => {
      overlay.selectedIndex = index;
      renderSelection();
      activate();
    });
    return button;
  });
  overlay.list.replaceChildren(...buttons);
  overlay.pageEl.textContent = "1/1";
  renderSelection();
}

function renderSelection() {
  [...overlay.list.children].forEach((button, index) => button.classList.toggle("is-selected", index === overlay.selectedIndex));
  const backSelected = overlay.selectedIndex === overlay.items.length;
  overlay.backButton.classList.toggle("is-selected", backSelected);
  const item = overlay.items[overlay.selectedIndex];
  overlay.messageEl.classList.toggle("is-skill-description", !backSelected && Boolean(item));
  overlay.messageEl.textContent = backSelected
    ? (overlay.items.length ? "アイテム選択を終了する。" : "アイテムを所持していない。")
    : item.description;
}

function unavailableReason(item) {
  return getItemUnavailableReason({
    character: overlay.character, itemId: item.id, context: overlay.context,
    enemy: overlay.enemy, torchFuel: overlay.torchFuel
  });
}

function showReason(reason) {
  overlay.messageEl.classList.remove("is-skill-description");
  overlay.messageEl.textContent = ({
    fullHp: "HPは満タンだ。",
    noEffect: "今使っても効果がない。",
    fullTorch: "たいまつは十分に明るい。",
    battleOnly: "このアイテムは戦闘中のみ使用できる。",
    fieldOnly: "このアイテムは戦闘中には使用できない。",
    undeadOnly: "アンデッドにしか効果がない。",
    bossImmune: "ボスには効果がない。",
    notOwned: "そのアイテムは所持していない。"
  })[reason] || "現在使用できない。";
}
