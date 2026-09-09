// Production entries are intentionally empty until the roaming enemy's floors,
// combatant, exploration artwork, and escape rate are finalized. A definition is:
// { id, enemyId, imageId, image, floors: [..] | minDepth/maxDepth, escapeRate, renderScale }.
export const ROAMING_ENEMY_DEFINITIONS = Object.freeze([]);

export function normalizeRoamingEnemyDefinition(definition = {}) {
  const floors = Array.isArray(definition.floors)
    ? [...new Set(definition.floors.map(value => Math.floor(Number(value) || 0)).filter(value => value > 0))]
    : [];
  const minDepth = Math.max(1, Math.floor(Number(definition.minDepth) || 1));
  const maxDepth = Math.max(minDepth, Math.floor(Number(definition.maxDepth) || minDepth));
  return {
    id: String(definition.id || ""),
    enemyId: String(definition.enemyId || ""),
    imageId: String(definition.imageId || definition.id || ""),
    image: String(definition.image || ""),
    renderScale: Math.max(0.25, Number(definition.renderScale) || 1),
    escapeRate: Math.max(0, Math.min(1, Number(definition.escapeRate) || 0)),
    floors,
    minDepth,
    maxDepth
  };
}

export function isRoamingEnemyDefinitionValid(definition = {}) {
  const normalized = normalizeRoamingEnemyDefinition(definition);
  return Boolean(normalized.id && normalized.enemyId && normalized.imageId && normalized.image);
}

export function isRoamingEnemyEnabledOnDepth(definition = {}, depth = 1) {
  const normalized = normalizeRoamingEnemyDefinition(definition);
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  return normalized.floors.length > 0
    ? normalized.floors.includes(floor)
    : floor >= normalized.minDepth && floor <= normalized.maxDepth;
}

export function getRoamingEnemyDefinitionForDepth(depth, definitions = ROAMING_ENEMY_DEFINITIONS) {
  return (Array.isArray(definitions) ? definitions : [])
    .map(normalizeRoamingEnemyDefinition)
    .find(definition => isRoamingEnemyDefinitionValid(definition)
      && isRoamingEnemyEnabledOnDepth(definition, depth)) || null;
}

export function getRoamingEnemyDefinitionById(id, definitions = ROAMING_ENEMY_DEFINITIONS) {
  const targetId = String(id || "");
  return (Array.isArray(definitions) ? definitions : [])
    .map(normalizeRoamingEnemyDefinition)
    .find(definition => definition.id === targetId && isRoamingEnemyDefinitionValid(definition)) || null;
}
