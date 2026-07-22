const titleScreen = document.getElementById("titleScreen");
let titleOpen = true;

function enterDungeon(event) {
  if (!titleOpen) return;
  titleOpen = false;
  event?.preventDefault();
  event?.stopImmediatePropagation();
  titleScreen.hidden = true;
  document.body.classList.remove("title-active");
}

function handleTitleKey(event) {
  if (!titleOpen || event.repeat || event.key === "Unidentified") return;
  enterDungeon(event);
}

window.addEventListener("keydown", handleTitleKey, true);
titleScreen.addEventListener("pointerdown", enterDungeon, true);
