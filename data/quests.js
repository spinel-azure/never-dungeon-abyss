import { grantCard } from "./deck.js";
import { grantEquipmentInstance } from "./equipment-inventory.js";
import { grantItemWithOverflow } from "./inventory.js";
import { consumeKeyItem, getKeyItemCount, grantKeyItem, hasKeyItem } from "./key-items.js";

export const MAX_ACTIVE_QUESTS = 3;
export const GUILD_TRIAL_QUEST_ID = "guild_001_abyss_rat";
export const SLIME_EXTERMINATION_QUEST_ID = "guild_002_cave_slime";
export const FLOOR_SURVEY_QUEST_ID = "guild_003_b1f_survey";
export const RABBIT_EXTERMINATION_QUEST_ID = "guild_004_abyss_rabbit";
export const WANDERING_DEAD_EXTERMINATION_QUEST_ID = "guild_005";
export const BLACK_BOX_INVESTIGATION_QUEST_ID = "guild_006";
export const RED_DOOR_INVESTIGATION_QUEST_ID = "guild_007";
export const QUEEN_SHADOW_QUEST_ID = "guild_008";
export const JABBERWOCK_QUEST_ID = "guild_009";
export const SECOND_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_010";
export const THIEVES_HIDEOUT_QUEST_ID = "guild_011";
export const THIEVES_HIDEOUT_ACCEPTED_FLAG = "guild_011_accepted_once";
export const THIRD_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_012";
export const B35F_SURVEY_QUEST_ID = "guild_013";
export const B35F_SURVEY_SUPPLY_FLAG = "guild_013_large_potions_received";
export const BRASS_BULL_QUEST_ID = "guild_014";
export const FOURTH_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_015";
export const SPECIAL_MEDICINE_QUEST_ID = "guild_016";
export const B45F_SURVEY_QUEST_ID = "guild_017";
export const B45F_SURVEY_SUPPLY_FLAG = "guild_017_large_potions_received";
export const GUILD_018_QUEST_ID = "guild_018";
export const FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_019";
export const HERBICIDE_TRIAL_QUEST_ID = "guild_020";
export const ABYSS_MUSK_QUEST_ID = "guild_021";
export const SIXTH_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_023";
export const SECOND_QUEEN_SHADOW_QUEST_ID = "guild_024";
export const SEVENTH_RED_DOOR_INVESTIGATION_QUEST_ID = "guild_027";
export const JIRENE_SONG_INVESTIGATION_QUEST_ID = "guild_028";
export const JIRENE_SONG_INVESTIGATION_ACCEPTED_FLAG = "guild_028_accepted_once";
export const BEESWAX_COLLECTION_QUEST_ID = "guild_029";
export const CREEPING_CHAOS_QUEST_ID = "guild_030";
export const LICHTBRINGER_QUEST_ID = "guild_033";
export const THIRD_QUEEN_SHADOW_QUEST_ID = "guild_032";
export const CREEPING_CHAOS_ITEM_FLAG = "guild_030_trapezohedron_received";
export const BEESWAX_REQUIRED_COUNT = 15;
export const HERBICIDE_TRIAL_SUPPLY_FLAG = "guild_020_trial_herbicide_received";
export const SPECIAL_MEDICINE_INGREDIENT_FLAGS = Object.freeze(
  Array.from({ length: 8 }, (_, index) => `quest_016_ingredient_b${index + 51}f_found`)
);
export const THIEVES_CLUE_FLAGS = Object.freeze([
  "quest_011_clue_emblem_found", "quest_011_clue_ledger_found", "quest_011_clue_map_found"
]);
export const QUEEN_SHADOW_PROGRESS_FLAGS = Object.freeze([
  "quest_008_shadow_b10f_found",
  "quest_008_shadow_b11f_found",
  "quest_008_shadow_b12f_found",
  "quest_008_shadow_b13f_found",
  "quest_008_tiara_found"
]);
export const SECOND_QUEEN_SHADOW_PROGRESS_FLAGS = Object.freeze([
  ...Array.from({ length: 6 }, (_, index) => `quest_024_shadow_b${index + 60}f_found`),
  "quest_024_earring_found"
]);
export const THIRD_QUEEN_SHADOW_PROGRESS_FLAGS = Object.freeze([
  ...Array.from({ length: 9 }, (_, index) => `quest_032_shadow_b${index + 90}f_found`),
  "quest_032_necklace_found"
]);
export const RED_DOOR_DEFENSE_CARD_FLAG = "guild_007_defense_card_received";
export const RED_DOOR_DEFENSE_CARD_ID = "rare_defense_up";
export const B2F_UNLOCK_QUEST_IDS = Object.freeze([
  GUILD_TRIAL_QUEST_ID,
  SLIME_EXTERMINATION_QUEST_ID,
  FLOOR_SURVEY_QUEST_ID
]);

