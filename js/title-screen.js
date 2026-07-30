import {
  MANUAL_SAVE_SLOTS,
  createSaveArchive,
  getSaveSlotSummaries,
  hasAutoSaveData,
  hasManualSaveData,
  hasSaveData,
  importSaveArchive
} from "./save-data.js";

const titleScreen = document.getElementById("titleScreen");
const titleMenu = document.getElementById("titleMenu");
const loadPanel = document.getElementById("titleLoadPanel");
const loadSlots = document.getElementById("titleLoadSlots");
const exportButton = document.getElementById("exportSaveData");
const importFile = document.getElementById("importSaveFile");
const feedback = document.getElementById("titleSaveFeedback");
const greetingScreen = document.getElementById("greetingScreen");
const greetingGameStart = document.getElementById("greetingGameStart");
let titleOpen = true;
let loadOpen = false;
let greetingOpen = false;
let selectedIndex = 0;
let loadSelectedIndex = 0;

function getActions() {
  const actions = [];
  if (hasAutoSaveData()) actions.push("continue");
  if (hasManualSaveData()) actions.push("load-game");
  actions.push("new-game");
  return actions;
}

function renderMenu() {
  const labels = {
    continue: "CONTINUE",
    "load-game": "LOAD GAME",
    "new-game": "NEW GAME"
  };
  const actions = getActions();
  selectedIndex = Math.max(0, Math.min(selectedIndex, actions.length - 1));
  titleMenu.replaceChildren(...actions.map((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.titleAction = action;
    button.textContent = labels[action];
    button.classList.toggle("is-selected", index === selectedIndex && !loadOpen);
    return button;
  }));
  titleMenu.hidden = loadOpen;
  loadPanel.hidden = !loadOpen;
  exportButton.disabled = !hasSaveData();
  if (loadOpen) renderLoadSlots();
}

function renderLoadSlots() {
  const summaries = getSaveSlotSummaries().filter(summary => MANUAL_SAVE_SLOTS.includes(summary.slot));
  loadSelectedIndex = Math.max(0, Math.min(loadSelectedIndex, summaries.length));
  loadSlots.replaceChildren(...summaries.map((summary, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.loadSlot = summary.slot;
    button.disabled = !summary.exists;
    button.textContent = formatSummary(summary);
    button.classList.toggle("is-selected", index === loadSelectedIndex);
    return button;
  }));
  loadPanel.querySelector("[data-title-load-back]").classList.toggle(
    "is-selected",
    loadSelectedIndex === summaries.length
  );
}

function formatSummary(summary) {
  if (!summary.exists) return `${summary.label}（データなし）`;
  return `${summary.label}（${summary.name}／Lv${summary.level}／${formatDate(summary.savedAt)}）`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function activateTitleAction(action, event) {
  if (!titleOpen) return;
  if (action === "load-game") {
    event?.preventDefault();
    loadOpen = true;
    loadSelectedIndex = 0;
    renderMenu();
    return;
  }
  if (
    action === "new-game"
    && hasSaveData()
    && !window.confirm("現在のセーブデータを残したまま NEW GAME を開始しますか？オートセーブは新しいゲームで更新されます。")
  ) return;
  if (action === "new-game") {
    openGreeting(event);
    return;
  }
  startGame("nda:continue", {}, event);
}

function startManualLoad(slot, event) {
  startGame("nda:load-game", { slot }, event);
}

function startGame(eventName, detail, event) {
  titleOpen = false;
  greetingOpen = false;
  event?.preventDefault();
  event?.stopImmediatePropagation();
  titleScreen.classList.remove("is-greeting");
  titleScreen.hidden = true;
  document.body.classList.remove("title-active");
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function handleTitleKey(event) {
  if (!titleOpen || event.repeat || event.key === "Unidentified") return;
  event.stopImmediatePropagation();
  if (greetingOpen) {
    if (event.key === "Enter" || event.key === " " || event.key === "x" || event.key === "X") {
      startGame("nda:new-game", {}, event);
    }
    return;
  }
  if (loadOpen) {
    const summaries = getSaveSlotSummaries().filter(summary => MANUAL_SAVE_SLOTS.includes(summary.slot));
    const count = summaries.length + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "w" || event.key === "s") {
      event.preventDefault();
      loadSelectedIndex = (loadSelectedIndex + (event.key === "ArrowUp" || event.key === "w" ? count - 1 : 1)) % count;
      renderLoadSlots();
      return;
    }
    if (event.key === "Escape" || event.key === "z") {
      loadOpen = false;
      renderMenu();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (loadSelectedIndex === summaries.length) {
        loadOpen = false;
        renderMenu();
      } else if (summaries[loadSelectedIndex]?.exists) {
        startManualLoad(summaries[loadSelectedIndex].slot, event);
      }
    }
    return;
  }
  const actions = getActions();
  if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "w" || event.key === "s") {
    event.preventDefault();
    selectedIndex = (
      selectedIndex
      + (event.key === "ArrowUp" || event.key === "w" ? actions.length - 1 : 1)
    ) % actions.length;
    renderMenu();
    return;
  }
  if (event.key === "Enter" || event.key === " " || event.key === "z") {
    activateTitleAction(actions[selectedIndex], event);
  }
}

