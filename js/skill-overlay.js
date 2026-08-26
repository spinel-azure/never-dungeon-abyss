import { getSkills } from "../data/skills.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";

const BATTLE_SKILLS_PER_COLUMN = 6;
const BATTLE_SKILLS_PER_PAGE = BATTLE_SKILLS_PER_COLUMN * 2;
const FIELD_SKILLS_PER_PAGE = 8;

const overlay = {
  root: null,
  list: null,
  messageEl: null,
  pageEl: null,
  prevButton: null,
  nextButton: null,
  backButton: null,
  active: false,
  context: "field",
  selectedIndex: 0,
  page: 0,
  skills: [],
  lastSelectionByContext: {},
  enemy: null,
  getCharacter: () => null,
  onUse: async () => ({ accepted: false }),
  onClose: () => {},
  playSe: () => {},
  previousMessage: ""
};

export function configureSkillOverlay(options) {
  Object.assign(overlay, options);
  overlay.list = overlay.root.querySelector("[data-skill-list]");
  overlay.pageEl = overlay.root.querySelector("[data-skill-page]");
  overlay.prevButton = overlay.root.querySelector("[data-skill-prev]");
  overlay.nextButton = overlay.root.querySelector("[data-skill-next]");
  overlay.backButton = overlay.root.querySelector("[data-skill-back]");
  overlay.backButton.addEventListener("click", closeSkillOverlay);
  overlay.prevButton?.addEventListener("click", () => changePage(-1));
  overlay.nextButton?.addEventListener("click", () => changePage(1));
}

export function openSkillOverlay({ context = "field", character, enemy = null, onUse, onClose } = {}) {
  if (overlay.active || !character) return false;
  overlay.active = true;
  overlay.context = context;
  overlay.skills = getSkills(character.skillIds).filter(skill => context !== "battle" || skill.actionType !== "passive");
  overlay.selectedIndex = restoreSelectedIndex(overlay.skills, overlay.lastSelectionByContext[context]);
  overlay.page = Math.floor(overlay.selectedIndex / getPageSize());
  overlay.enemy = enemy;
  overlay.getCharacter = () => character;
  if (onUse) overlay.onUse = onUse;
  overlay.onClose = onClose || (() => {});
  overlay.previousMessage = overlay.messageEl.textContent;
  overlay.root.classList.toggle("is-field-inventory", context === "field");
  overlay.root.classList.toggle("is-battle-skills", context === "battle");
  overlay.root.hidden = false;
  document.body.classList.add("skill-overlay-open");
  render();
  return true;
}

export function closeSkillOverlay({ restoreMessage = true } = {}) {
  if (!overlay.active) return false;
  overlay.active = false;
  overlay.root.hidden = true;
  overlay.root.classList.remove("is-field-inventory");
  overlay.root.classList.remove("is-battle-skills");
  document.body.classList.remove("skill-overlay-open");
  overlay.messageEl.classList.remove("is-skill-description");
  if (restoreMessage) overlay.messageEl.textContent = overlay.previousMessage;
  overlay.onClose();
  return true;
}

export function isSkillOverlayOpen() {
  return overlay.active;
}

export function handleSkillOverlayInput(action) {
  if (!overlay.active) return false;
  if (action === "cancel") {
    overlay.playSe("cancel");
    closeSkillOverlay();
    return true;
  }
  if (action === "up") {
    moveVertical(-1);
    return true;
  }
  if (action === "down") {
    moveVertical(1);
    return true;
  }
  if (action === "left") {
    if (overlay.context === "battle") moveHorizontal(-1);
    else changePage(-1);
    return true;
  }
  if (action === "right") {
    if (overlay.context === "battle") moveHorizontal(1);
    else changePage(1);
    return true;
  }
  if (action === "confirm") {
    activateSelected();
    return true;
  }
  return true;
}

