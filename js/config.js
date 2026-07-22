export const TAU = Math.PI * 2;
export const FOV = Math.PI / 3.08;
export const RAYS = 260;
export const MAX_DIST = 15;
export const MAP_W = 10;
export const MAP_H = 10;
export const STEP_MS = 170;
export const TURN_MS = 150;
export const EXTRA_OPENINGS = 14;
export const NORMAL_DOOR_COUNT = 6;
export const BOSS_DOOR_COUNT = 1;
export const LOCKED_DOOR_COUNT = 1;
export const START_X = 1;
export const START_Y = 1;

export const DIRS = [
  { key: "N", label: "N", angle: -Math.PI / 2, dx: 0, dy: -1, opposite: "S" },
  { key: "E", label: "E", angle: 0, dx: 1, dy: 0, opposite: "W" },
  { key: "S", label: "S", angle: Math.PI / 2, dx: 0, dy: 1, opposite: "N" },
  { key: "W", label: "W", angle: Math.PI, dx: -1, dy: 0, opposite: "E" }
];

export const DIR_BY_KEY = Object.fromEntries(DIRS.map(dir => [dir.key, dir]));
