import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSpecialMap,specialMapFingerprint} from '../js/special-map/generator.js';
import {streamV1} from '../js/special-map/random-v1.js';
import {generateSpecialMapEcology,canonicalEcology,ecologyFingerprint,normalizeEcologyWeights,ECOLOGY_STREAMS,SPECIES_COUNT_WEIGHTS} from '../js/special-map/ecology.js';
import {ECOLOGY_V1_POOLS} from '../js/special-map/ecology-pools-v1.js';
import {deriveCurrentPoolBaseline} from '../scripts/ecology-pool-provenance.mjs';
import {getEnemyById} from '../data/enemies.js';
import {checkEcology} from './special-map-ecology-helper.mjs';
const ruleset='special-map-v1';

for(const domain of [ruleset,'phase2a-1'])for(const seed of [0,1,12345,32768,65535])test(`${domain} seed ${seed}: repeat 100 times, valid positive ecology`,()=>{
 const map=generateSpecialMap(domain,seed),before=structuredClone(map),ecology=generateSpecialMapEcology(domain,seed,map);
 assert.deepEqual(checkEcology(ecology,map),[]);
 for(let i=0;i<100;i++)assert.deepEqual(generateSpecialMapEcology(domain,seed,map),ecology);
 assert.deepEqual(map,before);
});

test('ecology requires no random source, clock, character, or save state',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Forbidden random');};
 try{
  const map=generateSpecialMap(ruleset,12345),e=generateSpecialMapEcology(ruleset,12345,map);
  assert.deepEqual(checkEcology(e,map),[]);assert.equal(specialMapFingerprint(map),'65bbb4f0');
 }finally{Math.random=random;}
});

test('ecology streams are independent and leave topology baseline untouched',()=>{
 const before=generateSpecialMap(ruleset,12345);
 const sequences=ECOLOGY_STREAMS.map(p=>{const rng=streamV1(ruleset,12345,p);return Array.from({length:20},()=>rng());});
 assert.equal(new Set(sequences.map(JSON.stringify)).size,3);
 for(const purpose of [...ECOLOGY_STREAMS,'treasure']){const rng=streamV1(ruleset,12345,purpose);for(let i=0;i<1000;i++)rng();}
 generateSpecialMapEcology(ruleset,12345,before);
 assert.deepEqual(generateSpecialMap(ruleset,12345),before);assert.equal(specialMapFingerprint(before),'65bbb4f0');
});

test('original signatures and ownership metadata never participate in ecology',()=>{
 const map=generateSpecialMap(ruleset,65535);
 assert.deepEqual(generateSpecialMapEcology(ruleset,65535,{...map,discovererName:'†ルル',acquisitionMethod:'discovered'}),
  generateSpecialMapEcology(ruleset,65535,{...map,discovererName:'ALC',acquisitionMethod:'shared'}));
});

test('invalid seed, ruleset and blueprint identity/theme are rejected',()=>{
 for(const seed of [-1,65536,0.5,NaN,Infinity,'1',null,undefined])assert.throws(()=>generateSpecialMapEcology(ruleset,seed),RangeError);
 for(const r of ['',1,null,'special-map-v2','__proto__'])assert.throws(()=>generateSpecialMapEcology(r,0),RangeError);
 const map=generateSpecialMap(ruleset,0);
 for(const changed of [{seed:1},{ruleset:'phase2a-1'},{themeId:'unknown'},{themeId:'torture'}])assert.throws(()=>generateSpecialMapEcology(ruleset,0,{...map,...changed}),RangeError);
});

test('positive integer normalization totals 10000, ties use selection order',()=>{
 assert.deepEqual(normalizeEcologyWeights([1]),[10000]);
 assert.deepEqual(normalizeEcologyWeights([1,1,1]),[3334,3333,3333]);
 assert.deepEqual(normalizeEcologyWeights([1,1000000]),[1,9999]);
 for(const raw of [[],[0],[-1],[NaN],[Infinity],[1.5],[1000001],Array(6).fill(1)])assert.throws(()=>normalizeEcologyWeights(raw));
 assert.equal(SPECIES_COUNT_WEIGHTS.reduce((a,b)=>a+b,0),10000);
});

