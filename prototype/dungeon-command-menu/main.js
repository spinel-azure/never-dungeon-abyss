import { bindVirtualControls } from "./controls/virtual-controls.js";
import { createCommandMenu } from "./menu/command-menu.js";

const DUNGEON_MESSAGE = "10×10の床空間を、薄い境界壁が区切っている。";
const message = document.querySelector("#message");
const commandRegion = document.querySelector("#commandRegion");
let view = "dungeon";

function showCommands() { view = "commands"; menu.open(); message.textContent = DUNGEON_MESSAGE; }
function showDungeon() { view = "dungeon"; menu.close(); message.textContent = DUNGEON_MESSAGE; }
function runCommand(command) {
  if (!command.implemented) { message.textContent = `${command.label}は未実装です。`; return; }
  if (command.href) location.href = command.href;
}

const menu = createCommandMenu({ root: commandRegion, onCommand: runCommand });
function cancel() { view === "commands" ? showDungeon() : showCommands(); }
function confirm() { if (view === "commands") menu.execute(); }
function direction(value) { if (view === "commands") menu.move(value); }

bindVirtualControls({ stick: document.querySelector("#virtualStick"), buttonA: document.querySelector("#buttonA"), buttonB: document.querySelector("#buttonB"), onDirection: direction, onConfirm: confirm, onCancel: cancel });
window.addEventListener("keydown", (event) => {
  const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  if (directions[event.key]) { event.preventDefault(); direction(directions[event.key]); }
  if (["Enter", "x", "X"].includes(event.key)) confirm();
  if (["Escape", "z", "Z"].includes(event.key)) cancel();
});
showDungeon();
