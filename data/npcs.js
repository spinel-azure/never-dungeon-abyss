export const npcs = [
  {
    id: "queen_shadow",
    name: "女王の影",
    imageId: "NPC_01b",
    image: "images/npc/NPC_01b.avif",
    interactionType: "contact",
    glow: "paleBlue",
    renderScale: 1.85,
    contactMessage: "ここに誰かがいたはずだが…？",
    leaveAfterTalk: true,
    canCancel: false,
    retreatOnCancel: false
  },
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
  },
  {
    id: "NPC_01_b4", name: "みかんにゃんこ", imageId: "NPC_01", image: "images/npc/NPC_01.avif",
    interactionType: "talk", greeting: "", voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{ dialogue: ["怖いにゃ…。この階にはとても恐ろしい何かの気配を感じるにゃ…。近づいちゃダメにゃあ…！"], leaveAfterTalk: true }],
    canCancel: true, retreatOnCancel: true
  },
  {
    id: "NPC_01_b5",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [
      {
        dialogue: ["疲れてないかにゃ？噴水のある場所でひと休みするといいにゃん。"],
        leaveAfterTalk: true
      }
    ],
    canCancel: true,
    retreatOnCancel: true
  },
  {
    id: "NPC_01_b2", name: "みかんにゃんこ", imageId: "NPC_01", image: "images/npc/NPC_01.avif",
    interactionType: "talk", greeting: "", voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{ dialogue: ["この階にはお化けが出る部屋があるらしいにゃ。しかも、何度も何度も出るらしいにゃん。怖いにゃあ…。"], leaveAfterTalk: true }],
    canCancel: true, retreatOnCancel: true
  },
  {
    id: "NPC_01_b6", name: "みかんにゃんこ", imageId: "NPC_01", image: "images/npc/NPC_01.avif",
    interactionType: "talk", greeting: "", voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{ dialogue: ["血が出たら痛いにゃん。とても痛いにゃん。いざという時のために、止血剤があるといいかもにゃあ…。"], leaveAfterTalk: true }],
    canCancel: true, retreatOnCancel: true
  },
  {
    id: "NPC_01_b6_after", name: "みかんにゃんこ", imageId: "NPC_01", image: "images/npc/NPC_01.avif",
    interactionType: "talk", greeting: "", voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{ dialogue: ["不思議な剣を拾ったみたいにゃん？むかーし、おとぎ話で聞いた事ある気がするにゃん。…でも、忘れちゃったにゃあ…。"], leaveAfterTalk: true }],
    canCancel: true, retreatOnCancel: true
  },
  {
    id: "NPC_01_b9",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [
      {
        dialogue: [
          "赤い扉が気になるにゃ？カギが必要みたいにゃん。",
          "この階のどこかにあるかもしれないにゃあ…？"
        ],
        leaveAfterTalk: true
      }
    ],
    canCancel: true,
    retreatOnCancel: true
  },
  {
    id: "NPC_01_b60_desert",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{
      dialogue: ["砂に足を取られると、どこかに流されるにゃあ…！何度も何度も、流されるにゃあ…！"],
      leaveAfterTalk: true
    }],
    canCancel: true,
    retreatOnCancel: true
  },
  {
    id: "NPC_01_b65_oasis",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{
      dialogue: ["オアシスでお昼寝したいのに、消えちゃうにゃん。どうなっているにゃあ…？"],
      leaveAfterTalk: true
    }],
    canCancel: true,
    retreatOnCancel: true
  },
  {
    id: "NPC_01_desert_hot",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{
      dialogue: ["暑いにゃあ…。暑いにゃあ…。涼しい所に行きたいにゃん…。"],
      leaveAfterTalk: true
    }],
    canCancel: true,
    retreatOnCancel: true
  },
  {
    id: "NPC_01_b69_riddle",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{
      dialogue: ["なくしたものをみっけ…みつけるのが得意…にゃあ？よく、分からないにゃん…。"],
      leaveAfterTalk: true
    }],
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
