import { NPC_SUPPORT_ENABLED, getNpcDefinition } from "../data/npc-definitions.js";

export function renderNpcPartyStatus(root, character) {
  if (!root) return;
  const activeIds = NPC_SUPPORT_ENABLED && Array.isArray(character?.npcSystem?.activeIds)
    ? character.npcSystem.activeIds.slice(0, 3)
    : [];
  root.hidden = !NPC_SUPPORT_ENABLED || activeIds.length === 0;
  [...root.querySelectorAll("[data-npc-slot]")].forEach((slot, index) => {
    const npc = getNpcDefinition(activeIds[index]);
    slot.dataset.npcId = npc?.id || "";
    slot.textContent = npc ? `${npc.name}【${npc.jobShort}】` : "―― 空き枠 ――";
    slot.classList.toggle("is-empty", !npc);
  });
}

export function flashNpcPartyStatus(root, npcId) {
  const slot = root?.querySelector(`[data-npc-id="${String(npcId || "")}"]`);
  if (!slot) return;
  slot.classList.remove("is-supporting");
  void slot.offsetWidth;
  slot.classList.add("is-supporting");
  window.setTimeout(() => slot.classList.remove("is-supporting"), 520);
}