function moveVertical(amount) {
  if (overlay.context !== "battle") return moveLinear(amount);
  const { start, items } = getCurrentPage();
  if (!items.length) return selectBack();
  if (overlay.selectedIndex === overlay.skills.length) {
    overlay.selectedIndex = amount < 0 ? start + items.length - 1 : start;
  } else {
    const local = overlay.selectedIndex - start;
    const columnStart = Math.floor(local / BATTLE_SKILLS_PER_COLUMN) * BATTLE_SKILLS_PER_COLUMN;
    const columnLength = Math.min(BATTLE_SKILLS_PER_COLUMN, items.length - columnStart);
    const row = local - columnStart;
    const nextRow = row + amount;
    overlay.selectedIndex = nextRow >= 0 && nextRow < columnLength
      ? start + columnStart + nextRow
      : overlay.skills.length;
  }
  overlay.playSe("cursorMove");
  renderSelection();
}

function moveHorizontal(amount) {
  if (overlay.context !== "battle") return moveLinear(amount);
  const { start, items } = getCurrentPage();
  if (overlay.selectedIndex === overlay.skills.length) return changePage(amount);
  const local = overlay.selectedIndex - start;
  const targetLocal = local + amount * BATTLE_SKILLS_PER_COLUMN;
  if (targetLocal >= 0 && targetLocal < items.length) {
    overlay.selectedIndex = start + targetLocal;
    overlay.playSe("cursorMove");
    renderSelection();
    return;
  }
  changePage(amount, local % BATTLE_SKILLS_PER_COLUMN);
}

function moveLinear(amount) {
  const { start, items } = getCurrentPage();
  if (!items.length) return selectBack();
  if (overlay.selectedIndex === overlay.skills.length) {
    overlay.selectedIndex = amount < 0 ? start + items.length - 1 : start;
  } else {
    const localIndex = overlay.selectedIndex - start;
    const nextIndex = localIndex + amount;
    overlay.selectedIndex = nextIndex >= 0 && nextIndex < items.length
      ? start + nextIndex
      : overlay.skills.length;
  }
  overlay.playSe("cursorMove");
  renderSelection();
}

function selectBack() {
  overlay.selectedIndex = overlay.skills.length;
  overlay.playSe("cursorMove");
  renderSelection();
}

function changePage(amount, preferredRow = 0) {
  const pageCount = getPageCount();
  if (pageCount <= 1) return false;
  overlay.page = (overlay.page + amount + pageCount) % pageCount;
  const { start, items } = getCurrentPage();
  overlay.selectedIndex = items.length ? start + Math.min(preferredRow, items.length - 1) : overlay.skills.length;
  overlay.playSe("cursorMove");
  render();
  return true;
}

function getCurrentPage() {
  const pageSize = getPageSize();
  const start = overlay.page * pageSize;
  return { start, items: overlay.skills.slice(start, start + pageSize) };
}

function getPageSize() {
  return overlay.context === "battle" ? BATTLE_SKILLS_PER_PAGE : FIELD_SKILLS_PER_PAGE;
}

function getPageCount() {
  return Math.max(1, Math.ceil(overlay.skills.length / getPageSize()));
}

async function activateSelected() {
  if (overlay.selectedIndex === overlay.skills.length) {
    overlay.playSe("cancel");
    closeSkillOverlay();
    return;
  }
  const skill = overlay.skills[overlay.selectedIndex];
  if (!skill) return;
  const character = overlay.getCharacter();
  const reason = unavailableReason(skill, character);
  if (reason) {
    overlay.playSe("cancel");
    showReason(reason);
    return;
  }
  overlay.playSe("confirm");
  overlay.lastSelectionByContext[overlay.context] = { id: skill.id, index: overlay.selectedIndex };
  if (overlay.context === "battle") {
    closeSkillOverlay();
    return overlay.onUse(skill.id);
  }
  const result = await overlay.onUse(skill.id);
  if (!result?.accepted) {
    showReason(result?.reason);
    render();
    return;
  }
  closeSkillOverlay({ restoreMessage: false });
}

function restoreSelectedIndex(skills, remembered) {
  if (!skills.length) return 0;
  const matchingIndex = skills.findIndex(skill => skill.id === remembered?.id);
  if (matchingIndex >= 0) return matchingIndex;
  return Math.min(Math.max(0, Math.floor(Number(remembered?.index) || 0)), skills.length - 1);
}

