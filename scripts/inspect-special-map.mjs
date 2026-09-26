import {generateSpecialMap,specialMapAscii,specialMapFingerprint,SPECIAL_DUNGEON_V1} from '../js/special-map/generator.js';
const map=generateSpecialMap(process.argv[3]??SPECIAL_DUNGEON_V1,Number(process.argv[2]??12345));
const {walls,...info}=map;console.log({...info,fingerprint:specialMapFingerprint(map)});console.log(specialMapAscii(map));