export const QUESTS = Object.freeze([
  Object.freeze({
    id: "guild_001_abyss_rat",
    number: "001",
    title: "奈落ネズミ退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "abyss_rat",
    targetName: "奈落ネズミ",
    targetDepth: 1,
    forceTargetEnemy: true,
    forcePriority: 10,
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_gale_feather",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fでネズミが異常繁殖している。外にあふれ出したら",
      "面倒だ。食い止めてくれ。"
    ]),
    available: true
  }),
  Object.freeze({
    id: SLIME_EXTERMINATION_QUEST_ID,
    number: "002",
    title: "スライム退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "cave_slime",
    targetName: "洞窟スライム",
    targetDepth: 1,
    forceTargetEnemy: true,
    forcePriority: 20,
    objectiveLabel: "洞窟スライムを15匹討伐する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_hp_up",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fでスライムが異常発生しやがった。数を減らしてくれ。",
      "やつらは奈落ネズミより手強いぜ。気をつけろ。"
    ]),
    available: true
  }),
  Object.freeze({
    id: FLOOR_SURVEY_QUEST_ID,
    number: "003",
    title: "迷宮地下1階調査",
    client: "ギルドマスター",
    objectiveType: "exploreFloor",
    targetDepth: 1,
    objectiveLabel: "B1Fを全て踏破する",
    requiredCount: 100,
    reward: Object.freeze({
      type: "card",
      cardId: "common_sp_up",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    description: Object.freeze([
      "奈落のB1Fを調査してほしい。ただし、奈落は入る度にその姿を",
      "変える。一度も帰還せずに隅々まで調べてくれ。"
    ]),
    available: true
  }),
  Object.freeze({
    id: RABBIT_EXTERMINATION_QUEST_ID,
    number: "004",
    title: "奈落ウサギ退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "abyss_rabbit",
    targetName: "奈落ウサギ",
    targetDepth: 2,
    forceTargetEnemy: true,
    forcePriority: 10,
    objectiveLabel: "奈落ウサギを15匹退治する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_alertness",
      label: "デッキカード×1",
      bonusGold: 200
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB2Fでウサギが大量繁殖している。適度に数を減らしてくれ。",
      "奴らはいきなり襲ってくる。不意打ちには十分に気をつけろ。"
    ]),
    prerequisiteQuestIds: B2F_UNLOCK_QUEST_IDS,
    available: true
  }),
  Object.freeze({
    id: WANDERING_DEAD_EXTERMINATION_QUEST_ID,
    number: "005",
    title: "さまよう亡者退治",
    client: "ギルドマスター",
    objectiveType: "defeatEnemy",
    targetId: "wandering_dead",
    targetName: "さまよう亡者",
    targetDepth: 4,
    forceTargetEnemy: true,
    forcePriority: 10,
    objectiveLabel: "さまよう亡者を15体退治する。",
    requiredCount: 15,
    reward: Object.freeze({
      type: "card",
      cardId: "common_dexterity_lesson",
      label: "デッキカード×1",
      amount: 1,
      bonusGold: 400
    }),
    description: Object.freeze([
      "奈落のB4Fでさまよう亡者が多数目撃されている。",
      "この世に未練でもあるのだろうか…？犠牲者が増える前に",
      "対処してくれ。事前に聖水を用意しておくといいかもな。"
    ]),
    available: true
  }),
  Object.freeze({
    id: BLACK_BOX_INVESTIGATION_QUEST_ID, number: "006", title: "黒い箱の調査",
    client: "ギルドマスター", category: "other", objectiveType: "custom",
    targetName: "", targetDepth: 6, requiredCount: 1,
    objectiveLabel: "黒い箱を開けて中身を確かめる",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1,
      cardId: "common_first_aid", bonusGold: 400 }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "奈落のB6Fで黒い箱が置かれた部屋がある。",
      "しかし、開けに行った奴が誰も戻って来ない。",
      "調べに行ってくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([WANDERING_DEAD_EXTERMINATION_QUEST_ID]),
    customProgressFlag: "boss_quest_mimic_b6f_defeated",
    reportUnlockFlag: "black_chests_unlocked",
    available: true
  }),
  Object.freeze({
    id: RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "007",
    title: "赤い扉の調査",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "strange_knight_statue_b9f",
    targetName: "奇妙な彫像",
    targetDepth: 9,
    requiredCount: 1,
    objectiveLabel: "赤い扉を開けて中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード", amount: 1,
      cardId: "sr_ability_boost", bonusGold: 600
    }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "奈落のB9Fに開かずの赤い扉がある。",
      "扉を開けて、中がどうなっているのか調査してほしい。",
      "何があるか分からない。十分に注意しろ。"
    ]),
    persistentProgressFlag: "quest_007_strange_statue_defeated_while_active",
    completedTargetFlag: "boss_strange_knight_statue_b9f_defeated",
    available: true
  }),
  Object.freeze({
    id: QUEEN_SHADOW_QUEST_ID,
    number: "008",
    title: "女王の影を追え",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 14,
    requiredCount: 5,
    objectiveLabel: "女王らしき影を追跡する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "rare_resistance_spirit", bonusGold: 600
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "行方不明になった女王らしい姿を奈落B11F",
      "以降で見かけたという噂が広がっている。",
      "噂が本当なのか確かめてくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([RED_DOOR_INVESTIGATION_QUEST_ID]),
    persistentProgressFlags: QUEEN_SHADOW_PROGRESS_FLAGS,
    available: true
  }),
  Object.freeze({
    id: JABBERWOCK_QUEST_ID,
    number: "009",
    title: "燻り狂うもの",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "jabberwock_event_boss",
    targetName: "ジャバウォック",
    targetDepth: 16,
    requiredCount: 1,
    objectiveLabel: "ジャバウォックを退治する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "sr_floor_detection", bonusGold: 800
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落B16Fのとある場所にジャバウォックと呼ばれる",
      "恐ろしい怪物が出現するらしい。正体を突き止めて",
      "退治してくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([BLACK_BOX_INVESTIGATION_QUEST_ID]),
    persistentProgressFlag: "quest_009_jabberwock_defeated_while_active",
    completedTargetFlag: "boss_jabberwock_event_boss_defeated",
    available: true
  }),
  Object.freeze({
    id: SECOND_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "010",
    title: "赤い扉の調査――その2",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "fallen_mage_b19f",
    targetName: "堕落した魔術師",
    targetDepth: 19,
    requiredCount: 1,
    objectiveLabel: "赤い扉を開けて中の様子を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "sr_magic_barrier", bonusGold: 1000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB19Fにある赤い扉の向こう側で何かが",
      "行われているらしい。扉を開け、中の様子を調査",
      "してくれ。"
    ]),
    prerequisiteQuestIds: Object.freeze([RED_DOOR_INVESTIGATION_QUEST_ID]),
    minimumDepthReached: 10,
    persistentProgressFlag: "quest_010_fallen_mage_defeated_while_active",
    completedTargetFlag: "boss_fallen_mage_b19f_defeated",
    available: true
  }),
  Object.freeze({
    id: THIEVES_HIDEOUT_QUEST_ID, number: "011", title: "盗賊の隠れ家",
    client: "ギルドマスター", category: "other", objectiveType: "defeatBoss",
    progressMode: "matchedFlags", targetId: "thief_leader_event_boss", targetName: "悪意に満ちた頭目",
    targetDepth: 27, requiredCount: 4,
    objectiveLabel: "盗賊の手掛かりを集め、頭領を討伐する",
    reward: Object.freeze({ type: "cards", label: "デッキカード×2",
      cardIds: Object.freeze(["sr_flame_armament", "sr_ice_armament"]), bonusGold: 2000,
      presentationOrder: "cardsThenGold" }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB20F台を根城にしている盗賊団がいるらしい。",
      "連中の隠れ家を突き止め、頭領を討伐してくれ。",
      "まずは迷宮内に残された手掛かりを探すんだ。"
    ]),
    prerequisiteQuestIds: Object.freeze([SECOND_RED_DOOR_INVESTIGATION_QUEST_ID]),
    reportUnlockFlags: Object.freeze(["support_npc_malicious_join_unlocked"]),
    persistentProgressFlags: Object.freeze([...THIEVES_CLUE_FLAGS, "quest_011_thief_leader_defeated_while_active"]),
    persistentProgressFlag: "quest_011_thief_leader_defeated_while_active",
    completedTargetFlag: "boss_thief_leader_event_boss_defeated", available: true
  }),
  Object.freeze({
    id: THIRD_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "012",
    title: "赤い扉の調査――その3",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 30,
    requiredCount: 3,
    objectiveLabel: "赤い扉を開け、中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_ability_boost_plus", bonusGold: 3000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB29Fにある開かずの赤い扉を開けて",
      "中を調査してほしい。例によって何があるか",
      "分からない。十分に注意しろ。"
    ]),
    prerequisiteQuestIds: Object.freeze([THIEVES_HIDEOUT_QUEST_ID]),
    persistentProgressFlags: Object.freeze([
      "red_door_b29f_unlocked",
      "boss_iron_maiden_b29f_defeated",
      "shop_stock_b30f_unlocked"
    ]),
    available: true
  }),
  Object.freeze({
    id: B35F_SURVEY_QUEST_ID,
    number: "013",
    title: "迷宮地下35階の調査",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "exploreFloor",
    targetDepth: 35,
    requiredCount: 100,
    objectiveLabel: "途中で戻ることなくB35Fを100マス踏破する",
    reward: Object.freeze({
      type: "equipment", label: "装備品×1", amount: 1,
      equipmentId: "fireproof_boots", slot: "footId", bonusGold: 2000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落の灼熱区域を調査してもらいたい。",
      "途中で戻る事なくB35Fを隅々まで調べてくれ。危険な調査なので",
      "今回は事前に支給品がある。受け取れ。"
    ]),
    prerequisiteQuestIds: Object.freeze([THIRD_RED_DOOR_INVESTIGATION_QUEST_ID]),
    reportUnlockFlag: "weapon_imbue_oils_shop_unlocked",
    available: true
  }),
  Object.freeze({
    id: BRASS_BULL_QUEST_ID,
    number: "014",
    title: "燃えさかる雄牛",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "brass_bull_event_boss",
    targetName: "真鍮の雄牛",
    targetDepth: 36,
    requiredCount: 1,
    objectiveLabel: "小部屋の中を調査する",
    reward: Object.freeze({
      type: "item", label: "消費アイテム×3", amount: 3,
      itemId: "scorching_barrier", bonusGold: 5000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB36Fの小部屋で雄牛の咆哮が聞こえるという。",
      "詳しく調べてほしい。"
    ]),
    prerequisiteQuestIds: Object.freeze([B35F_SURVEY_QUEST_ID]),
    persistentProgressFlag: "quest_014_brass_bull_defeated_while_active",
    completedTargetFlag: "boss_brass_bull_event_boss_defeated",
    reportUnlockFlag: "scorching_barrier_shop_unlocked",
    available: true
  }),
  Object.freeze({
    id: FOURTH_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "015",
    title: "赤い扉の調査――その4",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 40,
    requiredCount: 3,
    objectiveLabel: "赤い扉を開け、中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_goddess_mercy", bonusGold: 5000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB39Fにある開かずの赤い扉を開けて",
      "中を調査してほしい。例によって何があるか",
      "分からない。十分に注意しろ。"
    ]),
    prerequisiteQuestIds: Object.freeze([BRASS_BULL_QUEST_ID]),
    persistentProgressFlags: Object.freeze([
      "red_door_b39f_unlocked",
      "boss_wicker_man_b39f_defeated",
      "transfer_portal_b40f_unlocked"
    ]),
    available: true
  }),
  Object.freeze({
    id: SPECIAL_MEDICINE_QUEST_ID,
    number: "016",
    title: "特効薬の素材集め",
    client: "アナスタシア",
    category: "other",
    objectiveType: "custom",
    targetDepth: 58,
    requiredCount: 8,
    objectiveHeading: "内容",
    objectiveLabel: "腰痛の特効薬の素材集め",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_deadly_poison_immunity", bonusGold: 10000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "司祭アーヴァイン様が腰を痛められてしまいました。",
      "特効薬に必要な素材は密林区域でしか手に入らないとか。",
      "どうか集めてくださいませ。"
    ]),
    prerequisiteQuestIds: Object.freeze([FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID]),
    availableFlag: "tavern_rumor_004_base_read",
    persistentProgressFlags: SPECIAL_MEDICINE_INGREDIENT_FLAGS,
    progressMode: "matchedFlags",
    requiredKeyItemId: "special_medicine_ingredient",
    requiredKeyItemCount: 8,
    reportUnlockFlags: Object.freeze([
      "achievement_priest_back_recovered",
      "support_npc_loretta_join_unlocked"
    ]),
    reportMessage: "ギルドマスター：集めた素材は俺が預かろう。",
    available: true
  }),
  Object.freeze({
    id: B45F_SURVEY_QUEST_ID,
    number: "017",
    title: "迷宮地下45階の調査",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "exploreFloor",
    targetDepth: 45,
    requiredCount: 100,
    objectiveLabel: "途中で戻ることなくB45Fを100マス踏破する",
    reward: Object.freeze({
      type: "equipment", label: "装備品×1", amount: 1,
      equipmentId: "coldproof_boots", slot: "footId", bonusGold: 4000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落の極寒区域を調査してもらいたい。",
      "途中で戻る事なくB45Fを隅々まで調べてくれ。危険な調査なので",
      "今回は事前に支給品がある。受け取れ。"
    ]),
    prerequisiteQuestIds: Object.freeze([FOURTH_RED_DOOR_INVESTIGATION_QUEST_ID]),
    available: true
  }),
  Object.freeze({
    id: GUILD_018_QUEST_ID,
    number: "018",
    title: "氷の巨人",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "glacies_event_boss",
    targetName: "グラキエス",
    targetDepth: 46,
    requiredCount: 1,
    objectiveLabel: "小部屋の中を調査する",
    reward: Object.freeze({
      type: "item", label: "消費アイテム×3", amount: 3,
      itemId: "extreme_cold_barrier", bonusGold: 5000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB46Fで氷の巨人を見た者がいるらしい。",
      "詳しく調べてくれ。念の為、用心は怠るなよ。"
    ]),
    prerequisiteQuestIds: Object.freeze([B45F_SURVEY_QUEST_ID]),
    persistentProgressFlag: "quest_018_glacies_defeated_while_active",
    completedTargetFlag: "boss_glacies_event_boss_defeated",
    reportUnlockFlag: "extreme_cold_barrier_shop_unlocked",
    available: true
  }),
  Object.freeze({
    id: FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "019",
    title: "赤い扉の調査――その5",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 50,
    requiredCount: 3,
    objectiveLabel: "赤い扉を開け、中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_unlimited_torch_gauge", bonusGold: 5000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "奈落のB49Fにある開かずの赤い扉を開けて",
      "中を調査してほしい。例によって何があるか",
      "分からない。十分に注意しろ。"
    ]),
    prerequisiteQuestIds: Object.freeze([GUILD_018_QUEST_ID]),
    persistentProgressFlags: Object.freeze([
      "red_door_b49f_unlocked",
      "boss_eiskoenigin_b49f_defeated",
      "transfer_portal_b50f_unlocked"
    ]),
    available: true
  }),
  Object.freeze({
    id: HERBICIDE_TRIAL_QUEST_ID,
    number: "020",
    title: "除草剤散布作業員募集",
    client: "ヘレン",
    category: "other",
    objectiveType: "custom",
    targetDepth: 58,
    requiredCount: 5,
    objectiveHeading: "内容",
    objectiveLabel: "支給された強力除草剤を試す",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_mana_activation", bonusGold: 20000 }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "強力除草剤の試供品を入荷したんだけど、試しに密林区域で使って",
      "貰いたいの。もしも効き目があるなら店で正式に取り扱う",
      "つもりよ。よろしく頼むわね。"
    ]),
    prerequisiteQuestIds: Object.freeze([FIFTH_RED_DOOR_INVESTIGATION_QUEST_ID]),
    reportUnlockFlags: Object.freeze(["strong_herbicide_shop_unlocked", "strong_herbicide_shop_reward_pending"]),
    available: true
  }),
  Object.freeze({
    id: ABYSS_MUSK_QUEST_ID,
    number: "021",
    title: "奈落麝香の材料入手",
    client: "ヘレン",
    category: "other",
    objectiveType: "defeatBoss",
    targetId: "musk_beast_b56f",
    targetName: "ムスクビースト",
    targetDepth: 56,
    requiredCount: 1,
    objectiveHeading: "内容",
    objectiveLabel: "とても希少な《芳香嚢》を手に入れてほしい",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_mana_barrier", bonusGold: 20000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "ムスクビーストという獣から《芳香嚢》を採取してほしいの。",
      "B56Fのどこかにある泉でよく見かけると聞いたことがあるわ。",
      "念の為、強力除草剤も用意していくといいわよ。"
    ]),
    prerequisiteQuestIds: Object.freeze([HERBICIDE_TRIAL_QUEST_ID]),
    availableFlag: "tavern_rumor_006_base_read",
    persistentProgressFlag: "quest_021_musk_beast_defeated_while_active",
    completedTargetFlag: "boss_musk_beast_b56f_defeated",
    requiredKeyItemId: "scent_gland",
    requiredKeyItemCount: 1,
    reportUnlockFlag: "helen_hidden_event_pending",
    reportMessage: "ギルドマスター：そう言えば、店に寄ってくれとヘレンが言ってたぜ。顔出してやれ。",
    available: true
  }),
  Object.freeze({
    id: SIXTH_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "023",
    title: "赤い扉の調査――その6",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 60,
    requiredCount: 3,
    objectiveLabel: "赤い扉を開け、中を調査する",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_goddess_breath", bonusGold: 20000 }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "B59Fにある赤い扉を開けて中を調べて欲しい。",
      "また手強い何かがいるはずだ。事前準備と用心は怠るな。"
    ]),
    prerequisiteQuestIds: Object.freeze([HERBICIDE_TRIAL_QUEST_ID]),
    persistentProgressFlags: Object.freeze(["red_door_b59f_unlocked", "boss_fleischfresser_b59f_defeated", "transfer_portal_b60f_unlocked"]),
    available: true
  }),
  Object.freeze({
    id: SECOND_QUEEN_SHADOW_QUEST_ID,
    number: "024",
    title: "女王の影を追え――その2",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 66,
    requiredCount: 7,
    objectiveLabel: "砂漠区域で女王の影を見つける",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "sr_mirage" }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "行方不明の女王に似た姿を砂漠区域で多数見かけ",
      "たいう情報が入った。真偽を確かめてくれ。",
      "砂漠区域は流砂に足を取られたり、蜃気楼に",
      "惑わされるという。十分に気をつけろ。"
    ]),
    prerequisiteQuestIds: Object.freeze([HERBICIDE_TRIAL_QUEST_ID]),
    persistentProgressFlags: SECOND_QUEEN_SHADOW_PROGRESS_FLAGS,
    progressMode: "matchedFlags",
    available: true
  }),
  Object.freeze({
    id: SEVENTH_RED_DOOR_INVESTIGATION_QUEST_ID,
    number: "027",
    title: "赤い扉の調査――その7",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 70,
    requiredCount: 3,
    objectiveLabel: "赤い扉を開け、中を調査する",
    reward: Object.freeze({
      type: "card", label: "デッキカード×1", amount: 1,
      cardId: "legendary_deep_floor_proof", bonusGold: 40000
    }),
    descriptionLabel: "目的",
    description: Object.freeze([
      "B69Fにある赤い扉を開けて中を調べて欲しい。",
      "また手強い何かがいるはずだ。事前準備と用心は怠るな。"
    ]),
    prerequisiteQuestIds: Object.freeze([SIXTH_RED_DOOR_INVESTIGATION_QUEST_ID]),
    persistentProgressFlags: Object.freeze([
      "red_door_b69f_unlocked", "boss_b69f_defeated", "transfer_portal_b70f_unlocked"
    ]),
    reportUnlockFlags: Object.freeze([
      "active_healing_potion_small_shop_unlocked", "johanna_cat_return_pending"
    ]),
    reportMessage: "ギルドマスター：赤い扉の先を調べ、ついにB70Fまで辿り着いたか。お前も今や、誰もが認める深層冒険者だ。\nこれはギルドからの正式な認定証だ。受け取れ。\nLカード「深層踏破の証」を手に入れた！",
    available: true
  }),
  Object.freeze({
    id: JIRENE_SONG_INVESTIGATION_QUEST_ID,
    number: "028",
    title: "歌声の調査",
    client: "パルテノペー",
    category: "other",
    objectiveType: "custom",
    targetDepth: 80,
    requiredCount: 3,
    objectiveLabel: "歌声のする場所を調べる",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_mana_booster" }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "奈落のB79Fの奥にある赤い扉の向こうから",
      "歌声が聞こえてくるんです。まるで何かを誘う",
      "ような…。誰が歌っているのか調べてください。",
      ""
    ]),
    prerequisiteQuestIds: Object.freeze([SEVENTH_RED_DOOR_INVESTIGATION_QUEST_ID]),
    persistentProgressFlags: Object.freeze([
      "jirene_scripted_defeat_seen", "boss_jirene_b79f_defeated", "floor_b80_reached"
    ]),
    reportUnlockFlags: Object.freeze(["transfer_portal_b80f_unlocked"]),
    available: true
  }),
  Object.freeze({
    id: BEESWAX_COLLECTION_QUEST_ID,
    number: "029",
    title: "蜜蝋の採取",
    client: "キルケ",
    category: "other",
    objectiveType: "custom",
    targetDepth: 58,
    requiredCount: BEESWAX_REQUIRED_COUNT + 1,
    displayRequiredCount: BEESWAX_REQUIRED_COUNT,
    objectiveLabel: "密林区域で蜜蝋を15個採取する",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "sr_lightning_armament", bonusGold: 30000 }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "あたしゃ、キルケっていう魔女だよ。",
      "薬を作るのに必要な蜜蝋を切らしちまってね、",
      "代わりに15個ほど集めてほしいのさ。",
      "B58Fにあるあたしの家まで届けておくれ。"
    ]),
    availableFlag: "jirene_scripted_defeat_seen",
    available: true
  }),
  Object.freeze({
    id: CREEPING_CHAOS_QUEST_ID,
    number: "030",
    title: "異界の混沌",
    client: "怪しげな男",
    category: "other",
    objectiveType: "custom",
    targetDepth: 89,
    requiredCount: 1,
    objectiveLabel: "B89Fの赤い扉のある部屋へ行く",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_life_booster", bonusGold: 40000 }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "この多面体を奈落B89Fにある赤い扉の奥にある",
      "部屋まで持っていき、そこで掲げてほしい。",
      "そして、最後まで見届けてくれ。",
      "たとえ…何があっても…な。"
    ]),
    prerequisiteQuestIds: Object.freeze([BEESWAX_COLLECTION_QUEST_ID]),
    minimumDepthReached: 80,
    completedTargetFlag: "boss_b89f_defeated",
    available: true
  }),
  Object.freeze({
    id: LICHTBRINGER_QUEST_ID,
    number: "033",
    title: "闇を照らすもの",
    client: "キルケ",
    category: "other",
    objectiveType: "custom",
    targetDepth: 95,
    requiredCount: 1,
    objectiveLabel: "リヒトブリンガーの入手",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "zodiac_virgo" }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "漆黒区域は闇に閉ざされており、あらゆる光を拒む",
      "そうじゃが、その闇を照らすものがあるという。",
      "手がかりは漆黒区域のどこか、しか分からぬが",
      "女王様を探す手助けにはなるはずじゃ。"
    ]),
    prerequisiteQuestIds: Object.freeze([CREEPING_CHAOS_QUEST_ID]),
    completedTargetFlag: "lichtbringer_b95f_found",
    ownedKeyItemCompletionId: "lichtbringer",
    available: true
  }),
  Object.freeze({
    id: THIRD_QUEEN_SHADOW_QUEST_ID,
    number: "032",
    title: "女王の影を追え――その3",
    client: "ギルドマスター",
    category: "other",
    objectiveType: "custom",
    targetDepth: 99,
    requiredCount: 10,
    objectiveLabel: "女王の影を見つける",
    reward: Object.freeze({ type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_vital_surge" }),
    descriptionLabel: "内容",
    description: Object.freeze([
      "光に照らされた漆黒区域で女王らしき姿を目撃した",
      "という情報が入った。今度こそ本物の女王かも",
      "知れない。真偽を確かめてくれ。頼んだぞ。",
      ""
    ]),
    prerequisiteQuestIds: Object.freeze([LICHTBRINGER_QUEST_ID]),
    persistentProgressFlags: THIRD_QUEEN_SHADOW_PROGRESS_FLAGS,
    progressMode: "matchedFlags",
    ownedKeyItemCompletionId: "queen_necklace",
    available: true
  })
]);

