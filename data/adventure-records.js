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
  const adventureStats = normalizeAdventureStats(character?.adventureStats);

  return [
    { id: "playTime", label: "プレイ時間", value: formatPlayTime(adventureStats.playTimeSeconds), description: "ゲームを実際に遊んでいた時間です。非表示タブと5分以上の無操作時間は含みません。" },
    { id: "name", label: "冒険者名", value: character?.name || "―", description: "冒険者ギルドへ登録されている名前です。" },
    { id: "job", label: "職業", value: characterClass?.name || character?.jobLabel || "―", description: "現在の職業です。" },
    { id: "level", label: "現在レベル", value: `LV${formatNumber(character?.level || 1)}`, description: "現在の冒険者レベルです。" },
    { id: "deepestFloor", label: "最高到達階層", value: `B${deepestFloor}F`, description: `これまでに到達した最深階層です。現在の記録：B${deepestFloor}F` },
    { id: "completedQuests", label: "完了した依頼", value: `${formatNumber(completedQuestCount)}件`, description: "ギルドへ報告し、正式に完了した依頼の数です。" },
    { id: "defeatedBosses", label: "撃破済みボス", value: `${formatNumber(countDefeatedBosses(character))}体`, description: "これまでに一度以上撃破した固有ボスの種類数です。" },
    { id: "cardTypes", label: "所持カード種類", value: `${formatNumber(cardTypeCount)}種類`, description: "現在所持しているデッキカードの種類数です。" },
    { id: "totalCards", label: "所持カード総数", value: `${formatNumber(totalCardCount)}枚`, description: "現在所持しているデッキカードの合計枚数です。" },
    { id: "gold", label: "所持金", value: `${formatNumber(character?.gold)}G`, description: "現在持ち歩いているGOLDです。" },
    { id: "warehouse", label: "倉庫の保管数", value: `${formatNumber(countWarehouseItems(character))}個`, description: "倉庫に保管されている道具と装備品の合計数です。" },
    { id: "innStays", label: "宿屋で宿泊した回数", value: `${formatNumber(adventureStats.innStayCount)}回`, description: "宿屋の客室と馬小屋に宿泊した合計回数です。" },
    { id: "shopPurchases", label: "商店で買い物をした回数", value: `${formatNumber(adventureStats.shopPurchaseCount)}回`, description: "商店で購入または買い戻しを行った回数です。まとめ買いは1回として数えます。" },
    { id: "shopPurchaseGold", label: "購入金額合計", value: `${formatNumber(adventureStats.shopPurchaseGold)}G`, description: "商店で商品購入と買い戻しに支払ったGOLDの合計です。" },
    { id: "templeDonations", label: "寺院で寄進した回数", value: `${formatNumber(adventureStats.templeDonationCount)}回`, description: "寺院で治療のために寄進した回数です。" },
    { id: "templeDonationGold", label: "寄進額合計", value: `${formatNumber(adventureStats.templeDonationGold)}G`, description: "寺院で治療のために寄進したGOLDの合計です。" },
    { id: "bestiaryCompletion", label: "図鑑達成率", value: "未集計", description: "図鑑の整備後に集計を開始する予定です。", disabled: true }
  ];
}

