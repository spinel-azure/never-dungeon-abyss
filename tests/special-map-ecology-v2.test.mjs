import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateV2Ecology,generateV2FloorEcology,getV2EcologyCandidates,V2_MAP_SPECIES,V2_ECOLOGY_SPECIES} from '../js/special-map/ecology-v2.js';
import {V2_ECOLOGY_CATALOG,V2_ECOLOGY_POOLS} from '../js/special-map/ecology-pools-v2.js';
import {enemies} from '../data/enemies.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
import {generateSpecialMapV2,specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
const base={ruleset:'special-map-v2',seed:12345,level:100,rarity:'GOLD',themeId:'crystal'};
test('Candidate 1 comparison fixtures and Candidate 3 geometry remain unchanged',()=>{
  const fixtures=JSON.parse(readFileSync(new URL('./fixtures/special-map-ecology-v2-candidate-1.json',import.meta.url)));
  for(const {input,ecology} of fixtures)assert.deepEqual(generateV2Ecology(input),ecology);
  assert.equal(specialMapV2StructureFingerprint(generateSpecialMapV2(base)),'3519b715');
});
test('V2 ecology deterministic and independent of signature, browser RNG and map name streams',()=>{
  const expected=generateV2Ecology(base),nameInput={...base,rulesetVersion:base.ruleset};
  const name=describeV2MapName(nameInput),random=Math.random;
  try{Math.random=()=>{throw Error('Forbidden');};for(let i=0;i<100;i++)assert.deepEqual(generateV2Ecology({...base,discovererName:String(i)}),expected);}finally{Math.random=random;}
  assert.deepEqual(describeV2MapName(nameInput),name);
  assert.notDeepEqual(generateV2Ecology({...base,level:1}),expected);
  assert.notDeepEqual(generateV2Ecology({...base,rarity:'WHITE'}),expected);
  assert.notDeepEqual(generateV2Ecology({...base,seed:1}),expected);
  for(let floorIndex=0;floorIndex<3;floorIndex++)assert.deepEqual(generateV2FloorEcology({...base,floorIndex}),{...expected.floors[floorIndex],dominantSpeciesId:expected.dominantSpeciesId});
});
test('all themes and boundary inputs have positive integer weights, unique valid species and correct counts',()=>{
  for(const themeId of Object.keys(V2_ECOLOGY_POOLS))for(const level of [1,5,9,10,59,60,100])for(const seed of [0,1,12345,65535]){
    const input={...base,themeId,level,seed},result=generateV2Ecology(input);
    for(const floor of result.floors){
      assert.ok(floor.species.length>=[3,3,4][floor.floorIndex]&&floor.species.length<=[4,5,5][floor.floorIndex]);
      assert.equal(floor.species.reduce((n,s)=>n+s.weight,0),10000);
      assert.equal(new Set(floor.species.map(s=>s.id)).size,floor.species.length);
      assert.ok(floor.species.some(s=>s.id===result.dominantSpeciesId));
      const candidates=getV2EcologyCandidates(input,floor.floorIndex);
      for(const s of floor.species)assert.ok(Number.isInteger(s.weight)&&s.weight>0&&candidates.some(c=>c.id===s.id));
    }
  }
});
test('reviewed ordinary metadata matches existing enemies, excludes bosses and event-only enemies',()=>{
  for(const row of Object.values(V2_ECOLOGY_CATALOG)){
    const enemy=enemies.find(e=>e.id===row.id);assert.ok(enemy);assert.ok(!enemy.isBoss);
    assert.ok(enemy.randomEncounter!==false||enemy.id==='maikaefer');
    for(const key of ['name','level','maxHp','attack','def'])assert.equal(row[key],enemy[key]);
  }
  for(const id of Object.keys(V2_MAP_SPECIES))assert.equal(enemies.some(e=>e.id===id),false);
});
test('map-only rare species are eligible in every theme at minimum level, rarity never bypasses level gate',()=>{
  for(const themeId of Object.keys(V2_ECOLOGY_POOLS))for(const [id,s] of Object.entries(V2_MAP_SPECIES)){
    assert.ok(!getV2EcologyCandidates({...base,themeId,level:s.minLevel-1},2).some(c=>c.id===id));
    assert.ok(getV2EcologyCandidates({...base,themeId,level:s.minLevel},0).some(c=>c.id===id));
  }
});
test('audit-discovered king-heavy map follows the same generator, with no exclusive seed rule',()=>{
  const e=generateV2Ecology({...base,seed:22172,level:60,rarity:'WHITE',themeId:'water'});
  assert.equal(e.dominantSpeciesId,'maikaefer_koenig');
  assert.equal(Math.max(...e.floors.flatMap(f=>f.species.filter(s=>s.id==='maikaefer_koenig').map(s=>s.weight))),9525);
});
test('B3F ordinary encounter level increases statistically; no forced same species sets',()=>{
 for(const level of [1,5,25,60,100]){
  const sum=[0,0,0],weight=[0,0,0];let different=0;
  for(let seed=0;seed<1000;seed++){
    const e=generateV2Ecology({...base,seed,level,themeId:'torture'});
    if(new Set(e.floors.map(f=>f.species.map(s=>s.id).sort().join(','))).size>1)different++;
    for(const f of e.floors)for(const s of f.species){const meta=V2_ECOLOGY_SPECIES[s.id];if(!meta.mapExclusive&&s.id!=='maikaefer'){sum[f.floorIndex]+=s.weight*meta.level;weight[f.floorIndex]+=s.weight;}}
  }
  assert.ok(sum[2]/weight[2]>sum[0]/weight[0]);assert.ok(different>950);
 }
});
test('invalid input rejected without silent ruleset or rarity coercion',()=>{
  for(const bad of [{ruleset:'special-map-v1'},{seed:-1},{seed:65536},{level:0},{level:101},{rarity:'gold'},{themeId:'unknown'}])assert.throws(()=>generateV2Ecology({...base,...bad}));
  for(const floorIndex of [-1,3,NaN])assert.throws(()=>generateV2FloorEcology({...base,floorIndex}));
});