export function recordQuestBeeswax(character, amount = 1) {
  const progress = getQuestProgress(character, BEESWAX_COLLECTION_QUEST_ID);
  if (!progress.active || progress.completed || character?.eventFlags?.quest_029_beeswax_delivered) return character;
  const remaining = Math.max(0, BEESWAX_REQUIRED_COUNT - Math.min(BEESWAX_REQUIRED_COUNT, progress.progress));
  return remaining > 0
    ? recordCustomQuestProgress(character, BEESWAX_COLLECTION_QUEST_ID, Math.min(remaining, Math.max(0, Math.floor(Number(amount) || 0))))
    : character;
}

export function deliverQuestBeeswax(character) {
  const progress = getQuestProgress(character, BEESWAX_COLLECTION_QUEST_ID);
  if (!progress.active || progress.completed || progress.progress < BEESWAX_REQUIRED_COUNT
    || character?.eventFlags?.quest_029_beeswax_delivered) return result(character, false, "notReady");
  const withDelivery = {
    ...character,
    eventFlags: {
      ...(character.eventFlags || {}),
      quest_029_beeswax_delivered: true,
      jirene_countermeasure_obtained: true
    }
  };
  return result(recordCustomQuestProgress(withDelivery, BEESWAX_COLLECTION_QUEST_ID, 1), true);
}

