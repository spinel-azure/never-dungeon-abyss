import { grantKeyItem, hasKeyItem } from './key-items.js';
export function hasStartedGemini(character) {
  const flags = character?.eventFlags || {};
  return Boolean(flags.gemini_event_started || flags.gemini_first_completed || flags.gemini_retry_blocked
    || hasKeyItem(character?.keyItems, 'gemini_emblem_half'));
}
export function markGeminiStarted(character) {
  if (!character || character.eventFlags?.gemini_event_started) return false;
  character.eventFlags ||= {};
  character.eventFlags.gemini_event_started = true;
  return true;
}
export function hasGeminiTransferMarker(character, depth) {
  const canFind = character?.cards?.deckSlots?.includes('common_person_detection')
    || hasKeyItem(character?.keyItems, 'queen_tiara')
    || hasKeyItem(character?.keyItems, 'royal_cat_medal');
  const progress = geminiProgress(character);
  const target = progress.thirdCompleted ? null : progress.secondCompleted ? 40 : progress.completed ? 30 : 20;
  return Number(depth) === target && hasStartedGemini(character) && Boolean(canFind);
}
export const GEMINI_PAGES = Object.freeze([
  '部屋に入ると、中央には火が灯された燭台とともに太陽と月の紋様が刻まれた箱が置かれており、蓋の部分にはこう記されていた。\n『姉妹のひとりは、いつも真実のみを語る\n姉妹のひとりは、いつも偽りのみを語る』',
  'あなたが二つの箱を見つめていると、いつの間にか二人の女性が立っていた。そして片方の女性が口を開く。',
  'シュヴェスター「わたくしたちはシュヴェスター。双子の姉妹ですの。あなたを試してさしあげましょう。\nこの二つの箱のどちらに印が入っているか、当ててごらんなさいな。」',
  '白衣のシュヴェスター「燭台には火が灯っておりますわ。印が入っているのは、太陽の箱。」\n赤衣のシュヴェスター「燭台の火は消えているわ。印が入っているのは、月の箱。」'
]);
export const GEMINI_ASSETS = Object.freeze({background:'images/background/dungeon_event_19.avif',white:'images/npc/NPC_26b.avif',red:'images/npc/NPC_26c.avif'});
export function geminiProgress(character) {
  const flags = character?.eventFlags || {};
  return {completed:Boolean(flags.gemini_first_completed || hasKeyItem(character?.keyItems,'gemini_emblem_half')),
    blocked:Boolean(flags.gemini_retry_blocked), retryVariant:Boolean(flags.gemini_retry_variant ?? flags.gemini_retry_blocked),
    secondCompleted:Boolean(flags.gemini_second_completed),thirdWhiteCompleted:Boolean(flags.gemini_third_white_completed),thirdCompleted:Boolean(flags.gemini_third_completed)};
}
export const GEMINI_THIRD_SCENES = Object.freeze({
  white: {pages:['白衣のシュヴェスター「…妹をお探しですの？」','白衣のシュヴェスター「…あの子なら、ここよりも4つ下の階におりましてよ。」'],
    farewell:'そう言い残すと、白衣のシュヴェスターは静かに姿を消した。'},
  red: {pages:['赤衣のシュヴェスター「…あら。よくここが分かったわね。」','赤衣のシュヴェスター「…姉様は私の居場所なんて知らないのに。」','赤衣のシュヴェスター「…もう一つの紋様なんて、私たち持っていないわ。」'],
    farewell:'そう言い残すと、赤衣のシュヴェスターはクスクスと笑いながら姿を消した。'}
});
export function canEnterGeminiThird(character, sister) {
  const p=geminiProgress(character);
  return p.secondCompleted && !p.thirdCompleted && (sister==='white' || (sister==='red' && p.thirdWhiteCompleted));
}
export function completeGeminiThirdVisit(character, sister) {
  if (!canEnterGeminiThird(character,sister)) return false;
  const key=sister==='white'?'gemini_third_white_completed':'gemini_third_completed';
  if (character.eventFlags?.[key]) return false;
  character.eventFlags ||= {};
  character.eventFlags[key]=true;
  return true;
}
export const GEMINI_SECOND_HINT = '白衣のシュヴェスター「次にお会いする場所は、地下40階よりも深く、地下50階よりも浅いところですわ。」\n赤衣のシュヴェスター「その階を示す二つの数字は、それぞれ違う数字よ。」';
export const GEMINI_SECOND_PAGES = Object.freeze([
  '白衣のシュヴェスター「…また、お会いしましたわね。」\n赤衣のシュヴェスター「…あら？わたしは初めて会うわよ？」', GEMINI_SECOND_HINT
]);
export function completeGeminiSecond(character) {
  const progress = geminiProgress(character);
  if (!progress.completed || progress.secondCompleted || progress.thirdCompleted) return false;
  character.eventFlags ||= {};
  character.eventFlags.gemini_second_completed = true;
  return true;
}
export function getGeminiFirstScenario(retryVariant = false) {
  return {background:retryVariant ? 'images/background/dungeon_event_19b.avif' : GEMINI_ASSETS.background,
    correctChoice:retryVariant ? 'moon' : 'sun',
    pages:retryVariant ? [
      '部屋に入ると、中央には火の消えた燭台とともに月と太陽の紋様が刻まれた箱が置かれており、蓋の部分にはこう記されていた。\n『姉妹のひとりは、いつも真実のみを語る\n姉妹のひとりは、いつも偽りのみを語る』',
      GEMINI_PAGES[1],
      'シュヴェスター「またお出でになりましたのね。今度こそ、この二つの箱のどちらに印が入っているか、当ててごらんなさいな。」',
      '白衣のシュヴェスター「燭台の火は消えておりますわ。印が入っているのは、月の箱。」\n赤衣のシュヴェスター「燭台の火は灯っているわ。印が入っているのは、太陽の箱。」'
    ] : GEMINI_PAGES};
}
export function resolveGeminiChoice(character, choice) {
  if (!['sun','moon'].includes(choice) || geminiProgress(character).completed || geminiProgress(character).blocked) return false;
  character.eventFlags ||= {};
  const retryVariant = geminiProgress(character).retryVariant;
  if (choice === (retryVariant ? 'moon' : 'sun')) {
    character.keyItems = grantKeyItem(character.keyItems, 'gemini_emblem_half').keyItems;
    character.eventFlags.gemini_first_completed = true;
  } else {
    character.eventFlags.gemini_retry_blocked = true;
    character.eventFlags.gemini_retry_variant = !retryVariant;
  }
  return true;
}
export function resetGeminiRetry(character) {
  if (character?.eventFlags) {
    character.eventFlags.gemini_retry_variant ??= Boolean(character.eventFlags.gemini_retry_blocked);
    delete character.eventFlags.gemini_retry_blocked;
  }
}
