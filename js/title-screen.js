import { hasSaveData } from "./save-data.js";

const titleScreen = document.getElementById("titleScreen");
const titleMenu = document.getElementById("titleMenu");
let titleOpen = true;
let selectedIndex = 0;

function getActions() {
  return hasSaveData() ? ["continue", "new-game"] : ["new-game"];
}

function renderMenu() {
  const labels = { continue: "CONTINUE", "new-game": "NEW GAME" };
  const buttons = getActions().map((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.titleAction = action;
    button.textContent = labels[action];
    button.classList.toggle("is-selected", index === selectedIndex);
    return button;
  });
  selectedIndex = Math.min(selectedIndex, buttons.length - 1);
  titleMenu.replaceChildren(...buttons);
}

function enterDungeon(action, event) {
  if (!titleOpen) return;
  if (action === "new-game" && hasSaveData() && !window.confirm("現在のセーブデータを上書きして NEW GAME を開始しますか？")) return;
  titleOpen = false;
  event?.preventDefault();
  event?.stopImmediatePropagation();
  titleScreen.hidden = true;
  document.body.classList.remove("title-active");
  window.dispatchEvent(new CustomEvent(action === "continue" ? "nda:continue" : "nda:new-game"));
}

function handleTitleKey(event) {
  if (!titleOpen || event.repeat || event.key === "Unidentified") return;
  event.stopImmediatePropagation();
  const actions = getActions();
  if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "w" || event.key === "s") {
    event.preventDefault();
    selectedIndex = (selectedIndex + 1) % actions.length;
    renderMenu();
    return;
  }
  if (event.key === "Enter" || event.key === " " || event.key === "z") enterDungeon(actions[selectedIndex], event);
}

window.addEventListener("keydown", handleTitleKey, true);
titleMenu.addEventListener("pointerdown", event => {
  const button = event.target.closest("[data-title-action]");
  if (button) enterDungeon(button.dataset.titleAction, event);
}, true);
window.addEventListener("nda:save-changed", renderMenu);
renderMenu();