export function getQuestById(questId) {
  return QUESTS.find(quest => quest.id === questId) || null;
}

export function normalizeQuestState(candidate) {
  const active = {};
  if (candidate?.active && typeof candidate.active === "object") {
    Object.entries(candidate.active).forEach(([questId, entry]) => {
      const quest = getQuestById(questId);
      if (!quest?.available) return;
      active[questId] = {
        progress: Math.max(
          0,
          Math.min(quest.requiredCount, Math.floor(Number(entry?.progress) || 0))
        )
      };
    });
  }
  const completedQuestIds = Array.isArray(candidate?.completedQuestIds)
    ? [...new Set(candidate.completedQuestIds.filter(id => getQuestById(id)))]
    : [];
  return { active, completedQuestIds };
}

export function getQuestProgress(character, questId) {
  const quest = getQuestById(questId);
  const state = normalizeQuestState(character?.quests);
  const savedProgress = Math.max(0, Math.floor(Number(state.active[questId]?.progress) || 0));
  const targetAlreadyCompleted = Boolean(
    state.active[questId] && (
      quest?.completedTargetFlag && character?.eventFlags?.[quest.completedTargetFlag]
      || quest?.ownedKeyItemCompletionId && hasKeyItem(character?.keyItems, quest.ownedKeyItemCompletionId)
    )
  );
  const persistentProgress = Array.isArray(quest?.persistentProgressFlags)
    ? quest.progressMode === "matchedFlags"
      ? countMatchedProgressFlags(character, quest.persistentProgressFlags)
      : countSequentialProgressFlags(character, quest.persistentProgressFlags)
    : 0;
  const progress = targetAlreadyCompleted
    ? quest.requiredCount
    : Math.max(savedProgress, Math.min(quest?.requiredCount || 0, persistentProgress));
  return {
    quest,
    active: Boolean(state.active[questId]),
    completed: state.completedQuestIds.includes(questId),
    progress,
    readyToReport: Boolean(quest && state.active[questId] && progress >= quest.requiredCount)
  };
}

