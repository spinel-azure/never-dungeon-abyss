import { grantCard } from "./deck.js";

export const MAX_ACTIVE_QUESTS = 3;
export const GUILD_TRIAL_QUEST_ID = "guild_001_abyss_rat";
export const SLIME_EXTERMINATION_QUEST_ID = "guild_002_cave_slime";
export const FLOOR_SURVEY_QUEST_ID = "guild_003_b1f_survey";
export const RABBIT_EXTERMINATION_QUEST_ID = "guild_004_abyss_rabbit";
export const WANDERING_DEAD_EXTERMINATION_QUEST_ID = "guild_005";
export const BLACK_BOX_INVESTIGATION_QUEST_ID = "guild_006";
export const RED_DOOR_INVESTIGATION_QUEST_ID = "guild_007";
export const QUEEN_SHADOW_QUEST_ID = "guild_008";
export const JABBERWOCK_QUEST_ID = "guild_009";
export const QUEEN_SHADOW_PROGRESS_FLAGS = Object.freeze([
  "quest_008_shadow_b10f_found",
  "quest_008_shadow_b11f_found",
  "quest_008_shadow_b12f_found",
  "quest_008_shadow_b13f_found",
  "quest_008_tiara_found"
]);
export const RED_DOOR_DEFENSE_CARD_FLAG = "guild_007_defense_card_received";
export const RED_DOOR_DEFENSE_CARD_ID = "rare_defense_up";
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
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "abyss_rat",
    targetName: "奈落ネズミ",
    targetDepth: 1,
    forceTargetEnemy: true,
    forcePriority: 10,
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_gale_feather",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fでネズミが異常繁殖している。外にあふれ出したら",
      "面倒だ。食い止めてくれ。"
    ]),
    available: true
  }),
  Object.freeze({
    id: SLIME_EXTERMINATION_QUEST_ID,
    number: "002",
    title: "スライム退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "cave_slime",
    targetName: "洞窟スライム",
    targetDepth: 1,
    forceTargetEnemy: true,
    forcePriority: 20,
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
    client: "ギルドマスター",
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
  }),
  Object.freeze({
    id: RABBIT_EXTERMINATION_QUEST_ID,
    number: "004",
    title: "奈落ウサギ退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "abyss_rabbit",
    targetName: "奈落ウサギ",
    targetDepth: 2,
    forceTargetEnemy: true,
    forcePriority: 10,
    objectiveLabel: "奈落ウサギを15匹退治する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_alertness",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB2Fでウサギが大量繁殖している。適度に数を減らしてくれ。",
      "奴らはいきなり襲ってくる。不意打ちには十分に気をつけろ。"
    ]),
    prerequisiteQuestIds: B2F_UNLOCK_QUEST_IDS,
    available: true
  }),
  Object.freeze({
    id: WANDERING_DEAD_EXTERMINATION_QUEST_ID,
    number: "005",
    title: "さまよう亡者退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "wandering_dead",
    targetName: "さまよう亡者",
    targetDepth: 4,
    forceTargetEnemy: true,
    forcePriority: 10,
    objectiveLabel: "さまよう亡者を15体退治する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_dexterity_lesson",
      label: "デッキカード×1",
      amount: 1,
      bonusGold: 400
    }),
    description: Object.freeze([
      "奈落のB4Fでさまよう亡者が多数目撃されている。",
      "この世に未練でもあるのだろうか…？犠牲者が増える前に",
      "対処してくれ。事前に聖水を用意しておくといいかもな。"
    ]),
    available: true
  }),
  Object.freeze({
    id: BLACK_BOX_INVESTIGATION_QUEST_ID, number: "006", title: "黒い箱の調査",
    client: "ギルドマスター", category: "other", objectiveType: "custom",
    targetName: "", targetDepth: 6, requiredCount: 1,
    objectiveLabel: "黒い箱を開けて中身を確かめる",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1,
      cardId: "common_first_aid", bonusGold: 400 }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "奈落のB6Fで黒い箱が置かれた部屋がある。",
      "しかし、開けに行った奴が誰も戻って来ない。",
      "調べに行ってくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([WANDERING_DEAD_EXTERMINATION_QUEST_ID]),
    customProgressFlag: "boss_quest_mimic_b6f_defeated",
    reportUnlockFlag: "black_chests_unlocked",
    available: true
  }),
  Object.freeze({
    id: RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "007",
    title: "赤い扉の調査",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "strange_knight_statue_b9f",
    targetName: "奇妙な彫像",
    targetDepth: 9,
    requiredCount: 1,
    objectiveLabel: "赤い扉を開けて中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード", amount: 1,
      cardId: "sr_ability_boost", bonusGold: 600
    }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "奈落のB9Fに開かずの赤い扉がある。",
      "扉を開けて、中がどうなっているのか調査してほしい。",
      "何があるか分からない。十分に注意しろ。"
    ]),
    persistentProgressFlag: "quest_007_strange_statue_defeated_while_active",
    completedTargetFlag: "boss_strange_knight_statue_b9f_defeated",
    available: true
  }),
  Object.freeze({
    id: QUEEN_SHADOW_QUEST_ID,
    number: "008",
    title: "女王の影を追え",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 14,
    requiredCount: 5,
    objectiveLabel: "女王らしき影を追跡する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "rare_resistance_spirit", bonusGold: 600
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "行方不明になった女王らしい姿を奈落B11F",
      "以降で見かけたという噂が広がっている。",
      "噂が本当なのか確かめてくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([RED_DOOR_INVESTIGATION_QUEST_ID]),
    persistentProgressFlags: QUEEN_SHADOW_PROGRESS_FLAGS,
    available: true
  }),
  Object.freeze({
    id: JABBERWOCK_QUEST_ID,
    number: "009",
    title: "燻り狂うもの",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "jabberwock_event_boss",
    targetName: "ジャバウォック",
    targetDepth: 16,
    requiredCount: 1,
    objectiveLabel: "ジャバウォックを退治する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "sr_floor_detection", bonusGold: 800
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落B16Fのとある場所にジャバウォックと呼ばれる",
      "恐ろしい怪物が出現するらしい。正体を突き止めて",
      "退治してくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([BLACK_BOX_INVESTIGATION_QUEST_ID]),
    persistentProgressFlag: "quest_009_jabberwock_defeated_while_active",
    completedTargetFlag: "boss_jabberwock_event_boss_defeated",
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
  const savedProgress = Math.max(0, Math.floor(Number(state.active[questId]?.progress) || 0));
  const targetAlreadyCompleted = Boolean(
    state.active[questId] && quest?.completedTargetFlag
    && character?.eventFlags?.[quest.completedTargetFlag]
  );
  const persistentProgress = Array.isArray(quest?.persistentProgressFlags)
    ? countSequentialProgressFlags(character, quest.persistentProgressFlags)
    : 0;
  const progress = targetAlreadyCompleted
    ? quest.requiredCount
    : Math.max(savedProgress, Math.min(quest?.requiredCount || 0, persistentProgress));
  return {
    quest,
    active: Boolean(state.active[questId]),
    completed: state.completedQuestIds.includes(questId),
    progress,
    readyToReport: Boolean(quest && state.active[questId] && progress >= quest.requiredCount)
  };
}

export function isQuestAvailable(character, questOrId) {
  const quest = typeof questOrId === "string" ? getQuestById(questOrId) : questOrId;
  if (!quest?.available) return false;
  const initialQuestGate = B2F_UNLOCK_QUEST_IDS.includes(quest.id)
    ? []
    : B2F_UNLOCK_QUEST_IDS;
  const questPrerequisites = Array.isArray(quest.prerequisiteQuestIds)
    ? quest.prerequisiteQuestIds
    : [];
  const prerequisites = [...new Set([...initialQuestGate, ...questPrerequisites])];
  return prerequisites.every(questId => getQuestProgress(character, questId).completed);
}

export function acceptQuest(character, questId) {
  const quest = getQuestById(questId);
  const quests = normalizeQuestState(character?.quests);
  if (!isQuestAvailable(character, quest)) return result(character, false, "unavailable");
  if (quests.completedQuestIds.includes(quest.id)) return result(character, false, "completed");
  if (quests.active[quest.id]) return result(character, false, "alreadyAccepted");
  if (Object.keys(quests.active).length >= MAX_ACTIVE_QUESTS) {
    return result(character, false, "activeLimit");
  }
  const persistentProgressFlag = quest.persistentProgressFlag || quest.customProgressFlag;
  const targetAlreadyCompleted = Boolean(
    quest.completedTargetFlag && character?.eventFlags?.[quest.completedTargetFlag]
  );
  const persistentProgress = Array.isArray(quest.persistentProgressFlags)
    ? countSequentialProgressFlags(character, quest.persistentProgressFlags)
    : 0;
  quests.active[quest.id] = {
    progress: targetAlreadyCompleted || (persistentProgressFlag && character?.eventFlags?.[persistentProgressFlag])
      ? quest.requiredCount : Math.min(quest.requiredCount, persistentProgress)
  };
  let next = { ...character, quests };
  let acceptanceRewardCardId = null;
  if (quest.id === RED_DOOR_INVESTIGATION_QUEST_ID) {
    const supply = grantRedDoorInvestigationSupply(next);
    next = supply.character;
    if (supply.gained > 0) acceptanceRewardCardId = RED_DOOR_DEFENSE_CARD_ID;
  }
  return { ...result(next, true), acceptanceRewardCardId };
}

export function grantRedDoorInvestigationSupply(character) {
  if (!character || character.eventFlags?.[RED_DOOR_DEFENSE_CARD_FLAG]) {
    return { character, accepted: false, gained: 0, reason: "alreadyReceived" };
  }
  const quests = normalizeQuestState(character.quests);
  const eligible = Boolean(
    quests.active[RED_DOOR_INVESTIGATION_QUEST_ID]
    || quests.completedQuestIds.includes(RED_DOOR_INVESTIGATION_QUEST_ID)
  );
  if (!eligible) return { character, accepted: false, gained: 0, reason: "notEligible" };
  const reward = grantCard(character.cards, RED_DOOR_DEFENSE_CARD_ID, 1, character.deckCost);
  return {
    character: {
      ...character,
      cards: reward.cards,
      eventFlags: {
        ...(character.eventFlags || {}),
        [RED_DOOR_DEFENSE_CARD_FLAG]: true
      }
    },
    accepted: true,
    gained: reward.gained,
    reason: ""
  };
}

export function abandonQuest(character, questId) {
  const quests = normalizeQuestState(character?.quests);
  if (!quests.active[questId]) return result(character, false, "notActive");
  delete quests.active[questId];
  return result({ ...character, quests }, true);
}

export function recordEnemyDefeat(character, enemyId, depth = null) {
  const quests = normalizeQuestState(character?.quests);
  let updated = false;
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatEnemy" || quest.targetId !== enemyId) return;
    if (depth != null && quest.targetDepth != null && Number(depth) !== Number(quest.targetDepth)) return;
    if (entry.progress >= quest.requiredCount) return;
    entry.progress = Math.min(quest.requiredCount, entry.progress + 1);
    updated = true;
  });
  return updated ? { ...character, quests } : character;
}

