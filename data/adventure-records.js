import { BOSSES } from "./bosses.js";
import { getCharacterClass } from "./classes.js";
import { normalizeQuestState } from "./quests.js";

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