export function isQuestAvailable(character, questOrId) {
  const quest = typeof questOrId === "string" ? getQuestById(questOrId) : questOrId;
  if (!quest?.available) return false;
  if (quest.availableFlag && !character?.eventFlags?.[quest.availableFlag]) return false;
  const initialQuestGate = B2F_UNLOCK_QUEST_IDS.includes(quest.id)
    ? []
    : B2F_UNLOCK_QUEST_IDS;
  const questPrerequisites = Array.isArray(quest.prerequisiteQuestIds)
    ? quest.prerequisiteQuestIds
    : [];
  const prerequisites = [...new Set([...initialQuestGate, ...questPrerequisites])];
  if (!prerequisites.every(questId => getQuestProgress(character, questId).completed)) return false;
  const reachedDepth = Math.max(
    Math.floor(Number(character?.highestDungeonDepthReached) || 1),
    character?.eventFlags?.transfer_portal_b10f_unlocked ? 10 : 1
  );
  return !quest.minimumDepthReached || reachedDepth >= quest.minimumDepthReached;
}

export function acceptQuest(character, questId) {
  const quest = getQuestById(questId);
  const quests = normalizeQuestState(character?.quests);
  if (!isQuestAvailable(character, quest)) return result(character, false, "unavailable");
  if (quests.completedQuestIds.includes(quest.id)) return result(character, false, "completed");
  if (quests.active[quest.id]) return result(character, false, "alreadyAccepted");
  if (Object.keys(quests.active).length >= MAX_ACTIVE_QUESTS) {
    return result(character, false, "activeLimit");
  }
  const persistentProgressFlag = quest.persistentProgressFlag || quest.customProgressFlag;
  const targetAlreadyCompleted = Boolean(
    quest.completedTargetFlag && character?.eventFlags?.[quest.completedTargetFlag]
    || quest.ownedKeyItemCompletionId && hasKeyItem(character?.keyItems, quest.ownedKeyItemCompletionId)
  );
  const persistentProgress = Array.isArray(quest.persistentProgressFlags)
    ? quest.progressMode === "matchedFlags"
      ? countMatchedProgressFlags(character, quest.persistentProgressFlags)
      : countSequentialProgressFlags(character, quest.persistentProgressFlags)
    : 0;
  quests.active[quest.id] = {
    progress: targetAlreadyCompleted || (persistentProgressFlag && character?.eventFlags?.[persistentProgressFlag])
      ? quest.requiredCount : Math.min(quest.requiredCount, persistentProgress)
  };
  let next = { ...character, quests };
  if (quest.id === JIRENE_SONG_INVESTIGATION_QUEST_ID) {
    next = {
      ...next,
      eventFlags: {
        ...(next.eventFlags || {}),
        [JIRENE_SONG_INVESTIGATION_ACCEPTED_FLAG]: true
      }
    };
  }
  if (quest.id === THIEVES_HIDEOUT_QUEST_ID) {
    next = {
      ...next,
      eventFlags: {
        ...(next.eventFlags || {}),
        [THIEVES_HIDEOUT_ACCEPTED_FLAG]: true
      }
    };
  }
  let acceptanceRewardCardId = null;
  if (quest.id === RED_DOOR_INVESTIGATION_QUEST_ID) {
    const supply = grantRedDoorInvestigationSupply(next);
    next = supply.character;
    if (supply.gained > 0) acceptanceRewardCardId = RED_DOOR_DEFENSE_CARD_ID;
  }
  let acceptanceSupplyItemId = null;
  let acceptanceSupplyAmount = 0;
  let acceptanceKeyItemId = null;
  if (quest.id === CREEPING_CHAOS_QUEST_ID && !next.eventFlags?.[CREEPING_CHAOS_ITEM_FLAG]) {
    const granted = grantKeyItem(next.keyItems, "trapezohedron");
    next = {
      ...next,
      keyItems: granted.keyItems,
      eventFlags: { ...(next.eventFlags || {}), [CREEPING_CHAOS_ITEM_FLAG]: true }
    };
    if (granted.gained) acceptanceKeyItemId = "trapezohedron";
  }
  if (quest.id === B35F_SURVEY_QUEST_ID && !next.eventFlags?.[B35F_SURVEY_SUPPLY_FLAG]) {
    const supply = grantItemWithOverflow(next, "healing_potion_large", 10);
    next = {
      ...supply.character,
      eventFlags: { ...(supply.character.eventFlags || {}), [B35F_SURVEY_SUPPLY_FLAG]: true }
    };
    acceptanceSupplyItemId = "healing_potion_large";
    acceptanceSupplyAmount = supply.gained + supply.stored;
  }
  if (quest.id === B45F_SURVEY_QUEST_ID && !next.eventFlags?.[B45F_SURVEY_SUPPLY_FLAG]) {
    const supply = grantItemWithOverflow(next, "healing_potion_large", 15);
    next = {
      ...supply.character,
      eventFlags: { ...(supply.character.eventFlags || {}), [B45F_SURVEY_SUPPLY_FLAG]: true }
    };
    acceptanceSupplyItemId = "healing_potion_large";
    acceptanceSupplyAmount = supply.gained + supply.stored;
  }
  if (quest.id === HERBICIDE_TRIAL_QUEST_ID && !next.eventFlags?.[HERBICIDE_TRIAL_SUPPLY_FLAG]) {
    const supply = grantItemWithOverflow(next, "strong_herbicide_trial", 5);
    next = {
      ...supply.character,
      eventFlags: { ...(supply.character.eventFlags || {}), [HERBICIDE_TRIAL_SUPPLY_FLAG]: true }
    };
    acceptanceSupplyItemId = "strong_herbicide_trial";
    acceptanceSupplyAmount = supply.gained + supply.stored;
  }
  return {
    ...result(next, true), acceptanceRewardCardId, acceptanceSupplyItemId,
    acceptanceSupplyAmount, acceptanceKeyItemId
  };
}

