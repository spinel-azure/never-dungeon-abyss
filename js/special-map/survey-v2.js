import {normalizeSurveyMasks,surveyCountsV2,surveyTotalV2,surveyVisitV2,surveyViewsV2} from '../../data/special-map-survey-v2.js';

// A floor's first complete survey is a milestone, not a total step threshold.
export function getV2SurveyJingle(before,after,beforeFloor,afterFloor){
 if(before<300&&after>=300)return 'importantItem';
 if(beforeFloor<100&&afterFloor===100)return 'battleVictory';
 return null;
}

// One coalesced write per burst of movement. Explicit stair/return/pagehide
// flushes bypass the timer. Failed writes retain all dirty knowledge for retry.
export function attachV2Survey(s,original,{persistSurvey=()=>({ok:true}),scheduleSurvey=fn=>setTimeout(fn,750),cancelSurvey=clearTimeout}={}){
 s.surveyedMasks=normalizeSurveyMasks(original.surveyedMasks);
 let saved=[...s.surveyedMasks],timer=null;
 s.surveyCompletionPending=false;s.surveyError='';
 let completionSaved=surveyTotalV2(saved)===300;
 let views=surveyViewsV2(s.surveyedMasks);
 Object.defineProperties(s,{
  surveyView:{get:()=>views[s.currentFloor]},
  surveyedCount:{get:()=>surveyCountsV2(s.surveyedMasks)[s.currentFloor]},
  totalSurveyed:{get:()=>surveyTotalV2(s.surveyedMasks)},
  surveyComplete:{get:()=>s.totalSurveyed===300}
 });
 const cancel=()=>{if(timer!==null){cancelSurvey(timer);timer=null;}};
 s.flushSurvey=()=>{
  cancel();
  if(saved.every((mask,i)=>mask===s.surveyedMasks[i]))return true;
  let result;try{result=persistSurvey([...s.surveyedMasks]);}catch{}
  if(!result?.ok){s.surveyError='調査記録を保存できませんでした。Aまたは帰還で再試行できます。';return false;}
  saved=[...s.surveyedMasks];s.surveyError='';
  if(!completionSaved&&s.surveyComplete){completionSaved=true;s.surveyCompletionPending=true;}
  return true;
 };
 s.recordSurvey=(x,y)=>{
  const before=s.totalSurveyed,beforeFloor=s.surveyedCount;
  const next=surveyVisitV2(s.surveyedMasks,s.currentFloor,x,y);
  if(next.every((mask,i)=>mask===s.surveyedMasks[i]))return true;
  s.surveyedMasks=next;views=surveyViewsV2(next);
  if(getV2SurveyJingle(before,s.totalSurveyed,beforeFloor,s.surveyedCount)==='battleVictory')s.playSe('battleVictory');
  // Completion is committed immediately before announcing permanent unlock.
  if(s.surveyComplete)return s.flushSurvey();
  if(timer===null){timer=scheduleSurvey(()=>{timer=null;s.flushSurvey();});timer?.unref?.();}
  return true;
 };
 s.disposeSurvey=cancel;
}
