import { CHARACTER_JOBS, TOWN_FACILITIES, getTownFacility } from "../data/town.js";
import { QUESTS, getQuestProgress, hasActiveQuest } from "../data/quests.js";

const FACILITY_COMMANDS = Object.freeze({
  inn: [
    ["stay", "泊まる"], ["talk", "話す"], ["deck", "デッキ編成"],
    ["return", "町に戻る"], ["empty-1", ""], ["empty-2", ""]
  ],
  guild: [
    ["accept", "依頼受注"], ["report", "依頼報告"], ["talk", "話す"],
    ["return", "町へ戻る"], ["empty-1", ""], ["empty-2", ""]
  ],
  temple: [
    ["heal", "治療"], ["donate", "寄付"], ["talk", "話す"],
    ["return", "町へ戻る"], ["empty-1", ""], ["empty-2", ""]
  ],
  shop: [
    ["buy", "購入"], ["sell", "売却"], ["buyback", "買い戻す"],
    ["storage", "倉庫"], ["talk", "話す"], ["return", "町へ戻る"]
  ],
  library: [
    ["monsters", "魔物図鑑"], ["items", "アイテム図鑑"], ["cards", "カード図鑑"],
    ["records", "冒険記録"], ["talk", "話す"], ["return", "町へ戻る"]
  ]
});

const TOWN_TYPEWRITER_DELAYS = Object.freeze({ slow: 75, normal: 42, fast: 20 });
const townTypewriter = {
  enabled: true,
  speed: "normal",
  timer: 0,
  sourceText: "",
  visibleLength: 0,
  lastRenderedText: "",
  active: false,
  observer: null
};

const town = {
  root: null,
  background: null,
  mosaic: null,
  portrait: null,
  portraitPlaceholder: null,
  messageEl: null,
  commandRoot: null,
  gameCommandButtons: [],
  facilityButtons: [],
  entranceButtons: [],
  facilityCommandButtons: [],
  portraitPreloads: [],
  backgroundPreloads: [],
  registration: null,
  nameInput: null,
  jobSelect: null,
  feedback: null,
  registrationIndex: -1,
  questIndex: 0,
  entranceIndex: 0,
  facilityCommandIndex: 0,
  transferUnlocked: false,
  selectedIndex: 1,
  active: false,
  transitioning: false,
  mode: "arrival",
  registrationRequired: false,
  getCharacter: () => null,
  onRegister: () => {},
  onEnterDungeon: () => {},
  onStay: () => {},
  onHeal: () => {},
  onEditDeck: () => {},
  onTalk: () => "",
  onAcceptRequest: () => "",
  onAbandonRequest: () => null,
  onReportRequest: () => null,
  onStateChanged: () => {},
  isMenuOpen: () => false,
  playSe: () => {}
};

export function configureTown(options) {
  Object.assign(town, options);
  town.background = town.root.querySelector("#townBackground");
  town.mosaic = town.root.querySelector("#townMosaic");
  town.portrait = town.root.querySelector("#townPortrait");
  town.portraitPlaceholder = town.root.querySelector("#townPortraitPlaceholder");
  town.messageEl = options.messageEl;
  configureTownMessageObserver();
  town.commandRoot = options.commandRoot;
  town.gameCommandButtons = [...town.commandRoot.children];
  town.registration = document.querySelector("#guildRegistration");
  town.nameInput = document.querySelector("#characterName");
  town.jobSelect = document.querySelector("#characterJob");
  town.feedback = document.querySelector("#registrationFeedback");
  town.registrationClassOverlay = document.querySelector("#registrationClassOverlay");
  town.guildQuestOverlay = document.querySelector("#guildQuestOverlay");
  town.guildQuestTitle = document.querySelector("#guildQuestTitle");
  town.guildQuestList = document.querySelector("#guildQuestList");
  town.guildQuestDetail = document.querySelector("#guildQuestDetail");
  town.portraitPreloads = TOWN_FACILITIES
    .filter(facility => facility.image)
    .map(facility => {
      const image = new Image();
      image.decoding = "async";
      image.src = facility.image;
      image.decode().catch(() => {});
      return image;
    });
  town.backgroundPreloads = [
    "images/background/town_01.avif",
    ...TOWN_FACILITIES.map(facility => facility.background).filter(Boolean),
    "images/background/circle.avif"
    ,"images/background/guild_quest.avif"
  ].map(src => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    image.decode().catch(() => {});
    return image;
  });

  updateRegistrationLanguage();
  town.jobSelect.replaceChildren(...CHARACTER_JOBS.map(job => {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = localizedJobLabel(job);
    return option;
  }));
  town.jobSelect.addEventListener("change", updateRegistrationJobDescription);
  town.jobSelect.addEventListener("input", updateRegistrationJobDescription);
  updateRegistrationLanguage();
  town.facilityButtons = TOWN_FACILITIES.map(facility => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.facility = facility.id;
    button.textContent = facility.label;
    button.addEventListener("click", () => {
      town.playSe(facility.unavailable ? "cursorMove" : "confirm");
      selectFacility(facility.id, true);
    });
    return button;
  });
  town.entranceButtons = [
    { id: "enter", label: "中に入る" },
    { id: "circle", label: "？？？" },
    { id: "return", label: "町に戻る" },
    { id: "empty-1", label: "", empty: true },
    { id: "empty-2", label: "", empty: true },
    { id: "empty-3", label: "", empty: true }
  ].map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.entranceCommand = item.id;
    button.textContent = item.label;
    button.disabled = Boolean(item.empty);
    button.classList.toggle("is-empty", Boolean(item.empty));
    if (!item.empty) {
      button.addEventListener("click", () => {
        town.playSe("confirm");
        town.entranceIndex = index;
        activateEntranceCommand(item.id);
      });
    }
    return button;
  });
  town.facilityCommandButtons = Array.from({ length: 6 }, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", () => {
      if (button.classList.contains("is-empty")) return;
      town.facilityCommandIndex = index;
      renderFacilityCommandSelection();
      const command = button.dataset.facilityCommand;
      if (command === "return") {
        town.playSe("confirm");
        showTownArrival();
      } else if (activateFacilityService(command)) {
        town.playSe(command === "stay" ? "heal" : "confirm");
      } else {
        town.playSe("cursorMove");
      }
    });
    return button;
  });
  town.registration.addEventListener("submit", event => {
    event.preventDefault();
    registerCharacter();
  });
  town.registration.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    const submitButton = town.registration.querySelector('button[type="submit"]');
    if (event.target === town.nameInput) {
      event.preventDefault();
      if (validateRegistrationName()) focusRegistrationControl(1);
    } else if (event.target === town.jobSelect) {
      event.preventDefault();
      focusRegistrationControl(2);
    } else if (event.target !== submitButton) {
      event.preventDefault();
    }
  });
  [town.nameInput, town.jobSelect, town.registration.querySelector('button[type="submit"]')]
    .forEach((control, index) => control.addEventListener("focus", () => {
      town.registrationIndex = index;
    }));
  renderCharacterStatus();
}

