import {streamV1, chooseIndexV1, hash32V1} from './random-v1.js';

// V2 structural candidate 1. Deliberately not connected to issuance, saves or gameplay.
// Reuse the frozen integer PRNG, never the single-floor V1 generator/dispatcher.
export const SPECIAL_DUNGEON_V2 = 'special-map-v2';
export const V2_STRUCTURE_REVISION = 'v2-structure-candidate-1';
export const V2_SIZE = 10;
export const V2_FLOOR_COUNT = 3;
export const V2_EXTRA_PASSAGES = 14;
export const V2_THEMES = Object.freeze(['slate', 'magic', 'torture', 'red', 'blue', 'green', 'yellow', 'water', 'crystal', 'black']);
export const V2_RARITIES = Object.freeze(['WHITE', 'SILVER', 'GOLD']);
const DIRECTIONS = ['N', 'E', 'S', 'W'];
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const point = index => ({x: index % 10, y: Math.floor(index / 10)});
function neighbor(index, direction) {
  const {x, y} = point(index), nx = x + DX[direction], ny = y + DY[direction];
  return nx < 0 || nx >= 10 || ny < 0 || ny >= 10 ? -1 : ny * 10 + nx;
}
function distances(walls, start) {
  const result = Array(100).fill(-1), queue = [start];
  result[start] = 0;
  for (const cell of queue) for (let d = 0; d < 4; d++) {
    if (walls[cell][d]) continue;
    const next = neighbor(cell, d);
    if (next < 0) throw Error('V2 boundary breach');
    if (result[next] < 0) {result[next] = result[cell] + 1; queue.push(next);}
  }
  return result;
}
function open(walls, cell, direction) {
  const next = neighbor(cell, direction);
  if (next < 0) throw Error('V2 cannot open exterior boundary');
  walls[cell][direction] = false;
  walls[next][(direction + 2) % 4] = false;
}

// Finite, seed-independent geometry candidates. The remaining 97 cells must form
// a connected grid before carving; no random retries or repairs are necessary.
function roomCandidates() {
  const result = [];
  for (let first = 0; first < 100; first++) for (let d = 0; d < 4; d++) {
    const approach = neighbor(first, (d + 2) % 4), second = neighbor(first, d);
    const third = second < 0 ? -1 : neighbor(second, d);
    if (approach < 0 || third < 0) continue;
    const cells = [first, second, third], reserved = new Set(cells);
    const reached = new Set([approach]), queue = [approach];
    for (const cell of queue) for (let side = 0; side < 4; side++) {
      const next = neighbor(cell, side);
      if (next >= 0 && !reserved.has(next) && !reached.has(next)) {reached.add(next); queue.push(next);}
    }
    if (reached.size === 97) result.push({cells, approach, direction: d});
  }
  return result;
}
const ROOMS = roomCandidates(); // Private templates; never returned or mutated.

function carveFloor(next, room) {
  const walls = Array.from({length: 100}, () => [true, true, true, true]);
  const reserved = new Set(room?.cells ?? []);
  const start = walls.findIndex((_, i) => !reserved.has(i));
  const visited = new Set([start]), stack = [start];
  while (stack.length) {
    const cell = stack.at(-1), candidates = [];
    for (let d = 0; d < 4; d++) {
      const target = neighbor(cell, d);
      if (target >= 0 && !reserved.has(target) && !visited.has(target)) candidates.push([d, target]);
    }
    if (!candidates.length) {stack.pop(); continue;}
    const [direction, target] = candidates[chooseIndexV1(next, candidates.length)];
    open(walls, cell, direction); visited.add(target); stack.push(target);
  }
  if (visited.size !== 100 - reserved.size) throw Error('V2 disconnected room exterior');
  const closed = [];
  for (let cell = 0; cell < 100; cell++) for (const d of [1, 2]) {
    const target = neighbor(cell, d);
    if (target >= 0 && !reserved.has(cell) && !reserved.has(target) && walls[cell][d]) closed.push([cell, d]);
  }
  if (closed.length < V2_EXTRA_PASSAGES) throw Error('V2 insufficient loop candidates');
  for (let k = 0; k < V2_EXTRA_PASSAGES; k++) {
    const [cell, direction] = closed.splice(chooseIndexV1(next, closed.length), 1)[0];
    open(walls, cell, direction);
  }
  if (room) {
    open(walls, room.approach, room.direction);
    open(walls, room.cells[0], room.direction);
    open(walls, room.cells[1], room.direction);
  }
  return walls;
}
function farthest(walls, start, forbidden, next) {
  const ds = distances(walls, start);
  if (ds.some(d => d < 0)) throw Error('V2 unreachable cell');
  let max = -1, candidates = [];
  ds.forEach((distance, index) => {
    if (forbidden.has(index)) return;
    if (distance > max) {max = distance; candidates = [index];}
    else if (distance === max) candidates.push(index);
  });
  return candidates.length === 1 ? candidates[0] : candidates[chooseIndexV1(next, candidates.length)];
}
function roomDescription(room) {
  // One canonical internal E/S edge, scoped to floor 3. This is a placement
  // reservation only: no lock, enemy, door animation or combat is implemented.
  let anchor = room.approach, direction = room.direction;
  if (direction === 0 || direction === 3) {anchor = room.cells[0]; direction = (direction + 2) % 4;}
  const p = point(anchor), dir = DIRECTIONS[direction];
  return {
    direction: DIRECTIONS[room.direction], cells: room.cells.map(point),
    approach: point(room.approach), bossCell: point(room.cells[2]),
    doorEdge: {...p, direction: dir, key: `floor-3:${p.x},${p.y},${dir}`},
  };
}
function generateFloor(seed, floor) {
  const stream = purpose => streamV1(SPECIAL_DUNGEON_V2, seed, `floor-${floor}-${purpose}`);
  const room = floor === 3 ? ROOMS[chooseIndexV1(stream('boss-room'), ROOMS.length)] : null;
  const walls = carveFloor(stream('topology'), room);
  let up, entranceSide = null, preferred = 2;
  if (room) {
    // Choose the up stair AFTER all loops are open: it is maximally distant
    // from the room on the final maze. Inter-floor links need no aligned XY.
    up = farthest(walls, room.approach, new Set(room.cells), stream('entrance'));
  } else {
    const perimeter = Array.from({length: 100}, (_, i) => i).filter(i => i < 10 || i >= 90 || i % 10 === 0 || i % 10 === 9);
    const next = stream('entrance');
    up = perimeter[chooseIndexV1(next, perimeter.length)];
    const {x, y} = point(up), sides = [];
    if (y === 0) sides.push(0); if (x === 9) sides.push(1);
    if (y === 9) sides.push(2); if (x === 0) sides.push(3);
    const side = sides[chooseIndexV1(next, sides.length)];
    entranceSide = DIRECTIONS[side]; preferred = (side + 2) % 4;
  }
  const down = floor < 3 ? farthest(walls, up, new Set([up]), stream('stairs')) : null;
  const facing = [preferred, 2, 1, 0, 3].find(d => !walls[up][d]);
  if (facing === undefined || distances(walls, up).some(d => d < 0)) throw Error('V2 invalid floor connectivity');
  return {
    floor, width: 10, height: 10, walls,
    stairsUp: point(up), stairsDown: down === null ? null : point(down),
    entranceSide, startDirection: DIRECTIONS[facing],
    themeId: V2_THEMES[chooseIndexV1(stream('theme'), V2_THEMES.length)],
    bossRoom: room ? roomDescription(room) : null,
  };
}

