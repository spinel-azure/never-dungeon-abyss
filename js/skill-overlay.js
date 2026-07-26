import { getSkills } from "../data/skills.js";

const overlay = {
  root: null,
  list: null,
  messageEl: null,
  pageEl: null,
  backButton: null,
  active: false,
  context: "field",
  selectedIndex: 0,
  skills: [],
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
  overlay.backButton = overlay.root.querySelector("[data-skill-back]");
  overlay.backButton.addEventListener("click", closeSkillOverlay);
}

export function openSkillOverlay({ context = "field", character, onUse, onClose } = {}) {
  if (overlay.active || !character) return false;
  overlay.active = true;
  overlay.context = context;
  overlay.selectedIndex = 0;
  overlay.skills = getSkills(character.skillIds);
  overlay.getCharacter = () => character;
  if (onUse) overlay.onUse = onUse;
  overlay.onClose = onClose || (() => {});
  overlay.previousMessage = overlay.messageEl.textContent;
  overlay.root.hidden = false;
  document.body.classList.add("skill-overlay-open");
  render();
  return true;
}

export function closeSkillOverlay({ restoreMessage = true } = {}) {
  if (!overlay.active) return false;
  overlay.active = false;
  overlay.root.hidden = true;
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
  if (action === "up" || action === "left") {
    moveSelection(-1);
    return true;
  }
  if (action === "down" || action === "right") {
    moveSelection(1);
    return true;
  }
  if (action === "confirm") {
    activateSelected();
    return true;
  }
  return true;
}

function moveSelection(amount) {
  if (!overlay.skills.length) return;
  overlay.selectedIndex = (overlay.selectedIndex + amount + overlay.skills.length) % overlay.skills.length;
  overlay.playSe("cursorMove");
  renderSelection();
}

async function activateSelected() {
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

function render() {
  const character = overlay.getCharacter();
  const buttons = overlay.skills.map((skill, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill-overlay-item";
    button.dataset.skillId = skill.id;
    button.disabled = Boolean(unavailableReason(skill, character));
    button.innerHTML = `<span>${skill.name}</span><small>SP${skill.spCost}</small>`;
    button.addEventListener("click", () => {
      overlay.selectedIndex = index;
      renderSelection();
      activateSelected();
    });
    return button;
  });
  overlay.list.replaceChildren(...buttons);
  overlay.pageEl.textContent = "1/1";
  renderSelection();
}

function renderSelection() {
  [...overlay.list.children].forEach((button, index) => {
    button.classList.toggle("is-selected", index === overlay.selectedIndex);
  });
  const skill = overlay.skills[overlay.selectedIndex];
  overlay.messageEl.classList.add("is-skill-description");
  overlay.messageEl.textContent = skill?.description || "スキルを選択してください。";
}

function unavailableReason(skill, character) {
  if (character.sp < skill.spCost) return "insufficientSp";
  if (overlay.context === "field" && skill.actionType !== "healing") return "battleOnly";
  if (overlay.context === "field" && character.hp >= character.maxHp) return "fullHp";
  return "";
}

function showReason(reason) {
  const messages = {
    insufficientSp: "SPが足りない。",
    battleOnly: "このスキルは戦闘中のみ使用できる。",
    fullHp: "HPは満タンだ。",
    unknownSkill: "現在使用できない。"
  };
  overlay.messageEl.classList.remove("is-skill-description");
  overlay.messageEl.textContent = messages[reason] || "現在使用できない。";
}
