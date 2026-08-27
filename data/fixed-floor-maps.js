const B100_WALLS = "0,-1,N|0,0,W|0,1,W|0,2,W|0,2,N|1,2,W|1,0,N|2,0,W|1,-1,N|1,1,W|4,7,N|4,7,W|5,7,W|3,6,N|3,6,W|5,6,N|6,6,W|3,5,W|3,4,N|6,5,W|5,4,N|5,4,W|4,4,W|4,3,N|1,8,N|1,7,N|1,8,W|2,7,W|2,6,N|3,8,W|3,9,W|2,9,N|1,9,N|0,9,N|0,9,W|0,8,W|0,7,W|0,6,N|1,7,W|0,6,W|0,5,N|1,5,N|2,5,W|2,4,W|2,3,N|3,3,N|8,1,N|8,1,W|8,0,N|9,1,N|10,1,W|10,0,W|9,-1,N|8,-1,N|7,-1,N|7,0,W|7,1,W|7,2,W|7,2,N|8,3,W|8,3,N|9,3,W|10,2,W|3,7,N|9,3,N|10,3,W|2,0,N|3,0,N|4,0,N|5,0,N|6,2,N|5,2,N|5,2,W|5,1,W|6,2,W|5,3,W|2,1,W|2,1,N|3,2,W|3,3,W|4,3,W|4,2,W|1,2,N|1,3,N|1,5,W|0,5,W|0,4,W|0,3,W|6,7,W|6,8,W|6,9,W|5,9,N|4,9,N|3,9,N|5,8,W|4,8,W|6,5,N|7,5,W|7,4,N|8,4,W|7,4,W|6,4,W|7,6,W|7,7,W|7,8,W|7,8,N|8,8,N|9,8,W|9,7,W|9,6,W|8,5,N|8,5,W|8,4,N|6,9,N|7,9,N|8,9,N|9,9,N|10,8,W|10,9,W|10,7,W|10,6,W|10,5,W|10,4,W|8,7,N|8,6,N|2,-1,N|3,-1,N|4,-1,N|5,-1,N|6,-1,N";

const parseWalls = source => Object.freeze(source.split("|").map(entry => {
  const [x, y, side] = entry.split(",");
  return Object.freeze({ x: Number(x), y: Number(y), side });
}));

const point = (id, x, y, extra = {}) => Object.freeze({ id, x, y, ...extra });

export const B100_GAUNTLET_BOSS_IDS = Object.freeze([
  "strange_knight_statue_b9f",
  "fallen_mage_b19f",
  "iron_maiden_b29f",
  "wicker_man_b39f",
  "eiskoenigin_b49f",
  "fleischfresser_b59f",
  "sphinx_b69f",
  "jirene_b79f",
  "kriechendes_chaos_b89f",
  "seelenwuerger_b99f"
]);

export const B100_FIXED_FLOOR_MAP = Object.freeze({
  format: "NDA_FIXED_FLOOR_MAP",
  version: 3,
  coordinateOrigin: "bottom-left",
  floor: 100,
  width: 10,
  height: 10,
  walls: parseWalls(B100_WALLS),
  warps: Object.freeze([
    point("E005", 0, 2, { warpId: "W01", to: Object.freeze({ x: 8, y: 1 }), facing: "E", oneWay: true }),
    point("E009", 9, 3, { warpId: "W02", to: Object.freeze({ x: 0, y: 7 }), facing: "N", oneWay: true }),
    point("E012", 3, 7, { warpId: "W03", to: Object.freeze({ x: 2, y: 0 }), facing: "E", oneWay: true }),
    point("E015", 5, 2, { warpId: "W04", to: Object.freeze({ x: 8, y: 5 }), facing: "E", oneWay: true }),
    point("E018", 6, 6, { warpId: "W05", to: Object.freeze({ x: 3, y: 8 }), facing: "N", oneWay: true }),
    point("E021", 5, 7, { warpId: "W06", to: Object.freeze({ x: 7, y: 5 }), facing: "N", oneWay: true }),
    point("E025", 8, 8, { warpId: "W07", to: Object.freeze({ x: 0, y: 5 }), facing: "S", oneWay: true }),
    point("E028", 1, 1, { warpId: "W08", to: Object.freeze({ x: 6, y: 5 }), facing: "S", oneWay: true }),
    point("E031", 5, 4, { warpId: "W09", to: Object.freeze({ x: 4, y: 3 }), facing: "S", oneWay: true }),
    point("E034", 3, 3, { warpId: "W10", to: Object.freeze({ x: 0, y: 6 }), facing: "E", oneWay: true }),
    point("E037", 3, 4, { warpId: "W11", to: Object.freeze({ x: 4, y: 4 }), facing: "N", oneWay: true })
  ]),
  transferPortals: Object.freeze([point("E004", 0, 0)]),
  returnPortalFacing: "W",
  returnPortals: Object.freeze([
    point("E008", 8, 3), point("E011", 1, 8), point("E014", 6, 2),
    point("E016", 8, 4), point("E019", 4, 8), point("E023", 8, 6),
    point("E026", 1, 5), point("E029", 7, 4), point("E032", 2, 1),
    point("E035", 1, 7), point("E039", 4, 7)
  ]),
  returnPoints: Object.freeze([point("E007", 1, 0)]),
  events: Object.freeze([
    point("E043", 0, 1, { name: "女王の影1", eventKey: "queen_shadow_warning_1", description: "「この先では、これまであなたが戦ってきた守護者たちの幻影が待ち受けています。\nたとえ倒してもひとたび戻ってしまうと、再びあなたの前に立ち塞がるでしょう。\nどうか、お気を付けて…。」", fadeOut: true }),
    point("E044", 2, 6, { name: "女王の影2", eventKey: "queen_shadow_warning_2", description: "「ここから先に進むと引き返すことは出来ません…。その覚悟は、おありですか…？」", fadeOut: true })
  ]),
  healingFountains: Object.freeze([point("E040", 8, 7, { name: "癒やしの噴水" })]),
  bosses: Object.freeze([
    point("E006", 9, 2, { bossId: "strange_knight_statue_b9f" }),
    point("E010", 2, 7, { bossId: "fallen_mage_b19f" }),
    point("E013", 5, 1, { bossId: "iron_maiden_b29f" }),
    point("E017", 6, 7, { bossId: "wicker_man_b39f" }),
    point("E020", 5, 8, { bossId: "eiskoenigin_b49f" }),
    point("E024", 7, 8, { bossId: "fleischfresser_b59f" }),
    point("E027", 1, 2, { bossId: "sphinx_b69f" }),
    point("E030", 5, 3, { bossId: "jirene_b79f" }),
    point("E033", 3, 2, { bossId: "kriechendes_chaos_b89f" }),
    point("E036", 2, 4, { bossId: "seelenwuerger_b99f" })
  ]),
  finalBoss: point("E038", 4, 6, { name: "エルツデモーニン", bossId: "erzdaemonin_b100f" }),
  cellNotes: Object.freeze([
    point("note_1", 1, 6, { note: "ここにメッセージ置きたい" }),
    point("note_2", 8, 7, { note: "ここに癒やしの噴水設置" })
  ])
});

export function getB100GauntletFlag(bossId) {
  return `b100_gauntlet_${String(bossId || "")}_defeated`;
}

export function areB100GauntletBossesDefeated(eventFlags = {}) {
  return B100_GAUNTLET_BOSS_IDS.every(bossId => Boolean(eventFlags[getB100GauntletFlag(bossId)]));
}
