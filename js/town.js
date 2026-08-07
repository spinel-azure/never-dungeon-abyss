import { CHARACTER_JOBS, TOWN_FACILITIES, getTownFacility } from "../data/town.js";
import {
  formatCompactQuickName,
  formatQuickJob,
  formatQuickLevel,
  formatQuickMoney,
  isCriticalHp
} from "../data/quick-status.js";
import {
  QUESTS,
  getQuestProgress,
  hasActiveQuest,
  isQuestAvailable
} from "../data/quests.js";
import { getItem, getShopItemIdsForCharacter } from "../data/items.js";
import { getEquipmentInstanceDefinition, getEquipmentInstanceName } from "../data/equipment-inventory.js";
import { getShopEquipmentStock } from "../data/shop-stock.js";
import { configureTownPassersby } from "./town-passersby.js";
import { getInnStayFee } from "./character-services.js";

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
    ["heal", "治療"], ["donate", "寄進"], ["talk", "話す"],
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
  nameBanner: null,
  nameBannerTimer: 0,
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
  firstTownArrivalPending: false,
  arrivalMessage: "normal",
  getCharacter: () => null,
  onRegister: () => {},
  onEnterDungeon: () => {},
  onUseTransfer: () => false,
  onStay: () => {},
  onHeal: () => {},
  onPurchaseItem: () => null,
  onPurchaseEquipment: () => null,
  onBuybackEquipment: () => null,
  onSellItem: () => null,
  onOpenSellInventory: () => {},
  onOpenPurchaseInventory: () => {},
  onEnterShop: () => null,
  getShopStockState: () => ({ newCategories: {} }),
  onViewShopCategory: () => {},
  onWithdrawItem: () => null,
  onDepositItem: () => null,
  onEditDeck: () => {},
  onTalk: () => "",
  onAcceptRequest: () => "",
  onAbandonRequest: () => null,
  onReportRequest: () => null,
  onAmbienceChanged: () => {},
  onBgmChanged: () => {},
  onFacilityVoice: () => {},
  pendingVoiceFacility: "",
  onStateChanged: () => {},
  isMenuOpen: () => false,
  playSe: () => {}
};

