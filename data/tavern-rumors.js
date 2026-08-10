export const TAVERN_RUMOR_001_BASE_READ_FLAG = "tavern_rumor_001_base_read";
export const TAVERN_RUMOR_001_MIKAN_READ_FLAG = "tavern_rumor_001_mikan_read";
export const TAVERN_RUMOR_002_BASE_READ_FLAG = "tavern_rumor_002_base_read";
export const TAVERN_RUMOR_002_GHOST_READ_FLAG = "tavern_rumor_002_ghost_read";

export const TAVERN_RUMORS = Object.freeze([
  Object.freeze({
    id: "rumor_001",
    unlock: () => true,
    customerLead: "最近、奈落の迷宮に奇妙な猫が現れるらしいな？",
    customerReply: "しかも人間の言葉を話すらしい。驚きだぜ！",
    phases: Object.freeze([
      Object.freeze({
        id: "base",
        readFlag: TAVERN_RUMOR_001_BASE_READ_FLAG,
        unlock: context => !context.mikanEncountered,
        rosa: "…人の言葉を話す猫ですって。本当にいるのかしら…？"
      }),
      Object.freeze({
        id: "mikan",
        readFlag: TAVERN_RUMOR_001_MIKAN_READ_FLAG,
        unlock: context => context.mikanEncountered,
        rosa: "…人の言葉を話す猫ですって。本当にいるのかしら…？え？　いる？　みかんにゃんこという名前なの？まぁ！　可愛らしいわね。"
      })
    ])
  }),
  Object.freeze({
    id: "rumor_002",
    unlock: context => context.depthReached >= 2,
    opening: "あなたはカウンターから耳を澄ます……。",
    customerLead: "奈落の迷宮地下2階に亡霊が出る部屋があるらしいな？",
    customerReply: "しかも何回も繰り返し現れるらしい…！",
    phases: Object.freeze([
      Object.freeze({
        id: "base",
        readFlag: TAVERN_RUMOR_002_BASE_READ_FLAG,
        unlock: context => !context.lingeringGhostDefeated,
        rosa: "…亡霊ですって。本当にいるのかしら…？"
      }),
      Object.freeze({
        id: "ghost",
        readFlag: TAVERN_RUMOR_002_GHOST_READ_FLAG,
        unlock: context => context.lingeringGhostDefeated,
        rosa: "…亡霊ですって。本当にいるのかしら…？まぁ！本当にいたの！？しかも何度も出てくるですって！？恐ろしいわ…！"
      })
    ])
  })
]);

function buildDialogue(rumor, phase) {
  const opening = rumor.opening || "あなたはカウンターから耳を澄ます………。";
  return [
    `${opening}\n客「おい、知ってるか？${rumor.customerLead}」\n＊Aボタンで次へ`,
    `客「ああ。${rumor.customerReply}」\n＊Aボタンで次へ`,
    `ローザ「${phase.rosa}」\n＊Aボタンで戻る`
  ];
}

export function getUnreadTavernRumor(character, context = {}) {
  const normalizedContext = {
    mikanEncountered: Boolean(context.mikanEncountered),
    lingeringGhostDefeated: Boolean(context.lingeringGhostDefeated),
    depthReached: Math.max(1, Math.floor(Number(context.depthReached ?? character?.highestDungeonDepthReached) || 1))
  };
  const flags = character?.eventFlags || {};
  for (const rumor of TAVERN_RUMORS) {
    if (!rumor.unlock(normalizedContext)) continue;
    const unlockedPhases = rumor.phases.filter(phase => phase.unlock(normalizedContext));
    const phase = unlockedPhases.at(-1);
    if (!phase || flags[phase.readFlag]) continue;
    const phaseIndex = rumor.phases.indexOf(phase);
    return {
      id: `${rumor.id}_${phase.id}`,
      readFlags: rumor.phases.slice(0, phaseIndex + 1).map(candidate => candidate.readFlag),
      dialogue: buildDialogue(rumor, phase)
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
