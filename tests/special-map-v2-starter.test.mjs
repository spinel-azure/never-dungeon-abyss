import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSpecialMaps,appraiseMap,discoverTestMap,describeTestMap,registerSharedMap,transactSpecialMaps} from '../data/special-maps.js';
import {grantStarterMaps,grantTestStarterMaps,unidentifiedMapLabel} from '../data/special-map-starter.js';
import {describeV2MapName,V2_NAME_PREFIXES,V2_NAME_LOCATIONS} from '../data/special-map-names-v2.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {normalizeCharacter} from '../data/classes.js';
import {generateSpecialMapV2,specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
const empty=()=>normalizeSpecialMaps({discovererName:'†ルル'});
const original={rulesetVersion:'special-map-v2',seed:12345,level:1,rarity:'WHITE',discovererName:'†ルル'};

test('starter maps are three unique 16-bit WHITE originals, drawn once before appraisal',()=>{
 const values=[0,0,.5,.4,.999999,.999999];let draws=0;
 const result=grantStarterMaps(empty(),{random:()=>values[draws++],id:()=> 'fixture'});
 assert.equal(result.ok,true);assert.equal(draws,6);assert.deepEqual(result.maps.map(m=>m.seed),[0,32768,65535]);assert.deepEqual(result.maps.map(m=>m.level),[1,3,5]);
 assert.ok(result.maps.every(m=>m.rarity==='WHITE'&&m.discovererName==='†ルル'&&unidentifiedMapLabel(m)==='はじまりの白地図'));
 let state=normalizeSpecialMaps(JSON.parse(JSON.stringify(result.state)));
 assert.deepEqual(state.unidentified,result.maps);assert.equal(discoverTestMap(state).ok,false);
 assert.equal(grantStarterMaps(state,{random:()=>{throw Error('must not draw');}}).ok,false);
 for(const map of result.maps){const before=describeTestMap(map);const next=appraiseMap(state,map.discoveryId);assert.equal(next.ok,true);assert.equal(next.map.seed,map.seed);assert.equal(next.map.level,map.level);assert.equal(describeTestMap(next.map).name,before.name);state=normalizeSpecialMaps(JSON.parse(JSON.stringify(next.state)));}
 assert.equal(state.registered.length,3);assert.equal(state.unidentified.length,0);assert.equal(grantStarterMaps(state).ok,false);
 assert.equal(normalizeCharacter({specialMaps:state}).specialMaps.starterMapsGranted,true);
});

test('full or partially full unidentified inventory retains all three entitlements without drawing',()=>{
 for(const count of [1,2,3]){
  const state=empty();state.unidentified=Array.from({length:count},(_,i)=>({...original,seed:i,discoveryId:String(i)}));
  const before=structuredClone(state);assert.equal(grantStarterMaps(state,{random:()=>{throw Error('no draw');}}).ok,false);assert.deepEqual(state,before);
  for(const map of [...state.unidentified]){const result=appraiseMap(state,map.discoveryId);Object.assign(state,result.state);}
  const received=grantStarterMaps(state,{random:()=>0,id:()=> 'constant'});assert.equal(received.ok,true);assert.equal(received.maps.length,3);
  assert.equal(new Set(received.maps.map(m=>m.seed)).size,3);assert.ok(received.maps.every(m=>!state.registered.some(old=>old.seed===m.seed)));
 }
});

test('equal acquisition RNG intervals select each starter level without rarity changes',()=>{
 for(let n=0;n<5;n++){
  const r=grantStarterMaps(empty(),{random:()=>n/5+.01,id:()=> 'level'});
  assert.ok(r.maps.every(m=>m.level===n+1&&m.rarity==='WHITE'));
 }
});

test('grant transaction rollback preserves entitlement and maps, successful commit keeps flag and contents together',()=>{
 let character={specialMaps:empty()},saved=null,ok=false;
 const callbacks={getCharacter:()=>character,setCharacter:v=>character=v,save:()=>{if(ok)saved=JSON.stringify(character);return ok;}};
 const op=s=>grantStarterMaps(s,{random:()=>.25,id:()=> 'id'});
 assert.equal(transactSpecialMaps(callbacks,op).ok,false);assert.deepEqual(character.specialMaps,empty());
 ok=true;assert.equal(transactSpecialMaps(callbacks,op).ok,true);character=JSON.parse(saved);
 assert.equal(character.specialMaps.unidentified.length,3);assert.equal(transactSpecialMaps(callbacks,op).ok,false);
});

test('development grant never consumes the production entitlement, including after normalization/reload',()=>{
 const dev=grantTestStarterMaps(empty(),{random:()=>.2,id:()=> 'dev'});assert.equal(dev.ok,true);
 let state=normalizeSpecialMaps(JSON.parse(JSON.stringify(dev.state)));
 assert.equal(state.starterMapsGranted,undefined);assert.equal(state.starterMapsTestGranted,true);
 assert.equal(grantTestStarterMaps(state).ok,false);
 for(const map of [...state.unidentified])state=appraiseMap(state,map.discoveryId).state;
 const production=grantStarterMaps(state,{random:()=>.2,id:()=> 'prod'});
 assert.equal(production.ok,true);assert.equal(production.state.starterMapsGranted,true);assert.equal(production.state.starterMapsTestGranted,true);
 assert.equal(new Set([...state.registered,...production.maps].map(m=>m.seed)).size,6);
 assert.equal(grantStarterMaps(normalizeSpecialMaps()).ok,false);
 assert.equal(grantStarterMaps(empty(),{random:()=>NaN}).ok,false);
});

test('naming fixtures cover every level band boundary and exclude rarity/signature',()=>{
 for(const {map,name} of JSON.parse(readFileSync(new URL('./fixtures/special-map-v2-names.json',import.meta.url))))assert.equal(describeV2MapName(map).name,name);
 const levels=[1,20,21,40,41,60,61,80,81,100],prefixes=['朽ちかけた','朽ちかけた','彷徨う','彷徨う','荒れ果てた','荒れ果てた','猛威の','猛威の','滅びの','滅びの'];
 for(let i=0;i<levels.length;i++)for(const rarity of ['WHITE','SILVER','GOLD']){
  const map={...original,level:levels[i],rarity,discovererName:'別人'},info=describeV2MapName(map);
  assert.equal(info.name,`${prefixes[i]}晶宮の地図 Lv.${levels[i]}`);assert.equal(info.themeId,'crystal');
  const decoded=decodeMapCode(encodeMapCode({...map,surveyedMasks:['f'.repeat(25),'f'.repeat(25),'f'.repeat(25)]})).map;
  assert.equal(describeV2MapName(decoded).name,info.name);assert.equal(decoded.surveyedMasks,undefined);
  assert.deepEqual(registerSharedMap(empty(),decoded).map.surveyedMasks,['0'.repeat(25),'0'.repeat(25),'0'.repeat(25)]);
 }
 for(const bad of [{seed:-1},{seed:65536},{seed:NaN},{level:0},{level:101},{level:'1'},{rarity:'OTHER'},{rulesetVersion:'special-map-v1'}])assert.throws(()=>describeV2MapName({...original,...bad}),RangeError);
});

test('V2 vocabulary has no duplicated or prohibited prefixes, no shared location words',()=>{
 const forbidden=['うす暗き','薄暗き','ちいさな','小さな','はかなき','儚き','ざわめく','ゆらめく','ねむれる','眠れる','怒れる','呪われし','けだかき','気高き','放たれし','わななく','残された','あらぶる','荒ぶる','大いなる','とどろく','轟く','見えざる'];
 for(const words of V2_NAME_PREFIXES){assert.equal(new Set(words).size,words.length);assert.ok(words.every(word=>!forbidden.includes(word)));}
 const words=Object.values(V2_NAME_LOCATIONS).flat();assert.equal(new Set(words).size,words.length);
});

test('naming consumes independent streams and leaves Candidate 3 untouched',()=>{
 const before=generateSpecialMapV2({ruleset:'special-map-v2',seed:12345,level:1,rarity:'WHITE'});
 for(let level=1;level<=100;level++)describeV2MapName({...original,level});
 assert.deepEqual(generateSpecialMapV2({ruleset:'special-map-v2',seed:12345,level:1,rarity:'WHITE'}),before);
 assert.equal(specialMapV2StructureFingerprint(before),'3519b715');
});
