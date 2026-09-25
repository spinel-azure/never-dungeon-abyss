import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {validateMapSignature,normalizeSpecialMaps,setMapSignature,discoverTestMap,describeTestMap,appraiseMap,mapOriginalId,transactSpecialMaps,SPECIAL_MAP_RULESET} from '../data/special-maps.js';
const empty=()=>setMapSignature(normalizeSpecialMaps(),'†ルル').state;
const discover=(state,seed=7291,id='discovery')=>discoverTestMap(state,{seed:()=>seed,id:()=>id}).state;
test('signature trims and normalizes NFC, accepts 1–4 BMP characters without truncating',()=>{
 for(const name of ['a','12','†ルル','スピネル','☆★!?','か\u3099'])assert.equal(validateMapSignature(name).ok,true,name);
 assert.equal(validateMapSignature(' †ルル ').value,'†ルル');assert.equal(validateMapSignature('か\u3099').value,'が');
 for(const name of ['','12345','😀','𠮷','A\u200b','木\ufe0f','a\u0301','ab\ncd','a\u202e','\u3099'])assert.equal(validateMapSignature(name).ok,false,name);
});
test('old characters migrate to empty ownership without changing their name or inventory',()=>{
 const old=createInitialCharacter({name:'旧冒険者',job:'warrior'});delete old.specialMaps;
 const next=normalizeCharacter(old);assert.deepEqual(next.specialMaps,normalizeSpecialMaps());assert.equal(next.name,old.name);assert.deepEqual(next.inventory,old.inventory);
});
test('unidentified cap is checked before random draws and originals survive JSON reload',()=>{
 let state=empty();assert.equal(state.unidentified.length,0);
 for(let i=0;i<3;i++){state=discover(state,i,`d${i}`);assert.equal(state.unidentified.length,i+1);}
 assert.equal(discoverTestMap(state,{seed(){throw Error('must not draw');},id(){throw Error('must not allocate');}}).ok,false);
 assert.deepEqual(normalizeSpecialMaps(JSON.parse(JSON.stringify(state))),state);
 assert.equal(setMapSignature(state,'ALC').ok,false);
});
test('appraisal derives fixed info without random draws and moves original atomically',()=>{
 for(const seed of [0,1,7291,65535]){
  const state=discover(empty(),seed),before=structuredClone(state),original=state.unidentified[0];
  const result=appraiseMap(state,original.discoveryId);assert.equal(result.ok,true);assert.deepEqual(state,before);
  assert.equal(result.state.unidentified.length,0);assert.equal(result.state.registered.length,1);
  assert.deepEqual(describeTestMap(result.map),describeTestMap(original));assert.equal(result.map.seed,seed);assert.equal(result.map.discovererName,'†ルル');
  assert.deepEqual(normalizeSpecialMaps(JSON.parse(JSON.stringify(result.state))),result.state);
 }
});
test('registration counts 0–10, full rejection retains map, full duplicate preserves all records',()=>{
 let state=empty();for(let i=0;i<10;i++){state=appraiseMap(discover(state,i,`d${i}`),`d${i}`).state;assert.equal(state.registered.length,i+1);}
 const full=discover(state,100);assert.equal(appraiseMap(full,'discovery').ok,false);assert.equal(full.unidentified.length,1);
 state.registered[0]={...state.registered[0],cleared:true,favorite:true,memo:'永久保存'};
 const duplicate=appraiseMap(discover(state,0),'discovery');assert.equal(duplicate.duplicate,true);assert.equal(duplicate.state.registered.length,10);assert.equal(duplicate.state.unidentified.length,0);assert.deepEqual(duplicate.state.registered,state.registered);
});
test('same seed, different signatures are distinct originals with identical content',()=>{
 let state=appraiseMap(discover(empty()),'discovery').state;
 state={...state,discovererName:'ALC'};state=appraiseMap(discover(state),'discovery').state;
 assert.equal(state.registered.length,2);assert.notEqual(mapOriginalId(state.registered[0]),mapOriginalId(state.registered[1]));assert.deepEqual(describeTestMap(state.registered[0]),describeTestMap(state.registered[1]));
});
test('failed or throwing save restores the complete pre-appraisal character; retry grants once',()=>{
 for(const failure of [()=>false,()=>{throw Error('quota');}]){
  let character={name:'冒険者',gold:123,specialMaps:discover(empty())};const before=character;
  const callbacks={getCharacter:()=>character,setCharacter:v=>{character=v;},save:failure};
  assert.equal(transactSpecialMaps(callbacks,s=>appraiseMap(s,'discovery')).ok,false);assert.equal(character,before);
  callbacks.save=()=>true;assert.equal(transactSpecialMaps(callbacks,s=>appraiseMap(s,'discovery')).ok,true);
  assert.equal(character.specialMaps.registered.length,1);assert.equal(character.gold,123);
  assert.equal(transactSpecialMaps(callbacks,s=>appraiseMap(s,'discovery')).ok,false);
 }
});
test('invalid saved originals do not enter arrays; unsupported rules cannot be appraised as current rules',()=>{
 assert.equal(normalizeSpecialMaps({unidentified:[{seed:65536,rulesetVersion:SPECIAL_MAP_RULESET,discovererName:'ALC'}]}).unidentified.length,0);
 const state=discover(empty());state.unidentified[0].rulesetVersion='future-1';assert.equal(appraiseMap(state,'discovery').ok,false);
});