export function grantRedDoorInvestigationSupply(character) {
  if (!character || character.eventFlags?.[RED_DOOR_DEFENSE_CARD_FLAG]) {
    return { character, accepted: false, gained: 0, reason: "alreadyReceived" };
  }
  const quests = normalizeQuestState(character.quests);
  const eligible = Boolean(
    quests.active[RED_DOOR_INVESTIGATION_QUEST_ID]
    || quests.completedQuestIds.includes(RED_DOOR_INVESTIGATION_QUEST_ID)
  );
  if (!eligible) return { character, accepted: false, gained: 0, reason: "notEligible" };
  const reward = grantCard(character.cards, RED_DOOR_DEFENSE_CARD_ID, 1, character.deckCost);
  return {
    character: {
      ...character,
      cards: reward.cards,
      eventFlags: {
        ...(character.eventFlags || {}),
        [RED_DOOR_DEFENSE_CARD_FLAG]: true
      }
    },
    accepted: true,
    gained: reward.gained,
    reason: ""
  };
}

export function abandonQuest(character, questId) {
  const quests = normalizeQuestState(character?.quests);
  if (!quests.active[questId]) return result(character, false, "notActive");
  delete quests.active[questId];
  return result({ ...character, quests }, true);
}

export function recordEnemyDefeat(character, enemyId, depth = null) {
  const quests = normalizeQuestState(character?.quests);
  let eventFlags = character?.eventFlags || {};
  let updated = false;
  if (enemyId === "maikaefer") {
    eventFlags = {
      ...eventFlags,
      maikaefer_defeat_count: Math.max(0, Math.floor(Number(eventFlags.maikaefer_defeat_count) || 0)) + 1
    };
    updated = true;
  }
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatEnemy" || quest.targetId !== enemyId) return;
    if (depth != null && quest.targetDepth != null && Number(depth) !== Number(quest.targetDepth)) return;
    if (entry.progress >= quest.requiredCount) return;
    entry.progress = Math.min(quest.requiredCount, entry.progress + 1);
    updated = true;
  });
  return updated ? { ...character, quests, eventFlags } : character;
}

export function getActiveDefeatQuestProgress(character) {
  const quests = normalizeQuestState(character?.quests);
  return Object.keys(quests.active).flatMap(questId => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatEnemy") return [];
    const progress = getQuestProgress(character, questId).progress;
    return [{
      questId,
      targetName: quest.targetName || quest.title,
      progress,
      requiredCount: quest.requiredCount
    }];
  });
}

export function formatDefeatQuestProgressUpdates(beforeEntries, afterEntries) {
  const beforeById = new Map((beforeEntries || []).map(entry => [entry.questId, entry]));
  return (afterEntries || []).flatMap(entry => {
    const before = beforeById.get(entry.questId);
    if (!before || entry.progress <= before.progress) return [];
    const width = String(entry.requiredCount).length;
    return [`${entry.targetName}討伐${String(entry.progress).padStart(width, "0")}/${entry.requiredCount}`];
  });
}

export function recordBossDefeat(character, bossId, depth = null) {
  const quests = normalizeQuestState(character?.quests);
  let eventFlags = character?.eventFlags || {};
  let updated = false;
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "defeatBoss" || quest.targetId !== bossId) return;
    if (depth != null && quest.targetDepth != null && Number(depth) !== Number(quest.targetDepth)) return;
    if (quest.progressMode === "matchedFlags" && countMatchedProgressFlags(character, THIEVES_CLUE_FLAGS) < 3) return;
    if (entry.progress < quest.requiredCount) {
      entry.progress = quest.requiredCount;
      updated = true;
    }
    if (quest.persistentProgressFlag && !eventFlags[quest.persistentProgressFlag]) {
      eventFlags = { ...eventFlags, [quest.persistentProgressFlag]: true };
      updated = true;
    }
  });
  return updated ? { ...character, quests, eventFlags } : character;
}

