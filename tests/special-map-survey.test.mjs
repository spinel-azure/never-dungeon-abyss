import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_SURVEY,normalizeSurveyMask,surveyCount,surveyVisit,surveyGrid} from '../data/special-map-survey.js';
import {normalizeSpecialMaps,mapOriginalId,updateMapSurvey,transactSpecialMaps,deleteRegisteredMap,registerSharedMap} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {createSpecialMapSession,actSpecialMap,updateSpecialMotion,openSpecialDoorAhead,flushSpecialSurvey} from '../js/special-map/session.js';
const original={rulesetVersion:'phase2a-1',seed:12345,discovererName:'†ルル'},key=mapOriginalId(original);
function setup(){let character={normal:{depth:20,torch:77,explored:[1]},specialMaps:normalizeSpecialMaps({registered:[original]})},disk=JSON.stringify(character),fail=false;
 const persistSurvey=mask=>transactSpecialMaps({getCharacter:()=>character,setCharacter:c=>character=c,save:()=>{if(fail)return false;disk=JSON.stringify(character);return true;}},state=>updateMapSurvey(state,key,mask));
 return {create:()=>createSpecialMapSession(character.specialMaps.registered,key,{persistSurvey}),character:()=>character,disk:()=>disk,fail:v=>fail=v,reload:()=>{character=JSON.parse(disk);character.specialMaps=normalizeSpecialMaps(character.specialMaps);}};}
function move(s,d){while(s.direction!==d){assert.ok(actSpecialMap(s,'right',0));updateSpecialMotion(s,170);}if(openSpecialDoorAhead(s,0))updateSpecialMotion(s,520);assert.ok(actSpecialMap(s,'up',0));updateSpecialMotion(s,170);}
function routeAll(s){const visited=new Set(),route=[];function visit(i){visited.add(i);for(let d=0;d<4;d++)if(!s.generatedMap.walls[i][d]){const j=i+[-10,1,10,-1][d];if(!visited.has(j)){route.push(d);visit(j);route.push((d+2)%4);}}}visit(s.playerY*10+s.playerX);return route;}
test('survey mask validates old/corrupt saves and derives completion rather than trusting flags',()=>{
 for(const bad of [null,'',[],{},'f'.repeat(24),'g'.repeat(25)])assert.equal(normalizeSurveyMask(bad),EMPTY_SURVEY);
 assert.equal(surveyCount('f'.repeat(25)),100);assert.equal(surveyGrid('f'.repeat(25)).flat().filter(Boolean).length,100);
 const state=normalizeSpecialMaps({registered:[{...original,surveyComplete:true}]});assert.equal(state.registered[0].surveyComplete,false);assert.equal(state.registered[0].surveyedMask,EMPTY_SURVEY);
 assert.throws(()=>surveyVisit('',10,0));
});
test('actual walk surveys 100 unique cells, exit is not terminal, completion transitions once',()=>{
 const f=setup(),s=f.create();assert.equal(s.surveyedCount,1);let notices=0,exitSeen=false;
 for(const d of routeAll(s)){
  const old=s.surveyedCount;move(s,d);assert.ok(s.surveyedCount===old||s.surveyedCount===old+1);
  if(s.exitReached){exitSeen=true;assert.ok(s.surveyedCount<=100);}
  if(s.surveyCompletionPending){notices++;s.surveyCompletionPending=false;}
 }
 assert.ok(exitSeen);assert.equal(notices,1);assert.equal(s.surveyComplete,true);assert.equal(s.surveyedCount,100);assert.equal(s.explored.flat().filter(Boolean).length,100);
 assert.equal(f.character().specialMaps.registered[0].surveyComplete,true);assert.deepEqual(f.character().normal,{depth:20,torch:77,explored:[1]});
 f.reload();const again=f.create();assert.equal(again.surveyedCount,100);assert.equal(again.surveyCompletionPending,false);assert.equal(again.surveyView.flat().filter(Boolean).length,100);assert.equal(again.explored.flat().filter(Boolean).length,1);assert.equal(again.openedDoors.size,0);assert.deepEqual(again.doorLayout,s.doorLayout);
});
test('63 cells survive snapshot reload and reentry while position and door state reset',()=>{
 const f=setup(),s=f.create();for(const d of routeAll(s)){move(s,d);if(s.surveyedCount===63)break;}
 assert.equal(s.surveyedCount,63);assert.ok(flushSpecialSurvey(s));f.reload();const next=f.create();assert.equal(next.surveyedCount,63);assert.equal(next.explored.flat().filter(Boolean).length,1);assert.equal(next.playerX,next.generatedMap.entrance.x);assert.equal(next.openedDoors.size,0);
 assert.ok(!f.disk().includes('openedDoors'));assert.ok(!f.disk().includes('walls'));assert.ok(!f.disk().includes('playerX'));
});
test('opening doors does not survey the neighboring cell',()=>{
 const f=setup(),s=f.create(),d=s.doorLayout.doors[0];s.playerX=d.x;s.playerY=d.y;s.direction=d.dir==='E'?1:2;
 const before=s.surveyedCount;assert.ok(openSpecialDoorAhead(s,0));updateSpecialMotion(s,520);assert.equal(s.surveyedCount,before);
});
test('failed saves preserve registered map and committed mask, retry saves pending visits',()=>{
 const f=setup(),s=f.create(),before=f.disk();f.fail(true);const d=s.generatedMap.walls[s.playerY*10+s.playerX].findIndex(w=>!w);move(s,d);
 assert.equal(f.disk(),before);assert.equal(s.surveyedCount,1);assert.ok(s.surveyError);assert.equal(flushSpecialSurvey(s),false);assert.equal(f.character().specialMaps.registered.length,1);
 f.fail(false);assert.equal(flushSpecialSurvey(s),true);assert.equal(s.surveyedCount,2);assert.equal(s.surveyError,'');f.reload();assert.equal(f.create().surveyedCount,2);
});
test('shared code excludes survey; deletion and reimport reset it; original signatures isolate knowledge',()=>{
 const code=encodeMapCode(original);let state=normalizeSpecialMaps({registered:[original,{...original,discovererName:'ALC'}]});state=updateMapSurvey(state,key,'f'.repeat(25)).state;
 assert.equal(encodeMapCode(state.registered[0]),code);assert.equal(surveyCount(state.registered[1].surveyedMask),0);
 const duplicate=registerSharedMap(state,decodeMapCode(code).map);assert.equal(surveyCount(duplicate.map.surveyedMask),100);
 state=deleteRegisteredMap(state,key).state;const imported=registerSharedMap(state,decodeMapCode(code).map,{confirmSameContent:true});assert.ok(imported.ok);assert.equal(surveyCount(imported.map.surveyedMask),0);
 const s=createSpecialMapSession(imported.state.registered,key);assert.equal(s.surveyedCount,1);
});
