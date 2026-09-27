import {generateSpecialMap,specialMapAscii,specialMapFingerprint,SPECIAL_DUNGEON_V1} from '../js/special-map/generator.js';
import {generateSpecialMapEcology} from '../js/special-map/ecology.js';
import {getEnemyById} from '../data/enemies.js';
const map=generateSpecialMap(process.argv[3]??SPECIAL_DUNGEON_V1,Number(process.argv[2]??12345));
const {walls,...info}=map;console.log({...info,fingerprint:specialMapFingerprint(map)});console.log(specialMapAscii(map));
const ecology=generateSpecialMapEcology(map.ruleset,map.seed,map);
console.log(`\necology (${ecology.revision}, provisional): ${ecology.fingerprint}`);
for(const {monsterId,weight} of ecology.species)console.log(`${monsterId}\t${getEnemyById(monsterId)?.name??''}\t${weight}\t${(weight/100).toFixed(2)}%`);
