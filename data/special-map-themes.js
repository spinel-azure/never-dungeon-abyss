import {V2_THEMES} from '../js/special-map/generator-v2.js';

// The original ordered lottery remains exactly ten themes.
export const NORMAL_MAP_THEMES=V2_THEMES;
export const SPECIAL_MAP_THEMES=Object.freeze(['gold','rice','dusk','tender']);
export const ALL_MAP_THEMES=Object.freeze([...NORMAL_MAP_THEMES,...SPECIAL_MAP_THEMES]);
export const SPECIAL_THEME_DEFINITIONS=Object.freeze(Object.fromEntries(Object.entries({
 gold:{minMapLevel:1,walls:['gold_wall_01.webp','gold_wall_02.webp'],palette:'yellow'},
 rice:{minMapLevel:80,walls:['rice_wall_01.webp','rice_wall_02.webp'],palette:'light'},
 // These are the actual user-supplied filenames; do not rename or duplicate assets.
 dusk:{minMapLevel:80,walls:['dusk_wall.01.webp','dusk_wall.02.webp'],palette:'black'},
 tender:{minMapLevel:80,walls:['tender_wall_01.webp','tender_wall_02.webp'],palette:'green'},
}).map(([id,d])=>[id,Object.freeze({...d,id,walls:Object.freeze(d.walls.map(p=>'images/dungeon_effects/'+p)),fallbackTheme:'slate',bgmKey:'dungeon'})])));
export function validateSpecialTheme(themeId,level){
 const d=SPECIAL_THEME_DEFINITIONS[themeId];
 if(!Object.hasOwn(SPECIAL_THEME_DEFINITIONS,themeId)||!Number.isInteger(level)||level<d.minMapLevel||level>100)throw RangeError('Unsupported special theme or map level');
 return d;
}
