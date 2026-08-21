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
import { getTavernRumorTypewriterParts } from "../data/tavern-rumors.js";
import { CHARACTER_NAME_MAX_LENGTH, CHARACTER_RENAME_COST, normalizeCharacterName } from "../data/character-name.js";
import { getUnlockedTransferDestinations } from "../data/transfer-destinations.js";
import { NPC_DEFINITIONS, NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";
import { getNpcHireFee } from "../data/npc-party.js";
import {
  ANASTASIA_OUTFIT_EVENT_FLAG,
  isAnastasiaAssigned,
  isAnastasiaFestivalSunday,
  isAnastasiaOutfitEventPending,
  shouldUseAnastasiaFestivalPortrait
} from "../data/anastasia-event.js";
import { HELEN_HIDDEN_EVENT_PORTRAIT, shouldUseHelenHiddenPortrait } from "../data/helen-event.js";

const FACILITY_COMMANDS = Object.freeze({
  inn: [
    ["stay", "泊まる"], ["talk", "話す"], ["deck", "デッキ編成"],
    ["return", "町に戻る"], ["empty-1", ""], ["empty-2", ""]
  ],
  guild: [
    ["accept", "依頼受注"], ["report", "依頼報告"], ["history", "依頼履歴"],
    ["talk", "話す"], ["tavern", "酒場"], ["return", "町に戻る"]
  ],
  temple: [
    ["heal", "治療"], ["donate", "寄進"], ["rename", "改名"],
    ["talk", "話す"], ["return", "町へ戻る"], ["empty-1", ""]
  ],
  shop: [
    ["buy", "購入"], ["sell", "売却"], ["buyback", "買い戻す"],
    ["storage", "倉庫"], ["talk", "話す"], ["return", "町へ戻る"]
  ],
  library: [
    ["monsters", "魔物図鑑"], ["items", "アイテム図鑑"], ["cards", "カード図鑑"],
    ["records", "冒険記録"], ["talk", "話す"], ["return", "町へ戻る"]
  ],
  tavern: [
    ["npc-hire", "NPC雇用"], ["rumors", "噂話"], ["past-rumors", "過去の噂話"],
    ["talk", "話す"], ["return", "町に戻る"], ["empty-1", ""]
  ],
  npcHire: [
    ["npc-search", "NPCを探す"], ["npc-roster", "名簿から雇用"], ["npc-hire-return", "戻る"],
    ["empty-1", ""], ["empty-2", ""], ["empty-3", ""]
  ]
});

const UNIMPLEMENTED_TAVERN_COMMANDS = Object.freeze(new Set());

const TAVERN_FACILITY = Object.freeze({
  id: "tavern",
  label: "酒場",
  keeper: "ローザ",
  greeting: "いらっしゃい。ゆっくりしていってね。",
  image: "images/npc/NPC_20.avif",
  portraitAlt: "酒場の女主人ローザ",
  background: "images/background/town_07.avif"
});

const NPC_HIRE_FACILITY = Object.freeze({ ...TAVERN_FACILITY, id: "npcHire", label: "NPC雇用" });

const TOWN_TYPEWRITER_DELAYS = Object.freeze({ slow: 75, normal: 42, fast: 20 });
const townTypewriter = {
  enabled: true,
  speed: "normal",
  timer: 0,
  sourceText: "",
  prefixText: "",
  typingText: "",
  suffixText: "",
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
  questPage: 0,
  rumorDialogue: [],
  rumorDialogueIndex: 0,
  activeRumor: null,
  facilityTalkDialogue: [],
  facilityTalkDialogueIndex: 0,
  facilityTalkCompletionFlag: "",
  suppressFestivalPortraitUntilTempleExit: false,
  questAcceptanceRewardMessage: "",
  entranceIndex: 0,
  transferIndex: 0,
  transferPage: 0,
  facilityCommandIndex: 0,
  transferUnlocked: false,
  selectedIndex: 1,
  subFacilityId: "",
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
  onRename: () => null,
  onPurchaseItem: () => null,
  onPurchaseEquipment: () => null,
  onBuybackEquipment: () => null,
  onSellItem: () => null,
  onBuybackItem: () => null,
  onOpenSellInventory: () => {},
  onOpenPurchaseInventory: () => {},
  onEnterShop: () => null,
  onEnterInn: () => null,
  getShopStockState: () => ({ newCategories: {} }),
  onViewShopCategory: () => {},
  onWithdrawItem: () => null,
  onDepositItem: () => null,
  onWithdrawEquipment: () => null,
  onDepositEquipment: () => null,
  onEditDeck: () => {},
  onOpenQuestHistory: () => {},
  onOpenRumorHistory: () => {},
  onRegisterNpc: () => ({ accepted: false }),
  onHireNpc: () => ({ accepted: false }),
  onRenewNpc: () => ({ accepted: false }),
  onOpenAdventureRecords: () => {},
  onOpenCardGallery: () => {},
  facilityPreviewCommand: "",
  getUnreadRumor: () => null,
  onCompleteRumor: () => {},
  onCompleteFacilityTalk: () => {},
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
    root: town.root,
    getCharacter: town.getCharacter
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
  town.commerceQuantityControls = document.querySelector("#townCommerceQuantityControls");
  town.storageTabs = document.querySelector("#townStorageTabs");
  town.storageCategory = "items";
  town.commerceIndex = 0;
  town.commerceQuantity = 1;
  town.commercePointerArmedIndex = -1;
  town.commerceKind = "";
  town.commerceItems = [];
  town.npcManagementKind = "";
  town.npcManagementItems = [];
  town.npcManagementIndex = 0;
  town.npcManagementConfirm = false;
  town.npcManagementGreeting = false;
  town.npcManagementPointerArmedIndex = -1;
  town.npcManagementReturn = null;
  town.questPointerArmedIndex = -1;
  town.transferOverlay = document.querySelector("#transferDestinationOverlay");
  town.transferList = document.querySelector("#transferDestinationList");
  town.transferPager = document.querySelector("#transferDestinationPager");
  town.transferPointerArmedIndex = -1;
  town.portraitPreloads = TOWN_FACILITIES
    .filter(facility => facility.image)
    .map(facility => {
      const image = new Image();
      image.decoding = "async";
      image.src = facility.image;
      image.decode().catch(() => {});
      return image;
    });
  {
    const image = new Image();
    image.decoding = "async";
    image.src = TAVERN_FACILITY.image;
    image.decode().catch(() => {});
    town.portraitPreloads.push(image);
  }
  {
    const image = new Image();
    image.decoding = "async";
    image.src = "images/npc/NPC_12d.avif";
    image.decode().catch(() => {});
    town.portraitPreloads.push(image);
  }
  {
    const image = new Image();
    image.decoding = "async";
    image.src = "images/npc/NPC_12c.avif";
    image.decode().catch(() => {});
    town.portraitPreloads.push(image);
  }
  for (const npc of NPC_DEFINITIONS) {
    const image = new Image();
    image.decoding = "async";
    image.src = npc.image;
    image.decode().catch(() => {});
    town.portraitPreloads.push(image);
  }
  town.backgroundPreloads = [
    "images/background/town_01b.avif",
    "images/background/town_01c.avif",
    "images/background/town_name_01.avif",
    ...TOWN_FACILITIES.map(facility => facility.background).filter(Boolean),
    TAVERN_FACILITY.background,
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
        if (town.mode === "transferCircle") {
          activateTransferSelection(index);
          return;
        }
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
      const command = button.dataset.facilityCommand;
      const alreadyPrepared = town.facilityCommandIndex === index
        && town.facilityPreviewCommand === command;
      town.facilityCommandIndex = index;
      renderFacilityCommandSelection();
      if (isLibraryPreviewCommand(command) && !alreadyPrepared) {
        previewLibraryCommand(command);
        town.playSe("cursorMove");
        return;
      }
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
    if (town.mode === "npcManagement") {
      const button = event.target.closest("[data-npc-index]");
      if (!button) return;
      const index = Number(button.dataset.npcIndex);
      if (!Number.isInteger(index)) return;
      if (town.npcManagementPointerArmedIndex === index) {
        town.npcManagementPointerArmedIndex = -1;
        handleNpcManagementInput("confirm");
        return;
      }
      town.npcManagementIndex = index;
      town.npcManagementConfirm = false;
      town.npcManagementPointerArmedIndex = index;
      town.playSe("cursorMove");
      renderNpcManagement();
      return;
    }
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
  town.commerceQuantityControls?.addEventListener("click", event => {
    const button = event.target.closest("[data-commerce-step]");
    if (!button || town.mode !== "commerceQuantity") return;
    const step = Number(button.dataset.commerceStep);
    const action = step === -10 ? "left" : step === -1 ? "down" : step === 1 ? "up" : step === 10 ? "right" : "";
    if (action) handleCommerceQuantityInput(action);
  });
  town.storageTabs?.addEventListener("click", event => {
    const button = event.target.closest("[data-storage-tab]");
    if (!button || town.mode !== "commerce" || !town.commerceKind.startsWith("storage")) return;
    setStorageCategory(button.dataset.storageTab);
  });
  town.root.querySelector("#guildQuestPager")?.addEventListener("click", event => {
    const button = event.target.closest("[data-quest-page]");
    if (!button || !town.mode.startsWith("quest")) return;
    changeQuestPage(Number(button.dataset.questPage));
  });
  town.transferPager?.addEventListener("click", event => {
    const button = event.target.closest("[data-transfer-page]");
    if (!button || town.mode !== "transferCircle") return;
    changeTransferPage(Number(button.dataset.transferPage));
  });
  town.registration.addEventListener("submit", event => {
    event.preventDefault();
    if (town.mode === "templeRenameInput") renameCharacterAtTemple();
    else registerCharacter();
  });
  town.registration.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    if (town.mode === "templeRenameInput") {
      event.preventDefault();
      town.registration.requestSubmit();
      return;
    }
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
  town.subFacilityId = facilityId === "tavern" ? "tavern" : "";
  const requested = town.subFacilityId ? getTownFacility("guild") : getTownFacility(facilityId);
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
  town.subFacilityId = "";
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
    facilityId: currentFacility().id,
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
  if (town.mode === "templeHealConfirm") return handleTempleHealConfirmationInput(action);
  if (town.mode === "templeRenameConfirm") return handleTempleRenameConfirmationInput(action);
  if (town.mode === "templeRenameInput") return handleTempleRenameInput(action);
  if (town.mode === "commerceQuantity") return handleCommerceQuantityInput(action);
  if (town.mode === "commerceConfirm") return handleCommerceConfirmationInput(action);
  if (town.mode === "commerce") return handleCommerceInput(action);
  if (town.mode === "npcManagement") return handleNpcManagementInput(action);
  if (town.mode === "tavernRumor") return handleTavernRumorInput(action);
  if (town.mode === "facilityTalk") return handleFacilityTalkInput(action);
  if (town.mode.startsWith("quest")) return handleQuestInput(action);
  if (town.mode === "registration") return handleRegistrationInput(action);
  if (town.mode === "dungeonEntrance") return handleEntranceInput(action);
  if (town.mode === "facilityMenu" || town.mode === "facility") return handleFacilityMenuInput(action);
  if (town.mode === "transferCircle") {
    const destinations = getTransferDestinations();
    const pageCount = Math.max(1, Math.ceil(destinations.length / 5));
    if (["up", "down"].includes(action) && destinations.length > 1) {
      town.playSe("cursorMove");
      town.transferIndex = (town.transferIndex + (action === "down" ? 1 : destinations.length - 1)) % destinations.length;
      town.transferPage = Math.floor(town.transferIndex / 5);
      town.transferPointerArmedIndex = -1;
      renderTransferCircle();
      return true;
    }
    if (["left", "right"].includes(action) && pageCount > 1) {
      changeTransferPage(action === "right" ? 1 : -1);
      return true;
    }
    if (action === "confirm") {
      town.playSe("confirm");
      town.transferPointerArmedIndex = -1;
      activateTransferSelection(town.transferIndex);
      return true;
    }
    if (action === "cancel") {
      town.playSe("cancel");
      town.transferOverlay.hidden = true;
      town.commandRoot.hidden = false;
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
    const command = town.facilityCommandButtons[town.facilityCommandIndex]?.dataset.facilityCommand;
    previewLibraryCommand(command);
    return true;
  }
  if (action === "confirm") {
    const command = town.facilityCommandButtons[town.facilityCommandIndex]?.dataset.facilityCommand;
    if (isLibraryPreviewCommand(command) && town.facilityPreviewCommand !== command) {
      previewLibraryCommand(command);
      town.playSe("cursorMove");
      return true;
    }
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

function handleTavernRumorInput(action) {
  if (action === "cancel") return true;
  if (action !== "confirm") return true;
  town.playSe("confirm");
  town.rumorDialogueIndex += 1;
  if (town.rumorDialogueIndex < town.rumorDialogue.length) {
    town.messageEl.textContent = town.rumorDialogue[town.rumorDialogueIndex];
    return true;
  }
  town.onCompleteRumor(town.activeRumor);
  town.activeRumor = null;
  town.rumorDialogue = [];
  town.rumorDialogueIndex = 0;
  renderFacility();
  return true;
}

function handleFacilityTalkInput(action) {
  if (action === "cancel") return true;
  if (action !== "confirm") return true;
  town.playSe("confirm");
  town.facilityTalkDialogueIndex += 1;
  if (town.facilityTalkDialogueIndex < town.facilityTalkDialogue.length) {
    town.messageEl.textContent = town.facilityTalkDialogue[town.facilityTalkDialogueIndex];
    return true;
  }
  if (town.facilityTalkCompletionFlag === ANASTASIA_OUTFIT_EVENT_FLAG) {
    beginAnastasiaOutfitBlackout();
    return true;
  }
  if (town.facilityTalkCompletionFlag) town.onCompleteFacilityTalk(town.facilityTalkCompletionFlag);
  town.facilityTalkDialogue = [];
  town.facilityTalkDialogueIndex = 0;
  town.facilityTalkCompletionFlag = "";
  town.mode = "facilityMenu";
  renderFacility();
  return true;
}

function beginAnastasiaOutfitBlackout() {
  town.transitioning = true;
  town.root.classList.add("is-anastasia-outfit-blackout");
  window.setTimeout(() => {
    town.onCompleteFacilityTalk(ANASTASIA_OUTFIT_EVENT_FLAG);
    town.suppressFestivalPortraitUntilTempleExit = true;
    town.facilityTalkDialogue = [];
    town.facilityTalkDialogueIndex = 0;
    town.facilityTalkCompletionFlag = "";
    town.mode = "facilityMenu";
    renderFacility();
    window.setTimeout(() => {
      town.root.classList.remove("is-anastasia-outfit-blackout");
      window.setTimeout(() => { town.transitioning = false; }, 360);
    }, 120);
  }, 360);
}

function configureTownMessageObserver() {
  townTypewriter.observer?.disconnect();
  townTypewriter.observer = new MutationObserver(() => {
    const text = town.messageEl?.textContent || "";
    if (text === townTypewriter.lastRenderedText) return;
    clearTownTypewriter();
    const rumorParts = town.mode === "tavernRumor" ? getTavernRumorTypewriterParts(text) : null;
    if (!town.active || !townTypewriter.enabled || (!isNpcTownMessage(text) && !rumorParts)) {
      townTypewriter.lastRenderedText = text;
      playPendingFacilityVoice();
      return;
    }
    townTypewriter.sourceText = text;
    townTypewriter.prefixText = rumorParts?.prefix || "";
    townTypewriter.typingText = rumorParts?.dialogue || text;
    townTypewriter.suffixText = rumorParts?.suffix || "";
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
  return /^[^\n：「]{1,20}(?:：|「)/.test(String(text || ""));
}

function renderTownTypewriter() {
  const characters = Array.from(townTypewriter.typingText);
  townTypewriter.visibleLength = Math.min(townTypewriter.visibleLength + 1, characters.length);
  const completed = townTypewriter.visibleLength >= characters.length;
  townTypewriter.lastRenderedText = `${townTypewriter.prefixText}${characters.slice(0, townTypewriter.visibleLength).join("")}${completed ? townTypewriter.suffixText : ""}`;
  town.messageEl.textContent = townTypewriter.lastRenderedText;
  if (completed) {
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
  townTypewriter.visibleLength = Array.from(townTypewriter.typingText).length;
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
  if (town.mode === "questAcceptanceReward") {
    if (action !== "confirm") return true;
    town.playSe("itemGet");
    const rewardMessage = town.questAcceptanceRewardMessage;
    town.questAcceptanceRewardMessage = "";
    renderFacility();
    town.messageEl.textContent = rewardMessage;
    town.onStateChanged();
    return true;
  }
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
      const acceptedMessage = result.acceptedMessage || (quest?.id === "guild_001_abyss_rat"
        ? "ギルドマスター：これでお前の実力を試させてもらうぜ。"
        : "ギルドマスター：よし。頼んだぞ。");
      town.messageEl.textContent = acceptedMessage;
      renderFacility();
      town.messageEl.textContent = acceptedMessage;
      if (result.acceptanceRewardCardId || result.acceptanceSupplyItemId) {
        town.questAcceptanceRewardMessage = result.acceptanceRewardMessage;
        town.mode = "questAcceptanceReward";
      }
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
      town.messageEl.textContent = result.message || (result.eventRewardCardId
        ? "ギルドマスター：三つの依頼、すべてよくやってくれた。これは俺からの餞別だ。女神の恩寵がお前を守ってくれるだろう。"
        : quest?.id === "guild_001_abyss_rat"
          ? "ギルドマスター：よくやってくれた！これなら先に進んでも大丈夫だろう。もっとも、生き残れるかはお前次第、だがな。"
          : "ギルドマスター：依頼達成、よくやってくれた！また頼むぜ。");
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
    const pageSize = getQuestPageSize();
    const pageIndexes = visibleQuestIndexes.slice(town.questPage * pageSize, (town.questPage + 1) * pageSize);
    town.playSe("cursorMove");
    const currentPosition = Math.max(0, pageIndexes.indexOf(town.questIndex));
    const direction = action === "down" ? 1 : pageIndexes.length - 1;
    town.questIndex = pageIndexes[
      (currentPosition + direction) % pageIndexes.length
    ];
    town.questPointerArmedIndex = -1;
    renderGuildQuestList();
    return true;
  }
  if (["left", "right"].includes(action)) {
    const visibleQuestIndexes = getVisibleQuestIndexes();
    const pageSize = getQuestPageSize();
    const pageCount = Math.max(1, Math.ceil(visibleQuestIndexes.length / pageSize));
    if (pageCount <= 1) return true;
    town.playSe("cursorMove");
    town.questPage = (town.questPage + (action === "right" ? 1 : pageCount - 1)) % pageCount;
    town.questIndex = visibleQuestIndexes[town.questPage * pageSize] ?? visibleQuestIndexes[0] ?? 0;
    town.questPointerArmedIndex = -1;
    renderGuildQuestList();
    return true;
  }
  if (action !== "confirm") return true;
  town.questPointerArmedIndex = -1;
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
    town.transferPointerArmedIndex = -1;
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
    .map((button, index) => button.disabled ? -1 : index)
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
  town.facilityPreviewCommand = "";
  renderFacility();
}

function isLibraryPreviewCommand(command) {
  return currentFacility().id === "library" && ["records", "cards"].includes(command);
}

function previewLibraryCommand(command) {
  if (!isLibraryPreviewCommand(command)) {
    town.facilityPreviewCommand = "";
    return false;
  }
  town.messageEl.textContent = command === "records"
    ? "司書イライザ：あなたの冒険の記録をまとめておいたわ。積み重ねてきた足跡を、ゆっくり振り返ってみて。"
    : "司書イライザ：あなたが手にしたカードを記録してあるわ。気になる一枚を選んでみて。";
  town.facilityPreviewCommand = command;
  return true;
}

function beginFacilitySelection() {
  town.suppressFestivalPortraitUntilTempleExit = false;
  town.subFacilityId = "";
  town.mode = "selection";
  town.selectedIndex = nearestSelectableIndex(town.selectedIndex, 1);
  renderTownView();
}

export function showTownArrival({ playNameBanner = false, firstVisit = false } = {}) {
  if (!town.active || town.registrationRequired) return false;
  town.mode = "selection";
  town.suppressFestivalPortraitUntilTempleExit = false;
  town.subFacilityId = "";
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

function currentFacility() {
  if (town.subFacilityId === "tavern") return TAVERN_FACILITY;
  if (town.subFacilityId === "npcHire") return NPC_HIRE_FACILITY;
  const facility = TOWN_FACILITIES[town.selectedIndex] || getTownFacility("guild");
  const character = town.getCharacter();
  if (facility.id === "shop" && shouldUseHelenHiddenPortrait(character)) {
    return { ...facility, image: HELEN_HIDDEN_EVENT_PORTRAIT };
  }
  if (facility.id !== "temple" || !isAnastasiaAssigned(character)) return facility;
  const festivalPortrait = isAnastasiaOutfitEventPending(character)
    || (!town.suppressFestivalPortraitUntilTempleExit && shouldUseAnastasiaFestivalPortrait(character));
  return {
    ...facility,
    keeper: "助祭アナスタシア",
    image: festivalPortrait ? "images/npc/NPC_12d.avif" : "images/npc/NPC_12c.avif",
    greeting: !town.suppressFestivalPortraitUntilTempleExit && isAnastasiaFestivalSunday(character)
      ? "きょ、今日はルミナ様に祈りを捧げる特別な日なので…。"
      : "さぁ、女神様に祈りを捧げましょう。"
  };
}

function templeKeeper() {
  return isAnastasiaAssigned(town.getCharacter()) ? "助祭アナスタシア" : "司祭アーヴァイン";
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
  const facility = currentFacility();
  const innNotice = facility.id === "inn" ? town.onEnterInn() : null;
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
  if (innNotice?.message) {
    town.messageEl.textContent = innNotice.message;
  } else if (facility.id === "inn" && !town.getCharacter()?.eventFlags?.inn_visited) {
    const visitor = town.getCharacter();
    visitor.eventFlags = { ...(visitor.eventFlags || {}), inn_visited: true };
    town.messageEl.textContent = "女将ヨハンナ：おや？初めて見る顔だね？どこから来たんだい？";
  } else {
    town.messageEl.textContent = facility.keeper ? `${facility.keeper}：${facility.greeting}` : facility.greeting;
  }
  if (facility.id === "shop") {
    const notice = town.onEnterShop();
    if (notice?.message) town.messageEl.textContent = notice.message;
    const dialogue = Array.isArray(notice?.dialogue) ? notice.dialogue.filter(Boolean) : [];
    if (dialogue.length) {
      town.facilityTalkDialogue = dialogue;
      town.facilityTalkDialogueIndex = 0;
      town.facilityTalkCompletionFlag = notice.completionFlag || "";
      town.messageEl.textContent = dialogue[0];
      town.mode = "facilityTalk";
    }
  }
  const portraitImage = facility.id === "inn" && hasBorrowedJohannaCat(town.getCharacter())
    ? "images/npc/NPC_11c.avif"
    : facility.image;
  town.portrait.hidden = !portraitImage;
  town.portraitPlaceholder.hidden = Boolean(portraitImage);
  if (portraitImage) {
    town.portrait.src = portraitImage;
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
  } else if (town.mode !== "facilityTalk") {
    town.mode = "facilityMenu";
    showFacilityCommands(facility.id);
  }
  if (facility.id === "temple" && isAnastasiaOutfitEventPending(town.getCharacter())) {
    town.facilityTalkDialogue = [
      "助祭アナスタシア：こっ、これは……黄金の稲穂の女神、ルミナ様に特別な祈りを捧げる祝祭の儀礼で着用する衣装なんです……。\nその……あなたに、見ていただきたくて……。\n＊Aボタンで次へ"
    ];
    town.facilityTalkDialogueIndex = 0;
    town.facilityTalkCompletionFlag = ANASTASIA_OUTFIT_EVENT_FLAG;
    town.messageEl.textContent = town.facilityTalkDialogue[0];
    town.mode = "facilityTalk";
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

function hasBorrowedJohannaCat(character) {
  return Boolean(character?.keyItems?.owned?.johanna_calico_cat);
}

function renderDungeonEntrance() {
  town.onAmbienceChanged(false);
  town.onBgmChanged("");
  town.pendingVoiceFacility = "";
  showEntranceCommands();
  town.transferOverlay.hidden = true;
  town.commandRoot.hidden = false;
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
  town.commandRoot.hidden = true;
  town.transferOverlay.hidden = !town.transferUnlocked;
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
  const destinations = getTransferDestinations();
  town.transferIndex = Math.max(0, Math.min(town.transferIndex, destinations.length - 1));
  town.transferPage = Math.floor(town.transferIndex / 5);
  town.messageEl.textContent = town.transferUnlocked
    ? "転送先を選んでください。"
    : "まだ入ることは出来ない。";
  renderTransferDestinationList(destinations);
  resetTownViewport();
  town.onStateChanged();
}

function renderEntranceSelection() {
  town.entranceButtons.forEach((button, index) => {
    const selectedIndex = town.mode === "transferCircle" ? town.transferIndex : town.entranceIndex;
    button.classList.toggle("is-selected", index === selectedIndex && !button.disabled);
    const unavailable = town.mode !== "transferCircle"
      && button.dataset.entranceCommand === "circle" && !town.transferUnlocked;
    button.classList.toggle("is-unavailable", unavailable);
    button.setAttribute("aria-disabled", String(unavailable));
  });
}

function getTransferDestinations() {
  return getUnlockedTransferDestinations(town.getCharacter?.());
}

function changeTransferPage(direction) {
  const destinations = getTransferDestinations();
  const pageCount = Math.max(1, Math.ceil(destinations.length / 5));
  if (pageCount <= 1 || !Number.isFinite(direction) || direction === 0) return;
  town.playSe("cursorMove");
  town.transferPage = (town.transferPage + (direction > 0 ? 1 : pageCount - 1)) % pageCount;
  town.transferIndex = Math.min(town.transferPage * 5, destinations.length - 1);
  town.transferPointerArmedIndex = -1;
  renderTransferDestinationList(destinations);
}

function activateTransferSelection(index) {
  const destination = getTransferDestinations()[index];
  if (!destination) return;
  if (town.transitioning) return;
  town.transitioning = true;
  Promise.resolve(town.onUseTransfer(destination.depth)).finally(() => { town.transitioning = false; });
}

function renderTransferDestinationList(destinations = getTransferDestinations()) {
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(destinations.length / pageSize));
  town.transferPage = Math.max(0, Math.min(town.transferPage, pageCount - 1));
  const start = town.transferPage * pageSize;
  const pageItems = destinations.slice(start, start + pageSize);
  town.transferList.replaceChildren(...pageItems.map((destination, offset) => {
    const index = start + offset;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = destination.label;
    button.classList.toggle("is-selected", index === town.transferIndex);
    button.addEventListener("click", () => {
      if (town.transferPointerArmedIndex === index) {
        town.transferPointerArmedIndex = -1;
        activateTransferSelection(index);
        return;
      }
      town.playSe("cursorMove");
      town.transferIndex = index;
      town.transferPointerArmedIndex = index;
      renderTransferDestinationList(destinations);
    });
    return button;
  }));
  const indicator = town.transferPager.querySelector("strong");
  if (indicator) indicator.textContent = `${town.transferPage + 1}/${pageCount}`;
  town.transferPager.querySelectorAll("button").forEach(button => { button.disabled = pageCount <= 1; });
}

function showFacilityCommands(facilityId) {
  town.commandRoot.hidden = false;
  if (town.transferOverlay) town.transferOverlay.hidden = true;
  const commands = FACILITY_COMMANDS[facilityId] || FACILITY_COMMANDS.inn;
  const requestUnlocked = Boolean(town.getCharacter()?.eventFlags?.guild_first_request_unlocked);
  const reportAvailable = facilityId === "guild" && hasActiveQuest(town.getCharacter());
  town.facilityCommandButtons.forEach((button, index) => {
    const [id, label] = commands[index];
    const empty = !label;
    const unimplemented = facilityId === "tavern" && UNIMPLEMENTED_TAVERN_COMMANDS.has(id);
    const available = id === "return"
      || id === "stay"
      || id === "heal"
      || (facilityId === "temple" && id === "donate")
      || (facilityId === "temple" && id === "rename")
      || (facilityId === "shop" && id === "buy")
      || (facilityId === "shop" && ["sell", "buyback", "storage"].includes(id))
      || id === "deck"
      || (facilityId === "guild" && id === "accept" && requestUnlocked)
      || (facilityId === "guild" && id === "report" && reportAvailable)
      || (facilityId === "guild" && ["history", "tavern"].includes(id))
      || (facilityId === "library" && id === "records")
      || (facilityId === "library" && id === "cards")
      || (facilityId === "tavern" && id === "npc-hire" && NPC_SUPPORT_ENABLED)
      || (facilityId === "npcHire" && ["npc-search", "npc-roster", "npc-hire-return"].includes(id))
      || (facilityId === "tavern" && id === "rumors" && Boolean(town.getUnreadRumor()))
      || (facilityId === "tavern" && id === "past-rumors")
      || (id === "talk" && ["guild", "inn", "temple", "shop", "library", "tavern"].includes(facilityId));
    button.dataset.facilityCommand = id;
    button.textContent = label;
    button.disabled = empty || unimplemented;
    button.classList.toggle("is-empty", empty);
    button.classList.toggle("is-unavailable", !empty && !available);
    button.setAttribute("aria-disabled", String(!empty && !available));
  });
  if (town.facilityCommandButtons[town.facilityCommandIndex]?.disabled) {
    town.facilityCommandIndex = town.facilityCommandButtons.findIndex(
      button => !button.disabled && button.getAttribute("aria-disabled") !== "true"
    );
  }
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
    requestTempleHealing();
    return true;
  }
  if (command === "rename") {
    requestTempleRename();
    return true;
  }
  if (command === "deck") {
    town.onEditDeck();
    return true;
  }
  if (command === "history") {
    if (currentFacility().id !== "guild") return false;
    town.onOpenQuestHistory();
    return true;
  }
  if (command === "past-rumors") {
    if (currentFacility().id !== "tavern") return false;
    town.onOpenRumorHistory();
    return true;
  }
  if (command === "records") {
    if (currentFacility().id !== "library") return false;
    town.messageEl.textContent = "司書イライザ：あなたの冒険の記録をまとめておいたわ。積み重ねてきた足跡を、ゆっくり振り返ってみて。";
    town.onOpenAdventureRecords();
    return true;
  }
  if (command === "cards") {
    if (currentFacility().id !== "library") return false;
    town.messageEl.textContent = "司書イライザ：あなたが手にしたカードを記録してあるわ。気になる一枚を選んでみて。";
    town.onOpenCardGallery();
    return true;
  }
  if (command === "tavern") {
    if (currentFacility().id !== "guild") return false;
    town.subFacilityId = "tavern";
    town.facilityCommandIndex = 0;
    renderFacility();
    return true;
  }
  if (command === "npc-hire") {
    if (currentFacility().id !== "tavern" || !NPC_SUPPORT_ENABLED) return false;
    town.subFacilityId = "npcHire";
    town.facilityCommandIndex = 0;
    renderFacility();
    return true;
  }
  if (command === "npc-search" || command === "npc-roster") {
    if (currentFacility().id !== "npcHire") return false;
    openNpcManagement(command === "npc-search" ? "search" : "roster");
    return true;
  }
  if (command === "npc-hire-return") {
    if (currentFacility().id !== "npcHire") return false;
    town.subFacilityId = "tavern";
    town.facilityCommandIndex = 0;
    renderFacility();
    return true;
  }
  if (command === "rumors") {
    if (currentFacility().id !== "tavern") return false;
    const rumor = town.getUnreadRumor();
    if (!rumor?.dialogue?.length) return false;
    town.activeRumor = rumor;
    town.rumorDialogue = [...rumor.dialogue];
    town.rumorDialogueIndex = 0;
    town.mode = "tavernRumor";
    town.messageEl.textContent = town.rumorDialogue[0];
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
    const newStockIds = town.onViewShopCategory("items") || [];
    town.messageEl.textContent = "女主人ヘレン：道具を選んでちょうだい。";
    town.onOpenPurchaseInventory("items", newStockIds);
    return true;
  }
  if (command === "shop-equipment") {
    const newStockIds = town.onViewShopCategory("equipment") || [];
    town.messageEl.textContent = "女主人ヘレン：装備品を選んでちょうだい。";
    town.onOpenPurchaseInventory("equipment", newStockIds);
    return true;
  }
  if (command === "shop-return") {
    renderFacility();
    return true;
  }
  if (command === "talk") {
    const facility = currentFacility();
    if (!["guild", "inn", "temple", "shop", "library", "tavern"].includes(facility?.id)) return false;
    const result = town.onTalk(facility?.id);
    const dialogue = Array.isArray(result?.dialogue) ? result.dialogue.filter(Boolean) : [];
    const message = dialogue[0] || (typeof result === "string" ? result : result?.message);
    town.pendingVoiceFacility = facility.id === "inn" ? "inn" : "";
    if (message) town.messageEl.textContent = message;
    if (dialogue.length) {
      town.facilityTalkDialogue = dialogue;
      town.facilityTalkDialogueIndex = 0;
      town.facilityTalkCompletionFlag = result.completionFlag || "";
      town.mode = "facilityTalk";
    }
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

function requestTempleHealing() {
  town.mode = "templeHealConfirm";
  town.playSe("confirm");
  const fee = Math.max(2, Math.floor(Number(town.getCharacter()?.level) || 1) * 2);
  town.messageEl.textContent = `${templeKeeper()}：${fee}Gの寄進で治療を行います。よろしいですか？\n＊Aボタン：はい　Bボタン：いいえ`;
}

function handleTempleHealConfirmationInput(action) {
  if (action === "confirm") {
    town.playSe("confirm");
    town.mode = "facilityMenu";
    town.onHeal();
    town.onStateChanged();
    return true;
  }
  if (action === "cancel") {
    town.playSe("cancel");
    town.mode = "facilityMenu";
    town.messageEl.textContent = `${templeKeeper()}：承知しました。必要な時はいつでもお申し付けください。`;
    return true;
  }
  return true;
}

function requestTempleRename() {
  town.mode = "templeRenameConfirm";
  town.playSe("confirm");
  town.messageEl.textContent = `${templeKeeper()}：魂と紐付けられた名前を変えるには、女神様への寄進が必要です。\n${CHARACTER_RENAME_COST.toLocaleString("ja-JP")}G寄進しますか？\n＊Aボタン：はい　Bボタン：いいえ`;
}

function handleTempleRenameConfirmationInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    town.mode = "facilityMenu";
    renderFacilityCommandSelection();
    return true;
  }
  if (action !== "confirm") return true;
  town.playSe("confirm");
  const gold = Math.max(0, Math.floor(Number(town.getCharacter()?.gold) || 0));
  if (gold < CHARACTER_RENAME_COST) {
    town.mode = "facilityMenu";
    town.messageEl.textContent = `${templeKeeper()}：申し訳ありませんが、魂の名を書き換えるには10,000Gの寄進が必要なのです。`;
    return true;
  }
  town.messageEl.textContent = `${templeKeeper()}：では、女神様の前で新たな魂の名前を口にしてください…！`;
  openTempleRenameInput();
  return true;
}

function openTempleRenameInput() {
  town.mode = "templeRenameInput";
  town.registration.classList.add("is-renaming");
  town.registration.dataset.mode = "rename";
  town.nameInput.value = town.getCharacter()?.name || "";
  town.nameInput.maxLength = CHARACTER_NAME_MAX_LENGTH;
  town.jobSelect.closest("label").hidden = true;
  town.registration.querySelector('button[type="submit"]').textContent = "改名";
  town.feedback.textContent = "";
  town.registration.hidden = false;
  town.commandRoot.hidden = true;
  requestAnimationFrame(() => town.nameInput.focus({ preventScroll: true }));
}

function handleTempleRenameInput(action) {
  if (action === "cancel") {
    town.playSe("cancel");
    closeTempleRenameInput();
    town.messageEl.textContent = `${templeKeeper()}：承知しました。魂の名はそのままといたしましょう。`;
    return true;
  }
  if (action === "confirm") {
    town.playSe("confirm");
    town.registration.requestSubmit();
  }
  return true;
}

function renameCharacterAtTemple() {
  const name = normalizeCharacterName(town.nameInput.value);
  if (!name) {
    town.feedback.textContent = "名前を入力してください。";
    town.nameInput.focus({ preventScroll: true });
    return false;
  }
  const result = town.onRename(name);
  if (!result?.accepted) {
    town.feedback.textContent = result?.reason === "insufficientGold"
      ? "GOLDが足りません。"
      : "改名できませんでした。";
    return false;
  }
  closeTempleRenameInput();
  renderCharacterStatus();
  town.messageEl.textContent = `${templeKeeper()}：……確かに承りました。これより、その名こそがあなたの魂の名です。`;
  town.onStateChanged();
  return true;
}

function closeTempleRenameInput() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  town.registration.hidden = true;
  town.registration.classList.remove("is-renaming");
  delete town.registration.dataset.mode;
  town.jobSelect.closest("label").hidden = false;
  town.commandRoot.hidden = false;
  town.mode = "facilityMenu";
  updateRegistrationLanguage();
  showFacilityCommands("temple");
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

function openNpcManagement(kind) {
  const state = town.getCharacter()?.npcSystem || {};
  const registered = new Set(state.registeredIds || []);
  const active = new Set(state.activeIds || []);
  town.npcManagementKind = kind;
  town.npcManagementConfirm = false;
  town.npcManagementIndex = 0;
  town.npcManagementPointerArmedIndex = -1;
  town.npcManagementItems = kind === "search"
    ? NPC_DEFINITIONS.filter(npc => !registered.has(npc.id))
    : NPC_DEFINITIONS.filter(npc => registered.has(npc.id)).map(npc => ({ ...npc, active: active.has(npc.id) }));
  town.mode = "npcManagement";
  town.commerceOverlay.classList.add("is-npc-management");
  if (town.storageTabs) town.storageTabs.hidden = true;
  town.npcManagementReturn = { mode: "facilityMenu", subFacilityId: town.subFacilityId, selectedIndex: town.selectedIndex };
  town.commerceOverlay.hidden = false;
  town.guildQuestOverlay.hidden = true;
  town.commerceTitle.textContent = kind === "search" ? "NPCを探す" : "名簿から雇用";
  renderNpcManagement();
  resetTownViewport();
}

export function openPendingNpcRenewal() {
  const renewal = town.getCharacter()?.npcSystem?.renewal;
  if (!town.active || !renewal?.pending) return false;
  const pendingIds = (renewal.ids || []).filter(id => !(renewal.completedIds || []).includes(id));
  if (town.mode !== "npcManagement") {
    town.npcManagementReturn = { mode: town.mode, subFacilityId: town.subFacilityId, selectedIndex: town.selectedIndex };
  }
  town.npcManagementKind = "renewal";
  town.npcManagementConfirm = false;
  town.npcManagementIndex = 0;
  town.npcManagementPointerArmedIndex = -1;
  town.npcManagementItems = pendingIds.map(getNpcDefinition).filter(Boolean);
  if (!town.npcManagementItems.length) return false;
  town.mode = "npcManagement";
  town.commerceOverlay.classList.add("is-npc-management");
  if (town.storageTabs) town.storageTabs.hidden = true;
  town.commandRoot.hidden = true;
  town.commerceOverlay.hidden = false;
  town.guildQuestOverlay.hidden = true;
  town.commerceTitle.textContent = "雇用更新";
  renderNpcManagement();
  return true;
}

function renderNpcManagement() {
  const character = town.getCharacter();
  town.npcManagementIndex = Math.max(0, Math.min(town.npcManagementIndex, town.npcManagementItems.length - 1));
  town.commerceList.replaceChildren(...town.npcManagementItems.map((npc, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "town-commerce-entry";
    button.dataset.npcIndex = String(index);
    button.classList.toggle("is-selected", index === town.npcManagementIndex);
    const name = document.createElement("span");
    name.textContent = `${npc.name}【${npc.jobLabel}】`;
    const state = document.createElement("small");
    state.textContent = npc.active ? "同行中" : town.npcManagementKind === "search" ? "無料" : `${getNpcHireFee(character)}G`;
    button.append(name, state);
    return button;
  }));
  town.commerceList.children[town.npcManagementIndex]?.scrollIntoView?.({ block: "nearest" });
  if (town.commerceGold) town.commerceGold.textContent = Math.max(0, Number(character?.gold) || 0).toLocaleString("en-US");
  const npc = town.npcManagementItems[town.npcManagementIndex];
  if (!npc) {
    town.portrait.hidden = true;
    town.messageEl.textContent = town.npcManagementKind === "search"
      ? "現在、名簿へ登録できるNPCはいません。\n＊Bボタン：戻る"
      : "名簿に登録されたNPCはいません。\n＊Bボタン：戻る";
    return;
  }
  town.portrait.src = npc.image;
  town.portrait.alt = `${npc.name}【${npc.jobLabel}】`;
  town.portrait.hidden = false;
  town.portraitPlaceholder.hidden = true;
  const fee = getNpcHireFee(character);
  if (town.npcManagementKind === "renewal") {
    town.messageEl.textContent = `${npc.name}を引き続き雇用しますか？\n更新費用：${fee}G　所持金：${character.gold}G\n＊Aボタン：はい　Bボタン：いいえ`;
  } else if (town.npcManagementConfirm) {
    town.messageEl.textContent = town.npcManagementKind === "search"
      ? `${npc.name}【${npc.jobLabel}】を名簿へ登録しますか？\n登録料：無料\n＊Aボタン：はい　Bボタン：いいえ`
      : `${npc.name}【${npc.jobLabel}】を雇用しますか？\n雇用費：${fee}G　所持金：${character.gold}G\n＊Aボタン：はい　Bボタン：いいえ`;
  } else {
    town.messageEl.textContent = `${npc.name}【${npc.jobLabel}】\n${npc.supportDescription}\n＊Aボタン：選択　Bボタン：戻る`;
  }
}

function handleNpcManagementInput(action) {
  if (town.npcManagementGreeting) {
    if (!["confirm", "cancel"].includes(action)) return true;
    town.npcManagementGreeting = false;
    town.portrait.classList.remove("is-hire-greeting");
    town.commerceOverlay.hidden = false;
    town.playSe(action === "confirm" ? "confirm" : "cancel");
    openNpcManagement(town.npcManagementKind);
    return true;
  }
  if (["up", "down", "left", "right"].includes(action)) {
    if (!town.npcManagementItems.length || town.npcManagementConfirm || town.npcManagementKind === "renewal") return true;
    const amount = action === "up" || action === "left" ? -1 : 1;
    town.npcManagementIndex = (town.npcManagementIndex + amount + town.npcManagementItems.length) % town.npcManagementItems.length;
    town.npcManagementPointerArmedIndex = -1;
    town.playSe("cursorMove");
    renderNpcManagement();
    return true;
  }
  const npc = town.npcManagementItems[town.npcManagementIndex];
  if (town.npcManagementKind === "renewal") {
    if (!npc || !["confirm", "cancel"].includes(action)) return true;
    const result = town.onRenewNpc(npc.id, action === "confirm");
    town.playSe(result?.continued ? "confirm" : "cancel");
    if (result?.forcedDismissal) {
      town.messageEl.textContent = `雇用費を支払えないため、\n${npc.name}との同行を終了した。`;
      window.setTimeout(() => {
        if (!openPendingNpcRenewal()) closeNpcManagement();
      }, 1200);
    } else if (!openPendingNpcRenewal()) closeNpcManagement();
    return true;
  }
  if (action === "cancel") {
    if (town.npcManagementConfirm) {
      town.npcManagementConfirm = false;
      town.playSe("cancel");
      renderNpcManagement();
    } else {
      town.playSe("cancel");
      closeNpcManagement();
    }
    return true;
  }
  if (action !== "confirm" || !npc) return true;
  if (!town.npcManagementConfirm) {
    if (npc.active) {
      town.playSe("cursorMove");
      town.messageEl.textContent = `${npc.name}はすでに同行中です。`;
      return true;
    }
    town.npcManagementConfirm = true;
    town.playSe("confirm");
    renderNpcManagement();
    return true;
  }
  const result = town.npcManagementKind === "search" ? town.onRegisterNpc(npc.id) : town.onHireNpc(npc.id);
  town.playSe(result?.accepted ? "item" : "cursorMove");
  if (!result?.accepted) {
    const reason = ({ insufficientGold: "所持金が足りません。", partyFull: "同行枠は3人までです。",
      duplicateJob: "同じ職業のNPCは同時に雇用できません。", alreadyActive: "すでに同行中です。" })[result?.reason] || "手続きを完了できませんでした。";
    town.npcManagementConfirm = false;
    town.messageEl.textContent = reason;
    return true;
  }
  if (town.npcManagementKind === "roster") {
    showNpcHireGreeting(npc);
  } else {
    openNpcManagement(town.npcManagementKind);
  }
  return true;
}

const NPC_HIRE_GREETINGS = Object.freeze({
  alec: "よう！よろしく！",
  rebecca: "…アタシの足を引っ張るなよ？",
  erika: "あなたに黄金の稲穂の女神が微笑みますように…。",
  johan: "よろしくな。若造！"
});

function showNpcHireGreeting(npc) {
  town.npcManagementConfirm = false;
  town.npcManagementGreeting = true;
  town.npcManagementPointerArmedIndex = -1;
  town.commerceOverlay.hidden = true;
  town.portrait.src = npc.image;
  town.portrait.alt = `${npc.name}【${npc.jobLabel}】`;
  town.portrait.hidden = false;
  town.portraitPlaceholder.hidden = true;
  town.portrait.classList.add("is-hire-greeting");
  town.messageEl.textContent = `${npc.name}「${NPC_HIRE_GREETINGS[npc.id] || "よろしく。"}」`;
}

function closeNpcManagement() {
  const destination = town.npcManagementReturn;
  town.npcManagementReturn = null;
  town.npcManagementKind = "";
  town.npcManagementItems = [];
  town.npcManagementConfirm = false;
  town.npcManagementGreeting = false;
  town.npcManagementPointerArmedIndex = -1;
  town.portrait.classList.remove("is-hire-greeting");
  town.commerceOverlay.hidden = true;
  town.commerceOverlay.classList.remove("is-npc-management");
  town.commandRoot.hidden = false;
  if (destination) {
    town.subFacilityId = destination.subFacilityId || "";
    town.selectedIndex = Number.isInteger(destination.selectedIndex) ? destination.selectedIndex : town.selectedIndex;
  }
  if (destination?.mode === "dungeonEntrance") {
    town.mode = "dungeonEntrance";
    renderDungeonEntrance();
    return;
  }
  if (destination?.mode === "selection" || destination?.mode === "arrival") {
    showTownArrival();
    return;
  }
  renderFacility();
}

function getStorageEquipmentEntries(kind) {
  const character = town.getCharacter();
  const instances = kind === "storageWithdraw"
    ? character?.warehouse?.equipmentInstances || []
    : character?.equipmentInventory?.instances || [];
  const equippedIds = new Set(Object.values(character?.equippedInstanceIds || {}));
  return instances.map(instance => {
    const definition = getEquipmentInstanceDefinition(instance);
    return definition ? {
      ...definition,
      id: instance.instanceId,
      name: `${getEquipmentInstanceName(instance)}${instance.locked ? "［LOCK］" : ""}`,
      instance,
      storageEquipment: true,
      equipped: kind === "storageDeposit" && equippedIds.has(instance.instanceId)
    } : null;
  }).filter(Boolean);
}

function buildCommerceItems(kind) {
  const character = town.getCharacter();
  if (kind.startsWith("storage") && town.storageCategory === "equipment") {
    return getStorageEquipmentEntries(kind);
  }
  const buybackEntries = kind === "buybackEquipment" ? (character?.equipmentBuyback || []) : [];
  const itemBuybackEntries = kind === "buybackEquipment" ? (character?.itemBuyback || []) : [];
  const ids = kind === "donate"
    ? ["exorcism_talisman", "holy_water"]
    : kind === "storageWithdraw"
      ? [...new Set((character?.warehouse?.itemStacks || []).map(stack => stack.itemId))]
    : kind === "storageDeposit"
      ? Object.keys(character?.inventory?.counts || {})
    : kind === "sell"
      ? Object.keys(character?.inventory?.counts || {}).filter(id => getItem(id)?.sellPrice > 0)
      : kind === "buyEquipment"
        ? []
        : getShopItemIdsForCharacter(character);
  return kind === "buybackEquipment"
    ? [
      ...buybackEntries.map(entry => {
        const definition = getEquipmentInstanceDefinition(entry.instance);
        return definition ? { ...definition, id: entry.instance.instanceId, buybackEntryId: entry.entryId || entry.instance.instanceId, name: getEquipmentInstanceName(entry.instance), buyPrice: entry.price, buybackKind: "equipment" } : null;
      }),
      ...itemBuybackEntries.map(entry => {
        const definition = getItem(entry.itemId);
        const amount = Math.max(1, Math.floor(Number(entry.amount) || 1));
        return definition ? { ...definition, buybackEntryId: entry.entryId || entry.itemId, name: `${definition.name}${amount > 1 ? ` ×${amount}` : ""}`, buyPrice: entry.price, buybackKind: "item" } : null;
      })
    ].filter(Boolean)
    : kind === "buyEquipment"
      ? getShopEquipmentStock(character)
      : ids.map(getItem).filter(Boolean);
}

function renderStorageTabs() {
  const visible = town.commerceKind.startsWith("storage");
  if (!town.storageTabs) return;
  town.storageTabs.hidden = !visible;
  town.storageTabs.querySelectorAll("[data-storage-tab]").forEach(button => {
    button.classList.toggle("is-selected", button.dataset.storageTab === town.storageCategory);
  });
}

function setStorageCategory(category) {
  if (!town.commerceKind.startsWith("storage") || !["items", "equipment"].includes(category)) return;
  if (town.storageCategory !== category) town.playSe("cursorMove");
  town.storageCategory = category;
  town.commerceItems = buildCommerceItems(town.commerceKind);
  town.commerceIndex = 0;
  town.commercePointerArmedIndex = -1;
  renderStorageTabs();
  renderCommerce({ showDescription: false });
  const action = town.commerceKind === "storageWithdraw" ? "取り出せる" : "預けられる";
  const categoryLabel = category === "equipment" ? "装備品" : "道具";
  town.messageEl.textContent = town.commerceItems.length
    ? `女主人ヘレン：${action}${categoryLabel}を選んで。`
    : `女主人ヘレン：${action}${categoryLabel}はないようね。`;
}

function openCommerce(kind) {
  if (town.commerceQuantityControls) town.commerceQuantityControls.hidden = true;
  town.mode = "commerce";
  town.commerceKind = kind;
  if (kind.startsWith("storage")) town.storageCategory = "items";
  town.commerceItems = buildCommerceItems(kind);
  town.commerceIndex = 0;
  town.commercePointerArmedIndex = -1;
  town.commerceTitle.textContent = kind === "donate" ? "寄進" : kind === "sell" ? "売却" : kind.startsWith("storage") ? "倉庫" : "購入";
  town.commerceOverlay.hidden = false;
  renderStorageTabs();
  town.guildQuestOverlay.hidden = true;
  town.messageEl.textContent = kind === "donate"
    ? `${templeKeeper()}：いずれを女神へ寄進されますか？\n＊Aボタン：決定　Bボタン：戻る`
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
  if (town.commerceKind.startsWith("storage") && ["left", "right"].includes(action)) {
    setStorageCategory(town.storageCategory === "items" ? "equipment" : "items");
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
  if (item.storageEquipment && item.equipped) {
    town.playSe("cursorMove");
    town.messageEl.textContent = "女主人ヘレン：装備中の品は預かれないわ。先に装備を外してね。";
    return;
  }
  if (town.commerceKind === "buy") {
    town.commerceQuantity = 1;
    town.mode = "commerceQuantity";
    renderCommerceQuantity();
    return;
  }
  if (["sell", "storageDeposit", "storageWithdraw"].includes(town.commerceKind)) {
    const owned = town.commerceKind === "storageWithdraw"
      ? warehouseItemCount(item.id)
      : Math.max(0, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item.id]) || 0));
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
  if (town.commerceQuantityControls) town.commerceQuantityControls.hidden = true;
  town.mode = "commerceConfirm";
  town.messageEl.textContent = item.storageEquipment && town.commerceKind === "storageWithdraw"
    ? `女主人ヘレン：${item.name}を取り出すのね？\n＊Aボタン：はい　Bボタン：いいえ`
    : item.storageEquipment && town.commerceKind === "storageDeposit"
      ? `女主人ヘレン：${item.name}を預かればいいのね？\n＊Aボタン：はい　Bボタン：いいえ`
    : town.commerceKind === "donate"
    ? `${templeKeeper()}：こちらでよろしいですか？\n＊Aボタン：はい　Bボタン：いいえ`
    : town.commerceKind === "storageWithdraw"
      ? `女主人ヘレン：${item.name}を${town.commerceQuantity || 1}個取り出すのね？\n＊Aボタン：はい　Bボタン：いいえ`
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
  const owned = town.commerceKind === "storageWithdraw"
    ? Math.max(1, warehouseItemCount(item.id))
    : Math.max(1, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item.id]) || 1));
  const maximum = town.commerceKind === "buy"
    ? 99
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
    if (town.commerceQuantityControls) town.commerceQuantityControls.hidden = true;
    town.messageEl.textContent = "女主人ヘレン：あら、残念。";
    return true;
  }
  return true;
}

function renderCommerceQuantity() {
  const item = town.commerceItems[town.commerceIndex];
  if (town.commerceQuantityControls) town.commerceQuantityControls.hidden = false;
  const owned = Math.max(1, Math.floor(Number(town.getCharacter()?.inventory?.counts?.[item?.id]) || 1));
  town.messageEl.textContent = town.commerceKind === "buy"
    ? `女主人ヘレン：いくつ購入するのかしら？\n購入数 ${town.commerceQuantity}　合計 ${item.buyPrice * town.commerceQuantity}G\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
    : town.commerceKind === "storageDeposit"
    ? `女主人ヘレン：いくつ預かればいいのかしら？\n預ける数 ${town.commerceQuantity} / ${owned}\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
    : town.commerceKind === "storageWithdraw"
      ? `女主人ヘレン：いくつ取り出すのかしら？\n取り出す数 ${town.commerceQuantity} / ${owned}\n＊↑↓：1個　←→：10個　Aボタン：決定　Bボタン：戻る`
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
      ? `${templeKeeper()}：承知しました。`
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
    ? item.storageEquipment
      ? town.onWithdrawEquipment(item.instance.instanceId)
      : town.onWithdrawItem(item.id, town.commerceQuantity || 1)
    : depositing
      ? item.storageEquipment
        ? town.onDepositEquipment(item.instance.instanceId)
        : town.onDepositItem(item.id, town.commerceQuantity || 1)
    : selling
    ? town.onSellItem(item.id, town.commerceQuantity || 1)
    : town.commerceKind === "buyEquipment"
      ? town.onPurchaseEquipment(item.id)
    : town.commerceKind === "buybackEquipment"
        ? item.buybackKind === "item"
          ? town.onBuybackItem(item.buybackEntryId || item.id)
          : town.onBuybackEquipment(item.buybackEntryId || item.id)
      : town.onPurchaseItem(item.id, town.commerceQuantity || 1, { donation: town.commerceKind === "donate" });
  if (!result?.accepted) {
    town.playSe("cursorMove");
    town.messageEl.textContent = result?.reason === "insufficientGold"
      ? (town.commerceKind === "donate"
        ? `${templeKeeper()}：ゴールドが足りません。`
        : "女主人ヘレン：あら、お金が足りないわ。")
      : `${town.commerceKind === "donate" ? templeKeeper() : "女主人ヘレン"}：これ以上は持てないようですね。`;
    town.mode = "commerce";
    return;
  }
  town.playSe("item");
  const keeper = town.commerceKind === "donate" ? templeKeeper() : "女主人ヘレン";
  town.messageEl.textContent = town.commerceKind === "donate"
    ? `${keeper}：女神のご加護を。${item.name}を授けましょう。`
    : withdrawing
      ? item.storageEquipment
        ? `${keeper}：${item.name}を倉庫から取り出したわ。`
        : `${keeper}：${item.name}を${result.amount}個、倉庫から取り出したわ。`
    : depositing
      ? item.storageEquipment
        ? `${keeper}：${item.name}を倉庫で預かったわ。`
        : `${keeper}：${item.name}を${result.amount}個、倉庫で預かったわ。`
    : selling
      ? `${keeper}：${item.name}を${result.quantity}個、${result.value}Gで買い取ったわ。`
    : result.stored > 0
      ? `${keeper}：はい、どうぞ。\n${item.name}はこれ以上持てません。超過分を倉庫へ送りました。`
      : town.commerceKind === "buy" && result.quantity > 1
        ? `${keeper}：${item.name}を${result.quantity}個ね。はい、どうぞ。`
        : `${keeper}：はい、どうぞ。`;
  town.mode = "commerce";
  if (item.storageEquipment
    || ((selling || depositing) && Number(town.getCharacter()?.inventory?.counts?.[item.id] || 0) <= 0)
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
    price.textContent = item.storageEquipment
      ? item.equipped ? "［装備中］" : "×1"
      : town.commerceKind === "storageWithdraw"
      ? `×${warehouseItemCount(item.id)}`
      : town.commerceKind === "storageDeposit"
        ? `×${town.getCharacter()?.inventory?.counts?.[item.id] || 0}`
      : town.commerceKind === "sell"
        ? `${item.sellPrice}G ×${inventoryItemCount(item.id)}`
        : town.commerceKind === "buy"
          ? `${item.buyPrice}G　所持×${inventoryItemCount(item.id)}`
          : `${item.buyPrice}G`;
    button.append(name, price);
    button.classList.toggle("is-unavailable", Boolean(item.equipped));
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
  const buttons = [...town.commerceList.children];
  buttons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === town.commerceIndex);
  });
  buttons[town.commerceIndex]?.scrollIntoView?.({ block: "nearest" });
  const item = town.commerceItems[town.commerceIndex];
  if (showDescription && item) {
    const ownership = town.commerceKind === "buy"
      ? `\n所持数：${inventoryItemCount(item.id)}／${item.maxOwned || 99}　倉庫：${warehouseItemCount(item.id)}`
      : "";
    const description = item.storageEquipment
      ? item.equipped
        ? `${item.description || "装備品"}\n装備中のため預けられません。`
        : item.description || "装備品"
      : item.description;
    town.messageEl.textContent = `${description}${ownership}\n＊Aボタン：決定　Bボタン：戻る`;
  }
}

function openGuildQuestList(kind) {
  town.mode = kind === "report" ? "questReportList" : "questAcceptList";
  town.questIndex = getVisibleQuestIndexes()[0] ?? 0;
  town.questPage = 0;
  town.questPointerArmedIndex = -1;
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

function changeQuestPage(direction) {
  if (!["questAcceptList", "questReportList"].includes(town.mode)) return;
  handleQuestInput(direction > 0 ? "right" : "left");
}

function renderGuildQuestList() {
  const reportMode = town.mode === "questReportList";
  const visibleQuestIndexes = getVisibleQuestIndexes();
  if (!visibleQuestIndexes.includes(town.questIndex)) {
    town.questIndex = visibleQuestIndexes[0] ?? 0;
  }
  const pageSize = getQuestPageSize();
  const pageCount = Math.max(1, Math.ceil(visibleQuestIndexes.length / pageSize));
  town.questPage = Math.max(0, Math.min(town.questPage, pageCount - 1));
  const pageIndexes = visibleQuestIndexes.slice(town.questPage * pageSize, (town.questPage + 1) * pageSize);
  if (!pageIndexes.includes(town.questIndex)) town.questIndex = pageIndexes[0] ?? visibleQuestIndexes[0] ?? 0;
  town.guildQuestList.replaceChildren(...pageIndexes.map(index => {
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
      if (town.questPointerArmedIndex === index) {
        town.questPointerArmedIndex = -1;
        activateSelectedQuest();
        return;
      }
      town.questIndex = index;
      town.questPointerArmedIndex = index;
      town.playSe("cursorMove");
      renderGuildQuestList();
    });
    return button;
  }));
  const pager = town.root.querySelector("#guildQuestPager");
  if (pager) {
    pager.hidden = pageCount <= 1;
    const indicator = pager.querySelector("strong");
    if (indicator) indicator.textContent = `${town.questPage + 1}/${pageCount}`;
    pager.querySelectorAll("button").forEach(button => { button.disabled = pageCount <= 1; });
  }
}

