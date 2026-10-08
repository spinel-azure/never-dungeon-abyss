import test from 'node:test';
import assert from 'node:assert/strict';
import {writeGame,loadGame} from '../js/save-data.js';
import {normalizeCharacter} from '../data/classes.js';
import {normalizeSpecialMaps,mapContentId,mapOriginalId,transactSpecialMaps,appraiseMap,deleteRegisteredMap,registerSharedMap} from '../data/special-maps.js';
import {prepareMapBossReward,confirmMapBossVictory,receiveMapBossReward,hasPendingMapReward,normalizeBossReward} from '../data/special-map-rewards.js';
import {NORMAL_MAP_THEMES} from '../data/special-map-themes.js';
import {surveyTotalV2} from '../data/special-map-survey-v2.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'原作者'};
const book=(map=original)=>normalizeSpecialMaps({discovererName:'発見者',registered:[map]});
const context=(map=original)=>({source:'special-map-v2-boss',themeId:'crystal',mapKey:mapOriginalId(map),contentId:mapContentId(map),mapSeed:map.seed,mapLevel:map.level,rarity:map.rarity,expeditionId:crypto.randomUUID(),battleUuid:crypto.randomUUID()});
const prepare=(state,c)=>prepareMapBossReward(state,c,{random:()=>.42});
const reload=state=>normalizeCharacter({specialMaps:JSON.parse(JSON.stringify(state))}).specialMaps;

test('each ordinary theme awards one map per expedition; duplicate cloned callbacks and stale prior IDs award nothing',()=>{
 for(const themeId of NORMAL_MAP_THEMES){
  let state=book();const first=context();first.themeId=themeId;
  state=prepare(state,first).state;state=reload(confirmMapBossVictory(state,structuredClone(first)).state);
  const fixed=structuredClone(state.bossReward.map);
  assert.equal(state.bossClears[first.contentId],true);assert.equal(state.registered[0].cleared,true);
  assert.deepEqual(confirmMapBossVictory(state,structuredClone(first)).state,state);
  state=reload(receiveMapBossReward(state).state);
  assert.equal(state.unidentified.length,1);assert.deepEqual(state.unidentified[0],fixed);
  assert.equal(receiveMapBossReward(state).ok,false);
  state=confirmMapBossVictory(state,structuredClone(first)).state;assert.equal(hasPendingMapReward(state),false);
  const second=context();second.themeId=themeId;state=prepare(state,second).state;
  assert.equal(confirmMapBossVictory(state,first).ok,false);
  state=confirmMapBossVictory(state,second).state;state=receiveMapBossReward(state).state;
  assert.equal(state.unidentified.length,2);assert.notEqual(state.unidentified[0].discoveryId,state.unidentified[1].discoveryId);
 }
});

test('full unidentified inventory retains pending reward, blocks replacement, and receives after appraisal',()=>{
 let state=book();state.unidentified=Array.from({length:3},(_,i)=>({...original,seed:i,discoveryId:`owned-${i}`}));
 const c=context();state=confirmMapBossVictory(prepare(state,c).state,c).state;
 const before=structuredClone(state);assert.equal(receiveMapBossReward(state).ok,false);
 assert.equal(prepare(state,context()).ok,false);assert.deepEqual(state,before);
 state=reload(state);state=appraiseMap(state,'owned-0').state;
 const received=receiveMapBossReward(state);assert.equal(received.ok,true);assert.equal(received.state.unidentified.length,3);
 assert.deepEqual(received.map,before.bossReward.map);assert.equal(hasPendingMapReward(reload(received.state)),false);
});

test('source rarity sets level only; all WHITE increments and exact 94/5/1 result rarity intervals',()=>{
 for(const rarity of ['WHITE','SILVER','GOLD'])for(const level of [1,90,100])for(let step=0;step<5;step++){
  const map={...original,rarity,level},c=context(map),values=[.2,(step+.5)/5,.95];let n=0;
  const state=prepareMapBossReward(book(map),c,{random:()=>values[n++]}).state;
  const result=confirmMapBossVictory(state,c).reward;
  assert.equal(result.level,Math.min(100,level+(rarity==='WHITE'?step+1:rarity==='SILVER'?10:20)));
  assert.equal(result.rarity,'SILVER');assert.equal(result.discovererName,'発見者');assert.equal(result.themeOverride,undefined);
  assert.deepEqual(decodeMapCode(encodeMapCode(result)).map,{rulesetVersion:result.rulesetVersion,seed:result.seed,level:result.level,rarity:result.rarity,discovererName:result.discovererName});
 }
 const counts={WHITE:0,SILVER:0,GOLD:0};
 for(let roll=0;roll<100;roll++){const c=context(),values=[.2,.1,(roll+.5)/100];let n=0;
  const s=prepareMapBossReward(book(),c,{random:()=>values[n++]}).state;counts[confirmMapBossVictory(s,c).reward.rarity]++;}
 assert.deepEqual(counts,{WHITE:94,SILVER:5,GOLD:1});
});

test('seed collision advances with wrap and never changes the generator; input originals remain untouched',()=>{
 const map={...original,seed:65535};const c=context(map),s=book(map);s.unidentified=[{...original,seed:0,discoveryId:'zero'}];
 const before=structuredClone(s);const prepared=prepareMapBossReward(s,c,{random:()=>.999999});
 assert.equal(prepared.state.bossReward.lottery.seed,1);assert.deepEqual(s,before);
});