export function setTownTypewriterOptions({ enabled, speed } = {}) {
  if (typeof enabled === "boolean") townTypewriter.enabled = enabled;
  if (speed in TOWN_TYPEWRITER_DELAYS) townTypewriter.speed = speed;
  if (!townTypewriter.enabled && townTypewriter.active) completeTownTypewriter();
}

export function openTown({ registrationRequired = false, facilityId = null, mode = null } = {}) {
  town.active = true;
  town.registrationRequired = Boolean(registrationRequired);
  const requested = getTownFacility(facilityId);
  const availableRequested = requested && !requested.unavailable ? requested : null;
  const initialId = town.registrationRequired
    ? "guild"
    : mode === "arrival"
      ? "inn"
      : availableRequested?.id || "inn";
  town.selectedIndex = Math.max(0, TOWN_FACILITIES.findIndex(facility => facility.id === initialId));
  const opensInsideFacility = mode === "facility" || mode === "facilityMenu";
  town.mode = town.registrationRequired
    ? "registration"
    : opensInsideFacility
      ? "facilityMenu"
      : "selection";
  document.body.classList.add("town-active");
  town.root.hidden = false;
  renderTownView();
}

export function closeTown() {
  town.active = false;
  clearTownTypewriter();
  town.root.hidden = true;
  town.registration.hidden = true;
  showGameCommands();
  document.body.classList.remove("town-active");
}

export function isTownOpen() {
  return town.active;
}

export function setTransferUnlocked(unlocked) {
  town.transferUnlocked = Boolean(unlocked);
  updateEntranceLabels();
  if (town.active && town.mode === "transferCircle") renderTransferCircle();
}

export function getTownState() {
  return {
    facilityId: TOWN_FACILITIES[town.selectedIndex]?.id || "guild",
    registrationRequired: town.registrationRequired,
    mode: town.mode
  };
}

export function handleTownInput(action) {
  if (!town.active) return false;
  if (town.transitioning) return true;
  if (town.isMenuOpen()) return false;
  if (townTypewriter.active && action === "confirm") {
    completeTownTypewriter();
    return true;
  }
  if (town.mode.startsWith("quest")) return handleQuestInput(action);
  if (town.mode === "registration") return handleRegistrationInput(action);
  if (town.mode === "dungeonEntrance") return handleEntranceInput(action);
  if (town.mode === "facilityMenu" || town.mode === "facility") return handleFacilityMenuInput(action);
  if (town.mode === "transferCircle") {
    if (action === "cancel") {
      town.playSe("cancel");
      town.mode = "dungeonEntrance";
      renderDungeonEntrance();
    }
    return true;
  }
  if (document.activeElement === town.nameInput || document.activeElement === town.jobSelect) return false;
  if (town.mode === "arrival") {
    if (action === "confirm") {
      beginFacilitySelection();
      return true;
    }
    if (action === "cancel") {
      showGameCommands();
      return false;
    }
    return true;
  }
  if (town.mode !== "selection") return action === "cancel" ? false : true;
  if (["up", "down", "left", "right"].includes(action)) {
    town.playSe("cursorMove");
    moveSelection(action);
    return true;
  }
  if (action === "confirm") {
    town.playSe(TOWN_FACILITIES[town.selectedIndex]?.unavailable ? "cursorMove" : "confirm");
    activateFacility(TOWN_FACILITIES[town.selectedIndex]);
    return true;
  }
  if (action === "cancel") {
    showGameCommands();
    return false;
  }
  return false;
}