function getVisibleQuestIndexes() {
  const character = town.getCharacter();
  const initialTrialComplete = QUESTS.slice(0, 3).every(quest => getQuestProgress(character, quest.id).completed);
  return QUESTS
    .map((quest, index) => ({ index, progress: getQuestProgress(town.getCharacter(), quest.id) }))
    .filter(({ index }) => initialTrialComplete || index < 3)
    .filter(({ index, progress }) => QUESTS[index].id !== "guild_016" || progress.active || isQuestAvailable(character, QUESTS[index]))
    .filter(({ progress }) => !progress.completed)
    .map(({ index }) => index);
}

function getQuestPageSize() {
  if (document.body.classList.contains("layout-mobile")) return 3;
  if (document.body.classList.contains("layout-tablet")) return 6;
  return Number.MAX_SAFE_INTEGER;
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
      quest.objectiveHeading || (quest.objectiveType === "exploreFloor" ? "目的" : "討伐数"),
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
  const name = normalizeCharacterName(town.nameInput.value);
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
  if (normalizeCharacterName(town.nameInput.value)) {
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
  town.commandRoot.hidden = false;
  if (town.transferOverlay) town.transferOverlay.hidden = true;
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
  town.commandRoot.hidden = false;
  if (town.transferOverlay) town.transferOverlay.hidden = true;
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
  town.commandRoot.hidden = false;
  if (town.transferOverlay) town.transferOverlay.hidden = true;
  if (!town.gameCommandButtons.every(button => button.parentElement === town.commandRoot)) {
    town.commandRoot.replaceChildren(...town.gameCommandButtons);
  }
  delete town.commandRoot.dataset.townActive;
  delete town.commandRoot.dataset.entranceActive;
  delete town.commandRoot.dataset.facilityActive;
  town.commandRoot.setAttribute("aria-label", "ダンジョンコマンド");
}
