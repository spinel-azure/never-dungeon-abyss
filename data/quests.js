import { grantCard } from "./deck.js";

export const MAX_ACTIVE_QUESTS = 3;
export const GUILD_TRIAL_QUEST_ID = "guild_001_abyss_rat";
export const SLIME_EXTERMINATION_QUEST_ID = "guild_002_cave_slime";
export const FLOOR_SURVEY_QUEST_ID = "guild_003_b1f_survey";
export const B2F_UNLOCK_QUEST_IDS = Object.freeze([
  GUILD_TRIAL_QUEST_ID,
  SLIME_EXTERMINATION_QUEST_ID,
  FLOOR_SURVEY_QUEST_ID
]);

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
    id: SLIME_EXTERMINATION_QUEST_ID,
    number: "002",
    title: "スライム退治",
    client: "ギルド長",
    objectiveType: "defeatEnemy",
    targetId: "cave_slime",
    targetName: "洞窟スライム",
    objectiveLabel: "洞窟スライムを15匹討伐する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_hp_up",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fでスライムが異常発生しやがった。数を減らしてくれ。",
      "やつらは奈落ネズミより手強いぜ。気をつけろ。"
    ]),
    available: true
  }),
  Object.freeze({
    id: FLOOR_SURVEY_QUEST_ID,
    number: "003",
    title: "迷宮地下1階調査",
    client: "ギルド長",
    objectiveType: "exploreFloor",
    targetDepth: 1,
    objectiveLabel: "B1Fを全て踏破する",
    requiredCount: 100,
    reward: Object.freeze({
      type: "card",
      cardId: "common_sp_up",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fを調査してほしい。ただし、奈落は入る度にその姿を",
      "変える。一度も帰還せずに隅々まで調べてくれ。"
    ]),
    available: true
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
    ? [...new Set(candidate.completedQuestIds.filter(id => getQuestById(id)))]
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

export function recordFloorExploration(character, { depth, explored } = {}) {
  const quests = normalizeQuestState(character?.quests);
  const entry = quests.active[FLOOR_SURVEY_QUEST_ID];
  const quest = getQuestById(FLOOR_SURVEY_QUEST_ID);
  if (!entry || entry.progress >= quest.requiredCount) return character;

  const progress = Number(depth) === quest.targetDepth
    ? Math.min(
      quest.requiredCount,
      Array.isArray(explored)
        ? explored.reduce(
          (total, row) => total + (Array.isArray(row) ? row.filter(Boolean).length : 0),
          0
        )
        : 0
    )
    : 0;
  if (entry.progress === progress) return character;
  entry.progress = progress;
  return { ...character, quests };
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
  return B2F_UNLOCK_QUEST_IDS.every(questId => getQuestProgress(character, questId).completed);
}

export function shouldForceEnemy(character, { depth, enemyId } = {}) {
  if (Number(depth) !== 1) return false;
  const slimeProgress = getQuestProgress(character, SLIME_EXTERMINATION_QUEST_ID);
  if (slimeProgress.active && !slimeProgress.readyToReport) {
    return enemyId === "cave_slime";
  }
  const ratProgress = getQuestProgress(character, GUILD_TRIAL_QUEST_ID);
  return ratProgress.active
    && !ratProgress.readyToReport
    && enemyId === "abyss_rat";
}

function result(character, accepted, reason = "") {
  return { character, accepted, reason };
}