export function configureTown(options) {
  Object.assign(town, options);
  town.background = town.root.querySelector("#townBackground");
  town.nameBanner = town.root.querySelector("#townNameBanner");
  town.cloudLayer = town.root.querySelector("#townCloudLayer");
  town.passersbyCanvas = town.root.querySelector("#townPassersby");
  town.disposePassersby?.();
  town.disposePassersby = configureTownPassersby({
    canvas: town.passersbyCanvas,
    root: town.root
  });
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
  town.commerceOverlay = document.querySelector("#townCommerceOverlay");
  town.commerceTitle = document.querySelector("#townCommerceTitle");
  town.commerceList = document.querySelector("#townCommerceList");
  town.commerceGold = document.querySelector("#townCommerceGold");
  town.commerceIndex = 0;
  town.commerceQuantity = 1;
  town.commercePointerArmedIndex = -1;
  town.commerceKind = "";
  town.commerceItems = [];
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
    "images/background/town_01b.avif",
    "images/background/town_01c.avif",
    "images/background/town_name_01.avif",
    ...TOWN_FACILITIES.map(facility => facility.background).filter(Boolean),
    "images/background/circle.avif",
    "images/background/town_02b.avif"
    ,"images/background/guild_quest.avif"
  ].map(src => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    image.decode().catch(() => {});
    return image;
  });
  {
    const image = new Image();
    image.decoding = "async";
    image.src = "images/npc/NPC_18.avif";
    image.decode().catch(() => {});
    town.portraitPreloads.push(image);
  }

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
        returnFromFacility();
      } else if (activateFacilityService(command)) {
        if (command !== "stay" && command !== "heal") town.playSe("confirm");
      } else {
        town.playSe("cursorMove");
      }
    });
    return button;
  });
  town.commerceList.addEventListener("click", event => {
    if (town.mode !== "commerce") return;
    const button = event.target.closest("[data-commerce-index]");
    if (!button) return;
    const index = Number(button.dataset.commerceIndex);
    if (!Number.isInteger(index)) return;
    town.playSe("cursorMove");
    town.commerceIndex = index;
    renderCommerceSelection({ showDescription: true });
    if (town.commercePointerArmedIndex === index) {
      town.commercePointerArmedIndex = -1;
      requestCommerceConfirmation();
    } else {
      town.commercePointerArmedIndex = index;
    }
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

export function openTown({ registrationRequired = false, facilityId = null, mode = null, firstTownArrivalPending = false } = {}) {
  town.active = true;
  town.registrationRequired = Boolean(registrationRequired);
  town.firstTownArrivalPending = Boolean(firstTownArrivalPending);
  town.arrivalMessage = "normal";
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
    : mode === "dungeonEntrance"
      ? "dungeonEntrance"
    : opensInsideFacility
      ? "facilityMenu"
      : "selection";
  document.body.classList.add("town-active");
  town.root.hidden = false;
  renderTownView();
}

export function closeTown() {
  town.active = false;
  stopTownNameBanner();
  clearTownTypewriter();
  town.root.hidden = true;
  town.registration.hidden = true;
  town.pendingVoiceFacility = "";
  showGameCommands();
  document.body.classList.remove("town-active");
  town.onAmbienceChanged(false);
  town.onBgmChanged("");
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
    firstTownArrivalPending: town.firstTownArrivalPending,
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
  if (town.mode === "shopCategory") return handleShopCategoryInput(action);
  if (town.mode === "innStayConfirm") return handleInnStayConfirmationInput(action);
  if (town.mode === "commerceQuantity") return handleCommerceQuantityInput(action);
  if (town.mode === "commerceConfirm") return handleCommerceConfirmationInput(action);
  if (town.mode === "commerce") return handleCommerceInput(action);
  if (town.mode.startsWith("quest")) return handleQuestInput(action);
  if (town.mode === "registration") return handleRegistrationInput(action);
  if (town.mode === "dungeonEntrance") return handleEntranceInput(action);
  if (town.mode === "facilityMenu" || town.mode === "facility") return handleFacilityMenuInput(action);
  if (town.mode === "transferCircle") {
    if (action === "confirm" && town.transferUnlocked && !town.transitioning) {
      town.playSe("confirm");
      town.transitioning = true;
      Promise.resolve(town.onUseTransfer()).finally(() => { town.transitioning = false; });
      return true;
    }
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
      returnFromFacility();
    } else if (activateFacilityService(command)) {
      if (command !== "stay" && command !== "heal") town.playSe("confirm");
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
      playPendingFacilityVoice();
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
    playPendingFacilityVoice();
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
  playPendingFacilityVoice();
}

function clearTownTypewriter() {
  if (townTypewriter.timer) window.clearTimeout(townTypewriter.timer);
  townTypewriter.timer = 0;
  townTypewriter.active = false;
}

function playPendingFacilityVoice() {
  const facilityId = town.pendingVoiceFacility;
  town.pendingVoiceFacility = "";
  if (facilityId) town.onFacilityVoice(facilityId);
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
        town.messageEl.textContent = "ギルドマスター：なんだ、報告しないのか？";
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
      const acceptedMessage = quest?.id === "guild_001_abyss_rat"
        ? "ギルドマスター：これでお前の実力を試させてもらうぜ。"
        : "ギルドマスター：よし。頼んだぞ。";
      town.messageEl.textContent = acceptedMessage;
      town.mode = "facilityMenu";
      renderFacility();
      town.messageEl.textContent = acceptedMessage;
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
      town.messageEl.textContent = result.eventRewardCardId
        ? "ギルドマスター：三つの依頼、すべてよくやってくれた。これは俺からの餞別だ。女神の恩寵がお前を守ってくれるだろう。"
        : quest?.id === "guild_001_abyss_rat"
          ? "ギルドマスター：よくやってくれた！これなら先に進んでも大丈夫だろう。もっとも、生き残れるかはお前次第、だがな。"
          : "ギルドマスター：依頼達成、よくやってくれた！また頼むぜ。";
    } else {
      openGuildQuestList("report");
      town.messageEl.textContent = "ギルドマスター：まだ達成条件を満たしていないようだな。";
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
      ? "ギルドマスター：分かった。依頼は取り下げておく。"
      : "ギルドマスター：その依頼は受注していないぞ。";
    town.onStateChanged();
    return true;
  }
  if (["up", "down"].includes(action)) {
    const visibleQuestIndexes = getVisibleQuestIndexes();
    if (visibleQuestIndexes.length === 0) return true;
    town.playSe("cursorMove");
    const currentPosition = Math.max(0, visibleQuestIndexes.indexOf(town.questIndex));
    const direction = action === "down" ? 1 : visibleQuestIndexes.length - 1;
    town.questIndex = visibleQuestIndexes[
      (currentPosition + direction) % visibleQuestIndexes.length
    ];
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
    showTownArrival({ playNameBanner: true });
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
  if (command === "return") showTownArrival({ playNameBanner: true });
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

export function showTownArrival({ playNameBanner = false, firstVisit = false } = {}) {
  if (!town.active || town.registrationRequired) return false;
  town.mode = "selection";
  town.arrivalMessage = firstVisit ? "firstVisit" : "normal";
  town.selectedIndex = TOWN_FACILITIES.findIndex(facility => facility.id === "inn");
  renderTownView();
  if (playNameBanner) startTownNameBanner();
  return true;
}

function returnFromFacility() {
  const firstVisit = town.firstTownArrivalPending
    && TOWN_FACILITIES[town.selectedIndex]?.id === "guild";
  if (firstVisit) town.firstTownArrivalPending = false;
  showTownArrival({ playNameBanner: firstVisit, firstVisit });
}

function startTownNameBanner() {
  if (!town.nameBanner) return;
  window.clearTimeout(town.nameBannerTimer);
  town.nameBanner.hidden = false;
  town.nameBanner.classList.remove("is-active");
  void town.nameBanner.offsetWidth;
  town.nameBanner.classList.add("is-active");
  town.nameBannerTimer = window.setTimeout(stopTownNameBanner, 7100);
}

export function showTownNameBanner() {
  if (!town.active || !town.root.classList.contains("is-town-view")) return false;
  startTownNameBanner();
  return true;
}

function stopTownNameBanner() {
  window.clearTimeout(town.nameBannerTimer);
  town.nameBannerTimer = 0;
  town.nameBanner?.classList.remove("is-active");
  if (town.nameBanner) town.nameBanner.hidden = true;
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
  if (town.mode === "dungeonEntrance") {
    renderDungeonEntrance();
    return;
  }
  if (town.mode === "arrival" || town.mode === "selection") {
    town.onAmbienceChanged(true);
    town.onBgmChanged("");
    town.pendingVoiceFacility = "";
    const selecting = town.mode === "selection";
    town.root.classList.add("is-town-view");
    town.mosaic.hidden = true;
    town.cloudLayer.hidden = false;
    town.background.src = "images/background/town_01b.avif";
    town.background.alt = "町の風景";
    town.background.hidden = false;
    town.portrait.hidden = true;
    town.portraitPlaceholder.hidden = true;
    town.root.querySelector("#townFacilityName").hidden = true;
    const arrivalMessage = town.arrivalMessage === "firstVisit"
      ? "ここはカッツェンシュタット。『猫の町』とも呼ばれている。どこへ行きますか？"
      : "カッツェンシュタットの中心部に戻ってきた。どこへ行きますか？";
    town.messageEl.textContent = selecting
      ? arrivalMessage
      : `${arrivalMessage}\n＊Aボタンで次へ`;
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
  stopTownNameBanner();
  const facility = TOWN_FACILITIES[town.selectedIndex] || getTownFacility("guild");
  town.onAmbienceChanged(false);
  town.onBgmChanged(
    facility.id === "guild" && town.registrationRequired
      ? "registration"
      : facility.id === "temple"
        ? "temple"
        : "townFacilities"
  );
  town.root.classList.remove("is-town-view");
  town.cloudLayer.hidden = true;
  town.mosaic.hidden = true;
  town.guildQuestOverlay.hidden = true;
  town.commerceOverlay.hidden = true;
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
  town.pendingVoiceFacility = facility.id === "inn" ? "inn" : "";
  if (facility.id === "inn" && !town.getCharacter()?.eventFlags?.inn_visited) {
    const visitor = town.getCharacter();
    visitor.eventFlags = { ...(visitor.eventFlags || {}), inn_visited: true };
    town.messageEl.textContent = "女将ヨハンナ：おや？初めて見る顔だね？どこから来たんだい？";
  } else {
    town.messageEl.textContent = facility.keeper ? `${facility.keeper}：${facility.greeting}` : facility.greeting;
  }
  if (facility.id === "shop") {
    const notice = town.onEnterShop();
    if (notice?.message) town.messageEl.textContent = notice.message;
  }
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
    town.mode = "facilityMenu";
    showFacilityCommands(facility.id);
  }
  town.root.classList.toggle("is-registering", showRegistration);
  updateRegistrationJobDescription();
  town.registration.hidden = !showRegistration;
  town.feedback.textContent = "";
  if (showRegistration) town.messageEl.textContent = "ギルドマスター：奈落へ潜るなら、まず名簿に名前を書け。登録なしでは通せん。";
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
  town.onAmbienceChanged(false);
  town.onBgmChanged("");
  town.pendingVoiceFacility = "";
  showEntranceCommands();
  updateEntranceLabels();
  town.root.classList.remove("is-town-view");
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
  town.onAmbienceChanged(false);
  town.onBgmChanged("");
  town.pendingVoiceFacility = "";
  showEntranceCommands();
  updateEntranceLabels();
  town.root.classList.remove("is-town-view");
  if (town.transferUnlocked) {
    town.mosaic.hidden = true;
    town.background.src = "images/background/circle.avif";
    town.background.alt = "転送門";
    town.background.hidden = false;
  } else {
    renderMosaicBackground("images/background/circle.avif");
  }
  town.portrait.hidden = true;
  town.portraitPlaceholder.hidden = true;
  town.registration.hidden = true;
  town.root.querySelector("#townFacilityName").hidden = true;
  town.messageEl.textContent = town.transferUnlocked
    ? "転送門がある。利用しますか？\n＊Aボタン：はい　Bボタン：いいえ"
    : "まだ入ることは出来ない。";
  renderEntranceSelection();
  resetTownViewport();
  town.onStateChanged();
}

function renderEntranceSelection() {
  town.entranceButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.entranceIndex && index < 3);
    const unavailable = button.dataset.entranceCommand === "circle" && !town.transferUnlocked;
    button.classList.toggle("is-unavailable", unavailable);
    button.setAttribute("aria-disabled", String(unavailable));
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
      || (facilityId === "temple" && id === "donate")
      || (facilityId === "shop" && id === "buy")
      || (facilityId === "shop" && ["sell", "buyback", "storage"].includes(id))
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
    requestInnStay();
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
  if (command === "donate") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "temple") return false;
    openCommerce("donate");
    return true;
  }
  if (command === "buy") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "shop") return false;
    showShopCategoryCommands();
    return true;
  }
  if (command === "sell") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "shop") return false;
    town.messageEl.textContent = "女主人ヘレン：何を売るのかしら？";
    town.onOpenSellInventory();
    return true;
  }
  if (command === "buyback") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "shop") return false;
    openCommerce("buybackEquipment");
    return true;
  }
  if (command === "storage") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (facility?.id !== "shop") return false;
    showStorageCommands();
    return true;
  }
  if (command === "storage-deposit") { openCommerce("storageDeposit"); return true; }
  if (command === "storage-withdraw") { openCommerce("storageWithdraw"); return true; }
  if (command === "storage-return") { renderFacility(); return true; }
  if (command === "shop-items") {
    town.onViewShopCategory("items");
    town.messageEl.textContent = "女主人ヘレン：道具を選んでちょうだい。";
    town.onOpenPurchaseInventory("items");
    return true;
  }
  if (command === "shop-equipment") {
    town.onViewShopCategory("equipment");
    town.messageEl.textContent = "女主人ヘレン：装備品を選んでちょうだい。";
    town.onOpenPurchaseInventory("equipment");
    return true;
  }
  if (command === "shop-return") {
    renderFacility();
    return true;
  }
  if (command === "talk") {
    const facility = TOWN_FACILITIES[town.selectedIndex];
    if (!["guild", "inn", "temple", "shop", "library"].includes(facility?.id)) return false;
    const result = town.onTalk(facility?.id);
    const message = typeof result === "string" ? result : result?.message;
    town.pendingVoiceFacility = facility.id === "inn" ? "inn" : "";
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

function requestInnStay() {
  const character = town.getCharacter();
  const fee = getInnStayFee(character);
  if (Math.max(0, Math.floor(Number(character?.gold) || 0)) < fee) {
    town.onStay();
    town.onStateChanged();
    return;
  }
  town.mode = "innStayConfirm";
  town.playSe("confirm");
  town.messageEl.textContent = `女将ヨハンナ：${fee}Gだけど、いいかい？\n＊Aボタン：はい　Bボタン：いいえ`;
}

function handleInnStayConfirmationInput(action) {
  if (action === "confirm") {
    town.playSe("confirm");
    town.mode = "facilityMenu";
    town.onStay();
    town.onStateChanged();
    return true;
  }
  if (action === "cancel") {
    town.playSe("cancel");
    town.mode = "facilityMenu";
    town.messageEl.textContent = "女将ヨハンナ：そうかい。無理をするんじゃないよ？";
    return true;
  }
  return true;
}

function openCommerce(kind) {
  const buybackEntries = kind === "buybackEquipment" ? (town.getCharacter()?.equipmentBuyback || []) : [];
  const ids = kind === "donate"
    ? ["exorcism_talisman", "holy_water"]
    : kind === "storageWithdraw"
      ? [...new Set((town.getCharacter()?.warehouse?.itemStacks || []).map(stack => stack.itemId))]
    : kind === "storageDeposit"
      ? Object.keys(town.getCharacter()?.inventory?.counts || {})
    : kind === "sell"
      ? Object.keys(town.getCharacter()?.inventory?.counts || {}).filter(id => getItem(id)?.sellPrice > 0)
      : kind === "buyEquipment"
        ? []
        : getShopItemIdsForCharacter(town.getCharacter());
  town.mode = "commerce";
  town.commerceKind = kind;
  town.commerceItems = kind === "buybackEquipment"
    ? buybackEntries.map(entry => {
      const definition = getEquipmentInstanceDefinition(entry.instance);
      return definition ? { ...definition, id: entry.instance.instanceId, name: getEquipmentInstanceName(entry.instance), buyPrice: entry.price } : null;
    }).filter(Boolean)
    : kind === "buyEquipment"
      ? getShopEquipmentStock(town.getCharacter())
      : ids.map(getItem).filter(Boolean);
  town.commerceIndex = 0;
  town.commercePointerArmedIndex = -1;
  town.commerceTitle.textContent = kind === "donate" ? "寄進" : kind === "sell" ? "売却" : kind.startsWith("storage") ? "倉庫" : "購入";
  town.commerceOverlay.hidden = false;
  town.guildQuestOverlay.hidden = true;
  town.messageEl.textContent = kind === "donate"
    ? "司祭アーヴァイン：いずれを女神へ寄進されますか？\n＊Aボタン：決定　Bボタン：戻る"
    : kind === "storageWithdraw"
      ? town.commerceItems.length ? "女主人ヘレン：取り出すものを選んで。" : "女主人ヘレン：倉庫は空よ。"
    : kind === "storageDeposit"
      ? town.commerceItems.length ? "女主人ヘレン：預けるものを選んで。" : "女主人ヘレン：預けられる道具はないようね。"
    : kind === "sell"
      ? town.commerceItems.length ? "女主人ヘレン：何を売るのかしら？\n＊Aボタン：決定　Bボタン：戻る" : "女主人ヘレン：売れる道具はないようね。"
      : "女主人ヘレン：どれにするのかしら？\n＊Aボタン：決定　Bボタン：戻る";
  renderCommerce({ showDescription: false });
  resetTownViewport();
}

function showShopCategoryCommands() {
  const newCategories = town.getShopStockState()?.newCategories || {};
  const commands = [
    ["shop-equipment", "装備品"], ["shop-items", "道具"], ["shop-return", "戻る"],
    ["empty-1", ""], ["empty-2", ""], ["empty-3", ""]
  ];
  town.mode = "shopCategory";
  town.commerceOverlay.hidden = true;
  town.facilityCommandIndex = 0;
  town.facilityCommandButtons.forEach((button, index) => {
    const [id, label] = commands[index];
    button.dataset.facilityCommand = id;
    button.replaceChildren(document.createTextNode(label));
    const category = id === "shop-equipment" ? "equipment" : id === "shop-items" ? "items" : "";
    if (category && newCategories[category]) {
      const badge = document.createElement("span");
      badge.className = "shop-new-badge";
      badge.textContent = "NEW";
      button.append(badge);
    }
    button.disabled = !label;
    button.classList.toggle("is-empty", !label);
    button.classList.remove("is-unavailable");
    button.setAttribute("aria-disabled", "false");
  });
  town.messageEl.textContent = "女主人ヘレン：必要なのは何かしら？道具？それとも装備品？";
  renderFacilityCommandSelection();
}

function handleShopCategoryInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    renderFacility();
    return true;
  }
  return handleFacilityMenuInput(action);
}

function handleCommerceInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    town.commercePointerArmedIndex = -1;
    if (town.commerceKind === "buy" || town.commerceKind === "buyEquipment") showShopCategoryCommands();
    else if (town.commerceKind.startsWith("storage")) showStorageCommands();
    else renderFacility();
    return true;
  }
  if (["up", "down", "left", "right"].includes(action)) {
    if (!town.commerceItems.length) return true;
    town.playSe("cursorMove");
    const amount = action === "up" || action === "left" ? -1 : 1;
    town.commerceIndex = (
      town.commerceIndex + amount + town.commerceItems.length
    ) % town.commerceItems.length;
    town.commercePointerArmedIndex = -1;
    renderCommerceSelection({ showDescription: true });
    return true;
  }
  if (action === "confirm") {
    requestCommerceConfirmation();
    return true;
  }
  return true;
}

function requestCommerceConfirmation() {
  const item = town.commerceItems[town.commerceIndex];
  if (!item) return;
  if (town.commerceKind === "buy") {
    town.commerceQuantity = 1;
    town.mode = "commerceQuantity";
    renderCommerceQuantity();
    return;
  }
  if (town.commerceKind === "sell" || town.commerceKind === "storageDeposit") {
    const owned = Math.max(0, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item.id]) || 0));
    town.commerceQuantity = Math.max(1, Math.min(owned, town.commerceQuantity || 1));
    if (owned > 1) {
      town.mode = "commerceQuantity";
      renderCommerceQuantity();
      return;
    }
  }
  showCommerceConfirmation();
}

