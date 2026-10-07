import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {normalizeSpecialMaps,registerSharedMap,mapContentId,mapOriginalId,mapLayoutId,describeTestMap,updateMapSurvey,toggleMapFavorite,deleteRegisteredMap} from '../data/special-maps.js';
import {generateRegisteredSpecialMap} from '../js/special-map/generator.js';
import {specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {describeSpecialThemeMapName} from '../js/special-map/special-themes-v2.js';
import {generateV2EcologyCandidate2} from '../js/special-map/ecology-v2-candidate-2.js';
import {resolveSpecialThemeBoss} from '../data/karte-special-bosses.js';
import {prepareNormalBossImage} from '../js/special-map/normal-boss-presentation.js';
import {isV2EncounterCell} from '../js/special-map/encounter-v2.js';
const map=(extra={})=>({rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'†ルル',...extra});
const themes=['gold','rice','dusk','tender'];
const sign=(body,version=3)=>'NDA:'+Buffer.concat([body,createHmac('sha256',`NDA::SPECIAL-MAP-CODE::16BIT::2026::V${version}`).update(`map-original-v${version}:`+body.toString('base64url')).digest().subarray(0,8)]).toString('base64url');

test('Format 3 fixed fixtures, independent HMAC, enum, prefixes and owner-state exclusion',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/special-map-format3-codes.json',import.meta.url)));
 for(const {map:m,code,name,bossId} of fixtures){assert.equal(encodeMapCode(m),code);assert.deepEqual(decodeMapCode(code).map,m);assert.equal(describeTestMap(m).name,name);assert.equal(resolveSpecialThemeBoss(m.themeOverride,m.level).id,bossId);}
 for(const themeOverride of themes)for(const seed of [0,1,12345,65535])for(const rarity of ['WHITE','SILVER','GOLD'])for(const discovererName of ['A','†ル','†ルル','スピネル']){
  const m=map({themeOverride,seed,rarity,discovererName}),code=encodeMapCode(m),bytes=Buffer.from(code.slice(4),'base64url');
  assert.equal(bytes[0],3);assert.equal(bytes[1],2);assert.equal(bytes[6],themes.indexOf(themeOverride));assert.equal(sign(bytes.subarray(0,-8)),code);
  assert.deepEqual(decodeMapCode(code).map,m);
  for(const prefix of ['NDA:','nda:','Nda:','NDA16:','nda16:'])assert.deepEqual(decodeMapCode(prefix+code.slice(4)),{ok:true,map:m,code});
  assert.equal(encodeMapCode({...m,favorite:true,surveyedMasks:Array(3).fill('f'.repeat(25)),cleared:true,memo:'secret',runtime:{}}),code);
 }
 assert.deepEqual([1,2,3,4].map(n=>encodeMapCode(map({themeOverride:'gold',discovererName:'A'.repeat(n)})).length),[28,31,34,36]);
});

test('Format 3 rejects malformed/authenticated invalid payloads and cross-domain tags',()=>{
 const code=encodeMapCode(map({themeOverride:'gold'})),body=Buffer.from(code.slice(4),'base64url').subarray(0,-8);
 for(const [offset,value] of [[0,0],[0,4],[1,1],[1,128],[4,0],[4,59],[4,101],[5,3],[6,4],[6,255],[7,0],[7,5],[8,0],[9,0]]){
  const b=Buffer.from(body);b[offset]=value;assert.equal(decodeMapCode(sign(b)).ok,false,`${offset}:${value}`);
 }
 assert.equal(decodeMapCode(sign(body,2)).ok,false);
 for(const b of [body.subarray(0,-1),Buffer.concat([body,Buffer.from([0])])])assert.equal(decodeMapCode(sign(b)).ok,false);
 for(let i=4;i<code.length;i++)for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')if(c!==code[i])assert.equal(decodeMapCode(code.slice(0,i)+c+code.slice(i+1)).ok,false);
 for(const bad of [code+'=',code+'!',code.toLowerCase(),code.slice(0,-1),code.slice(0,9)+' '+code.slice(9)])assert.equal(decodeMapCode(bad).ok,false);
 for(const extra of [{themeOverride:'slate'},{themeOverride:''},{themeOverride:'unknown'},{themeOverride:0},{level:59},{level:101},{level:NaN},{level:'100'},{seed:-1},{seed:65536},{seed:1.5},{rarity:'gold'},{discovererName:'ABCDE'},{discovererName:'😀'},{rulesetVersion:'phase2a-1'}]){
  const m=map({themeOverride:'gold',...extra});assert.throws(()=>encodeMapCode(m));assert.equal(normalizeSpecialMaps({registered:[m]}).registered.length,0);
 }
 for(const themeOverride of themes.slice(1)){assert.throws(()=>encodeMapCode(map({themeOverride,level:79})));assert.ok(decodeMapCode(encodeMapCode(map({themeOverride,level:80}))).ok);}
});

