import { calculateDeckCost, DECK_SLOT_COUNT, setDeckSlot } from "../data/deck.js?v=20260807-06";
import { getCardById } from "../data/cards.js?v=20260807-06";
import { drawCardCanvas } from "./card-canvas.js";
import { ITEMS, canUseItemIn } from "../data/items.js?v=20260806-01";
import { normalizeCharacter } from "../data/classes.js?v=20260806-02";
import { EQUIPMENT_SLOT_LABELS, canEquipInstance, equipInstance, findEquipmentDefinition, getEquipmentInstanceDefinition, getEquipmentInstanceName, listEquipmentInstances } from "../data/equipment-inventory.js";
import { collectStats } from "../combat/collect-stats.js";
import { deriveDetailStats } from "../combat/derive-detail-stats.js";
import { getWeapon, getWeaponType } from "../data/weapons.js";
import { listOwnedKeyItems } from "../data/key-items.js";

const ACTION_FEEDBACK_MS = 260;
const DEBUG_SEQUENCE_MS = 1000;
const DEBUG_CANCEL_WINDOW_MS = 2000;
const SETTINGS_KEY = "nde-settings-v1";
const ON_MARK = "🔘";
const OFF_MARK = "⚫";
const DECK_PICKER_PAGE_SIZE = 5;

const menu = {
  root: null, commandRoot: null, statusPanel: null, deckPanel: null, inventoryPanel: null, savePanel: null, optionsPanel: null, debugPanel: null,
  commands: [], enabledCommands: [], commandIndex: 0, statusPage: 0,
  deckCursor: 0, deckSlots: [], deckEditable: false, deckReturnView: "commands",
  deckPickerOpen: false, deckPickerCursor: 0, deckPickerItems: [], deckPickerPage: 0,
  deckPointerArmedIndex: -1, deckPickerPointerArmedIndex: -1,
  saveCursor: 0,
  inventoryTab: "items", inventoryCursor: 0, inventoryPage: 0, inventoryMode: "list", inventorySlot: null, inventoryFocus: "list",
  inventoryPurpose: "manage", inventorySaleStage: "list", inventorySaleQuantity: 1,
  optionPages: [], optionItems: [], optionNavButtons: [], optionCursor: 0, optionPage: 0,
  debugPages: [], debugItems: [], debugNavButtons: [], debugCursor: 0, debugPage: 0, recentConfirms: [], debugArmed: false, view: "dungeon",
  compassVisible: true, readoutVisible: false, screenShakeEnabled: true,
  torchFlickerEnabled: true, torchFuelDisabled: false, presenceDisabled: false, stopwatchVisible: true,
  stairsDownVisible: false, npcsVisible: false, treasuresVisible: false,
  mistEnabled: true, mistIntensity: 1, mistDistance: 9, mistColor: "frost",
  wallColor: "default",
  floorColor: "default",
  bgmEnabled: true, seEnabled: true,
  npcTypewriterEnabled: true, npcTypewriterSpeed: "normal",
  actionActive: { random: false, autoReturn: false, torchFull: false, stopwatchReset: false },
  generateRandomDungeon: () => {}, startAutoReturn: () => {}, refillTorch: () => {},
  setScreenShakeEnabled: () => {}, setTorchFlickerEnabled: () => {}, setTorchFuelDisabled: () => {}, setPresenceDisabled: () => {},
  setMistOptions: () => {}, setWallColor: () => {}, setFloorColor: () => {},
  setBgmOptions: () => {}, setSeOptions: () => {}, playSe: () => {},
  setMinimapRevealOptions: () => {},
  setNpcTypewriterOptions: () => {},
  setStopwatchVisible: () => {}, resetStopwatch: () => {},
  saveGame: () => false,
  canManualSave: () => false,
  getSaveSlotSummaries: () => [],
  getCharacter: () => null,
  getInventoryContext: () => "dungeon", onUseInventoryItem: () => ({ accepted: false }), onEquipmentChanged: () => {},
  onSellInventoryItem: () => ({ accepted: false }), onSellInventoryEquipment: () => ({ accepted: false }), onInventorySaleClosed: () => {},
  onPurchaseInventoryItem: () => ({ accepted: false }), onPurchaseInventoryEquipment: () => ({ accepted: false }), onInventoryPurchaseClosed: () => {},
  onDeckChanged: () => {},
  openItems: () => false,
  openSkills: () => false,
  onReturnToDungeon: () => {}
};

export function configureMenu(options) {
  Object.assign(menu, options);
  menu.statusPanel = menu.root.querySelector('[data-menu-view="status"]');
  menu.deckPanel = menu.root.querySelector('[data-menu-view="deck"]');
  menu.savePanel = menu.root.querySelector('[data-menu-view="save"]');
  menu.inventoryPanel = menu.root.querySelector('[data-menu-view="inventory"]');
  menu.optionsPanel = menu.root.querySelector('[data-menu-view="options"]');
  menu.debugPanel = menu.root.querySelector('[data-menu-view="debug"]');
  menu.commands = [...menu.commandRoot.querySelectorAll("[data-command]")];
  menu.commands.forEach(button => {
    button.dataset.unavailable = String(button.disabled);
    button.setAttribute("aria-disabled", String(button.disabled));
    button.disabled = false;
  });
  menu.enabledCommands = menu.commands.filter(button => button.dataset.unavailable !== "true");
  menu.optionPages = [...menu.optionsPanel.querySelectorAll("[data-option-page]")];
  menu.optionNavButtons = [...menu.optionsPanel.querySelectorAll("[data-option-nav]")];
  menu.debugPages = [...menu.debugPanel.querySelectorAll("[data-debug-page]")];
  menu.debugNavButtons = [...menu.debugPanel.querySelectorAll("[data-debug-nav]")];
  restoreSettings();
  renderEmptyStats(); bindCommands(); bindStatus(); bindDeck(); bindInventory(); bindManualSave(); bindOptions(); bindDebug();
  updateOptionItems(); updateDebugItems(); applyAllSettings(); updateView();
}

export function isMenuOpen() { return menu.view !== "dungeon"; }
export function getDungeonColors() { return { wall: menu.wallColor, floor: menu.floorColor }; }
export function setDungeonColors({ wall, floor } = {}, { save = false } = {}) {
  if (["default", "red", "blue", "green", "white", "black"].includes(wall)) menu.wallColor = wall;
  if (["default", "red", "blue", "green", "purple", "white"].includes(floor)) menu.floorColor = floor;
  applyWallColor();
  applyFloorColor();
  updateDebugStates();
  if (save) persistSettings();
}
export function openCampMenu() { menu.view = "commands"; menu.commandIndex = 0; updateView(); }
export function openStatusMenu() { menu.playSe("confirm"); menu.view = "status"; menu.statusPage = 0; updateView(); }
export function openDeckEditor() {
  menu.playSe("confirm");
  menu.view = "deck";
  menu.deckEditable = true;
  menu.deckReturnView = "town";
  menu.deckPickerOpen = false;
  menu.deckCursor = 0;
  menu.deckPointerArmedIndex = -1;
  menu.deckPickerPointerArmedIndex = -1;
  renderDeck();
  updateView();
}
export function closeCampMenu(reason = "back") { menu.view = "dungeon"; updateView(); if (reason === "back" || reason === "main") menu.onReturnToDungeon(reason); }

export function handleMenuInput(action) {
  if (menu.view === "dungeon") {
    const now = performance.now();
    if (action === "confirm") {
      menu.recentConfirms = [...menu.recentConfirms.filter(time => now - time <= DEBUG_SEQUENCE_MS), now];
      const lastThree = menu.recentConfirms.slice(-3);
      menu.debugArmed = lastThree.length === 3 && lastThree[2] - lastThree[0] <= DEBUG_SEQUENCE_MS;
      return false;
    }
    if (action === "cancel") {
      const lastConfirmAt = menu.recentConfirms.at(-1);
      const debugCommandValid = menu.debugArmed && Number.isFinite(lastConfirmAt) && now - lastConfirmAt <= DEBUG_CANCEL_WINDOW_MS;
      menu.recentConfirms = [];
      menu.debugArmed = false;
      if (debugCommandValid) {
        menu.playSe("confirm");
        setDebugPage(0); return true;
      }
      menu.playSe("cancel");
      openCampMenu(); return true;
    }
    menu.recentConfirms = []; menu.debugArmed = false;
    return false;
  }
  const adjustsSeVolume = menu.view === "options"
    && (action === "left" || action === "right")
    && menu.optionItems[menu.optionCursor]?.dataset.option === "seVolume";
  if ((action === "up" || action === "down" || action === "left" || action === "right") && !adjustsSeVolume) menu.playSe("cursorMove");
  else if (action === "confirm" && !(menu.view === "commands" && isCommandUnavailable(menu.commands[menu.commandIndex]))) menu.playSe("confirm");
  else if (action === "cancel") menu.playSe("cancel");
  if (menu.view === "commands") handleCommands(action);
  else if (menu.view === "status") handleStatus(action);
  else if (menu.view === "deck") handleDeck(action);
  else if (menu.view === "inventory") handleInventory(action);
  else if (menu.view === "save") handleManualSave(action);
  else if (menu.view === "options") handleOptions(action);
  else if (menu.view === "debug") handleDebug(action);
  return true;
}