function render() {
  const character = overlay.getCharacter();
  const { start, items } = getCurrentPage();
  const buttons = items.map((skill, localIndex) => {
    const index = start + localIndex;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-overlay-item";
    button.dataset.skillId = skill.id;
    const reason = unavailableReason(skill, character);
    button.disabled = Boolean(reason);
    button.classList.toggle("is-charge-ready", Boolean(skill.chargeSkill && !reason));
    button.innerHTML = `<span>${skill.name}</span><small>${skill.chargeSkill ? "CHARGE" : `SP${getEffectiveSpCost(skill, character)}`}</small>`;
    button.addEventListener("click", () => {
      overlay.selectedIndex = index;
      renderSelection();
      activateSelected();
    });
    return button;
  });
  overlay.list.replaceChildren(...buttons);
  const pageCount = getPageCount();
  overlay.pageEl.textContent = `${overlay.page + 1}/${pageCount}`;
  if (overlay.prevButton) overlay.prevButton.hidden = pageCount <= 1;
  if (overlay.nextButton) overlay.nextButton.hidden = pageCount <= 1;
  renderSelection();
}

function renderSelection() {
  const buttons = [...overlay.list.children];
  const { start } = getCurrentPage();
  buttons.forEach((button, index) => {
    button.classList.toggle("is-selected", start + index === overlay.selectedIndex);
  });
  buttons[overlay.selectedIndex - start]?.scrollIntoView?.({ block: "nearest" });
  const backSelected = overlay.selectedIndex === overlay.skills.length;
  overlay.backButton.classList.toggle("is-selected", backSelected);
  const skill = overlay.skills[overlay.selectedIndex];
  overlay.messageEl.classList.toggle("is-skill-description", !backSelected);
  overlay.messageEl.textContent = backSelected
    ? "スキル選択を終了する。"
    : skill?.description || "スキルを選択してください。";
}

function unavailableReason(skill, character) {
  if (skill.actionType === "passive") return "passive";
  if (skill.chargeSkill && (Number(character?.playerCharge?.value) < 100 || Number(character?.playerCharge?.cooldown) > 0)) return "chargeNotReady";
  if (skill.ultimateChargeSkill && (character.statuses || []).some(status =>
    (status.id || status.statusId) === "charge_ultimate_used" && status.active !== false
  )) return "ultimateAlreadyUsed";
  if (character.sp < getEffectiveSpCost(skill, character)) return "insufficientSp";
  if (skill.preventWhileStatusActive && (character.statuses || []).some(status =>
    (status.statusId || status.id) === skill.preventWhileStatusActive && status.active !== false
  )) return "alreadyActive";
  if (overlay.context === "field" && !["healing", "cureStatus", "sacrificialCure", "dungeonEffect"].includes(skill.actionType)) return "battleOnly";
  if (overlay.context === "battle" && skill.actionType === "dungeonEffect") return "fieldOnly";
  if (overlay.context === "field" && skill.actionType === "healing" && character.hp >= character.maxHp) return "fullHp";
  if (skill.actionType === "cureStatus" && !(character.statuses || []).some(status => (
    (skill.statusIds || [skill.statusId]).includes(status.statusId || status.id)
  ))) return "noEffect";
  if (skill.actionType === "sacrificialCure" && !(character.statuses || []).some(status => (status.statusId || status.id) === skill.statusId)) return "noEffect";
  if (overlay.context === "battle" && skill.actionType === "banishUndead") {
    if (overlay.enemy?.isBoss) return "bossImmune";
    if (overlay.enemy?.race !== "undead") return "undeadOnly";
  }
  return "";
}

function showReason(reason) {
  const messages = {
    insufficientSp: "SPが足りない。",
    battleOnly: "このスキルは戦闘中のみ使用できる。",
    fieldOnly: "このスキルは探索中のみ使用できる。",
    fullHp: "HPは満タンだ。",
    fullTorch: "たいまつゲージは満タンだ。",
    alreadyActive: "すでに効果が発動している。",
    noEffect: "毒状態ではない。",
    undeadOnly: "アンデッドにしか効果がない。",
    bossImmune: "この敵には効かない。",
    unknownSkill: "現在使用できない。",
    passive: "このスキルは常時発動している。",
    chargeNotReady: "チャージが満タンではない。"
  };
  overlay.messageEl.classList.remove("is-skill-description");
  overlay.messageEl.textContent = messages[reason] || "現在使用できない。";
}
