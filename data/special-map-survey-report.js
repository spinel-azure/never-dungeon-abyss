import {isV2Map,mapContentId,normalizeSpecialMaps} from './special-maps.js';
import {surveyTotalV2} from './special-map-survey-v2.js';

// Read-only preparation for the future town report UI. No claim or reward writes.
// Claims must eventually be saved atomically with the reward, by content ID.
export function getMapSurveyReports(input){
 const state=normalizeSpecialMaps(input),reports=new Map();
 for(const map of state.registered){
  if(!isV2Map(map))continue;
  const contentId=mapContentId(map),surveyed=surveyTotalV2(map.surveyedMasks);
  const previous=reports.get(contentId);
  // Different signatures share a claim, but their partial surveys are not merged.
  if(previous&&previous.surveyed>=surveyed)continue;
  const claimed=Boolean(state.surveyRewardClaims?.[contentId]);
  reports.set(contentId,{contentId,mapId:map.id,surveyed,complete:surveyed===300,claimed,canReport:surveyed===300&&!claimed});
 }
 return [...reports.values()];
}