function handleCommands(action) {
  if (action === "cancel") { closeCampMenu("back"); return; }
  if (["up", "down", "left", "right"].includes(action)) {
    const columns = 3;
    const rows = Math.ceil(menu.commands.length / columns);
    let row = Math.floor(menu.commandIndex / columns);
    let column = menu.commandIndex % columns;
    if (action === "left") column = (column - 1 + columns) % columns;
    if (action === "right") column = (column + 1) % columns;
    if (action === "up") row = (row - 1 + rows) % rows;
    if (action === "down") row = (row + 1) % rows;
    const candidateIndex = row * columns + column;
    if (menu.commands[candidateIndex]) menu.commandIndex = candidateIndex;
    updateSelection();
    return;
  }
  if (action === "confirm") {
    const command = menu.commands[menu.commandIndex];
    if (command && !isCommandUnavailable(command)) openCommand(command.dataset.command);
  }
}
function isCommandUnavailable(button) {
  return button?.dataset.unavailable === "true"
    || (button?.dataset.command === "save" && !menu.canManualSave());
}
function openCommand(key) { if (key === "status") { menu.view = "status"; menu.statusPage = 0; updateView(); } else if (key === "deck") { menu.view = "deck"; menu.deckEditable = false; menu.deckReturnView = "commands"; menu.deckPickerOpen = false; menu.deckCursor = 0; renderDeck(); updateView(); } else if (key === "items") openInventory(); else if (key === "skills") menu.openSkills(); else if (key === "options") setOptionPage(0); else if (key === "save" && menu.canManualSave()) { menu.view = "save"; menu.saveCursor = 0; renderManualSave(); updateView(); } }

function openInventory() {
  Object.assign(menu, { view: "inventory", inventoryTab: "items", inventoryCursor: 0, inventoryPage: 0, inventoryMode: "list", inventorySlot: null, inventoryFocus: "list", inventoryPurpose: "manage", inventorySaleStage: "list", inventorySaleQuantity: 1 });
  renderInventory(); updateView();
}

export function openShopSellInventory() {
  Object.assign(menu, { view: "inventory", inventoryTab: "items", inventoryCursor: 0, inventoryPage: 0, inventoryMode: "list", inventorySlot: null, inventoryFocus: "list", inventoryPurpose: "sell", inventorySaleStage: "list", inventorySaleQuantity: 1 });
  renderInventory(); updateView();
}

export function openShopPurchaseInventory(initialTab = "items") {
  Object.assign(menu, { view: "inventory", inventoryTab: initialTab === "equipment" ? "equipment" : "items", inventoryCursor: 0, inventoryPage: 0, inventoryMode: "list", inventorySlot: null, inventoryFocus: "list", inventoryPurpose: "buy", inventorySaleStage: "list", inventorySaleQuantity: 1 });
  renderInventory(); updateView();
}

function inventoryEntries() {
  const character = menu.getCharacter();
  if (menu.inventoryMode === "equip") {
    return [{ instance: null, label: "装備なし" }, ...listEquipmentInstances(character)
      .filter(instance => instance.slot === menu.inventorySlot && canEquipInstance(character, instance).accepted)
      .map(instance => ({ instance }))];
  }
  if (menu.inventoryPurpose === "buy") {
    if (menu.inventoryTab === "items") return ITEMS.filter(item => item.source === "shop" && Number(item.buyPrice) > 0).map(item => ({ item }));
    if (menu.inventoryTab === "equipment") return ["iron_greatsword", "poison_dagger", "morgenstern"]
      .map(getWeapon).filter(Boolean).map(shopEquipment => ({ shopEquipment }));
    return [];
  }
  if (menu.inventoryTab === "items") return ITEMS
    .filter(item => Number(character?.inventory?.counts?.[item.id]) > 0)
    .filter(item => menu.inventoryPurpose !== "sell" || Number(item.sellPrice) > 0)
    .map(item => ({ item, count: character.inventory.counts[item.id] }));
  if (menu.inventoryTab === "keyItems") return menu.inventoryPurpose === "sell"
    ? []
    : listOwnedKeyItems(character?.keyItems).map(keyItem => ({ keyItem }));
  return listEquipmentInstances(character).map(instance => ({ instance }));
}

function availableInventoryTabs() {
  return menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy" ? ["items", "equipment"] : ["items", "keyItems", "equipment"];
}

function unavailableItemReason(item, character) {
  const context = menu.getInventoryContext();
  if (!canUseItemIn(item, context)) return context === "town" ? "ダンジョンまたは戦闘中のみ使用可能です。" : "現在は使用できません。";
  const heals = item.effects?.some(effect => effect.id === "heal_hp");
  const cures = item.effects?.some(effect => effect.id === "cure_poison");
  if (heals && !cures && character.hp >= character.maxHp) return "HPが最大です。";
  return "";
}