function showCommerceConfirmation() {
  const item = town.commerceItems[town.commerceIndex];
  if (!item) return;
  town.mode = "commerceConfirm";
  town.messageEl.textContent = town.commerceKind === "donate"
    ? "司祭アーヴァイン：こちらでよろしいですか？\n＊Aボタン：はい　Bボタン：いいえ"
    : town.commerceKind === "storageWithdraw"
      ? "女主人ヘレン：これを取り出すのね？\n＊Aボタン：はい　Bボタン：いいえ"
    : town.commerceKind === "storageDeposit"
      ? `女主人ヘレン：${item.name}を${town.commerceQuantity || 1}個預かればいいのね？\n＊Aボタン：はい　Bボタン：いいえ`
    : town.commerceKind === "sell"
      ? `女主人ヘレン：${item.sellPrice}G ×${town.commerceQuantity || 1}、合計${item.sellPrice * (town.commerceQuantity || 1)}Gで買い取るわ。これでいい？\n＊Aボタン：はい　Bボタン：いいえ`
    : town.commerceKind === "buy"
      ? `女主人ヘレン：${item.buyPrice}G ×${town.commerceQuantity || 1}、合計${item.buyPrice * (town.commerceQuantity || 1)}Gで購入するのね？\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}　所持金：${formatGold(town.getCharacter()?.gold)}G\n＊Aボタン：はい　Bボタン：いいえ`
    : town.commerceKind === "buyEquipment" || town.commerceKind === "buybackEquipment"
      ? `女主人ヘレン：${item.name}を${item.buyPrice}Gで購入するのね？\n所持金：${formatGold(town.getCharacter()?.gold)}G\n＊Aボタン：はい　Bボタン：いいえ`
      : `女主人ヘレン：${item.name}を${item.buyPrice}Gで購入するのね？\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}　所持金：${formatGold(town.getCharacter()?.gold)}G\n＊Aボタン：はい　Bボタン：いいえ`;
}

