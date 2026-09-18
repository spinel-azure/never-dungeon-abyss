import { BOSSES } from './bosses.js';
import { hasCardEffect } from './cards.js';
import { hasGeminiTransferMarker } from './gemini-event.js';
import { getSpecialRoomDefinition } from './special-rooms.js';
import { getQuestProgress, LICHTBRINGER_QUEST_ID } from './quests.js';
import { hasKeyItem } from './key-items.js';

export function getZodiacTransferMarkers(character, depth) {
  const result = [];
  if (hasGeminiTransferMarker(character, depth)) result.push('gemini');
  if (!hasCardEffect(character?.cards?.deckSlots, 'zodiac_detection')) return result;
  const seen = new Set(result);
  for (const boss of Object.values(BOSSES)) {
    const cardId = boss.reward?.cardId;
    if (!cardId?.startsWith('zodiac_') || getSpecialRoomDefinition(boss.floor)?.content?.bossId !== boss.id) continue;
    if (Math.floor(boss.floor / 10) * 10 !== Number(depth)) continue;
    if (character?.eventFlags?.[boss.defeatedFlag] || Number(character?.cards?.ownedCardCounts?.[cardId]) > 0) continue;
    const zodiac = cardId.slice(7);
    if (!seen.has(zodiac)) { result.push(zodiac); seen.add(zodiac); }
  }
  // Virgo's dungeon objective is B95F; the card itself is received from the guild.
  const quest = getQuestProgress(character, LICHTBRINGER_QUEST_ID);
  if (Number(depth) === 90 && quest.active && !quest.completed
    && !character?.eventFlags?.lichtbringer_b95f_found && !hasKeyItem(character?.keyItems, 'lichtbringer')
    && !Number(character?.cards?.ownedCardCounts?.zodiac_virgo)) result.push('virgo');
  return result;
}
