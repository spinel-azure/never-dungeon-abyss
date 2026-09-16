import { WASSERMANNFRAU_ID, WASSERMANNFRAU_CONFIG as C, WASSERMANNFRAU_ACTIONS as A } from '../data/wassermannfrau.js';

export const isWassermannfrau = enemy => enemy?.id === WASSERMANNFRAU_ID;
function message(battle, text, extra = {}) {
  battle.log.push(text);
  battle.presentationEvents.push({ type: 'message', message: text, ...extra });
}

export function cancelHighTide(battle, enemy) {
  if (enemy.reservedEnemyAction?.id !== A.tide.id) return;
  delete enemy.reservedEnemyAction;
  message(battle, '水瓶に満ちていた魔力が乱れた！\n水瓶の満潮は阻止された！');
}

export function onWassermannfrauBarrierDamage(battle, enemy, broken) {
  if (!isWassermannfrau(enemy)) return;
  if (enemy.bossMagicBarrier < C.barrierMax) cancelHighTide(battle, enemy);
  if (!broken) return;
  enemy.magicExhausted = true;
  enemy.def = C.exhaustedDef;
  enemy.barrierBrokenTurn = battle.turn;
  enemy.magicRegenerationPrepared = false;
  message(battle, 'ヴァッサーマンフラウ「……マリョクガ……！」');
}

export function onWassermannfrauBarrierRecovery(battle, enemy, before) {
  if (!isWassermannfrau(enemy)) return;
  if (before === 0 && enemy.bossMagicBarrier > 0) {
    enemy.magicExhausted = false;
    enemy.magicRegenerationPrepared = false;
    enemy.def = C.normalDef;
    const poisons = new Set(['poison', 'deadly_poison', 'death_poison']);
    const hadPoison = (enemy.statuses || []).some(status => poisons.has(status.statusId || status.id) && status.active !== false);
    enemy.statuses = (enemy.statuses || []).filter(status => !poisons.has(status.statusId || status.id));
    if (hadPoison) message(battle, 'ヴァッサーマンフラウを蝕んでいた毒が浄化された！');
  }
  if (before >= C.barrierMax || enemy.bossMagicBarrier < C.barrierMax) return;
  enemy.reservedEnemyAction = structuredClone(A.tide);
  message(battle, '水瓶が魔力で満たされた……！\n水面から凄まじい魔力が溢れ出している！');
}

export function synchronizeWassermannfrau(battle) {
  for (const enemy of battle.enemies || [battle.enemy]) {
    if (!isWassermannfrau(enemy) || enemy.hp <= 0) continue;
    if (!enemy.magicReleased && enemy.hp <= enemy.maxHp * C.phaseTwoHpRate) {
      enemy.magicReleased = true;
      message(battle, 'ヴァッサーマンフラウが初めてこちらへ顔を向けた。\n無表情な瞳の奥で、青白い光が揺らめいている……。');
      message(battle, '……キケンド、ジョウショウ……。\nマリョクカイホウ……。');
      message(battle, 'ヴァッサーマンフラウが魔力を解放した！');
    }
  }
}

export function wassermannfrauActionTable(enemy, player) {
  const crisis = enemy.bossMagicBarrier > 0 && enemy.bossMagicBarrier <= C.barrierMax * C.crisisRate;
  const weights = enemy.magicReleased ? (crisis ? C.phaseTwoCrisisWeights : C.phaseTwoWeights) : (crisis ? C.crisisWeights : C.weights);
  return Object.entries(weights).map(([key, weight]) => ({ weight, action: key === 'spell' && enemy.magicReleased ? A.greaterSpell : A[key] }))
    .filter(({ action }) => action.id !== A.absorb.id || player?.sp > 0 && enemy.bossMagicBarrier < C.barrierMax)
    .filter(({ action }) => action.id !== A.charge.id || !enemy.magicExhausted && enemy.bossMagicBarrier < C.barrierMax)
    .filter(({ action }) => action.id !== enemy.lastWassermannfrauAction || crisis && action.id === A.absorb.id);
}

export function selectWassermannfrauAction(enemy, player, rng) {
  if (enemy.magicExhausted) return structuredClone(A.regenerate);
  if (enemy.reservedEnemyAction?.id === A.tide.id && enemy.bossMagicBarrier === C.barrierMax) {
    return { ...A.tide, reservedEnemyActionId: A.tide.id };
  }
  const table = wassermannfrauActionTable(enemy, player);
  let roll = Math.max(0, Math.min(.999999, Number(rng()) || 0)) * table.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of table) { roll -= entry.weight; if (roll < 0) return structuredClone(entry.action); }
  return structuredClone(A.strike);
}

export function recoverWassermannfrauBarrier(battle, enemy, amount, text) {
  const before = enemy.bossMagicBarrier;
  enemy.bossMagicBarrier = Math.min(C.barrierMax, before + amount);
  message(battle, text, { type: 'bossMagicBarrier', enemyId: enemy.id, remaining: enemy.bossMagicBarrier });
  onWassermannfrauBarrierRecovery(battle, enemy, before);
}

function finishRegeneration(battle, enemy) {
  if (!enemy.magicExhausted || !enemy.magicRegenerationPrepared || enemy.hp <= 0 || battle.player.hp <= 0
    || !(battle.wassermannfrauPlayerTurn > enemy.barrierBrokenTurn)) return;
  enemy.magicExhausted = false;
  enemy.magicRegenerationPrepared = false;
  enemy.def = C.normalDef;
  recoverWassermannfrauBarrier(battle, enemy, C.regeneration, '水瓶から魔力が流れ込み、魔力障壁が再展開された！');
}

export function finishWassermannfrauPlayerAction(battle) {
  battle.wassermannfrauPlayerTurn = battle.turn;
  for (const enemy of battle.enemies || [battle.enemy]) if (isWassermannfrau(enemy)) finishRegeneration(battle, enemy);
}

export function executeWassermannfrauUtility(battle, enemy, action) {
  enemy.lastWassermannfrauAction = action.id;
  if (action.id === A.regenerate.id) {
    if (!enemy.magicExhausted) return true;
    enemy.magicRegenerationPrepared = true;
    message(battle, 'ヴァッサーマンフラウは水瓶へ手を伸ばしている……。');
    finishRegeneration(battle, enemy);
    return true;
  }
  if (action.id === A.charge.id) {
    recoverWassermannfrauBarrier(battle, enemy, C.chargeRecovery, 'ヴァッサーマンフラウの魔力充填！');
    return true;
  }
  return false;
}
