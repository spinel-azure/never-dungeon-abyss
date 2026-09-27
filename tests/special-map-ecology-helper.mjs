import {getEnemyById} from '../data/enemies.js';
import {ECOLOGY_V1_POOLS} from '../js/special-map/ecology-pools-v1.js';
import {ecologyFingerprint,ECOLOGY_REVISION} from '../js/special-map/ecology.js';
export function checkEcology(e,map){
 const issues=[];const species=e.species??[],ids=species.map(s=>s.monsterId);
 if(e.ruleset!==map.ruleset||e.seed!==map.seed||e.themeId!==map.themeId||e.revision!==ECOLOGY_REVISION)issues.push('identity');
 if(!species.length)issues.push('emptySpecies');
 if(species.length>5)issues.push('speciesCount');
 if(new Set(ids).size!==ids.length)issues.push('duplicateMonster');
 if(ids.some(id=>!getEnemyById(id)||getEnemyById(id).isBoss))issues.push('invalidMonster');
 if(ids.some(id=>!ECOLOGY_V1_POOLS[map.themeId]?.some(row=>row.monsterId===id)))issues.push('outsideTheme');
 if(species.some(s=>!Number.isInteger(s.weight)||s.weight<=0))issues.push('nonPositiveWeight');
 if(species.reduce((n,s)=>n+s.weight,0)!==10000)issues.push('weightSum');
 if(e.fingerprint!==ecologyFingerprint(e))issues.push('fingerprint');
 return issues;
}