export function recordBossDefeat(character, bossId, depth = null) {
  const quests = normalizeQuestState(character?.quests);
  let eventFlags = character?.eventFlags || {};
  let updated = false;
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatBoss" || quest.targetId !== bossId) return;
    if (depth != null && quest.targetDepth != null && Number(depth) !== Number(quest.targetDepth)) return;
    if (entry.progress < quest.requiredCount) {
      entry.progress = quest.requiredCount;
      updated = true;
    }
    if (quest.persistentProgressFlag && !eventFlags[quest.persistentProgressFlag]) {
      eventFlags = { ...eventFlags, [quest.persistentProgressFlag]: true };
      updated = true;
    }
  });
  return updated ? { ...character, quests, eventFlags } : character;
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

export function recordCustomQuestProgress(character, questId, amount = 1) {
  const quest = getQuestById(questId);
  const quests = normalizeQuestState(character?.quests);
  const entry = quests.active[questId];
  if (!quest || quest.objectiveType !== "custom" || !entry) return character;
  entry.progress = Math.min(quest.requiredCount, entry.progress + Math.max(0, Math.floor(Number(amount) || 0)));
  return { ...character, quests };
}

export function recordQueenShadowEncounter(character, depth) {
  const normalizedDepth = Math.floor(Number(depth) || 0);
  const flag = ({
    10: QUEEN_SHADOW_PROGRESS_FLAGS[0],
    11: QUEEN_SHADOW_PROGRESS_FLAGS[1],
    12: QUEEN_SHADOW_PROGRESS_FLAGS[2],
    13: QUEEN_SHADOW_PROGRESS_FLAGS[3]
  })[normalizedDepth];
  const progress = getQuestProgress(character, QUEEN_SHADOW_QUEST_ID);
  if (!flag || !progress.active || progress.completed || character?.eventFlags?.[flag]) return character;
  if (normalizedDepth !== 10 + Math.min(4, progress.progress)) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [flag]: true }
  };
  return recordCustomQuestProgress(next, QUEEN_SHADOW_QUEST_ID, 1);
}

