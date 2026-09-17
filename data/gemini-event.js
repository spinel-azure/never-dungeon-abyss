import { grantKeyItem } from './key-items.js';
export const GEMINI_PAGES = Object.freeze([
  '部屋に入ると、中央には火が灯された燭台とともに太陽と月の紋様が刻まれた箱が置かれており、蓋の部分にはこう記されていた。\n『姉妹のひとりは、いつも真実のみを語る\n姉妹のひとりは、いつも偽りのみを語る』',
  'あなたが二つの箱を見つめていると、いつの間にか二人の女性が立っていた。そして片方の女性が口を開く。',
  'シュヴェスター「わたくしたちはシュヴェスター。双子の姉妹ですの。あなたを試してさしあげましょう。\nこの二つの箱のどちらに印が入っているか、当ててごらんなさいな。」',
  '白衣のシュヴェスター「燭台には火が灯っておりますわ。印が入っているのは、太陽の箱。」\n赤衣のシュヴェスター「燭台の火は消えているわ。印が入っているのは、月の箱。」'
]);
export const GEMINI_ASSETS = Object.freeze({background:'images/background/dungeon_event_19.avif',white:'images/npc/NPC_26b.avif',red:'images/npc/NPC_26c.avif'});
export function geminiProgress(character) {
  return {completed:Boolean(character?.eventFlags?.gemini_first_completed),blocked:Boolean(character?.eventFlags?.gemini_retry_blocked)};
}
export function resolveGeminiChoice(character, choice) {
  if (!['sun','moon'].includes(choice) || geminiProgress(character).completed || geminiProgress(character).blocked) return false;
  character.eventFlags ||= {};
  if (choice === 'sun') {
    character.keyItems = grantKeyItem(character.keyItems, 'gemini_emblem_half').keyItems;
    character.eventFlags.gemini_first_completed = true;
  } else character.eventFlags.gemini_retry_blocked = true;
  return true;
}
export function resetGeminiRetry(character) {
  if (character?.eventFlags) delete character.eventFlags.gemini_retry_blocked;
}
