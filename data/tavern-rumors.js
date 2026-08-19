export const TAVERN_RUMOR_001_BASE_READ_FLAG = "tavern_rumor_001_base_read";
export const TAVERN_RUMOR_001_MIKAN_READ_FLAG = "tavern_rumor_001_mikan_read";
export const TAVERN_RUMOR_002_BASE_READ_FLAG = "tavern_rumor_002_base_read";
export const TAVERN_RUMOR_002_GHOST_READ_FLAG = "tavern_rumor_002_ghost_read";
export const TAVERN_RUMOR_003_BASE_READ_FLAG = "tavern_rumor_003_base_read";
export const TAVERN_RUMOR_003_WISDOM_READ_FLAG = "tavern_rumor_003_wisdom_read";
export const TAVERN_RUMOR_004_BASE_READ_FLAG = "tavern_rumor_004_base_read";
export const TAVERN_RUMOR_004_MEDICINE_READ_FLAG = "tavern_rumor_004_medicine_read";
export const TAVERN_RUMOR_005_BASE_READ_FLAG = "tavern_rumor_005_base_read";
export const TAVERN_RUMOR_005_OUTFIT_READ_FLAG = "tavern_rumor_005_outfit_read";

export function getTavernRumorTypewriterParts(message) {
  const text = String(message || "");
  const match = text.match(/^(.*?(?:客|ローザ)「)([^」]*)(」[\s\S]*)$/s);
  if (!match) return null;
  return { prefix: match[1], dialogue: match[2], suffix: match[3] };
}

export const TAVERN_RUMORS = Object.freeze([
  Object.freeze({
    id: "rumor_001",
    title: "喋る猫の噂",
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
    title: "未練ある亡霊の噂",
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
  }),
  Object.freeze({
    id: "rumor_003",
    verbatimCustomers: true,
    title: "恐ろしい何かの噂",
    unlock: context => context.depthReached >= 4,
    opening: "あなたはカウンターから耳を澄ます……。",
    customerLead: "奈落の地下4階に恐ろしい何かが出るらしいな？",
    customerReply: "ああ。しかも生き残ったヤツがほとんどいないらしいぜ…！",
    phases: Object.freeze([
      Object.freeze({
        id: "base",
        readFlag: TAVERN_RUMOR_003_BASE_READ_FLAG,
        unlock: context => !context.otherworldlyWisdomDefeated,
        rosa: "まぁ、そんな恐ろしいものが…？本当にいるのかしら…？"
      }),
      Object.freeze({
        id: "wisdom",
        readFlag: TAVERN_RUMOR_003_WISDOM_READ_FLAG,
        unlock: context => context.otherworldlyWisdomDefeated,
        rosa: "まぁ、そんな恐ろしいものが…？本当にいるのかしら…？",
        rosaContinuation: "えっ…！本当にいたの？とても強かった！？あなた…よく生きて…。"
      })
    ])
  }),
  Object.freeze({
    id: "rumor_004",
    title: "司祭様の噂",
    unlock: context => context.quest019Completed && context.templeDonationCount >= 100,
    customerLead: "司祭様が腰を痛められて、ご静養なさっているらしい。",
    customerReply: "代わりを務める若い助祭が派遣されてきたな。",
    phases: Object.freeze([
      Object.freeze({
        id: "base",
        readFlag: TAVERN_RUMOR_004_BASE_READ_FLAG,
        unlock: context => !context.quest016Completed,
        rosa: "まぁ…！司祭様が…。とても心配だわ…。"
      }),
      Object.freeze({
        id: "medicine",
        readFlag: TAVERN_RUMOR_004_MEDICINE_READ_FLAG,
        unlock: context => context.quest016Completed,
        rosa: "まぁ…！司祭様が…。とても心配だわ…。",
        rosaContinuation: "えっ？あなたが特効薬の材料を集めたの？これで司祭様の具合も良くなるといいわね。"
      })
    ])
  }),
  Object.freeze({
    id: "rumor_005",
    title: "助祭の噂",
    unlock: context => context.priestRumorCompleted && context.templeDonationCount >= 500,
    customerLead: "寺院の助祭、ずいぶんと大胆な格好をしているな。",
    customerReply: "でもあれは祝祭で着る特別な衣装のはずだが…？",
    phases: Object.freeze([
      Object.freeze({
        id: "base",
        readFlag: TAVERN_RUMOR_005_BASE_READ_FLAG,
        unlock: context => !context.anastasiaOutfitEventSeen,
        rosa: "まぁ、どんな格好なのかしら…。あなたも興味あるわよね？"
      }),
      Object.freeze({
        id: "outfit",
        readFlag: TAVERN_RUMOR_005_OUTFIT_READ_FLAG,
        unlock: context => context.anastasiaOutfitEventSeen,
        rosa: "まぁ、どんな格好なのかしら…。あなたも興味あるわよね？",
        rosaContinuation: "えっ！？とても大胆な格好だった、ですって！？そんな娘には見えないけれど…。"
      })
    ])
  })
]);