function handleInventory(action) {
  if ((menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy") && menu.inventorySaleStage !== "list") {
    handleInventorySaleStage(action);
    return;
  }
  if (action === "cancel") {
    if (menu.inventoryMode === "equip") Object.assign(menu, { inventoryMode: "list", inventoryCursor: 0, inventoryPage: 0, inventoryFocus: "list" });
    else if (menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy") { closeInventoryTrade(); return; }
    else { menu.view = "commands"; updateView(); return; }
    renderInventory(); return;
  }
  if (menu.inventoryFocus !== "list") {
    if (action === "left" || action === "right") {
      menu.inventoryFocus = menu.inventoryFocus === "back" ? "next" : "back";
      renderInventory(); return;
    }
    if (action === "up" || action === "down") {
      const entries = inventoryEntries();
      if (entries.length) {
        const pageStart = menu.inventoryPage * 10;
        const pageEnd = Math.min(entries.length - 1, pageStart + 9);
        menu.inventoryCursor = action === "up" ? pageEnd : pageStart;
        menu.inventoryFocus = "list";
      }
      renderInventory(); return;
    }
    if (action === "confirm") {
      if (menu.inventoryFocus === "back") {
        if (menu.inventoryPage > 0) { menu.inventoryPage -= 1; menu.inventoryCursor = menu.inventoryPage * 10; menu.inventoryFocus = "list"; renderInventory(); }
        else handleInventory("cancel");
      } else {
        const pages = Math.max(1, Math.ceil(inventoryEntries().length / 10));
        if (menu.inventoryPage < pages - 1) { menu.inventoryPage += 1; menu.inventoryCursor = menu.inventoryPage * 10; menu.inventoryFocus = "list"; renderInventory(); }
      }
      return;
    }
  }
  if (menu.inventoryMode === "list" && (action === "left" || action === "right")) {
    const tabs = availableInventoryTabs();
    const current = Math.max(0, tabs.indexOf(menu.inventoryTab));
    const offset = action === "right" ? 1 : -1;
    Object.assign(menu, { inventoryTab: tabs[(current + offset + tabs.length) % tabs.length], inventoryCursor: 0, inventoryPage: 0 });
    renderInventory(); return;
  }
  const entries = inventoryEntries();
  if ((action === "up" || action === "down") && !entries.length) {
    menu.inventoryFocus = "back"; renderInventory(); return;
  }
  if ((action === "up" || action === "down") && entries.length) {
    const pageStart = menu.inventoryPage * 10;
    const pageEnd = Math.min(entries.length - 1, pageStart + 9);
    const atBoundary = action === "up" ? menu.inventoryCursor === pageStart : menu.inventoryCursor === pageEnd;
    if (atBoundary) menu.inventoryFocus = "back";
    else menu.inventoryCursor += action === "down" ? 1 : -1;
    renderInventory(); return;
  }
  if (action !== "confirm") return;
  const entry = entries[menu.inventoryCursor];
  if (!entry) return;
  if (menu.inventoryPurpose === "sell") { requestInventorySale(entry); return; }
  if (menu.inventoryPurpose === "buy") { menu.inventorySaleStage = "confirm"; renderInventoryTradePrompt(); return; }
  if (menu.inventoryMode === "equip") { applyEquipmentCandidate(entry); return; }
  if (entry.item) { Promise.resolve(menu.onUseInventoryItem(entry.item.id)).then(renderInventory); return; }
  if (menu.getInventoryContext() === "dungeon") {
    menu.inventoryPanel.querySelector("[data-inventory-description]").textContent = "ダンジョン探索中は装備を変更できません。"; return;
  }
  Object.assign(menu, { inventoryMode: "equip", inventorySlot: entry.instance.slot, inventoryCursor: 0, inventoryPage: 0, inventoryFocus: "list" });
  const candidates = inventoryEntries();
  const selectedIndex = candidates.findIndex(candidate => candidate.instance?.instanceId === entry.instance.instanceId);
  menu.inventoryCursor = Math.max(0, selectedIndex); menu.inventoryPage = Math.floor(menu.inventoryCursor / 10); renderInventory();
}

function applyEquipmentCandidate(entry) {
  const result = equipInstance(menu.getCharacter(), menu.inventorySlot, entry.instance?.instanceId || null);
  if (!result.accepted) { menu.inventoryPanel.querySelector("[data-inventory-description]").textContent = result.reason; return; }
  menu.onEquipmentChanged(normalizeCharacter(result.character), { curseRevealed: result.curseRevealed });
  Object.assign(menu, { inventoryMode: "list", inventoryCursor: 0, inventoryPage: 0, inventoryFocus: "list" }); renderInventory();
}

function equipmentSalePrice(instance) {
  const definition = getEquipmentInstanceDefinition(instance);
  return Math.max(0, Math.floor(Number(definition?.sellPrice ?? definition?.buyPrice / 2) || 0));
}

function inventoryEquipmentSaleReason(instance, character) {
  if (Object.values(character?.equippedInstanceIds || {}).includes(instance?.instanceId)) return "装備中のため売却できません。";
  if (equipmentSalePrice(instance) <= 0) return "この装備品は売却できません。";
  return "";
}

function inventorySaleDescription(entry, character) {
  if (entry.item) return `${entry.item.description} / 売却価格 ${entry.item.sellPrice}G / Aボタン：売却`;
  const reason = inventoryEquipmentSaleReason(entry.instance, character);
  if (reason) return reason;
  const definition = getEquipmentInstanceDefinition(entry.instance);
  return `${EQUIPMENT_SLOT_LABELS[entry.instance.slot]} / ${equipmentEffectLabels(definition).join(" / ")} / 売却価格 ${equipmentSalePrice(entry.instance)}G / Aボタン：売却`;
}

function requestInventorySale(entry) {
  const character = menu.getCharacter();
  if (entry.instance) {
    const reason = inventoryEquipmentSaleReason(entry.instance, character);
    if (reason) {
      menu.inventoryPanel.querySelector("[data-inventory-description]").textContent = reason;
      return;
    }
  }
  menu.inventorySaleQuantity = 1;
  menu.inventorySaleStage = entry.item && entry.count > 1 ? "quantity" : "confirm";
  renderInventorySalePrompt();
}

function handleInventorySaleStage(action) {
  const entry = inventoryEntries()[menu.inventoryCursor];
  if (!entry) { menu.inventorySaleStage = "list"; renderInventory(); return; }
  if (menu.inventorySaleStage === "quantity" && ["up", "down", "left", "right"].includes(action)) {
    const amount = action === "up" ? 1 : action === "down" ? -1 : action === "right" ? 10 : -10;
    menu.inventorySaleQuantity = Math.max(1, Math.min(entry.count, menu.inventorySaleQuantity + amount));
    renderInventorySalePrompt();
    return;
  }
  if (action === "cancel") {
    menu.inventorySaleStage = "list";
    renderInventory();
    return;
  }
  if (action !== "confirm") return;
  if (menu.inventorySaleStage === "quantity") {
    menu.inventorySaleStage = "confirm";
    renderInventorySalePrompt();
    return;
  }
  const buying = menu.inventoryPurpose === "buy";
  const result = buying
    ? (entry.item ? menu.onPurchaseInventoryItem(entry.item.id) : menu.onPurchaseInventoryEquipment(entry.shopEquipment.id))
    : (entry.item ? menu.onSellInventoryItem(entry.item.id, menu.inventorySaleQuantity) : menu.onSellInventoryEquipment(entry.instance.instanceId));
  menu.inventorySaleStage = "list";
  renderInventory();
  const description = menu.inventoryPanel.querySelector("[data-inventory-description]");
  const name = entry.item?.name || entry.shopEquipment?.name || getEquipmentInstanceName(entry.instance);
  description.textContent = result?.accepted
    ? buying ? `女主人ヘレン：${name}をどうぞ。` : `女主人ヘレン：${name}を${result.value}Gで買い取ったわ。`
    : result?.reason === "insufficientGold" ? "女主人ヘレン：あら、お金が足りないわ。" : buying ? "女主人ヘレン：今は渡せないようね。" : "女主人ヘレン：これは買い取れないようね。";
}

function renderInventorySalePrompt() {
  const entry = inventoryEntries()[menu.inventoryCursor];
  if (!entry) return;
  const name = entry.item?.name || getEquipmentInstanceName(entry.instance);
  const unitPrice = entry.item?.sellPrice || equipmentSalePrice(entry.instance);
  const quantity = entry.item ? menu.inventorySaleQuantity : 1;
  const description = menu.inventoryPanel.querySelector("[data-inventory-description]");
  description.textContent = menu.inventorySaleStage === "quantity"
    ? `売却数 ${quantity} / ${entry.count}　合計 ${unitPrice * quantity}G / ↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
    : `${name}${entry.item ? ` ×${quantity}` : ""}を${unitPrice * quantity}Gで売却しますか？ / Aボタン：はい　Bボタン：いいえ\n所持金：${inventoryGoldText()}G`;
}

function renderInventoryTradePrompt() {
  const entry = inventoryEntries()[menu.inventoryCursor];
  if (!entry) return;
  const name = entry.item?.name || entry.shopEquipment?.name;
  const price = entry.item?.buyPrice ?? entry.shopEquipment?.buyPrice ?? 0;
  menu.inventoryPanel.querySelector("[data-inventory-description]").textContent = `${name}を${price}Gで購入しますか？ / Aボタン：はい　Bボタン：いいえ\n所持金：${inventoryGoldText()}G`;
}

function inventoryGoldText() {
  return Math.max(0, Math.floor(Number(menu.getCharacter()?.gold) || 0)).toLocaleString("en-US");
}

function closeInventoryTrade() {
  const purpose = menu.inventoryPurpose;
  menu.inventoryPurpose = "manage";
  menu.inventorySaleStage = "list";
  menu.view = "dungeon";
  updateView();
  if (purpose === "buy") menu.onInventoryPurchaseClosed();
  else menu.onInventorySaleClosed();
}

function bindInventory() {
  menu.inventoryPanel.querySelectorAll("[data-inventory-tab]").forEach(button => button.addEventListener("click", () => {
    Object.assign(menu, { inventoryTab: button.dataset.inventoryTab, inventoryMode: "list", inventoryCursor: 0, inventoryPage: 0, inventoryFocus: "list", inventorySaleStage: "list", inventorySaleQuantity: 1 }); renderInventory();
  }));
  menu.inventoryPanel.querySelector('[data-inventory-nav="back"]').addEventListener("click", () => {
    menu.inventoryFocus = "back";
    if (menu.inventoryPage > 0) { menu.inventoryPage -= 1; menu.inventoryCursor = menu.inventoryPage * 10; renderInventory(); }
    else handleInventory("cancel");
  });
  menu.inventoryPanel.querySelector('[data-inventory-nav="next"]').addEventListener("click", () => {
    menu.inventoryFocus = "next";
    const pages = Math.max(1, Math.ceil(inventoryEntries().length / 10));
    if (menu.inventoryPage < pages - 1) { menu.inventoryPage += 1; menu.inventoryCursor = menu.inventoryPage * 10; renderInventory(); }
  });
}

function renderInventory() {
  const panel = menu.inventoryPanel, character = menu.getCharacter(), entries = inventoryEntries();
  const pages = Math.max(1, Math.ceil(entries.length / 10));
  menu.inventoryPage = Math.min(menu.inventoryPage, pages - 1); menu.inventoryCursor = entries.length ? Math.min(menu.inventoryCursor, entries.length - 1) : 0;
  panel.querySelector(".menu-title").textContent = menu.inventoryPurpose === "sell" ? "SELL" : menu.inventoryPurpose === "buy" ? "BUY" : menu.inventoryMode === "equip" ? `EQUIPMENT : ${EQUIPMENT_SLOT_LABELS[menu.inventorySlot]}` : "INVENTORY";
  const tabs = panel.querySelector(".inventory-tabs");
  tabs.hidden = menu.inventoryMode === "equip";
  tabs.classList.toggle("is-sale", menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy");
  panel.querySelectorAll("[data-inventory-tab]").forEach(button => {
    button.hidden = (menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy") && button.dataset.inventoryTab === "keyItems";
    button.classList.toggle("is-selected", button.dataset.inventoryTab === menu.inventoryTab);
    if (button.dataset.inventoryTab === "items") button.textContent = menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy" ? "道具" : "アイテム";
  });
  const equippedIds = new Set(Object.values(character?.equippedInstanceIds || {}));
  panel.querySelector("[data-inventory-list]").replaceChildren(...entries.slice(menu.inventoryPage * 10, menu.inventoryPage * 10 + 10).map((entry, offset) => {
    const index = menu.inventoryPage * 10 + offset, button = document.createElement("button"); button.type = "button"; button.className = "inventory-entry";
    if (entry.item) { button.innerHTML = `<span>${entry.item.name}</span><strong>${menu.inventoryPurpose === "buy" ? `${entry.item.buyPrice}G` : `×${entry.count}`}</strong>`; button.classList.toggle("is-unavailable", menu.inventoryPurpose === "manage" && Boolean(unavailableItemReason(entry.item, character))); }
    else if (entry.shopEquipment) button.innerHTML = `<span>${entry.shopEquipment.name}</span><strong>${entry.shopEquipment.buyPrice}G</strong>`;
    else if (entry.keyItem) button.innerHTML = `<span>${entry.keyItem.name}</span><strong></strong>`;
    else if (entry.instance) { button.innerHTML = `<span>${getEquipmentInstanceName(entry.instance)}</span><strong>${equippedIds.has(entry.instance.instanceId) ? "［E］" : ""}${entry.instance.curseKnown ? "［C］" : ""}</strong>`; button.classList.toggle("is-unavailable", menu.inventoryPurpose === "sell" ? Boolean(inventoryEquipmentSaleReason(entry.instance, character)) : menu.inventoryMode === "list" && !canEquipInstance(character, entry.instance).accepted); }
    else button.textContent = entry.label;
    button.classList.toggle("is-selected", menu.inventoryFocus === "list" && index === menu.inventoryCursor);
    button.addEventListener("click", () => {
      if ((menu.inventoryPurpose === "sell" || menu.inventoryPurpose === "buy") && menu.inventorySaleStage !== "list") return;
      menu.inventoryCursor = index; menu.inventoryFocus = "list"; renderInventory();
    });
    button.addEventListener("dblclick", () => handleInventory("confirm")); return button;
  }));
  const selected = entries[menu.inventoryCursor], description = panel.querySelector("[data-inventory-description]");
  if (!selected) description.textContent = menu.inventoryPurpose === "sell" ? "売却できる所持品がありません。" : menu.inventoryTab === "keyItems" ? "貴重品を所持していません。" : "所持品がありません。";
  else if (menu.inventoryPurpose === "sell") description.textContent = inventorySaleDescription(selected, character);
  else if (menu.inventoryPurpose === "buy") description.textContent = selected.item ? `${selected.item.description} / 購入価格 ${selected.item.buyPrice}G / Aボタン：購入` : `${equipmentEffectLabels(selected.shopEquipment).join(" / ")} / 購入価格 ${selected.shopEquipment.buyPrice}G / Aボタン：購入`;
  else if (selected.item) description.textContent = unavailableItemReason(selected.item, character) || selected.item.description;
  else if (selected.keyItem) description.textContent = selected.keyItem.description || "大切な貴重品です。";
  else if (!selected.instance) description.textContent = "この装備部位を空にします。";
  else { const definition = getEquipmentInstanceDefinition(selected.instance); const requirements = Object.entries(definition?.requirements || {}).map(([key, value]) => `${key.toUpperCase()} ${value}以上`).join(" / "); const effects = equipmentEffectLabels(definition); description.textContent = `${EQUIPMENT_SLOT_LABELS[selected.instance.slot]} / ${effects.join(" / ")}${effects.length ? " / " : ""}${requirements ? `装備条件：${requirements}` : "装備条件なし"}${selected.instance.curseKnown ? " / 呪われているため外せません。" : ""}`; }
  renderInventoryComparison(panel.querySelector("[data-inventory-compare]"), selected?.instance || null);
  panel.querySelector("[data-inventory-page]").textContent = `${menu.inventoryPage + 1}/${pages}`;
  const backButton = panel.querySelector('[data-inventory-nav="back"]');
  const nextButton = panel.querySelector('[data-inventory-nav="next"]');
  backButton.textContent = menu.inventoryPage > 0 ? "PREV" : "BACK";
  nextButton.disabled = menu.inventoryPage >= pages - 1;
  backButton.classList.toggle("is-selected", menu.inventoryFocus === "back");
  nextButton.classList.toggle("is-selected", menu.inventoryFocus === "next");
}

function renderInventoryComparison(root, candidate) {
  const visible = menu.inventoryPurpose !== "sell" && (menu.inventoryMode === "equip" || (menu.inventoryMode === "list" && menu.inventoryTab === "equipment" && Boolean(candidate)));
  root.hidden = !visible; if (root.hidden) return;
  const slot = menu.inventoryMode === "equip" ? menu.inventorySlot : candidate.slot;
  const character = menu.getCharacter(), result = equipInstance(character, slot, candidate?.instanceId || null);
  if (!result.accepted) { root.textContent = result.reason; return; }
  const preview = normalizeCharacter(result.character);
  const beforeStats = collectStats(character), afterStats = collectStats(preview);
  const beforeCombat = equipmentCombatValues(character), afterCombat = equipmentCombatValues(preview);
  const values = [
    ["ATK", beforeCombat.attack, afterCombat.attack], ["DEF", beforeStats.def, afterStats.def],
    ["HITS", beforeCombat.hits, afterCombat.hits], ["PEN", beforeCombat.penetration, afterCombat.penetration, "%"],
    ["HP", character.maxHp, preview.maxHp], ["SP", character.maxSp, preview.maxSp],
    ["STR", beforeStats.str, afterStats.str], ["INT", beforeStats.int, afterStats.int],
    ["AGI", beforeStats.agi, afterStats.agi], ["DEX", beforeStats.dex, afterStats.dex], ["LUC", beforeStats.luc, afterStats.luc]
  ];
  root.replaceChildren(...values.map(([label, before, after, suffix = ""]) => { const delta = after - before, row = document.createElement("span"); row.className = delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""; row.textContent = `${label} ${before}${suffix} → ${after}${suffix} (${delta >= 0 ? "+" : ""}${delta}${suffix})`; return row; }));
}

function equipmentCombatValues(character) {
  const stats = collectStats(character);
  const weaponId = character?.equipment?.rightArmId || character?.equipment?.weaponId;
  const weapon = weaponId
    ? getWeapon(weaponId, character?.equipment?.rightArmEnhancement || 0)
    : { attack: 0, type: "longsword", defensePenetration: 0 };
  const type = getWeaponType(weapon?.type);
  return { attack: deriveDetailStats(character).physicalAttack, hits: type.hitCount || 1, penetration: Math.round(((type.defensePenetration || 0) + (weapon.defensePenetration || 0) + (stats.defensePenetration || 0)) * 100) };
}

function equipmentEffectLabels(definition) {
  if (!definition) return [];
  const labels = [];
  if (Number.isFinite(definition.attack)) labels.push(`ATK +${definition.attack}`);
  if (definition.type) labels.push(`${getWeaponType(definition.type).hitCount || 1}回攻撃`);
  if (Number(definition.defensePenetration) > 0) labels.push(`DEF貫通 ${Math.round(definition.defensePenetration * 100)}%`);
  if (Number(definition.poisonChance) > 0) labels.push(`毒付与 ${Math.round(definition.poisonChance * 100)}%`);
  for (const [key, value] of Object.entries(definition.statBonuses || {})) labels.push(`${key.toUpperCase()} ${value >= 0 ? "+" : ""}${value}`);
  return labels;
}
function handleStatus(action) { if (action === "cancel") { menu.view = "commands"; updateView(); } else if (action === "left") { menu.statusPage = 0; updateStatus(); } else if (action === "right") { menu.statusPage = 1; updateStatus(); } else if (action === "confirm") { menu.view = "commands"; updateView(); } }
function statusNavigate(key) { if (key === "back") { if (menu.statusPage === 0) { menu.view = "commands"; updateView(); } else { menu.statusPage = 0; updateStatus(); } } else if (menu.statusPage === 0) { menu.statusPage = 1; updateStatus(); } else { menu.view = "commands"; updateView(); } }

function handleDeck(action) {
  if (["up", "down", "left", "right"].includes(action)) {
    menu.deckPointerArmedIndex = -1;
    menu.deckPickerPointerArmedIndex = -1;
  }
  if (menu.deckPickerOpen) {
    if (action === "cancel") { closeDeckPicker(); return; }
    if (action === "left") { changeDeckPickerPage(-1); return; }
    if (action === "right") { changeDeckPickerPage(1); return; }
    const visibleIndexes = getDeckPickerVisibleIndexes();
    const position = Math.max(0, visibleIndexes.indexOf(menu.deckPickerCursor));
    if (action === "up") {
      menu.deckPickerCursor = visibleIndexes[(position + visibleIndexes.length - 1) % visibleIndexes.length];
    }
    if (action === "down") {
      menu.deckPickerCursor = visibleIndexes[(position + 1) % visibleIndexes.length];
    }
    if (action === "confirm") applyDeckPickerSelection();
    renderDeckPicker();
    return;
  }
  if (action === "cancel") { closeDeckView(); return; }
  const columns = 3;
  const row = Math.floor(menu.deckCursor / columns);
  const column = menu.deckCursor % columns;
  if (action === "left") menu.deckCursor = row * columns + (column + columns - 1) % columns;
  if (action === "right") menu.deckCursor = row * columns + (column + 1) % columns;
  if (action === "up" || action === "down") menu.deckCursor = ((row + 1) % 2) * columns + column;
  if (action === "confirm" && menu.deckEditable) openDeckPicker();
  renderDeckSelection();
}

function handleManualSave(action) {
  const summaries = menu.getSaveSlotSummaries().filter(summary => summary.slot !== "auto");
  const count = summaries.length + 1;
  if (action === "cancel") { menu.view = "commands"; updateView(); return; }
  if (action === "up" || action === "down") {
    menu.saveCursor = (menu.saveCursor + (action === "down" ? 1 : count - 1)) % count;
    renderManualSave();
    return;
  }
  if (action !== "confirm") return;
  if (menu.saveCursor === summaries.length) {
    menu.view = "commands";
    updateView();
    return;
  }
  const summary = summaries[menu.saveCursor];
  if (!summary) return;
  const accepted = !summary.exists || window.confirm(`${summary.label}へ上書き保存しますか？`);
  if (!accepted) return;
  const saved = menu.saveGame(summary.slot);
  renderManualSave(saved ? `${summary.label}へ保存しました。` : "セーブに失敗しました。");
}

function closeDeckView() {
  menu.deckPickerOpen = false;
  menu.view = menu.deckReturnView === "town" ? "dungeon" : "commands";
  updateView();
}

function openDeckPicker() {
  const character = menu.getCharacter();
  menu.deckPickerItems = [null, ...(character?.cards?.ownedCardIds || [])];
  menu.deckPickerCursor = Math.max(0, menu.deckPickerItems.indexOf(menu.deckSlots[menu.deckCursor]));
  menu.deckPickerPage = menu.deckPickerCursor > 0
    ? Math.floor((menu.deckPickerCursor - 1) / DECK_PICKER_PAGE_SIZE)
    : 0;
  menu.deckPickerOpen = true;
  menu.deckPickerPointerArmedIndex = -1;
  renderDeckPicker();
}

function closeDeckPicker() {
  menu.deckPickerOpen = false;
  menu.deckPanel.querySelector("[data-deck-picker]").hidden = true;
}

function applyDeckPickerSelection() {
  const character = menu.getCharacter();
  const next = setDeckSlot(character?.cards, menu.deckCursor, menu.deckPickerItems[menu.deckPickerCursor], character?.deckCost || 3);
  menu.onDeckChanged(next);
  menu.deckPickerOpen = false;
  renderDeck();
}

function handleOptions(action) {
  if (action === "cancel") { menu.view = "commands"; updateView(); return; }
  const count = menu.optionItems.length + menu.optionNavButtons.length;
  if (action === "up" || action === "down") { menu.optionCursor = (menu.optionCursor + (action === "down" ? 1 : count - 1)) % count; updateSelection(); return; }
  if (action === "left" || action === "right") { adjustSelectedOption(action === "right" ? 1 : -1); return; }
  if (action === "confirm") { if (menu.optionCursor >= menu.optionItems.length) executeOptionNav(menu.optionNavButtons[menu.optionCursor - menu.optionItems.length]?.dataset.optionNav); else executeOption(menu.optionItems[menu.optionCursor]?.dataset.option); }
}
function setOptionPage(page) { menu.view = "options"; menu.optionPage = Math.max(0, Math.min(1, page)); menu.optionCursor = 0; updateOptionItems(); updateView(); }
function updateOptionItems() { menu.optionPages.forEach((page, index) => { page.hidden = index !== menu.optionPage; }); menu.optionItems = [...menu.optionPages[menu.optionPage].querySelectorAll("[data-option]")]; }
function executeOptionNav(key) { if (key === "back") { if (menu.optionPage === 0) { menu.view = "commands"; updateView(); } else setOptionPage(0); } else if (menu.optionPage === 0) setOptionPage(1); else { menu.view = "commands"; updateView(); } }
function executeOption(key) {
  if (key === "language" || key === "bgmVolume" || key === "seVolume") return;
  if (key === "bgmEnabled") { menu.bgmEnabled = !menu.bgmEnabled; applyBgmOptions(); updateOptionStates(); persistSettings(); }
  if (key === "seEnabled") { menu.seEnabled = !menu.seEnabled; applySeOptions(); updateOptionStates(); persistSettings(); }
  if (key === "screenShake") { menu.screenShakeEnabled = !menu.screenShakeEnabled; applyRenderOptions(); updateOptionStates(); persistSettings(); }
  if (key === "torchFlicker") { menu.torchFlickerEnabled = !menu.torchFlickerEnabled; applyRenderOptions(); updateOptionStates(); persistSettings(); }
  if (key === "npcTypewriterEnabled") { menu.npcTypewriterEnabled = !menu.npcTypewriterEnabled; applyNpcTypewriterOptions(); updateOptionStates(); persistSettings(); }
  if (key === "npcTypewriterSpeed" && menu.npcTypewriterEnabled) { cycleNpcTypewriterSpeed(1); }
}
function adjustSelectedOption(amount) { if (menu.optionCursor >= menu.optionItems.length) return; const key = menu.optionItems[menu.optionCursor].dataset.option; if (key === "bgmVolume" || key === "seVolume") { const slider = menu.root.querySelector(`#${key}`); slider.value = String(Math.max(0, Math.min(100, Number(slider.value) + amount * 10))); slider.dispatchEvent(new Event("input", { bubbles: true })); if (key === "seVolume") menu.playSe("cursorMove"); } else if (key === "npcTypewriterSpeed" && menu.npcTypewriterEnabled) cycleNpcTypewriterSpeed(amount); else if (key === "screenShake" || key === "torchFlicker" || key === "npcTypewriterEnabled" || key === "bgmEnabled" || key === "seEnabled") executeOption(key); }

function cycleNpcTypewriterSpeed(amount) {
  const speeds = ["slow", "normal", "fast"];
  const index = speeds.indexOf(menu.npcTypewriterSpeed);
  menu.npcTypewriterSpeed = speeds[(index + amount + speeds.length) % speeds.length];
  applyNpcTypewriterOptions(); updateOptionStates(); persistSettings();
}

function handleDebug(action) {
  if (action === "cancel") { closeCampMenu("back"); return; }
  const count = menu.debugItems.length + menu.debugNavButtons.length;
  if (action === "up" || action === "down") { menu.debugCursor = (menu.debugCursor + (action === "down" ? 1 : count - 1)) % count; updateSelection(); return; }
  if (action === "left" || action === "right" || action === "confirm") {
    if (menu.debugCursor >= menu.debugItems.length) executeDebugNav(menu.debugNavButtons[menu.debugCursor - menu.debugItems.length]?.dataset.debugNav);
    else executeDebug(menu.debugItems[menu.debugCursor].dataset.debug, action === "left" ? -1 : 1);
  }
}
function setDebugPage(page) { menu.view = "debug"; menu.debugPage = Math.max(0, Math.min(1, page)); menu.debugCursor = 0; updateDebugItems(); updateView(); }
function updateDebugItems() { menu.debugPages.forEach((page, index) => { page.hidden = index !== menu.debugPage; }); menu.debugItems = [...menu.debugPages[menu.debugPage].querySelectorAll("[data-debug]")]; }
function executeDebugNav(key) { if (key === "back") { if (menu.debugPage === 0) closeCampMenu("back"); else setDebugPage(0); } else if (menu.debugPage === 0) setDebugPage(1); else closeCampMenu("main"); }
function executeDebug(key, amount = 1) {
  if (key === "compass") { menu.compassVisible = !menu.compassVisible; applyDisplayOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "readout") { menu.readoutVisible = !menu.readoutVisible; applyDisplayOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "presenceDisabled") { menu.presenceDisabled = !menu.presenceDisabled; menu.setPresenceDisabled(menu.presenceDisabled); updateDebugStates(); persistSettings(); return; }
  if (key === "stairsDownVisible") { menu.stairsDownVisible = !menu.stairsDownVisible; applyMinimapRevealOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "npcsVisible") { menu.npcsVisible = !menu.npcsVisible; applyMinimapRevealOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "treasuresVisible") { menu.treasuresVisible = !menu.treasuresVisible; applyMinimapRevealOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "torchFuelDisabled") { menu.torchFuelDisabled = !menu.torchFuelDisabled; menu.setTorchFuelDisabled(menu.torchFuelDisabled); updateDebugStates(); persistSettings(); return; }
  if (key === "mistEnabled") { menu.mistEnabled = !menu.mistEnabled; applyMistOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "mistColor" && menu.mistEnabled) { const colors = ["green", "frost", "poison"]; const index = colors.indexOf(menu.mistColor); menu.mistColor = colors[(Math.max(0, index) + amount + colors.length) % colors.length]; applyMistOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "mistIntensity" && menu.mistEnabled) { menu.mistIntensity = Math.max(.25, Math.min(2, menu.mistIntensity + amount * .25)); applyMistOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "mistDistance" && menu.mistEnabled) { menu.mistDistance = Math.max(3, Math.min(9, menu.mistDistance + amount)); applyMistOptions(); updateDebugStates(); persistSettings(); return; }
  if (key === "wallColor") { const colors = ["default", "red", "blue", "green", "white", "black"]; const index = colors.indexOf(menu.wallColor); menu.wallColor = colors[(Math.max(0, index) + amount + colors.length) % colors.length]; applyWallColor(); updateDebugStates(); persistSettings(); return; }
  if (key === "floorColor") { const colors = ["default", "red", "blue", "green", "purple", "white"]; const index = colors.indexOf(menu.floorColor); menu.floorColor = colors[(Math.max(0, index) + amount + colors.length) % colors.length]; applyFloorColor(); updateDebugStates(); persistSettings(); return; }
  if (key === "stopwatchOn") { menu.stopwatchVisible = true; menu.setStopwatchVisible(true); updateDebugStates(); persistSettings(); return; }
  if (key === "stopwatchOff") { menu.stopwatchVisible = false; menu.setStopwatchVisible(false); updateDebugStates(); persistSettings(); return; }
  if (key === "stopwatchReset") { triggerAction("stopwatchReset", () => { menu.resetStopwatch(); updateDebugStates(); }); return; }
  if (key === "torchFull" && menu.torchFuelDisabled) return;
  const actions = { random: menu.generateRandomDungeon, autoReturn: menu.startAutoReturn, torchFull: menu.refillTorch };
  if (actions[key]) triggerAction(key, () => { closeCampMenu(); actions[key](); });
}
function triggerAction(key, action) { menu.actionActive[key] = true; updateDebugStates(); setTimeout(() => { menu.actionActive[key] = false; action(); updateDebugStates(); }, ACTION_FEEDBACK_MS); }

function bindCommands() { menu.commands.forEach(button => button.addEventListener("click", () => { menu.commandIndex = menu.commands.indexOf(button); updateSelection(); if (isCommandUnavailable(button)) return; menu.playSe("confirm"); openCommand(button.dataset.command); })); }
function bindStatus() { menu.statusPanel.querySelectorAll("[data-status-nav]").forEach(button => button.addEventListener("click", () => { menu.playSe(button.dataset.statusNav === "back" ? "cancel" : "confirm"); statusNavigate(button.dataset.statusNav); })); }
function bindDeck() {
  menu.deckPanel.querySelector("[data-deck-back]").addEventListener("click", () => { menu.playSe("cancel"); closeDeckView(); });
  menu.deckPanel.querySelector("[data-deck-add]").addEventListener("click", () => {
    if (!menu.deckEditable) return;
    menu.playSe("confirm");
    openDeckPicker();
  });
  menu.deckPanel.querySelector("[data-deck-remove]").addEventListener("click", () => {
    if (!menu.deckEditable || !menu.deckSlots[menu.deckCursor]) return;
    menu.playSe("confirm");
    const character = menu.getCharacter();
    const next = setDeckSlot(character?.cards, menu.deckCursor, null, character?.deckCost || 3);
    menu.onDeckChanged(next);
    renderDeck();
  });
  menu.deckPanel.querySelectorAll("[data-deck-picker-nav]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      menu.playSe("cursorMove");
      changeDeckPickerPage(button.dataset.deckPickerNav === "next" ? 1 : -1);
    });
  });
}
function bindManualSave() {
  menu.savePanel.querySelector("[data-manual-save-back]").addEventListener("click", () => {
    menu.playSe("cancel");
    menu.view = "commands";
    updateView();
  });
}
function bindOptions() {
  menu.optionPages.forEach(page => page.querySelectorAll("[data-option]").forEach(item => item.addEventListener("click", event => {
    if (item.matches(".volume-row") && event.target.matches("input")) return;
    menu.playSe("confirm");
    menu.optionCursor = menu.optionItems.indexOf(item);
    updateSelection();
    executeOption(item.dataset.option);
  })));
  menu.optionNavButtons.forEach(button => button.addEventListener("click", () => {
    menu.playSe(button.dataset.optionNav === "back" ? "cancel" : "confirm");
    executeOptionNav(button.dataset.optionNav);
  }));
  menu.root.querySelectorAll(".volume-row input").forEach(slider => {
    slider.addEventListener("input", () => {
      slider.parentElement.querySelector("span").textContent = `${slider.value}%`;
      if (slider.id === "bgmVolume") applyBgmOptions();
      if (slider.id === "seVolume") applySeOptions();
      persistSettings();
    });
    slider.addEventListener("change", () => {
      if (slider.id === "seVolume") menu.playSe("cursorMove");
    });
  });
}
function bindDebug() {
  menu.debugPages.forEach(page => page.querySelectorAll("[data-debug]").forEach(item => item.addEventListener("click", event => {
    menu.playSe("confirm");
    menu.debugCursor = menu.debugItems.indexOf(item); updateSelection();
    const colorButton = event.target.closest("[data-mist-color]");
    if (colorButton && menu.mistEnabled) { menu.mistColor = colorButton.dataset.mistColor; applyMistOptions(); updateDebugStates(); persistSettings(); return; }
    const wallColorButton = event.target.closest("[data-wall-color]");
    if (wallColorButton) { menu.wallColor = wallColorButton.dataset.wallColor; applyWallColor(); updateDebugStates(); persistSettings(); return; }
    const floorColorButton = event.target.closest("[data-floor-color]");
    if (floorColorButton) { menu.floorColor = floorColorButton.dataset.floorColor; applyFloorColor(); updateDebugStates(); persistSettings(); return; }
    if (event.target.matches('input[type="range"]')) return;
    executeDebug(item.dataset.debug, 1);
  })));
  menu.debugPanel.querySelectorAll('.debug-slider-row input').forEach(slider => slider.addEventListener("input", () => {
    if (slider.id === "mistIntensity") menu.mistIntensity = Number(slider.value) / 100;
    if (slider.id === "mistDistance") menu.mistDistance = Number(slider.value);
    applyMistOptions(); updateDebugStates(); persistSettings();
  }));
  menu.debugNavButtons.forEach(button => button.addEventListener("click", () => { menu.playSe(button.dataset.debugNav === "back" ? "cancel" : "confirm"); executeDebugNav(button.dataset.debugNav); }));
}
function renderEmptyStats() { const rows = ["STR", "INT", "AGI", "DEX", "LUC", "DEF"].map(label => { const row = document.createElement("div"); row.className = "nde-stat-row"; const name = document.createElement("strong"); name.textContent = label; const gauge = document.createElement("span"); gauge.className = "nde-empty-gauge"; for (let index = 0; index < 30; index += 1) gauge.append(document.createElement("i")); const value = document.createElement("output"); value.textContent = "--"; row.append(name, gauge, value); return row; }); menu.root.querySelector("#ndeStatRows").replaceChildren(...rows); }

