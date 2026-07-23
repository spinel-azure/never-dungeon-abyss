import { CHARACTER_JOBS, TOWN_FACILITIES, getTownFacility } from "../data/town.js?v=20260723-3";

const town = {
  root: null,
  background: null,
  portrait: null,
  portraitPlaceholder: null,
  messageEl: null,
  commandRoot: null,
  gameCommandButtons: [],
  facilityButtons: [],
  entranceButtons: [],
  portraitPreloads: [],
  backgroundPreloads: [],
  registration: null,
  nameInput: null,
  jobSelect: null,
  feedback: null,
  registrationIndex: -1,
  entranceIndex: 0,
  selectedIndex: 1,
  active: false,
  mode: "arrival",
  registrationRequired: false,
  getCharacter: () => null,
  onRegister: () => {},
  onEnterDungeon: () => {},
  onStateChanged: () => {},
  isMenuOpen: () => false
};

export function configureTown(options) {
  Object.assign(town, options);
  town.background = town.root.querySelector("#townBackground");
  town.portrait = town.root.querySelector("#townPortrait");
  town.portraitPlaceholder = town.root.querySelector("#townPortraitPlaceholder");
  town.messageEl = options.messageEl;
  town.commandRoot = options.commandRoot;
  town.gameCommandButtons = [...town.commandRoot.children];
  town.registration = document.querySelector("#guildRegistration");
  town.nameInput = document.querySelector("#characterName");
  town.jobSelect = document.querySelector("#characterJob");
  town.feedback = document.querySelector("#registrationFeedback");
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
  ].map(src => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    image.decode().catch(() => {});
    return image;
  });

  town.jobSelect.replaceChildren(...CHARACTER_JOBS.map(job => {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = job.label;
    return option;
  }));
  town.facilityButtons = TOWN_FACILITIES.map(facility => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.facility = facility.id;
    button.textContent = facility.label;
    button.addEventListener("click", () => selectFacility(facility.id, true));
    return button;
  });
  town.entranceButtons = [
    { id: "enter", label: "ダンジョンに入る" },
    { id: "circle", label: "転送陣" },
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
        town.entranceIndex = index;
        activateEntranceCommand(item.id);
      });
    }
    return button;
  });
  town.registration.addEventListener("submit", event => {
    event.preventDefault();
    registerCharacter();
  });
  renderCharacterStatus();
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
  town.mode = town.registrationRequired ? "registration" : mode === "facility" ? "facility" : "selection";
  document.body.classList.add("town-active");
  town.root.hidden = false;
  renderTownView();
}

export function closeTown() {
  town.active = false;
  town.root.hidden = true;
  town.registration.hidden = true;
  showGameCommands();
  document.body.classList.remove("town-active");
}

