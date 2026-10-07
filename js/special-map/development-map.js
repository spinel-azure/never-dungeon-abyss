import {isExplorerTestEnabled} from '../explorer-preview.js';
import {mapOriginalId} from '../../data/special-maps.js';
import {generateExplicitSpecialMapV2,describeSpecialThemeMapName} from './special-themes-v2.js';

// Deliberately isolated in memory: no registered originals, codes or progression flags.
// Survey survives return/defeat and re-entry in this tab, but not a reload.
const originals=new Map();
export function developmentMapOptions({themeId='gold',level=60,seed=12345,rarity='WHITE'}={}){
 if(!isExplorerTestEnabled())throw Error('探検家テストをONにしてください。');
 const input={ruleset:'special-map-v2',seed,level,rarity,themeId};
 generateExplicitSpecialMapV2(input);
 const key=JSON.stringify(input);
 if(!originals.has(key))originals.set(key,{rulesetVersion:input.ruleset,seed,level,rarity,discovererName:'開発用'});
 const original=originals.get(key);
 return {registered:[original],mapKey:mapOriginalId(original),developmentTheme:themeId,
  developmentName:describeSpecialThemeMapName(input).name,
  saveSurvey:masks=>{original.surveyedMasks=[...masks];return {ok:true};}};
}