export function recordThievesClue(character, flag) {
  if (!THIEVES_CLUE_FLAGS.includes(flag)) return character;
  const progress = getQuestProgress(character, THIEVES_HIDEOUT_QUEST_ID);
  if (!progress.active || progress.completed || character?.eventFlags?.[flag]) return character;
  const next = { ...character, eventFlags: { ...(character.eventFlags || {}), [flag]: true } };
  const quests = normalizeQuestState(next.quests);
  quests.active[THIEVES_HIDEOUT_QUEST_ID].progress = countMatchedProgressFlags(next, THIEVES_CLUE_FLAGS);
  return { ...next, quests };
}

export function recordFloorExploration(character, { depth, explored } = {}) {
  const quests = normalizeQuestState(character?.quests);
  const exploredCount = Array.isArray(explored)
    ? explored.reduce((total, row) => total + (Array.isArray(row) ? row.filter(Boolean).length : 0), 0)
    : 0;
  let updated = false;
  Object.entries(quests.active).forEach(([questId, entry]) => {
    const quest = getQuestById(questId);
    if (quest?.objectiveType !== "exploreFloor" || entry.progress >= quest.requiredCount) return;
    const progress = Number(depth) === quest.targetDepth
      ? Math.min(quest.requiredCount, exploredCount)
      : 0;
    if (entry.progress === progress) return;
    entry.progress = progress;
    updated = true;
  });
  const b1Completed = Number(depth) === 1
    && exploredCount >= 100
    && Boolean(quests.active[FLOOR_SURVEY_QUEST_ID]);
  if (b1Completed && !character?.eventFlags?.achievement_b1f_100_cells) {
    return {
      ...character,
      quests,
      eventFlags: { ...(character.eventFlags || {}), achievement_b1f_100_cells: true }
    };
  }
  const b35Completed = Number(depth) === 35
    && exploredCount >= 100
    && Boolean(quests.active[B35F_SURVEY_QUEST_ID]);
  if (b35Completed && !character?.eventFlags?.achievement_b35f_100_cells) {
    return {
      ...character,
      quests,
      eventFlags: { ...(character.eventFlags || {}), achievement_b35f_100_cells: true }
    };
  }
  const b45Completed = Number(depth) === 45
    && exploredCount >= 100
    && Boolean(quests.active[B45F_SURVEY_QUEST_ID]);
  if (b45Completed && !character?.eventFlags?.achievement_b45f_100_cells) {
    return {
      ...character,
      quests,
      eventFlags: { ...(character.eventFlags || {}), achievement_b45f_100_cells: true }
    };
  }
  return updated ? { ...character, quests } : character;
}

export function recordCustomQuestProgress(character, questId, amount = 1) {
  const quest = getQuestById(questId);
  const quests = normalizeQuestState(character?.quests);
  const entry = quests.active[questId];
  if (!quest || quest.objectiveType !== "custom" || !entry) return character;
  entry.progress = Math.min(quest.requiredCount, entry.progress + Math.max(0, Math.floor(Number(amount) || 0)));
  return { ...character, quests };
}

export function recordQueenShadowEncounter(character, depth) {
  const normalizedDepth = Math.floor(Number(depth) || 0);
  const flag = ({
    10: QUEEN_SHADOW_PROGRESS_FLAGS[0],
    11: QUEEN_SHADOW_PROGRESS_FLAGS[1],
    12: QUEEN_SHADOW_PROGRESS_FLAGS[2],
    13: QUEEN_SHADOW_PROGRESS_FLAGS[3]
  })[normalizedDepth];
  const progress = getQuestProgress(character, QUEEN_SHADOW_QUEST_ID);
  if (!flag || !progress.active || progress.completed || character?.eventFlags?.[flag]) return character;
  if (normalizedDepth !== 10 + Math.min(4, progress.progress)) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [flag]: true }
  };
  return recordCustomQuestProgress(next, QUEEN_SHADOW_QUEST_ID, 1);
}

export function completeQueenShadowInvestigation(character) {
  const progress = getQuestProgress(character, QUEEN_SHADOW_QUEST_ID);
  const completionFlag = QUEEN_SHADOW_PROGRESS_FLAGS[4];
  if (!progress.active || progress.progress < 4 || character?.eventFlags?.[completionFlag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [completionFlag]: true }
  };
  return recordCustomQuestProgress(next, QUEEN_SHADOW_QUEST_ID, 1);
}

export function recordSecondQueenShadowEncounter(character, depth) {
  const normalizedDepth = Math.floor(Number(depth) || 0);
  const flag = normalizedDepth >= 60 && normalizedDepth <= 65
    ? SECOND_QUEEN_SHADOW_PROGRESS_FLAGS[normalizedDepth - 60]
    : null;
  const progress = getQuestProgress(character, SECOND_QUEEN_SHADOW_QUEST_ID);
  if (!flag || !progress.active || progress.completed || character?.eventFlags?.[flag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [flag]: true }
  };
  return recordCustomQuestProgress(next, SECOND_QUEEN_SHADOW_QUEST_ID, 1);
}

export function completeSecondQueenShadowInvestigation(character) {
  const progress = getQuestProgress(character, SECOND_QUEEN_SHADOW_QUEST_ID);
  const completionFlag = SECOND_QUEEN_SHADOW_PROGRESS_FLAGS[6];
  if (!progress.active || progress.progress < 6 || character?.eventFlags?.[completionFlag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [completionFlag]: true }
  };
  return recordCustomQuestProgress(next, SECOND_QUEEN_SHADOW_QUEST_ID, 1);
}

export function recordThirdQueenShadowEncounter(character, depth) {
  const normalizedDepth = Math.floor(Number(depth) || 0);
  const flag = normalizedDepth >= 90 && normalizedDepth <= 98
    ? THIRD_QUEEN_SHADOW_PROGRESS_FLAGS[normalizedDepth - 90]
    : null;
  const progress = getQuestProgress(character, THIRD_QUEEN_SHADOW_QUEST_ID);
  if (!flag || !progress.active || progress.completed || character?.eventFlags?.[flag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [flag]: true }
  };
  return recordCustomQuestProgress(next, THIRD_QUEEN_SHADOW_QUEST_ID, 1);
}

export function completeThirdQueenShadowInvestigation(character) {
  const progress = getQuestProgress(character, THIRD_QUEEN_SHADOW_QUEST_ID);
  const completionFlag = THIRD_QUEEN_SHADOW_PROGRESS_FLAGS[9];
  if (!progress.active || progress.progress < 9 || character?.eventFlags?.[completionFlag]) return character;
  const next = {
    ...character,
    eventFlags: { ...(character.eventFlags || {}), [completionFlag]: true }
  };
  return recordCustomQuestProgress(next, THIRD_QUEEN_SHADOW_QUEST_ID, 1);
}

