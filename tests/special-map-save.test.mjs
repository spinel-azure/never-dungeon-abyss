import test from 'node:test';
import assert from 'node:assert/strict';
import {writeGame,loadGame} from '../js/save-data.js';
import {normalizeSpecialMaps,setMapSignature,discoverTestMap,appraiseMap,transactSpecialMaps} from '../data/special-maps.js';

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