function handleFacilityMenuInput(action) {
  if (action === "cancel") {
    showGameCommands();
    return false;
  }
  if (["up", "down", "left", "right"].includes(action)) {
    town.playSe("cursorMove");
    moveFacilityCommandSelection(action);
    return true;
  }
  if (action === "confirm") {
    const command = town.facilityCommandButtons[town.facilityCommandIndex]?.dataset.facilityCommand;
    if (command === "return") {
      town.playSe("confirm");
      showTownArrival();
    } else if (activateFacilityService(command)) {
      town.playSe(command === "stay" ? "heal" : "confirm");
    }
    return true;
  }
  return true;
}

function configureTownMessageObserver() {
  townTypewriter.observer?.disconnect();
  townTypewriter.observer = new MutationObserver(() => {
    const text = town.messageEl?.textContent || "";
    if (text === townTypewriter.lastRenderedText) return;
    clearTownTypewriter();
    if (!town.active || !townTypewriter.enabled || !isNpcTownMessage(text)) {
      townTypewriter.lastRenderedText = text;
      return;
    }
    townTypewriter.sourceText = text;
    townTypewriter.visibleLength = 0;
    townTypewriter.active = true;
    renderTownTypewriter();
  });
  townTypewriter.observer.observe(town.messageEl, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function isNpcTownMessage(text) {
  return /^[^\n：]{1,20}：/.test(String(text || ""));
}

function renderTownTypewriter() {
  const characters = Array.from(townTypewriter.sourceText);
  townTypewriter.visibleLength = Math.min(townTypewriter.visibleLength + 1, characters.length);
  townTypewriter.lastRenderedText = characters.slice(0, townTypewriter.visibleLength).join("");
  town.messageEl.textContent = townTypewriter.lastRenderedText;
  if (townTypewriter.visibleLength >= characters.length) {
    townTypewriter.active = false;
    townTypewriter.timer = 0;
    return;
  }
  townTypewriter.timer = window.setTimeout(
    renderTownTypewriter,
    TOWN_TYPEWRITER_DELAYS[townTypewriter.speed]
  );
}

function completeTownTypewriter() {
  if (!townTypewriter.active) return;
  if (townTypewriter.timer) window.clearTimeout(townTypewriter.timer);
  townTypewriter.timer = 0;
  townTypewriter.visibleLength = Array.from(townTypewriter.sourceText).length;
  townTypewriter.lastRenderedText = townTypewriter.sourceText;
  townTypewriter.active = false;
  town.messageEl.textContent = townTypewriter.sourceText;
}

function clearTownTypewriter() {
  if (townTypewriter.timer) window.clearTimeout(townTypewriter.timer);
  townTypewriter.timer = 0;
  townTypewriter.active = false;
}

function handleQuestInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    if (
      town.mode === "questAcceptDetail"
      || town.mode === "questAbandonConfirm"
      || town.mode === "questReportConfirm"
    ) {
      const cancelledReport = town.mode === "questReportConfirm";
      openGuildQuestList(town.mode === "questAcceptDetail" ? "accept" : "report");
      if (cancelledReport) {
        town.messageEl.textContent = "ギルド長：なんだ、報告しないのか？";
      }
    } else {
      town.mode = "facilityMenu";
      renderFacility();
    }
    return true;
  }
  if (town.mode === "questAcceptDetail") {
    if (action !== "confirm") return true;
    const quest = QUESTS[town.questIndex];
    const result = town.onAcceptRequest(quest?.id);
    if (result?.accepted) {
      town.playSe("confirm");
      town.messageEl.textContent = "ギルド長：よし。頼んだぞ。";
      town.mode = "facilityMenu";
      renderFacility();
      town.messageEl.textContent = "ギルド長：よし。頼んだぞ。";
    } else {
      town.playSe("cursorMove");
      town.messageEl.textContent = questFailureMessage(result?.reason);
    }
    town.onStateChanged();
    return true;
  }
  if (town.mode === "questReportConfirm") {
    if (action !== "confirm") return true;
    const quest = QUESTS[town.questIndex];
    const result = town.onReportRequest(quest?.id);
    town.playSe(result?.accepted ? "confirm" : "cursorMove");
    if (result?.accepted) {
      town.mode = "facilityMenu";
      renderFacility();
      town.messageEl.textContent = "ギルド長：依頼達成、よくやってくれた！また頼むぜ。";
    } else {
      openGuildQuestList("report");
      town.messageEl.textContent = "ギルド長：まだ達成条件を満たしていないようだな。";
    }
    town.onStateChanged();
    return true;
  }
  if (town.mode === "questAbandonConfirm") {
    if (action !== "confirm") return true;
    const quest = QUESTS[town.questIndex];
    const result = town.onAbandonRequest(quest?.id);
    town.playSe(result?.accepted ? "confirm" : "cursorMove");
    openGuildQuestList("report");
    town.messageEl.textContent = result?.accepted
      ? "ギルド長：分かった。依頼は取り下げておく。"
      : "ギルド長：その依頼は受注していないぞ。";
    town.onStateChanged();
    return true;
  }
  if (["up", "down"].includes(action)) {
    town.playSe("cursorMove");
    town.questIndex = (
      town.questIndex + (action === "down" ? 1 : QUESTS.length - 1)
    ) % QUESTS.length;
    renderGuildQuestList();
    return true;
  }
  if (action !== "confirm") return true;
  activateSelectedQuest();
  return true;
}

