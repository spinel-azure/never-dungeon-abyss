export const CONDITION_LABELS = Object.freeze({
  good: "GOOD",
  poison: "POISON",
  deadlyPoison: "TOXIC",
  deathPoison: "DEATH POISON",
  bleeding: "BLEED"
});

export function getConditionLabel(statuses = []) {
  const statusIds = new Set((Array.isArray(statuses) ? statuses : [])
    .map(status => status?.statusId || status?.id || status)
    .filter(Boolean));
  if (statusIds.has("death_poison")) return CONDITION_LABELS.deathPoison;
  if (statusIds.has("bleeding")) return CONDITION_LABELS.bleeding;
  if (statusIds.has("deadly_poison")) return CONDITION_LABELS.deadlyPoison;
  if (statusIds.has("poison")) return CONDITION_LABELS.poison;
  return CONDITION_LABELS.good;
}
