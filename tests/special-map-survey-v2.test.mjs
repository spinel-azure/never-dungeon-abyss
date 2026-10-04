import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_SURVEY,surveyVisit,surveyCount} from '../data/special-map-survey.js';
import {normalizeSurveyMasks,surveyTotalV2,surveyCountsV2,surveyCompleteV2,surveyVisitV2} from '../data/special-map-survey-v2.js';
import {normalizeSpecialMaps,mapOriginalId,updateMapSurvey,transactSpecialMaps,deleteRegisteredMap,registerSharedMap} from '../data/special-maps.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {createSpecialMapV2Session,switchV2Floor} from '../js/special-map/session-v2.js';
import {actSpecialMap,updateSpecialMotion,flushSpecialSurvey,getSpecialAutoAvailability} from '../js/special-map/session.js';
const full='f'.repeat(25),empty=()=>Array(3).fill(EMPTY_SURVEY);
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'†ルル'};
const id=mapOriginalId(original);
function setup(masks=empty()){
 let character={hp:77,keyItems:{normal:true},specialMaps:normalizeSpecialMaps({registered:[{...original,surveyedMasks:masks}]})};
 let disk=JSON.stringify(character),fail=false,writes=0,timer;
 const options={scheduleSurvey:fn=>{timer=fn;return 1;},cancelSurvey:()=>{timer=null;},persistSurvey:masks=>transactSpecialMaps({getCharacter:()=>character,setCharacter:v=>character=v,save:()=>{writes++;if(fail)return false;disk=JSON.stringify(character);return true;}},state=>updateMapSurvey(state,id,masks))};
 const create=()=>createSpecialMapV2Session(character.specialMaps.registered,id,options);
 return {create,options,get character(){return character;},get writes(){return writes;},get disk(){return disk;},fail:v=>fail=v,tick:()=>timer?.(),reload:()=>{character=JSON.parse(disk);character.specialMaps=normalizeSpecialMaps(character.specialMaps);}};
}
function step(s){assert.equal(actSpecialMap(s,'up',0),true);updateSpecialMotion(s,1000);}
function maskExcept(point){const i=point.y*10+point.x,n=Math.floor(i/4),chars=[...full];chars[n]=(15^(1<<(i%4))).toString(16);return chars.join('');}