function handleRegistrationInput(action) {
  if (action === "cancel") {
    showGameCommands();
    return false;
  }

  const submitButton = town.registration.querySelector('button[type="submit"]');
  const controls = [town.nameInput, town.jobSelect, submitButton];
  if (["up", "down"].includes(action)) {
    town.playSe("cursorMove");
    const activeIndex = controls.indexOf(document.activeElement);
    town.registrationIndex = activeIndex >= 0 ? activeIndex : town.registrationIndex;
    if (town.registrationIndex < 0) {
      town.registrationIndex = action === "down" ? 0 : controls.length - 1;
    } else {
      town.registrationIndex = (
        town.registrationIndex
        + (action === "down" ? 1 : controls.length - 1)
      ) % controls.length;
    }
    controls[town.registrationIndex].focus({ preventScroll: true });
    return true;
  }

  if (["left", "right"].includes(action) && document.activeElement === town.jobSelect) {
    town.playSe("cursorMove");
    const amount = action === "right" ? 1 : -1;
    const optionCount = town.jobSelect.options.length;
    town.jobSelect.selectedIndex = (
      town.jobSelect.selectedIndex + amount + optionCount
    ) % optionCount;
    updateRegistrationJobDescription();
    return true;
  }

  if (action === "confirm") {
    town.playSe("confirm");
    const activeIndex = controls.indexOf(document.activeElement);
    town.registrationIndex = activeIndex >= 0 ? activeIndex : town.registrationIndex;
    if (town.registrationIndex < 0) {
      focusRegistrationControl(0);
      return true;
    }
    const control = controls[town.registrationIndex];
    if (control === town.nameInput) {
      if (validateRegistrationName()) focusRegistrationControl(1);
    } else if (control === town.jobSelect) {
      focusRegistrationControl(2);
    } else if (control === submitButton) {
      town.registration.requestSubmit();
    }
    return true;
  }
  return true;
}

function handleEntranceInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    showTownArrival();
    return true;
  }
  if (action === "left" || action === "right") {
    town.playSe("cursorMove");
    town.entranceIndex = (
      town.entranceIndex + (action === "right" ? 1 : 2)
    ) % 3;
    renderEntranceSelection();
    return true;
  }
  if (action === "confirm") {
    town.playSe("confirm");
    activateEntranceCommand(town.entranceButtons[town.entranceIndex]?.dataset.entranceCommand);
    return true;
  }
  return true;
}

function activateEntranceCommand(command) {
  if (command === "enter") {
    if (town.transitioning) return;
    town.transitioning = true;
    Promise.resolve(town.onEnterDungeon()).finally(() => {
      town.transitioning = false;
    });
    return;
  }
  if (command === "circle") {
    town.mode = "transferCircle";
    renderTransferCircle();
    return;
  }
  if (command === "return") showTownArrival();
}

function moveSelection(direction) {
  if (town.registrationRequired) {
    town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "guild");
  } else {
    const columns = 3;
    const rows = Math.ceil(TOWN_FACILITIES.length / columns);
    const startIndex = town.selectedIndex;
    let row = Math.floor(startIndex / columns);
    let column = startIndex % columns;
    const attempts = direction === "left" || direction === "right" ? columns - 1 : rows - 1;

    for (let count = 0; count < attempts; count += 1) {
      if (direction === "left") column = (column - 1 + columns) % columns;
      if (direction === "right") column = (column + 1) % columns;
      if (direction === "up") row = (row - 1 + rows) % rows;
      if (direction === "down") row = (row + 1) % rows;

      const candidateIndex = row * columns + column;
      const candidate = TOWN_FACILITIES[candidateIndex];
      if (candidate) {
        town.selectedIndex = candidateIndex;
        break;
      }
    }
  }
  renderTownView();
}

function moveFacilityCommandSelection(direction) {
  const validIndices = town.facilityCommandButtons
    .map((button, index) => button.classList.contains("is-empty") ? -1 : index)
    .filter(index => index >= 0);
  town.facilityCommandIndex = moveGridIndex(
    town.facilityCommandIndex,
    direction,
    validIndices
  );
  renderFacilityCommandSelection();
}

