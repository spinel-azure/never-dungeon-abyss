import {generateSpecialMapV2,specialMapV2StructureFingerprint} from './generator-v2.js';
import {validateSpecialTheme} from '../../data/special-map-themes.js';
import {resolveSpecialThemeBoss} from '../../data/karte-special-bosses.js';
import {describeV2MapName,SPECIAL_THEME_LOCATIONS} from '../../data/special-map-names-v2.js';
export {SPECIAL_THEME_LOCATIONS};
// Explicit theme blueprint: used by development previews and Format 3 originals.
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
 return describeV2MapName({...input,themeOverride:input.themeId,rulesetVersion:input.ruleset});
}