function updateView() {
  const screenOpen = ["status", "deck", "inventory", "save", "options", "debug"].includes(menu.view);
  document.body.classList.toggle("menu-open", screenOpen); document.body.classList.toggle("command-open", menu.view === "commands");
  document.body.classList.toggle("deck-open", menu.view === "deck");
  document.body.classList.toggle("inventory-open", menu.view === "inventory");
  menu.root.hidden = !screenOpen; menu.statusPanel.hidden = menu.view !== "status"; menu.deckPanel.hidden = menu.view !== "deck"; menu.inventoryPanel.hidden = menu.view !== "inventory"; menu.savePanel.hidden = menu.view !== "save"; menu.optionsPanel.hidden = menu.view !== "options"; menu.debugPanel.hidden = menu.view !== "debug";
  menu.commandRoot.dataset.active = String(menu.view === "commands");
  const hint = document.querySelector("#commandHint"); if (hint) hint.textContent = menu.view === "commands" ? "＊ Bボタンでメニュー非表示" : "＊ Bボタンでメニュー表示";
  updateStatus(); updatePager(); updateDebugPager(); updateSelection();
}

function renderDeck() {
  const character = menu.getCharacter();
  menu.deckSlots = Array.from({ length: DECK_SLOT_COUNT }, (_, index) => character?.cards?.deckSlots?.[index] || null);
  const root = menu.deckPanel.querySelector("[data-deck-slots]");
  menu.deckPanel.querySelector("[data-deck-title]").textContent = "CARD DECK";
  root.replaceChildren(...menu.deckSlots.map((cardId, index) => {
    const card = getCardById(cardId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `deck-slot${card ? "" : " is-empty"}`;
    button.dataset.deckSlot = String(index);
    button.setAttribute("aria-label", card ? `スロット${index + 1} ${card.nameJa}` : `スロット${index + 1} 空き`);
    button.innerHTML = card
      ? `<canvas width="180" height="260" aria-label="${card.nameJa}"></canvas>`
      : `<strong>${menu.deckEditable ? "ADD CARD" : "EMPTY"}</strong>`;
    if (card) drawCardCanvas(button.querySelector("canvas"), card);
    button.addEventListener("click", () => {
      if (menu.deckPointerArmedIndex === index && menu.deckEditable) {
        menu.playSe("confirm");
        menu.deckPointerArmedIndex = -1;
        openDeckPicker();
        return;
      }
      menu.playSe("cursorMove");
      menu.deckCursor = index;
      menu.deckPointerArmedIndex = index;
      renderDeckSelection();
    });
    return button;
  }));
  menu.deckPanel.querySelector("[data-deck-used-cost]").textContent = String(calculateDeckCost(menu.deckSlots));
  menu.deckPanel.querySelector("[data-deck-cost-limit]").textContent = String(character?.deckCost || 3);
  const ownedCount = Object.values(character?.cards?.ownedCardCounts || {}).reduce((sum, count) => sum + count, 0);
  menu.deckPanel.querySelector("[data-owned-card-count]").textContent = String(ownedCount);
  menu.deckPanel.querySelector("[data-deck-add]").disabled = !menu.deckEditable;
  renderDeckSelection();
}

function renderDeckPicker() {
  const picker = menu.deckPanel.querySelector("[data-deck-picker]");
  const list = menu.deckPanel.querySelector("[data-deck-picker-list]");
  picker.hidden = !menu.deckPickerOpen;
  if (!menu.deckPickerOpen) return;
  const visibleIndexes = getDeckPickerVisibleIndexes();
  list.replaceChildren(...visibleIndexes.map(index => {
    const cardId = menu.deckPickerItems[index];
    const card = getCardById(cardId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === menu.deckPickerCursor ? "is-selected" : "";
    if (card) {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 180;
      drawCardCanvas(canvas, card);
      const count = document.createElement("span");
      const setCount = menu.deckSlots.filter(id => id === card.id).length;
      const setLabel = setCount > 1 ? `[SET×${setCount}]` : setCount === 1 ? "[SET]" : "";
      const nowLabel = menu.deckSlots[menu.deckCursor] === card.id ? "[NOW]" : "";
      const cardCount = document.createElement("span");
      cardCount.className = "deck-picker-card-count";
      cardCount.textContent = `${card.nameJa}　×${menu.getCharacter()?.cards?.ownedCardCounts?.[card.id] || 0}`;
      count.append(cardCount);
      if (setLabel) {
        const label = document.createElement("em");
        label.className = "deck-picker-set-label";
        label.textContent = setLabel;
        count.append(label);
      }
      if (nowLabel) {
        const label = document.createElement("em");
        label.className = "deck-picker-now-label";
        label.textContent = nowLabel;
        count.append(label);
      }
      button.append(canvas, count);
    } else {
      button.textContent = "はずす / EMPTY";
    }
    button.addEventListener("click", () => {
      if (menu.deckPickerPointerArmedIndex !== index) {
        menu.deckPickerCursor = index;
        menu.deckPickerPointerArmedIndex = index;
        menu.playSe("cursorMove");
        renderDeckPicker();
        return;
      }
      menu.deckPickerCursor = index;
      menu.deckPickerPointerArmedIndex = -1;
      menu.playSe("confirm");
      applyDeckPickerSelection();
    });
    return button;
  }));
  if (menu.deckPickerItems.length === 1) {
    const note = document.createElement("small");
    note.textContent = "所持カードがありません。";
    list.append(note);
  }
  const pageCount = getDeckPickerPageCount();
  picker.querySelector("[data-deck-picker-page]").textContent = `${menu.deckPickerPage + 1}/${pageCount}`;
  picker.querySelector('[data-deck-picker-nav="back"]').disabled = menu.deckPickerPage === 0;
  picker.querySelector('[data-deck-picker-nav="next"]').disabled = menu.deckPickerPage >= pageCount - 1;
}

function getDeckPickerPageCount() {
  return Math.max(1, Math.ceil(Math.max(0, menu.deckPickerItems.length - 1) / DECK_PICKER_PAGE_SIZE));
}

function getDeckPickerVisibleIndexes() {
  const start = 1 + menu.deckPickerPage * DECK_PICKER_PAGE_SIZE;
  const ownedIndexes = Array.from(
    { length: Math.min(DECK_PICKER_PAGE_SIZE, Math.max(0, menu.deckPickerItems.length - start)) },
    (_, offset) => start + offset
  );
  return [0, ...ownedIndexes];
}

function changeDeckPickerPage(amount) {
  const nextPage = Math.max(
    0,
    Math.min(getDeckPickerPageCount() - 1, menu.deckPickerPage + amount)
  );
  if (nextPage === menu.deckPickerPage) {
    renderDeckPicker();
    return;
  }
  menu.deckPickerPage = nextPage;
  menu.deckPickerCursor = getDeckPickerVisibleIndexes()[1] ?? 0;
  menu.deckPickerPointerArmedIndex = -1;
  renderDeckPicker();
}

function renderDeckSelection() {
  menu.deckPanel.querySelectorAll("[data-deck-slot]").forEach((button, index) => button.classList.toggle("is-selected", index === menu.deckCursor));
  const card = getCardById(menu.deckSlots[menu.deckCursor]);
  menu.deckPanel.querySelector("[data-deck-remove]").disabled = !menu.deckEditable || !card;
  menu.deckPanel.querySelector("[data-deck-detail]").textContent = card
    ? `[${card.rarity}] ${card.nameJa} / ${card.concept} / COST ${card.cost}`
    : menu.deckEditable
      ? `SLOT ${menu.deckCursor + 1}：Aボタンでセットするカードを選択します。`
      : `SLOT ${menu.deckCursor + 1}：カードはセットされていません。ダンジョン内では編成できません。`;
}
function renderManualSave(message = "") {
  const summaries = menu.getSaveSlotSummaries().filter(summary => summary.slot !== "auto");
  const root = menu.savePanel.querySelector("[data-manual-save-slots]");
  root.replaceChildren(...summaries.map((summary, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.manualSaveSlot = summary.slot;
    button.textContent = formatSaveSummary(summary);
    button.classList.toggle("is-selected", menu.saveCursor === index);
    button.addEventListener("click", () => {
      menu.saveCursor = index;
      renderManualSave();
      if (summary.exists && !window.confirm(`${summary.label}へ上書き保存しますか？`)) return;
      menu.playSe("confirm");
      const saved = menu.saveGame(summary.slot);
      renderManualSave(saved ? `${summary.label}へ保存しました。` : "セーブに失敗しました。");
    });
    return button;
  }));
  menu.savePanel.querySelector("[data-manual-save-back]").classList.toggle(
    "is-selected",
    menu.saveCursor === summaries.length
  );
  menu.savePanel.querySelector("[data-manual-save-feedback]").textContent = message;
}

function formatSaveSummary(summary) {
  if (!summary.exists) return `${summary.label}（データなし）`;
  const date = new Date(summary.savedAt);
  const formatted = Number.isNaN(date.getTime())
    ? "日時不明"
    : new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).format(date);
  return `${summary.label}（${summary.name}／Lv${summary.level}／${formatted}）`;
}
function updateStatus() { menu.statusPanel.querySelectorAll("[data-status-page]").forEach((page, index) => { page.hidden = index !== menu.statusPage; }); menu.statusPanel.querySelector("[data-status-indicator]").textContent = `${menu.statusPage + 1}/2`; const next = menu.statusPanel.querySelector('[data-status-nav="next"]'); next.textContent = menu.statusPage === 0 ? "NEXT" : "MAIN"; menu.statusPanel.querySelector('[data-status-nav="back"]').classList.toggle("is-selected", menu.statusPage === 0); next.classList.toggle("is-selected", menu.statusPage === 1); }
function updatePager() { menu.optionsPanel.querySelector("[data-page-indicator]").textContent = `${menu.optionPage + 1}/2`; menu.optionNavButtons.find(button => button.dataset.optionNav === "next").textContent = menu.optionPage === 0 ? "NEXT" : "MAIN"; }
function updateDebugPager() { menu.debugPanel.querySelector("[data-debug-indicator]").textContent = `${menu.debugPage + 1}/2`; menu.debugNavButtons.find(button => button.dataset.debugNav === "next").textContent = menu.debugPage === 0 ? "NEXT" : "MAIN"; }
function updateSelection() { menu.commands.forEach((button, index) => { const unavailable = isCommandUnavailable(button); button.classList.toggle("is-selected", menu.view === "commands" && index === menu.commandIndex); button.classList.toggle("is-unavailable", unavailable); button.setAttribute("aria-disabled", String(unavailable)); }); menu.optionItems.forEach((item, index) => item.classList.toggle("is-selected", menu.view === "options" && index === menu.optionCursor)); menu.optionNavButtons.forEach((button, index) => button.classList.toggle("is-selected", menu.view === "options" && menu.optionCursor === menu.optionItems.length + index)); menu.debugItems.forEach((item, index) => item.classList.toggle("is-selected", menu.view === "debug" && index === menu.debugCursor)); menu.debugNavButtons.forEach((button, index) => button.classList.toggle("is-selected", menu.view === "debug" && menu.debugCursor === menu.debugItems.length + index)); updateOptionStates(); updateDebugStates(); }
function updateOptionStates() {
  const shake = menu.root.querySelector('[data-option-state="screenShake"]');
  const torch = menu.root.querySelector('[data-option-state="torchFlicker"]');
  const typewriter = menu.root.querySelector('[data-option-state="npcTypewriterEnabled"]');
  const speed = menu.root.querySelector('[data-option-state="npcTypewriterSpeed"]');
  const speedButton = menu.root.querySelector('[data-option="npcTypewriterSpeed"]');
  const se = menu.root.querySelector('[data-option-state="seEnabled"]');
  const bgm = menu.root.querySelector('[data-option-state="bgmEnabled"]');
  const bgmSlider = menu.root.querySelector('#bgmVolume');
  const seSlider = menu.root.querySelector('#seVolume');
  if (shake) shake.textContent = toggleText(menu.screenShakeEnabled);
  if (torch) torch.textContent = toggleText(menu.torchFlickerEnabled);
  if (typewriter) typewriter.textContent = toggleText(menu.npcTypewriterEnabled);
  if (speed) speed.textContent = ["slow", "normal", "fast"].map(value => `${value.toUpperCase()} ${menu.npcTypewriterSpeed === value ? ON_MARK : OFF_MARK}`).join("　");
  if (speedButton) speedButton.disabled = !menu.npcTypewriterEnabled;
  if (se) se.textContent = toggleText(menu.seEnabled);
  if (bgm) bgm.textContent = toggleText(menu.bgmEnabled);
  if (bgmSlider) { bgmSlider.disabled = !menu.bgmEnabled; bgmSlider.parentElement.classList.toggle("is-muted", !menu.bgmEnabled); }
  if (seSlider) { seSlider.disabled = !menu.seEnabled; seSlider.parentElement.classList.toggle("is-muted", !menu.seEnabled); }
}
function updateDebugStates() {
  const values = { compass: menu.compassVisible, readout: menu.readoutVisible, torchFuelDisabled: menu.torchFuelDisabled, presenceDisabled: menu.presenceDisabled, stairsDownVisible: menu.stairsDownVisible, npcsVisible: menu.npcsVisible, treasuresVisible: menu.treasuresVisible, mistEnabled: menu.mistEnabled };
  Object.entries(values).forEach(([key, enabled]) => {
    const state = menu.root.querySelector(`[data-debug-state="${key}"]`);
    if (state) state.textContent = toggleText(enabled);
  });
  Object.keys(menu.actionActive).forEach(key => {
    const state = menu.root.querySelector(`[data-debug-action="${key}"]`);
    if (state) state.textContent = `ON ${menu.actionActive[key] ? ON_MARK : OFF_MARK}`;
  });
  const stopwatchOn = menu.root.querySelector('[data-stopwatch-state="on"]');
  const stopwatchOff = menu.root.querySelector('[data-stopwatch-state="off"]');
  const stopwatchReset = menu.root.querySelector('[data-stopwatch-state="reset"]');
  if (stopwatchOn) stopwatchOn.textContent = menu.stopwatchVisible ? ON_MARK : OFF_MARK;
  if (stopwatchOff) stopwatchOff.textContent = menu.stopwatchVisible ? OFF_MARK : ON_MARK;
  if (stopwatchReset) stopwatchReset.textContent = menu.actionActive.stopwatchReset ? ON_MARK : OFF_MARK;
  const mistIntensity = menu.root.querySelector('[data-debug-value="mistIntensity"]');
  const mistDistance = menu.root.querySelector('[data-debug-value="mistDistance"]');
  const mistIntensitySlider = menu.root.querySelector('#mistIntensity');
  const mistDistanceSlider = menu.root.querySelector('#mistDistance');
  if (mistIntensity) mistIntensity.textContent = `${Math.round(menu.mistIntensity * 100)}%`;
  if (mistDistance) mistDistance.textContent = `${menu.mistDistance}マス`;
  menu.root.querySelectorAll('[data-wall-color]').forEach(button => { const selected = button.dataset.wallColor === menu.wallColor; button.classList.toggle("is-active", selected); button.querySelector("i").textContent = selected ? ON_MARK : OFF_MARK; });
  menu.root.querySelectorAll('[data-floor-color]').forEach(button => { const selected = button.dataset.floorColor === menu.floorColor; button.classList.toggle("is-active", selected); button.querySelector("i").textContent = selected ? ON_MARK : OFF_MARK; });
  menu.root.querySelectorAll('[data-mist-color]').forEach(button => { const selected = button.dataset.mistColor === menu.mistColor; button.classList.toggle("is-active", selected); button.querySelector("i").textContent = selected ? ON_MARK : OFF_MARK; });
  if (mistIntensitySlider) mistIntensitySlider.value = String(Math.round(menu.mistIntensity * 100));
  if (mistDistanceSlider) mistDistanceSlider.value = String(menu.mistDistance);
  if (mistIntensitySlider) mistIntensitySlider.classList.toggle("is-default", menu.mistIntensity === 1);
  if (mistDistanceSlider) mistDistanceSlider.classList.toggle("is-default", menu.mistDistance === 9);
  menu.debugPanel.querySelectorAll('.debug-slider-row').forEach(item => { item.classList.toggle("is-disabled", !menu.mistEnabled); item.querySelector("input").disabled = !menu.mistEnabled; });
  const mistColorItem = menu.debugPanel.querySelector('[data-debug="mistColor"]');
  if (mistColorItem) { mistColorItem.classList.toggle("is-disabled", !menu.mistEnabled); mistColorItem.querySelectorAll("button").forEach(button => { button.disabled = !menu.mistEnabled; }); }
  const torchFullItem = menu.debugPanel.querySelector('[data-debug="torchFull"]');
  if (torchFullItem) torchFullItem.disabled = menu.torchFuelDisabled;
}
function toggleText(enabled) { return enabled ? `ON ${ON_MARK}　OFF ${OFF_MARK}` : `ON ${OFF_MARK}　OFF ${ON_MARK}`; }
function applyDisplayOptions() { document.body.classList.toggle("hide-compass", !menu.compassVisible); document.body.classList.toggle("show-readout", menu.readoutVisible); }
function applyRenderOptions() { menu.setScreenShakeEnabled(menu.screenShakeEnabled); menu.setTorchFlickerEnabled(menu.torchFlickerEnabled); }
function applyMinimapRevealOptions() { menu.setMinimapRevealOptions({ stairsDown: menu.stairsDownVisible, npcs: menu.npcsVisible, treasures: menu.treasuresVisible }); }
function applyNpcTypewriterOptions() { menu.setNpcTypewriterOptions({ enabled: menu.npcTypewriterEnabled, speed: menu.npcTypewriterSpeed }); }
function applyMistOptions() { menu.setMistOptions({ enabled: menu.mistEnabled, intensity: menu.mistIntensity, distance: menu.mistDistance, color: menu.mistColor }); }
function applyWallColor() { menu.setWallColor(menu.wallColor); }
function applyFloorColor() { menu.setFloorColor(menu.floorColor); }
function applyBgmOptions() { menu.setBgmOptions({ enabled: menu.bgmEnabled, volume: Number(menu.root.querySelector('#bgmVolume')?.value || 0) / 100 }); }
function applySeOptions() { menu.setSeOptions({ enabled: menu.seEnabled, volume: Number(menu.root.querySelector('#seVolume')?.value || 0) / 100 }); }

function applyAllSettings() {
  applyDisplayOptions();
  applyRenderOptions();
  applyMinimapRevealOptions();
  applyNpcTypewriterOptions();
  applyMistOptions();
  applyWallColor();
  applyFloorColor();
  applyBgmOptions();
  applySeOptions();
  menu.setTorchFuelDisabled(menu.torchFuelDisabled);
  menu.setPresenceDisabled(menu.presenceDisabled);
  menu.setStopwatchVisible(menu.stopwatchVisible);
  ["bgmVolume", "seVolume"].forEach(id => {
    const slider = menu.root.querySelector(`#${id}`);
    if (slider) slider.parentElement.querySelector("span").textContent = `${slider.value}%`;
  });
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!saved || typeof saved !== "object") return;
    const booleanKeys = ["compassVisible", "readoutVisible", "screenShakeEnabled", "torchFlickerEnabled", "torchFuelDisabled", "presenceDisabled", "stopwatchVisible", "stairsDownVisible", "npcsVisible", "treasuresVisible", "npcTypewriterEnabled", "mistEnabled", "bgmEnabled", "seEnabled"];
    booleanKeys.forEach(key => { if (typeof saved[key] === "boolean") menu[key] = saved[key]; });
    if (["slow", "normal", "fast"].includes(saved.npcTypewriterSpeed)) menu.npcTypewriterSpeed = saved.npcTypewriterSpeed;
    if (Number.isFinite(saved.mistIntensity) && saved.mistIntensity >= .25 && saved.mistIntensity <= 2) menu.mistIntensity = saved.mistIntensity;
    else if (Number.isFinite(saved.mistIntensity)) menu.mistIntensity = 1;
    if (Number.isFinite(saved.mistDistance) && saved.mistDistance >= 3 && saved.mistDistance <= 9) menu.mistDistance = saved.mistDistance;
    else if (Number.isFinite(saved.mistDistance)) menu.mistDistance = 9;
    if (["green", "frost", "poison"].includes(saved.mistColor)) menu.mistColor = saved.mistColor;
    else if (saved.mistColor === "dark") menu.mistColor = "green";
    if (["default", "red", "blue", "green", "white", "black"].includes(saved.wallColor)) menu.wallColor = saved.wallColor;
    if (["default", "red", "blue", "green", "purple", "white"].includes(saved.floorColor)) menu.floorColor = saved.floorColor;
    const bgmSlider = menu.root.querySelector('#bgmVolume');
    const bgmValue = Number(saved.bgmVolume);
    if (bgmSlider && typeof saved.bgmEnabled === "boolean" && Number.isFinite(bgmValue)) {
      bgmSlider.value = String(Math.round(Math.max(0, Math.min(100, bgmValue)) / 10) * 10);
    }
    const seSlider = menu.root.querySelector('#seVolume');
    const seValue = Number(saved.seVolume);
    if (seSlider && typeof saved.seEnabled === "boolean" && Number.isFinite(seValue)) {
      seSlider.value = String(Math.round(Math.max(0, Math.min(100, seValue)) / 10) * 10);
    }
    menu.wallColor = "default";
    menu.floorColor = "default";
    menu.mistColor = "frost";
  } catch (error) {
    console.warn("NDE settings could not be restored.", error);
  }
}

