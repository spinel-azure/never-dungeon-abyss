import {generateSpecialMapV2} from './generator-v2.js';
import {generateV1} from './generator-v1.js';
import {hash32V1} from './random-v1.js';
export const SPECIAL_DUNGEON_V1='special-map-v1';
export function generateSpecialMap(ruleset,seed){
 if(!Number.isInteger(seed)||seed<0||seed>65535)throw new RangeError('seed must be an integer from 0 to 65535');
 switch(ruleset){
  case 'special-map-v1':return generateV1('special-map-v1',seed);
  // Explicit frozen legacy route: never rewrite existing originals or codes.
  case 'phase2a-1':return generateV1('phase2a-1',seed);
  default:throw new RangeError('Unsupported special-map ruleset');
 }
}
export function generateRegisteredSpecialMap(map){return map.rulesetVersion==='special-map-v2'?generateSpecialMapV2({ruleset:map.rulesetVersion,seed:map.seed,level:map.level,rarity:map.rarity}):generateSpecialMap(map.rulesetVersion,map.seed);}
export function specialMapFingerprint(map){
 // Fixed field order, independent of object insertion order; diagnostic, not authentication.
 const canonical=JSON.stringify([map.ruleset,map.seed,map.width,map.height,map.walls,map.entrance.x,map.entrance.y,map.entrance.side,map.exit.x,map.exit.y,map.startDirection,map.themeId]);
 return hash32V1(canonical).toString(16).padStart(8,'0');
}
export function specialMapAscii(map){
 const rows=[];
 for(let y=0;y<10;y++){
  let top='+',middle='|';
  for(let x=0;x<10;x++){
   const w=map.walls[y*10+x];top+=(w[0]?'---': '   ')+'+';
   const marker=x===map.entrance.x&&y===map.entrance.y?'I':x===map.exit.x&&y===map.exit.y?'O':' ';
   middle+=' '+marker+' '+(w[1]?'|':' ');
  }
  rows.push(top,middle);
 }
 rows.push('+---'.repeat(10)+'+');return rows.join('\n');
}