export function getAdventureChronicle(character) {
  const flags = character?.eventFlags || {};
  const depth = Math.max(1, Math.floor(Number(character?.highestDungeonDepthReached) || 1));
  const milestones = [
    ["registered", "冒険者として登録した", true, "ギルドで冒険者としての第一歩を踏み出した。"],
    ["stable", "馬小屋に宿泊した", flags.inn_stable_stayed, "宿屋の馬小屋で夜露をしのいだ。", "？？？？？？――朝の目覚め"],
    ["b2", "B2Fへ到達した", depth >= 2, "奈落の迷宮地下2階へ到達した。"],
    ["ghost", "未練ある亡霊を撃破した", flags.lingering_ghost_b2f_defeated_once, "繰り返し現れる亡霊を初めて退けた。"],
    ["otherworldlyWisdom", "異界の叡智を撃破した", flags.boss_otherworldly_wisdom_b4f_defeated, "B4Fに潜む異界の叡智を打ち破った。", "？？？？？？――絶望への挑戦"],
    ["mimic", "黒い箱の怪物を撃破した", flags.boss_quest_mimic_b6f_defeated || flags.quest_mimic_b6f_defeated, "B6Fの黒い箱に潜んでいた怪物を撃破した。"],
    ["b9", "奇妙な彫像を撃破した", flags.boss_strange_knight_statue_b9f_defeated, "B9Fの関所を守る奇妙な彫像を撃破した。"],
    ["b10", "B10Fへ到達した", depth >= 10 || flags.transfer_portal_b10f_unlocked, "奈落の迷宮地下10階へ到達し、転送門を解放した。"],
    ["mage", "堕落した魔術師を撃破した", flags.boss_fallen_mage_b19f_defeated, "B19Fを塞いでいた堕落した魔術師を撃破した。"],
    ["b20", "B20Fへ到達した", depth >= 20, "奈落の迷宮地下20階へ到達した。"],
    ["jabberwock", "燻り狂うものを撃破した", flags.boss_jabberwock_event_boss_defeated, "ジャバウォックを撃破した。"],
    ["ironMaiden", "鋼鉄の乙女を撃破した", flags.red_door_b29f_unlocked && flags.boss_iron_maiden_b29f_defeated, "B29Fの赤い扉の奥で鋼鉄の乙女を撃破した。"],
    ["b30", "B30Fへ到達した", flags.boss_iron_maiden_b29f_defeated && depth >= 30, "鋼鉄の乙女を倒し、B30Fへ到達した。"],
    ["b35Survey", "B35Fを100マス踏破した", flags.achievement_b35f_100_cells, "途中帰還することなくB35Fを100マス踏破した。"],
    ["brassBull", "真鍮の雄牛を撃破した", flags.boss_brass_bull_event_boss_defeated, "B36Fの真鍮の雄牛を撃破した。"],
    ["wickerMan", "ウィッカーマンを撃破した", flags.red_door_b39f_unlocked && flags.boss_wicker_man_b39f_defeated, "B39Fの赤い扉の奥でウィッカーマンを撃破した。"],
    ["b40", "B40Fへ到達した", flags.boss_wicker_man_b39f_defeated && depth >= 40, "ウィッカーマンを倒し、B40Fへ到達した。"],
    ["b45Survey", "B45Fを100マス踏破した", flags.achievement_b45f_100_cells, "途中帰還することなくB45Fを100マス踏破した。", "？？？？？？――凍土を踏破する者"],
    ["glacies", "グラキエスを撃破した", flags.boss_glacies_event_boss_defeated, "氷の巨人グラキエスを撃破した。", "？？？？？？――氷巨人への挑戦"],
    ["eiskoenigin", "エイスケーニギンを撃破した", flags.boss_eiskoenigin_b49f_defeated, "B49Fの赤い扉の奥でエイスケーニギンを撃破した。", "？？？？？？――凍てつく女王"],
    ["b50", "B50Fへ到達した", flags.boss_eiskoenigin_b49f_defeated && depth >= 50, "エイスケーニギンを倒し、B50Fへ到達した。", "？？？？？？――極寒の果て"],
    ["marathon42", "深淵への大行軍", flags.b1_b42_marathon_completed, "一度も帰還せず、転送門を使わずにB1FからB42Fへ到達した。", "？？？？？？――地上を忘れし旅人"],
    ["longMarch84", "深淵への大行軍再び", flags.b1_b84_long_march_completed, "一度も帰還せず、転送門を使わずにB1FからB84Fへ到達した。", "？？？？？？――さらなる深淵へ"]
  ];
  return milestones.map(([id, label, achieved, description, hiddenLabel]) => ({
    id,
    label: achieved ? label : hiddenLabel || "？？？？？？？",
    value: achieved ? "達成" : "未達成",
    description: achieved ? description : "まだ記録されていない冒険の節目です。",
    achieved: Boolean(achieved)
  }));
}
