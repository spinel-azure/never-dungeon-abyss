import { getStatusEffect } from "../data/status-effects.js";

export function applyStatus(statuses = [], application = {}) {
  if (!application?.success) return cloneStatuses(statuses);
  const definition = getStatusEffect(application.statusId);
  if (!definition) return cloneStatuses(statuses);
  const next = cloneStatuses(statuses);
  const status = {
    ...definition,
    statusId: definition.id,
    remainingTurns: application.duration ?? definition.duration,
    skipInitialDecrement: Boolean(application.skipInitialDecrement),
    active: true
  };
  const index = next.findIndex(item => (item.id || item.statusId) === definition.id);
  if (index >= 0) next[index] = status;
  else next.push(status);
  return next;
}

export function applyStatusApplications(statuses = [], applications = []) {
  return applications.reduce((current, application) => applyStatus(current, application), statuses);
}

export function resolveActionOpportunity(statuses = []) {
  const next = cloneStatuses(statuses);
  const skip = next.find(status =>
    (status.id || status.statusId) === "action_skip"
    && Number(status.actionSkips) > 0
  );
  if (!skip) return { skipped: false, statuses: next };
  skip.actionSkips -= 1;
  return {
    skipped: true,
    statuses: next.filter(status =>
      (status.id || status.statusId) !== "action_skip"
      || Number(status.actionSkips) > 0
    )
  };
}

export function resolveEndOfAction({ statuses = [], maxHp = 0 } = {}) {
  let poisonDamage = 0;
  let bleedingDamage = 0;
  let deadlyPoisonDamage = 0;
  const next = [];
  for (const original of cloneStatuses(statuses)) {
    const status = { ...original };
    const id = status.id || status.statusId;
    if (id === "poison") {
      poisonDamage += Math.max(
        Number(status.minimumDamage) || 1,
        Math.floor(Number(maxHp) * (Number(status.damageMaxHpRate) || 0))
      );
    }
    if (id === "bleeding") {
      bleedingDamage += Math.max(Number(status.minimumDamage) || 1,
        Math.floor(Number(maxHp) * (Number(status.damageMaxHpRate) || 0)));
    }
    if (id === "deadly_poison") {
      deadlyPoisonDamage += Math.min(
        Math.max(1, Number(status.maximumDamage) || Number.MAX_SAFE_INTEGER),
        Math.max(Number(status.minimumDamage) || 1,
          Math.floor(Number(maxHp) * (Number(status.damageMaxHpRate) || 0)))
      );
    }
    if (!Number.isFinite(Number(status.remainingTurns))) {
      next.push(status);
      continue;
    }
    if (status.skipInitialDecrement) {
      status.skipInitialDecrement = false;
      next.push(status);
      continue;
    }
    status.remainingTurns -= 1;
    if (status.remainingTurns > 0) next.push(status);
  }
  return { statuses: next, poisonDamage, bleedingDamage, deadlyPoisonDamage };
}

export function getNonlethalPoisonDamage(currentHp, requestedDamage) {
  const hp = Math.max(0, Math.floor(Number(currentHp) || 0));
  const damage = Math.max(0, Math.floor(Number(requestedDamage) || 0));
  return Math.min(damage, Math.max(0, hp - 1));
}

export function getPhysicalDamageReduction(statuses = []) {
  return Math.max(0, ...statuses
    .filter(status => status.active !== false)
    .map(status => Number(status.physicalDamageReduction) || 0));
}

export function clearBattleOnlyStatuses(statuses = []) {
  return cloneStatuses(statuses).filter(status => status.expiresAfterBattle !== true);
}

export function getStatusResistanceBonus(statuses = []) {
  return statuses
    .filter(status => status.active !== false)
    .reduce((maximum, status) =>
      Math.max(maximum, (Number(status.statusResistancePoints) || 0) / 100), 0);
}

export function getDefenseMultiplier(statuses = []) {
  return statuses
    .filter(status => status.active !== false)
    .reduce((minimum, status) =>
      Math.min(minimum, Number(status.defenseMultiplier) || 1), 1);
}

function cloneStatuses(statuses) {
  return Array.isArray(statuses) ? statuses.map(status => ({ ...status })) : [];
}
