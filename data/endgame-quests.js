import { hasKeyItem } from "./key-items.js";

export function getEndgameQuestEvidence(character) {
  const flags = character?.eventFlags || {};
  // Restoration and the ending are reachable only after defeating Amayenak
  // and obtaining the staff. Depth by itself must never stand in for a kill.
  const restored = Boolean(flags.michaela_restored
    || flags.queen_regalia_returned || flags.ending_story_completed);
  const finalBoss = Boolean(flags.boss_amayenak_b100f_defeated || restored);
  return {
    soulEater: Boolean(flags.boss_b99f_defeated || finalBoss),
    reachedFinal: Number(character?.highestDungeonDepthReached) >= 100 || finalBoss,
    finalBoss,
    staff: Boolean(flags.truth_staff_obtained || restored
      || hasKeyItem(character?.keyItems, "truth_staff")
      || character?.keyItems?.discoveredItemIds?.includes("truth_staff"))
  };
}

export function getEndgameQuestProgress(character, id) {
  const evidence = getEndgameQuestEvidence(character);
  if (id === "guild_034") return Number(evidence.soulEater) + Number(evidence.reachedFinal);
  if (id === "guild_035") return Number(evidence.finalBoss) + Number(evidence.staff);
  return 0;
}

export const KIRKE_FINAL_DIALOGUE = [
 '……そろそろ語る時が来たようじゃの。闇の魔術師アマイェナクが、なぜ真実の杖を奪ったのかを。',
 'アマイェナクは元々、魔術の研究にひたすら没頭する男じゃった。じゃが、ある日を境に、知識への渇望を抑えられなくなったのじゃ。',
 '彼奴が好奇心から魔界より呼び寄せた大悪魔……その影響もあるのかもしれん。',
 'そして彼奴がたどり着いたのが、この世のすべての叡智を記録しているという、アカシックレコードじゃ。',
 '奈落の迷宮の最深部にあると伝えられておったが、そこまでたどり着けた者はおらなんだ。……彼奴が現れるまではの。',
 'かの大悪魔の手を借りたのじゃろうて。',
 'じゃが、アカシックレコードに触れるには『鍵』が必要なのじゃ。それが王家に代々伝わる『真実の杖』。',
 '彼奴は女王様から杖を奪い、アカシックレコードに触れようとしておる。あれは、人が容易に触れてよいものではない……。',
 'アマイェナクを倒し、真実の杖を取り戻しておくれ。そして、女王様を……！',
 '最後の戦いじゃ。苛烈を極めるじゃろうて。……これを持ってゆけ。ようやく一つだけ、作ることができた万能薬じゃ。'
];

export function getKirkeFinalDialogue(character) {
  const lines = getEndgameQuestEvidence(character).finalBoss
    ? ["ようやってくれたの。おぬしへの礼に、ようやく完成した万能薬を渡しておこう。これからの旅に役立てておくれ。"]
    : KIRKE_FINAL_DIALOGUE;
  return lines.map(text => `キルケ「${text}」\n＊Aボタンで次へ`);
}