function handleCommerceQuantityInput(action) {
  const item = town.commerceItems[town.commerceIndex];
  if (!item) return true;
  const owned = Math.max(1, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item.id]) || 1));
  const maximum = town.commerceKind === "buy"
    ? Math.max(1, Math.min(99, item.buyPrice > 0
      ? Math.floor(Math.max(0, Number(town.getCharacter()?.gold) || 0) / item.buyPrice)
      : 99))
    : owned;
  if (["up", "down", "left", "right"].includes(action)) {
    const amount = action === "up" ? 1 : action === "down" ? -1 : action === "right" ? 10 : -10;
    town.commerceQuantity = Math.max(1, Math.min(maximum, town.commerceQuantity + amount));
    town.playSe("cursorMove");
    renderCommerceQuantity();
    return true;
  }
  if (action === "confirm") {
    town.playSe("confirm");
    showCommerceConfirmation();
    return true;
  }
  if (action === "cancel") {
    town.playSe("cancel");
    town.mode = "commerce";
    town.messageEl.textContent = "女主人ヘレン：あら、残念。";
    return true;
  }
  return true;
}

function renderCommerceQuantity() {
  const item = town.commerceItems[town.commerceIndex];
  const owned = Math.max(1, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item?.id]) || 1));
  town.messageEl.textContent = town.commerceKind === "buy"
    ? `女主人ヘレン：いくつ購入するのかしら？\n購入数 ${town.commerceQuantity}　合計 ${item.buyPrice * town.commerceQuantity}G\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
    : town.commerceKind === "storageDeposit"
    ? `女主人ヘレン：いくつ預かればいいのかしら？\n預ける数 ${town.commerceQuantity} / ${owned}\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
    : `女主人ヘレン：いくつ売るのかしら？\n売却数 ${town.commerceQuantity} / ${owned}　合計 ${item.sellPrice * town.commerceQuantity}G\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`;
}

