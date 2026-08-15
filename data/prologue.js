export const PROLOGUE_CONFIG = Object.freeze({
  queenImage: "images/npc/NPC_01b.avif",
  catImage: "images/screenshots/mikan_silhouette.avif",
  scrollPixelsPerSecond: 22,
  nightPauseMs: 650,
  flashDurationMs: 120,
  flashGapMs: 180,
  postFlashPauseMs: 300,
  beforeYouPauseMs: 900,
  youPauseMs: 1400,
  endingPauseMs: 500
});

export const PROLOGUE_PARAGRAPHS = Object.freeze([
  Object.freeze({ text: "昔、昔のお話です" }),
  Object.freeze({ text: "猫に囲まれた王国を治める一人の女王がおりました" }),
  Object.freeze({ text: "とても美しく聡明で、国民から深く愛されておりました" }),
  Object.freeze({ text: "その女王は【真実の杖】と呼ばれる不思議な杖で\n王国を様々な災いから護っていたのです" }),
  Object.freeze({ text: "人々はこの平和がいつまでも続くものと\n信じて疑いませんでした" }),
  Object.freeze({ text: "しかしある闇夜の晩――", cue: "night" }),
  Object.freeze({ text: "人々を災いから護っていた【真実の杖】が\n何者かに奪われてしまいました" }),
  Object.freeze({ text: "そして同じ夜、女王もまた忽然と\n姿を消してしまったのです" }),
  Object.freeze({ text: "一夜にして【真実の杖】と女王を失った王国の人々は\n深い悲しみに包まれました" }),
  Object.freeze({ text: "それからしばらくして――" }),
  Object.freeze({ text: "カッツェンシュタットの町に\n人の言葉を話す奇妙な猫が\n姿を見せるようになりました" }),
  Object.freeze({ text: "そしてちょうどその頃、この町を訪れた\n一人の放浪者がおりました" }),
  Object.freeze({ text: "それが――", cue: "before-you" }),
  Object.freeze({ text: "――あなたです", cue: "you" }),
  Object.freeze({ text: "ここから物語が始まります", cue: "ending" })
]);
