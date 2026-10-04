import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {describeV2MapName,V2_NAME_PREFIXES,V2_NAME_LOCATIONS} from '../data/special-map-names-v2.js';
import {generateSpecialMapV2,canonicalV2Structure,specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
const levels=[1,20,21,40,41,60,61,80,81,100];
const forbidden=['うす暗き','薄暗き','ちいさな','小さな','はかなき','儚き','ざわめく','ゆらめく','ねむれる','眠れる','怒れる','呪われし','けだかき','気高き','放たれし','わななく','残された','あらぶる','荒ぶる','大いなる','とどろく','轟く','見えざる'];
const report={levels,seeds:65536,namesChecked:0,errors:[],maxLength:0,longestName:'',themeCounts:{},prefixes:V2_NAME_PREFIXES,locations:V2_NAME_LOCATIONS,seed12345:[]};
for(const words of V2_NAME_PREFIXES)assert.equal(new Set(words).size,words.length);
const locations=Object.values(V2_NAME_LOCATIONS).flat();assert.equal(new Set(locations).size,locations.length);
const nameHash=createHash('sha256'),structureHash=createHash('sha256'),random=Math.random;
try{
 Math.random=()=>{throw Error('Nondeterministic generation');};
 for(let seed=0;seed<65536;seed++){
  const input={ruleset:'special-map-v2',seed,level:1,rarity:'WHITE'},map=generateSpecialMapV2(input),canonical=canonicalV2Structure(map);
  for(const level of levels){
   try{
    const content={rulesetVersion:input.ruleset,seed,level,rarity:'WHITE'},info=describeV2MapName(content);
    assert.ok(info.name&&!/undefined|null|NaN/.test(info.name));assert.ok(!forbidden.some(w=>info.prefix.normalize('NFKC').includes(w)));
    assert.equal(info.themeId,map.themeId);assert.ok(V2_NAME_LOCATIONS[map.themeId].includes(info.location));
    assert.equal(info.name,describeV2MapName({...content,rarity:'GOLD',discovererName:'別人'}).name);
    assert.deepEqual(describeV2MapName(content),info);
    report.namesChecked++;nameHash.update(JSON.stringify([seed,level,info.name])+'\n');
    if(info.name.length>report.maxLength){report.maxLength=info.name.length;report.longestName=info.name;}
    if(seed===12345)report.seed12345.push({level,...info});
   }catch(e){if(report.errors.length<20)report.errors.push({seed,level,error:e.message});}
  }
  assert.equal(canonicalV2Structure(generateSpecialMapV2(input)),canonical);
  structureHash.update(canonical+'\n');report.themeCounts[map.themeId]=(report.themeCounts[map.themeId]??0)+1;
  if(seed===12345)assert.equal(specialMapV2StructureFingerprint(map),'3519b715');
 }
}finally{Math.random=random;}
report.nameSha256=nameHash.digest('hex');report.structureSha256=structureHash.digest('hex');
assert.equal(report.structureSha256,'c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95');
report.passed=report.errors.length===0&&report.namesChecked===65536*levels.length;
mkdirSync('artifacts/special-map-v2-d',{recursive:true});
writeFileSync('artifacts/special-map-v2-d/naming-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