function handleCommerceConfirmationInput(action) {
  if (action === "confirm") {
    purchaseSelectedCommerceItem();
    return true;
  }
  if (action === "cancel") {
    town.playSe("cancel");
    town.mode = "commerce";
    town.messageEl.textContent = town.commerceKind === "donate"
      ? "司祭アーヴァイン：承知しました。"
      : town.commerceKind === "sell" ? "女主人ヘレン：あら、残念。" : "女主人ヘレン：あら、残念。";
    return true;
  }
  return true;
}

function purchaseSelectedCommerceItem() {
  const item = town.commerceItems[town.commerceIndex];
  if (!item) return;
  const selling = town.commerceKind === "sell";
  const withdrawing = town.commerceKind === "storageWithdraw";
  const depositing = town.commerceKind === "storageDeposit";
  const result = withdrawing
    ? town.onWithdrawItem(item.id)
    : depositing
      ? town.onDepositItem(item.id, town.commerceQuantity || 1)
    : selling
    ? town.onSellItem(item.id, town.commerceQuantity || 1)
    : town.commerceKind === "buyEquipment"
      ? town.onPurchaseEquipment(item.id)
      : town.commerceKind === "buybackEquipment"
        ? town.onBuybackEquipment(item.id)
      : town.onPurchaseItem(item.id, town.commerceQuantity || 1);
  if (!result?.accepted) {
    town.playSe("cursorMove");
    town.messageEl.textContent = result?.reason === "insufficientGold"
      ? (town.commerceKind === "donate"
        ? "司祭アーヴァイン：ゴールドが足りません。"
        : "女主人ヘレン：あら、お金が足りないわ。")
      : `${town.commerceKind === "donate" ? "司祭アーヴァイン" : "女主人ヘレン"}：これ以上は持てないようですね。`;
    town.mode = "commerce";
    return;
  }
  town.playSe("item");
  const keeper = town.commerceKind === "donate" ? "司祭アーヴァイン" : "女主人ヘレン";
  town.messageEl.textContent = town.commerceKind === "donate"
    ? `${keeper}：女神のご加護を。${item.name}を授けましょう。`
    : withdrawing
      ? `${keeper}：${item.name}を倉庫から取り出したわ。`
    : depositing
      ? `${keeper}：${item.name}を${result.amount}個、倉庫で預かったわ。`
    : selling
      ? `${keeper}：${item.name}を${result.quantity}個、${result.value}Gで買い取ったわ。`
    : result.stored > 0
      ? `${keeper}：はい、どうぞ。\n${item.name}はこれ以上持てません。超過分を倉庫へ送りました。`
      : town.commerceKind === "buy" && result.quantity > 1
        ? `${keeper}：${item.name}を${result.quantity}個ね。はい、どうぞ。`
        : `${keeper}：はい、どうぞ。`;
  town.mode = "commerce";
  if (((selling || depositing) && Number(town.getCharacter()?.inventory?.counts?.[item.id] || 0) <= 0)
    || (withdrawing && warehouseItemCount(item.id) <= 0)
    || town.commerceKind === "buybackEquipment") {
    town.commerceItems.splice(town.commerceIndex, 1);
    town.commerceIndex = Math.max(0, Math.min(town.commerceIndex, town.commerceItems.length - 1));
  }
  town.commercePointerArmedIndex = -1;
  town.commerceQuantity = 1;
  renderCommerce({ showDescription: false });
  town.onStateChanged();
}

