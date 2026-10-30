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
const ready=()=>{let c=createInitialCharacter({name:'QA',job:'warrior'});c=surveyOperation(surveyOperation(c,'book').character,'intro').character;c.specialMaps.stampPoints=15;return c;};
test('lantern costs 15p at reincarnation zero, persists, and cannot be exchanged twice',()=>{
 const c=ready();assert.equal(surveyOperation({...c,specialMaps:{...c.specialMaps,stampPoints:14}},'exchange','magic_lantern').error,'ポイント不足');
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

import {getMapTorchEffects} from '../js/special-map/theme-environment-v2.js';
import {hasCardEffect} from '../data/cards.js';
test('Ewige Laterne is a unique 45p key item with atomic exchange and no reincarnation gate',()=>{
 let c=ready();c.specialMaps.stampPoints=44;assert.equal(surveyOperation(c,'exchange','ewige_laterne').error,'ポイント不足');
 c.specialMaps.stampPoints=45;const r=surveyOperation(c,'exchange','ewige_laterne');assert.ok(r.ok);assert.equal(r.character.specialMaps.stampPoints,0);
 const restored=normalizeCharacter(JSON.parse(JSON.stringify(r.character)));assert.ok(hasKeyItem(restored.keyItems,'ewige_laterne'));assert.equal(surveyOperation(restored,'exchange','ewige_laterne').ok,false);
 let current=c;assert.equal(transactSurvey({getCharacter:()=>current,setCharacter:n=>current=n,save:()=>false},'exchange','ewige_laterne').ok,false);assert.equal(current,c);
 const detail=surveyPrizeDetails(SURVEY_PRIZES.find(p=>p.id==='ewige_laterne'));assert.match(detail.image,/ewige_laterne.avif$/);assert.doesNotMatch(detail.description+detail.effect,/ミニマップ/);
});
test('eternal lantern forces map light and minimap in black without changing ordinary abyss card effects',()=>{
 let c=ready();c.specialMaps.stampPoints=45;c=surveyOperation(c,'exchange','ewige_laterne').character;
 assert.deepEqual(getMapTorchEffects(c),{lanternActive:true,consumptionDisabled:true,effectForced:true});
 const s={kind:'specialMapV2',generatedMap:{themeId:'black'},torchFuel:100,renderState:{}};
 assert.equal(syncV2ThemeEnvironment(s,c,getMapTorchEffects(c)),'black');assert.equal(s.torchFuel,0);assert.equal(s.renderState.torchEffectForced,true);assert.equal(s.renderState.minimapEffectForced,true);assert.equal(getV2ThemeBattleOptions(s,c).concealed,false);
 assert.equal(hasCardEffect(c.cards.deckSlots,'force_torch_effect_active'),false);assert.equal(hasCardEffect(c.cards.deckSlots,'torch_consumption_disabled'),false);
 const rejected=resolveSpecialFieldItem({character:c,itemId:'guiding_torch',session:s});assert.equal(rejected.accepted,false);assert.match(rejected.message,/エーヴィゲ・ラテルネ/);
 c.specialMaps.stampPoints=15;c=surveyOperation(c,'exchange','magic_lantern').character;assert.equal(getMapTorchEffects(c).consumptionDisabled,true);
});
test('eternal lantern prevents fuel loss during actual movement',t=>{
 let c=ready();c.specialMaps.stampPoints=45;c=surveyOperation(c,'exchange','ewige_laterne').character;
 const map={rulesetVersion:'special-map-v2',seed:12345,level:60,rarity:'WHITE',discovererName:'QA'};const s=createSpecialMapV2Session([map],mapOriginalId(map));t.after(()=>s.disposeSurvey());
 s.torchConsumptionDisabled=()=>getMapTorchEffects(c).consumptionDisabled;
 for(let i=0;i<250;i++){s.motion={started:0,duration:1,x:0,y:0,toX:0,toY:0,angle:0,toAngle:0,isStep:true};updateSpecialMotion(s,1);}assert.equal(s.torchFuel,100);
});

test('owning the magic lantern discounts Ewige to 30p, preserves both items and rolls back on save failure',()=>{
 let c=surveyOperation(ready(),'exchange','magic_lantern').character;
 c.specialMaps.stampPoints=29;assert.equal(surveyOperation(c,'exchange','ewige_laterne').error,'ポイント不足');
 c.specialMaps.stampPoints=30;const before=structuredClone(c);
 let current=c;assert.equal(transactSurvey({getCharacter:()=>current,setCharacter:n=>current=n,save:()=>false},'exchange','ewige_laterne').ok,false);assert.deepEqual(current,before);
 const r=surveyOperation(c,'exchange','ewige_laterne');assert.ok(r.ok);assert.equal(r.character.specialMaps.stampPoints,0);
 for(const id of ['magic_lantern','ewige_laterne'])assert.ok(hasKeyItem(r.character.keyItems,id));
 assert.equal(surveyOperation(r.character,'exchange','ewige_laterne').ok,false);
});
