import { buildBoundaryWallMap, cells, getStartPosition, randomizeStartPosition, setStartPosition } from "../js/dungeon.js";
import { DIRS } from "../js/config.js";

const RUNS = Math.max(1, Math.floor(Number(process.argv[2]) || 1000));
const BASE_SEED = Math.floor(Number(process.argv[3]) || 0x4e444135) >>> 0;
const FLOOR_START = 50;
const FLOOR_END = 58;
const HERBICIDE_CAPACITY = 99;

const totals = {
  runs: RUNS,
  seed: BASE_SEED,
  profile: {
    player: "Lv55 thief",
    npcParty: ["warrior", "thief", "priest"],
    strongHerbicide: HERBICIDE_CAPACITY
  },
  blindExploration: makeAggregate(),
  knownMapShortestPath: makeAggregate()
};

for (let runIndex = 0; runIndex < RUNS; runIndex += 1) {
  const rng = mulberry32((BASE_SEED + Math.imul(runIndex + 1, 0x9e3779b9)) >>> 0);
  const originalRandom = Math.random;
  Math.random = rng;
  randomizeStartPosition();

  const blindRun = { vines: 0, steps: 0, perFloor: [] };
  const shortestRun = { vines: 0, steps: 0, perFloor: [] };
  for (let depth = FLOOR_START; depth <= FLOOR_END; depth += 1) {
    buildBoundaryWallMap(depth, rng, { eventFlags: {} });
    const start = getStartPosition();
    const goal = cells.flat().find(cell => cell.type === "stairsDown");
    const blind = exploreUntilGoal(start, goal, rng);
    const shortest = shortestPath(start, goal);
    addFloorResult(blindRun, depth, blind);
    addFloorResult(shortestRun, depth, summarizePath(shortest));
    setStartPosition(goal.x, goal.y);
  }

  accumulate(totals.blindExploration, blindRun);
  accumulate(totals.knownMapShortestPath, shortestRun);
  Math.random = originalRandom;
}

finalize(totals.blindExploration);
finalize(totals.knownMapShortestPath);
console.log(JSON.stringify(totals, null, 2));

function makeAggregate() {
  return {
    totalVineBlocks: 0,
    totalSteps: 0,
    runsRequiringOver99: 0,
    vinesPerRun: [],
    stepsPerRun: [],
    byFloor: Object.fromEntries(Array.from({ length: 9 }, (_, index) => [50 + index, { vines: 0, steps: 0 }]))
  };
}

function exploreUntilGoal(start, goal, rng) {
  const visited = new Set([key(start)]);
  const stack = [{ ...start }];
  const vineCells = new Set();
  let steps = 0;
  while (stack.length) {
    const current = stack.at(-1);
    if (same(current, goal)) break;
    const candidates = neighbors(current).filter(next => !visited.has(key(next)));
    if (candidates.length) {
      const next = candidates[Math.floor(rng() * candidates.length)];
      visited.add(key(next));
      stack.push(next);
      steps += 1;
      if (cells[next.y][next.x].bossId === "giant_vine_obstacle") vineCells.add(key(next));
      continue;
    }
    stack.pop();
    if (stack.length) steps += 1;
  }
  return { vines: vineCells.size, steps };
}

function shortestPath(start, goal) {
  const queue = [{ ...start }];
  const parent = new Map([[key(start), null]]);
  while (queue.length) {
    const current = queue.shift();
    if (same(current, goal)) break;
    for (const next of neighbors(current)) {
      if (parent.has(key(next))) continue;
      parent.set(key(next), current);
      queue.push(next);
    }
  }
  if (!parent.has(key(goal))) throw new Error(`No route to stairs at ${key(goal)}`);
  const path = [];
  for (let current = goal; current; current = parent.get(key(current))) path.push(current);
  return path.reverse();
}

function summarizePath(path) {
  const vines = new Set(path.filter(cell => cells[cell.y][cell.x].bossId === "giant_vine_obstacle").map(key));
  return { vines: vines.size, steps: Math.max(0, path.length - 1) };
}

function neighbors(position) {
  const result = [];
  const source = cells[position.y][position.x];
  for (const dir of DIRS) {
    const x = position.x + dir.dx;
    const y = position.y + dir.dy;
    const target = cells[y]?.[x];
    if (!target || target.npc) continue;
    if (source.walls[dir.key] && source.doorKinds[dir.key] !== "normal") continue;
    result.push({ x, y });
  }
  return result;
}

function addFloorResult(run, depth, result) {
  run.vines += result.vines;
  run.steps += result.steps;
  run.perFloor.push({ depth, ...result });
}

function accumulate(aggregate, run) {
  aggregate.totalVineBlocks += run.vines;
  aggregate.totalSteps += run.steps;
  aggregate.runsRequiringOver99 += Number(run.vines > HERBICIDE_CAPACITY);
  aggregate.vinesPerRun.push(run.vines);
  aggregate.stepsPerRun.push(run.steps);
  for (const floor of run.perFloor) {
    aggregate.byFloor[floor.depth].vines += floor.vines;
    aggregate.byFloor[floor.depth].steps += floor.steps;
  }
}

function finalize(aggregate) {
  aggregate.averageVineBlocks = round(aggregate.totalVineBlocks / RUNS);
  aggregate.averageHerbicideRemaining = round(HERBICIDE_CAPACITY - aggregate.averageVineBlocks);
  aggregate.averageSteps = round(aggregate.totalSteps / RUNS);
  aggregate.minimumVineBlocks = Math.min(...aggregate.vinesPerRun);
  aggregate.maximumVineBlocks = Math.max(...aggregate.vinesPerRun);
  aggregate.percentiles = Object.fromEntries([50, 75, 90, 95, 99].map(value => [
    `p${value}`,
    percentile(aggregate.vinesPerRun, value / 100)
  ]));
  for (const floor of Object.values(aggregate.byFloor)) {
    floor.averageVines = round(floor.vines / RUNS);
    floor.averageSteps = round(floor.steps / RUNS);
  }
  delete aggregate.vinesPerRun;
  delete aggregate.stepsPerRun;
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function key(cell) { return `${cell.x},${cell.y}`; }
function same(a, b) { return a.x === b.x && a.y === b.y; }
function round(value) { return Math.round(value * 100) / 100; }
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
