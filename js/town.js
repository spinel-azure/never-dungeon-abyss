import { CHARACTER_JOBS, TOWN_FACILITIES, getTownFacility } from "../data/town.js";

const town = {
  root: null,
  portrait: null,
  portraitPlaceholder: null,
  speaker: null,
  dialogue: null,
  facilityButtons: [],
  registration: null,
  nameInput: null,
  jobSelect: null,
  feedback: null,
  selectedIndex: 1,
  active: false,
  registrationRequired: false,
  getCharacter: () => null,
  onRegister: () => {},
  onEnterDungeon: () => {},
  onStateChanged: () => {}
};

export function configureTown(options) {
  Object.assign(town, options);
  town.portrait = town.root.querySelector("#townPortrait");
  town.portraitPlaceholder = town.root.querySelector("#townPortraitPlaceholder");
  town.speaker = town.root.querySelector("#townSpeaker");
  town.dialogue = town.root.querySelector("#townDialogue");
  town.registration = town.root.querySelector("#guildRegistration");
  town.nameInput = town.root.querySelector("#characterName");
  town.jobSelect = town.root.querySelector("#characterJob");
  town.feedback = town.root.querySelector("#registrationFeedback");

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
  town.root.querySelector("#townFacilities").replaceChildren(...town.facilityButtons);
  town.registration.addEventListener("submit", event => {
    event.preventDefault();
    registerCharacter();
  });
  renderFacility();
}

export function openTown({ registrationRequired = false, facilityId = null } = {}) {
  town.active = true;
  town.registrationRequired = Boolean(registrationRequired);
  const requested = getTownFacility(facilityId);
  const initialId = town.registrationRequired ? "guild" : requested?.id || "guild";
  town.selectedIndex = Math.max(0, TOWN_FACILITIES.findIndex(facility => facility.id === initialId));
  document.body.classList.add("town-active");
  town.root.hidden = false;
  renderFacility();
}

export function closeTown() {
  town.active = false;
  town.root.hidden = true;
  document.body.classList.remove("town-active");
}

export function isTownOpen() {
  return town.active;
}

export function getTownState() {
  return {
    facilityId: TOWN_FACILITIES[town.selectedIndex]?.id || "guild",
    registrationRequired: town.registrationRequired
  };
}

export function handleTownInput(action) {
  if (!town.active) return false;
  if (document.activeElement === town.nameInput || document.activeElement === town.jobSelect) return false;
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
  if (action === "cancel") return true;
  return false;
}

function moveSelection(amount) {
  if (town.registrationRequired) {
    town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "guild");
  } else {
    town.selectedIndex = (town.selectedIndex + amount + TOWN_FACILITIES.length) % TOWN_FACILITIES.length;
  }
  renderFacility();
}

function selectFacility(id, activate) {
  const index = TOWN_FACILITIES.findIndex(facility => facility.id === id);
  if (index < 0) return;
  if (town.registrationRequired && id !== "guild") {
    showRegistrationRequired();
    return;
  }
  town.selectedIndex = index;
  renderFacility();
  if (activate) activateFacility(TOWN_FACILITIES[index]);
}

function activateFacility(facility) {
  if (!facility) return;
  if (town.registrationRequired && facility.id !== "guild") {
    showRegistrationRequired();
    return;
  }
  if (facility.id === "dungeon") {
    closeTown();
    town.onEnterDungeon();
    return;
  }
  renderFacility();
}

function renderFacility() {
  const facility = TOWN_FACILITIES[town.selectedIndex] || getTownFacility("guild");
  town.facilityButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.selectedIndex);
    button.classList.toggle("is-locked", town.registrationRequired && button.dataset.facility !== "guild");
  });
  town.speaker.textContent = facility.keeper ? `${facility.keeper}：` : "";
  town.dialogue.textContent = facility.greeting;
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
  town.root.classList.toggle("is-registering", showRegistration);
  town.registration.hidden = !showRegistration;
  town.feedback.textContent = "";
  if (showRegistration) town.dialogue.textContent = "奈落へ潜るなら、まず名簿に名前を書け。登録なしでは通せん。";
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
  town.onRegister({ name, job: job.id, jobLabel: job.label });
  town.registration.hidden = true;
  town.dialogue.textContent = `${name}だな。登録は済んだ。ようこそ、冒険者ギルドへ。`;
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
    townLevel: character ? String(character.level).padStart(3, "0") : "---",
    townJob: character?.jobLabel || "-",
    townHp: character ? `${character.hp} / ${character.maxHp}` : "---- / ----",
    townSp: character ? `${character.sp} / ${character.maxSp}` : "---- / ----",
    townCondition: character?.condition || "----"
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = town.root.querySelector(`#${id}`);
    if (element) element.textContent = value;
  });
}
