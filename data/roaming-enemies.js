export const ROAMING_ENEMY_DEFINITIONS = Object.freeze([Object.freeze({
  id: 'verfolger', enemyId: 'verfolger', imageId: 'verfolger_silhouette',
  image: 'images/npc/NPC_event_27.avif', minDepth: 90, maxDepth: 98,
  explorationBgmKey: 'verfolgerPresence', escapeRate: 1, renderScale: 1.5, maxHeightRatio: .6,
  encounterImageId: 'verfolger_revealed', encounterImage: 'images/bosses/boss_22b.avif',
  encounterMessage: '黒い影が、ゆっくりと身を起こした。\n追ってきていたのは――こいつだ。\n＊Aボタン：戦闘開始'
})]);
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
    friendly: Boolean(definition.friendly),
    patrolOnly: Boolean(definition.patrolOnly),
    alternateImage: String(definition.alternateImage || ""),
    renderScale: Math.max(0.25, Number(definition.renderScale) || 1),
    escapeRate: Math.max(0, Math.min(1, Number(definition.escapeRate) || 0)),
    maxHeightRatio: Math.max(0, Math.min(1, Number(definition.maxHeightRatio) || 0)),
    encounterImageId: String(definition.encounterImageId || ''),
    encounterImage: String(definition.encounterImage || ''),
    explorationBgmKey: String(definition.explorationBgmKey || ''),
    encounterMessage: String(definition.encounterMessage || ''),
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
