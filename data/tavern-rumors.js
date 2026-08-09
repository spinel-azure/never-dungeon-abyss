export const TAVERN_RUMOR_001_BASE_READ_FLAG = "tavern_rumor_001_base_read";
export const TAVERN_RUMOR_001_MIKAN_READ_FLAG = "tavern_rumor_001_mikan_read";

const COMMON_DIALOGUE = Object.freeze([
  "あなたはカウンターから耳を澄ます………。\n客「おい、知ってるか？最近、奈落の迷宮に奇妙な猫が現れるらしいな？」\n＊Aボタンで次へ",
  "客「ああ。しかも人間の言葉を話すらしい。驚きだぜ！」\n＊Aボタンで次へ"
]);

export function getUnreadTavernRumor(character, { mikanEncountered = false } = {}) {
  const flags = character?.eventFlags || {};
  if (mikanEncountered && !flags[TAVERN_RUMOR_001_MIKAN_READ_FLAG]) {
    return {
      id: "rumor_001_mikan",
      readFlags: [TAVERN_RUMOR_001_BASE_READ_FLAG, TAVERN_RUMOR_001_MIKAN_READ_FLAG],
      dialogue: [...COMMON_DIALOGUE, "ローザ「…人の言葉を話す猫ですって。本当にいるのかしら…？え？　いる？　みかんにゃんこという名前なの？まぁ！　可愛らしいわね。」\n＊Aボタンで戻る"]
    };
  }
  if (!mikanEncountered && !flags[TAVERN_RUMOR_001_BASE_READ_FLAG]) {
    return {
      id: "rumor_001_base",
      readFlags: [TAVERN_RUMOR_001_BASE_READ_FLAG],
      dialogue: [...COMMON_DIALOGUE, "ローザ「…人の言葉を話す猫ですって。本当にいるのかしら…？」\n＊Aボタンで戻る"]
    };
  }
  return null;
}

export function markTavernRumorRead(character, rumor) {
  if (!character || !rumor?.readFlags?.length) return character;
  const eventFlags = { ...(character.eventFlags || {}) };
  rumor.readFlags.forEach(flag => { eventFlags[flag] = true; });
  return { ...character, eventFlags };
}
