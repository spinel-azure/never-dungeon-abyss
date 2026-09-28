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
      assert.equal(floor.bossRoom, null);
      assert.ok({N: floor.stairsUp.y === 0, E: floor.stairsUp.x === 9,
        S: floor.stairsUp.y === 9, W: floor.stairsUp.x === 0}[floor.entranceSide]);
    } else {
      assert.equal(floor.stairsDown, null); assert.equal(floor.entranceSide, null);
      const room = floor.bossRoom; assert.ok(room); assert.equal(room.cells.length, 3);
      room.cells.forEach(inside); inside(room.approach); inside(room.bossCell);
      const cells = room.cells.map(index), approach = index(room.approach), reserved = new Set(cells);
      assert.equal(reserved.size, 3); assert.ok(!reserved.has(up)); assert.ok(!reserved.has(approach));
      assert.deepEqual(room.bossCell, room.cells[2]);
      const d = dirs.indexOf(room.direction); assert.ok(d >= 0); roomDirection = room.direction;
      for (let n = 0; n < 3; n++) {
        const p = n === 0 ? room.approach : room.cells[n - 1], q = room.cells[n];
        assert.equal(q.x - p.x, deltas[d][0]); assert.equal(q.y - p.y, deltas[d][1]);
        assert.ok(graph[index(p)].includes(index(q)));
      }
      const expectedNeighbors = [[approach, cells[1]], [cells[0], cells[2]], [cells[1]]];
      for (let n = 0; n < 3; n++) assert.deepEqual([...graph[cells[n]]].sort((a,b)=>a-b), expectedNeighbors[n].sort((a,b)=>a-b));
      const exterior = graph.map((list, i) => reserved.has(i) ? [] : list.filter(j => !reserved.has(j)));
      assert.equal(graphDistances(exterior, up).filter(d => d >= 0).length, 97);
      const fromApproach = graphDistances(graph, approach);
      assert.equal(fromApproach[up], Math.max(...fromApproach.filter((_, i) => !reserved.has(i))));
      bossDistance = ds[cells[2]]; assert.equal(bossDistance, ds[approach] + 3);
      const edge = room.doorEdge; inside(edge); assert.ok(['E', 'S'].includes(edge.direction));
      const a = index(edge), b = a + (edge.direction === 'E' ? 1 : 10);
      assert.deepEqual([a, b].sort((x,y)=>x-y), [approach, cells[0]].sort((x,y)=>x-y));
      assert.equal(edge.key, `floor-3:${edge.x},${edge.y},${edge.direction}`);
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
  return {stairsDistances, bossDistance, entranceToBoss: ds[boss], roomDirection};
}
