import {streamV1,chooseIndexV1} from '../js/special-map/random-v1.js';

export const V2_THEME_WEIGHT_TABLE=Object.freeze([
 Object.freeze({min:1,max:10,weights:Object.freeze({slate:50,magic:30,torture:10,red:5,blue:5})}),
 Object.freeze({min:11,max:20,weights:Object.freeze({magic:50,torture:30,red:10,blue:5,green:5})}),
 Object.freeze({min:21,max:30,weights:Object.freeze({magic:10,torture:50,red:25,blue:10,green:5})}),
 Object.freeze({min:31,max:40,weights:Object.freeze({torture:10,red:50,blue:25,green:10,yellow:5})}),
 Object.freeze({min:41,max:50,weights:Object.freeze({red:10,blue:50,green:25,yellow:10,water:5})}),
 Object.freeze({min:51,max:60,weights:Object.freeze({blue:10,green:50,yellow:25,water:10,crystal:5})}),
 Object.freeze({min:61,max:70,weights:Object.freeze({green:10,yellow:50,water:25,crystal:10,black:5})}),
 Object.freeze({min:71,max:80,weights:Object.freeze({green:5,yellow:10,water:50,crystal:25,black:10})}),
 Object.freeze({min:81,max:90,weights:Object.freeze({green:5,yellow:5,water:10,crystal:50,black:30})}),
 Object.freeze({min:91,max:99,weights:Object.freeze({green:5,yellow:5,water:10,crystal:30,black:50})}),
 Object.freeze({min:100,max:100,weights:Object.freeze({slate:1,magic:1,torture:1,red:1,blue:1,green:5,yellow:5,water:10,crystal:30,black:45})}),
]);

export const V2_GOLD_LEVEL_100_THEME_WEIGHTS=Object.freeze({gold:4,rice:32,dusk:32,tender:32});

export function chooseWeightedThemeV2(weights,roll){
 if(!Number.isInteger(roll)||roll<0||roll>=100)throw RangeError('V2 theme roll must be an integer from 0 to 99');
 if(Object.values(weights).reduce((sum,weight)=>sum+weight,0)!==100)throw RangeError('V2 theme weights must total 100');
 let edge=0;
 for(const [themeId,weight] of Object.entries(weights))if(roll<(edge+=weight))return themeId;
 throw Error('V2 theme lottery did not resolve');
}

export function v2ThemeWeightsForLevel(level){
 const band=V2_THEME_WEIGHT_TABLE.find(entry=>level>=entry.min&&level<=entry.max);
 if(!band)throw RangeError('V2 map level must be from 1 to 100');
 return band.weights;
}

export function selectV2NormalTheme({ruleset,seed,level}){
 const roll=chooseIndexV1(streamV1(ruleset,seed,'floor-1-theme'),100);
 return chooseWeightedThemeV2(v2ThemeWeightsForLevel(level),roll);
}

export function resolveV2AppraisalTheme(map){
 if(map?.rulesetVersion!=='special-map-v2'||map.themeOverride!=null||map.level!==100||map.rarity!=='GOLD')return map;
 const roll=chooseIndexV1(streamV1(map.rulesetVersion,map.seed,'level-100-gold-theme'),100);
 return {...map,themeOverride:chooseWeightedThemeV2(V2_GOLD_LEVEL_100_THEME_WEIGHTS,roll)};
}
