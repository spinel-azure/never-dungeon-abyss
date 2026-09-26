import {createHash} from 'node:crypto';
import {generateSpecialMap,SPECIAL_DUNGEON_V1,specialMapFingerprint} from '../js/special-map/generator.js';
import {checkStructure} from '../tests/special-map-structure-helper.mjs';
const expected={'special-map-v1':'b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58','phase2a-1':'3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592'};
for(const ruleset of [SPECIAL_DUNGEON_V1,'phase2a-1']){
 const start=performance.now(),hash=createHash('sha256'),themes={};let min=Infinity,max=0;
 for(let seed=0;seed<65536;seed++){
  try{const map=generateSpecialMap(ruleset,seed);if(map.seed!==seed||map.ruleset!==ruleset)throw Error('identity mismatch');const distance=checkStructure(map);min=Math.min(min,distance);max=Math.max(max,distance);themes[map.themeId]=(themes[map.themeId]||0)+1;hash.update(JSON.stringify(map)+'\n');}
  catch(error){console.error({ruleset,seed,error:error.message});process.exit(1);}
 }
 const digest=hash.digest('hex');if(digest!==expected[ruleset])throw Error('Frozen full-domain digest changed: '+ruleset);
 console.log(JSON.stringify({ruleset,seeds:65536,failures:0,minExitDistance:min,maxExitDistance:max,themes,sha256:digest,seconds:(performance.now()-start)/1000}));
}
for(const seed of [0,1,12345,32768,65535]){
 const {walls,...m}=generateSpecialMap(SPECIAL_DUNGEON_V1,seed);console.log(JSON.stringify({...m,fingerprint:specialMapFingerprint(generateSpecialMap(SPECIAL_DUNGEON_V1,seed))}));
}