function moveGridIndex(startIndex, direction, validIndices) {
  const columns = 3;
  const rows = 2;
  let row = Math.floor(startIndex / columns);
  let column = startIndex % columns;
  const attempts = direction === "left" || direction === "right" ? columns - 1 : rows - 1;
  for (let count = 0; count < attempts; count += 1) {
    if (direction === "left") column = (column - 1 + columns) % columns;
    if (direction === "right") column = (column + 1) % columns;
    if (direction === "up") row = (row - 1 + rows) % rows;
    if (direction === "down") row = (row + 1) % rows;
    const candidate = row * columns + column;
    if (validIndices.includes(candidate)) return candidate;
  }
  return startIndex;
}

function selectFacility(id, activate) {
  const index = TOWN_FACILITIES.findIndex(facility => facility.id === id);
  if (index < 0 || town.mode === "arrival") return;
  if (TOWN_FACILITIES[index].unavailable) {
    town.selectedIndex = index;
    renderTownView();
    return;
  }
  if (town.registrationRequired && id !== "guild") {
    showRegistrationRequired();
    return;
  }
  town.selectedIndex = index;
  if (activate) activateFacility(TOWN_FACILITIES[index]);
  else renderTownView();
}

function activateFacility(facility) {
  if (!facility || facility.unavailable) return;
  if (town.registrationRequired && facility.id !== "guild") {
    showRegistrationRequired();
    return;
  }
  if (facility.id === "dungeon") {
    town.mode = "dungeonEntrance";
    town.entranceIndex = 0;
    renderDungeonEntrance();
    return;
  }
  town.mode = facility.id === "guild" && town.registrationRequired ? "registration" : "facilityMenu";
  town.facilityCommandIndex = 0;
  renderFacility();
}

function beginFacilitySelection() {
  town.mode = "selection";
  town.selectedIndex = nearestSelectableIndex(town.selectedIndex, 1);
  renderTownView();
}

export function showTownArrival() {
  if (!town.active || town.registrationRequired) return false;
  town.mode = "selection";
  town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "inn");
  renderTownView();
  return true;
}

function nearestSelectableIndex(start, amount) {
  let index = start;
  for (let count = 0; count < TOWN_FACILITIES.length; count += 1) {
    if (!TOWN_FACILITIES[index]?.unavailable) return index;
    index = (index + amount + TOWN_FACILITIES.length) % TOWN_FACILITIES.length;
  }
  return 0;
}

function renderTownView() {
  showTownCommands();
  if (town.mode === "arrival" || town.mode === "selection") {
    const selecting = town.mode === "selection";
    town.mosaic.hidden = true;
    town.background.src = "images/background/town_01.avif";
    town.background.alt = "町の風景";
    town.background.hidden = false;
    town.portrait.hidden = true;
    town.portraitPlaceholder.hidden = true;
    town.root.querySelector("#townFacilityName").hidden = true;
    town.messageEl.textContent = selecting
      ? "町に戻ってきた。どこへ行きますか？"
      : "町に戻ってきた。どこへ行きますか？\n＊Aボタンで次へ";
    town.registration.hidden = true;
    town.root.classList.remove("is-registering");
    town.facilityButtons.forEach((button, index) => {
      const unavailable = Boolean(TOWN_FACILITIES[index].unavailable);
      button.disabled = false;
      button.setAttribute("aria-disabled", String(!selecting || unavailable));
      button.classList.toggle("is-selected", selecting && index === town.selectedIndex);
      button.classList.toggle("is-unavailable", unavailable);
      button.classList.remove("is-locked");
    });
    resetTownViewport();
    town.onStateChanged();
    return;
  }
  town.background.hidden = true;
  town.root.querySelector("#townFacilityName").hidden = false;
  renderFacility();
}

function renderFacility() {
  const facility = TOWN_FACILITIES[town.selectedIndex] || getTownFacility("guild");
  town.mosaic.hidden = true;
  town.guildQuestOverlay.hidden = true;
  town.facilityButtons.forEach((button, index) => {
    const unavailable = Boolean(TOWN_FACILITIES[index].unavailable);
    button.disabled = false;
    button.setAttribute("aria-disabled", String(unavailable));
    button.classList.toggle("is-selected", index === town.selectedIndex);
    button.classList.toggle("is-locked", town.registrationRequired && button.dataset.facility !== "guild");
    button.classList.toggle("is-unavailable", unavailable);
  });
  town.background.src = facility.background || "images/background/town_01.avif";
  town.background.alt = `${facility.label}の背景`;
  town.background.hidden = false;
  town.messageEl.textContent = facility.keeper ? `${facility.keeper}：${facility.greeting}` : facility.greeting;
  town.portrait.hidden = !facility.image;
  town.portraitPlaceholder.hidden = Boolean(facility.image);
  if (facility.image) {
    town.portrait.src = facility.image;
    town.portrait.alt = facility.portraitAlt || facility.keeper;
  } else {
    town.portrait.removeAttribute("src");
    town.portrait.alt = "";
  }
  const showRegistration = facility.id === "guild" && town.registrationRequired;
  if (showRegistration) {
    town.mode = "registration";
    town.registrationIndex = 0;
    updateRegistrationLanguage();
    showTownCommands();
  } else {
    showFacilityCommands(facility.id);
  }
  town.root.classList.toggle("is-registering", showRegistration);
  updateRegistrationJobDescription();
  town.registration.hidden = !showRegistration;
  town.feedback.textContent = "";
  if (showRegistration) town.messageEl.textContent = "ギルド長：奈落へ潜るなら、まず名簿に名前を書け。登録なしでは通せん。";
  town.root.querySelector("#townFacilityName").textContent = facility.label;
  resetTownViewport();
  if (showRegistration) {
    requestAnimationFrame(() => {
      if (town.active && town.mode === "registration") focusRegistrationControl(0);
    });
  }
  town.onStateChanged();
}