/** Fresh pure blueprint; V1 APIs intentionally remain single-floor only.
 * Level and rarity identify the V2 content, but do not affect structural RNG.
 * Future danger/ecology/boss layers must explicitly use these validated inputs.
 */
export function generateSpecialMapV2({ruleset, seed, level, rarity} = {}) {
  if (ruleset !== SPECIAL_DUNGEON_V2) throw new RangeError('Unsupported V2 ruleset');
  if (!Number.isInteger(seed) || seed < 0 || seed > 65535) throw new RangeError('seed must be an integer from 0 to 65535');
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new RangeError('level must be an integer from 1 to 100');
  if (!V2_RARITIES.includes(rarity)) throw new RangeError('Unsupported V2 rarity');
  const floors = [1, 2, 3].map(floor => generateFloor(seed, floor));
  const links = [0, 1].map(i => ({
    upper: {floor: i + 1, ...floors[i].stairsDown},
    lower: {floor: i + 2, ...floors[i + 1].stairsUp},
  }));
  return {ruleset, seed, level, rarity, floorCount: 3, floors, links};
}

// Explicit ordered fields: stable across object key order; survey, runtime and
// future content layers are absent. Structural hashes intentionally omit Lv/color.
const xy = p => p === null ? null : [p.x, p.y];
export function canonicalV2Structure(map) {
  return JSON.stringify([map.ruleset, map.seed, map.floorCount, map.floors.map(f => [
    f.floor, f.width, f.height, f.walls, xy(f.stairsUp), xy(f.stairsDown),
    f.entranceSide, f.startDirection, f.themeId,
    f.bossRoom === null ? null : [f.bossRoom.direction, f.bossRoom.cells.map(xy),
      xy(f.bossRoom.approach), xy(f.bossRoom.bossCell), xy(f.bossRoom.doorEdge),
      f.bossRoom.doorEdge.direction, f.bossRoom.doorEdge.key],
  ]), map.links.map(l => [[l.upper.floor, l.upper.x, l.upper.y], [l.lower.floor, l.lower.x, l.lower.y]])]);
}
export function specialMapV2StructureFingerprint(map) {
  return hash32V1(canonicalV2Structure(map)).toString(16).padStart(8, '0');
}
export function specialMapV2Ascii(floor) {
  const rows = [];
  const at = (p, x, y) => p && p.x === x && p.y === y;
  for (let y = 0; y < 10; y++) {
    let top = '+', middle = '|';
    for (let x = 0; x < 10; x++) {
      const walls = floor.walls[y * 10 + x];
      const marker = at(floor.stairsUp, x, y) ? 'U' : at(floor.stairsDown, x, y) ? 'D'
        : at(floor.bossRoom?.bossCell, x, y) ? 'B' : floor.bossRoom?.cells.some(p => at(p, x, y)) ? 'r' : ' ';
      top += (walls[0] ? '---' : '   ') + '+';
      middle += ` ${marker} ` + (walls[1] ? '|' : ' ');
    }
    rows.push(top, middle);
  }
  rows.push('+---'.repeat(10) + '+');
  return rows.join('\n');
}
