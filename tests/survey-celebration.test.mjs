import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {isSurveyCelebrationEligible,surveyOperation,transactSurvey} from '../data/survey-report.js';
function character(n){let c=createInitialCharacter({name:'QA',job:'warrior'});c.specialMaps={surveyRewardClaims:Object.fromEntries(Array.from({length:n},(_,seed)=>[JSON.stringify(['special-map-v2',seed,1,'WHITE']),true]))};return c;}
test('survey celebration uses historical content claims, independent of points and reincarnation',()=>{
 assert.equal(isSurveyCelebrationEligible(character(999)),false);
 for(const n of [1000,1001]){const c=normalizeCharacter(character(n));assert.equal(isSurveyCelebrationEligible(c),true);const r=surveyOperation(c,'celebration');assert.ok(r.ok);assert.equal(isSurveyCelebrationEligible(normalizeCharacter(r.character)),false);assert.equal(r.character.reincarnationCount,0);assert.equal(r.character.specialMaps.stampPoints,0);}
 assert.equal(surveyOperation(character(999),'celebration').ok,false);
});
test('failed celebration save retains eligibility and successful save does not grant points or items',()=>{
 let c=character(1000);const before=structuredClone(c);const host={getCharacter:()=>c,setCharacter:n=>c=n,save:()=>false};assert.equal(transactSurvey(host,'celebration').ok,false);assert.deepEqual(c,before);host.save=()=>true;assert.equal(transactSurvey(host,'celebration').ok,true);assert.deepEqual(c.keyItems,before.keyItems);assert.equal(surveyOperation(c,'celebration').ok,false);
});
