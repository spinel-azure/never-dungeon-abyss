import { COMMANDS } from "./commands.js";

export function createCommandMenu({ root, onCommand, onStateChange = () => {} }) {
  let active = false;
  let cursor = 0;
  const buttons = COMMANDS.map((command, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-button";
    button.dataset.commandId = command.id;
    button.textContent = command.label;
    button.setAttribute("aria-label", `${command.label}${command.implemented ? "" : " 未実装"}`);
    button.addEventListener("click", () => { cursor = index; active = true; render(); execute(); });
    return button;
  });
  root.replaceChildren(...buttons);

  function render() {
    root.classList.toggle("is-active", active);
    root.setAttribute("data-menu-active", String(active));
    buttons.forEach((button, index) => {
      button.classList.toggle("is-selected", active && index === cursor);
      button.setAttribute("aria-current", active && index === cursor ? "true" : "false");
    });
    onStateChange({ active, cursor, command: COMMANDS[cursor] });
  }
  function open() { active = true; render(); }
  function close() { active = false; render(); }
  function toggle() { active ? close() : open(); }
  function move(direction) {
    if (!active) return false;
    const row = Math.floor(cursor / 3);
    const column = cursor % 3;
    if (direction === "left") cursor = row * 3 + (column + 2) % 3;
    if (direction === "right") cursor = row * 3 + (column + 1) % 3;
    if (direction === "up" || direction === "down") cursor = ((row + 1) % 2) * 3 + column;
    render();
    return true;
  }
  function execute() { if (!active) return false; onCommand(COMMANDS[cursor]); return true; }
  function isActive() { return active; }
  render();
  return Object.freeze({ open, close, toggle, move, execute, isActive });
}
