import { CHARACTER_JOBS, TOWN_FACILITIES, getTownFacility } from "../data/town.js?v=20260722-1";

const town = {
  root: null,
  background: null,
  portrait: null,
  portraitPlaceholder: null,
  messageEl: null,
  commandRoot: null,
  gameCommandButtons: [],
  facilityButtons: [],
  registration: null,
  nameInput: null,
  jobSelect: null,
  feedback: null,
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
  const initialId = town.registrationRequired ? "guild" : availableRequested?.id || "guild";
  town.selectedIndex = Math.max(0, TOWN_FACILITIES.findIndex(facility => facility.id === initialId));
  town.mode = town.registrationRequired ? "registration" : mode === "facility" ? "facility" : "arrival";
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
  if (town.mode === "registration") {
    if (action === "cancel") {
      showGameCommands();
      return false;
    }
    return true;
  }
  if (town.mode !== "selection") return action === "cancel" ? false : true;
  if (["up", "left"].includes(action)) {
    moveSelection(-1);
    return true;
  }
  if (["down", "right"].includes(action)) {
    moveSelection(1);
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

function moveSelection(amount) {
  if (town.registrationRequired) {
    town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "guild");
  } else {
    town.selectedIndex = nearestSelectableIndex(
      (town.selectedIndex + amount + TOWN_FACILITIES.length) % TOWN_FACILITIES.length,
      amount
    );
  }
  renderTownView();
}

function selectFacility(id, activate) {
  const index = TOWN_FACILITIES.findIndex(facility => facility.id === id);
  if (index < 0 || TOWN_FACILITIES[index].unavailable || town.mode === "arrival") return;
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
    closeTown();
    town.onEnterDungeon();
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
  town.mode = "arrival";
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
      button.disabled = unavailable;
      button.setAttribute("aria-disabled", String(!selecting || unavailable));
      button.classList.toggle("is-selected", selecting && index === town.selectedIndex && !unavailable);
      button.classList.toggle("is-unavailable", unavailable);
      button.classList.remove("is-locked");
    });
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
    button.disabled = unavailable;
    button.setAttribute("aria-disabled", String(unavailable));
    button.classList.toggle("is-selected", index === town.selectedIndex);
    button.classList.toggle("is-locked", town.registrationRequired && button.dataset.facility !== "guild");
    button.classList.toggle("is-unavailable", unavailable);
  });
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
  if (showRegistration) town.mode = "registration";
  town.root.classList.toggle("is-registering", showRegistration);
  town.registration.hidden = !showRegistration;
  town.feedback.textContent = "";
  if (showRegistration) town.messageEl.textContent = "ギルド長：奈落へ潜るなら、まず名簿に名前を書け。登録なしでは通せん。";
  town.root.querySelector("#townFacilityName").textContent = facility.label;
  town.onStateChanged();
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
  town.commandRoot.setAttribute("aria-label", "町の施設");
}

function showGameCommands() {
  if (!town.commandRoot) return;
  if (!town.gameCommandButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.gameCommandButtons);
  }
  delete town.commandRoot.dataset.townActive;
  town.commandRoot.setAttribute("aria-label", "ダンジョンコマンド");
}
