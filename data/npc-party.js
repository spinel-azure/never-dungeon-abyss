import { getNpcDefinition, NPC_PARTY_LIMIT, NPC_SUPPORT_ENABLED } from "./npc-definitions.js";
import { getNpcStagePassive } from "./npc-passives.js";

export function createInitialNpcSystem() {
  return { registeredIds: [], activeIds: [], records: {}, renewal: null, expeditionMaxDepth: 0 };
}

export function normalizeNpcSystem(value) {
  const source = value && typeof value === "object" ? value : {};
  const registeredIds = uniqueKnown(source.registeredIds);
  const activeIds = [];
  const jobs = new Set();
  for (const id of uniqueKnown(source.activeIds)) {
    const npc = getNpcDefinition(id);
    if (!registeredIds.includes(id) || jobs.has(npc.job) || activeIds.length >= NPC_PARTY_LIMIT) continue;
    jobs.add(npc.job);
    activeIds.push(id);
  }
  const records = {};
  for (const id of registeredIds) {
    const record = source.records?.[id] || {};
    const maxDepth = Math.max(0, Math.min(100, Math.floor(Number(record.maxDepth) || 0)));
    records[id] = {
      maxDepth,
      growthStage: Math.max(0, Math.min(10, Math.floor(maxDepth / 10))),
      charge: Math.max(0, Math.min(100, Math.floor(Number(record.charge) || 0))),
      chargeCooldown: Math.max(0, Math.min(2, Math.floor(Number(record.chargeCooldown) || 0))),
      passiveStepCount: Math.max(0, Math.floor(Number(record.passiveStepCount) || 0)) % 5
    };
  }
  const renewal = normalizeRenewal(source.renewal, activeIds);
  return {
    registeredIds,
    activeIds,
    records,
    renewal,
    expeditionMaxDepth: Math.max(0, Math.min(100, Math.floor(Number(source.expeditionMaxDepth) || 0)))
  };
}

export function applyNpcExplorationPassives(character) {
  if (!NPC_SUPPORT_ENABLED || !character) return character;
  const state = normalizeNpcSystem(character.npcSystem);
  if (!state.activeIds.length) return { ...character, npcSystem: state };
  const records = { ...state.records };
  let hp = character.hp;
  let sp = character.sp;
  for (const npcId of state.activeIds) {
    const record = records[npcId];
    const passive = getNpcStagePassive(npcId, record?.growthStage);
    if (!passive?.stepInterval) continue;
    const passiveStepCount = (record.passiveStepCount + 1) % passive.stepInterval;
    records[npcId] = { ...record, passiveStepCount };
    if (passiveStepCount !== 0) continue;
    if (passive.hpRecovery) hp = Math.min(character.maxHp, hp + passive.hpRecovery);
    if (passive.spRecovery) sp = Math.min(character.maxSp, sp + passive.spRecovery);
  }
  return { ...character, hp, sp, npcSystem: { ...state, records } };
}

function uniqueKnown(ids) {
  return [...new Set(Array.isArray(ids) ? ids : [])].filter(id => getNpcDefinition(id));
}

function normalizeRenewal(value, activeIds) {
  if (!value || typeof value !== "object" || !value.pending) return null;
  const ids = uniqueKnown(value.ids).filter(id => activeIds.includes(id));
  const completedIds = uniqueKnown(value.completedIds).filter(id => ids.includes(id));
  return ids.length ? { pending: true, token: String(value.token || ""), ids, completedIds } : null;
}

export function registerNpc(system, npcId) {
  const state = normalizeNpcSystem(system);
  const npc = getNpcDefinition(npcId);
  if (!NPC_SUPPORT_ENABLED) return { accepted: false, reason: "disabled", system: state };
  if (!npc) return { accepted: false, reason: "unknownNpc", system: state };
  if (state.registeredIds.includes(npcId)) return { accepted: false, reason: "alreadyRegistered", system: state };
  return { accepted: true, fee: 0, system: normalizeNpcSystem({ ...state, registeredIds: [...state.registeredIds, npcId] }) };
}

export function getNpcHireFee(character) {
  return Math.max(1, Math.floor(Number(character?.level) || 1)) * 10;
}

export function hireNpc(character, npcId) {
  const state = normalizeNpcSystem(character?.npcSystem);
  const npc = getNpcDefinition(npcId);
  const fee = getNpcHireFee(character);
  if (!NPC_SUPPORT_ENABLED) return failure(character, state, "disabled", fee);
  if (!npc || !state.registeredIds.includes(npcId)) return failure(character, state, "notRegistered", fee);
  if (state.activeIds.includes(npcId)) return failure(character, state, "alreadyActive", fee);
  if (state.activeIds.length >= NPC_PARTY_LIMIT) return failure(character, state, "partyFull", fee);
  if (state.activeIds.some(id => getNpcDefinition(id)?.job === npc.job)) return failure(character, state, "duplicateJob", fee);
  if ((Number(character?.gold) || 0) < fee) return failure(character, state, "insufficientGold", fee);
  return {
    accepted: true,
    fee,
    character: { ...character, gold: character.gold - fee, npcSystem: normalizeNpcSystem({ ...state, activeIds: [...state.activeIds, npcId] }) }
  };
}

function failure(character, system, reason, fee) {
  return { accepted: false, reason, fee, character: { ...character, npcSystem: system } };
}

export function recordNpcExpeditionDepth(character, depth) {
  if (!NPC_SUPPORT_ENABLED || !character) return character;
  const state = normalizeNpcSystem(character.npcSystem);
  if (!state.activeIds.length) return { ...character, npcSystem: state };
  return { ...character, npcSystem: { ...state, expeditionMaxDepth: Math.max(state.expeditionMaxDepth, Math.floor(Number(depth) || 0)) } };
}

export function beginNpcRenewal(character, token) {
  if (!NPC_SUPPORT_ENABLED || !character) return character;
  const state = normalizeNpcSystem(character.npcSystem);
  const records = { ...state.records };
  for (const id of state.activeIds) {
    const maxDepth = Math.max(records[id]?.maxDepth || 0, state.expeditionMaxDepth);
    records[id] = { ...records[id], maxDepth, growthStage: Math.min(10, Math.floor(maxDepth / 10)) };
  }
  const renewal = state.activeIds.length
    ? { pending: true, token: String(token), ids: [...state.activeIds], completedIds: [] }
    : null;
  return { ...character, npcSystem: normalizeNpcSystem({ ...state, records, renewal, expeditionMaxDepth: 0 }) };
}

export function resolveNpcRenewal(character, npcId, continueHire) {
  const state = normalizeNpcSystem(character?.npcSystem);
  const renewal = state.renewal;
  if (!renewal?.pending || renewal.completedIds.includes(npcId) || !renewal.ids.includes(npcId)) return { accepted: false, reason: "notPending", character };
  const fee = getNpcHireFee(character);
  const canPay = continueHire && character.gold >= fee;
  const activeIds = canPay ? state.activeIds : state.activeIds.filter(id => id !== npcId);
  const completedIds = [...renewal.completedIds, npcId];
  const done = completedIds.length >= renewal.ids.length;
  return {
    accepted: true,
    continued: canPay,
    forcedDismissal: continueHire && !canPay,
    fee: canPay ? fee : 0,
    character: {
      ...character,
      gold: character.gold - (canPay ? fee : 0),
      npcSystem: normalizeNpcSystem({ ...state, activeIds, renewal: done ? null : { ...renewal, completedIds } })
    }
  };
}
