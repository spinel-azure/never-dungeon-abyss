import assert from 'node:assert/strict';

// Independent graph validator: no generator traversal/carving helpers are used.
const dirs = ['N', 'E', 'S', 'W'];
const deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const themes = ['slate', 'magic', 'torture', 'red', 'blue', 'green', 'yellow', 'water', 'crystal', 'black'];
const index = p => p.y * 10 + p.x;
function inside(p) {
  assert.ok(p && Number.isInteger(p.x) && Number.isInteger(p.y));
  assert.ok(p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10);
}
export function graphDistances(graph, start) {
  const ds = Array(graph.length).fill(-1), queue = [start]; ds[start] = 0;
  for (const cell of queue) for (const next of graph[cell]) if (ds[next] < 0) {
    ds[next] = ds[cell] + 1; queue.push(next);
  }
  return ds;
}
export function checkV2Structure(map) {
  assert.equal(map.ruleset, 'special-map-v2');
  assert.ok(Number.isInteger(map.seed) && map.seed >= 0 && map.seed <= 65535);
  assert.ok(Number.isInteger(map.level) && map.level >= 1 && map.level <= 100);
  assert.ok(['WHITE', 'SILVER', 'GOLD'].includes(map.rarity));
  assert.equal(map.floorCount, 3); assert.equal(map.floors.length, 3);
  const all = Array.from({length: 300}, () => []), stairsDistances = [];
  let bossDistance, roomDirection;
  for (const [f, floor] of map.floors.entries()) {
    assert.equal(floor.floor, f + 1); assert.equal(floor.width, 10); assert.equal(floor.height, 10);
    assert.equal(floor.walls.length, 100); inside(floor.stairsUp);
    const graph = Array.from({length: 100}, () => []);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const cell = y * 10 + x, walls = floor.walls[cell]; assert.equal(walls.length, 4);
      for (let d = 0; d < 4; d++) {
        assert.equal(typeof walls[d], 'boolean');
        const nx = x + deltas[d][0], ny = y + deltas[d][1];
        if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) {assert.equal(walls[d], true); continue;}
        const next = ny * 10 + nx;
        assert.equal(walls[d], floor.walls[next][(d + 2) % 4]);
        if (!walls[d]) {graph[cell].push(next); all[f * 100 + cell].push(f * 100 + next);}
      }
    }
    assert.equal(graph.reduce((n, a) => n + a.length, 0) / 2, 113);
    const up = index(floor.stairsUp), ds = graphDistances(graph, up);
    assert.equal(ds.filter(d => d >= 0).length, 100);
    assert.ok(dirs.includes(floor.startDirection));
    assert.equal(floor.walls[up][dirs.indexOf(floor.startDirection)], false);
    assert.ok(themes.includes(floor.themeId));
    if (f < 2) {
      inside(floor.stairsDown); assert.notDeepEqual(floor.stairsUp, floor.stairsDown);
      const end = index(floor.stairsDown);
      assert.equal(ds[end], Math.max(...ds)); stairsDistances.push(ds[end]);
      assert.equal(floor.bossRoom, null); assert.equal(floor.keyChest, undefined);
      assert.ok({N: floor.stairsUp.y === 0, E: floor.stairsUp.x === 9,
        S: floor.stairsUp.y === 9, W: floor.stairsUp.x === 0}[floor.entranceSide]);
    } else {
      assert.equal(floor.stairsDown, null); assert.equal(floor.entranceSide, null);
      const room = floor.bossRoom; assert.ok(room); assert.equal(room.cells.length, 2);
      room.cells.forEach(inside); inside(room.approach); inside(room.bossCell);
      const cells = room.cells.map(index), approach = index(room.approach), reserved = new Set(cells);
      assert.equal(reserved.size, 2); assert.ok(!reserved.has(up)); assert.ok(!reserved.has(approach));
      assert.deepEqual(room.bossCell, room.cells[1]);
      const d = dirs.indexOf(room.direction); assert.ok(d >= 0); roomDirection = room.direction;
      for (let n = 0; n < 2; n++) {
        const p = n === 0 ? room.approach : room.cells[n - 1], q = room.cells[n];
        assert.equal(q.x - p.x, deltas[d][0]); assert.equal(q.y - p.y, deltas[d][1]);
        assert.ok(graph[index(p)].includes(index(q)));
      }
      const expectedNeighbors = [[approach, cells[1]], [cells[0]]];
      for (let n = 0; n < 2; n++) assert.deepEqual([...graph[cells[n]]].sort((a,b)=>a-b), expectedNeighbors[n].sort((a,b)=>a-b));
      const exterior = graph.map((list, i) => reserved.has(i) ? [] : list.filter(j => !reserved.has(j)));
      assert.equal(graphDistances(exterior, up).filter(d => d >= 0).length, 98);
      const fromApproach = graphDistances(graph, approach);
      assert.equal(fromApproach[up], Math.max(...fromApproach.filter((_, i) => !reserved.has(i))));
      bossDistance = ds[cells[1]]; assert.equal(bossDistance, ds[approach] + 2);
      const edge = room.doorEdge; inside(edge); assert.ok(['E', 'S'].includes(edge.direction));
      const a = index(edge), b = a + (edge.direction === 'E' ? 1 : 10);
      assert.deepEqual([a, b].sort((x,y)=>x-y), [approach, cells[0]].sort((x,y)=>x-y));
      assert.equal(edge.key, `floor-3:${edge.x},${edge.y},${edge.direction}`);
      assert.equal(edge.kind, 'boss'); assert.equal(edge.initialState, 'locked');
      assert.deepEqual(edge.lock, {keyId: 'special-map-v2:rusted-boss-key', scope: 'specialMapSession'});
    }
  }
  assert.equal(map.links.length, 2);
  for (const [i, link] of map.links.entries()) {
    assert.deepEqual(link.upper, {floor: i + 1, ...map.floors[i].stairsDown});
    assert.deepEqual(link.lower, {floor: i + 2, ...map.floors[i + 1].stairsUp});
    const a = i * 100 + index(link.upper), b = (i + 1) * 100 + index(link.lower);
    all[a].push(b); all[b].push(a); // Each pair is a bidirectional transfer.
  }
  const start = index(map.floors[0].stairsUp), boss = 200 + index(map.floors[2].bossRoom.bossCell);
  const ds = graphDistances(all, start);
  assert.equal(ds.filter(d => d >= 0).length, 300);
  assert.equal(graphDistances(all, boss)[start], ds[boss]);
  assert.equal(ds[boss], stairsDistances[0] + stairsDistances[1] + bossDistance + 2);
  const gate = map.floors[2].bossRoom.doorEdge;
  const a = 200 + index(gate), b = a + (gate.direction === 'E' ? 1 : 10);
  const locked = all.map((list, i) => list.filter(j => !((i === a && j === b) || (i === b && j === a))));
  const lockedDistances = graphDistances(locked, start);
  assert.equal(lockedDistances.filter(d => d >= 0).length, 298);
  assert.equal(lockedDistances[boss], -1);
  assert.ok(lockedDistances[200 + index(map.floors[2].keyChest)] >= 0);
  return {stairsDistances, bossDistance, entranceToBoss: ds[boss], roomDirection};
}

