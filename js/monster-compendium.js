import { getMonsterCompendiumCompletion, getMonsterCompendiumEntries, MONSTER_COMPENDIUM_FILTERS } from "../data/monster-compendium.js";

const PAGE_SIZE = 8;

const compendium = {
  root: null,
  getCharacter: () => null,
  playSe: () => {},
  onClose: () => {},
  active: false,
  mode: "list",
  filter: "ALL",
  entries: [],
  cursor: 0,
  filters: [],
  list: null,
  listView: null,
  detailView: null,
  count: null,
  page: null,
  previous: null,
  next: null,
  detailBack: null
};

export function configureMonsterCompendium({ root, getCharacter, playSe, onClose }) {
  compendium.root = root;
  compendium.getCharacter = getCharacter;
  compendium.playSe = playSe;
  compendium.onClose = onClose;
  compendium.filters = [...root.querySelectorAll("[data-monster-compendium-filter]")];
  compendium.list = root.querySelector("[data-monster-compendium-list]");
  compendium.listView = root.querySelector("[data-monster-compendium-list-view]");
  compendium.detailView = root.querySelector("[data-monster-compendium-detail]");
  compendium.count = root.querySelector("[data-monster-compendium-count]");
  compendium.page = root.querySelector("[data-monster-compendium-page]");
  compendium.previous = root.querySelector('[data-monster-compendium-nav="previous"]');
  compendium.next = root.querySelector('[data-monster-compendium-nav="next"]');
  compendium.detailBack = root.querySelector("[data-monster-compendium-detail-back]");
  bindControls();
}

export function openMonsterCompendium() {
  compendium.active = true;
  compendium.mode = "list";
  compendium.filter = "ALL";
  compendium.cursor = 0;
  refreshEntries();
  render();
}

export function closeMonsterCompendium() {
  compendium.active = false;
  compendium.mode = "list";
}

export function handleMonsterCompendiumInput(action) {
  if (!compendium.active) return false;
  if (compendium.mode === "detail") {
    if (action === "cancel" || action === "confirm") {
      compendium.playSe(action === "cancel" ? "cancel" : "confirm");
      showList();
    }
    return true;
  }
  if (action === "cancel") {
    compendium.playSe("cancel");
    compendium.onClose();
    return true;
  }
  if (action === "confirm") {
    compendium.playSe("confirm");
    showDetail();
    return true;
  }
  if (action === "up" || action === "down") {
    compendium.playSe("cursorMove");
    moveCursor(action === "down" ? 1 : -1);
    return true;
  }
  if (action === "left" || action === "right") {
    compendium.playSe("cursorMove");
    const index = MONSTER_COMPENDIUM_FILTERS.indexOf(compendium.filter);
    const offset = action === "right" ? 1 : MONSTER_COMPENDIUM_FILTERS.length - 1;
    setFilter(MONSTER_COMPENDIUM_FILTERS[(index + offset) % MONSTER_COMPENDIUM_FILTERS.length]);
    return true;
  }
  return true;
}

function refreshEntries() {
  compendium.entries = getMonsterCompendiumEntries(compendium.getCharacter(), compendium.filter);
  compendium.cursor = compendium.entries.length ? Math.min(compendium.cursor, compendium.entries.length - 1) : 0;
}

function currentEntry() {
  return compendium.entries[compendium.cursor] || null;
}

function render() {
  const completion = getMonsterCompendiumCompletion(compendium.getCharacter());
  compendium.count.textContent = `登録 ${completion.encountered}/${completion.total}　討伐 ${completion.defeated}/${completion.total}　${completion.percentage}%`;
  compendium.filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.monsterCompendiumFilter === compendium.filter)));
  compendium.listView.hidden = compendium.mode !== "list";
  compendium.detailView.hidden = compendium.mode !== "detail";
  if (compendium.mode === "detail") renderDetail();
  else renderList();
}