export function completeQueenShadowInvestigation(character) {
  const progress = getQuestProgress(character, QUEEN_SHADOW_QUEST_ID);
  const completionFlag = QUEEN_SHADOW_PROGRESS_FLAGS[4];
  if (!progress.active || progress.progress < 4 || character?.eventFlags?.[completionFlag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [completionFlag]: true }
  };
  return recordCustomQuestProgress(next, QUEEN_SHADOW_QUEST_ID, 1);
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
      Math.max(1, Math.floor(Number(progress.quest.reward.amount) || 1)),
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
  if (progress.quest.reportUnlockFlag) {
    next = { ...next, eventFlags: { ...(next.eventFlags || {}), [progress.quest.reportUnlockFlag]: true } };
  }
  return { character: next, accepted: true, rewardCardId, bonusGold };
}

export function hasActiveQuest(character) {
  return Object.keys(normalizeQuestState(character?.quests).active).length > 0;
}

export function getQuestHistory(character) {
  return QUESTS
    .map(quest => ({ quest, progress: getQuestProgress(character, quest.id) }))
    .filter(entry => entry.progress.active || entry.progress.completed)
    .sort((left, right) => {
      const rank = entry => entry.progress.readyToReport ? 0 : entry.progress.active ? 1 : 2;
      return rank(left) - rank(right) || Number(left.quest.number || 0) - Number(right.quest.number || 0);
    });
}