function buildDialogue(rumor, phase) {
  const opening = rumor.opening || "あなたはカウンターから耳を澄ます………。";
  const dialogue = [
    `${opening}\n客「おい、知ってるか？${rumor.customerLead}」\n＊Aボタンで次へ`,
    `客「ああ。${rumor.customerReply}」\n＊Aボタンで次へ`,
    `ローザ「${phase.rosa}」\n＊Aボタンで${phase.rosaContinuation ? "次へ" : "戻る"}`
  ];
  if (rumor.verbatimCustomers) {
    dialogue[0] = dialogue[0].replace("\u304a\u3044\u3001\u77e5\u3063\u3066\u308b\u304b\uff1f", "");
    dialogue[1] = dialogue[1].replace("\u3042\u3042\u3002", "");
  }
  if (phase.rosaContinuation) dialogue.push(`ローザ「${phase.rosaContinuation}」\n＊Aボタンで戻る`);
  return dialogue;
}

function normalizeRumorContext(character, context = {}) {
  const completedQuestIds = character?.quests?.completedQuestIds || [];
  return {
    mikanEncountered: Boolean(context.mikanEncountered),
    lingeringGhostDefeated: Boolean(context.lingeringGhostDefeated),
    otherworldlyWisdomDefeated: Boolean(context.otherworldlyWisdomDefeated),
    depthReached: Math.max(1, Math.floor(Number(context.depthReached ?? character?.highestDungeonDepthReached) || 1)),
    templeDonationCount: Math.max(0, Math.floor(Number(context.templeDonationCount ?? character?.adventureStats?.templeDonationCount) || 0)),
    quest019Completed: Boolean(context.quest019Completed ?? completedQuestIds.includes("guild_019")),
    quest016Completed: Boolean(context.quest016Completed ?? completedQuestIds.includes("guild_016")),
    anastasiaOutfitEventSeen: Boolean(context.anastasiaOutfitEventSeen ?? character?.eventFlags?.anastasia_festival_outfit_unlocked),
    priestRumorCompleted: Boolean(context.priestRumorCompleted ?? character?.eventFlags?.tavern_rumor_004_medicine_read)
  };
}

export function getUnreadTavernRumor(character, context = {}) {
  const normalizedContext = normalizeRumorContext(character, context);
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

export function getPastTavernRumors(character, context = {}) {
  const normalizedContext = normalizeRumorContext(character, context);
  const flags = character?.eventFlags || {};
  return TAVERN_RUMORS.flatMap((rumor, index) => {
    if (!rumor.unlock(normalizedContext)) return [];
    const phase = rumor.phases.filter(candidate => candidate.unlock(normalizedContext)).at(-1);
    if (!phase || !flags[phase.readFlag]) return [];
    return [{
      id: rumor.id,
      number: String(index + 1).padStart(3, "0"),
      title: rumor.title,
      description: [
        `客：${rumor.customerLead}`,
        `客：${rumor.customerReply}`,
        `ローザ：${phase.rosa}`,
        phase.rosaContinuation ? `ローザ：${phase.rosaContinuation}` : ""
      ].filter(Boolean)
    }];
  });
}

export function markTavernRumorRead(character, rumor) {
  if (!character || !rumor?.readFlags?.length) return character;
  const eventFlags = { ...(character.eventFlags || {}) };
  rumor.readFlags.forEach(flag => { eventFlags[flag] = true; });
  return { ...character, eventFlags };
}