export function isTownOpen() {
  return town.active;
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
  if (town.isMenuOpen()) return false;
  if (town.mode === "registration") return handleRegistrationInput(action);
  if (town.mode === "dungeonEntrance") return handleEntranceInput(action);
  if (town.mode === "transferCircle") {
    if (action === "cancel") {
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
  if (town.mode === "facility" && action === "cancel") {
    showTownArrival();
    return true;
  }
  if (town.mode !== "selection") return action === "cancel" ? false : true;
  if (["up", "down", "left", "right"].includes(action)) {
    moveSelection(action);
    return true;
  }
  if (action === "confirm") {
    activateFacility(TOWN_FACILITIES[town.selectedIndex]);
    return true;
  }
  if (action === "cancel") {
    showGameCommands();
    return false;
  }
  return false;
}

function handleRegistrationInput(action) {
  if (action === "cancel") {
    showGameCommands();
    return false;
  }

  const submitButton = town.registration.querySelector('button[type="submit"]');
  const controls = [town.nameInput, town.jobSelect, submitButton];
  if (["up", "down"].includes(action)) {
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
    const amount = action === "right" ? 1 : -1;
    const optionCount = town.jobSelect.options.length;
    town.jobSelect.selectedIndex = (
      town.jobSelect.selectedIndex + amount + optionCount
    ) % optionCount;
    return true;
  }

  if (action === "confirm") {
    const activeIndex = controls.indexOf(document.activeElement);
    town.registrationIndex = activeIndex >= 0 ? activeIndex : town.registrationIndex;
    if (town.registrationIndex < 0) town.registrationIndex = 0;
    const control = controls[town.registrationIndex];
    if (control === submitButton) town.registration.requestSubmit();
    else control.focus({ preventScroll: true });
    return true;
  }
  return true;
}

function handleEntranceInput(action) {
  if (action === "cancel") {
    showTownArrival();
    return true;
  }
  if (action === "left" || action === "right") {
    town.entranceIndex = (
      town.entranceIndex + (action === "right" ? 1 : 2)
    ) % 3;
    renderEntranceSelection();
    return true;
  }
  if (action === "confirm") {
    activateEntranceCommand(town.entranceButtons[town.entranceIndex]?.dataset.entranceCommand);
    return true;
  }
  return true;
}

function activateEntranceCommand(command) {
  if (command === "enter") {
    closeTown();
    town.onEnterDungeon();
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
  renderFacility();
  if (activate) activateFacility(TOWN_FACILITIES[index]);
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
  town.mode = facility.id === "guild" && town.registrationRequired ? "registration" : "facility";
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
  showTownCommands();
  const facility = TOWN_FACILITIES[town.selectedIndex] || getTownFacility("guild");
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
    town.portrait.alt = facility.keeper;
  } else {
    town.portrait.removeAttribute("src");
    town.portrait.alt = "";
  }
  const showRegistration = facility.id === "guild" && town.registrationRequired;
  if (showRegistration) {
    town.mode = "registration";
    town.registrationIndex = -1;
  }
  town.root.classList.toggle("is-registering", showRegistration);
  town.registration.hidden = !showRegistration;
  town.feedback.textContent = "";
  if (showRegistration) town.messageEl.textContent = "ギルド長：奈落へ潜るなら、まず名簿に名前を書け。登録なしでは通せん。";
  town.root.querySelector("#townFacilityName").textContent = facility.label;
  resetTownViewport();
  town.onStateChanged();
}

function renderDungeonEntrance() {
  showEntranceCommands();
  town.background.src = "images/background/dungeon_01.avif";
  town.background.alt = "ダンジョン入口";
  town.background.hidden = false;
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.classList.remove("is-registering");
  town.root.querySelector("#townFacilityName").hidden = false;
  town.root.querySelector("#townFacilityName").textContent = "ダンジョン";
  town.messageEl.textContent = "奈落へ続く階段が、静かに口を開けている。";
  renderEntranceSelection();
  resetTownViewport();
  town.onStateChanged();
}

function renderTransferCircle() {
  showEntranceCommands();
  town.background.src = "images/background/circle.avif";
  town.background.alt = "転送陣";
  town.background.hidden = false;
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.querySelector("#townFacilityName").hidden = false;
  town.root.querySelector("#townFacilityName").textContent = "転送陣";
  town.messageEl.textContent = "転送陣はまだ力を失っている。";
  renderEntranceSelection();
  resetTownViewport();
  town.onStateChanged();
}

function renderEntranceSelection() {
  town.entranceButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.entranceIndex && index < 3);
  });
}

function resetTownViewport() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function registerCharacter() {
  const name = town.nameInput.value.trim().slice(0, 12);
  if (!name) {
    town.feedback.textContent = "名前を入力してください。";
    town.nameInput.focus();
    return;
  }
  const job = CHARACTER_JOBS.find(item => item.id === town.jobSelect.value) || CHARACTER_JOBS[0];
  town.registrationRequired = false;
  town.mode = "facility";
  town.onRegister({ name, job: job.id, jobLabel: job.label });
  town.registration.hidden = true;
  town.messageEl.textContent = `ギルド長：${name}だな。登録は済んだ。ようこそ、冒険者ギルドへ。`;
  town.feedback.textContent = "登録しました。";
  renderCharacterStatus();
  town.facilityButtons.forEach(button => button.classList.remove("is-locked"));
  town.onStateChanged();
}

function showRegistrationRequired() {
  town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "guild");
  renderFacility();
  town.feedback.textContent = "キャラクター登録が必要です。";
}

export function renderCharacterStatus() {
  const character = town.getCharacter();
  const values = {
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
  town.commandRoot.setAttribute("aria-label", "町の施設");
}

function showEntranceCommands() {
  if (!town.commandRoot) return;
  if (!town.entranceButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.entranceButtons);
  }
  town.commandRoot.dataset.townActive = "true";
  town.commandRoot.dataset.entranceActive = "true";
  town.commandRoot.setAttribute("aria-label", "ダンジョン入口");
}

function showGameCommands() {
  if (!town.commandRoot) return;
  if (!town.gameCommandButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.gameCommandButtons);
  }
  delete town.commandRoot.dataset.townActive;
  delete town.commandRoot.dataset.entranceActive;
  town.commandRoot.setAttribute("aria-label", "ダンジョンコマンド");
}