export function hasCompleteQueenRegalia(character) {
  return ["queen_tiara", "queen_earring", "queen_necklace"]
    .every(keyItemId => hasKeyItem(character?.keyItems, keyItemId));
}

export function reportQuest(character, questId) {
  const progress = getQuestProgress(character, questId);
  if (!progress.readyToReport) return result(character, false, "notReady");
  if (progress.quest.requiredKeyItemId
    && getKeyItemCount(character.keyItems, progress.quest.requiredKeyItemId) < progress.quest.requiredKeyItemCount) {
    return result(character, false, "notReady");
  }
  const quests = normalizeQuestState(character.quests);
  delete quests.active[questId];
  quests.completedQuestIds = [...new Set([...quests.completedQuestIds, questId])];
  let next = { ...character, quests };
  if (progress.quest.requiredKeyItemId) {
    const consumed = consumeKeyItem(
      next.keyItems,
      progress.quest.requiredKeyItemId,
      progress.quest.requiredKeyItemCount
    );
    if (!consumed.consumed) return result(character, false, "notReady");
    next = { ...next, keyItems: consumed.keyItems };
  }
  let rewardCardId = null;
  const rewardCardIds = [];
  let rewardEquipmentId = null;
  let rewardItemId = null;
  let rewardItemAmount = 0;
  const bonusGold = Math.max(0, Math.floor(Number(progress.quest.reward?.bonusGold) || 0));
  if (progress.quest.reward?.type === "card") {
    const reward = grantCard(
      character.cards,
      progress.quest.reward.cardId,
      Math.max(1, Math.floor(Number(progress.quest.reward.amount) || 1)),
      character.deckCost
    );
    next = { ...next, cards: reward.cards };
    if (reward.gained > 0) rewardCardId = progress.quest.reward.cardId;
  }
  if (progress.quest.reward?.type === "cards") {
    for (const cardId of progress.quest.reward.cardIds || []) {
      const reward = grantCard(next.cards, cardId, 1, next.deckCost);
      next = { ...next, cards: reward.cards };
      if (reward.gained > 0) rewardCardIds.push(cardId);
    }
  }
  if (progress.quest.reward?.type === "equipment" && progress.quest.reward.equipmentId) {
    const reward = grantEquipmentInstance(
      next,
      progress.quest.reward.equipmentId,
      progress.quest.reward.slot || "rightArmId"
    );
    if (reward.accepted) {
      next = reward.character;
      rewardEquipmentId = progress.quest.reward.equipmentId;
    }
  }
  if (progress.quest.reward?.type === "item" && progress.quest.reward.itemId) {
    const amount = Math.max(1, Math.floor(Number(progress.quest.reward.amount) || 1));
    const reward = grantItemWithOverflow(next, progress.quest.reward.itemId, amount);
    next = reward.character;
    rewardItemId = progress.quest.reward.itemId;
    rewardItemAmount = reward.gained + reward.stored;
  }
  if (bonusGold > 0) {
    next = {
      ...next,
      gold: Math.max(0, Math.floor(Number(character.gold) || 0)) + bonusGold
    };
  }
  if (progress.quest.reportUnlockFlag) {
    next = { ...next, eventFlags: { ...(next.eventFlags || {}), [progress.quest.reportUnlockFlag]: true } };
  }
  if (Array.isArray(progress.quest.reportUnlockFlags)) {
    next = {
      ...next,
      eventFlags: {
        ...(next.eventFlags || {}),
        ...Object.fromEntries(progress.quest.reportUnlockFlags.map(flag => [flag, true]))
      }
    };
  }
  return {
    character: next,
    accepted: true,
    rewardCardId,
    rewardCardIds,
    rewardEquipmentId,
    rewardItemId,
    rewardItemAmount,
    presentationOrder: progress.quest.reward?.presentationOrder || "",
    reportMessage: progress.quest.reportMessage || "",
    bonusGold
  };
}

export function hasActiveQuest(character) {
  return Object.keys(normalizeQuestState(character?.quests).active).length > 0;
}

export function getQuestHistory(character) {
  return QUESTS
    .map(quest => ({ quest, progress: getQuestProgress(character, quest.id) }))
    .filter(entry => entry.progress.active || entry.progress.completed)
    .sort((left, right) => {
      const rank = entry => entry.progress.readyToReport ? 0 : entry.progress.active ? 1 : 2;
      return rank(left) - rank(right) || Number(left.quest.number || 0) - Number(right.quest.number || 0);
    });
}

export function isDungeonDepthUnlocked(character, depth) {
  const requestedDepth = Math.max(1, Math.floor(Number(depth) || 1));
  if (requestedDepth === 2) {
    return B2F_UNLOCK_QUEST_IDS.every(questId => getQuestProgress(character, questId).completed);
  }
  if (requestedDepth === 20) {
    return Boolean(character?.eventFlags?.boss_fallen_mage_b19f_defeated);
  }
  if (requestedDepth === 30) {
    return Boolean(character?.eventFlags?.boss_iron_maiden_b29f_defeated);
  }
  if (requestedDepth === 40) {
    return Boolean(character?.eventFlags?.boss_wicker_man_b39f_defeated);
  }
  if (requestedDepth === 50) {
    return Boolean(character?.eventFlags?.boss_eiskoenigin_b49f_defeated);
  }
  if (requestedDepth === 60) {
    return Boolean(character?.eventFlags?.boss_fleischfresser_b59f_defeated);
  }
  if (requestedDepth === 70) {
    return Boolean(character?.eventFlags?.boss_b69f_defeated);
  }
  if (requestedDepth === 80) {
    return Boolean(character?.eventFlags?.boss_jirene_b79f_defeated);
  }
  if (requestedDepth === 90) {
    return Boolean(character?.eventFlags?.boss_b89f_defeated);
  }
  if (requestedDepth === 100) {
    return Boolean(character?.eventFlags?.boss_b99f_defeated) && hasCompleteQueenRegalia(character);
  }
  return true;
}

export function shouldForceEnemy(character, { depth, enemyId } = {}) {
  return getForcedEnemyId(character, { depth }) === enemyId;
}

export function getForcedEnemyId(character, { depth } = {}) {
  const requestedDepth = Number(depth);
  const quests = normalizeQuestState(character?.quests);
  const activeQuestIds = Object.keys(quests.active).sort((left, right) => (
    Number(getQuestById(right)?.forcePriority || 0) - Number(getQuestById(left)?.forcePriority || 0)
  ));
  for (const questId of activeQuestIds) {
    const quest = getQuestById(questId);
    if (!quest?.forceTargetEnemy || Number(quest.targetDepth) !== requestedDepth) continue;
    const progress = getQuestProgress(character, questId);
    if (progress.active && !progress.readyToReport) return quest.targetId || null;
  }
  return null;
}

function result(character, accepted, reason = "") {
  return { character, accepted, reason };
}

function countSequentialProgressFlags(character, flags) {
  let count = 0;
  for (const flag of flags) {
    if (!character?.eventFlags?.[flag]) break;
    count += 1;
  }
  return count;
}

export function countMatchedProgressFlags(character, flags = []) {
  return flags.reduce((total, flag) => total + (character?.eventFlags?.[flag] ? 1 : 0), 0);
}
