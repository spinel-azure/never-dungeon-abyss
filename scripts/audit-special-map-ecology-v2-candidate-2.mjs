import {createHash} from 'node:crypto';import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {generateV2Ecology,canonicalV2Ecology,V2_ECOLOGY_SPECIES} from '../js/special-map/ecology-v2.js';
import {generateV2EcologyCandidate2,getV2Candidate2Candidates} from '../js/special-map/ecology-v2-candidate-2.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
import {SPECIAL_MAP_THEMES} from '../data/special-map-themes.js';
import {KARTE_SPECIAL_BOSSES} from '../data/karte-special-bosses.js';
const dir='artifacts/v2-ecology-candidate-2/',started=performance.now();mkdirSync(dir,{recursive:true});
const baseline=JSON.parse(readFileSync('artifacts/v2-ecology-candidate-1/audit.json'));
const normalHash=createHash('sha256'),combined=createHash('sha256');let normalDifferences=0;
for(const profile of baseline.reports){
 for(let seed=0;seed<65536;seed++){
  const input={ruleset:'special-map-v2',seed,level:profile.level,rarity:profile.rarity};
  input.themeId=describeV2MapName({...input,rulesetVersion:input.ruleset}).themeId;
  const old=generateV2Ecology(input),e=generateV2EcologyCandidate2(input);
  if(JSON.stringify(old)!==JSON.stringify(e))normalDifferences++;
  const line=canonicalV2Ecology(e)+'\n';normalHash.update(line);combined.update(line);
 }
 console.log('Normal profile',profile.level,profile.rarity,'complete');
}
const normalSha=normalHash.digest('hex'),reports=[];
const counts=()=>({50:0,70:0,80:0,90:0,100:0});
for(const themeId of SPECIAL_MAP_THEMES)for(const [level,rarity] of themeId==='gold'?[[1,'WHITE'],[60,'WHITE'],[100,'WHITE'],[100,'GOLD']]:[[80,'WHITE'],[90,'WHITE'],[100,'WHITE'],[100,'GOLD']]){
 const hash=createHash('sha256'),r={themeId,level,rarity,maps:65536,floors:196608,
  failures:{generation:0,invalid:0,weight:0,duplicate:0,count:0,repeat:0},candidateCounts:[0,1,2].map(f=>getV2Candidate2Candidates({ruleset:'special-map-v2',seed:0,level,rarity,themeId},f).length),
  dominantSpecies:{},maxWeightFloors:counts(),rare:Object.fromEntries(['silberkaefer','maikaefer_koenig'].map(id=>[id,{includedMaps:0,dominantMaps:0,mapMaximum:counts()}]))};
 for(let seed=0;seed<65536;seed++){
  const input={ruleset:'special-map-v2',seed,level,rarity,themeId};
  try{
   const e=generateV2EcologyCandidate2(input),line=canonicalV2Ecology(e)+'\n';hash.update(line);combined.update(line);
   if(JSON.stringify(e)!==JSON.stringify(generateV2EcologyCandidate2({...input,discovererName:'別原本'})))r.failures.repeat++;
   r.dominantSpecies[e.dominantSpeciesId]=(r.dominantSpecies[e.dominantSpeciesId]||0)+1;
   for(const f of e.floors){
    const allowed=getV2Candidate2Candidates(input,f.floorIndex).map(s=>s.id);
    if(f.species.some(s=>!allowed.includes(s.id)||!V2_ECOLOGY_SPECIES[s.id]||KARTE_SPECIAL_BOSSES[s.id]))r.failures.invalid++;
    if(f.species.some(s=>!Number.isInteger(s.weight)||s.weight<1)||f.species.reduce((n,s)=>n+s.weight,0)!==10000)r.failures.weight++;
    if(new Set(f.species.map(s=>s.id)).size!==f.species.length)r.failures.duplicate++;
    if(f.species.length<[3,3,4][f.floorIndex]||f.species.length>[4,5,5][f.floorIndex])r.failures.count++;
    const max=Math.max(...f.species.map(s=>s.weight));for(const threshold of Object.keys(r.maxWeightFloors))if(max>=Number(threshold)*100)r.maxWeightFloors[threshold]++;
   }
   for(const [id,stats] of Object.entries(r.rare)){
    const max=Math.max(0,...e.floors.flatMap(f=>f.species.filter(s=>s.id===id).map(s=>s.weight)));
    if(max)stats.includedMaps++;if(e.dominantSpeciesId===id)stats.dominantMaps++;
    for(const threshold of Object.keys(stats.mapMaximum))if(max>=Number(threshold)*100)stats.mapMaximum[threshold]++;
   }
  }catch(error){r.failures.generation++;r.firstError??=String(error);}
 }
 r.sha256=hash.digest('hex');r.passed=Object.values(r.failures).every(n=>n===0);reports.push(r);console.log(JSON.stringify(r));
}
const report={revision:'v2-ecology-candidate-2',normalDifferences,normalSha,normalShaUnchanged:normalSha===baseline.sha256,
 ordering:'C1 six profiles in original order, then gold/rice/dusk/tender profiles as listed; seed ascending; canonicalV2Ecology + LF',reports,
 sha256:combined.digest('hex'),seconds:(performance.now()-started)/1000};
report.passed=normalDifferences===0&&report.normalShaUnchanged&&reports.every(r=>r.passed);
writeFileSync(dir+'audit.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
