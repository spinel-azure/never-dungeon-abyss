import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSpecialMapV2, SPECIAL_DUNGEON_V2, V2_RARITIES, canonicalV2Structure,
  specialMapV2StructureFingerprint, specialMapV2Ascii} from '../js/special-map/generator-v2.js';
import {streamV1} from '../js/special-map/random-v1.js';
import {generateSpecialMap, specialMapFingerprint} from '../js/special-map/generator.js';
import {generateSpecialMapDoors} from '../js/special-map/doors.js';
import {generateSpecialMapEcology} from '../js/special-map/ecology.js';
import {encodeMapCode, decodeMapCode} from '../data/special-map-code.js';
import {checkV2Structure, checkV2KeyAccess} from './special-map-v2-structure-helper.mjs';
import {generateSpecialMapV2 as generateCandidate1, specialMapV2StructureFingerprint as candidate1Fingerprint} from './fixtures/special-map-v2-candidate-1.mjs';
import {KEY_ITEMS} from '../data/key-items.js';

const input = (seed, level = 1, rarity = 'WHITE') => ({ruleset: SPECIAL_DUNGEON_V2, seed, level, rarity});
const seeds = [0, 1, 12345, 32768, 65535];
// Candidate comparison snapshots, not a declaration that V2 has been released.
const fingerprints = ['d5a7a4aa', '43daa69d', '3519b715', '90f038f0', '54ac48a2'];
const withoutTheme = ({themeId,...rest}) => rest;

test('V2 Candidate 3: three floors, reciprocal stairs, 1x2 room and reachable key chest repeat 100 times', () => {
  for (const seed of seeds) {
    const map = generateSpecialMapV2(input(seed)); checkV2Structure(map); checkV2KeyAccess(map);
    assert.equal(specialMapV2StructureFingerprint(map), fingerprints[seeds.indexOf(seed)]);
    for (let i = 0; i < 100; i++) assert.deepEqual(generateSpecialMapV2(input(seed)), map);
    assert.equal(specialMapV2StructureFingerprint(Object.fromEntries(Object.entries(map).reverse())), specialMapV2StructureFingerprint(map));
    assert.equal(new Set(map.floors.map(f => JSON.stringify(f.walls))).size, 3);
  }
  assert.equal(new Set(seeds.map(s => specialMapV2StructureFingerprint(generateSpecialMapV2(input(s))))).size, seeds.length);
});

test('V2: all 100 levels and all rarities preserve structural coverage; identity inputs remain explicit', () => {
  for (const seed of [0, 12345, 65535]) {
    const expected = canonicalV2Structure(generateSpecialMapV2(input(seed)));
    for (let level = 1; level <= 100; level++) for (const rarity of V2_RARITIES) {
      const map = generateSpecialMapV2(input(seed, level, rarity));
      assert.equal(map.level, level); assert.equal(map.rarity, rarity);
      assert.equal(canonicalV2Structure(map), expected);
    }
  }
});

test('V2: rejects unsupported versions, non-16bit seeds, invalid levels and colors without coercion', () => {
  for (const ruleset of [undefined, null, 2, 'special-map-v1', 'phase2a-1', 'latest'])
    assert.throws(() => generateSpecialMapV2({...input(0), ruleset}), RangeError);
  for (const seed of [undefined, null, '0', -1, 65536, 0.5, NaN, Infinity])
    assert.throws(() => generateSpecialMapV2({...input(0), seed}), RangeError);
  for (const level of [undefined, null, '1', 0, 101, 1.5, NaN, Infinity])
    assert.throws(() => generateSpecialMapV2({...input(0), level}), RangeError);
  for (const rarity of [undefined, null, 0, 'white', 'PLATINUM', ''])
    assert.throws(() => generateSpecialMapV2({...input(0), rarity}), RangeError);
  assert.throws(() => generateSpecialMapV2(), RangeError);
});

