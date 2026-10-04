import {normalizeSurveyMask,surveyCount,surveyGrid,surveyVisit,mergeSurvey} from './special-map-survey.js';

// Ownership knowledge only. Never serialize session state or generated floors.
export function normalizeSurveyMasks(value){
 return Array.from({length:3},(_,i)=>normalizeSurveyMask(Array.isArray(value)?value[i]:undefined));
}
export function surveyCountsV2(value){return normalizeSurveyMasks(value).map(surveyCount);}
export function surveyTotalV2(value){return surveyCountsV2(value).reduce((a,b)=>a+b,0);}
export function surveyCompleteV2(value){return surveyTotalV2(value)===300;}
export function surveyVisitV2(value,floor,x,y){
 if(!Number.isInteger(floor)||floor<0||floor>2)throw RangeError('Invalid survey floor');
 const masks=normalizeSurveyMasks(value);masks[floor]=surveyVisit(masks[floor],x,y);return masks;
}
export function surveyViewsV2(value){return normalizeSurveyMasks(value).map(surveyGrid);}
export function mergeSurveyV2(a,b){a=normalizeSurveyMasks(a);b=normalizeSurveyMasks(b);return a.map((mask,i)=>mergeSurvey(mask,b[i]));}
