import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {generateV2Ecology,canonicalV2Ecology,getV2EcologyCandidates,V2_MAP_SPECIES,V2_ECOLOGY_SPECIES} from '../js/special-map/ecology-v2.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
const started=performance.now(),reports=[],combined=createHash('sha256');
const thresholds=[50,70,80,90,100],counter=()=>Object.fromEntries(thresholds.map(t=>[t,0]));
for(const [level,rarity] of [[1,'WHITE'],[5,'WHITE'],[25,'SILVER'],[60,'WHITE'],[100,'WHITE'],[100,'GOLD']]){
  const report={level,rarity,maps:65536,floors:196608,failures:{generation:0,emptyPool:0,invalidSpecies:0,weight:0,count:0,duplicate:0,repeat:0,signature:0},
    rare:Object.fromEntries(Object.keys(V2_MAP_SPECIES).map(id=>[id,{candidateMaps:0,includedMaps:0,dominantMaps:0,mapMaximum:counter()}])),
    maxWeightFloors:counter(),maxWeightMaps:counter(),speciesCount:[{},{},{}],identicalSetsAllFloors:0,
    meanOrdinaryEncounterLevel:[0,0,0],ordinaryWeight:[0,0,0],examples:[],themeCounts:{}};
  const hash=createHash('sha256');
  for(let seed=0;seed<65536;seed++){
    const themeId=describeV2MapName({rulesetVersion:'special-map-v2',seed,level,rarity}).themeId;
    const input={ruleset:'special-map-v2',seed,level,rarity,themeId};
    try {
      const ecology=generateV2Ecology(input),serialized=canonicalV2Ecology(ecology);
      hash.update(serialized+'\n');combined.update(serialized+'\n');
      if(JSON.stringify(ecology)!==JSON.stringify(generateV2Ecology(input)))report.failures.repeat++;
      if(JSON.stringify(ecology)!==JSON.stringify(generateV2Ecology({...input,discovererName:'別原本'})))report.failures.signature++;
      report.themeCounts[themeId]=(report.themeCounts[themeId]||0)+1;
      const sets=[];
      for(const floor of ecology.floors){
        const pool=getV2EcologyCandidates(input,floor.floorIndex);
        if(!pool.length)report.failures.emptyPool++;
        const species=floor.species,count=species.length;
        report.speciesCount[floor.floorIndex][count]=(report.speciesCount[floor.floorIndex][count]||0)+1;
        if(count<[3,3,4][floor.floorIndex]||count>[4,5,5][floor.floorIndex])report.failures.count++;
        if(species.some(s=>!pool.some(p=>p.id===s.id)))report.failures.invalidSpecies++;
        if(species.some(s=>!Number.isInteger(s.weight)||s.weight<=0)||species.reduce((n,s)=>n+s.weight,0)!==10000)report.failures.weight++;
        if(new Set(species.map(s=>s.id)).size!==count)report.failures.duplicate++;
        sets.push(species.map(s=>s.id).sort().join(','));
        const max=Math.max(...species.map(s=>s.weight));for(const t of thresholds)if(max>=t*100)report.maxWeightFloors[t]++;
        for(const s of species)if(!V2_ECOLOGY_SPECIES[s.id].mapExclusive&&s.id!=='maikaefer'){
          report.meanOrdinaryEncounterLevel[floor.floorIndex]+=V2_ECOLOGY_SPECIES[s.id].level*s.weight;
          report.ordinaryWeight[floor.floorIndex]+=s.weight;
        }
      }
      if(new Set(sets).size===1)report.identicalSetsAllFloors++;
      const max=Math.max(...ecology.floors.flatMap(f=>f.species.map(s=>s.weight)));
      for(const t of thresholds)if(max>=t*100)report.maxWeightMaps[t]++;
      for(const [id,stats] of Object.entries(report.rare)){
        if([0,1,2].some(f=>getV2EcologyCandidates(input,f).some(s=>s.id===id)))stats.candidateMaps++;
        const weight=Math.max(0,...ecology.floors.flatMap(f=>f.species.filter(s=>s.id===id).map(s=>s.weight)));
        if(weight)stats.includedMaps++;
        if(ecology.dominantSpeciesId===id)stats.dominantMaps++;
        for(const t of thresholds)if(weight>=t*100)stats.mapMaximum[t]++;
        if(weight>=9000&&report.examples.filter(e=>e.id===id).length<3)report.examples.push({id,seed,themeId,weight,fingerprint:ecology.fingerprint});
      }
    }catch(error){report.failures.generation++;report.firstError??=String(error);}
  }
  report.sha256=hash.digest('hex');
  report.meanOrdinaryEncounterLevel=report.meanOrdinaryEncounterLevel.map((v,i)=>v/report.ordinaryWeight[i]);
  report.deeperFloorStronger=report.meanOrdinaryEncounterLevel[2]>report.meanOrdinaryEncounterLevel[0];
  report.passed=Object.values(report.failures).every(n=>n===0)&&report.deeperFloorStronger;
  reports.push(report);console.log(JSON.stringify(report));
}
const output={revision:'v2-ecology-candidate-1',ordering:'profiles listed, seed ascending; canonicalV2Ecology + LF',reports,sha256:combined.digest('hex'),seconds:(performance.now()-started)/1000,passed:reports.every(r=>r.passed)};
mkdirSync('artifacts/v2-ecology-candidate-1',{recursive:true});writeFileSync('artifacts/v2-ecology-candidate-1/audit.json',JSON.stringify(output,null,2)+'\n');
if(!output.passed)process.exitCode=1;
