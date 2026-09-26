export const INVENTORY_SORT_MODES = Object.freeze(['category', 'obtained', 'id']);
export const INVENTORY_SORT_LABELS = Object.freeze({category:'カテゴリ順', obtained:'入手順', id:'ID順（番号）'});
const exploration = ['warding_incense','exorcism_talisman','guiding_torch','auto_walker','emergency_escape'];
function categoryRank(item) {
  const effects = new Set((item.effects || []).map(effect => effect.id));
  if (effects.has('restore_hp_full')) return 0;
  if ([...effects].some(id => id.startsWith('restore_sp'))) return 1;
  if ([...effects].some(id => id.startsWith('cure_'))) return 2;
  if (effects.has('heal_hp') || effects.has('heal_hp_rate')) return 0;
  const index = exploration.indexOf(item.id);
  return index >= 0 ? 3 + index : 8;
}
export function sortInventoryEntries(entries, mode = 'category', acquisitionIds = []) {
  const order = new Map();
  acquisitionIds.forEach((id,index) => { if (!order.has(id)) order.set(id,index); });
  const byNumber = (a,b) => (a.item.number ?? Infinity) - (b.item.number ?? Infinity) || a.item.id.localeCompare(b.item.id);
  return [...entries].sort((a,b) => {
    if (mode === 'obtained') return (order.get(a.item.id) ?? Infinity) - (order.get(b.item.id) ?? Infinity) || byNumber(a,b);
    if (mode === 'category') return categoryRank(a.item) - categoryRank(b.item) || byNumber(a,b);
    return byNumber(a,b);
  });
}
