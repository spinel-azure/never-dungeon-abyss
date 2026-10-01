import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {normalizeSpecialMaps,discoverTestMap,appraiseMap,registerSharedMap,deleteRegisteredMap,mapLayoutId,mapContentId,mapOriginalId,updateMapSurvey,describeTestMap} from '../data/special-maps.js';
import {generateRegisteredSpecialMap} from '../js/special-map/generator.js';
import {specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
import {createSpecialMapSession} from '../js/special-map/session.js';
import {checkV2KeyAccess} from './special-map-v2-structure-helper.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/special-map-v2-codes.json',import.meta.url)));
const original=(extra={})=>({rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'†ルル',...extra});
const empty=()=>normalizeSpecialMaps({discovererName:'スピネ'});

test('V2 candidate code fixtures and V1 pre-change strings stay byte-for-byte stable',()=>{
 for(const {map,code} of fixtures){
  assert.equal(encodeMapCode(map),code);assert.deepEqual(decodeMapCode(code).map,map);
  for(const prefix of ['NDA:','nda:','Nda:','NDA16:','nda16:']){
   const result=decodeMapCode(' \n'+code.replace('NDA:',prefix)+'\n');
   assert.equal(result.code,code);assert.deepEqual(result.map,map);
  }
 }
 const legacy=['NDA:AYAAAAMgIDDrMOvzl2Qs9hWlkQ','NDA:AYAAAQMgIDDrMOvxqfECBvHtpA','NDA:AYAwOQMgIDDrMOtw5yZa9ixMpw','NDA:AYD__wMgIDDrMOumCLHb8m3KeQ'];
 [0,1,12345,65535].forEach((seed,i)=>{
  const map={rulesetVersion:'phase2a-1',seed,discovererName:'†ルル'};
  assert.equal(encodeMapCode(map),legacy[i]);assert.deepEqual(decodeMapCode(legacy[i]).map,map);
 });
 // Formal V1's byte 1 was reserved, not issued by the pre-V2-A codec.
 assert.throws(()=>encodeMapCode(original({rulesetVersion:'special-map-v1'})));
});

test('V2 representative property roundtrips, signature lengths and owner data exclusion',()=>{
 for(let i=0;i<1024;i++){
  const map=original({seed:(i*4051)%65536,level:1+i%100,rarity:['WHITE','SILVER','GOLD'][i%3],discovererName:['A','†ル','†ルル','スピネル'][i%4]});
  const code=encodeMapCode(map);assert.deepEqual(decodeMapCode(code).map,map);assert.equal(encodeMapCode(decodeMapCode(code).map),code);
  assert.equal(encodeMapCode({...map,favorite:true,memo:'private',cleared:true,surveyedMasks:['f'.repeat(25)],activeSession:{}}),code);
 }
 assert.deepEqual([1,2,3,4].map(n=>encodeMapCode(original({discovererName:'漢'.repeat(n)})).length),[27,30,32,35]);
});

test('V2 malformed signed payloads, version mixing and all single-character tampering are rejected',()=>{
 const code=encodeMapCode(original()),bytes=Buffer.from(code.slice(4),'base64url'),body=bytes.subarray(0,-8);
 const sign=b=>'NDA:'+Buffer.concat([b,createHmac('sha256','NDA::SPECIAL-MAP-CODE::16BIT::2026::V2').update('map-original-v2:'+b.toString('base64url')).digest().subarray(0,8)]).toString('base64url');
 assert.equal(sign(body),code);
 for(const [offset,value] of [[0,0],[0,1],[0,3],[1,1],[1,128],[1,255],[4,0],[4,101],[4,255],[5,3],[5,255],[6,0],[6,5],[7,0],[8,0]]){
  const b=Buffer.from(body);b[offset]=value;assert.equal(decodeMapCode(sign(b)).ok,false,`${offset}:${value}`);
 }
 for(const b of [body.subarray(0,-1),Buffer.concat([body,Buffer.from([0])])])assert.equal(decodeMapCode(sign(b)).ok,false);
 for(let i=4;i<code.length;i++)for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')if(c!==code[i])assert.equal(decodeMapCode(code.slice(0,i)+c+code.slice(i+1)).ok,false);
 for(const extra of [{seed:-1},{seed:65536},{seed:NaN},{seed:1.2},{level:0},{level:101},{level:NaN},{level:1.2},{level:'1'},{rarity:'gold'},{rarity:undefined},{discovererName:'😀'},{discovererName:'ABCDE'}]){
  assert.throws(()=>encodeMapCode(original(extra)));
  assert.equal(normalizeSpecialMaps({registered:[original(extra)]}).registered.length,0);
 }
 assert.equal(decodeMapCode(code.slice(0,8)+' '+code.slice(8)).ok,false);
});

test('layout/content/original identities distinguish level, rarity, signatures and rulesets',()=>{
 const a=original(),b=original({discovererName:'ALC'}),c=original({level:51}),d=original({rarity:'GOLD'});
 assert.equal(mapOriginalId(a),mapOriginalId({...a}));
 assert.equal(mapContentId(a),mapContentId(b));assert.notEqual(mapOriginalId(a),mapOriginalId(b));
 for(const other of [c,d]){assert.equal(mapLayoutId(a),mapLayoutId(other));assert.notEqual(mapContentId(a),mapContentId(other));}
 assert.notEqual(mapLayoutId(a),mapLayoutId(original({rulesetVersion:'special-map-v1'})));
 assert.equal(mapOriginalId({rulesetVersion:'phase2a-1',seed:1,discovererName:'A'}),'["phase2a-1",1,"A"]');
});

