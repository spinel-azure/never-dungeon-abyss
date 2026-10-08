import test from 'node:test';import assert from 'node:assert/strict';
import {getMapSurveyReports} from '../data/special-map-survey-report.js';
import {normalizeSpecialMaps,mapContentId,deleteRegisteredMap,registerSharedMap} from '../data/special-maps.js';
const map={rulesetVersion:'special-map-v2',seed:1,level:50,rarity:'WHITE',discovererName:'A',cleared:false,surveyedMasks:Array(3).fill('f'.repeat(25))};
test('survey report needs all 300 cells, independently of boss clear',()=>{
 assert.equal(getMapSurveyReports({registered:[map]})[0].canReport,true);
 assert.equal(getMapSurveyReports({registered:[{...map,cleared:true,surveyedMasks:['f'.repeat(25)]}]})[0].canReport,false);
});
test('survey claims share content identity across signatures and survive delete and re-register',()=>{
 const contentId=mapContentId(map);let state=normalizeSpecialMaps({registered:[map,{...map,discovererName:'B'}],surveyRewardClaims:{[contentId]:true}});
 assert.equal(getMapSurveyReports(state).length,1);assert.equal(getMapSurveyReports(state)[0].canReport,false);
 for(const m of [...state.registered])state=deleteRegisteredMap(state,m.id).state;
 state=registerSharedMap(state,map).state;
 assert.equal(state.surveyRewardClaims[contentId],true);assert.equal(getMapSurveyReports(state)[0].surveyed,0);
 assert.equal(getMapSurveyReports(state)[0].claimed,true);
});
