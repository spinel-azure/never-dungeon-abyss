const ACTION_FEEDBACK_MS = 260;
const DEBUG_SEQUENCE_MS = 1000;
const DEBUG_CANCEL_WINDOW_MS = 2000;
const SETTINGS_KEY = "nde-settings-v1";
const ON_MARK = "🔘";
const OFF_MARK = "⚫";

const menu = {
  root: null, commandRoot: null, statusPanel: null, optionsPanel: null, debugPanel: null,
  commands: [], enabledCommands: [], commandIndex: 0, statusPage: 0,
  optionPages: [], optionItems: [], optionNavButtons: [], optionCursor: 0, optionPage: 0,
  debugPages: [], debugItems: [], debugNavButtons: [], debugCursor: 0, debugPage: 0, recentConfirms: [], debugArmed: false, view: "dungeon",
  compassVisible: true, readoutVisible: false, screenShakeEnabled: true,
  torchFlickerEnabled: true, torchFuelDisabled: false, presenceDisabled: false, stopwatchVisible: true,
  stairsDownVisible: false, npcsVisible: false, treasuresVisible: false,
  mistEnabled: true, mistIntensity: 1, mistDistance: 9, mistColor: "green",
  wallColor: "default",
  floorColor: "default",
  seEnabled: true,
  npcTypewriterEnabled: true, npcTypewriterSpeed: "normal",
  actionActive: { random: false, autoReturn: false, torchFull: false, stopwatchReset: false },
  generateRandomDungeon: () => {}, startAutoReturn: () => {}, refillTorch: () => {},
  setScreenShakeEnabled: () => {}, setTorchFlickerEnabled: () => {}, setTorchFuelDisabled: () => {}, setPresenceDisabled: () => {},
  setMistOptions: () => {}, setWallColor: () => {}, setFloorColor: () => {},
  setSeOptions: () => {}, playSe: () => {},
  setMinimapRevealOptions: () => {},
  setNpcTypewriterOptions: () => {},
  setStopwatchVisible: () => {}, resetStopwatch: () => {},
  saveGame: () => false,
  onReturnToDungeon: () => {}
};

export function configureMenu(options) {
  Object.assign(menu, options);
  menu.statusPanel = menu.root.querySelector('[data-menu-view="status"]');
  menu.optionsPanel = menu.root.querySelector('[data-menu-view="options"]');
  menu.debugPanel = menu.root.querySelector('[data-menu-view="debug"]');
  menu.commands = [...menu.commandRoot.querySelectorAll("[data-command]")];
  menu.enabledCommands = menu.commands.filter(button => !button.disabled);
  menu.optionPages = [...menu.optionsPanel.querySelectorAll("[data-option-page]")];
  menu.optionNavButtons = [...menu.optionsPanel.querySelectorAll("[data-option-nav]")];
  menu.debugPages = [...menu.debugPanel.querySelectorAll("[data-debug-page]")];
  menu.debugNavButtons = [...menu.debugPanel.querySelectorAll("[data-debug-nav]")];
  restoreSettings();
  renderEmptyStats(); bindCommands(); bindStatus(); bindOptions(); bindDebug();
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
  if (action === "up" || action === "down" || action === "left" || action === "right") menu.playSe("cursorMove");
  else if (action === "confirm") menu.playSe("confirm");
  else if (action === "cancel") menu.playSe("cancel");
  if (menu.view === "commands") handleCommands(action);
  else if (menu.view === "status") handleStatus(action);
  else if (menu.view === "options") handleOptions(action);
  else if (menu.view === "debug") handleDebug(action);
  return true;
}