function renderDungeonEntrance() {
  showEntranceCommands();
  updateEntranceLabels();
  town.mosaic.hidden = true;
  town.background.src = "images/background/dungeon_01.avif";
  town.background.alt = "ダンジョン入口";
  town.background.hidden = false;
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.classList.remove("is-registering");
  town.root.querySelector("#townFacilityName").hidden = true;
  town.messageEl.textContent = "奈落へ続く階段が、静かに口を開けている。";
  renderEntranceSelection();
  resetTownViewport();
  town.onStateChanged();
}

function renderTransferCircle() {
  showEntranceCommands();
  updateEntranceLabels();
  if (town.transferUnlocked) {
    town.mosaic.hidden = true;
    town.background.src = "images/background/circle.avif";
    town.background.alt = "転送陣";
    town.background.hidden = false;
  } else {
    renderMosaicBackground("images/background/circle.avif");
  }
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.querySelector("#townFacilityName").hidden = true;
  town.messageEl.textContent = town.transferUnlocked
    ? "転送陣が淡い光を放っている。"
    : "まだ入ることは出来ない。";
  renderEntranceSelection();
  resetTownViewport();
  town.onStateChanged();
}

function renderEntranceSelection() {
  town.entranceButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.entranceIndex && index < 3);
  });
}

function showFacilityCommands(facilityId) {
  const commands = FACILITY_COMMANDS[facilityId] || FACILITY_COMMANDS.inn;
  const requestUnlocked = Boolean(town.getCharacter()?.eventFlags?.guild_first_request_unlocked);
  const reportAvailable = facilityId === "guild" && hasActiveQuest(town.getCharacter());
  town.facilityCommandButtons.forEach((button, index) => {
    const [id, label] = commands[index];
    const empty = !label;
    const available = id === "return"
      || id === "stay"
      || id === "heal"
      || id === "deck"
      || (facilityId === "guild" && id === "accept" && requestUnlocked)
      || (facilityId === "guild" && id === "report" && reportAvailable)
      || (id === "talk" && ["guild", "inn", "temple", "shop", "library"].includes(facilityId));
    button.dataset.facilityCommand = id;
    button.textContent = label;
    button.disabled = empty;
    button.classList.toggle("is-empty", empty);
    button.classList.toggle("is-unavailable", !empty && !available);
    button.setAttribute("aria-disabled", String(!empty && !available));
  });
  if (!town.facilityCommandButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.facilityCommandButtons);
  }
  town.commandRoot.dataset.townActive = "true";
  town.commandRoot.dataset.facilityActive = "true";
  delete town.commandRoot.dataset.entranceActive;
  town.commandRoot.setAttribute("aria-label", "施設コマンド");
  renderFacilityCommandSelection();
}

function activateFacilityService(command) {
  if (command === "stay") {
    town.onStay();
    town.onStateChanged();
    return true;
  }
  if (command === "heal") {
    town.onHeal();
    town.onStateChanged();
    return true;
  }
  if (command === "deck") {
    town.onEditDeck();
    return true;
  }
  if (command === "talk") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (!["guild", "inn", "temple", "shop", "library"].includes(facility?.id)) return false;
    const result = town.onTalk(facility?.id);
    const message = typeof result === "string" ? result : result?.message;
    if (message) town.messageEl.textContent = message;
    if (result?.focusCommand) {
      showFacilityCommands(facility.id);
      const index = town.facilityCommandButtons.findIndex(
        button => button.dataset.facilityCommand === result.focusCommand
      );
      if (index >= 0) {
        town.facilityCommandIndex = index;
        renderFacilityCommandSelection();
      }
    }
    town.onStateChanged();
    return true;
  }
  if (command === "accept") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "guild" || !town.getCharacter()?.eventFlags?.guild_first_request_unlocked) return false;
    openGuildQuestList("accept");
    return true;
  }
  if (command === "report") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "guild" || !hasActiveQuest(town.getCharacter())) return false;
    openGuildQuestList("report");
    return true;
  }
  return false;
}

