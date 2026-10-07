import {createNormalMapBoss} from '../../data/karte-normal-bosses.js';
import {NORMAL_MAP_THEMES} from '../../data/special-map-themes.js';
import {mapContentId} from '../../data/special-maps.js';
export const V2_BOSS_SOURCE='special-map-v2-boss';
export function attachV2BossEncounter(s,{onBossEncounter}={}){
 s.bossDefeated=false;s.pendingBoss=false;
 s.deferBossSurveyJingle=()=>Boolean(onBossEncounter&&!s.bossDefeated&&NORMAL_MAP_THEMES.includes(s.generatedMap.themeId));
 s.retryBossEncounter=()=>{
  if(!s.pendingBoss||s.battleContext||s.experienceClosed)return false;
  if(!s.flushSurvey()){s.say(s.surveyError);return false;}
  if(s.surveyCompletionPending||s.bossFloorJinglePending||s.surveyNotice||s.surveyPresentationPlaying)return false;
  const enemy=createNormalMapBoss({seed:s.seed,level:s.level,rarity:s.rarity,themeId:s.generatedMap.themeId});
  const context={source:V2_BOSS_SOURCE,sessionId:s.encounterSessionId,battleId:++s.encounterSequence,mapKey:s.mapKey,
   contentId:mapContentId({rulesetVersion:s.ruleset,seed:s.seed,level:s.level,rarity:s.rarity}),
   mapSeed:s.seed,mapLevel:s.level,rarity:s.rarity,themeId:s.generatedMap.themeId,floorIndex:2,bossId:enemy.id};
  s.pendingBoss=false;s.battleContext=context;
  onBossEncounter(s,enemy,context);return true;
 };
 s.onBossCell=()=>{
  const cell=s.generatedMap.bossRoom?.bossCell;
  if(s.currentFloor!==2||!cell||cell.x!==s.playerX||cell.y!==s.playerY)return false;
  s.autoPath=null;
  if(!NORMAL_MAP_THEMES.includes(s.generatedMap.themeId)){s.say('特殊テーマのボス戦はV2-F3-Bで実装予定です。');return true;}
  if(s.bossDefeated){s.say('地図の主を討伐した。ワープゲートがある。A／EnterでB1F入口へ移動。');return true;}
  if(!onBossEncounter)return true;
  if(s.battleContext||s.pendingBoss)return true;
  // Normal traversal must have opened the session's key gate first.
  if(!s.bossKeyFound||!s.bossDoorUnlocked){s.say('赤錆びた鍵でボス扉を解錠してください。');return true;}
  s.pendingBoss=true;s.transitioning=true;s.retryBossEncounter();return true;
 };
}