function handleCommands(action) {
  if (action === "cancel") { closeCampMenu("back"); return; }
  if (["up", "down", "left", "right"].includes(action)) { menu.commandIndex = (menu.commandIndex + 1) % menu.enabledCommands.length; updateSelection(); return; }
  if (action === "confirm") openCommand(menu.enabledCommands[menu.commandIndex].dataset.command);
}
function openCommand(key) { if (key === "status") { menu.view = "status"; menu.statusPage = 0; updateView(); } else if (key === "options") setOptionPage(0); else if (key === "save") { closeCampMenu("save"); menu.saveGame(); } }
function handleStatus(action) { if (action === "cancel") { menu.view = "commands"; updateView(); } else if (action === "left") { menu.statusPage = 0; updateStatus(); } else if (action === "right") { menu.statusPage = 1; updateStatus(); } else if (action === "confirm") { menu.view = "commands"; updateView(); } }
function statusNavigate(key) { if (key === "back") { if (menu.statusPage === 0) { menu.view = "commands"; updateView(); } else { menu.statusPage = 0; updateStatus(); } } else if (menu.statusPage === 0) { menu.statusPage = 1; updateStatus(); } else { menu.view = "commands"; updateView(); } }

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
  if (key === "seEnabled") { menu.seEnabled = !menu.seEnabled; applySeOptions(); updateOptionStates(); persistSettings(); }
  if (key === "screenShake") { menu.screenShakeEnabled = !menu.screenShakeEnabled; applyRenderOptions(); updateOptionStates(); persistSettings(); }
  if (key === "torchFlicker") { menu.torchFlickerEnabled = !menu.torchFlickerEnabled; applyRenderOptions(); updateOptionStates(); persistSettings(); }
  if (key === "npcTypewriterEnabled") { menu.npcTypewriterEnabled = !menu.npcTypewriterEnabled; applyNpcTypewriterOptions(); updateOptionStates(); persistSettings(); }
  if (key === "npcTypewriterSpeed" && menu.npcTypewriterEnabled) { cycleNpcTypewriterSpeed(1); }
}
function adjustSelectedOption(amount) { if (menu.optionCursor >= menu.optionItems.length) return; const key = menu.optionItems[menu.optionCursor].dataset.option; if (key === "bgmVolume" || key === "seVolume") { const slider = menu.root.querySelector(`#${key}`); slider.value = String(Math.max(0, Math.min(100, Number(slider.value) + amount * 10))); slider.dispatchEvent(new Event("input", { bubbles: true })); } else if (key === "npcTypewriterSpeed" && menu.npcTypewriterEnabled) cycleNpcTypewriterSpeed(amount); else if (key === "screenShake" || key === "torchFlicker" || key === "npcTypewriterEnabled" || key === "seEnabled") executeOption(key); }

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

