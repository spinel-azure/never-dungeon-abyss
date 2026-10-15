import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialCharacter} from '../data/classes.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {resolveFieldItemUse} from '../combat/resolve-item-use.js';
import {resolveSpecialFieldItem,applySpecialFieldEnvironment} from '../js/special-map/field-environment.js';
import {syncAttractingIncenseZone} from '../data/treliren.js';
import {restorePresence,getPresence,setIncenseActive,setAttractingIncenseActive,setPassivePresenceIncreaseReduction,onPlayerStep,suppressPresence} from '../js/presence.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {isV2EncounterCell} from '../js/special-map/encounter-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {serializeSpecialMapSession,restoreSpecialMapSession} from '../js/special-map/save-session.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'WHITE',discovererName:'試験'};
function hero(){let c=createInitialCharacter({name:'QA',job:'thief'});for(const id of ['warding_incense','attracting_incense'])c.inventory=grantItem(c.inventory,id,3).inventory;return c;}
test('attracting incense is consumable in dungeon only, card blocks without consuming',()=>{
 const c=hero();assert.equal(resolveFieldItemUse({character:c,itemId:'attracting_incense',context:'town'}).accepted,false);
 const r=resolveFieldItemUse({character:c,itemId:'attracting_incense'});assert.equal(r.environment.attractingIncense,true);assert.equal(getItemCount(r.character.inventory,'attracting_incense'),2);
 c.cards.deckSlots=['legendary_swift_foot'];const blocked=resolveFieldItemUse({character:c,itemId:'attracting_incense'});assert.equal(blocked.reason,'presenceDisabledCard');assert.match(blocked.message,/気配上昇なしカードセット中/);assert.equal(getItemCount(c.inventory,'attracting_incense'),3);
});
test('abyss attraction doubles growth before reductions, respects talisman and ends by region',()=>{
 setIncenseActive(false);setAttractingIncenseActive(true);setPassivePresenceIncreaseReduction(0);restorePresence(0);
 onPlayerStep({random:()=>.5});assert.equal(getPresence(),12);
 setPassivePresenceIncreaseReduction(.25);onPlayerStep({random:()=>.5});assert.equal(getPresence(),21);
 suppressPresence(1);onPlayerStep({random:()=>.5});assert.equal(getPresence(),21);
 setAttractingIncenseActive(false);setPassivePresenceIncreaseReduction(0);
});
test('attraction zone persists within region and expires outside or in town',async()=>{
 const {getFloorZone}=await import('../data/floor-zone-names.js');const c=hero();c.attractingIncenseZone=getFloorZone(10).name;
 assert.equal(syncAttractingIncenseZone(c,18),true);assert.equal(syncAttractingIncenseZone(c,20),false);
 c.attractingIncenseZone=getFloorZone(10).name;assert.equal(syncAttractingIncenseZone(c,10,true),false);
});
test('V2 last incense wins, no stacking, suppression dominates, reload retains effect',()=>{
 const s=createSpecialMapV2Session([map],mapOriginalId(map),{random:()=>.5,onEncounter:()=>{}});const c=hero();c.incenseZone='suspended';
 const r=resolveSpecialFieldItem({character:c,itemId:'attracting_incense',session:s});assert.equal(r.accepted,true);applySpecialFieldEnvironment(s,r.environment);
 assert.equal(resolveSpecialFieldItem({character:c,itemId:'attracting_incense',session:s}).reason,'alreadyActive');
 for(let y=0;y<10;y++){let found=false;for(let x=0;x<10;x++){s.playerX=x;s.playerY=y;if(isV2EncounterCell(s)){found=true;break;}}if(found)break;}
 s.cellPrompt=null;s.transitioning=false;s.onEncounterStep();assert.equal(s.presence,12);
 applySpecialFieldEnvironment(s,{suppressPresenceSteps:30});s.onEncounterStep();assert.equal(s.presence,12);
 const saved=serializeSpecialMapSession(s);assert.equal(saved.values.attractingIncenseActive,true);
 const restored=createSpecialMapV2Session([map],mapOriginalId(map),{});restoreSpecialMapSession(restored,saved);assert.equal(restored.attractingIncenseActive,true);
 applySpecialFieldEnvironment(s,{wardingIncense:true});assert.equal(s.attractingIncenseActive,false);assert.equal(s.incenseActive,true);
 applySpecialFieldEnvironment(s,{attractingIncense:true});assert.equal(s.attractingIncenseActive,true);assert.equal(s.incenseActive,false);
 c.cards.deckSlots=['legendary_swift_foot'];s.attractingIncenseActive=false;assert.equal(resolveSpecialFieldItem({character:c,itemId:'attracting_incense',session:s}).reason,'presenceDisabledCard');
});
