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
 const expectedTotal=s.surveyedMasks.length*100;
 // Capture this at entry so completing the survey unlocks markers next expedition.
 s.fullSurveyMinimapUnlocked=surveyTotalV2(s.surveyedMasks)===expectedTotal;
 let saved=[...s.surveyedMasks],timer=null;
 s.surveyCompletionPending=false;s.surveyError='';
 let completionSaved=surveyTotalV2(saved)===expectedTotal;
 let views=surveyViewsV2(s.surveyedMasks);
 Object.defineProperties(s,{
  surveyView:{get:()=>views[s.currentFloor]},
  surveyedCount:{get:()=>surveyCountsV2(s.surveyedMasks)[s.currentFloor]},
  totalSurveyed:{get:()=>surveyTotalV2(s.surveyedMasks)},
  surveyComplete:{get:()=>s.totalSurveyed===expectedTotal}
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
  const boss=s.generatedMap?.bossRoom?.bossCell;
  // Contact starts combat; only victory earns new survey knowledge here.
  if(s.currentFloor===2&&boss?.x===x&&boss?.y===y&&s.deferBossSurveyJingle?.())return true;
  const before=s.totalSurveyed,beforeFloor=s.surveyedCount;
  const next=surveyVisitV2(s.surveyedMasks,s.currentFloor,x,y);
  if(next.every((mask,i)=>mask===s.surveyedMasks[i]))return true;
  s.surveyedMasks=next;views=surveyViewsV2(next);
  if(beforeFloor<100&&s.surveyedCount===100)s.surveyNotice={total:s.totalSurveyed,floor:s.currentFloor};
  if(getV2SurveyJingle(before,s.totalSurveyed,beforeFloor,s.surveyedCount)==='battleVictory'){
   const boss=s.generatedMap?.bossRoom?.bossCell;
   if((s.deferBossSurveyJingle?.()||s.finishingBattle)&&boss?.x===x&&boss?.y===y)s.bossFloorJinglePending=true;
   else s.playSe('battleVictory');
  }
  // Completion is committed immediately before announcing permanent unlock.
  if(s.surveyComplete)return s.flushSurvey();
  if(timer===null){
   const flushWhenSettled=()=>{
    timer=null;
    if(s.motion||s.renderState.anim){timer=scheduleSurvey(flushWhenSettled);timer?.unref?.();return;}
    s.flushSurvey();
   };
   timer=scheduleSurvey(flushWhenSettled);timer?.unref?.();
  }
  return true;
 };
 s.disposeSurvey=cancel;
}
