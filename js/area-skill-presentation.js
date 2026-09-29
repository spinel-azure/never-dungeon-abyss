const AREA_SKILLS = new Set(['call_goddess_name','fall_the_meteor','apocalypse','walpurgisnacht']);

export function getAreaPresentationGroup(events, event) {
  if (!Number.isInteger(event.areaPresentationGroup) || !AREA_SKILLS.has(event.battlePresentationId)
      || !event.hit || event.bossBarrierBlocked) return [];
  return events.filter(candidate => candidate.areaPresentationGroup === event.areaPresentationGroup
    && candidate.battlePresentationId === event.battlePresentationId
    && candidate.targetSide === 'enemy' && candidate.hit && !candidate.bossBarrierBlocked);
}
