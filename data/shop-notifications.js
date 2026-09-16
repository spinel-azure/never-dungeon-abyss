import { getShopItemIdsForCharacter } from './items.js';
import { getShopEquipmentStock } from './shop-stock.js';

export function getShopNotificationIds(character) {
  return [...getShopItemIdsForCharacter(character).map(id => `item:${id}`),
    ...getShopEquipmentStock(character).map(entry => `equipment:${entry.id}`)];
}
export function normalizeShopNotifications(value) {
  if (!value || !Array.isArray(value.seenIds)) return null;
  const ids = list => [...new Set((Array.isArray(list) ? list : []).filter(id => typeof id === 'string'))];
  return { seenIds: ids(value.seenIds), pendingIds: ids(value.pendingIds) };
}
export function syncShopNotifications(character) {
  if (!character) return { character, pending: [] };
  const available = getShopNotificationIds(character);
  const old = normalizeShopNotifications(character.shopNotifications);
  const seenIds = [...new Set([...(old?.seenIds || []), ...available])];
  const pendingIds = old ? [...new Set([...old.pendingIds, ...available.filter(id => !old.seenIds.includes(id))])]
    .filter(id => available.includes(id)) : [];
  const state = { seenIds, pendingIds };
  return { character: JSON.stringify(old) === JSON.stringify(state) ? character : { ...character, shopNotifications: state },
    pending: pendingIds.map(notificationId => ({ notificationId })) };
}
export function markShopNotificationsShown(character, ids) {
  const state = normalizeShopNotifications(character?.shopNotifications);
  return state ? { ...character, shopNotifications: { ...state, pendingIds: state.pendingIds.filter(id => !ids.includes(id)) } } : character;
}
