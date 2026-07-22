export const npcs = [
  {
    id: "NPC_01",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "にゃ～？",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [
      {
        dialogue: ["素数は孤独な数字にゃん…。でも1だけは寄り添ってくれるにゃん。"],
        leaveAfterTalk: true
      }
    ],
    canCancel: true,
    retreatOnCancel: true
  }
];

export function getNpcById(id) {
  return npcs.find(npc => npc.id === id) || null;
}

export function getNpcEncounter(npc, encounterCount) {
  if (!npc?.encounters?.length) return null;
  const index = Math.min(Math.max(0, encounterCount), npc.encounters.length - 1);
  return npc.encounters[index];
}