function bindCommands() { menu.commands.forEach(button => button.addEventListener("click", () => { if (button.disabled) return; menu.playSe("confirm"); menu.commandIndex = menu.enabledCommands.indexOf(button); updateSelection(); openCommand(button.dataset.command); })); }
function bindStatus() { menu.statusPanel.querySelectorAll("[data-status-nav]").forEach(button => button.addEventListener("click", () => { menu.playSe(button.dataset.statusNav === "back" ? "cancel" : "confirm"); statusNavigate(button.dataset.statusNav); })); }
function bindOptions() { menu.optionPages.forEach(page => page.querySelectorAll("[data-option]").forEach(item => item.addEventListener("click", event => { if (item.matches(".volume-row") && event.target.matches("input")) return; menu.playSe("confirm"); menu.optionCursor = menu.optionItems.indexOf(item); updateSelection(); executeOption(item.dataset.option); }))); menu.optionNavButtons.forEach(button => button.addEventListener("click", () => { menu.playSe(button.dataset.optionNav === "back" ? "cancel" : "confirm"); executeOptionNav(button.dataset.optionNav); })); menu.root.querySelectorAll(".volume-row input").forEach(slider => slider.addEventListener("input", () => { slider.parentElement.querySelector("span").textContent = `${slider.value}%`; if (slider.id === "seVolume") applySeOptions(); persistSettings(); })); }
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
  const screenOpen = ["status", "options", "debug"].includes(menu.view);
  document.body.classList.toggle("menu-open", screenOpen); document.body.classList.toggle("command-open", menu.view === "commands");
  menu.root.hidden = !screenOpen; menu.statusPanel.hidden = menu.view !== "status"; menu.optionsPanel.hidden = menu.view !== "options"; menu.debugPanel.hidden = menu.view !== "debug";
  menu.commandRoot.dataset.active = String(menu.view === "commands");
  const hint = document.querySelector("#commandHint"); if (hint) hint.textContent = menu.view === "commands" ? "＊ Bボタンでメニュー非表示" : "＊ Bボタンでメニュー表示";
  updateStatus(); updatePager(); updateDebugPager(); updateSelection();
}
function updateStatus() { menu.statusPanel.querySelectorAll("[data-status-page]").forEach((page, index) => { page.hidden = index !== menu.statusPage; }); menu.statusPanel.querySelector("[data-status-indicator]").textContent = `${menu.statusPage + 1}/2`; const next = menu.statusPanel.querySelector('[data-status-nav="next"]'); next.textContent = menu.statusPage === 0 ? "NEXT" : "MAIN"; menu.statusPanel.querySelector('[data-status-nav="back"]').classList.toggle("is-selected", menu.statusPage === 0); next.classList.toggle("is-selected", menu.statusPage === 1); }
function updatePager() { menu.optionsPanel.querySelector("[data-page-indicator]").textContent = `${menu.optionPage + 1}/2`; menu.optionNavButtons.find(button => button.dataset.optionNav === "next").textContent = menu.optionPage === 0 ? "NEXT" : "MAIN"; }
function updateDebugPager() { menu.debugPanel.querySelector("[data-debug-indicator]").textContent = `${menu.debugPage + 1}/2`; menu.debugNavButtons.find(button => button.dataset.debugNav === "next").textContent = menu.debugPage === 0 ? "NEXT" : "MAIN"; }
function updateSelection() { menu.commands.forEach(button => button.classList.toggle("is-selected", menu.view === "commands" && button === menu.enabledCommands[menu.commandIndex])); menu.optionItems.forEach((item, index) => item.classList.toggle("is-selected", menu.view === "options" && index === menu.optionCursor)); menu.optionNavButtons.forEach((button, index) => button.classList.toggle("is-selected", menu.view === "options" && menu.optionCursor === menu.optionItems.length + index)); menu.debugItems.forEach((item, index) => item.classList.toggle("is-selected", menu.view === "debug" && index === menu.debugCursor)); menu.debugNavButtons.forEach((button, index) => button.classList.toggle("is-selected", menu.view === "debug" && menu.debugCursor === menu.debugItems.length + index)); updateOptionStates(); updateDebugStates(); }
function updateOptionStates() {
  const shake = menu.root.querySelector('[data-option-state="screenShake"]');
  const torch = menu.root.querySelector('[data-option-state="torchFlicker"]');
  const typewriter = menu.root.querySelector('[data-option-state="npcTypewriterEnabled"]');
  const speed = menu.root.querySelector('[data-option-state="npcTypewriterSpeed"]');
  const speedButton = menu.root.querySelector('[data-option="npcTypewriterSpeed"]');
  const se = menu.root.querySelector('[data-option-state="seEnabled"]');
  const seSlider = menu.root.querySelector('#seVolume');
  if (shake) shake.textContent = toggleText(menu.screenShakeEnabled);
  if (torch) torch.textContent = toggleText(menu.torchFlickerEnabled);
  if (typewriter) typewriter.textContent = toggleText(menu.npcTypewriterEnabled);
  if (speed) speed.textContent = ["slow", "normal", "fast"].map(value => `${value.toUpperCase()} ${menu.npcTypewriterSpeed === value ? ON_MARK : OFF_MARK}`).join("　");
  if (speedButton) speedButton.disabled = !menu.npcTypewriterEnabled;
  if (se) se.textContent = toggleText(menu.seEnabled);
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
function applySeOptions() { menu.setSeOptions({ enabled: menu.seEnabled, volume: Number(menu.root.querySelector('#seVolume')?.value || 0) / 100 }); }

function applyAllSettings() {
  applyDisplayOptions();
  applyRenderOptions();
  applyMinimapRevealOptions();
  applyNpcTypewriterOptions();
  applyMistOptions();
  applyWallColor();
  applyFloorColor();
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
    const booleanKeys = ["compassVisible", "readoutVisible", "screenShakeEnabled", "torchFlickerEnabled", "torchFuelDisabled", "presenceDisabled", "stopwatchVisible", "stairsDownVisible", "npcsVisible", "treasuresVisible", "npcTypewriterEnabled", "mistEnabled", "seEnabled"];
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
    if (bgmSlider && Number.isFinite(bgmValue)) bgmSlider.value = String(Math.max(0, Math.min(100, bgmValue)));
    const seSlider = menu.root.querySelector('#seVolume');
    const seValue = Number(saved.seVolume);
    if (seSlider && typeof saved.seEnabled === "boolean" && Number.isFinite(seValue)) seSlider.value = String(Math.max(0, Math.min(100, seValue)));
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
      seEnabled: menu.seEnabled,
      bgmVolume: Number(menu.root.querySelector("#bgmVolume")?.value || 0),
      seVolume: Number(menu.root.querySelector("#seVolume")?.value || 0)
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("NDE settings could not be saved.", error);
  }
}
