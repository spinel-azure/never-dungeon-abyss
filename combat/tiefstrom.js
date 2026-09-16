export const DISTANT_MESSAGE = "タイフシュトロームは遠すぎて、攻撃が届かない！";
export function cannotReachTarget(target, action) {
  return Boolean(target?.distantTarget && action?.actionType === "physicalAttack"
    && action.range !== "ranged" && action.weapon?.range !== "ranged");
}
export function synchronizeTwinState(battle) {
  const twins = (battle.enemies || []).filter(enemy => enemy.twinWhirlpool);
  const living = twins.filter(enemy => enemy.hp > 0 && enemy.alive !== false);
  if (living.length === 1 && twins.length === 2 && !living[0].twinEnraged) {
    living[0].twinEnraged = true;
    battle.log.push("片割れを失ったタイフシュトロームが、怒りに荒れ狂う！");
    battle.presentationEvents?.push({ type: "message", message: "片割れを失ったタイフシュトロームが、怒りに荒れ狂う！" });
  }
  if (battle.whirlpoolOwner && !living.some(enemy => enemy.id === battle.whirlpoolOwner)) {
    battle.whirlpoolOwner = null;
  }
  if (battle.whirlpoolOwner && battle.whirlpoolBlockedTurn !== battle.turn
    && !living.some(enemy => enemy.id === battle.whirlpoolOwner && enemy.reservedEnemyAction)) {
    battle.whirlpoolOwner = null;
  }
  return living;
}
export function canPrepareWhirlpool(battle, enemy) {
  if (!battle || !enemy.twinWhirlpool) return true;
  const living = synchronizeTwinState(battle);
  return !battle.whirlpoolOwner && battle.whirlpoolBlockedTurn !== battle.turn
    && (!battle.whirlpoolLastOwner || living.length < 2 || battle.whirlpoolLastOwner !== enemy.id)
    && !enemy.whirlpoolNeedsOtherAction;
}
export function reserveWhirlpool(battle, enemy, action) {
  if (battle && enemy.twinWhirlpool && action?.id === "tiefstrom_prepare") {
    battle.whirlpoolOwner = enemy.id;
    battle.whirlpoolBlockedTurn = battle.turn;
  }
}
export function executeTwinAction(battle, enemy, action) {
  if (!enemy.twinWhirlpool) return;
  if (action.id === "tiefstrom_whirlpool") {
    battle.presentationEvents?.push({ type: "message", message: "タイフシュトロームが「深淵の大渦」を放った！", whirlpoolActorId: enemy.id, whirlpoolPreparing: false });
    battle.whirlpoolOwner = null;
    battle.whirlpoolLastOwner = enemy.id;
    battle.whirlpoolBlockedTurn = battle.turn;
    enemy.whirlpoolNeedsOtherAction = true;
  } else if (action.id !== "tiefstrom_prepare") {
    enemy.whirlpoolNeedsOtherAction = false;
  }
}
