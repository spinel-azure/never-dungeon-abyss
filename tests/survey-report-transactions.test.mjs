import test from 'node:test';
import assert from 'node:assert/strict';
import {surveyOperation,transactSurvey,reportableMaps,SURVEY_PRIZES,surveyExchangeReason} from '../data/survey-report.js';
import {normalizeSpecialMaps,mapContentId,deleteRegisteredMap,registerSharedMap} from '../data/special-maps.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {hasKeyItem} from '../data/key-items.js';
import {grantItem,getItemCount} from '../data/inventory.js';
const map={rulesetVersion:'special-map-v2',seed:123,level:50,rarity:'WHITE',discovererName:'A',surveyedMasks:Array(3).fill('f'.repeat(25))};
function hero(){const c=createInitialCharacter({name:'QA',job:'thief'});c.specialMaps=normalizeSpecialMaps({registered:[map]});return c;}
function ready(){return surveyOperation(surveyOperation(hero(),'book').character,'intro').character;}
test('book and intro survive reload independently and never duplicate',()=>{
 let c=hero();assert.equal(surveyOperation(c,'report',c.specialMaps.registered[0].id).ok,false);
 c=surveyOperation(c,'book').character;c=normalizeCharacter(JSON.parse(JSON.stringify(c)));
 assert.equal(hasKeyItem(c.keyItems,'stamp_book'),true);assert.equal(c.specialMaps.surveyIntroductionComplete,false);
 assert.deepEqual(surveyOperation(c,'book').character.keyItems,c.keyItems);
 c=surveyOperation(c,'intro').character;assert.equal(c.specialMaps.surveyIntroductionComplete,true);
});
test('300 cells give one point per content; incomplete and repeated callbacks give none',()=>{
 let c=ready(),id=c.specialMaps.registered[0].id;assert.equal(reportableMaps(c).length,1);
 const incomplete=structuredClone(c);incomplete.specialMaps.registered[0].surveyedMasks[2]='0'.repeat(25);assert.equal(reportableMaps(incomplete).length,0);
 c=surveyOperation(c,'report',id).character;assert.equal(c.specialMaps.stampPoints,1);assert.equal(c.specialMaps.registered.length,1);
 assert.equal(surveyOperation(c,'report',id).ok,false);
 c.specialMaps=deleteRegisteredMap(c.specialMaps,id).state;c.specialMaps=registerSharedMap(c.specialMaps,{...map,discovererName:'B'}).state;
 c.specialMaps.registered[0].surveyedMasks=map.surveyedMasks;
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(reportableMaps(c).length,0);assert.equal(c.specialMaps.surveyRewardClaims[mapContentId(map)],true);
});
for(const action of ['book','intro','report','exchange'])for(const throws of [false,true])test(`${action} save failure rolls back, retry commits once (${throws})`,()=>{
 let c=action==='book'?hero():ready();c.specialMaps.stampPoints=100;const before=structuredClone(c);let failure=true;
 const api={getCharacter:()=>c,setCharacter:value=>c=value,save:()=>{if(failure){if(throws)throw Error('disk');return false;}return true;}};
 const id=action==='report'?c.specialMaps.registered[0].id:'strength_engraving';
 assert.equal(transactSurvey(api,action,id).ok,false);assert.deepEqual(c,before);failure=false;
 assert.equal(transactSurvey(api,action,id).ok,true);if(action==='exchange'){assert.equal(c.specialMaps.stampPoints,85);assert.equal(getItemCount(c.inventory,id),1);}
});
test('exchange supports repeatable marks, inventory limits and locked once-only shoes',()=>{
 let c=ready();c.specialMaps.stampPoints=1000;
 c=surveyOperation(c,'exchange','strength_engraving').character;c=surveyOperation(c,'exchange','strength_engraving').character;
 assert.equal(getItemCount(c.inventory,'strength_engraving'),2);assert.equal(c.specialMaps.stampPoints,970);
 c.inventory=grantItem(c.inventory,'attracting_incense',99).inventory;
 assert.equal(surveyOperation(c,'exchange','attracting_incense').ok,false);assert.equal(c.specialMaps.stampPoints,970);
 c=surveyOperation(c,'exchange','alveter_schuhe').character;assert.equal(c.specialMaps.stampPoints,930);
 assert.equal(c.equipmentInventory.instances.find(i=>i.equipmentId==='alveter_schuhe').locked,true);
 c.equipmentInventory.instances=c.equipmentInventory.instances.filter(i=>i.equipmentId!=='alveter_schuhe');c=normalizeCharacter(JSON.parse(JSON.stringify(c)));
 assert.equal(surveyOperation(c,'exchange','alveter_schuhe').ok,false);
 c.specialMaps.stampPoints=0;assert.match(surveyExchangeReason(c,SURVEY_PRIZES[0]),/不足/);
});