test('Format 2 identity stays exact; theme splits originals; save, limits, favorite and survey remain local',()=>{
 const normal=map();assert.equal(mapContentId(normal),'["special-map-v2",12345,100,"WHITE"]');
 assert.equal(mapOriginalId(normal),'["special-map-v2",12345,100,"WHITE","†ルル"]');
 let state=normalizeSpecialMaps();
 for(const themeOverride of [undefined,...themes]){
  const m=map(themeOverride?{themeOverride}:{});const r=registerSharedMap(state,decodeMapCode(encodeMapCode(m)).map);assert.ok(r.ok);assert.ok(!r.duplicate);state=r.state;
  assert.equal(mapLayoutId(m),mapLayoutId(normal));assert.equal(mapContentId(m),mapContentId({...m,discovererName:'ALC'}));assert.notEqual(mapOriginalId(m),mapOriginalId({...m,discovererName:'ALC'}));
 }
 assert.equal(new Set(state.registered.map(mapContentId)).size,5);
 const gold=state.registered[1],masks=['f'.repeat(25),'1'+'0'.repeat(24),'0'.repeat(25)];
 state=updateMapSurvey(state,gold.id,masks).state;state=toggleMapFavorite(state,gold.id).state;
 state=normalizeSpecialMaps(JSON.parse(JSON.stringify(state)));assert.deepEqual(state.registered[1].surveyedMasks,masks);assert.ok(state.registered[1].favorite);
 assert.equal(registerSharedMap(state,map({themeOverride:'gold',discovererName:'ALC'})).needsConfirmation,true);
 while(state.registered.length<10)state=registerSharedMap(state,map({seed:state.registered.length})).state;
 const duplicate=registerSharedMap(state,map({themeOverride:'gold'}));assert.ok(duplicate.duplicate);assert.ok(duplicate.map.favorite);assert.equal(registerSharedMap(state,map({seed:42})).ok,false);
 assert.equal(deleteRegisteredMap(state,gold.id).ok,false);state=toggleMapFavorite(state,gold.id).state;state=deleteRegisteredMap(state,gold.id).state;
 const restored=registerSharedMap(state,decodeMapCode(encodeMapCode(gold)).map);assert.ok(restored.ok);assert.equal(restored.map.themeOverride,'gold');assert.equal(restored.map.favorite,false);assert.deepEqual(restored.map.surveyedMasks,Array(3).fill('0'.repeat(25)));
 assert.equal(normalizeSpecialMaps({unidentified:themes.map(themeOverride=>map({themeOverride}))}).unidentified.length,3);
});

test('registered special maps preserve structure, name, ecology, fixed boss and original images',async()=>{
 const normal=generateRegisteredSpecialMap(map());assert.equal(specialMapV2StructureFingerprint(normal),'3519b715');
 for(const themeOverride of themes){
  const original=decodeMapCode(encodeMapCode(map({themeOverride}))).map,generated=generateRegisteredSpecialMap(original);
  assert.deepEqual(generated.links,normal.links);
  for(let i=0;i<3;i++){
   assert.equal(generated.floors[i].themeId,themeOverride);
   const {themeId:a,...ga}=generated.floors[i],{themeId:b,...gb}=normal.floors[i];assert.deepEqual(ga,gb);
  }
  assert.equal(describeTestMap(original).name,describeSpecialThemeMapName({...original,ruleset:original.rulesetVersion,themeId:themeOverride}).name);
  let starts=0,context=null;const s=createSpecialMapV2Session([original],mapOriginalId(original),{persistSurvey:()=>({ok:true}),onBossEncounter:(_s,_b,c)=>{starts++;context=c;}});
  try{
   assert.deepEqual(s.ecology,generateV2EcologyCandidate2({ruleset:s.ruleset,seed:s.seed,level:s.level,rarity:s.rarity,themeId:themeOverride}));
   s.currentFloor=2;const boss=resolveSpecialThemeBoss(themeOverride,s.level);assert.equal(s.getBossRenderState().definition.image,boss.image);
   let transforms=0;
   assert.equal(await prepareNormalBossImage(boss,{}, {load:async()=>({}),prepare:()=>{transforms++;return null;}}),boss.image);
   assert.equal(transforms,0);
   const p=s.generatedMap.bossRoom.bossCell;s.playerX=p.x;s.playerY=p.y;s.bossKeyFound=s.bossDoorUnlocked=true;s.recordSurvey(p.x,p.y);s.onBossCell();
   assert.equal(starts,1);
   if(context){assert.equal(context.contentId,mapContentId(original));assert.equal(context.bossId,boss.id);assert.equal(context.themeId,themeOverride);}
  }finally{s.disposeSurvey();}
 }
});

test('ordinary battle context keeps Format 3 identity on each floor',()=>{
 for(const themeOverride of themes)for(const floor of [0,1,2]){
  const original=map({themeOverride});let context;
  const s=createSpecialMapV2Session([original],mapOriginalId(original),{random:()=>0,persistSurvey:()=>({ok:true}),onEncounter:(_s,_e,c)=>{context=c;}});
  try{
   s.currentFloor=floor;
   for(let i=0;i<100;i++){s.playerX=i%10;s.playerY=Math.floor(i/10);if(isV2EncounterCell(s))break;}
   s.presence=99;assert.equal(s.onEncounterStep(),true);
   assert.equal(context.contentId,mapContentId(original));assert.equal(context.mapKey,mapOriginalId(original));assert.equal(context.themeId,themeOverride);assert.equal(context.floorIndex,floor);
   assert.ok(s.ecology.floors[floor].species.some(x=>x.id===context.speciesId));
  }finally{s.disposeSurvey();}
 }
});