test('V2: no Math.random; new purpose streams and discoverer names never change structure', () => {
  const before = generateSpecialMapV2(input(12345)), random = Math.random;
  try {
    Math.random = () => {throw Error('random forbidden');};
    for (const seed of seeds) {const m = generateSpecialMapV2(input(seed)); checkV2Structure(m); checkV2KeyAccess(m);}
    for (const purpose of ['floor-1-ecology', 'floor-2-doors', 'floor-3-key-chest', 'floor-3-boss', 'boss', 'map-rarity']) {
      const next = streamV1(SPECIAL_DUNGEON_V2, 12345, purpose);
      for (let i = 0; i < 100; i++) next();
    }
    assert.deepEqual(generateSpecialMapV2({...input(12345), discovererName: '†ルル'}), before);
    assert.deepEqual(generateSpecialMapV2({...input(12345), discovererName: 'スピネ'}), before);
  } finally {Math.random = random;}
});

test('V2: inputs are not mutated and generated floor/room/link objects are not shared', () => {
  const options = Object.freeze(input(12345)), baseline = generateSpecialMapV2(options);
  const dirty = generateSpecialMapV2(options);
  dirty.floors[2].bossRoom.cells[0].x = 100;
  dirty.floors[2].bossRoom.doorEdge.lock.keyId = 'red_rust_key_b9f';
  dirty.floors[2].keyChest.contents.keyId = 'red_rust_key_b9f';
  dirty.floors[0].walls[0][0] = false;
  dirty.links[0].lower.x = 100;
  dirty.floors[0].stairsDown.x = 100;
  assert.deepEqual(generateSpecialMapV2(options), baseline);
  assert.equal(options.seed, 12345);
  assert.notStrictEqual(baseline.links[0].upper, baseline.floors[0].stairsDown);
});

test('V2: ASCII inspector identifies both stairs and the final boss cell without an exit marker', () => {
  const map = generateSpecialMapV2(input(12345));
  for (const [i, floor] of map.floors.entries()) {
    const ascii = specialMapV2Ascii(floor);
    assert.equal(ascii.split('\n').length, 21);
    assert.equal((ascii.match(/U/g) ?? []).length, 1);
    assert.equal((ascii.match(/D/g) ?? []).length, i < 2 ? 1 : 0);
    assert.equal((ascii.match(/B/g) ?? []).length, i === 2 ? 1 : 0);
    assert.equal((ascii.match(/r/g) ?? []).length, i === 2 ? 1 : 0);
    assert.equal((ascii.match(/K/g) ?? []).length, i === 2 ? 1 : 0);
  }
});

test('V2 Candidate 1 comparison fixture retains fingerprints and unchanged first two floors', () => {
  const oldFingerprints = ['8cc6ed66', '3cdc3767', 'f69172cd', '3c07b720', '9c6552d9'];
  for (const [i, seed] of seeds.entries()) {
    const old = generateCandidate1(input(seed)), current = generateSpecialMapV2(input(seed));
    assert.equal(candidate1Fingerprint(old), oldFingerprints[i]);
    assert.equal(old.floors[2].bossRoom.cells.length, 3);
    assert.equal(old.floors[2].keyChest, undefined);
    assert.deepEqual(current.floors.slice(0, 2).map(withoutTheme), old.floors.slice(0, 2).map(withoutTheme));
    assert.ok(current.floors.every(f => f.themeId === current.themeId));
    assert.equal(current.themeId, old.floors[0].themeId);
  }
});

test('V2 key is session-scoped, not a normal B9 inventory item; no survey/runtime is created', () => {
  for (const seed of seeds) {
    const map = generateSpecialMapV2(input(seed)), floor = map.floors[2];
    assert.equal(floor.keyChest.contents.name, '赤錆びた鍵');
    assert.equal(KEY_ITEMS[floor.keyChest.contents.keyId], undefined);
    assert.notEqual(floor.keyChest.contents.keyId, KEY_ITEMS.red_rust_key_b9f.id);
    assert.deepEqual(floor.bossRoom.bossCell, floor.bossRoom.cells[1]);
    assert.equal(floor.walls.length, 100);
    assert.doesNotMatch(JSON.stringify(map), /survey|explored|openedDoors|activeSession|red_rust_key_b9f/);
    checkV2KeyAccess(map);
  }
});

