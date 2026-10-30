import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {surveyOperation,transactSurvey,surveyPrizeDetails,SURVEY_PRIZES} from '../data/survey-report.js';
import {hasKeyItem} from '../data/key-items.js';
import {getItem} from '../data/items.js';
import {getV2ThemeBattleOptions,syncV2ThemeEnvironment} from '../js/special-map/theme-environment-v2.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {updateSpecialMotion} from '../js/special-map/session.js';
import {mapOriginalId} from '../data/special-maps.js';
const ready=()=>{let c=createInitialCharacter({name:'QA',job:'warrior'});c=surveyOperation(surveyOperation(c,'book').character,'intro').character;c.specialMaps.stampPoints=10;return c;};
test('lantern costs 10p at reincarnation zero, persists, and cannot be exchanged twice',()=>{
 const c=ready();assert.equal(surveyOperation({...c,specialMaps:{...c.specialMaps,stampPoints:9}},'exchange','magic_lantern').error,'ポイント不足');
 const r=surveyOperation(c,'exchange','magic_lantern');assert.ok(r.ok);assert.equal(r.character.specialMaps.stampPoints,0);
 const restored=normalizeCharacter(JSON.parse(JSON.stringify(r.character)));assert.ok(hasKeyItem(restored.keyItems,'magic_lantern'));assert.equal(surveyOperation(restored,'exchange','magic_lantern').ok,false);
 assert.match(surveyPrizeDetails(SURVEY_PRIZES.find(p=>p.id==='magic_lantern')).image,/magic_lantern.avif$/);
 let current=c;const failed=transactSurvey({getCharacter:()=>current,setCharacter:n=>current=n,save:()=>false},'exchange','magic_lantern');assert.equal(failed.ok,false);assert.equal(current,c);
});
test('lantern fuel lasts 200 completed steps; turning consumes nothing and permanent torch wins',t=>{
 const map={rulesetVersion:'special-map-v2',seed:12345,level:60,rarity:'WHITE',discovererName:'QA'};
 const s=createSpecialMapV2Session([map],mapOriginalId(map));t.after(()=>s.disposeSurvey());s.torchConsumptionRate=()=>.5;
 const step=(isStep=true)=>{s.motion={started:0,duration:1,x:0,y:0,toX:0,toY:0,angle:0,toAngle:0,isStep};updateSpecialMotion(s,1);};
 step(false);assert.equal(s.torchFuel,100);for(let i=0;i<199;i++)step();assert.equal(s.torchFuel,.5);step();assert.equal(s.torchFuel,0);step();assert.equal(s.torchFuel,0);
 s.torchFuel=100;s.torchConsumptionDisabled=()=>true;step();assert.equal(s.torchFuel,100);
 s.torchConsumptionDisabled=()=>false;s.torchConsumptionRate=()=>1;step();assert.equal(s.torchFuel,99);
});
test('empty fuel conceals enemies in every map theme, light and Aries retain their exceptions',()=>{
 for(const themeId of ['slate','water','black','gold','rice','dusk','tender']){
 const s={kind:'specialMapV2',generatedMap:{themeId},torchFuel:0,renderState:{}};
 assert.deepEqual(getV2ThemeBattleOptions(s,{}),{concealed:true,ambush:true});
 assert.deepEqual(getV2ThemeBattleOptions(s,{}, {boss:true}),{concealed:true,ambush:false});
 assert.deepEqual(getV2ThemeBattleOptions(s,{cards:{deckSlots:['zodiac_aries']}}),{concealed:true,ambush:false});
 s.renderState.torchEffectForced=true;assert.equal(getV2ThemeBattleOptions(s,{}).concealed,false);
 s.renderState.torchEffectForced=false;s.torchFuel=.5;assert.equal(getV2ThemeBattleOptions(s,{}).concealed,false);
 }
 const s={kind:'specialMapV2',generatedMap:{themeId:'black'},torchFuel:100,renderState:{}};syncV2ThemeEnvironment(s,ready());assert.equal(s.torchFuel,0);
});
test('revised shop prices retain half-price selling without arbitrage',()=>{
 for(const [id,buy,sell] of [['healing_potion',14,7],['healing_potion_medium',30,15],['guiding_torch',10,5]]){assert.equal(getItem(id).buyPrice,buy);assert.equal(getItem(id).sellPrice,sell);}
});

// Lantern refills belong to successful floor transitions, never load/resume.
import {switchV2Floor,warpV2ToEntrance} from '../js/special-map/session-v2.js';
import {resolveSpecialFieldItem} from '../js/special-map/field-environment.js';
import {resolveFieldItemUse} from '../combat/resolve-item-use.js';
import {grantItem} from '../data/inventory.js';
test('lantern rejects guiding torches without consuming them; abyss and ordinary torch remain usable',()=>{
 let c=ready();c.inventory=grantItem(c.inventory,'guiding_torch',2).inventory;
 const s={kind:'specialMapV2',generatedMap:{themeId:'slate'},renderState:{torchFuel:10}};
 assert.equal(resolveSpecialFieldItem({character:c,itemId:'guiding_torch',session:s}).accepted,true);
 c=surveyOperation(c,'exchange','magic_lantern').character;const before=structuredClone(c);
 const r=resolveSpecialFieldItem({character:c,itemId:'guiding_torch',session:s});
 assert.equal(r.accepted,false);assert.equal(r.reason,'lanternActive');assert.match(r.message,/魔法のランタン.*使用できません/);assert.deepEqual(c,before);assert.equal(s.renderState.torchFuel,10);
 assert.equal(resolveFieldItemUse({character:c,itemId:'guiding_torch',context:'dungeon',torchFuel:10}).accepted,true);
});
test('lantern refills ascending, descending and return warp only after successful floor change',t=>{
 const map={rulesetVersion:'special-map-v2',seed:12345,level:60,rarity:'WHITE',discovererName:'QA'};
 const s=createSpecialMapV2Session([map],mapOriginalId(map));t.after(()=>s.disposeSurvey());s.lanternActive=()=>true;
 const link=s.blueprint.links[0];s.torchFuel=10;
 const flush=s.flushSurvey;s.flushSurvey=()=>false;assert.equal(switchV2Floor(s,link.lower),false);assert.equal(s.torchFuel,10);assert.equal(s.currentFloor,0);
 s.flushSurvey=flush;assert.equal(switchV2Floor(s,link.lower),true);assert.equal(s.torchFuel,100);
 s.torchFuel=.5;switchV2Floor(s,link.upper);assert.equal(s.torchFuel,100);
 s.torchFuel=20;switchV2Floor(s,link.upper);assert.equal(s.torchFuel,20,'same floor is not a refill');
 s.lanternActive=()=>false;switchV2Floor(s,link.lower);assert.equal(s.torchFuel,20);
 s.lanternActive=()=>true;s.currentFloor=2;s.bossDefeated=true;Object.assign(s,{playerX:s.generatedMap.bossRoom.bossCell.x,playerY:s.generatedMap.bossRoom.bossCell.y});
 assert.equal(warpV2ToEntrance(s),true);assert.equal(s.torchFuel,100);
 // The existing dark-zone restriction still takes precedence after arrival.
 s.generatedMap.themeId='black';syncV2ThemeEnvironment(s,ready());assert.equal(s.torchFuel,0);
});
