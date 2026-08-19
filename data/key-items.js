export const KEY_ITEMS = Object.freeze({
  queen_tiara: Object.freeze({
    id: "queen_tiara",
    name: "女王のティアラ",
    description: "女王の物と思われる美しいティアラ。淡い光をたたえている。",
    sellable: false,
    consumable: false,
    version: 1
  }),
  thieves_clue_emblem: Object.freeze({
    id: "thieves_clue_emblem", name: "盗賊団の徽章",
    description: "盗賊団が仲間の証として使っている徽章。", sellable: false, consumable: false, version: 1
  }),
  thieves_clue_ledger: Object.freeze({
    id: "thieves_clue_ledger", name: "暗号化された取引記録",
    description: "暗号で記された盗賊団の取引記録。", sellable: false, consumable: false, version: 1
  }),
  thieves_clue_map: Object.freeze({
    id: "thieves_clue_map", name: "隠れ家の地図",
    description: "盗賊団の隠れ家へ続く道が記された地図。", sellable: false, consumable: false, version: 1
  }),
  special_medicine_ingredient: Object.freeze({
    id: "special_medicine_ingredient", name: "特効薬の素材",
    description: "密林区域で見つけた、腰痛の特効薬に必要な素材。", sellable: false,
    consumable: true, stackable: true, maximumOwned: 8, version: 1
  }),
  red_rust_key_b9f: Object.freeze({
    id: "red_rust_key_b9f",
    name: "赤錆びた鍵",
    description: "B9Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b19f: Object.freeze({
    id: "red_rust_key_b19f",
    name: "赤錆びた鍵",
    description: "B19Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b29f: Object.freeze({
    id: "red_rust_key_b29f",
    name: "赤錆びた鍵",
    description: "B29Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b39f: Object.freeze({
    id: "red_rust_key_b39f",
    name: "赤錆びた鍵",
    description: "B39Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b49f: Object.freeze({
    id: "red_rust_key_b49f",
    name: "赤錆びた鍵",
    description: "B49Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b59f: Object.freeze({
    id: "red_rust_key_b59f",
    name: "赤錆びた鍵",
    description: "B59Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  }),
  red_rust_key_b39f: Object.freeze({
    id: "red_rust_key_b39f",
    name: "赤錆びた鍵",
    description: "B39Fで見つけた赤錆びた鍵。赤い扉を開けられそうだ。",
    sellable: false,
    consumable: true,
    version: 1
  })
});

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
    const item = getKeyItem(id);
    const maximum = item?.stackable ? Math.max(1, Math.floor(Number(item.maximumOwned) || 99)) : 1;
    owned[id] = {
      acquiredAt: Math.max(0, Math.floor(Number(rawRecord?.acquiredAt) || 0)),
      count: Math.min(maximum, Math.max(1, Math.floor(Number(rawRecord?.count) || 1)))
    };
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

export function getKeyItemCount(state, keyItemId) {
  return Math.max(0, Math.floor(Number(normalizeKeyItemState(state).owned[normalizeKeyItemId(keyItemId)]?.count) || 0));
}

export function grantKeyItem(state, keyItemId, acquiredAt = Date.now(), amount = 1) {
  const source = normalizeKeyItemState(state);
  const item = getKeyItem(keyItemId);
  if (!item) return { keyItems: source, gained: false, reason: "unknownKeyItem" };
  const current = getKeyItemCount(source, item.id);
  const maximum = item.stackable ? Math.max(1, Math.floor(Number(item.maximumOwned) || 99)) : 1;
  const nextCount = Math.min(maximum, current + Math.max(1, Math.floor(Number(amount) || 1)));
  if (nextCount <= current) return { keyItems: source, gained: false, amount: 0, reason: "alreadyOwned" };
  return {
    keyItems: {
      owned: { ...source.owned, [item.id]: {
        acquiredAt: source.owned[item.id]?.acquiredAt ?? Math.max(0, Math.floor(Number(acquiredAt) || 0)),
        count: nextCount
      } },
      acquisitionOrder: source.acquisitionOrder.includes(item.id) ? source.acquisitionOrder : [...source.acquisitionOrder, item.id]
    },
    gained: true,
    amount: nextCount - current,
    reason: ""
  };
}

export function consumeKeyItem(state, keyItemId, amount = 1) {
  const source = normalizeKeyItemState(state);
  const id = normalizeKeyItemId(keyItemId);
  if (!source.owned[id]) return { keyItems: source, consumed: false, reason: "notOwned" };
  const requested = Math.max(1, Math.floor(Number(amount) || 1));
  const current = getKeyItemCount(source, id);
  if (current < requested) return { keyItems: source, consumed: false, amount: 0, reason: "notEnough" };
  const owned = { ...source.owned };
  if (current === requested) delete owned[id];
  else owned[id] = { ...owned[id], count: current - requested };
  return {
    keyItems: { owned, acquisitionOrder: current === requested ? source.acquisitionOrder.filter(ownedId => ownedId !== id) : source.acquisitionOrder },
    consumed: true,
    amount: requested,
    reason: ""
  };
}

export function listOwnedKeyItems(state) {
  const source = normalizeKeyItemState(state);
  return source.acquisitionOrder.map(id => {
    const item = getKeyItem(id);
    return item ? { ...item, count: getKeyItemCount(source, id) } : null;
  }).filter(Boolean);
}

function normalizeKeyItemId(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(value) ? value : "";
}
