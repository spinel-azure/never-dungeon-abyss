import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createSpecialMapSession} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {generateSpecialMap} from '../js/special-map/generator.js';
import {canonicalDoorPositions} from '../js/special-map/doors.js';
import {generateSpecialMapEcology,canonicalEcology} from '../js/special-map/ecology.js';
const hashes=Array.from({length:3},()=>createHash('sha256'));
const report={seeds:65536,wallFacingStarts:0,invalidEntrances:0,topologyMutations:0,resolvedFacingChanges:0,examples:[]};
for(let seed=0;seed<65536;seed++){
 const original={rulesetVersion:'special-map-v1',seed,discovererName:'†ルル'};
 const s=createSpecialMapSession([original],mapOriginalId(original)),map=s.generatedMap,e=map.entrance;
 assert.deepEqual(map,generateSpecialMap(map.ruleset,seed));
 assert.equal(map.walls[e.y*10+e.x][s.direction],false);
 assert.equal(s.cells[e.y][e.x].type,'stairsUp');assert.equal(s.playerX,e.x);assert.equal(s.playerY,e.y);
 assert.equal(s.cells.flat().filter(c=>c.type==='stairsUp').length,1);
 assert.equal('exitReached' in s,false);assert.equal(s.renderState.torchFuel,100);
 if(['N','E','S','W'][s.direction]!==map.startDirection)report.resolvedFacingChanges++;
 hashes[0].update(JSON.stringify(map)+'\n');hashes[1].update(canonicalDoorPositions(s.doorLayout)+'\n');hashes[2].update(canonicalEcology(generateSpecialMapEcology(map.ruleset,seed,map))+'\n');
 if([0,1,12345,65535].includes(seed))report.examples.push({seed,entrance:e,generatedDirection:map.startDirection,runtimeDirection:['N','E','S','W'][s.direction],topology:s.fingerprint,doors:s.doorLayout.fingerprint});
}
[report.topologySha256,report.doorSha256,report.ecologySha256]=hashes.map(h=>h.digest('hex'));
assert.equal(report.topologySha256,'b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58');
assert.equal(report.doorSha256,'6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f');
assert.equal(report.ecologySha256,'04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a');
writeFileSync(new URL('../artifacts/special-map-runtime-phase3b5.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