test('V2 mask normalization preserves valid floors and repairs missing/malformed masks independently',()=>{
 assert.deepEqual(normalizeSurveyMasks(),empty());
 assert.deepEqual(normalizeSurveyMasks('f'.repeat(75)),empty());
 assert.deepEqual(normalizeSurveyMasks([full,'z'.repeat(25),full.toUpperCase()]),[full,EMPTY_SURVEY,full]);
 assert.deepEqual(normalizeSurveyMasks([full,'f'.repeat(24)]),[full,EMPTY_SURVEY,EMPTY_SURVEY]);
 assert.deepEqual(normalizeSurveyMasks([full,full,full,full]),[full,full,full]);
 const maps=normalizeSpecialMaps({registered:[{...original,surveyedMask:full,surveyComplete:true}]});
 assert.deepEqual(maps.registered[0].surveyedMasks,empty());
 assert.equal('surveyComplete' in maps.registered[0],false);
});
for(const total of [0,1,100,200,299,300])test(`V2 derives ${total}/300 only from masks`,()=>{
 let masks=empty();for(let i=0;i<total;i++)masks=surveyVisitV2(masks,Math.floor(i/100),i%10,Math.floor(i%100/10));
 assert.equal(surveyTotalV2(masks),total);assert.equal(surveyCompleteV2(masks),total===300);
 assert.equal(surveyCountsV2(masks).reduce((a,b)=>a+b,0),total);
});
test('V2 visits are immutable, floor-specific, idempotent and validate coordinates',()=>{
 const initial=empty(),one=surveyVisitV2(initial,0,3,4);
 assert.equal(surveyTotalV2(initial),0);assert.equal(surveyTotalV2(one),1);
 assert.deepEqual(surveyVisitV2(one,0,3,4),one);
 assert.deepEqual(surveyCountsV2(surveyVisitV2(one,2,3,4)),[1,0,1]);
 for(const floor of [-1,3,NaN,1.1])assert.throws(()=>surveyVisitV2(one,floor,0,0));
 assert.throws(()=>surveyVisitV2(one,0,10,0));
});
test('entrance and successful moves update knowledge immediately, writes coalesce, runtime and torch stay independent',()=>{
 const h=setup(),s=h.create();assert.equal(s.totalSurveyed,1);assert.equal(h.writes,0);
 step(s);assert.equal(s.totalSurveyed,2);assert.equal(s.torchFuel,99);
 actSpecialMap(s,'down',1001);updateSpecialMotion(s,2000);
 assert.equal(s.totalSurveyed,2);assert.equal(s.torchFuel,98);assert.equal(h.writes,0);
 h.tick();assert.equal(h.writes,1);assert.equal(surveyTotalV2(h.character.specialMaps.registered[0].surveyedMasks),2);
 assert.ok(flushSpecialSurvey(s));assert.equal(h.writes,1);s.disposeSurvey();
});
test('stair arrivals count; three-floor return, serialization/reload and reentry retain knowledge only',()=>{
 const h=setup(),s=h.create();step(s);
 for(const link of s.blueprint.links){assert.ok(switchV2Floor(s,link.lower));step(s);}
 const counts=surveyCountsV2(s.surveyedMasks),fuel=s.torchFuel;
 s.bossKeyFound=true;s.bossDoorUnlocked=true;s.floors[2].chestOpened=true;
 assert.ok(switchV2Floor(s,s.blueprint.links[1].upper));assert.equal(s.torchFuel,fuel);
 assert.ok(switchV2Floor(s,s.blueprint.links[0].upper));
 assert.ok(counts.every(n=>n>=2));assert.ok(flushSpecialSurvey(s));s.disposeSurvey();
 const known=[...s.surveyedMasks];h.reload();const next=h.create();
 assert.deepEqual(next.surveyedMasks,known);assert.equal(next.currentFloor,0);assert.equal(next.torchFuel,100);
 assert.equal(next.bossKeyFound,false);assert.equal(next.bossDoorUnlocked,false);assert.equal(next.floors[2].chestOpened,false);
 assert.deepEqual(next.floors.map(f=>f.explored.flat().filter(Boolean).length),[1,0,0]);
 assert.ok(next.floors.every(f=>f.openedDoors.size===0));
 assert.equal(h.character.hp,77);assert.deepEqual(h.character.keyItems,{normal:true});next.disposeSurvey();
});
test('failed save rolls back character, retains dirty masks, blocks stairs, and retries without losing new cells',()=>{
 const h=setup(),before=h.character,s=h.create();h.fail(true);step(s);h.tick();
 assert.equal(h.character,before);assert.equal(s.totalSurveyed,2);assert.match(s.surveyError,/保存できません/);
 assert.equal(switchV2Floor(s,s.blueprint.links[0].lower),false);assert.equal(s.currentFloor,0);
 assert.equal(flushSpecialSurvey(s),false);h.fail(false);assert.ok(flushSpecialSurvey(s));
 assert.equal(s.surveyError,'');h.reload();assert.equal(surveyTotalV2(h.character.specialMaps.registered[0].surveyedMasks),2);
 assert.ok(switchV2Floor(s,s.blueprint.links[0].lower));assert.equal(s.totalSurveyed,3);s.disposeSurvey();
});
test('BOSS as final unvisited cell: real movement 299→300 commits and notifies exactly once without battle',()=>{
 const probe=setup().create(),boss=probe.blueprint.floors[2].bossRoom.bossCell,front=probe.blueprint.floors[2].bossRoom.cells[0];probe.disposeSurvey();
 const h=setup([full,full,maskExcept(boss)]),s=h.create();switchV2Floor(s,s.blueprint.links[1].lower);
 s.playerX=front.x;s.playerY=front.y;
 s.direction=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}].findIndex(d=>front.x+d.x===boss.x&&front.y+d.y===boss.y);
 assert.equal(s.totalSurveyed,299);step(s);assert.equal(s.totalSurveyed,300);assert.equal(s.surveyComplete,true);
 assert.equal(s.surveyCompletionPending,true);s.surveyCompletionPending=false;
 s.recordSurvey(boss.x,boss.y);flushSpecialSurvey(s);assert.equal(s.surveyCompletionPending,false);
 assert.equal(s.cells[boss.y][boss.x].bossId,undefined);
 s.disposeSurvey();h.reload();const next=h.create();assert.equal(next.surveyCompletionPending,false);
 for(let floor=0;floor<3;floor++){next.currentFloor=floor;assert.ok(next.surveyView.flat().every(Boolean));}
 assert.deepEqual(next.floors.map(f=>f.explored.flat().filter(Boolean).length),[1,0,0]);next.disposeSurvey();
});
test('ordinary final cell also completes; failed final commit defers notice until successful retry',()=>{
 const probe=setup().create(),p={x:probe.playerX,y:probe.playerY};probe.disposeSurvey();
 const h=setup([maskExcept(p),full,full]);h.fail(true);const s=h.create();
 assert.equal(s.totalSurveyed,300);assert.equal(s.surveyCompletionPending,false);assert.match(s.surveyError,/保存できません/);
 assert.equal(surveyTotalV2(h.character.specialMaps.registered[0].surveyedMasks),299);
 h.fail(false);assert.ok(s.flushSurvey());assert.equal(s.surveyCompletionPending,true);s.disposeSurvey();
});
test('all-known maps still use torch darkness and only persistent knowledge guides auto walking',()=>{
 const h=setup([full,full,full]),s=h.create();step(s);
 assert.equal(s.explored.flat().filter(Boolean).length,2);assert.ok(getSpecialAutoAvailability(s).accepted);
 const masks=[...s.surveyedMasks];s.renderState.torchFuel=0;
 assert.equal(s.renderState.torchFuel,0);assert.deepEqual(s.surveyedMasks,masks);
 s.renderState.torchFuel=100;assert.ok(s.surveyView.flat().every(Boolean));s.disposeSurvey();
});
test('auto walker may cross historically surveyed cells absent from runtime explored, never unknown cells',()=>{
 const h=setup([full,EMPTY_SURVEY,EMPTY_SURVEY]),s=h.create();
 s.playerX=s.generatedMap.stairsDown.x;s.playerY=s.generatedMap.stairsDown.y;
 const available=getSpecialAutoAvailability(s);assert.ok(available.accepted);assert.ok(available.path.length>1);
 assert.equal(s.explored.flat().filter(Boolean).length,1);
 assert.equal(s.totalSurveyed,100);s.disposeSurvey();
 const fresh=setup().create();fresh.playerX=fresh.generatedMap.stairsDown.x;fresh.playerY=fresh.generatedMap.stairsDown.y;
 assert.equal(getSpecialAutoAvailability(fresh).accepted,false);fresh.disposeSurvey();
});
test('V2 original identity isolates level, rarity and signature; V1 survey remains unchanged',()=>{
 const variants=[original,{...original,level:51},{...original,rarity:'GOLD'},{...original,discovererName:'別人'}];
 const v1={rulesetVersion:'phase2a-1',seed:12345,discovererName:'†ルル',surveyedMask:surveyVisit(EMPTY_SURVEY,4,4)};
 const state=normalizeSpecialMaps({registered:[...variants,v1]}),before=state.registered[4];
 const result=updateMapSurvey(state,id,[full,EMPTY_SURVEY,EMPTY_SURVEY]);
 assert.deepEqual(result.state.registered.slice(0,4).map(m=>surveyTotalV2(m.surveyedMasks)),[100,0,0,0]);
 assert.deepEqual(result.state.registered[4],before);assert.equal(surveyCount(before.surveyedMask),1);assert.equal('surveyedMasks' in before,false);
});
test('deletion and code re-registration erase knowledge; code does not serialize progress/runtime',()=>{
 const state=normalizeSpecialMaps({registered:[{...original,surveyedMasks:[full,full,full]}]});
 assert.equal(encodeMapCode(state.registered[0]),encodeMapCode(original));
 const deleted=deleteRegisteredMap(state,id);assert.equal(deleted.state.registered.length,0);
 const decoded=decodeMapCode(encodeMapCode(original)).map;assert.equal('surveyedMasks' in decoded,false);
 const registered=registerSharedMap(deleted.state,decoded);assert.deepEqual(registered.map.surveyedMasks,empty());
 assert.equal(registered.map.favorite,false);assert.equal(registered.map.cleared,false);
});
