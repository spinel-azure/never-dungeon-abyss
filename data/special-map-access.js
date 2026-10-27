import {getLifetimeDungeonDepth} from './dungeon-arrival-history.js';
import {normalizeReincarnationCount} from './reincarnation.js';
import {mapContentId,isV2Map,normalizeSpecialMaps} from './special-maps.js';
import {selectV2NormalTheme} from './special-map-theme-lottery-v2.js';

export const MAP_AREA_REQUIREMENTS=Object.freeze({slate:1,magic:10,torture:20,red:30,blue:40,green:50,yellow:60,water:70,crystal:80,black:90});
export function getSpecialMapAccess(character,map){
 if(!isV2Map(map))return {ok:true,label:'追加条件なし'};
 const theme=map.themeOverride??selectV2NormalTheme({ruleset:map.rulesetVersion,seed:map.seed,level:map.level});
 const result=(ok,label)=>({ok,label,error:ok?'':`挑戦条件を満たしていません。${label}`});
 if(theme==='gold')return result(true,'条件なし');
 if(['rice','dusk','tender'].includes(theme))return result(normalizeReincarnationCount(character?.reincarnationCount)>=1,'1回以上転生済み');
 const maps=normalizeSpecialMaps(character?.specialMaps),key=mapContentId(map);
 if(maps.starterAccess?.[key])return result(true,'初回配布地図（探索可能）');
 if(maps.legacyAccess?.[key])return result(true,'以前の探索実績により探索可能');
 const required=MAP_AREA_REQUIREMENTS[theme];
 if(!required)return result(false,'未対応の地図テーマ');
 return result(getLifetimeDungeonDepth(character)>=required,`奈落迷宮B${required}Fに到達`);
}