test('mixed book, V2 duplicate before capacity, shared signature and deletion restore',()=>{
 let state=normalizeSpecialMaps({registered:[{rulesetVersion:'special-map-v1',seed:1,discovererName:'A'}]});
 let result=registerSharedMap(state,original());assert.equal(result.ok,true);state=result.state;
 assert.equal(result.map.discovererName,'†ルル');assert.equal(result.map.acquisitionMethod,'shared');
 assert.equal(registerSharedMap(state,original({discovererName:'ALC'})).needsConfirmation,true);
 state=registerSharedMap(state,original({discovererName:'ALC'}),{confirmSameContent:true}).state;
 for(let level=1;state.registered.length<10;level++)state=registerSharedMap(state,original({level})).state;
 state.registered[1]={...state.registered[1],memo:'keep',favorite:true,cleared:true};
 result=registerSharedMap(state,decodeMapCode(encodeMapCode(original()).replace('NDA:','nda:')).map);
 assert.equal(result.duplicate,true);assert.equal(result.map.memo,'keep');assert.equal(result.map.favorite,true);
 assert.equal(registerSharedMap(state,original({level:99})).ok,false);
 assert.equal(deleteRegisteredMap(state,result.map.id).ok,false);
 state.registered[1].favorite=false;state=deleteRegisteredMap(state,result.map.id).state;
 result=registerSharedMap(state,decodeMapCode(encodeMapCode(original())).map,{confirmSameContent:true});
 assert.equal(result.map.cleared,false);assert.equal(result.map.favorite,false);assert.equal(result.map.memo,'');
 assert.equal('surveyedMask' in result.map,false);assert.equal('surveyedMasks' in result.map,false);
 assert.equal(mapOriginalId(result.map),mapOriginalId(original()));
});

test('V2 acquisition/appraisal fixes parameters, shares limits and does not introduce survey',()=>{
 let state=empty();
 for(let i=0;i<3;i++)state=discoverTestMap(state,{seed:()=>i,id:()=>String(i),rulesetVersion:'special-map-v2',level:100,rarity:'GOLD'}).state;
 assert.equal(discoverTestMap(state,{seed:()=>{throw Error('must not draw');}}).ok,false);
 state=normalizeSpecialMaps(JSON.parse(JSON.stringify(state)));
 const result=appraiseMap(state,'0');assert.equal(result.ok,true);assert.equal(result.map.seed,0);assert.equal(result.map.level,100);assert.equal(result.map.rarity,'GOLD');
 assert.equal(result.map.discovererName,'スピネ');assert.equal(result.map.acquisitionMethod,'discovered');assert.equal('surveyedMask' in result.map,false);
 assert.equal(updateMapSurvey(result.state,result.map.id,'f'.repeat(25)).ok,false);
 assert.equal(describeTestMap(result.map).level,100);
 const full={...state,registered:Array.from({length:10},(_,seed)=>({...original({seed:100+seed}),id:mapOriginalId(original({seed:100+seed}))}))};
 assert.equal(appraiseMap(full,'0').ok,false);assert.equal(full.unidentified.length,3);
 full.registered[0]=result.map;assert.equal(appraiseMap(full,'0').duplicate,true);
});

test('old saves are not promoted and V2 cannot inherit single-floor survey or enter gameplay',()=>{
 const legacy={rulesetVersion:'phase2a-1',seed:5,discovererName:'A',surveyedMask:'f'.repeat(25)};
 const v2=original({surveyedMask:'f'.repeat(25),surveyComplete:true,floors:[{walls:'do not persist'}],activeSession:{},surveyedMasks:['f'.repeat(25)]});
 const state=normalizeSpecialMaps({registered:[legacy,v2]});
 assert.equal(state.registered[0].rulesetVersion,'phase2a-1');assert.equal(state.registered[0].surveyComplete,true);assert.equal('level' in state.registered[0],false);
 assert.equal('surveyedMask' in state.registered[1],false);assert.equal('surveyComplete' in state.registered[1],false);
 for(const key of ['floors','activeSession','surveyedMasks'])assert.equal(key in state.registered[1],false);
 assert.throws(()=>createSpecialMapSession(state.registered,mapOriginalId(v2)),/V2多層探索は準備中/);
 assert.deepEqual(normalizeSpecialMaps().registered,[]);
});

test('decoded V2 routes only to Candidate 3, reproduces layout independent of level/rarity/signature',()=>{
 for(const {map,code} of fixtures){
  const generated=generateRegisteredSpecialMap(decodeMapCode(code).map);
  assert.equal(generated.ruleset,'special-map-v2');assert.equal(generated.floors.length,3);
  checkV2KeyAccess(generated);
  if(map.seed===12345){
   assert.equal(specialMapV2StructureFingerprint(generated),'3519b715');
   assert.equal(generated.floors[2].keyChest.x,9);assert.equal(generated.floors[2].keyChest.y,8);
  }
 }
});