test('special four themes, wrong IDs and missing signatures cannot prepare ordinary map rewards',()=>{
 for(const themeId of ['gold','rice','dusk','tender'])for(const source of ['special-map-v2-special-boss','special-map-v2-boss'])assert.equal(prepare(book(),{...context(),themeId,source}).ok,false);
 assert.equal(prepare({...book(),discovererName:''},context()).ok,false);
 assert.equal(prepare(book(),{...context(),battleUuid:1}).ok,false);
 assert.equal(prepare(book(),{...context(),contentId:'wrong'}).ok,false);
 assert.equal(prepareMapBossReward(book(),context(),{random:()=>NaN}).ok,false);
});

test('normalization retains strict reward originals and prepared inputs through save/NG+ character normalization',()=>{
 const c=context();let s=prepare(book(),c).state;assert.deepEqual(reload(s),s);
 const expected=confirmMapBossVictory(s,c).reward;
 s=reload(s);assert.deepEqual(prepareMapBossReward(s,c,{random:()=>{throw Error('reroll');}}).state,s);
 s=confirmMapBossVictory(s,c).state;assert.deepEqual(reload(s).bossReward.map,expected);
 for(const bad of [null,{...s.bossReward,battleUuid:'1'},{...s.bossReward,map:{...s.bossReward.map,seed:44}},{...s.bossReward,lottery:{...s.bossReward.lottery,rarityRoll:100}}])assert.equal(normalizeBossReward(bad),null);
});

test('clear, current survey and future claims remain independent; deleting/reimporting or changing signature retains content history only',()=>{
 const map={...original,surveyedMasks:Array(3).fill('f'.repeat(25))};const c=context(map);
 let s=book(map);assert.equal(s.registered[0].cleared,undefined);assert.equal(surveyTotalV2(s.registered[0].surveyedMasks),300);
 s.surveyRewardClaims={[c.contentId]:true};s=confirmMapBossVictory(prepare(s,c).state,c).state;
 s=deleteRegisteredMap(s,mapOriginalId(map)).state;s=reload(s);
 assert.equal(s.bossClears[c.contentId],true);assert.equal(s.surveyRewardClaims[c.contentId],true);assert.equal(hasPendingMapReward(s),true);
 s=reload(registerSharedMap(s,{...map,discovererName:'別署名'}).state);
 assert.equal(surveyTotalV2(s.registered[0].surveyedMasks),0);assert.equal(s.registered[0].cleared,true);
 assert.equal(s.surveyRewardClaims[mapContentId(s.registered[0])],true);
});

function storageHarness(t){
 const storage=new Map();let failure='';
 for(const [key,value] of Object.entries({localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(failure&&k.endsWith(failure))throw Error('quota');storage.set(k,v);},removeItem(k){if(failure==='cleanup')throw Error('cleanup');storage.delete(k);}},window:{dispatchEvent(){if(failure==='event')throw Error('event');}},CustomEvent:class{}})){
  const previous=globalThis[key];globalThis[key]=value;t.after(()=>{if(previous===undefined)delete globalThis[key];else globalThis[key]=previous;});
 }
 t.mock.method(console,'warn',()=>{});
 let character={name:'QA',specialMaps:book(),carriedExperience:777,lootBag:{gold:888}};
 const callbacks={getCharacter:()=>character,setCharacter:v=>{character=v;},save:()=>writeGame({character,player:{},dungeon:{cells:[],explored:[]}})};
 return {run:op=>transactSpecialMaps(callbacks,op),get:()=>character,fail:v=>{failure=v;},load:()=>{character=loadGame().character;character.specialMaps=normalizeSpecialMaps(character.specialMaps);}};
}
for(const failure of ['.temp','.backup','.current'])test(`real save ${failure} failure rolls back clear/pending and receipt atomically, retry/reload never rerolls`,t=>{
 const h=storageHarness(t),c=context();assert.equal(h.run(s=>prepare(s,c)).ok,true);h.load();const before=structuredClone(h.get());
 const expected=confirmMapBossVictory(h.get().specialMaps,c).reward;h.fail(failure);
 assert.equal(h.run(s=>confirmMapBossVictory(s,c)).ok,false);assert.deepEqual(h.get(),before);h.load();assert.deepEqual(h.get(),before);
 h.fail('');assert.equal(h.run(s=>confirmMapBossVictory(s,structuredClone(c))).ok,true);h.load();assert.deepEqual(h.get().specialMaps.bossReward.map,expected);
 const pending=structuredClone(h.get());h.fail(failure);
 assert.equal(h.run(receiveMapBossReward).ok,false);assert.deepEqual(h.get(),pending);h.load();assert.deepEqual(h.get(),pending);
 h.fail('');assert.equal(h.run(receiveMapBossReward).ok,true);h.load();assert.equal(h.get().specialMaps.unidentified.length,1);
 assert.equal(h.run(receiveMapBossReward).ok,false);assert.equal(h.get().carriedExperience,777);assert.deepEqual(h.get().lootBag,{gold:888});
});
for(const failure of ['cleanup','event'])test(`postcommit ${failure} error cannot roll back or duplicate reward receipt`,t=>{
 const h=storageHarness(t),c=context();h.run(s=>prepare(s,c));h.run(s=>confirmMapBossVictory(s,c));h.fail(failure);
 assert.equal(h.run(receiveMapBossReward).ok,true);h.load();assert.equal(h.get().specialMaps.unidentified.length,1);assert.equal(h.run(receiveMapBossReward).ok,false);
});
