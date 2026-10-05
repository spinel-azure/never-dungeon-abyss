import fs from 'node:fs';
import {attachV2Encounters,rollV2Species,resumeV2Encounter} from '../js/special-map/encounter-v2.js';
import {generateSpecialMapV2} from '../js/special-map/generator-v2.js';
let seed=123456;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const results=[];
for(const level of [5,60,100]){
 const map=generateSpecialMapV2({ruleset:'special-map-v2',seed:12345,level,rarity:'WHITE'});
 for(let floor=0;floor<3;floor++){
  let battles=0,blocked=0;const selected={};
  const s={kind:'specialMapV2',ruleset:'special-map-v2',seed:12345,level,rarity:'WHITE',mapKey:'simulation',currentFloor:floor,generatedMap:map.floors[floor],playerX:-1,playerY:-1,torchFuel:100,say:()=>{}};
  attachV2Encounters(s,{random,onBlocked:()=>blocked++,onEncounter:(s,e,c)=>{battles++;selected[e.id]=(selected[e.id]||0)+1;resumeV2Encounter(s,c);}});
  for(let n=0;n<1000;n++)s.onEncounterStep();
  const sampled={};for(let n=0;n<100000;n++){const id=rollV2Species(s.ecology.floors[floor].species,random);sampled[id]=(sampled[id]||0)+1;}
  results.push({level,floorIndex:floor,eligibleSteps:1000,torch:'lit',battles,blocked,meanStepsPerRoll:1000/(battles+blocked),selected,species:s.ecology.floors[floor].species,sampledOutOf100000:sampled});
 }
}
fs.writeFileSync('artifacts/special-map-v2-f1/simulation.json',JSON.stringify(results,null,2)+'\n');console.log(results.map(r=>({level:r.level,floor:r.floorIndex+1,battles:r.battles,blocked:r.blocked,mean:r.meanStepsPerRoll})));