function openGreeting(event) {
  event?.preventDefault();
  event?.stopImmediatePropagation();
  greetingOpen = true;
  loadOpen = false;
  feedback.textContent = "";
  titleScreen.classList.add("is-greeting");
  greetingScreen.hidden = false;
  greetingGameStart.focus({ preventScroll: true });
}

titleMenu.addEventListener("pointerdown", event => {
  const button = event.target.closest("[data-title-action]");
  if (button) activateTitleAction(button.dataset.titleAction, event);
}, true);

loadPanel.addEventListener("pointerdown", event => {
  const slotButton = event.target.closest("[data-load-slot]");
  if (slotButton && !slotButton.disabled) {
    startManualLoad(slotButton.dataset.loadSlot, event);
    return;
  }
  if (event.target.closest("[data-title-load-back]")) {
    loadOpen = false;
    renderMenu();
  }
}, true);

greetingGameStart.addEventListener("pointerdown", event => {
  if (greetingOpen) startGame("nda:new-game", {}, event);
}, true);

greetingGameStart.addEventListener("pointerdown", event => {
  if (greetingOpen) startGame("nda:new-game", {}, event);
}, true);

greetingGameStart.addEventListener("click", event => {
  if (greetingOpen) startGame("nda:new-game", {}, event);
});

exportButton.addEventListener("click", async () => {
  if (!hasSaveData()) return;
  const archive = createSaveArchive();
  const json = JSON.stringify(archive, null, 2);
  const filename = `never-dungeon-abyss-saves-${fileTimestamp(new Date())}.json`;

  if (isIosDevice() && typeof File === "function" && typeof navigator.share === "function") {
    const file = new File([json], filename, { type: "application/json" });
    let canShareFile = false;
    try {
      canShareFile = typeof navigator.canShare === "function"
        && navigator.canShare({ files: [file] });
    } catch (error) {
      console.warn("NDA save file sharing is unavailable.", error);
    }
    if (canShareFile) {
      feedback.textContent = "共有シートから「ファイルに保存」などを選択してください。";
      try {
        await navigator.share({
          files: [file],
          title: "NEVER DUNGEON : ABYSS SAVE DATA"
        });
        feedback.textContent = "セーブデータを共有先へ書き出しました。";
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          feedback.textContent = "セーブデータの書き出しをキャンセルしました。";
          return;
        }
        console.warn("NDA save file sharing failed.", error);
        feedback.textContent = "共有に失敗したため、ダウンロード方式を試します。";
      }
    }
  }

  const blob = new Blob([json], { type: "application/octet-stream" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  feedback.textContent = "セーブデータのダウンロードを開始しました。";
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    const archive = JSON.parse(await file.text());
    if (hasSaveData() && !window.confirm("現在の同名セーブ枠をインポートデータで上書きしますか？")) return;
    const result = importSaveArchive(archive);
    feedback.textContent = result.accepted
      ? `${result.importedSlots.length}件のセーブデータを読み込みました。`
      : "このJSONファイルは読み込めません。";
    loadOpen = false;
    selectedIndex = 0;
    renderMenu();
  } catch (error) {
    console.warn("NDA save JSON could not be imported.", error);
    feedback.textContent = "JSONファイルの読み込みに失敗しました。";
  } finally {
    importFile.value = "";
  }
});

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function fileTimestamp(date) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ];
  return parts.join("");
}

window.addEventListener("keydown", handleTitleKey, true);
window.addEventListener("nda:save-changed", renderMenu);
renderMenu();
