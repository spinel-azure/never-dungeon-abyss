import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpecialMapV2Session,completeV2KeyChest} from '../js/special-map/session-v2.js';
import {createSpecialMapSession,actSpecialMap,updateSpecialMotion} from '../js/special-map/session.js';
import {serializeSpecialMapSession,restoreSpecialMapSession,resumeMapOriginal} from '../js/special-map/save-session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
import {createInitialCharacter} from '../data/classes.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'QA'};
const create=(map=original)=>createSpecialMapV2Session([map],mapOriginalId(map),{scheduleSurvey:()=>null});
function roundtrip(s){const data=JSON.parse(JSON.stringify(serializeSpecialMapSession(s)));return restoreSpecialMapSession(create(resumeMapOriginal(original,data)),data);}

test('all floors, keys, loot, environment and expedition identity survive JSON roundtrip',()=>{
 const s=create();s.currentFloor=1;s.playerX=4;s.playerY=6;s.direction=3;s.torchFuel=27;
 s.chestOpening=s.floors[1];completeV2KeyChest(s);s.bossDoorUnlocked=true;
 s.floors[2].openedDoors=new Set(s.floors[2].doorByKey.keys());
 s.battleExperience=456;s.lootBag={gold:123,items:{healing_potion:2},equipment:[],cards:{}};
 s.presence=82;s.incenseActive=true;s.crystalFloorStepCount=2;s.presenceSuppressedSteps=8;
 const r=roundtrip(s);
 assert.equal(r.currentFloor,1);assert.equal(r.playerX,4);assert.equal(r.playerY,6);assert.equal(r.direction,3);
 assert.equal(r.torchFuel,27);assert.equal(r.bossKeyFound,true);assert.equal(r.floors[1].chestOpened,true);
 assert.equal(r.bossDoorUnlocked,true);assert.deepEqual(r.floors[2].openedDoors,s.floors[2].openedDoors);
 assert.equal(r.battleExperience,456);assert.deepEqual(r.lootBag,s.lootBag);assert.equal(r.expeditionId,s.expeditionId);
 assert.equal(r.presence,82);assert.equal(r.crystalFloorStepCount,2);assert.equal(r.incenseActive,true);
 assert.equal(r.renderState.x,4.5);assert.equal(r.motion,null);
});
test('mid-turn and mid-step snapshots resume last completed cell without half-animation',()=>{
 const s=create();const d=s.direction,x=s.playerX,y=s.playerY;
 actSpecialMap(s,'right',0);let r=roundtrip(s);assert.equal(r.direction,d);
 updateSpecialMotion(s,1000);actSpecialMap(s,'left',1100);updateSpecialMotion(s,2000);
 assert.ok(actSpecialMap(s,'up',2100));r=roundtrip(s);assert.equal(r.playerX,x);assert.equal(r.playerY,y);
 updateSpecialMotion(s,3000);r=roundtrip(s);assert.equal(r.playerX,s.playerX);assert.equal(r.playerY,s.playerY);
 assert.equal(r.torchFuel,99);
});
test('pending survey knowledge survives without replaying completion announcements',()=>{
 const s=create();s.recordSurvey(5,5);const r=roundtrip(s);
 assert.deepEqual(r.surveyedMasks,s.surveyedMasks);assert.equal(r.surveyView[5][5],true);
 assert.equal(r.surveyNotice,null);assert.equal(r.surveyCompletionPending,false);
});
test('encounter restart retains lottery identity and rebinds only live session ID',()=>{
 const s=create();s.battleContext={source:'special-map-v2-boss',sessionId:s.encounterSessionId,battleId:5,mapKey:s.mapKey,expeditionId:s.expeditionId,battleUuid:crypto.randomUUID(),rewardRandomValues:[.1,.2,.3]};
 const r=roundtrip(s);assert.notEqual(r.encounterSessionId,s.encounterSessionId);
 assert.deepEqual(r.battleContext,{...s.battleContext,sessionId:r.encounterSessionId});assert.equal(r.transitioning,true);
 s.bossDefeated=true;assert.equal(roundtrip(s).battleContext,null);
});
test('reloaded expedition rewards settle once and closed expedition has no snapshot',()=>{
 const s=create();s.battleExperience=100;s.lootBag={gold:20,items:{},equipment:[],cards:{}};
 const r=roundtrip(s);const character=createInitialCharacter({name:'QA',job:'warrior'});let calls=0;
 assert.equal(settleV2ReturnExperience(character,r,()=>{calls++;return false;}),false);
 assert.equal(r.battleExperience,100);assert.ok(serializeSpecialMapSession(r));
 assert.equal(settleV2ReturnExperience(character,r,()=>{calls++;return true;}),true);
 assert.equal(settleV2ReturnExperience(character,r,()=>{calls++;return true;}),false);
 assert.equal(calls,2);assert.equal(serializeSpecialMapSession(r),null);
});
test('different map structure or invalid position is rejected',()=>{
 const s=create(),data=serializeSpecialMapSession(s);
 assert.throws(()=>restoreSpecialMapSession(create(),{...data,fingerprint:'wrong'}));
 data.floors[0].playerX=10;assert.throws(()=>restoreSpecialMapSession(create(),data));
});

test('legacy single-floor maps retain position, doors and torch without a V2 expedition',()=>{
 const map={rulesetVersion:'special-map-v1',seed:12345,discovererName:'QA'};
 const s=createSpecialMapSession([map],mapOriginalId(map));
 s.renderState.torchFuel=12;actSpecialMap(s,'right',0);updateSpecialMotion(s,500);
 s.openedDoors=new Set(s.doorByKey.keys());
 const data=JSON.parse(JSON.stringify(serializeSpecialMapSession(s)));
 const r=restoreSpecialMapSession(createSpecialMapSession([resumeMapOriginal(map,data)],s.mapKey),data);
 assert.equal(r.direction,s.direction);assert.equal(r.renderState.torchFuel,12);assert.deepEqual(r.openedDoors,s.openedDoors);
});