function persistSettings() {
  try {
    const settings = {
      compassVisible: menu.compassVisible,
      readoutVisible: menu.readoutVisible,
      screenShakeEnabled: menu.screenShakeEnabled,
      torchFlickerEnabled: menu.torchFlickerEnabled,
      torchFuelDisabled: menu.torchFuelDisabled,
      presenceDisabled: menu.presenceDisabled,
      stopwatchVisible: menu.stopwatchVisible,
      stairsDownVisible: menu.stairsDownVisible,
      npcsVisible: menu.npcsVisible,
      treasuresVisible: menu.treasuresVisible,
      npcTypewriterEnabled: menu.npcTypewriterEnabled,
      npcTypewriterSpeed: menu.npcTypewriterSpeed,
      mistEnabled: menu.mistEnabled,
      mistIntensity: menu.mistIntensity,
      mistDistance: menu.mistDistance,
      mistColor: menu.mistColor,
      wallColor: menu.wallColor,
      floorColor: menu.floorColor,
      bgmEnabled: menu.bgmEnabled,
      seEnabled: menu.seEnabled,
      bgmVolume: Number(menu.root.querySelector("#bgmVolume")?.value || 0),
      seVolume: Number(menu.root.querySelector("#seVolume")?.value || 0)
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("NDE settings could not be saved.", error);
  }
}