// Separate closed-gate graph audit, deliberately independent of generator BFS.
export function checkV2KeyAccess(map) {
  assert.equal(map.floors.filter(f => f.keyChest).length, 1);
  const floor = map.floors[2], room = floor.bossRoom, chest = floor.keyChest;
  inside(chest); assert.equal(chest.kind, 'gold'); assert.equal(chest.id, 'floor-3:rusted-key-chest');
  assert.deepEqual(chest.contents, {type: 'sessionKey', keyId: 'special-map-v2:rusted-boss-key',
    name: '赤錆びた鍵', scope: 'specialMapSession'});
  assert.equal(chest.contents.keyId, room.doorEdge.lock.keyId);
  assert.equal(chest.contents.scope, room.doorEdge.lock.scope);
  const key = index(chest), up = index(floor.stairsUp);
  assert.ok(![up, index(room.approach), ...room.cells.map(index)].includes(key), 'key chest overlaps reserved cell');
  assert.ok(Math.abs(chest.x - floor.stairsUp.x) + Math.abs(chest.y - floor.stairsUp.y) > 1, 'key chest is directly adjacent to stair');
  const edge = room.doorEdge, a = index(edge), b = a + (edge.direction === 'E' ? 1 : 10);
  const graph = Array.from({length: 100}, () => []);
  for (let i = 0; i < 100; i++) for (let d = 0; d < 4; d++) {
    if (floor.walls[i][d]) continue;
    const x = i % 10 + deltas[d][0], y = Math.floor(i / 10) + deltas[d][1];
    assert.ok(x >= 0 && x < 10 && y >= 0 && y < 10);
    const j = y * 10 + x;
    if ((i === a && j === b) || (i === b && j === a)) continue;
    graph[i].push(j);
  }
  const ds = graphDistances(graph, up);
  assert.equal(ds.filter(d => d >= 0).length, 98);
  for (const cell of room.cells) assert.equal(ds[index(cell)], -1);
  assert.ok(ds[key] >= 10, 'key chest is unreachable behind the gate or closer than 10 steps');
  return {keyChestDistance: ds[key], keyChestToGateDistance: graphDistances(graph, key)[index(room.approach)]};
}
