export const QUEST_EVENTS_BY_DEPTH = Object.freeze({
  22: Object.freeze({ id: "thieves_clue_emblem_event", questId: "guild_011", keyItemId: "thieves_clue_emblem", flag: "quest_011_clue_emblem_found" }),
  24: Object.freeze({ id: "thieves_clue_ledger_event", questId: "guild_011", keyItemId: "thieves_clue_ledger", flag: "quest_011_clue_ledger_found" }),
  26: Object.freeze({ id: "thieves_clue_map_event", questId: "guild_011", keyItemId: "thieves_clue_map", flag: "quest_011_clue_map_found" }),
  95: Object.freeze({
    id: "lichtbringer_b95f_event", keyItemId: "lichtbringer",
    flag: "lichtbringer_b95f_found", alwaysAvailable: true
  }),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
    const depth = index + 51;
    return [depth, Object.freeze({
      id: `special_medicine_ingredient_b${depth}f_event`,
      questId: "guild_016",
      keyItemId: "special_medicine_ingredient",
      flag: `quest_016_ingredient_b${depth}f_found`
    })];
  }))
});

export function getQuestEventForDepth(depth, progress = {}) {
  const event = QUEST_EVENTS_BY_DEPTH[Math.floor(Number(depth) || 0)];
  if (!event || (!event.alwaysAvailable && !progress.activeQuestIds?.includes(event.questId))
    || progress.eventFlags?.[event.flag]) return null;
  return structuredClone(event);
}
