import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {generateSpecialMapV2,canonicalV2Structure,specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
import {generateSpecialMap} from '../js/special-map/generator.js';
import {generateSpecialMapDoors,canonicalDoorPositions} from '../js/special-map/doors.js';
import {generateSpecialMapEcology,canonicalEcology} from '../js/special-map/ecology.js';
import {generateV2EcologyCandidate2} from '../js/special-map/ecology-v2-candidate-2.js';
import {canonicalV2Ecology} from '../js/special-map/ecology-v2.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
const expected={v2Structure:'c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95',
 v1Topology:'b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58',legacyTopology:'3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592',
 v1Doors:'6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f',v1Ecology:'04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a',
 v2Ecology:'ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca'};
const hashes=Object.fromEntries(Object.keys(expected).map(key=>[key,createHash('sha256')]));
const baseline=JSON.parse(readFileSync('artifacts/v2-ecology-candidate-1/audit.json'));
const started=Date.now();let fingerprint;
for(let seed=0;seed<65536;seed++){
 const v2=generateSpecialMapV2({ruleset:'special-map-v2',seed,level:1,rarity:'WHITE'});
 hashes.v2Structure.update(canonicalV2Structure(v2)+'\n');
 if(seed===12345)fingerprint=specialMapV2StructureFingerprint(v2);
 const v1=generateSpecialMap('special-map-v1',seed);
 const legacy=generateSpecialMap('phase2a-1',seed);
 hashes.v1Topology.update(JSON.stringify(v1)+'\n');hashes.legacyTopology.update(JSON.stringify(legacy)+'\n');
 hashes.v1Doors.update(canonicalDoorPositions(generateSpecialMapDoors(v1.ruleset,seed,v1))+'\n');
 hashes.v1Ecology.update(canonicalEcology(generateSpecialMapEcology(v1.ruleset,seed,v1))+'\n');
 if((seed+1)%16384===0)console.log('Structure/legacy seeds',seed+1);
}
const profiles=[...baseline.reports.map(({level,rarity})=>({level,rarity})),
 ...['gold','rice','dusk','tender'].flatMap(themeId=>(themeId==='gold'?[[1,'WHITE'],[60,'WHITE'],[100,'WHITE'],[100,'GOLD']]:[[80,'WHITE'],[90,'WHITE'],[100,'WHITE'],[100,'GOLD']]).map(([level,rarity])=>({themeId,level,rarity})))];
for(const profile of profiles){
 for(let seed=0;seed<65536;seed++){
  const input={ruleset:'special-map-v2',seed,...profile};
  input.themeId??=describeV2MapName({...input,rulesetVersion:input.ruleset}).themeId;
  hashes.v2Ecology.update(canonicalV2Ecology(generateV2EcologyCandidate2(input))+'\n');
 }
 console.log('Ecology profile',profile);
}
const actual=Object.fromEntries(Object.entries(hashes).map(([key,hash])=>[key,hash.digest('hex')]));
const report={seeds:65536,ecologyProfiles:profiles.length,fingerprint,expected,actual,passed:JSON.stringify(expected)===JSON.stringify(actual)&&fingerprint==='3519b715',seconds:(Date.now()-started)/1000};
mkdirSync('artifacts/special-map-f4',{recursive:true});writeFileSync('artifacts/special-map-f4/compatibility.json',JSON.stringify(report,null,2)+'\n');
console.log(report);assert.equal(report.passed,true);
