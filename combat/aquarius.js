export const AQUARIUS_STATUS = 'aquarius_magic_barrier';
export function getMagicBarrier(player) {
  return player?.statuses?.find(s=>(s.id || s.statusId)===AQUARIUS_STATUS && s.active!==false);
}
export function magicBarrierAmount(player) {
  return Math.max(0, Number(getMagicBarrier(player)?.amount) || 0);
}
export function initializeMagicBarrier(player, enabled) {
  player.statuses=(player.statuses || []).filter(s=>(s.id || s.statusId)!==AQUARIUS_STATUS);
  if(enabled)player.statuses.push({id:AQUARIUS_STATUS,statusId:AQUARIUS_STATUS,active:true,expiresAfterBattle:true,
    amount:Math.max(0,Math.floor(Number(player.maxSp)||0))});
}
