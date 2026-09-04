import { getFloorZone } from "./floor-zone-names.js";

const MIKAN_VOICE_SE = Object.freeze(["catVoice01", "catVoice02", "catVoice03"]);

function createMikanNpc(id, dialogue, { greeting = "" } = {}) {
  return {
    id,
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting,
    voiceSe: MIKAN_VOICE_SE,
    encounters: [{ dialogue: [dialogue], leaveAfterTalk: true }],
    canCancel: true,
    retreatOnCancel: true
  };
}

export const MIKAN_GENERIC_NPC_IDS = Object.freeze([
  "NPC_01",
  "NPC_01_torch",
  "NPC_01_purple_chest",
  "NPC_01_exorcism_talisman",
  "NPC_01_maikaefer"
]);

export const MIKAN_REGIONAL_NPC_IDS = Object.freeze({
  "Glut-Zone": "NPC_01_glut",
  "Frost-Zone": "NPC_01_frost",
  "Dschungel-Zone": Object.freeze(["NPC_01_jungle_vines", "NPC_01_jungle_herbicide"]),
  "Wildwasser-Zone": "NPC_01_rapid_current",
  "Kristall-Zone": "NPC_01_crystal"
});

export function getMikanGenericNpcId(roll = 0) {
  const normalized = Math.max(0, Math.min(0.999999999999, Number(roll) || 0));
  return MIKAN_GENERIC_NPC_IDS[Math.floor(normalized * MIKAN_GENERIC_NPC_IDS.length)];
}

export function getMikanRegionalNpcId(depth) {
  const floor = Math.floor(Number(depth) || 0);
  const regional = MIKAN_REGIONAL_NPC_IDS[getFloorZone(floor)?.name];
  if (Array.isArray(regional)) return regional[Math.abs(floor) % regional.length];
  return regional || null;
}

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
    id: "queen_shadow_desert",
    name: "女王の影",
    imageId: "NPC_01b",
    image: "images/npc/NPC_01b.avif",
    interactionType: "contact",
    glow: "paleBlue",
    renderScale: 1.85,
    contactMessage: "砂煙の向こうにいた女王の影は、近づく前に消えてしまった…。",
    leaveAfterTalk: true,
    canCancel: false,
    retreatOnCancel: false
  },
  {
    id: "queen_shadow_dark",
    name: "女王の影",
    imageId: "NPC_01b",
    image: "images/npc/NPC_01b.avif",
    interactionType: "contact",
    glow: "paleBlue",
    renderScale: 1.85,
    contactMessage: "闇の向こうにいた女王の影は、近づく前に消えてしまった…。",
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
  createMikanNpc(
    "NPC_01_torch",
    "たいまつが消えると、何も見えないにゃん。襲われても誰だか分からないにゃあ…！怖いにゃ、怖いにゃあ…！",
    { greeting: "にゃ～？" }
  ),
  createMikanNpc(
    "NPC_01_purple_chest",
    "紫の箱には、カードが入っているみたいにゃん。みんなカードを集めるのが好きにゃあ…。",
    { greeting: "にゃ～？" }
  ),
  createMikanNpc(
    "NPC_01_exorcism_talisman",
    "誰にも会いたくない時は、護符を使うといいにゃあ。寺院でお布施すると、もらえるにゃん。",
    { greeting: "にゃ～？" }
  ),
  createMikanNpc(
    "NPC_01_maikaefer",
    "とっても逃げ足の速い虫がいるにゃん。石でもぶつけてみるといいかもにゃあ…？もしかしたら、当たるかもしれにゃいにゃん。",
    { greeting: "にゃ～？" }
  ),
  createMikanNpc(
    "NPC_01_glut",
    "あっつ…！足が熱いにゃあ…！歩くと足がヒリヒリするにゃあ…！にゃんこも靴を履きたいにゃあ…。耐火ブーツ、履きたいにゃあ…！"
  ),
  createMikanNpc(
    "NPC_01_frost",
    "ひゃあ…！足が冷たいにゃあ…！歩くと足が凍えそうだにゃあ…！にゃんこも靴を履きたいにゃあ…。防寒ブーツ、履きたいにゃあ…！"
  ),
  createMikanNpc(
    "NPC_01_jungle_vines",
    "にゃあ…！あちこちに、大きな大きな蔓が生えてるにゃあ…！通れないにゃあ…！"
  ),
  createMikanNpc(
    "NPC_01_jungle_herbicide",
    "除草剤、便利にゃあ…！あのトゲトゲの怖いお花にも効くのかにゃあ…？"
  ),
  createMikanNpc(
    "NPC_01_rapid_current",
    "にゃあ！流されるにゃ…！流されるにゃあ…！"
  ),
  createMikanNpc(
    "NPC_01_crystal",
    "にゃあ…！歩いているだけで力が抜けていくにゃあ…！フラフラにゃあ…。"
  ),
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
    id: "NPC_01_b64_todes",
    name: "みかんにゃんこ",
    imageId: "NPC_01",
    image: "images/npc/NPC_01.avif",
    interactionType: "talk",
    greeting: "",
    voiceSe: ["catVoice01", "catVoice02", "catVoice03"],
    encounters: [{
      dialogue: ["怖いにゃ…。ここ、なにか恐ろしいものがいるにゃあ…。近寄っちゃダメにゃ…。"],
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
