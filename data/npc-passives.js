export const NPC_PASSIVE_UNLOCK_STAGE = 6;

export const NPC_STAGE_PASSIVES = Object.freeze({
  alec: Object.freeze({ id: "npc_flash_slash", name: "一閃", instantDeathRate: 0.08 }),
  rebecca: Object.freeze({ id: "npc_assassination", name: "暗殺術", instantDeathRate: 0.04 }),
  erika: Object.freeze({ id: "npc_goddess_breath", name: "女神の息吹", stepInterval: 5, hpRecovery: 1 }),
  johan: Object.freeze({ id: "npc_mana_activation", name: "マナ活性化", stepInterval: 5, spRecovery: 1 })
});

export function getNpcStagePassive(npcId, growthStage = 0) {
  return Number(growthStage) >= NPC_PASSIVE_UNLOCK_STAGE ? NPC_STAGE_PASSIVES[npcId] || null : null;
}
