import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeTrelirenProgress,completeTrelirenEncounter,needsTrelirenRequest,isMapTentUnlocked,isMapBetaUnlocked} from '../data/map-beta.js';
import {normalizeTrelirenRun} from '../data/treliren.js';
import {normalizeCharacter,createInitialCharacter} from '../data/classes.js';
import {getUnreadTavernRumors,getPastTavernRumors,markTavernRumorRead} from '../data/tavern-rumors.js';
import {syncTavernRumorNotifications} from '../data/tavern-rumor-notifications.js';
import {normalizeSpecialMaps,appraiseMap,deleteRegisteredMap,transactSpecialMaps} from '../data/special-maps.js';
import {prepareFormalStarter,receiveFormalStarter,grantTestStarterMaps} from '../data/special-map-starter.js';
const hero=()=>createInitialCharacter({name:'QA',job:'mage'});
const finish=(c,id)=>completeTrelirenEncounter({...c,trelirenRun:{...normalizeTrelirenRun(),encounterId:id}},{requestCompleted:needsTrelirenRequest(c)});
const rumor=c=>getUnreadTavernRumors(c).find(r=>r.rumorId==='rumor_019');
test('new and legacy counters migrate once; explicit counts remain authoritative',()=>{
 let c=hero();assert.equal(normalizeCharacter(c).trelirenProgress.encounters,0);
 c.eventFlags.treliren_met=true;c=normalizeCharacter(c);assert.equal(c.trelirenProgress.encounters,1);
 assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(c))).trelirenProgress.encounters,1);
 assert.equal(finish(c,'next').trelirenProgress.encounters,2);
 c.trelirenProgress.encounters=0;assert.equal(normalizeCharacter(c).trelirenProgress.encounters,0);
});
test('encounter completion counts per persisted expedition identity, never per callback or reload',()=>{
 let c=finish(hero(),'one');assert.equal(c.trelirenProgress.encounters,1);
 for(let i=0;i<3;i++)c=completeTrelirenEncounter(normalizeCharacter(JSON.parse(JSON.stringify(c))));
 assert.equal(c.trelirenProgress.encounters,1);c.trelirenRun.encountered=false;c=completeTrelirenEncounter(c);assert.equal(c.trelirenProgress.encounters,1);
 c=finish(c,'two');assert.equal(needsTrelirenRequest(c),true);c=finish(c,'three');assert.equal(c.trelirenProgress.encounters,3);assert.equal(c.trelirenProgress.requestCompleted,true);assert.equal(isMapTentUnlocked(c),false);
});
test('rumor 017, third meeting and completed request are independently mandatory; late 017 reevaluates',()=>{
 let c=hero();for(const id of ['a','b','c'])c=finish(c,id);assert.equal(rumor(c),undefined);
 c.eventFlags.tavern_rumor_017_base_read=true;assert.ok(rumor(c));
 assert.equal(rumor({...c,trelirenProgress:{...c.trelirenProgress,requestCompleted:false}}),undefined);
 const sync=syncTavernRumorNotifications(c);assert.ok(sync.addedIds.includes('rumor_019:base'));
 c=markTavernRumorRead(c,rumor(c));assert.equal(isMapTentUnlocked(c),true);assert.ok(rumor(c));
 assert.ok(!getPastTavernRumors(c).some(r=>r.id==='rumor_019'));
 assert.ok(!syncTavernRumorNotifications(c).pendingRumors.some(r=>r.rumorId==='rumor_019'));
 assert.equal(rumor(c).dialogue.length,3);assert.ok(!rumor(c).dialogue.join('').includes('変わった子ね'));
 c.specialMaps={starterMapsGranted:true};assert.equal(rumor(c).stageId,'received');assert.match(rumor(c).dialogue.at(-1),/変わった子ね/);assert.ok(syncTavernRumorNotifications(c).addedIds.includes('rumor_019:received'));c=markTavernRumorRead(c,rumor(c));assert.equal(rumor(c),undefined);assert.equal(getPastTavernRumors(c).find(r=>r.id==='rumor_019').title,'続・迷宮探検家の噂');assert.equal(isMapTentUnlocked(c),true);
});
test('formal batch retains test entitlement independence, fixed contents, capacity and one-time delivery',()=>{
 let state=grantTestStarterMaps(normalizeSpecialMaps({discovererName:'QA'}),{random:()=>.1}).state;
 assert.equal(prepareFormalStarter(state).ok,false);assert.equal(state.starterMapsGranted,undefined);
 for(const m of [...state.unidentified])state=appraiseMap(state,m.discoveryId).state;
 state=prepareFormalStarter(state,{random:()=>.2}).state;const offer=structuredClone(state.starterOffer);
 state=normalizeSpecialMaps(JSON.parse(JSON.stringify(state)));assert.deepEqual(state.starterOffer,offer);
 assert.deepEqual(prepareFormalStarter(state,{random:()=>{throw Error('redraw');}}).maps,offer);
 state=receiveFormalStarter(state).state;assert.equal(state.unidentified.length,3);assert.equal(state.starterMapsTestGranted,true);assert.equal(receiveFormalStarter(state).ok,false);
 assert.ok(state.unidentified.every(m=>m.rarity==='WHITE'&&m.level>=1&&m.level<=5&&m.discovererName==='QA'));
});
test('failed delivery and appraisal roll back; retry after reload preserves exact offer and unlocks on one formal map',()=>{
 let c={specialMaps:prepareFormalStarter(normalizeSpecialMaps({discovererName:'QA'}),{random:()=>.4}).state,eventFlags:{tavern_rumor_019_base_read:true}};
 let fail=true;const transact=op=>transactSpecialMaps({getCharacter:()=>c,setCharacter:v=>c=v,save:()=>!fail},op);
 const before=JSON.stringify(c);assert.equal(transact(receiveFormalStarter).ok,false);assert.equal(JSON.stringify(c),before);
 c=JSON.parse(JSON.stringify(c));fail=false;assert.equal(transact(receiveFormalStarter).ok,true);const id=c.specialMaps.unidentified[0].discoveryId;
 fail=true;assert.equal(transact(s=>appraiseMap(s,id)).ok,false);assert.equal(isMapBetaUnlocked(c),false);
 fail=false;assert.equal(transact(s=>appraiseMap(s,id)).ok,true);assert.equal(isMapBetaUnlocked(c),true);assert.equal(c.specialMaps.unidentified.length,2);
 c.specialMaps=deleteRegisteredMap(c.specialMaps,c.specialMaps.registered[0].id).state;assert.equal(isMapBetaUnlocked(c),true);
});
test('test grants, shared registrations and unrelated appraisals do not unlock production',()=>{
 let c={specialMaps:grantTestStarterMaps(normalizeSpecialMaps({discovererName:'QA'})).state,eventFlags:{}};
 c.specialMaps=appraiseMap(c.specialMaps,c.specialMaps.unidentified[0].discoveryId).state;
 assert.equal(isMapTentUnlocked(c),false);assert.equal(isMapBetaUnlocked(c),false);
 c.eventFlags.tavern_rumor_019_base_read=true;assert.equal(isMapBetaUnlocked(c),false);
});