test('V2 audit rejects a key behind its own locked door, a near-stair key, overlaps and wrong locks', () => {
  for (const location of ['stairsUp', 'bossCell', 'approach', 'adjacent', 'wallAdjacent']) {
    const map = generateSpecialMapV2(input(12345)), f = map.floors[2];
    let point = location === 'stairsUp' ? f.stairsUp : f.bossRoom[location];
    if (location === 'adjacent') {
      const d = f.walls[f.stairsUp.y * 10 + f.stairsUp.x].indexOf(false);
      point = {x: f.stairsUp.x + [0,1,0,-1][d], y: f.stairsUp.y + [-1,0,1,0][d]};
    }
    if (location === 'wallAdjacent') {
      assert.equal(f.walls[f.stairsUp.y * 10 + f.stairsUp.x][1], true);
      point = {x: f.stairsUp.x + 1, y: f.stairsUp.y};
    }
    Object.assign(f.keyChest, point);
    assert.throws(() => checkV2KeyAccess(map));
  }
  const map = generateSpecialMapV2(input(12345));
  map.floors[2].bossRoom.doorEdge.lock.keyId = 'red_rust_key_b9f';
  assert.throws(() => checkV2Structure(map));
  assert.throws(() => checkV2KeyAccess(map));
});

test('V2 Candidate 2 fingerprint covers key chest placement, contents and locked door metadata', () => {
  const map = generateSpecialMapV2(input(12345)), original = specialMapV2StructureFingerprint(map);
  for (const mutate of [m => m.floors[2].keyChest.x++, m => m.floors[2].keyChest.contents.keyId = 'other',
    m => m.floors[2].bossRoom.doorEdge.initialState = 'open', m => m.floors[2].bossRoom.doorEdge.lock.scope = 'global']) {
    const copy = structuredClone(map); mutate(copy);
    assert.notEqual(specialMapV2StructureFingerprint(copy), original);
  }
});

test('V2: generating blueprints does not alter V1, legacy codes, doors or ecology; single-floor API stays V1', () => {
  const original = {rulesetVersion: 'phase2a-1', seed: 12345, discovererName: '†ルル'};
  const code = encodeMapCode(original), v1 = generateSpecialMap('special-map-v1', 12345);
  const doors = generateSpecialMapDoors(v1.ruleset, v1.seed, v1);
  const ecology = generateSpecialMapEcology(v1.ruleset, v1.seed, v1);
  for (const seed of seeds) generateSpecialMapV2(input(seed));
  assert.deepEqual(generateSpecialMap('special-map-v1', 12345), v1);
  assert.equal(specialMapFingerprint(v1), '65bbb4f0');
  assert.equal(doors.fingerprint, '04ec0371');
  assert.deepEqual(generateSpecialMapDoors(v1.ruleset, v1.seed, v1), doors);
  assert.deepEqual(generateSpecialMapEcology(v1.ruleset, v1.seed, v1), ecology);
  assert.equal(encodeMapCode(original), code);
  assert.deepEqual(decodeMapCode(code).map, original);
  assert.throws(() => generateSpecialMap(SPECIAL_DUNGEON_V2, 12345), RangeError);
  const v2Original={...original, rulesetVersion: SPECIAL_DUNGEON_V2, level: 1, rarity: 'WHITE'};
  assert.deepEqual(decodeMapCode(encodeMapCode(v2Original)).map,v2Original);
});

import {generateSpecialMapV2 as generateCandidate2, specialMapV2StructureFingerprint as candidate2Fingerprint} from './fixtures/special-map-v2-candidate-2.mjs';
test('Candidate 3 changes only themes, preserving Candidate 2 geometry, stairs, chest and gate',()=>{
 const oldFingerprints=['ff8e2d5e','10a7c000','5a0826f6','7d9192d0','43f0e785'];
 for(const [i,seed] of seeds.entries()){
  const old=generateCandidate2(input(seed)),current=generateSpecialMapV2(input(seed));
  assert.equal(candidate2Fingerprint(old),oldFingerprints[i]);
  assert.deepEqual(current.floors.map(withoutTheme),old.floors.map(withoutTheme));
  assert.deepEqual(current.links,old.links);
  assert.equal(current.themeId,old.floors[0].themeId);
  assert.ok(current.floors.every(f=>f.themeId===current.themeId));
  const changed=structuredClone(current);changed.floors[2].themeId='invalid';
  assert.notEqual(specialMapV2StructureFingerprint(changed),specialMapV2StructureFingerprint(current));
 }
});
