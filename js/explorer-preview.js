// Phase 1 only: no character, storage, generator or transfer dependencies.
let enabled = false;
const listeners = new Set();
export const isExplorerTestEnabled = () => enabled;
export function setExplorerTestEnabled(value) {
  enabled = Boolean(value);
  for (const listener of listeners) listener(enabled);
}
export function onExplorerTestChanged(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export const PREVIEW_COUNTS = Object.freeze([0, 1, 5, 6, 10]);
export function getTentBackground(hour = new Date().getHours()) {
  const suffix = hour >= 5 && hour < 8 ? 'f' : hour >= 8 && hour < 17 ? 'e' : hour >= 17 && hour < 19 ? 'd' : 'c';
  return `images/background/dungeon_01${suffix}.avif`;
}
const names = ['甲虫の地図', '残された黄金の地図', '呪われし奈落の地図', '見果てぬ凍れる深淵に眠る忘れられた王の地図', 'ざわめく甲虫の地図', '残響の地図', 'ざわめく甲虫の地図', '薄明の地図', 'あらぶる黄金の地図', '静寂の地図'];
export const PREVIEW_MAPS = Object.freeze(names.map((name, index) => Object.freeze({
  id: `preview-${index}`, name, level: [1, 41, 18, 99, 27, 52, 27, 8, 63, 88][index],
  discoverer: index === 6 ? 'ALC' : index === 4 ? 'スピネ' : ['†ルル', 'ALC', 'スピネ'][index % 3],
  seed: index === 4 || index === 6 ? 7291 : index * 301,
  rulesetVersion: 1, cleared: index % 3 === 1, requiredDepth: [1, 40, 20, 90, 30, 50, 30, 10, 60, 80][index]
})));
export function createMapPreview(count = 10) {
  return { count: PREVIEW_COUNTS.includes(count) ? count : 10, index: 0, page: 0, armed: -1, detail: false };
}
export function moveMapPreview(state, action) {
  if (!state.count || state.detail) return;
  const pages = Math.ceil(state.count / 5);
  if (action === 'up' || action === 'down') {
    state.index = (state.index + (action === 'down' ? 1 : state.count - 1)) % state.count;
    state.page = Math.floor(state.index / 5);
  } else if ((action === 'left' || action === 'right') && pages > 1) {
    state.page = (state.page + (action === 'right' ? 1 : pages - 1)) % pages;
    state.index = state.page * 5;
  }
  state.armed = -1;
}
export function selectMapPreview(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.count) return false;
  const confirmed = state.armed === index;
  state.index = index; state.page = Math.floor(index / 5); state.armed = confirmed ? -1 : index;
  state.detail = confirmed;
  return confirmed;
}
