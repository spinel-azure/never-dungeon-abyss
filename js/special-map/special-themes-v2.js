import {generateSpecialMapV2,specialMapV2StructureFingerprint} from './generator-v2.js';
import {validateSpecialTheme} from '../../data/special-map-themes.js';
import {resolveSpecialThemeBoss} from '../../data/karte-special-bosses.js';
import {describeV2MapName} from '../../data/special-map-names-v2.js';
import {streamV1,chooseIndexV1} from './random-v1.js';
export const SPECIAL_THEME_LOCATIONS=Object.freeze(Object.fromEntries(Object.entries({
 gold:['黄金窟','黄金宮','金殿','金色廟'],rice:['稲穂宮','黄金田','豊穣殿','光穂廟'],
 dusk:['宵闇宮','夜露殿','黄昏廟','月影宮'],tender:['若葉宮','新緑殿','翠芽廟','萌芽宮'],
}).map(([k,v])=>[k,Object.freeze(v)])));
// Explicit blueprint only: not a registered original or a share-code extension.
// Candidate 3 remains the normal generator. Geometry is copied, never mutated.
export function generateExplicitSpecialMapV2(input){
 validateSpecialTheme(input?.themeId,input?.level);
 const base=generateSpecialMapV2(input);
 const map={...base,themeId:input.themeId,floors:base.floors.map(f=>({...f,themeId:input.themeId})),
  specialThemeRevision:'v2-special-themes-candidate-1',bossAssignment:resolveSpecialThemeBoss(input.themeId,input.level,{strict:true})};
 return {...map,fingerprint:specialMapV2StructureFingerprint(map)};
}
export function describeSpecialThemeMapName(input){
 validateSpecialTheme(input?.themeId,input?.level);
 const base=describeV2MapName({...input,rulesetVersion:input.ruleset});
 const choices=SPECIAL_THEME_LOCATIONS[input.themeId];
 const location=choices[chooseIndexV1(streamV1(input.ruleset,input.seed,`map-name-special-location:${input.themeId}`),choices.length)];
 return {...base,themeId:input.themeId,location,name:`${base.prefix}${location}の地図 Lv.${input.level}`};
}
