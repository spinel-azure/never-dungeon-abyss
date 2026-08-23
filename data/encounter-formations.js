function normalizeFloor(depth) {
  return Math.max(1, Math.floor(Number(depth) || 1));
}

function includesFloor(floors, depth) {
  return !Array.isArray(floors) || floors.map(Number).includes(depth);
}

export function defineEncounterFormation(members, conditions = {}, weight = 1) {
  return Object.freeze({
    members: Object.freeze([...(members || [])]),
    weight: Math.max(0, Number(weight) || 0),
    conditions: Object.freeze({
      ...conditions,
      ...(Array.isArray(conditions.exactDepths) ? { exactDepths: Object.freeze([...conditions.exactDepths]) } : {}),
      ...(Array.isArray(conditions.excludedDepths) ? { excludedDepths: Object.freeze([...conditions.excludedDepths]) } : {}),
      ...(Array.isArray(conditions.requiredFlags) ? { requiredFlags: Object.freeze([...conditions.requiredFlags]) } : {}),
      ...(Array.isArray(conditions.forbiddenFlags) ? { forbiddenFlags: Object.freeze([...conditions.forbiddenFlags]) } : {})
    })
  });
}

export function matchesEncounterFormationConditions(conditions = {}, { depth = 1, flags = {} } = {}) {
  const floor = normalizeFloor(depth);
  if (conditions.minimumDepth != null && floor < Number(conditions.minimumDepth)) return false;
  if (conditions.maximumDepth != null && floor > Number(conditions.maximumDepth)) return false;
  if (!includesFloor(conditions.exactDepths, floor)) return false;
  if (Array.isArray(conditions.excludedDepths) && conditions.excludedDepths.map(Number).includes(floor)) return false;
  if (Array.isArray(conditions.requiredFlags) && conditions.requiredFlags.some(flag => !flags?.[flag])) return false;
  if (Array.isArray(conditions.forbiddenFlags) && conditions.forbiddenFlags.some(flag => flags?.[flag])) return false;
  return true;
}

export function selectEncounterFormationIds(formations, { depth = 1, flags = {}, rng = Math.random } = {}) {
  const eligible = (formations || []).filter(formation => (
    formation?.members?.length
    && formation.weight > 0
    && matchesEncounterFormationConditions(formation.conditions, { depth, flags })
  ));
  const totalWeight = eligible.reduce((total, formation) => total + formation.weight, 0);
  if (totalWeight <= 0) return [];
  let roll = Math.max(0, Math.min(0.999999999, Number(rng()) || 0)) * totalWeight;
  for (const formation of eligible) {
    if (roll < formation.weight) return [...formation.members];
    roll -= formation.weight;
  }
  return [...eligible.at(-1).members];
}