function renderList() {
  const pageCount = Math.max(1, Math.ceil(compendium.entries.length / PAGE_SIZE));
  const pageIndex = compendium.entries.length ? Math.floor(compendium.cursor / PAGE_SIZE) : 0;
  const pageEntries = compendium.entries.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const rows = pageEntries.map((entry, localIndex) => {
    const index = pageIndex * PAGE_SIZE + localIndex;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "monster-compendium-entry";
    button.classList.toggle("is-selected", index === compendium.cursor);
    button.classList.toggle("is-unknown", !entry.encountered);
    button.dataset.monsterCompendiumIndex = String(index);
    button.setAttribute("aria-current", index === compendium.cursor ? "true" : "false");
    const number = document.createElement("span");
    number.className = "monster-compendium-number";
    number.textContent = String(index + 1).padStart(3, "0");
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const habitat = document.createElement("span");
    habitat.className = "monster-compendium-habitat";
    habitat.textContent = entry.habitat;
    const mark = document.createElement("span");
    mark.className = "monster-compendium-mark";
    mark.textContent = entry.defeated ? "◆" : entry.encountered ? "◇" : "―";
    button.append(number, name, habitat, mark);
    return button;
  });
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "monster-compendium-empty";
    empty.textContent = "この区域の記録はまだありません。";
    rows.push(empty);
  }
  compendium.list.replaceChildren(...rows);
  compendium.page.textContent = `${pageIndex + 1}/${pageCount}`;
  compendium.previous.disabled = pageCount < 2;
  compendium.next.disabled = pageCount < 2;
}

function renderDetail() {
  const entry = currentEntry();
  if (!entry) {
    showList();
    return;
  }
  const setText = (selector, value) => { compendium.detailView.querySelector(selector).textContent = value; };
  setText("[data-monster-detail-name]", entry.name);
  setText("[data-monster-detail-habitat]", `出現階層：${entry.habitat}`);
  setText("[data-monster-detail-race]", `種族：${entry.race}`);
  setText("[data-monster-detail-level]", entry.level);
  setText("[data-monster-detail-hp]", entry.maxHp);
  setText("[data-monster-detail-attack]", entry.attack);
  setText("[data-monster-detail-defense]", entry.defense);
  setText("[data-monster-detail-str]", entry.stats.str);
  setText("[data-monster-detail-int]", entry.stats.int);
  setText("[data-monster-detail-agi]", entry.stats.agi);
  setText("[data-monster-detail-dex]", entry.stats.dex);
  setText("[data-monster-detail-luc]", entry.stats.luc);
  setText("[data-monster-detail-exp]", entry.experience);
  setText("[data-monster-detail-defeats]", entry.defeated ? `${entry.defeatCount}体` : "？？？");
  setText("[data-monster-detail-elements]", entry.elements);
  setText("[data-monster-detail-statuses]", entry.statuses);
  setText("[data-monster-detail-drops]", entry.drops);
  const image = compendium.detailView.querySelector("[data-monster-detail-image]");
  const unknown = compendium.detailView.querySelector("[data-monster-detail-unknown]");
  image.hidden = !entry.image;
  unknown.hidden = Boolean(entry.image);
  if (entry.image) {
    image.src = entry.image;
    image.alt = entry.name;
  } else {
    image.removeAttribute("src");
    image.alt = "";
  }
  compendium.detailView.classList.toggle("is-undefeated", !entry.defeated);
}

function moveCursor(offset) {
  if (!compendium.entries.length) return;
  compendium.cursor = (compendium.cursor + offset + compendium.entries.length) % compendium.entries.length;
  renderList();
}

function setFilter(filter) {
  if (!MONSTER_COMPENDIUM_FILTERS.includes(filter)) return;
  compendium.filter = filter;
  compendium.cursor = 0;
  compendium.mode = "list";
  refreshEntries();
  render();
}

function shiftPage(offset) {
  if (!compendium.entries.length) return;
  const pageCount = Math.max(1, Math.ceil(compendium.entries.length / PAGE_SIZE));
  const currentPage = Math.floor(compendium.cursor / PAGE_SIZE);
  const nextPage = (currentPage + offset + pageCount) % pageCount;
  compendium.cursor = Math.min(nextPage * PAGE_SIZE, compendium.entries.length - 1);
  renderList();
}

function showDetail() {
  if (!currentEntry()) return;
  compendium.mode = "detail";
  render();
}

function showList() {
  compendium.mode = "list";
  render();
}

function bindControls() {
  compendium.filters.forEach(button => button.addEventListener("click", () => {
    compendium.playSe("cursorMove");
    setFilter(button.dataset.monsterCompendiumFilter);
  }));
  compendium.previous.addEventListener("click", () => { compendium.playSe("cursorMove"); shiftPage(-1); });
  compendium.next.addEventListener("click", () => { compendium.playSe("cursorMove"); shiftPage(1); });
  compendium.detailBack.addEventListener("click", () => { compendium.playSe("cancel"); showList(); });
  compendium.list.addEventListener("click", event => {
    const button = event.target.closest("[data-monster-compendium-index]");
    if (!button) return;
    const index = Number(button.dataset.monsterCompendiumIndex);
    compendium.playSe(index === compendium.cursor ? "confirm" : "cursorMove");
    if (index === compendium.cursor) showDetail();
    else { compendium.cursor = index; renderList(); }
  });
}
