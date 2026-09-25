import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {encodeMapCode,decodeMapCode,MAP_CODE_PREFIX} from '../data/special-map-code.js';
import {SPECIAL_MAP_RULESET,normalizeSpecialMaps,registerSharedMap,deleteRegisteredMap,toggleMapFavorite,describeTestMap,transactSpecialMaps} from '../data/special-maps.js';
const original=(seed=65535,name='†ルル')=>({rulesetVersion:SPECIAL_MAP_RULESET,seed,discovererName:name});
const payload=code=>Buffer.from(code.slice(MAP_CODE_PREFIX.length),'base64url');
const forged=body=>MAP_CODE_PREFIX+Buffer.concat([body,createHmac('sha256','NDA::SPECIAL-MAP-CODE::16BIT::2026::V1').update('map-original-v1:'+body.toString('base64url')).digest().subarray(0,8)]).toString('base64url');
test('code is canonical, bounded, preserves every original field and excludes owner metadata',()=>{
 for(const seed of [0,1,32768,65535])for(const name of ['A','ALC','†ルル','スピネル']){
  const map=original(seed,name),code=encodeMapCode(map);assert.ok(code.length<=34);
  assert.deepEqual(decodeMapCode(code).map,map);
  assert.equal(encodeMapCode({...map,cleared:true,favorite:true,memo:'secret',acquisitionMethod:'shared'}),code);
  assert.equal(decodeMapCode(' \n'+code.slice(0,9)+'\r\n'+code.slice(9)+'\t').code,code);
  assert.equal(forged(payload(code).subarray(0,-8)),code,'independent Node HMAC agrees');
 }
});
test('URL alphabet hyphens and underscores are real data; every single-character mutation is rejected',()=>{
 let found=false;
 for(let seed=0;seed<1000;seed++){
  const code=encodeMapCode(original(seed));if(!code.includes('-')||!code.includes('_'))continue;
  found=true;assert.equal(decodeMapCode(code).ok,true);
  for(let i=MAP_CODE_PREFIX.length;i<code.length;i++)for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'){
   if(c!==code[i])assert.equal(decodeMapCode(code.slice(0,i)+c+code.slice(i+1)).ok,false);
  }break;
 }assert.ok(found);
});
test('reject malformed format, unsupported versions, invalid signature and out of range seed',()=>{
 const code=encodeMapCode(original());
 for(const invalid of ['',code+'=',code.replace(':','-'),code.toLowerCase(),code+'!',code.slice(0,-1),'NDA1:'+code,code.replace('NDA16:','NDA16:\u200b')])assert.equal(decodeMapCode(invalid).ok,false);
 for(const [offset,value] of [[0,2],[1,1],[4,5],[5,0],[6,0]]){
  const body=payload(code).subarray(0,-8);body[offset]=value;assert.equal(decodeMapCode(forged(body)).ok,false);
 }
 for(const seed of [-1,65536,1.5,NaN])assert.throws(()=>encodeMapCode(original(seed)));
 assert.throws(()=>encodeMapCode(original(0,'😀')));
});
test('cross-save import, full duplicate preservation, same-content confirmation and deletion restore',()=>{
 const code=encodeMapCode(original()),decoded=decodeMapCode(code).map;
 let state=normalizeSpecialMaps({discovererName:'スピネ'});
 let r=registerSharedMap(state,decoded);state=r.state;assert.equal(r.map.discovererName,'†ルル');assert.equal(r.map.acquisitionMethod,'shared');
 const info=describeTestMap(r.map),id=r.map.id;
 state.registered[0]={...r.map,cleared:true,memo:'keep',favorite:true};
 while(state.registered.length<10)state=registerSharedMap(state,original(state.registered.length)).state;
 r=registerSharedMap(state,decoded);assert.equal(r.duplicate,true);assert.equal(r.map.memo,'keep');assert.equal(r.map.favorite,true);assert.equal(r.map.cleared,true);
 assert.equal(registerSharedMap(state,original(42)).ok,false);
 assert.equal(deleteRegisteredMap(state,id).ok,false);
 state=toggleMapFavorite(state,id).state;state=deleteRegisteredMap(state,id).state;
 r=registerSharedMap(state,decoded);assert.equal(r.map.cleared,false);assert.equal(r.map.memo,'');assert.deepEqual(describeTestMap(r.map),info);
 state=normalizeSpecialMaps({registered:[original()]});assert.equal(registerSharedMap(state,original(65535,'ALC')).needsConfirmation,true);
 r=registerSharedMap(state,original(65535,'ALC'),{confirmSameContent:true});assert.equal(r.state.registered.length,2);
 assert.equal(normalizeSpecialMaps(JSON.parse(JSON.stringify(r.state))).registered[1].acquisitionMethod,'shared');
});
test('failed import/delete/favorite saves preserve complete previous character',()=>{
 const initial={name:'hero',specialMaps:normalizeSpecialMaps({registered:[original()]})};let character=initial;
 for(const operation of [state=>registerSharedMap(state,original(2)),state=>deleteRegisteredMap(state,state.registered[0].id),state=>toggleMapFavorite(state,state.registered[0].id)]){
  const result=transactSpecialMaps({getCharacter:()=>character,setCharacter:v=>character=v,save:()=>false},operation);
  assert.equal(result.ok,false);assert.equal(character,initial);
 }
});
