export const KEY_ITEMS = Object.freeze({});

export function getKeyItem(id) {
  return KEY_ITEMS[String(id || "")] || null;
}

export function createInitialKeyItemState() {
  return { owned: {}, acquisitionOrder: [] };
}

export function normalizeKeyItemState(state) {
  const owned = {};
  for (const [rawId, rawRecord] of Object.entries(state?.owned || {})) {
    const id = normalizeKeyItemId(rawId);
    if (!id || owned[id]) continue;
    owned[id] = { acquiredAt: Math.max(0, Math.floor(Number(rawRecord?.acquiredAt) || 0)) };
  }
  const acquisitionOrder = [];
  for (const rawId of state?.acquisitionOrder || []) {
    const id = normalizeKeyItemId(rawId);
    if (owned[id] && !acquisitionOrder.includes(id)) acquisitionOrder.push(id);
  }
  for (const id of Object.keys(owned)) {
    if (!acquisitionOrder.includes(id)) acquisitionOrder.push(id);
  }
  return { owned, acquisitionOrder };
}

export function hasKeyItem(state, keyItemId) {
  return Boolean(normalizeKeyItemState(state).owned[normalizeKeyItemId(keyItemId)]);
}

export function grantKeyItem(state, keyItemId, acquiredAt = Date.now()) {
  const source = normalizeKeyItemState(state);
  const item = getKeyItem(keyItemId);
  if (!item) return { keyItems: source, gained: false, reason: "unknownKeyItem" };
  if (source.owned[item.id]) return { keyItems: source, gained: false, reason: "alreadyOwned" };
  return {
    keyItems: {
      owned: { ...source.owned, [item.id]: { acquiredAt: Math.max(0, Math.floor(Number(acquiredAt) || 0)) } },
      acquisitionOrder: [...source.acquisitionOrder, item.id]
    },
    gained: true,
    reason: ""
  };
}

export function consumeKeyItem(state, keyItemId) {
  const source = normalizeKeyItemState(state);
  const id = normalizeKeyItemId(keyItemId);
  if (!source.owned[id]) return { keyItems: source, consumed: false, reason: "notOwned" };
  const owned = { ...source.owned };
  delete owned[id];
  return {
    keyItems: { owned, acquisitionOrder: source.acquisitionOrder.filter(ownedId => ownedId !== id) },
    consumed: true,
    reason: ""
  };
}

export function listOwnedKeyItems(state) {
  const source = normalizeKeyItemState(state);
  return source.acquisitionOrder.map(id => getKeyItem(id)).filter(Boolean);
}

function normalizeKeyItemId(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(value) ? value : "";
}
