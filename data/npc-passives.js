export const NPC_PASSIVE_UNLOCK_STAGE = 6;

export const NPC_STAGE_PASSIVES = Object.freeze({
  alec: Object.freeze({ id: "npc_flash_slash", name: "一閃", instantDeathRate: 0.08 }),
  rebecca: Object.freeze({ id: "npc_assassination", name: "暗殺術", instantDeathRate: 0.04 }),
  erika: Object.freeze({ id: "npc_goddess_breath", name: "女神の息吹", stepInterval: 5, hpRecovery: 1 }),
  johan: Object.freeze({ id: "npc_mana_activation", name: "マナ活性化", stepInterval: 5, spRecovery: 1 })
});

export const NPC_ADVANCED_GROWTH = Object.freeze({
  alec: Object.freeze({
    stage7: Object.freeze({ name: "追撃強化", attackMultiplier: 1.15, guardBonus: 0.03 }),
    stage8: Object.freeze({ name: "強撃・改", damageMultiplier: 2, defenseMultiplier: 0.85, defenseDownTurns: 2 }),
    stage9: Object.freeze({ name: "一閃・極", immuneDamageMultiplier: 1.5 }),
    stage10: Object.freeze({ name: "ジークフリート" })
  }),
  rebecca: Object.freeze({
    stage7: Object.freeze({ name: "崩しの技巧", debuffRate: 0.35, debuffTurns: 3 }),
    stage8: Object.freeze({ name: "双連斬・改", defensePierceDamageMultiplier: 1.25 }),
    stage9: Object.freeze({ name: "暗殺術・極", immuneCurrentHpDamageRate: 0.05, bossDamageMaximum: 500 }),
    stage10: Object.freeze({ name: "ヴァンダーファルケ" })
  }),
  erika: Object.freeze({
    stage7: Object.freeze({ name: "祈りの浄化", cureRate: 0.25 }),
    stage8: Object.freeze({ name: "女神よ、癒やしを！", hpThresholdRate: 0.5, healMaxHpRate: 0.3 }),
    stage9: Object.freeze({ name: "女神の息吹・極", hpRecovery: 2 }),
    stage10: Object.freeze({ name: "黄金の稲穂", hpThresholdRate: 0.25, healMaxHpRate: 0.8 })
  }),
  johan: Object.freeze({
    stage7: Object.freeze({ name: "マナ励起", spellDamageMultiplier: 1.2, debuffRate: 0.2,
      magicDamageTakenBonus: 0.15, debuffTurns: 2 }),
    stage8: Object.freeze({ name: "壁よ、拒め！", damageThresholdRate: 0.2, strongDamageReduction: 0.2 }),
    stage9: Object.freeze({ name: "マナ活性化・極", spRecovery: 2 }),
    stage10: Object.freeze({ name: "デア・ツァウバーシルト", triggerDamageMaxHpRate: 0.3,
      damageReduction: 0.5, spRecoveryMaxSpRate: 0.1 })
  })
});

export function getNpcStagePassive(npcId, growthStage = 0) {
  return Number(growthStage) >= NPC_PASSIVE_UNLOCK_STAGE ? NPC_STAGE_PASSIVES[npcId] || null : null;
}
