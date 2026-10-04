import test from 'node:test';
import assert from 'node:assert/strict';
import {writeGame,loadGame} from '../js/save-data.js';
import {normalizeSpecialMaps,setMapSignature,discoverTestMap,appraiseMap,transactSpecialMaps} from '../data/special-maps.js';
import {grantStarterMaps,grantTestStarterMaps} from '../data/special-map-starter.js';

test('development batch survives protected reload without setting production receipt',t=>{
 const s=setup(t);assert.equal(s.run(state=>grantTestStarterMaps(state,{random:()=>.2,id:()=> 'test'})).ok,true);s.load();
 assert.equal(s.get().specialMaps.starterMapsTestGranted,true);assert.equal(s.get().specialMaps.starterMapsGranted,undefined);
 for(const map of [...s.get().specialMaps.unidentified])assert.equal(s.run(state=>appraiseMap(state,map.discoveryId)).ok,true);
 s.load();assert.equal(s.run(state=>grantStarterMaps(state,{random:()=>.2,id:()=> 'future'})).ok,true);
 s.load();assert.equal(s.get().specialMaps.starterMapsGranted,true);assert.equal(s.get().specialMaps.unidentified.length,3);
});

for(const failure of ['.temp','.backup','.current'])test(`starter batch atomic grant and reload with ${failure} failure`,t=>{
 const s=setup(t);s.run(state=>({ok:true,state}));const before=structuredClone(s.get());s.fail(failure);
 const grant=state=>grantStarterMaps(state,{random:()=>.1,id:()=> 'save-fixture'});
 assert.equal(s.run(grant).ok,false);assert.deepEqual(s.get(),before);s.load();assert.deepEqual(s.get(),before);
 s.fail('');assert.equal(s.run(grant).ok,true);const received=structuredClone(s.get());s.load();assert.deepEqual(s.get(),received);
 assert.equal(s.get().specialMaps.unidentified.length,3);assert.equal(s.run(grant).ok,false);
});

function setup(t){
 const storage=new Map();let failure='';
 const globals={localStorage:globalThis.localStorage,window:globalThis.window,CustomEvent:globalThis.CustomEvent};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem(k,v){if(k.endsWith(failure)&&failure)throw Error('quota');storage.set(k,v);},removeItem(k){if(failure==='cleanup')throw Error('cleanup');storage.delete(k);}};
 globalThis.window={dispatchEvent(){if(failure==='event')throw Error('event');}};globalThis.CustomEvent=class{};
 t.after(()=>{for(const [k,v] of Object.entries(globals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}});
 t.mock.method(console,'warn',()=>{});
 let character={name:'†ルル',specialMaps:setMapSignature(normalizeSpecialMaps(),'†ルル').state};
 const snapshot=()=>({character,player:{},dungeon:{cells:[],explored:[]}});
 const callbacks={getCharacter:()=>character,setCharacter:v=>{character=v;},save:()=>writeGame(snapshot())};
 return {run:op=>transactSpecialMaps(callbacks,op),fail:v=>{failure=v;},get:()=>character,load:()=>{character=loadGame().character;},storage};
}

