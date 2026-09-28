import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {generateSpecialMapV2, SPECIAL_DUNGEON_V2, V2_STRUCTURE_REVISION, V2_RARITIES,
  canonicalV2Structure, specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
import {generateSpecialMap, specialMapFingerprint} from '../js/special-map/generator.js';
import {generateSpecialMapDoors, canonicalDoorPositions} from '../js/special-map/doors.js';
import {generateSpecialMapEcology, canonicalEcology} from '../js/special-map/ecology.js';
import {checkV2Structure, checkV2KeyAccess} from '../tests/special-map-v2-structure-helper.mjs';
import {checkStructure} from '../tests/special-map-structure-helper.mjs';
import {generateSpecialMapV2 as generateCandidate1, canonicalV2Structure as canonicalCandidate1,
  specialMapV2StructureFingerprint as candidate1Fingerprint} from '../tests/fixtures/special-map-v2-candidate-1.mjs';

const started = performance.now(), digest = () => createHash('sha256');
const hashes = {v2Structure: digest(), candidate1Structure: digest(), v1Topology: digest(), legacyTopology: digest(), v1Doors: digest(), v1Ecology: digest()};
const report = {
  revision: V2_STRUCTURE_REVISION, status: 'PROVISIONAL — structure only, not a released V2 compatibility value',
  ruleset: SPECIAL_DUNGEON_V2, seedsAttempted: 0, validSets: 0, validFloors: 0,
  failures: {generation: 0, structure: 0, keyAccess: 0, repeat: 0, levelRarityIndependence: 0, candidate1Comparison: 0, legacy: 0}, failureExamples: [],
  coverage: {
    structure: 'All 65536 seeds at Lv1 WHITE. Gate open: all 300 cells reachable in both directions via stairs. Gate locked: 298 total / 98 floor-3 exterior cells reachable, room cells blocked, key chest reachable at least 10 steps from up stair, never geometrically adjacent to it.',
    identity: 'Every seed regenerated identically, then regenerated at a rotating Lv1..100 and WHITE/SILVER/GOLD. Structural equality excludes only Lv/color.',
    limitation: 'No V2 ecology, enemy, boss selection, ordinary doors, runtime, save, reward or codec audit. Those systems are not implemented here.',
  },
  stairsDistances: [{}, {}], floor3BossDistances: {}, entranceToBossDistances: {}, roomDirections: {},
  keyChestDistances: {}, keyChestToGateDistances: {}, minimumKeyChestDistance: 10,
  themesByFloor: [{}, {}, {}], examples: [], sha256: {},
};
const increment = (table, key) => table[key] = (table[key] ?? 0) + 1;
function failure(type, seed, error) {
  report.failures[type]++;
  if (report.failureExamples.length < 20) report.failureExamples.push({type, seed, message: error.message});
}
const random = Math.random;
try {
  Math.random = () => {throw Error('Math.random is forbidden in structural audits');};
  for (let seed = 0; seed < 65536; seed++) {
    report.seedsAttempted++;
    const input = {ruleset: SPECIAL_DUNGEON_V2, seed, level: 1, rarity: 'WHITE'};
    let map, canonical, metrics, old;
    try {
      map = generateSpecialMapV2(input);
      assert.equal(map.seed, seed); assert.equal(map.level, 1); assert.equal(map.rarity, 'WHITE');
      canonical = canonicalV2Structure(map);
    } catch (error) {failure('generation', seed, error);}
    if (map && canonical) {
      try {metrics = checkV2Structure(map);}
      catch (error) {failure('structure', seed, error);}
      try {
        const keyMetrics = checkV2KeyAccess(map);
        if (metrics) {Object.assign(metrics, keyMetrics); report.validSets++; report.validFloors += 3;}
      } catch (error) {failure('keyAccess', seed, error);}
      try {
        old = generateCandidate1(input);
        hashes.candidate1Structure.update(canonicalCandidate1(old) + '\n');
        assert.deepEqual(map.floors.slice(0, 2), old.floors.slice(0, 2));
        assert.deepEqual(map.floors.map(f => f.themeId), old.floors.map(f => f.themeId));
      } catch (error) {failure('candidate1Comparison', seed, error);}
      try {assert.deepEqual(generateSpecialMapV2(input), map);}
      catch (error) {failure('repeat', seed, error);}
      try {
        const other = generateSpecialMapV2({...input, level: 1 + seed % 100, rarity: V2_RARITIES[seed % 3], discovererName: '†ルル'});
        assert.equal(canonicalV2Structure(other), canonical);
      } catch (error) {failure('levelRarityIndependence', seed, error);}
      hashes.v2Structure.update(canonical + '\n');
      if (metrics) {
        metrics.stairsDistances.forEach((distance, i) => increment(report.stairsDistances[i], distance));
        increment(report.floor3BossDistances, metrics.bossDistance);
        increment(report.entranceToBossDistances, metrics.entranceToBoss);
        increment(report.roomDirections, metrics.roomDirection);
        if (metrics.keyChestDistance !== undefined) {
          increment(report.keyChestDistances, metrics.keyChestDistance);
          increment(report.keyChestToGateDistances, metrics.keyChestToGateDistance);
        }
        map.floors.forEach((f, i) => increment(report.themesByFloor[i], f.themeId));
        if ([0, 1, 12345, 32768, 65535].includes(seed)) report.examples.push({
          seed, candidate1Fingerprint: old ? candidate1Fingerprint(old) : null,
          structureFingerprint: specialMapV2StructureFingerprint(map), ...metrics,
          floors: map.floors.map(({walls, ...floor}) => floor), links: map.links,
        });
      }
    }
    try {
      const v1 = generateSpecialMap('special-map-v1', seed), legacy = generateSpecialMap('phase2a-1', seed);
      checkStructure(v1); checkStructure(legacy);
      hashes.v1Topology.update(JSON.stringify(v1) + '\n');
      hashes.legacyTopology.update(JSON.stringify(legacy) + '\n');
      const doors = generateSpecialMapDoors(v1.ruleset, seed, v1);
      hashes.v1Doors.update(canonicalDoorPositions(doors) + '\n');
      hashes.v1Ecology.update(canonicalEcology(generateSpecialMapEcology(v1.ruleset, seed, v1)) + '\n');
      if (seed === 12345) {
        assert.equal(specialMapFingerprint(v1), '65bbb4f0'); assert.equal(doors.fingerprint, '04ec0371');
        report.legacyExample = {seed, topologyFingerprint: specialMapFingerprint(v1), doorFingerprint: doors.fingerprint};
      }
    } catch (error) {failure('legacy', seed, error);}
    if ((seed + 1) % 8192 === 0) console.log(`Audited ${seed + 1}/65536 V2 sets and V1 compatibility`);
  }
} finally {Math.random = random;}
for (const [key, hash] of Object.entries(hashes)) report.sha256[key] = hash.digest('hex');
const expected = {
  v1Topology: 'b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58',
  legacyTopology: '3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592',
  v1Doors: '6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f',
  v1Ecology: '04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a',
};
report.legacyHashesUnchanged = Object.entries(expected).every(([key, value]) => report.sha256[key] === value);
report.candidate1HashUnchanged = report.sha256.candidate1Structure === '19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1';
report.seconds = Number(((performance.now() - started) / 1000).toFixed(3));
report.passed = report.validSets === 65536 && report.validFloors === 196608
  && Object.values(report.failures).every(n => n === 0) && report.legacyHashesUnchanged && report.candidate1HashUnchanged;
const range = table => ({min: Math.min(...Object.keys(table).map(Number)), max: Math.max(...Object.keys(table).map(Number))});
report.distanceRanges = {stairs: report.stairsDistances.map(range), floor3Boss: range(report.floor3BossDistances), entranceToBoss: range(report.entranceToBossDistances),
  keyChest: range(report.keyChestDistances), keyChestToGate: range(report.keyChestToGateDistances)};
report.averageKeyChestDistance = Object.entries(report.keyChestDistances).reduce((sum, [distance, count]) => sum + Number(distance) * count, 0) / report.validSets;
writeFileSync(new URL('../artifacts/special-map-v2-structure-candidate-2.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, validSets: report.validSets, validFloors: report.validFloors,
  failures: report.failures, distanceRanges: report.distanceRanges, sha256: report.sha256, seconds: report.seconds}, null, 2));
if (!report.passed) process.exitCode = 1;