test('candidate pools match reviewed normal-encounter baseline, excluding special-only enemies',()=>{
 assert.deepEqual(ECOLOGY_V1_POOLS,deriveCurrentPoolBaseline());
 for(const rows of Object.values(ECOLOGY_V1_POOLS)){
  assert.equal(rows.reduce((n,s)=>n+s.baseWeight,0),1000000);
  assert.equal(new Set(rows.map(s=>s.monsterId)).size,rows.length);
  for(const s of rows){const enemy=getEnemyById(s.monsterId);assert.ok(enemy);assert.equal(enemy.isBoss,false);assert.ok(s.baseWeight>0);assert.ok(enemy.randomEncounter!==false||s.monsterId==='maikaefer');}
  assert.ok(!rows.some(s=>['mimic','verfolger','wasp','banshee'].includes(s.monsterId)));
 }
 assert.ok(ECOLOGY_V1_POOLS.crystal.some(s=>s.monsterId==='crystal_mimic'));
});

test('sample includes natural single species, biases and varying ecologies without zero weights',()=>{
 let solo=0,biased=0;const fingerprints=new Set();
 for(let seed=0;seed<2048;seed++){
  const map=generateSpecialMap(ruleset,seed),e=generateSpecialMapEcology(ruleset,seed,map);
  assert.deepEqual(checkEcology(e,map),[]);fingerprints.add(e.fingerprint);
  if(e.species.length===1){solo++;assert.equal(e.species[0].weight,10000);}
  else if(e.species.some(s=>s.weight>=9000))biased++;
 }
 assert.ok(solo>0);assert.ok(biased>0);assert.ok(fingerprints.size>1);
});

test('fingerprint canonicalization ignores object key order and rejects mutated output',()=>{
 const e=generateSpecialMapEcology(ruleset,0),expectedFingerprint=e.fingerprint,copy={species:e.species,themeId:e.themeId,seed:e.seed,ruleset:e.ruleset,revision:e.revision};
 assert.equal(canonicalEcology(e),canonicalEcology(copy));assert.equal(ecologyFingerprint(copy),e.fingerprint);
 e.species[0].weight++;assert.notEqual(ecologyFingerprint(e),e.fingerprint);
 assert.equal(generateSpecialMapEcology(ruleset,0).fingerprint,expectedFingerprint);
});

test('audit checker detects malformed distribution rather than merely generating statistics',()=>{
 const map=generateSpecialMap(ruleset,0),e=generateSpecialMapEcology(ruleset,0,map);
 assert.ok(checkEcology({...e,species:[]},map).includes('emptySpecies'));
 assert.ok(checkEcology({...e,species:[{monsterId:'nonexistent',weight:10000}]},map).includes('invalidMonster'));
 assert.ok(checkEcology({...e,species:[{monsterId:'verfolger',weight:10000}]},map).includes('invalidMonster'));
 assert.ok(checkEcology({...e,species:[{monsterId:'mimic',weight:10000}]},map).includes('outsideTheme'));
 assert.ok(checkEcology({...e,species:[e.species[0],e.species[0]]},map).includes('duplicateMonster'));
 assert.ok(checkEcology({...e,species:[{...e.species[0],weight:0}]},map).includes('nonPositiveWeight'));
 assert.ok(checkEcology({...e,species:[{...e.species[0],weight:9999}]},map).includes('weightSum'));
});

test('ecology stays outside gameplay and does not add seed-specific production branches',()=>{
 for(const file of ['session.js','exploration-ui.js','generator.js','generator-v1.js']){
  const source=readFileSync(new URL('../js/special-map/'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/import .*ecology/);
 }
 const source=readFileSync(new URL('../js/special-map/ecology.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/Math\.random|\bseed\s*===\s*\d/);
});
