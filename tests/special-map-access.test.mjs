import test from 'node:test';
import assert from 'node:assert/strict';
import {getSpecialMapAccess,MAP_AREA_REQUIREMENTS} from '../data/special-map-access.js';
import {normalizeSpecialMaps,mapContentId,appraiseMap,registerSharedMap,deleteRegisteredMap} from '../data/special-maps.js';
import {selectV2NormalTheme} from '../data/special-map-theme-lottery-v2.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getLifetimeDungeonDepth} from '../data/dungeon-arrival-history.js';
import {getReincarnationPreview} from '../js/reincarnation-service.js';

const base={rulesetVersion:'special-map-v2',seed:1,level:100,rarity:'WHITE',discovererName:'QA'};
function themeMap(theme){for(let seed=0;seed<65536;seed++){const m={...base,seed};if(selectV2NormalTheme({ruleset:m.rulesetVersion,...m})===theme)return m;}throw Error(theme);}
test('all normal map themes gate at the corresponding area entrance independent of map level',()=>{
 for(const [theme,depth] of Object.entries(MAP_AREA_REQUIREMENTS)){
  const m=themeMap(theme);
  assert.equal(getSpecialMapAccess({highestDungeonDepthReached:depth},m).ok,true,theme);
  if(depth>1)assert.equal(getSpecialMapAccess({highestDungeonDepthReached:depth-1},m).ok,false,theme);
 }
});
test('goddess themes require reincarnation even with legacy relief; gold has no restriction',()=>{
 for(const themeOverride of ['rice','dusk','tender'])for(const level of [80,100]){
  const m={...base,themeOverride,level};const specialMaps=normalizeSpecialMaps({registered:[{...m,cleared:true}]});
  assert.equal(getSpecialMapAccess({specialMaps,highestDungeonDepthReached:100},m).ok,false);
  assert.equal(getSpecialMapAccess({specialMaps,reincarnationCount:1},m).ok,true);
 }
 assert.equal(getSpecialMapAccess({}, {...base,themeOverride:'gold'}).ok,true);
});
test('legacy progress relief is one-time, local and survives deletion, reload and another signature',()=>{
 const m=themeMap('black'),key=mapContentId(m);
 let state=normalizeSpecialMaps({registered:[{...m,surveyedMasks:['1'+'0'.repeat(24)]}]});
 assert.equal(state.legacyAccess[key],true);
 state=deleteRegisteredMap(state,state.registered[0].id).state;
 state=normalizeSpecialMaps(JSON.parse(JSON.stringify(state)));
 const shared={...m,discovererName:'別人'};
 state=registerSharedMap(state,shared).state;
 assert.equal(getSpecialMapAccess({specialMaps:state},shared).ok,true);
 const recipient=registerSharedMap(normalizeSpecialMaps(),shared).state;
 assert.equal(getSpecialMapAccess({specialMaps:recipient},shared).ok,false);
 const modern=normalizeSpecialMaps({accessMigrationVersion:1,registered:[{...m,cleared:true}]});
 assert.equal(getSpecialMapAccess({specialMaps:modern},m).ok,false);
 for(const field of ['bossClears','surveyRewardClaims'])assert.equal(normalizeSpecialMaps({[field]:{[key]:true}}).legacyAccess[key],true);
});
test('formal starter maps are exempt before and after appraisal; ordinary shared copies are not',()=>{
 const m={...base,level:5,discoveryId:'formal-1'};
 let state=normalizeSpecialMaps({starterMapsGranted:true,formalStarterIds:['formal-1'],unidentified:[m]});
 state=appraiseMap(state,'formal-1').state;
 assert.equal(state.starterAccess[mapContentId(m)],true);
 assert.equal(getSpecialMapAccess({specialMaps:state},state.registered[0]).ok,true);
 assert.equal(normalizeSpecialMaps(JSON.parse(JSON.stringify(state))).starterAccess[mapContentId(m)],true);
 assert.deepEqual(registerSharedMap(normalizeSpecialMaps(),m).state.starterAccess,{});
});
test('permanent depth evidence survives reincarnation and reload without assuming a defeated boss reached the next floor',()=>{
 assert.equal(getLifetimeDungeonDepth({eventFlags:{boss_b89f_defeated:true}}),89);
 assert.equal(getLifetimeDungeonDepth({eventFlags:{transfer_portal_b90f_unlocked:true}}),90);
 assert.equal(getLifetimeDungeonDepth({eventFlags:{floor_b80_reached:true}}),80);
 assert.equal(getLifetimeDungeonDepth({reincarnationCount:1}),100);
 assert.equal(getLifetimeDungeonDepth({specialMaps:{registered:[{...base,cleared:true}]}}),1);
 let c=createInitialCharacter({name:'QA',job:'warrior'});c.highestDungeonDepthReached=100;
 c=getReincarnationPreview(c).nextCharacter;
 assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(c))).highestDungeonDepthReached,100);
});
