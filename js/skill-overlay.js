import { getSkills } from "../data/skills.js";
import { getEffectiveSpCost } from "../combat/sp-cost.js";

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
  overlay.backButton = overlay.root.querySelector("[data-skill-back]");
  overlay.backButton.addEventListener("click", closeSkillOverlay);
}

export function openSkillOverlay({ context = "field", character, enemy = null, onUse, onClose } = {}) {
  if (overlay.active || !character) return false;
  overlay.active = true;
  overlay.context = context;
  overlay.selectedIndex = 0;
  overlay.skills = getSkills(character.skillIds);
  overlay.enemy = enemy;
  overlay.getCharacter = () => character;
  if (onUse) overlay.onUse = onUse;
  overlay.onClose = onClose || (() => {});
  overlay.previousMessage = overlay.messageEl.textContent;
  overlay.root.classList.toggle("is-field-inventory", context === "field");
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
  const itemCount = overlay.skills.length + 1;
  overlay.selectedIndex = (overlay.selectedIndex + amount + itemCount) % itemCount;
  overlay.playSe("cursorMove");
  renderSelection();
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
    button.innerHTML = `<span>${skill.name}</span><small>${skill.actionType === "passive" ? "PASSIVE" : skill.chargeSkill ? "CHARGE" : `SP${getEffectiveSpCost(skill, character)}`}</small>`;
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
  const buttons = [...overlay.list.children];
  buttons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === overlay.selectedIndex);
  });
  buttons[overlay.selectedIndex]?.scrollIntoView?.({ block: "nearest" });
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
  if (character.sp < getEffectiveSpCost(skill, character)) return "insufficientSp";
  if (skill.preventWhileStatusActive && (character.statuses || []).some(status =>
    (status.statusId || status.id) === skill.preventWhileStatusActive && status.active !== false
  )) return "alreadyActive";
  if (overlay.context === "field" && !["healing", "cureStatus", "sacrificialCure", "dungeonEffect"].includes(skill.actionType)) return "battleOnly";
  if (overlay.context === "battle" && skill.actionType === "dungeonEffect") return "fieldOnly";
  if (overlay.context === "field" && skill.actionType === "healing" && character.hp >= character.maxHp) return "fullHp";
  if (skill.actionType === "cureStatus" && !(character.statuses || []).some(status => (status.statusId || status.id) === skill.statusId)) return "noEffect";
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