function renderCommerce({ showDescription = true } = {}) {
  town.commerceList.replaceChildren(...town.commerceItems.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "town-commerce-entry";
    button.dataset.commerceIndex = String(index);
    const name = document.createElement("span");
    name.textContent = item.name;
    const price = document.createElement("small");
    price.textContent = town.commerceKind === "storageWithdraw"
      ? `×${warehouseItemCount(item.id)}`
      : town.commerceKind === "storageDeposit"
        ? `×${town.getCharacter()?.inventory?.counts?.[item.id] || 0}`
      : town.commerceKind === "sell"
        ? `${item.sellPrice}G ×${inventoryItemCount(item.id)}`
        : town.commerceKind === "buy"
          ? `${item.buyPrice}G　所持×${inventoryItemCount(item.id)}`
          : `${item.buyPrice}G`;
    button.append(name, price);
    return button;
  }));
  if (town.commerceGold) {
    town.commerceGold.textContent = Math.max(
      0,
      Math.floor(Number(town.getCharacter()?.gold) || 0)
    ).toLocaleString("en-US");
  }
  renderCommerceSelection({ showDescription });
}

function warehouseItemCount(itemId) {
  return (town.getCharacter()?.warehouse?.itemStacks || [])
    .filter(stack => stack.itemId === itemId)
    .reduce((sum, stack) => sum + Math.max(0, Math.floor(Number(stack.count) || 0)), 0);
}

function inventoryItemCount(itemId) {
  return Math.max(0, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[itemId]) || 0));
}

function formatGold(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");
}

function showStorageCommands() {
  const commands = [
    ["storage-deposit", "預ける"], ["storage-withdraw", "取り出す"], ["storage-return", "戻る"],
    ["empty-1", ""], ["empty-2", ""], ["empty-3", ""]
  ];
  town.mode = "shopCategory";
  town.commerceOverlay.hidden = true;
  town.facilityCommandIndex = 0;
  town.facilityCommandButtons.forEach((button, index) => {
    const [id, label] = commands[index];
    button.dataset.facilityCommand = id;
    button.textContent = label;
    button.disabled = !label;
    button.classList.toggle("is-empty", !label);
    button.classList.remove("is-unavailable");
    button.setAttribute("aria-disabled", "false");
  });
  town.messageEl.textContent = "女主人ヘレン：倉庫を使うのね。預ける？それとも取り出す？";
  renderFacilityCommandSelection();
}

function renderCommerceSelection({ showDescription = true } = {}) {
  [...town.commerceList.children].forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.commerceIndex);
  });
  const item = town.commerceItems[town.commerceIndex];
  if (showDescription && item) {
    const ownership = town.commerceKind === "buy"
      ? `\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}`
      : "";
    town.messageEl.textContent = `${item.description}${ownership}\n＊Aボタン：決定　Bボタン：戻る`;
  }
}

function openGuildQuestList(kind) {
  town.mode = kind === "report" ? "questReportList" : "questAcceptList";
  town.questIndex = getVisibleQuestIndexes()[0] ?? 0;
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
    ? "ギルドマスター：達成した依頼があるのか？報告してくれ。"
    : "ギルドマスター：受ける依頼を選んでくれ。";
  renderGuildQuestList();
  resetTownViewport();
}

