export function scaleBlackChestMimic(enemy, depth) {
  if (!enemy || enemy.id !== "mimic") return enemy;
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  const tier = Math.floor(floor / 10);
  if (tier <= 0) return { ...enemy, depth: floor, mimicScalingTier: 0 };
  const stats = enemy.stats || {};
  return {
    ...enemy,
    depth: floor,
    mimicScalingTier: tier,
    level: Math.max(Number(enemy.level) || 1, tier * 10),
    maxHp: Math.round((Number(enemy.maxHp) || 1) * (1 + tier * 0.85)),
    stats: {
      ...stats,
      str: (Number(stats.str) || 0) + tier * 4,
      int: (Number(stats.int) || 0) + tier * 2,
      agi: (Number(stats.agi) || 0) + tier * 2,
      dex: (Number(stats.dex) || 0) + tier * 3,
      luc: (Number(stats.luc) || 0) + tier * 2
    },
    def: Math.min(60, (Number(enemy.def) || 0) + tier * 5),
    attack: (Number(enemy.attack) || 0) + tier * 5,
    experienceReward: Math.round((Number(enemy.experienceReward) || 0) * ((tier + 1) ** 2))
  };
}
