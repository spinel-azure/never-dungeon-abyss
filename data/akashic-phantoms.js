// Post-ending encounters use exploration-local progress, never story victory flags.
export const AKASHIC_PHANTOM_IDS = Object.freeze(['erzdaemonin_phantom_b100f', 'amayenak_phantom_b100f']);
export const AKASHIC_BACKGROUND = 'images/background/dungeon_event_00b.avif';
export const AKASHIC_INTRO = 'アカシックレコードからあふれ出る膨大な魔力を感じる。どうやら暴走している様だ。傍らにいた影が襲いかかってくる…！';
export const QUEEN_PROJECTION_MESSAGES = Object.freeze([
  '…ますか…聞こえますか…。真実の杖が異常を告げています…。どうやらアカシックレコードが暴走している様なのです…。今一度最奥へと赴き、調査をお願い…しま…す…。',
  '…ますか…聞こえますか…。最奥から増大する闇の魔力を感じます…！これは…もし…や…アマイェ…。'
]);
export function isAkashicRematchUnlocked(flags) {
  return Boolean(flags?.ending_story_completed && (flags?.tavern_rumor_018_base_read || flags?.tavern_rumor_018_solved_read));
}
export function getAkashicBossId(flags, defeated) {
  if (!flags?.ending_story_completed) return undefined;
  if (!isAkashicRematchUnlocked(flags)) return null;
  return AKASHIC_PHANTOM_IDS.find(id => !defeated.has(id)) || null;
}
export function createAkashicBosses(bosses) {
  return Object.fromEntries(AKASHIC_PHANTOM_IDS.map((id, index) => {
    const base = bosses[index ? 'amayenak_b100f' : 'erzdaemonin_b100f'];
    return [id, Object.freeze({ ...base, id, name: `${base.name}（幻影）`,
      bossKind: 'akashicPhantom', akashicPhantom: true,
      causalityRevival: Boolean(index), maxHp: base.maxHp * (index ? 1.5 : 2),
      experienceReward: 0, noDrop: true, reward: { type: 'none' },
      defeatedFlag: `boss_${id}_defeated`, nextBossId: index ? null : AKASHIC_PHANTOM_IDS[1],
      statusResistances: { ...base.statusResistances,
        deadly_poison: { resistancePoints: 50 }, death_poison: { resistancePoints: 50 } },
      actions: [...base.actions, ...(!index ? [{ weight: 24, action: {
        id: 'phantom_charm', name: '魅惑の眼差し', actionType: 'spell',
        element: 'dark', spellPower: 25, unavoidable: true,
        effects: [{ statusId: 'charm', statusKind: 'magical', trigger: 'perAction', baseRate: .4 }]
      } }] : [])],
      event: { ...base.event, start: `${base.name}の幻影が襲いかかってきた！` }
    })];
  }));
}
