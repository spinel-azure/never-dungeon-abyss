import { BOSSES } from "./bosses.js";
import { getCharacterClass } from "./classes.js";
import { normalizeQuestState } from "./quests.js";
import { formatPlayTime, normalizeAdventureStats } from "./adventure-stats.js";

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ja-JP");
}

function countDefeatedBosses(character) {
  const flags = character?.eventFlags || {};
  return Object.values(BOSSES).filter(boss => (
    boss.defeatedFlag
      ? Boolean(flags[boss.defeatedFlag])
      : boss.id === "lingering_ghost_b2f" && Boolean(flags.lingering_ghost_b2f_defeated_once)
  )).length;
}

function countWarehouseItems(character) {
  const stackedItems = (character?.warehouse?.itemStacks || []).reduce(
    (total, stack) => total + Math.max(0, Math.floor(Number(stack.count) || 0)),
    0
  );
  return stackedItems + (character?.warehouse?.equipmentInstances || []).length;
}

export function getAdventureRecords(character) {
  const characterClass = getCharacterClass(character?.job);
  const completedQuestCount = normalizeQuestState(character?.quests).completedQuestIds.length;
  const ownedCardCounts = Object.values(character?.cards?.ownedCardCounts || {})
    .map(count => Math.max(0, Math.floor(Number(count) || 0)))
    .filter(count => count > 0);
  const cardTypeCount = ownedCardCounts.length;
  const totalCardCount = ownedCardCounts.reduce((total, count) => total + count, 0);
  const deepestFloor = Math.max(1, Math.floor(Number(character?.highestDungeonDepthReached) || 1));

  return [
    { id: "playTime", label: "プレイ時間", value: formatPlayTime(normalizeAdventureStats(character?.adventureStats).playTimeSeconds), description: "ゲームを実際に遊んでいた時間です。非表示タブと5分以上の無操作時間は含みません。" },
    { id: "name", label: "冒険者名", value: character?.name || "―", description: "冒険者ギルドへ登録されている名前です。" },
    { id: "job", label: "職業", value: characterClass?.name || character?.jobLabel || "―", description: "現在の職業です。" },
    { id: "level", label: "現在レベル", value: `LV${formatNumber(character?.level || 1)}`, description: "現在の冒険者レベルです。" },
    { id: "deepestFloor", label: "最高到達階層", value: `B${deepestFloor}F`, description: `これまでに到達した最深階層です。現在の記録：B${deepestFloor}F` },
    { id: "completedQuests", label: "完了した依頼", value: `${formatNumber(completedQuestCount)}件`, description: "ギルドへ報告し、正式に完了した依頼の数です。" },
    { id: "defeatedBosses", label: "撃破済みボス", value: `${formatNumber(countDefeatedBosses(character))}体`, description: "これまでに一度以上撃破した固有ボスの種類数です。" },
    { id: "cardTypes", label: "所持カード種類", value: `${formatNumber(cardTypeCount)}種類`, description: "現在所持しているデッキカードの種類数です。" },
    { id: "totalCards", label: "所持カード総数", value: `${formatNumber(totalCardCount)}枚`, description: "現在所持しているデッキカードの合計枚数です。" },
    { id: "gold", label: "所持金", value: `${formatNumber(character?.gold)}G`, description: "現在持ち歩いているGOLDです。" },
    { id: "warehouse", label: "倉庫の保管数", value: `${formatNumber(countWarehouseItems(character))}個`, description: "倉庫に保管されている道具と装備品の合計数です。" }
  ];
}

export function getAdventureChronicle(character) {
  const flags = character?.eventFlags || {};
  const depth = Math.max(1, Math.floor(Number(character?.highestDungeonDepthReached) || 1));
  const milestones = [
    ["registered", "冒険者として登録した", true, "ギルドで冒険者としての第一歩を踏み出した。"],
    ["b2", "B2Fへ到達した", depth >= 2, "奈落の迷宮地下2階へ到達した。"],
    ["ghost", "未練ある亡霊を撃破した", flags.lingering_ghost_b2f_defeated_once, "繰り返し現れる亡霊を初めて退けた。"],
    ["mimic", "黒い箱の怪物を撃破した", flags.boss_quest_mimic_b6f_defeated || flags.quest_mimic_b6f_defeated, "B6Fの黒い箱に潜んでいた怪物を撃破した。"],
    ["b9", "奇妙な彫像を撃破した", flags.boss_strange_knight_statue_b9f_defeated, "B9Fの関所を守る奇妙な彫像を撃破した。"],
    ["b10", "B10Fへ到達した", depth >= 10 || flags.transfer_portal_b10f_unlocked, "奈落の迷宮地下10階へ到達し、転送門を解放した。"],
    ["mage", "堕落した魔術師を撃破した", flags.boss_fallen_mage_b19f_defeated, "B19Fを塞いでいた堕落した魔術師を撃破した。"],
    ["b20", "B20Fへ到達した", depth >= 20, "奈落の迷宮地下20階へ到達した。"]
  ];
  return milestones.map(([id, label, achieved, description]) => ({
    id,
    label: achieved ? label : "？？？？？？？",
    value: achieved ? "達成" : "未達成",
    description: achieved ? description : "まだ記録されていない冒険の節目です。",
    achieved: Boolean(achieved)
  }));
}
