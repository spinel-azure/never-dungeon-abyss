import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as old from './fixtures/special-map-ecology-candidate-1.mjs';
import * as current from '../js/special-map/ecology.js';
import {streamV1,chooseIndexV1} from '../js/special-map/random-v1.js';

test('Candidate 2 changes only raw weight transform and revision, preserving selection and normalization',()=>{
 assert.deepEqual(current.SPECIES_COUNT_WEIGHTS,old.SPECIES_COUNT_WEIGHTS);
 assert.deepEqual(current.ECOLOGY_STREAMS,old.ECOLOGY_STREAMS);
 assert.equal(current.ECOLOGY_TOTAL_WEIGHT,old.ECOLOGY_TOTAL_WEIGHT);
 assert.equal(current.normalizeEcologyWeights.toString(),old.normalizeEcologyWeights.toString());
 assert.equal(current.canonicalEcology.toString(),old.canonicalEcology.toString());
 assert.equal(current.ecologyFingerprint.toString(),old.ecologyFingerprint.toString());
 const a=old.generateSpecialMapEcology.toString(),b=current.generateSpecialMapEcology.toString();
 assert.equal(a.split('// Cubing')[0],b.split('// Candidate 2')[0]);
 assert.equal(a.slice(a.indexOf('const weights=')).replace('return n*n*n;','return n;'),b.slice(b.indexOf('const weights=')));
});

test('Candidate 2 uses the same weight draws directly, Candidate 1 cubes them',()=>{
 for(const ruleset of ['special-map-v1','phase2a-1'])for(const seed of [0,1,102,104,640,12345,32768,65535]){
  const a=old.generateSpecialMapEcology(ruleset,seed),b=current.generateSpecialMapEcology(ruleset,seed);
  assert.deepEqual(a.species.map(s=>s.monsterId),b.species.map(s=>s.monsterId));
  const rng=streamV1(ruleset,seed,'ecology-weights'),raw=b.species.map(()=>1+chooseIndexV1(rng,100));
  assert.deepEqual(b.species.map(s=>s.weight),current.normalizeEcologyWeights(raw));
  assert.deepEqual(a.species.map(s=>s.weight),old.normalizeEcologyWeights(raw.map(n=>n*n*n)));
 }
});

test('archived Candidate 1 samples reproduce prior audit, including fingerprints',()=>{
 const report=JSON.parse(readFileSync(new URL('../artifacts/special-map-ecology-candidate-1.json',import.meta.url),'utf8'));
 assert.equal(report.sha256,'33f521694198da8fd73de895fd844c6042d8c88f364c1465aa3c181968dc20a4');
 for(const {topologyFingerprint,...e} of report.examples)assert.deepEqual(old.generateSpecialMapEcology(e.ruleset,e.seed),e);
});

test('every archived singleton seed keeps its exact species and 100% weight',()=>{
 const report=JSON.parse(readFileSync(new URL('../artifacts/special-map-ecology-candidate-1.json',import.meta.url),'utf8'));
 assert.equal(report.singleSpecies.length,133);
 for(const item of report.singleSpecies){
  const e=current.generateSpecialMapEcology(report.ruleset,item.seed);
  assert.equal(e.themeId,item.themeId);assert.deepEqual(e.species,[{monsterId:item.monsterId,weight:10000}]);
 }
});