function openGuildQuestList(kind) {
  town.mode = kind === "report" ? "questReportList" : "questAcceptList";
  town.questIndex = 0;
  town.mosaic.hidden = true;
  town.background.src = "images/background/guild_quest.avif";
  town.background.alt = kind === "report" ? "依頼報告の掲示板" : "依頼受注の掲示板";
  town.background.hidden = false;
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.classList.remove("is-registering");
  town.root.querySelector("#townFacilityName").hidden = true;
  town.guildQuestOverlay.hidden = false;
  town.guildQuestTitle.textContent = kind === "report" ? "依頼報告" : "依頼受注";
  town.guildQuestDetail.hidden = true;
  town.guildQuestList.hidden = false;
  town.messageEl.textContent = kind === "report"
    ? "ギルド長：達成した依頼があるのか？報告してくれ。"
    : "ギルド長：受ける依頼を選んでくれ。";
  renderGuildQuestList();
  resetTownViewport();
}

function renderGuildQuestList() {
  const reportMode = town.mode === "questReportList";
  town.guildQuestList.replaceChildren(...QUESTS.map((quest, index) => {
    const progress = getQuestProgress(town.getCharacter(), quest.id);
    const selectable = reportMode ? progress.active : quest.available && !progress.active && !progress.completed;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guild-quest-entry";
    button.classList.toggle("is-selected", index === town.questIndex);
    button.classList.toggle("is-unavailable", !selectable);
    button.classList.toggle(
      "is-incomplete",
      reportMode && progress.active && !progress.readyToReport
    );
    button.setAttribute("aria-disabled", String(!selectable));
    if (reportMode && progress.readyToReport) {
      const star = document.createElement("span");
      star.className = "quest-star";
      star.textContent = "★";
      button.append(star);
    }
    button.append(`${quest.number}:${quest.title}`);
    if (reportMode && progress.active) {
      button.append(`　${progress.progress}/${quest.requiredCount}`);
    }
    button.addEventListener("click", () => {
      if (town.questIndex !== index) {
        town.questIndex = index;
        town.playSe("cursorMove");
        renderGuildQuestList();
        return;
      }
      activateSelectedQuest();
    });
    return button;
  }));
}

function activateSelectedQuest() {
  const quest = QUESTS[town.questIndex];
  const progress = getQuestProgress(town.getCharacter(), quest?.id);
  if (town.mode === "questAcceptList") {
    if (!quest?.available || progress.active || progress.completed) {
      town.playSe("cursorMove");
      return;
    }
    town.playSe("confirm");
    town.mode = "questAcceptDetail";
    renderQuestDetail(quest, progress);
    town.messageEl.textContent = "ギルド長：この依頼でいいか？\n＊Aボタン：はい　Bボタン：いいえ";
    return;
  }
  if (town.mode !== "questReportList" || !progress.active) {
    town.playSe("cursorMove");
    return;
  }
  if (progress.readyToReport) {
    town.playSe("confirm");
    town.mode = "questReportConfirm";
    renderQuestDetail(quest, progress);
    town.messageEl.textContent = "ギルド長：この依頼を報告するのか？\n＊Aボタン：はい　Bボタン：いいえ";
    return;
  }
  town.playSe("confirm");
  town.mode = "questAbandonConfirm";
  town.messageEl.textContent = "ギルド長：なんだ？依頼を破棄するのか？\n＊A：はい　B：いいえ";
}

function renderQuestDetail(quest, progress) {
  town.guildQuestTitle.textContent = `${quest.number}:${quest.title}`;
  town.guildQuestList.hidden = true;
  town.guildQuestDetail.hidden = false;
  town.guildQuestDetail.replaceChildren(
    detailBlock("依頼人", quest.client),
    divider(),
    detailBlock("討伐数", `${quest.targetName}を${quest.requiredCount}匹退治する。`),
    divider(),
    detailBlock("報酬", quest.reward.label),
    divider(),
    detailBlock("内容", quest.description.join("\n"))
  );
  if (progress.active) {
    const current = document.createElement("p");
    current.className = "guild-quest-progress";
    current.textContent = `現在 ${progress.progress}/${quest.requiredCount}`;
    town.guildQuestDetail.append(current);
  }
}

function detailBlock(label, value) {
  const container = document.createElement("p");
  const heading = document.createElement("strong");
  heading.textContent = label;
  container.append(heading, document.createElement("br"));
  const lines = String(value || "").split("\n");
  lines.forEach((line, index) => {
    if (index > 0) container.append(document.createElement("br"));
    container.append(line);
  });
  return container;
}

function divider() {
  const element = document.createElement("div");
  element.className = "guild-quest-divider";
  const ornament = document.createElement("span");
  ornament.textContent = "◆";
  element.append(ornament);
  return element;
}

function questFailureMessage(reason) {
  if (reason === "activeLimit") return "ギルド長：同時に受けられる依頼は3件までだ。";
  if (reason === "alreadyAccepted") return "ギルド長：その依頼はもう受注しているぞ。";
  if (reason === "completed") return "ギルド長：その依頼はもう完了している。";
  return "ギルド長：今はその依頼を受けられない。";
}

function renderFacilityCommandSelection() {
  town.facilityCommandButtons.forEach((button, index) => {
    button.classList.toggle(
      "is-selected",
      index === town.facilityCommandIndex && !button.classList.contains("is-empty")
    );
  });
}

