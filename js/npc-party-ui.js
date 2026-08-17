import { NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";
import { getNpcSupportStatus } from "../combat/npc-support.js";

export function renderNpcPartyStatus(root, character) {
  if (!root) return;
  const activeIds = NPC_SUPPORT_ENABLED && Array.isArray(character?.npcSystem?.activeIds)
    ? character.npcSystem.activeIds.slice(0, 3)
    : [];
  const canHireNpc = NPC_SUPPORT_ENABLED && Boolean(character?.npcSystem);
  root.hidden = !NPC_SUPPORT_ENABLED;
  [...root.querySelectorAll("[data-npc-slot]")].forEach((slot, index) => {
    const npc = getNpcDefinition(activeIds[index]);
    slot.dataset.npcId = npc?.id || "";
    const label = slot.querySelector("[data-npc-slot-label]");
    if (label) label.textContent = npc ? `${npc.name}【${npc.jobShort}】` : canHireNpc ? "NPC参加可能" : "――――";
    setNpcChargeGauge(slot, npc ? character?.npcSystem?.records?.[npc.id]?.charge : 0);
    slot.classList.toggle("is-empty", !npc);
    slot.classList.toggle("is-unavailable", !npc && !canHireNpc);
  });
}

export function setNpcPartyCharge(root, npcId, charge) {
  const slot = root?.querySelector(`[data-npc-id="${String(npcId || "")}"]`);
  if (!slot) return false;
  setNpcChargeGauge(slot, charge);
  return true;
}

function setNpcChargeGauge(slot, charge) {
  const normalized = Math.max(0, Math.min(100, Number(charge) || 0));
  const gauge = slot?.querySelector(".npc-charge-gauge");
  const fill = slot?.querySelector("[data-npc-charge-fill]");
  if (gauge) gauge.setAttribute("aria-valuenow", String(normalized));
  if (fill) fill.style.width = `${normalized}%`;
  slot?.classList.toggle("is-charged", normalized >= 100);
}

export function flashNpcPartyStatus(root, npcId) {
  const slot = root?.querySelector(`[data-npc-id="${String(npcId || "")}"]`);
  if (!slot) return;
  slot.classList.remove("is-supporting");
  void slot.offsetWidth;
  slot.classList.add("is-supporting");
  window.setTimeout(() => slot.classList.remove("is-supporting"), 520);
}

export function renderNpcStatusPage(root, character) {
  if (!root) return;
  const activeIds = NPC_SUPPORT_ENABLED && Array.isArray(character?.npcSystem?.activeIds)
    ? character.npcSystem.activeIds.slice(0, 3)
    : [];
  if (!activeIds.length) {
    const empty = document.createElement("p");
    empty.className = "nde-npc-status-empty";
    empty.textContent = "同行中のNPCはいません";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(...activeIds.map(id => createNpcStatusCard(getNpcSupportStatus(character, id))));
}

function createNpcStatusCard(status) {
  const article = document.createElement("article");
  article.className = "nde-npc-status-card";
  const title = document.createElement("h2");
  title.textContent = `${status.name}【${status.jobLabel}】`;
  const rows = [["成長", status.growth], ...status.rows, ["最深到達", status.maxDepth > 0 ? `B${status.maxDepth}F` : "未到達"]];
  article.append(title, ...rows.map(([name, content], index) => {
    const row = document.createElement("div");
    row.className = `nde-npc-status-row${index === 0 ? " is-growth" : ""}`;
    const label = document.createElement("span");
    label.textContent = name;
    const value = document.createElement("strong");
    value.textContent = content;
    row.append(label, value);
    return row;
  }));
  return article;
}