export function isDungeonDepthUnlocked(character, depth) {
  const requestedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  if (requestedDepth === 2) {
    return B2F_UNLOCK_QUEST_IDS.every(questId => getQuestProgress(character, questId).completed);
  }
  if (requestedDepth === 20) {
    return Boolean(character?.eventFlags?.boss_fallen_mage_b19f_defeated);
  }
  if (requestedDepth === 30) {
    return Boolean(character?.eventFlags?.boss_iron_maiden_b29f_defeated);
  }
  return true;
}

export function shouldForceEnemy(character, { depth, enemyId } = {}) {
  return getForcedEnemyId(character, { depth }) === enemyId;
}

export function getForcedEnemyId(character, { depth } = {}) {
  const requestedDepth = Number(depth);
  const quests = normalizeQuestState(character?.quests);
  const activeQuestIds = Object.keys(quests.active).sort((left, right) => (
    Number(getQuestById(right)?.forcePriority || 0) - Number(getQuestById(left)?.forcePriority || 0)
  ));
  for (const questId of activeQuestIds) {
    const quest = getQuestById(questId);
    if (!quest?.forceTargetEnemy || Number(quest.targetDepth) !== requestedDepth) continue;
    const progress = getQuestProgress(character, questId);
    if (progress.active && !progress.readyToReport) return quest.targetId || null;
  }
  return null;
}

function result(character, accepted, reason = "") {
  return { character, accepted, reason };
}

function countSequentialProgressFlags(character, flags) {
  let count = 0;
  for (const flag of flags) {
    if (!character?.eventFlags?.[flag]) break;
    count += 1;
  }
  return count;
}