function updateEntranceLabels() {
  const transferButton = town.entranceButtons.find(button => button.dataset.entranceCommand === "circle");
  if (transferButton) transferButton.textContent = town.transferUnlocked ? "転送陣" : "？？？";
}

function renderMosaicBackground(src) {
  const source = town.backgroundPreloads.find(image => image.src.endsWith(src));
  town.background.hidden = true;
  town.mosaic.hidden = false;
  const draw = () => {
    if (town.mode !== "transferCircle" || town.transferUnlocked) return;
    const context = town.mosaic.getContext("2d");
    context.clearRect(0, 0, town.mosaic.width, town.mosaic.height);
    context.imageSmoothingEnabled = true;
    context.drawImage(source, 0, 0, town.mosaic.width, town.mosaic.height);
    town.background.hidden = true;
    town.mosaic.hidden = false;
  };
  if (source?.complete && source.naturalWidth > 0) draw();
  else if (source) source.addEventListener("load", draw, { once: true });
}

function resetTownViewport() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function registerCharacter() {
  const name = town.nameInput.value.trim().slice(0, 12);
  if (!validateRegistrationName()) return;
  const job = CHARACTER_JOBS.find(item => item.id === town.jobSelect.value) || CHARACTER_JOBS[0];
  town.registrationRequired = false;
  town.mode = "facilityMenu";
  town.facilityCommandIndex = 0;
  const registrationResult = town.onRegister({ name, job: job.id, jobLabel: job.labelEn });
  town.registration.hidden = true;
  renderCharacterStatus();
  town.facilityButtons.forEach(button => button.classList.remove("is-locked"));
  renderFacility();
  town.messageEl.textContent = registrationResult?.message
    || `ギルド長：${name}だな。登録は済んだ。ようこそ、冒険者ギルドへ。`;
  town.feedback.textContent = "登録しました。";
  town.onStateChanged();
}

function validateRegistrationName() {
  if (town.nameInput.value.trim()) {
    town.feedback.textContent = "";
    return true;
  }
  town.feedback.textContent = isJapaneseUi() ? "名前を入力してください。" : "Enter a name.";
  focusRegistrationControl(0);
  return false;
}

function focusRegistrationControl(index) {
  const controls = [
    town.nameInput,
    town.jobSelect,
    town.registration.querySelector('button[type="submit"]')
  ];
  town.registrationIndex = Math.max(0, Math.min(controls.length - 1, index));
  controls[town.registrationIndex]?.focus({ preventScroll: true });
}

function updateRegistrationLanguage() {
  [...town.jobSelect.options].forEach(option => {
    const job = CHARACTER_JOBS.find(item => item.id === option.value);
    if (job) option.textContent = localizedJobLabel(job);
  });
  const submitButton = town.registration.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = isJapaneseUi() ? "登録" : "REGISTER";
}

function updateRegistrationJobDescription() {
  const selectedJob = town.jobSelect?.value || CHARACTER_JOBS[0].id;
  town.registrationClassOverlay?.querySelectorAll("[data-registration-job]").forEach(item => {
    item.classList.toggle("is-selected", item.dataset.registrationJob === selectedJob);
  });
}

function localizedJobLabel(job) {
  return isJapaneseUi() ? job.labelJa : job.labelEn;
}

function isJapaneseUi() {
  return !String(document.documentElement.lang || "ja").toLowerCase().startsWith("en");
}

function showRegistrationRequired() {
  town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "guild");
  renderFacility();
  town.feedback.textContent = "キャラクター登録が必要です。";
}

export function renderCharacterStatus() {
  const character = town.getCharacter();
  const values = {
    quickName: character?.name || "NO_NAME",
    quickLevel: character ? String(character.level).padStart(3, "0") : "---",
    quickJob: character?.jobLabel || "-",
    quickHpCurrent: character ? character.hp : "----",
    quickHpMax: character ? character.maxHp : "----",
    quickSpCurrent: character ? character.sp : "----",
    quickSpMax: character ? character.maxSp : "----",
    quickCondition: character?.condition || "----"
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  });
}

function showTownCommands() {
  if (!town.commandRoot) return;
  if (!town.facilityButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.facilityButtons);
  }
  town.commandRoot.dataset.townActive = "true";
  delete town.commandRoot.dataset.entranceActive;
  delete town.commandRoot.dataset.facilityActive;
  town.commandRoot.setAttribute("aria-label", "町の施設");
}

function showEntranceCommands() {
  if (!town.commandRoot) return;
  if (!town.entranceButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.entranceButtons);
  }
  town.commandRoot.dataset.townActive = "true";
  town.commandRoot.dataset.entranceActive = "true";
  delete town.commandRoot.dataset.facilityActive;
  town.commandRoot.setAttribute("aria-label", "ダンジョン入口");
}

function showGameCommands() {
  if (!town.commandRoot) return;
  if (!town.gameCommandButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.gameCommandButtons);
  }
  delete town.commandRoot.dataset.townActive;
  delete town.commandRoot.dataset.entranceActive;
  delete town.commandRoot.dataset.facilityActive;
  town.commandRoot.setAttribute("aria-label", "ダンジョンコマンド");
}
