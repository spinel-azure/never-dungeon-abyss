import { consumeKeyItem, grantKeyItem } from "./key-items.js";

export const ENDING_FLAGS = Object.freeze([
  "queen_regalia_returned", "royal_cat_medal_awarded", "queen_blessing_unlocked",
  "ending_story_completed", "ending_credits_pending", "ending_credits_watched"
]);
export const MEDAL_NAME = "《Königlicher Katzenorden》\nケーニクリヒャー・カッツェンオルデン";
export const MEDAL_DESCRIPTION = "女王の加護：表層の奈落で、女王の装飾品が持っていた力を再現する。";
export const ENDING_ASSETS = Object.freeze({
  arrival: "images/npc/NPC_ending.avif", queen: "images/npc/NPC_01e.avif",
  medal: "images/screenshots/medal_01.avif", end: "images/screenshots/dasende.avif"
});
export const EPILOGUE = Object.freeze([
  "――かくして、闇の大魔導師は打ち倒され、\n奪われた《真実の杖》は取り戻されました。",
  "杖の力によって呪いは解かれ、\n失われた女王ミカエラは、ついに本来の姿を取り戻したのです。",
  "あなたは奈落より持ち帰った\n三つの装飾品を女王へ返還しました。",
  "女王は、幾多の苦難を乗り越えたあなたの栄誉を称え、\n王家最高の勲章――",
  "《Königlicher Katzenorden》\nケーニクリヒャー・カッツェンオルデン",
  "を授けました。",
  "その勲章には、女王の加護が宿っているといいます。"
]);
export const EPILOGUE_AFTER_MEDAL = "あなたが成し遂げた偉業は、\n猫の国《カッツェンラント》の歴史とともに、\n末永く語り継がれてゆくことでしょう――。";
export function getEndingCredits(testPlayers = []) {
  return [
    ["企画・原案・ゲームデザイン", ["@Spinel_azure"]],
    ["制作相談・シナリオ・画像生成", ["ChatGPT"]],
    ["実装・検証・デバッグ", ["ChatGPT Codex"]],
    ["BGM", ["もみじばミュージック"]],
    ["効果音", ["イワシロ音楽素材", "効果音ラボ"]],
    ...(testPlayers.length ? [["テストプレイ", testPlayers]] : []),
    ["制作", ["@Spinel_azure"]]
  ];
}
export function normalizeEndingFlags(flags = {}) {
  return { ...flags, ...Object.fromEntries(ENDING_FLAGS.map(key => [key, Boolean(flags?.[key])])) };
}
export function getEndingResumeMode(character) {
  const flags = character?.eventFlags || {};
  if (flags.ending_story_completed) return flags.ending_credits_pending ? "credits" : "none";
  if (!flags.boss_amayenak_b100f_defeated) return "none";
  return flags.michaela_restored ? "arrival" : "restoration";
}
export function completeEndingStory(character) {
  if (!character || character.eventFlags?.ending_story_completed) return character;
  if (!character.eventFlags?.boss_amayenak_b100f_defeated || !character.eventFlags?.michaela_restored) return character;
  let keyItems = character.keyItems;
  for (const id of ["queen_tiara", "queen_earring", "queen_necklace"]) {
    keyItems = consumeKeyItem(keyItems, id).keyItems;
  }
  keyItems = grantKeyItem(keyItems, "royal_cat_medal").keyItems;
  return { ...character, keyItems, eventFlags: { ...normalizeEndingFlags(character.eventFlags),
    boss_amayenak_b100f_defeated: true, michaela_restored: true,
    queen_regalia_returned: true, royal_cat_medal_awarded: true, queen_blessing_unlocked: true,
    ending_story_completed: true, ending_credits_pending: true, ending_credits_watched: false
  } };
}
export function completeEndingCredits(character) {
  if (!character?.eventFlags?.ending_story_completed) return character;
  return { ...character, eventFlags: { ...character.eventFlags,
    ending_credits_pending: false, ending_credits_watched: true } };
}
