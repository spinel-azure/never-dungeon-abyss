import { getEnemyById } from './enemies.js';

// F2 combat Candidate 1. Separate from ecology metadata and the abyss registry.
// Fixed rewards enter the V2 expedition pool/loot bag; map-Lv bonus is return-only.
export const V2_COMBAT_CANDIDATE = 1;
const attack = (id, name, weight, powerPerHit = 1) => ({
  id, name, weight, actionType: 'physicalAttack', hitCount: 1, powerPerHit, effects: []
});
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const V2_EXCLUSIVE_ENEMIES = freeze([
  {
    id: 'silberkaefer', name: 'ズィルバーケーファー',
    image: 'images/karte_enemies/enemy_k02.avif', battleSize: 'small',
    race: 'insect', isBoss: false, randomEncounter: false, level: 10,
    maxHp: 24, stats: { str: 6, int: 6, agi: 18, dex: 14, luc: 12 },
    def: 12, attack: 3, evasionBonus: 0.05,
    actions: [attack('silver_attack', '通常攻撃', 75), { id: 'silver_wait', name: '様子を見る', actionType: 'wait', weight: 25 }],
    elementMultipliers: { fire: 1.25, ice: 1 },
    statusResistances: { poison: { resistancePoints: 20 }, deadly_poison: { resistancePoints: 20 }, action_skip: { resistancePoints: 20 }, speed_down: { resistancePoints: 20 } },
    escapeRate: 0.8, surpriseRate: 0, surpriseRateMaximum: 0,
    experienceReward: 220, dropGold: 60, fixedGoldPerDefeat: true,
    noDrop: true, dropItemId: null
  },
  {
    id: 'maikaefer_koenig', name: 'マイケーファーケーニヒ',
    image: 'images/karte_enemies/enemy_k01.avif', battleSize: 'small',
    race: 'insect', isBoss: false, randomEncounter: false, level: 60,
    maxHp: 240, stats: { str: 25, int: 15, agi: 30, dex: 28, luc: 20 },
    def: 36, attack: 24, evasionBonus: 0.05,
    actions: [attack('king_attack', '通常攻撃', 70), attack('king_strike', '甲角の強撃', 25, 1.4), { id: 'king_wait', name: '様子を見る', actionType: 'wait', weight: 5 }],
    elementMultipliers: { fire: 1.25, ice: 1 },
    statusResistances: { poison: { resistancePoints: 40 }, deadly_poison: { resistancePoints: 40 }, action_skip: { resistancePoints: 40 }, speed_down: { resistancePoints: 40 } },
    escapeRate: 0.65, surpriseRate: 0, surpriseRateMaximum: 0,
    experienceReward: 2000, dropGold: 300, fixedGoldPerDefeat: true,
    noDrop: true, dropItemId: null
  }
]);

// Never register these definitions in ordinary encounter/region tables.
// No enemy-escape action in Candidate 1: shell + speed alone provide the threat.
export function getV2CombatEnemy(id) {
  if (typeof id !== 'string' || id.startsWith('karte_boss_')) return null;
  const enemy = V2_EXCLUSIVE_ENEMIES.find(enemy => enemy.id === id) || getEnemyById(id);
  return enemy && !enemy.isBoss ? enemy : null;
}
