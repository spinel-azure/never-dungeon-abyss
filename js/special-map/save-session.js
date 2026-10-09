// Only durable exploration state is stored. Render objects, callbacks and timers
// are rebuilt from the registered map; interrupted combat restarts its encounter.
const copy = value => value == null ? null : structuredClone(value);
const fields = ['expeditionId','torchFuel','battleExperience','bossKeyFound','bossDoorUnlocked',
  'bossDefeated','bossPreviewDismissed','presence','presenceSuppressedSteps',
  'presenceIncreaseReduction','incenseActive','crystalFloorStepCount','encounterSequence','cellPrompt'];
const facing = angle => ((Math.round((angle + Math.PI / 2) / (Math.PI / 2)) % 4) + 4) % 4;
export function serializeSpecialMapSession(s) {
  if (!s || s.experienceClosed || s.developmentSession) return null;
  const floors = (s.floors || [s]).map(f => ({
    // A tab may close in mid-step. Resume the last completed cell, not a cell
    // whose environment, encounter and torch cost have not yet been applied.
    playerX: f.motion ? Math.floor(f.motion.x) : f.playerX,
    playerY: f.motion ? Math.floor(f.motion.y) : f.playerY,
    direction: f.motion ? facing(f.motion.angle) : f.direction,
    explored: copy(f.explored), openedDoors: [...f.openedDoors], chestOpened: !!f.chestOpened
  }));
  return {version:1,kind:s.kind,mapKey:s.mapKey,fingerprint:s.fingerprint,
    currentFloor:s.currentFloor || 0,floors,
    values:Object.fromEntries(fields.filter(k => s[k] !== undefined).map(k => [k,s[k]])),
    torchFuel:s.renderState.torchFuel,
    lootBag:copy(s.lootBag),rewardedBattles:[...(s.rewardedBattles || [])],
    encounter:copy(s.bossDefeated ? null : s.battleContext || s.preparedBossContext),
    surveyedMasks:copy(s.surveyedMasks),surveyedMask:s.pendingSurveyMask ?? null};
}

export function restoreSpecialMapSession(s, data) {
  const floors = s.floors || [s];
  const bad = () => { throw Error('地図迷宮の中断データを復元できませんでした。'); };
  if (data?.version !== 1 || data.kind !== s.kind || data.mapKey !== s.mapKey || data.fingerprint !== s.fingerprint
      || !Number.isInteger(data.currentFloor) || !floors[data.currentFloor] || data.floors?.length !== floors.length) bad();
  for (const f of data.floors) {
    if (![f.playerX,f.playerY].every(n => Number.isInteger(n) && n >= 0 && n < 10)
      || !Number.isInteger(f.direction) || f.direction < 0 || f.direction > 3
      || f.explored?.length !== 10 || !f.explored.every(r => Array.isArray(r) && r.length === 10)
      || !Array.isArray(f.openedDoors)) bad();
  }
  for (const key of fields) if (Object.hasOwn(data.values || {},key)) s[key] = data.values[key];
  if (s.floors) s.currentFloor = data.currentFloor;
  floors.forEach((f,i) => {
    const saved = data.floors[i];
    Object.assign(f,{playerX:saved.playerX,playerY:saved.playerY,direction:saved.direction,
      explored:copy(saved.explored),openedDoors:new Set(saved.openedDoors.filter(k => f.doorByKey.has(k))),chestOpened:!!saved.chestOpened});
    Object.assign(f.renderState,{x:f.playerX+.5,y:f.playerY+.5,angle:f.direction*Math.PI/2-Math.PI/2,anim:null});
    f.motion=null;f.autoPath=null;
  });
  s.renderState.torchFuel=data.torchFuel;
  s.lootBag=copy(data.lootBag);s.rewardedBattles=new Set(data.rewardedBattles || []);
  s.battleContext=data.encounter ? {...copy(data.encounter),sessionId:s.encounterSessionId} : null;
  s.transitioning=!!s.battleContext;
  s.surveyNotice=null;s.surveyCompletionPending=false;s.bossFloorJinglePending=false;
  return s;
}

// Merge the not-yet-flushed survey into the reconstruction input. This does not
// grant rewards or modify the registered map until the existing survey save runs.
export function resumeMapOriginal(original, data) {
  return {...original,...(data?.surveyedMasks ? {surveyedMasks:data.surveyedMasks} : {}),
    ...(data?.surveyedMask != null ? {surveyedMask:data.surveyedMask} : {})};
}