test('V2 real protected save keeps acquisition, appraisal, deletion and rollback separate from V1',async t=>{
 const {registerSharedMap,deleteRegisteredMap}=await import('../data/special-maps.js');
 const s=setup(t),options={seed:()=>12345,id:()=>'v2',rulesetVersion:'special-map-v2',level:50,rarity:'SILVER'};
 assert.equal(s.run(v=>discoverTestMap(v,options)).ok,true);s.load();
 assert.equal(s.get().specialMaps.unidentified[0].level,50);
 for(const failure of ['.temp','.backup','.current']){
  const before=structuredClone(s.get());s.fail(failure);
  assert.equal(s.run(v=>appraiseMap(v,'v2')).ok,false);assert.deepEqual(s.get(),before);s.load();assert.deepEqual(s.get(),before);
 }
 s.fail('');const registered=s.run(v=>appraiseMap(v,'v2'));assert.equal(registered.ok,true);s.load();
 assert.equal(s.get().specialMaps.registered[0].rarity,'SILVER');assert.equal('surveyedMask' in s.get().specialMaps.registered[0],false);
 s.fail('.current');assert.equal(s.run(v=>deleteRegisteredMap(v,registered.map.id)).ok,false);s.load();assert.equal(s.get().specialMaps.registered.length,1);
 s.fail('');assert.equal(s.run(v=>deleteRegisteredMap(v,registered.map.id)).ok,true);s.load();
 assert.equal(s.get().specialMaps.registered.length,0);
 assert.equal(s.run(v=>registerSharedMap(v,registered.map)).ok,true);s.load();
 const restored=s.get().specialMaps.registered[0];assert.equal(restored.acquisitionMethod,'shared');assert.equal(restored.discovererName,'†ルル');assert.equal(restored.level,50);assert.equal(restored.seed,12345);
});
test('real protected snapshot reload retains unidentified then appraised original',t=>{
 const s=setup(t);assert.equal(s.run(v=>discoverTestMap(v,{seed:()=>65535,id:()=> 'found'})).ok,true);
 s.load();assert.equal(s.get().specialMaps.unidentified[0].seed,65535);
 assert.equal(s.run(v=>appraiseMap(v,'found')).ok,true);s.load();
 assert.equal(s.get().specialMaps.unidentified.length,0);assert.equal(s.get().specialMaps.registered[0].discovererName,'†ルル');assert.equal(s.get().specialMaps.registered[0].seed,65535);
});
for(const failure of ['.temp','.backup','.current'])test(`save failure at ${failure} preserves unidentified in memory and on disk`,t=>{
 const s=setup(t);s.run(v=>discoverTestMap(v,{seed:()=>42,id:()=> 'found'}));const before=structuredClone(s.get());s.fail(failure);
 assert.equal(s.run(v=>appraiseMap(v,'found')).ok,false);assert.deepEqual(s.get(),before);s.load();assert.deepEqual(s.get(),before);
});
for(const failure of ['cleanup','event'])test(`post-commit ${failure} error does not roll back a committed appraisal`,t=>{
 const s=setup(t);s.run(v=>discoverTestMap(v,{seed:()=>42,id:()=> 'found'}));s.fail(failure);
 assert.equal(s.run(v=>appraiseMap(v,'found')).ok,true);s.load();assert.equal(s.get().specialMaps.registered.length,1);assert.equal(s.get().specialMaps.unidentified.length,0);
});

test('shared import, favorite and deletion survive real protected save reload',async t=>{
 const {registerSharedMap,toggleMapFavorite,deleteRegisteredMap,SPECIAL_MAP_RULESET}=await import('../data/special-maps.js');
 const s=setup(t),map={seed:123,rulesetVersion:SPECIAL_MAP_RULESET,discovererName:'ALC'};
 const added=s.run(v=>registerSharedMap(v,map));assert.equal(added.ok,true);s.load();
 assert.equal(s.get().specialMaps.registered[0].discovererName,'ALC');assert.equal(s.get().specialMaps.registered[0].acquisitionMethod,'shared');
 s.run(v=>toggleMapFavorite(v,added.map.id));s.load();assert.equal(s.get().specialMaps.registered[0].favorite,true);
 s.run(v=>toggleMapFavorite(v,added.map.id));s.fail('.current');
 assert.equal(s.run(v=>deleteRegisteredMap(v,added.map.id)).ok,false);s.load();assert.equal(s.get().specialMaps.registered.length,1);
 s.fail('');assert.equal(s.run(v=>deleteRegisteredMap(v,added.map.id)).ok,true);s.load();assert.equal(s.get().specialMaps.registered.length,0);
 assert.equal(s.run(v=>registerSharedMap(v,map)).ok,true);s.load();assert.equal(s.get().specialMaps.registered[0].favorite,false);
});
