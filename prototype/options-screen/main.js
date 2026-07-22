import { bindVirtualControls } from "../dungeon-command-menu/controls/virtual-controls.js";

const ON_MARK = "🔘";
const OFF_MARK = "⚫";
const pages = [...document.querySelectorAll("[data-option-page]")];
const navButtons = [...document.querySelectorAll("[data-option-nav]")];
const indicator = document.querySelector("[data-page-indicator]");
const feedback = document.querySelector("#feedback");
const returnTarget = new URLSearchParams(location.search).get("return") || "../dungeon-command-menu/";
const state = { page: 0, cursor: 0, compass: true, readout: false };

function items() { return [...pages[state.page].querySelectorAll("[data-option]")]; }
function choices() { return [...items(), ...navButtons]; }
function render() {
  pages.forEach((page, index) => { page.hidden = index !== state.page; });
  indicator.textContent = `${state.page + 1}/2`;
  navButtons[1].textContent = state.page === 0 ? "NEXT" : "MAIN";
  choices().forEach((item, index) => item.classList.toggle("is-selected", index === state.cursor));
  document.querySelector('[data-option-state="compass"]').textContent = state.compass ? `ON ${ON_MARK}　OFF ${OFF_MARK}` : `ON ${OFF_MARK}　OFF ${ON_MARK}`;
  document.querySelector('[data-option-state="readout"]').textContent = state.readout ? `ON ${ON_MARK}　OFF ${OFF_MARK}` : `ON ${OFF_MARK}　OFF ${ON_MARK}`;
}
function changePage(page) { state.page = page; state.cursor = 0; feedback.textContent = ""; render(); }
function returnToDungeon() { location.href = returnTarget; }
function navigate(key) {
  if (key === "back") { if (state.page === 0) returnToDungeon(); else changePage(0); }
  if (key === "next") { if (state.page === 0) changePage(1); else returnToDungeon(); }
}
function adjustVolume(key, amount) {
  const slider = document.querySelector(`#${key}`);
  slider.value = String(Math.max(0, Math.min(100, Number(slider.value) + amount * 10)));
  slider.parentElement.querySelector("span").textContent = `${slider.value}%`;
}
function executeOption(key, amount = 1) {
  if (key === "bgmVolume" || key === "seVolume") { adjustVolume(key, amount); return; }
  if (key === "compass") { state.compass = !state.compass; render(); return; }
  if (key === "readout") { state.readout = !state.readout; render(); return; }
  if (key === "language") { feedback.textContent = "LANGUAGE：未実装"; return; }
  const messages = { random: "ランダム生成を実行（検証）", autoReturn: "オート帰還を実行（検証）", torchFull: "たいまつゲージを回復（検証）" };
  feedback.textContent = messages[key] || "";
}
function move(direction) {
  if (direction === "up" || direction === "down") {
    const count = choices().length;
    state.cursor = (state.cursor + (direction === "down" ? 1 : count - 1)) % count;
    render();
    return;
  }
  if (direction === "left" || direction === "right") {
    const item = choices()[state.cursor];
    if (item.dataset.option) executeOption(item.dataset.option, direction === "right" ? 1 : -1);
  }
}
function confirm() {
  const item = choices()[state.cursor];
  if (item.dataset.optionNav) navigate(item.dataset.optionNav);
  else executeOption(item.dataset.option);
}

pages.forEach((page) => page.querySelectorAll("[data-option]").forEach((item) => item.addEventListener("click", () => { state.cursor = items().indexOf(item); render(); executeOption(item.dataset.option); })));
navButtons.forEach((button) => button.addEventListener("click", () => navigate(button.dataset.optionNav)));
document.querySelectorAll("input[type=range]").forEach((slider) => slider.addEventListener("input", () => { slider.parentElement.querySelector("span").textContent = `${slider.value}%`; }));
bindVirtualControls({ stick: document.querySelector("#virtualStick"), buttonA: document.querySelector("#buttonA"), buttonB: document.querySelector("#buttonB"), onDirection: move, onConfirm: confirm, onCancel: () => navigate("back") });
window.addEventListener("keydown", (event) => {
  const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  if (directions[event.key]) { event.preventDefault(); move(directions[event.key]); }
  if (["Enter", "x", "X"].includes(event.key)) confirm();
  if (["Escape", "z", "Z"].includes(event.key)) navigate("back");
});
render();
