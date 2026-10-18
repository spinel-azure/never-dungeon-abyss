import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Pinned ordered inputs: never derive audit coverage from a mutable result artifact.
export const F4_SEEDS=65536;
export const F4_PROFILES=Object.freeze([
  {
    "level": 1,
    "rarity": "WHITE"
  },
  {
    "level": 5,
    "rarity": "WHITE"
  },
  {
    "level": 25,
    "rarity": "SILVER"
  },
  {
    "level": 60,
    "rarity": "WHITE"
  },
  {
    "level": 100,
    "rarity": "WHITE"
  },
  {
    "level": 100,
    "rarity": "GOLD"
  },
  {
    "themeId": "gold",
    "level": 1,
    "rarity": "WHITE"
  },
  {
    "themeId": "gold",
    "level": 60,
    "rarity": "WHITE"
  },
  {
    "themeId": "gold",
    "level": 100,
    "rarity": "WHITE"
  },
  {
    "themeId": "gold",
    "level": 100,
    "rarity": "GOLD"
  },
  {
    "themeId": "rice",
    "level": 80,
    "rarity": "WHITE"
  },
  {
    "themeId": "rice",
    "level": 90,
    "rarity": "WHITE"
  },
  {
    "themeId": "rice",
    "level": 100,
    "rarity": "WHITE"
  },
  {
    "themeId": "rice",
    "level": 100,
    "rarity": "GOLD"
  },
  {
    "themeId": "dusk",
    "level": 80,
    "rarity": "WHITE"
  },
  {
    "themeId": "dusk",
    "level": 90,
    "rarity": "WHITE"
  },
  {
    "themeId": "dusk",
    "level": 100,
    "rarity": "WHITE"
  },
  {
    "themeId": "dusk",
    "level": 100,
    "rarity": "GOLD"
  },
  {
    "themeId": "tender",
    "level": 80,
    "rarity": "WHITE"
  },
  {
    "themeId": "tender",
    "level": 90,
    "rarity": "WHITE"
  },
  {
    "themeId": "tender",
    "level": 100,
    "rarity": "WHITE"
  },
  {
    "themeId": "tender",
    "level": 100,
    "rarity": "GOLD"
  }
].map(Object.freeze));
export async function measureF4(sourceRoot,progress=()=>{}){
const {generateSpecialMapV2,canonicalV2Structure,specialMapV2StructureFingerprint}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/generator-v2.js')));
const {generateSpecialMap}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/generator.js')));
const {generateSpecialMapDoors,canonicalDoorPositions}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/doors.js')));
const {generateSpecialMapEcology,canonicalEcology}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/ecology.js')));
const {generateV2EcologyCandidate2}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/ecology-v2-candidate-2.js')));
const {canonicalV2Ecology}=await import(pathToFileURL(resolve(sourceRoot,'js/special-map/ecology-v2.js')));
const {describeV2MapName}=await import(pathToFileURL(resolve(sourceRoot,'data/special-map-names-v2.js')));
const keys=['v2Structure','v1Topology','legacyTopology','v1Doors','v1Ecology','v2Ecology'];
const hashes=Object.fromEntries(keys.map(k=>[k,createHash('sha256')]));
const geometry=createHash('sha256'),profileHashes=[];let fingerprint,example;
const started=Date.now();
for(let seed=0;seed<F4_SEEDS;seed++){
 const v2=generateSpecialMapV2({ruleset:'special-map-v2',seed,level:1,rarity:'WHITE'});
 const canonical=canonicalV2Structure(v2);hashes.v2Structure.update(canonical+'\n');
 // Supplemental diagnostic only: the primary structure hash still includes themes.
 const shape=JSON.parse(canonical);for(const floor of shape[3])floor[8]=null;
 geometry.update(JSON.stringify(shape)+'\n');
 if(seed===12345){fingerprint=specialMapV2StructureFingerprint(v2);example={themeId:v2.themeId,canonical};}
 const v1=generateSpecialMap('special-map-v1',seed),legacy=generateSpecialMap('phase2a-1',seed);
 hashes.v1Topology.update(JSON.stringify(v1)+'\n');hashes.legacyTopology.update(JSON.stringify(legacy)+'\n');
 hashes.v1Doors.update(canonicalDoorPositions(generateSpecialMapDoors(v1.ruleset,seed,v1))+'\n');
 hashes.v1Ecology.update(canonicalEcology(generateSpecialMapEcology(v1.ruleset,seed,v1))+'\n');
 if((seed+1)%16384===0)progress('Structure/legacy '+(seed+1));
}
for(const profile of F4_PROFILES){
 const hash=createHash('sha256');
 for(let seed=0;seed<F4_SEEDS;seed++){
  const input={ruleset:'special-map-v2',seed,...profile};
  input.themeId??=describeV2MapName({...input,rulesetVersion:input.ruleset}).themeId;
  const record=canonicalV2Ecology(generateV2EcologyCandidate2(input))+'\n';
  hashes.v2Ecology.update(record);hash.update(record);
 }
 profileHashes.push({profile,sha256:hash.digest('hex')});progress('Ecology '+JSON.stringify(profile));
}
return {schemaVersion:1,seeds:F4_SEEDS,ecologyProfiles:F4_PROFILES.length,profiles:F4_PROFILES,
 fingerprint,actual:Object.fromEntries(Object.entries(hashes).map(([key,hash])=>[key,hash.digest('hex')])),
 geometryWithoutTheme:geometry.digest('hex'),profileHashes,example,seconds:(Date.now()-started)/1000};
}
