import { grantCard } from "./deck.js";

export const MAX_ACTIVE_QUESTS = 3;
export const GUILD_TRIAL_QUEST_ID = "guild_001_abyss_rat";

export const QUESTS = Object.freeze([
  Object.freeze({
    id: "guild_001_abyss_rat",
    number: "001",
    title: "奈落ネズミ退治",
    client: "ギルド長",
    objectiveType: "defeatEnemy",
    targetId: "abyss_rat",
    targetName: "奈落ネズミ",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_gale_feather",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fで発生したネズミの大量発生を",
      "食い止めてくれ。数が多すぎて困っている。"
    ]),
    available: true
  }),
  Object.freeze({
    id: "guild_002_cave_slime",
    number: "002",
    title: "スライム退治",
    available: false
  }),
  Object.freeze({
    id: "guild_003_abyss_rabbit",
    number: "003",
    title: "奈落ウサギ退治",
    available: false
  })
]);

export function getQuestById(questId) {
  return QUESTS.find(quest => quest.id === questId) || null;
}

export function normalizeQuestState(candidate) {
  const active = {};
  if (candidate?.active && typeof candidate.active === "object") {
    Object.entries(candidate.active).forEach(([questId, entry]) => {
      const quest = getQuestById(questId);
      if (!quest?.available) return;
      active[questId] = {
        progress: Math.max(
          0,
          Math.min(quest.requiredCount, Math.floor(Number(entry?.progress) || 0))
        )
      };
    });
  }
  const completedQuestIds = Array.isArray(candidate?.completedQuestIds)
    ? [...new Set(candidate.completedQuestIds.filter(id => getQuestById(id)?.available))]
    : [];
  return { active, completedQuestIds };
}

export function getQuestProgress(character, questId) {
  const quest = getQuestById(questId);
  const state = normalizeQuestState(character?.quests);
  const progress = Math.max(0, Math.floor(Number(state.active[questId]?.progress) || 0));
  return {
    quest,
    active: Boolean(state.active[questId]),
    completed: state.completedQuestIds.includes(questId),
    progress,
    readyToReport: Boolean(quest && state.active[questId] && progress >= quest.requiredCount)
  };
}

export function acceptQuest(character, questId) {
  const quest = getQuestById(questId);
  const quests = normalizeQuestState(character?.quests);
  if (!quest?.available) return result(character, false, "unavailable");
  if (quests.completedQuestIds.includes(quest.id)) return result(character, false, "completed");
  if (quests.active[quest.id]) return result(character, false, "alreadyAccepted");
  if (Object.keys(quests.active).length >= MAX_ACTIVE_QUESTS) {
    return result(character, false, "activeLimit");
  }
  quests.active[quest.id] = { progress: 0 };
  return result({ ...character, quests }, true);
}

export function abandonQuest(character, questId) {
  const quests = normalizeQuestState(character?.quests);
  if (!quests.active[questId]) return result(character, false, "notActive");
  delete quests.active[questId];
  return result({ ...character, quests }, true);
}

export function recordEnemyDefeat(character, enemyId) {
  const quests = normalizeQuestState(character?.quests);
  let updated = false;
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatEnemy" || quest.targetId !== enemyId) return;
    if (entry.progress >= quest.requiredCount) return;
    entry.progress = Math.min(quest.requiredCount, entry.progress + 1);
    updated = true;
  });
  return updated ? { ...character, quests } : character;
}

export function reportQuest(character, questId) {
  const progress = getQuestProgress(character, questId);
  if (!progress.readyToReport) return result(character, false, "notReady");
  const quests = normalizeQuestState(character.quests);
  delete quests.active[questId];
  quests.completedQuestIds = [...new Set([...quests.completedQuestIds, questId])];
  let next = { ...character, quests };
  let rewardCardId = null;
  const bonusGold = Math.max(0, Math.floor(Number(progress.quest.reward?.bonusGold) || 0));
  if (progress.quest.reward?.type === "card") {
    const reward = grantCard(
      character.cards,
      progress.quest.reward.cardId,
      1,
      character.deckCost
    );
    next = { ...next, cards: reward.cards };
    if (reward.gained > 0) rewardCardId = progress.quest.reward.cardId;
  }
  if (bonusGold > 0) {
    next = {
      ...next,
      gold: Math.max(0, Math.floor(Number(character.gold) || 0)) + bonusGold
    };
  }
  return { character: next, accepted: true, rewardCardId, bonusGold };
}

export function hasActiveQuest(character) {
  return Object.keys(normalizeQuestState(character?.quests).active).length > 0;
}

export function isDungeonDepthUnlocked(character, depth) {
  const requestedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  if (requestedDepth !== 2) return true;
  return getQuestProgress(character, GUILD_TRIAL_QUEST_ID).completed;
}

export function shouldForceEnemy(character, { depth, enemyId } = {}) {
  const progress = getQuestProgress(character, GUILD_TRIAL_QUEST_ID);
  return Number(depth) === 1
    && progress.active
    && !progress.readyToReport
    && enemyId === "abyss_rat";
}

function result(character, accepted, reason = "") {
  return { character, accepted, reason };
}