function renderGuildQuestList() {
  const reportMode = town.mode === "questReportList";
  const visibleQuestIndexes = getVisibleQuestIndexes();
  if (!visibleQuestIndexes.includes(town.questIndex)) {
    town.questIndex = visibleQuestIndexes[0] ?? 0;
  }
  town.guildQuestList.replaceChildren(...visibleQuestIndexes.map(index => {
    const quest = QUESTS[index];
    const progress = getQuestProgress(town.getCharacter(), quest.id);
    const selectable = reportMode
      ? progress.active
      : isQuestAvailable(town.getCharacter(), quest) && !progress.active && !progress.completed;
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

function getVisibleQuestIndexes() {
  return QUESTS
    .map((quest, index) => ({ index, progress: getQuestProgress(town.getCharacter(), quest.id) }))
    .filter(({ progress }) => !progress.completed)
    .map(({ index }) => index);
}

function activateSelectedQuest() {
  const quest = QUESTS[town.questIndex];
  const progress = getQuestProgress(town.getCharacter(), quest?.id);
  if (town.mode === "questAcceptList") {
    if (!isQuestAvailable(town.getCharacter(), quest) || progress.active || progress.completed) {
      town.playSe("cursorMove");
      return;
    }
    town.playSe("confirm");
    town.mode = "questAcceptDetail";
    renderQuestDetail(quest, progress);
    town.messageEl.textContent = "ギルドマスター：この依頼でいいか？\n＊Aボタン：はい　Bボタン：いいえ";
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
    town.messageEl.textContent = "ギルドマスター：この依頼を報告するのか？\n＊Aボタン：はい　Bボタン：いいえ";
    return;
  }
  town.playSe("confirm");
  town.mode = "questAbandonConfirm";
  town.messageEl.textContent = "ギルドマスター：なんだ？依頼を破棄するのか？\n＊A：はい　B：いいえ";
}

function renderQuestDetail(quest, progress) {
  town.guildQuestTitle.textContent = `${quest.number}:${quest.title}`;
  town.guildQuestList.hidden = true;
  town.guildQuestDetail.hidden = false;
  town.guildQuestDetail.replaceChildren(
    detailBlock("依頼人", quest.client),
    divider(),
    detailBlock(
      quest.objectiveType === "exploreFloor" ? "目的" : "討伐数",
      quest.objectiveLabel || `${quest.targetName}を${quest.requiredCount}匹退治する。`
    ),
    divider(),
    detailBlock("報酬", quest.reward.label),
    divider(),
    detailBlock(quest.descriptionLabel || "内容", quest.description.join("\n"))
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
  if (reason === "activeLimit") return "ギルドマスター：同時に受けられる依頼は3件までだ。";
  if (reason === "alreadyAccepted") return "ギルドマスター：その依頼はもう受注しているぞ。";
  if (reason === "completed") return "ギルドマスター：その依頼はもう完了している。";
  return "ギルドマスター：今はその依頼を受けられない。";
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
  if (transferButton) transferButton.textContent = town.transferUnlocked ? "転送門" : "？？？";
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
  town.firstTownArrivalPending = true;
  town.mode = "facilityMenu";
  town.facilityCommandIndex = 0;
  const registrationResult = town.onRegister({ name, job: job.id, jobLabel: job.labelEn });
  town.registration.hidden = true;
  renderCharacterStatus();
  town.facilityButtons.forEach(button => button.classList.remove("is-locked"));
  renderFacility();
  town.messageEl.textContent = registrationResult?.message
    || `ギルドマスター：${name}だな。登録は済んだ。ようこそ、冒険者ギルドへ。`;
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
  const quickName = character?.name || "NO_NAME";
  const values = {
    quickName,
    quickNameCompact: formatCompactQuickName(quickName),
    quickJob: formatQuickJob(character?.job, isJapaneseUi() ? "ja" : "en"),
    quickLevel: formatQuickLevel(character?.level),
    quickHpCurrent: character ? character.hp : "----",
    quickHpMax: character ? character.maxHp : "----",
    quickSpCurrent: character ? character.sp : "----",
    quickSpMax: character ? character.maxSp : "----",
    quickMoney: formatQuickMoney(character?.gold)
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  });
  const hpMax = document.querySelector("#quickHpMax");
  const hpCurrent = document.querySelector("#quickHpCurrent");
  const spMax = document.querySelector("#quickSpMax");
  const quickNameElement = document.querySelector("#quickName");
  const quickNameCompact = document.querySelector("#quickNameCompact");
  hpMax?.classList.toggle("vital-max-bonus", hasMaxVitalBonus(character, "maxHp"));
  hpCurrent?.classList.toggle("vital-critical", isCriticalHp(character?.hp, character?.maxHp));
  spMax?.classList.toggle("vital-max-bonus", hasMaxVitalBonus(character, "maxSp"));
  quickNameElement?.classList.toggle("condition-poison", character?.condition === "POISON");
  quickNameCompact?.classList.toggle("condition-poison", character?.condition === "POISON");
  quickNameElement?.classList.toggle("condition-bleeding", character?.condition === "BLEED");
  quickNameCompact?.classList.toggle("condition-bleeding", character?.condition === "BLEED");
}

function hasMaxVitalBonus(character, key) {
  return Number(character?.equipmentStatBonuses?.[key]) > 0
    || Number(character?.cardStatBonuses?.[key]) > 0;
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
