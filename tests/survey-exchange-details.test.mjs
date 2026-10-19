import test from 'node:test';
import assert from 'node:assert/strict';
import {surveyOperation,SURVEY_PRIZES,surveyPrizeDetails} from '../data/survey-report.js';
import {createInitialCharacter} from '../data/classes.js';
import {getItemCount} from '../data/inventory.js';
function ready(){let c=createInitialCharacter({name:'QA',job:'thief'});c=surveyOperation(c,'book').character;return surveyOperation(c,'intro').character;}
for(const [id,cost,cap] of [['zaubertrank',10,5],['allheilmittel',30,1]])test(id+' exchange price, insufficient points and real holding limit',()=>{
 let c=ready();c.specialMaps.stampPoints=cost-1;assert.equal(surveyOperation(c,'exchange',id).error,'ポイント不足');assert.equal(getItemCount(c.inventory,id),0);
 c.specialMaps.stampPoints=cost*(cap+1);
 for(let i=0;i<cap;i++)c=surveyOperation(c,'exchange',id).character;
 assert.equal(getItemCount(c.inventory,id),cap);assert.equal(c.specialMaps.stampPoints,cost);
 assert.equal(surveyOperation(c,'exchange',id).error,'所持上限');
});
test('exchange descriptions use item effects and describe the unique locked shoes',()=>{
 const shoes=surveyPrizeDetails(SURVEY_PRIZES.find(p=>p.id==='alveter_schuhe'));
 assert.match(shoes.description,/DEF＋5/);assert.match(shoes.description,/一品物/);assert.match(shoes.image,/allwetterschuhe.avif$/);
 for(const p of SURVEY_PRIZES){const d=surveyPrizeDetails(p);assert.ok(d.description);assert.ok(!d.description.includes('undefined'));}
 assert.match(surveyPrizeDetails(SURVEY_PRIZES.find(p=>p.id==='allheilmittel')).description,/戦闘中は1回/);
});
