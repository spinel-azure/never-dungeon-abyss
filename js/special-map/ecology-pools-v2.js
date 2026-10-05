// V2 Ecology Candidate 1: explicit snapshot of ordinary encounter definitions.
// Native theme pools reviewed against region formations; guests are curated.
// maikaefer is the existing global rare encounter, not an event-only enemy.
// No combat stats are created or scaled by this metadata.
export const V2_ECOLOGY_CATALOG = Object.freeze(Object.fromEntries(Object.entries({
  "abyss_rat": {
    "id": "abyss_rat",
    "name": "奈落ネズミ",
    "level": 1,
    "minimumDepth": null,
    "maximumDepth": 10,
    "maxHp": 12,
    "attack": 4,
    "def": 4,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "cave_slime": {
    "id": "cave_slime",
    "name": "洞窟スライム",
    "level": 2,
    "minimumDepth": null,
    "maximumDepth": 10,
    "maxHp": 18,
    "attack": 3,
    "def": 5,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "bouncing_coin": {
    "id": "bouncing_coin",
    "name": "跳ねるコイン",
    "level": 1,
    "minimumDepth": 1,
    "maximumDepth": 4,
    "maxHp": 10,
    "attack": 1,
    "def": 0,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_rabbit": {
    "id": "abyss_rabbit",
    "name": "奈落ウサギ",
    "level": 3,
    "minimumDepth": 2,
    "maximumDepth": 10,
    "maxHp": 21,
    "attack": 5,
    "def": 3,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "wandering_dead": {
    "id": "wandering_dead",
    "name": "さまよう亡者",
    "level": 4,
    "minimumDepth": 2,
    "maximumDepth": 10,
    "maxHp": 36,
    "attack": 6,
    "def": 6,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "poison_slime": {
    "id": "poison_slime",
    "name": "ポイズンスライム",
    "level": 3,
    "minimumDepth": 2,
    "maximumDepth": 10,
    "maxHp": 32,
    "attack": 4,
    "def": 6,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "vampire_bat": {
    "id": "vampire_bat",
    "name": "吸血コウモリ",
    "level": 5,
    "minimumDepth": 3,
    "maximumDepth": 10,
    "maxHp": 30,
    "attack": 5,
    "def": 4,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "viper": {
    "id": "viper",
    "name": "ヴァイパー",
    "level": 7,
    "minimumDepth": 5,
    "maximumDepth": 10,
    "maxHp": 42,
    "attack": 7,
    "def": 5,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "giant_spider": {
    "id": "giant_spider",
    "name": "ジャイアントスパイダー",
    "level": 12,
    "minimumDepth": 11,
    "maximumDepth": 19,
    "maxHp": 72,
    "attack": 10,
    "def": 8,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "folterpanzer": {
    "id": "folterpanzer",
    "name": "フォルターパンツァー",
    "level": 28,
    "minimumDepth": 25,
    "maximumDepth": 29,
    "maxHp": 280,
    "attack": 20,
    "def": 22,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_giant_scorpion": {
    "id": "abyss_giant_scorpion",
    "name": "奈落オオサソリ",
    "level": 62,
    "minimumDepth": 60,
    "maximumDepth": 69,
    "maxHp": 480,
    "attack": 31,
    "def": 31,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abgrund_krabbe": {
    "id": "abgrund_krabbe",
    "name": "アプグルントクラッベ",
    "level": 71,
    "minimumDepth": 72,
    "maximumDepth": 79,
    "maxHp": 650,
    "attack": 39,
    "def": 48,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "amethyst_golem": {
    "id": "amethyst_golem",
    "name": "アメジストゴーレム",
    "level": 84,
    "minimumDepth": 84,
    "maximumDepth": 89,
    "maxHp": 1100,
    "attack": 50,
    "def": 55,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "maikaefer": {
    "id": "maikaefer",
    "name": "マイケーファー",
    "level": 1,
    "minimumDepth": null,
    "maximumDepth": null,
    "maxHp": 8,
    "attack": 1,
    "def": 60,
    "baseWeight": 9,
    "mapExclusive": false
  },
  "junghexe": {
    "id": "junghexe",
    "name": "ユングヘクセ",
    "level": 14,
    "minimumDepth": 10,
    "maximumDepth": 19,
    "maxHp": 100,
    "attack": 9,
    "def": 9,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "merseburg_spell": {
    "id": "merseburg_spell",
    "name": "メルゼブルクの呪文",
    "level": 11,
    "minimumDepth": 10,
    "maximumDepth": 19,
    "maxHp": 38,
    "attack": 6,
    "def": 6,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "geistflamme": {
    "id": "geistflamme",
    "name": "ガイストフラメ",
    "level": 13,
    "minimumDepth": 10,
    "maximumDepth": 19,
    "maxHp": 44,
    "attack": 7,
    "def": 6,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "tanzlichter": {
    "id": "tanzlichter",
    "name": "タンツロイヒター",
    "level": 10,
    "minimumDepth": 10,
    "maximumDepth": 19,
    "maxHp": 32,
    "attack": 6,
    "def": 5,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "banshee": {
    "id": "banshee",
    "name": "バンシー",
    "level": 20,
    "minimumDepth": 19,
    "maximumDepth": 19,
    "maxHp": 128,
    "attack": 14,
    "def": 12,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "ice_spirit": {
    "id": "ice_spirit",
    "name": "氷の精霊",
    "level": 32,
    "minimumDepth": 40,
    "maximumDepth": 49,
    "maxHp": 230,
    "attack": 17,
    "def": 16,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "will_o_wisp": {
    "id": "will_o_wisp",
    "name": "ウィルオーウィスプ",
    "level": 88,
    "minimumDepth": 90,
    "maximumDepth": 99,
    "maxHp": 420,
    "attack": 18,
    "def": 22,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "prism_moth": {
    "id": "prism_moth",
    "name": "プリズムモス",
    "level": 80,
    "minimumDepth": 82,
    "maximumDepth": 89,
    "maxHp": 420,
    "attack": 23,
    "def": 24,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "wraith": {
    "id": "wraith",
    "name": "レイス",
    "level": 93,
    "minimumDepth": 90,
    "maximumDepth": 99,
    "maxHp": 1050,
    "attack": 38,
    "def": 36,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "morgenstern": {
    "id": "morgenstern",
    "name": "モルゲンシュテルン",
    "level": 18,
    "minimumDepth": 20,
    "maximumDepth": 29,
    "maxHp": 75,
    "attack": 11,
    "def": 11,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "inquisitorin": {
    "id": "inquisitorin",
    "name": "インクイジトーリン",
    "level": 20,
    "minimumDepth": 20,
    "maximumDepth": 29,
    "maxHp": 110,
    "attack": 13,
    "def": 13,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "folterzange": {
    "id": "folterzange",
    "name": "フォルターツァンゲ",
    "level": 23,
    "minimumDepth": 22,
    "maximumDepth": 29,
    "maxHp": 160,
    "attack": 16,
    "def": 16,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "sensenmann": {
    "id": "sensenmann",
    "name": "ゼンゼンマン",
    "level": 90,
    "minimumDepth": 90,
    "maximumDepth": 99,
    "maxHp": 700,
    "attack": 45,
    "def": 38,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "fire_spirit": {
    "id": "fire_spirit",
    "name": "火の精霊",
    "level": 23,
    "minimumDepth": 30,
    "maximumDepth": 39,
    "maxHp": 145,
    "attack": 13,
    "def": 12,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "fire_lizard": {
    "id": "fire_lizard",
    "name": "火トカゲ",
    "level": 25,
    "minimumDepth": 32,
    "maximumDepth": 39,
    "maxHp": 178,
    "attack": 16,
    "def": 14,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "loren_lava": {
    "id": "loren_lava",
    "name": "ロレンラヴァ",
    "level": 27,
    "minimumDepth": 35,
    "maximumDepth": 39,
    "maxHp": 225,
    "attack": 18,
    "def": 18,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "cassowary": {
    "id": "cassowary",
    "name": "ヒクイドリ",
    "level": 29,
    "minimumDepth": 38,
    "maximumDepth": 39,
    "maxHp": 205,
    "attack": 18,
    "def": 15,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_lizard": {
    "id": "abyss_lizard",
    "name": "奈落トカゲ",
    "level": 58,
    "minimumDepth": 60,
    "maximumDepth": 69,
    "maxHp": 240,
    "attack": 20,
    "def": 22,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "ice_lizard": {
    "id": "ice_lizard",
    "name": "氷トカゲ",
    "level": 34,
    "minimumDepth": 42,
    "maximumDepth": 49,
    "maxHp": 275,
    "attack": 20,
    "def": 18,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "ice_vogel": {
    "id": "ice_vogel",
    "name": "アイスフォーゲル",
    "level": 37,
    "minimumDepth": 45,
    "maximumDepth": 49,
    "maxHp": 260,
    "attack": 20,
    "def": 17,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "ice_bear": {
    "id": "ice_bear",
    "name": "氷熊",
    "level": 40,
    "minimumDepth": 48,
    "maximumDepth": 49,
    "maxHp": 360,
    "attack": 23,
    "def": 22,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_tiger": {
    "id": "abyss_tiger",
    "name": "奈落ティーガー",
    "level": 43,
    "minimumDepth": 50,
    "maximumDepth": 59,
    "maxHp": 430,
    "attack": 27,
    "def": 23,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_panther": {
    "id": "abyss_panther",
    "name": "奈落パンター",
    "level": 43,
    "minimumDepth": 50,
    "maximumDepth": 59,
    "maxHp": 340,
    "attack": 24,
    "def": 20,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_mushroom": {
    "id": "abyss_mushroom",
    "name": "奈落キノコ",
    "level": 42,
    "minimumDepth": 50,
    "maximumDepth": 59,
    "maxHp": 365,
    "attack": 21,
    "def": 25,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "wasp": {
    "id": "wasp",
    "name": "ワスプ",
    "level": 15,
    "minimumDepth": 13,
    "maximumDepth": 19,
    "maxHp": 68,
    "attack": 10,
    "def": 8,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "poison_toad": {
    "id": "poison_toad",
    "name": "ポイズントード",
    "level": 18,
    "minimumDepth": 16,
    "maximumDepth": 19,
    "maxHp": 108,
    "attack": 13,
    "def": 11,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_crystal_beetle": {
    "id": "abyss_crystal_beetle",
    "name": "奈落水晶虫",
    "level": 78,
    "minimumDepth": 80,
    "maximumDepth": 89,
    "maxHp": 400,
    "attack": 31,
    "def": 43,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "schleipnir": {
    "id": "schleipnir",
    "name": "シュライプニール",
    "level": 96,
    "minimumDepth": 90,
    "maximumDepth": 99,
    "maxHp": 1500,
    "attack": 58,
    "def": 50,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "cobra_gator": {
    "id": "cobra_gator",
    "name": "コブラゲーター",
    "level": 64,
    "minimumDepth": 60,
    "maximumDepth": 69,
    "maxHp": 560,
    "attack": 34,
    "def": 29,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_piranha": {
    "id": "abyss_piranha",
    "name": "奈落ピラニア",
    "level": 68,
    "minimumDepth": 70,
    "maximumDepth": 79,
    "maxHp": 280,
    "attack": 25,
    "def": 24,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abgrund_aal": {
    "id": "abgrund_aal",
    "name": "アプグルントアール",
    "level": 72,
    "minimumDepth": 74,
    "maximumDepth": 79,
    "maxHp": 540,
    "attack": 33,
    "def": 31,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "abyss_giant_catfish": {
    "id": "abyss_giant_catfish",
    "name": "奈落オオナマズ",
    "level": 75,
    "minimumDepth": 76,
    "maximumDepth": 79,
    "maxHp": 850,
    "attack": 41,
    "def": 34,
    "baseWeight": 300,
    "mapExclusive": false
  },
  "crystal_mimic": {
    "id": "crystal_mimic",
    "name": "クリスタルミミック",
    "level": 85,
    "minimumDepth": 86,
    "maximumDepth": 89,
    "maxHp": 950,
    "attack": 44,
    "def": 38,
    "baseWeight": 300,
    "mapExclusive": false
  }
}).map(([id,row])=>[id,Object.freeze(row)])));
export const V2_ECOLOGY_POOLS = Object.freeze(Object.fromEntries(Object.entries({
  "slate": [
    {
      "id": "abyss_rat",
      "affinity": 6
    },
    {
      "id": "cave_slime",
      "affinity": 6
    },
    {
      "id": "bouncing_coin",
      "affinity": 6
    },
    {
      "id": "abyss_rabbit",
      "affinity": 6
    },
    {
      "id": "wandering_dead",
      "affinity": 6
    },
    {
      "id": "poison_slime",
      "affinity": 6
    },
    {
      "id": "vampire_bat",
      "affinity": 6
    },
    {
      "id": "viper",
      "affinity": 6
    },
    {
      "id": "giant_spider",
      "affinity": 2
    },
    {
      "id": "folterpanzer",
      "affinity": 2
    },
    {
      "id": "abyss_giant_scorpion",
      "affinity": 2
    },
    {
      "id": "abgrund_krabbe",
      "affinity": 2
    },
    {
      "id": "amethyst_golem",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "magic": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 3
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 3
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "junghexe",
      "affinity": 6
    },
    {
      "id": "merseburg_spell",
      "affinity": 6
    },
    {
      "id": "geistflamme",
      "affinity": 6
    },
    {
      "id": "tanzlichter",
      "affinity": 6
    },
    {
      "id": "banshee",
      "affinity": 2
    },
    {
      "id": "ice_spirit",
      "affinity": 2
    },
    {
      "id": "will_o_wisp",
      "affinity": 2
    },
    {
      "id": "prism_moth",
      "affinity": 2
    },
    {
      "id": "wraith",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "torture": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 3
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 3
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "morgenstern",
      "affinity": 6
    },
    {
      "id": "inquisitorin",
      "affinity": 6
    },
    {
      "id": "folterzange",
      "affinity": 6
    },
    {
      "id": "folterpanzer",
      "affinity": 6
    },
    {
      "id": "banshee",
      "affinity": 2
    },
    {
      "id": "sensenmann",
      "affinity": 2
    },
    {
      "id": "wraith",
      "affinity": 2
    },
    {
      "id": "amethyst_golem",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "red": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 3
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 3
    },
    {
      "id": "vampire_bat",
      "affinity": 1
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "fire_spirit",
      "affinity": 6
    },
    {
      "id": "fire_lizard",
      "affinity": 6
    },
    {
      "id": "loren_lava",
      "affinity": 6
    },
    {
      "id": "cassowary",
      "affinity": 6
    },
    {
      "id": "geistflamme",
      "affinity": 2
    },
    {
      "id": "morgenstern",
      "affinity": 2
    },
    {
      "id": "will_o_wisp",
      "affinity": 2
    },
    {
      "id": "abyss_lizard",
      "affinity": 2
    },
    {
      "id": "amethyst_golem",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "blue": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 3
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 3
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "ice_spirit",
      "affinity": 6
    },
    {
      "id": "ice_lizard",
      "affinity": 6
    },
    {
      "id": "ice_vogel",
      "affinity": 6
    },
    {
      "id": "ice_bear",
      "affinity": 6
    },
    {
      "id": "geistflamme",
      "affinity": 2
    },
    {
      "id": "banshee",
      "affinity": 2
    },
    {
      "id": "prism_moth",
      "affinity": 2
    },
    {
      "id": "wraith",
      "affinity": 2
    },
    {
      "id": "abgrund_krabbe",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "green": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 3
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 1
    },
    {
      "id": "viper",
      "affinity": 3
    },
    {
      "id": "abyss_tiger",
      "affinity": 6
    },
    {
      "id": "abyss_panther",
      "affinity": 6
    },
    {
      "id": "abyss_mushroom",
      "affinity": 6
    },
    {
      "id": "giant_spider",
      "affinity": 2
    },
    {
      "id": "wasp",
      "affinity": 2
    },
    {
      "id": "poison_toad",
      "affinity": 2
    },
    {
      "id": "abyss_giant_scorpion",
      "affinity": 2
    },
    {
      "id": "abyss_crystal_beetle",
      "affinity": 2
    },
    {
      "id": "schleipnir",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "yellow": [
    {
      "id": "abyss_rat",
      "affinity": 3
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 1
    },
    {
      "id": "viper",
      "affinity": 3
    },
    {
      "id": "abyss_lizard",
      "affinity": 6
    },
    {
      "id": "abyss_giant_scorpion",
      "affinity": 6
    },
    {
      "id": "cobra_gator",
      "affinity": 6
    },
    {
      "id": "giant_spider",
      "affinity": 2
    },
    {
      "id": "fire_lizard",
      "affinity": 2
    },
    {
      "id": "cassowary",
      "affinity": 2
    },
    {
      "id": "abyss_crystal_beetle",
      "affinity": 2
    },
    {
      "id": "amethyst_golem",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "water": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 3
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 3
    },
    {
      "id": "vampire_bat",
      "affinity": 1
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "abyss_piranha",
      "affinity": 6
    },
    {
      "id": "abgrund_krabbe",
      "affinity": 6
    },
    {
      "id": "abgrund_aal",
      "affinity": 6
    },
    {
      "id": "abyss_giant_catfish",
      "affinity": 6
    },
    {
      "id": "poison_toad",
      "affinity": 2
    },
    {
      "id": "ice_lizard",
      "affinity": 2
    },
    {
      "id": "cobra_gator",
      "affinity": 2
    },
    {
      "id": "wraith",
      "affinity": 2
    },
    {
      "id": "abyss_crystal_beetle",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "crystal": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 3
    },
    {
      "id": "bouncing_coin",
      "affinity": 3
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 1
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 1
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "abyss_crystal_beetle",
      "affinity": 6
    },
    {
      "id": "prism_moth",
      "affinity": 6
    },
    {
      "id": "amethyst_golem",
      "affinity": 6
    },
    {
      "id": "crystal_mimic",
      "affinity": 6
    },
    {
      "id": "geistflamme",
      "affinity": 2
    },
    {
      "id": "merseburg_spell",
      "affinity": 2
    },
    {
      "id": "folterpanzer",
      "affinity": 2
    },
    {
      "id": "ice_spirit",
      "affinity": 2
    },
    {
      "id": "abgrund_krabbe",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ],
  "black": [
    {
      "id": "abyss_rat",
      "affinity": 1
    },
    {
      "id": "cave_slime",
      "affinity": 1
    },
    {
      "id": "bouncing_coin",
      "affinity": 1
    },
    {
      "id": "abyss_rabbit",
      "affinity": 1
    },
    {
      "id": "wandering_dead",
      "affinity": 3
    },
    {
      "id": "poison_slime",
      "affinity": 1
    },
    {
      "id": "vampire_bat",
      "affinity": 3
    },
    {
      "id": "viper",
      "affinity": 1
    },
    {
      "id": "sensenmann",
      "affinity": 6
    },
    {
      "id": "wraith",
      "affinity": 6
    },
    {
      "id": "will_o_wisp",
      "affinity": 6
    },
    {
      "id": "schleipnir",
      "affinity": 6
    },
    {
      "id": "banshee",
      "affinity": 2
    },
    {
      "id": "geistflamme",
      "affinity": 2
    },
    {
      "id": "inquisitorin",
      "affinity": 2
    },
    {
      "id": "ice_spirit",
      "affinity": 2
    },
    {
      "id": "prism_moth",
      "affinity": 2
    },
    {
      "id": "maikaefer",
      "affinity": 1
    }
  ]
}).map(([theme,rows])=>[theme,Object.freeze(rows.map(Object.freeze))])));
