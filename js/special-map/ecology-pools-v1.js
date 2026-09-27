// Candidate revision 1: reviewed explicit allowlist, NOT an approved/frozen ecology V1.
// Snapshot of normal encounter sources; never derived from live tables at runtime.
// Derivation and exclusions: docs/special-maps-phase3c1.md.
const pools = {
  "slate": [
    {
      "monsterId": "abyss_rat",
      "baseWeight": 164167
    },
    {
      "monsterId": "cave_slime",
      "baseWeight": 164167
    },
    {
      "monsterId": "bouncing_coin",
      "baseWeight": 85992
    },
    {
      "monsterId": "abyss_rabbit",
      "baseWeight": 127685
    },
    {
      "monsterId": "wandering_dead",
      "baseWeight": 127685
    },
    {
      "monsterId": "poison_slime",
      "baseWeight": 127685
    },
    {
      "monsterId": "vampire_bat",
      "baseWeight": 109444
    },
    {
      "monsterId": "viper",
      "baseWeight": 78175
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "magic": [
    {
      "monsterId": "junghexe",
      "baseWeight": 127620
    },
    {
      "monsterId": "merseburg_spell",
      "baseWeight": 290810
    },
    {
      "monsterId": "geistflamme",
      "baseWeight": 263448
    },
    {
      "monsterId": "tanzlichter",
      "baseWeight": 303122
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "torture": [
    {
      "monsterId": "morgenstern",
      "baseWeight": 488782
    },
    {
      "monsterId": "inquisitorin",
      "baseWeight": 261237
    },
    {
      "monsterId": "folterzange",
      "baseWeight": 174304
    },
    {
      "monsterId": "folterpanzer",
      "baseWeight": 60677
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "red": [
    {
      "monsterId": "fire_spirit",
      "baseWeight": 492500
    },
    {
      "monsterId": "fire_lizard",
      "baseWeight": 295500
    },
    {
      "monsterId": "loren_lava",
      "baseWeight": 147750
    },
    {
      "monsterId": "cassowary",
      "baseWeight": 49250
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "blue": [
    {
      "monsterId": "ice_spirit",
      "baseWeight": 492500
    },
    {
      "monsterId": "ice_lizard",
      "baseWeight": 295500
    },
    {
      "monsterId": "ice_vogel",
      "baseWeight": 147750
    },
    {
      "monsterId": "ice_bear",
      "baseWeight": 49250
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "green": [
    {
      "monsterId": "abyss_tiger",
      "baseWeight": 328334
    },
    {
      "monsterId": "abyss_panther",
      "baseWeight": 328333
    },
    {
      "monsterId": "abyss_mushroom",
      "baseWeight": 328333
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "yellow": [
    {
      "monsterId": "abyss_lizard",
      "baseWeight": 328334
    },
    {
      "monsterId": "abyss_giant_scorpion",
      "baseWeight": 328333
    },
    {
      "monsterId": "cobra_gator",
      "baseWeight": 328333
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "water": [
    {
      "monsterId": "abyss_piranha",
      "baseWeight": 623833
    },
    {
      "monsterId": "abgrund_krabbe",
      "baseWeight": 172375
    },
    {
      "monsterId": "abgrund_aal",
      "baseWeight": 123125
    },
    {
      "monsterId": "abyss_giant_catfish",
      "baseWeight": 65667
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "crystal": [
    {
      "monsterId": "abyss_crystal_beetle",
      "baseWeight": 477725
    },
    {
      "monsterId": "prism_moth",
      "baseWeight": 231475
    },
    {
      "monsterId": "amethyst_golem",
      "baseWeight": 177300
    },
    {
      "monsterId": "crystal_mimic",
      "baseWeight": 98500
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ],
  "black": [
    {
      "monsterId": "sensenmann",
      "baseWeight": 281429
    },
    {
      "monsterId": "wraith",
      "baseWeight": 140714
    },
    {
      "monsterId": "will_o_wisp",
      "baseWeight": 422143
    },
    {
      "monsterId": "schleipnir",
      "baseWeight": 140714
    },
    {
      "monsterId": "maikaefer",
      "baseWeight": 15000
    }
  ]
};
for(const entries of Object.values(pools)){for(const entry of entries)Object.freeze(entry);Object.freeze(entries);}
export const ECOLOGY_V1_POOLS=Object.freeze(pools);
