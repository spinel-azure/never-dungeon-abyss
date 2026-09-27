// Development-only reconstruction of the baseline. Never imported by gameplay.
// Deliberately reads actual formation.weight, not conditions.weight.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {enemies,MAIKAEFER_ENCOUNTER_RATE} from '../data/enemies.js';
import {defineEncounterFormation,matchesEncounterFormationConditions} from '../data/encounter-formations.js';

export const SOURCE_REGIONS = [
 ['slate',1,9,null],['magic',10,19,'magic'],['torture',20,29,'torture'],
 ['red',30,39,null],['blue',40,49,null],['green',50,59,null],
 ['yellow',60,69,null],['water',70,79,'water'],['crystal',80,89,'crystal'],['black',90,99,'dark']
];
export function deriveCurrentPoolBaseline(){
 const result={};
 for(const [theme,min,max,region] of SOURCE_REGIONS){
  let formations=null;
  if(region){
   const source=readFileSync(new URL(`../data/${region}-region-enemies.js`,import.meta.url),'utf8');
   const start=source.indexOf('import { defineEncounterFormation');
   if(start<0)throw Error('Formation source layout changed: '+region);
   const tail=source.slice(source.indexOf(';',start)+1).split('export function')[0];
   const scope={defineEncounterFormation};vm.runInNewContext(tail+';this.result=formations;',scope);
   formations=scope.result;
  }
  const probability=new Map();
  for(let depth=min;depth<=max;depth++){
   const eligible=formations?formations.filter(f=>matchesEncounterFormationConditions(f.conditions,{depth,flags:{}})):
    enemies.filter(e=>e.randomEncounter!==false&&(!e.minimumDepth||e.minimumDepth<=depth)&&(!e.maximumDepth||e.maximumDepth>=depth)).map(e=>({members:[e.id],weight:1}));
   const total=eligible.reduce((n,f)=>n+f.weight,0);
   if(!total)throw Error('Empty encounter pool at '+depth);
   for(const f of eligible){
    // A formation contributes one unit split equally among its distinct species.
    // Party size is deliberately not confused with species prevalence.
    const ids=[...new Set(f.members)];
    for(const id of ids)probability.set(id,(probability.get(id)||0)+f.weight/total/ids.length/(max-min+1));
   }
  }
  const budget=Math.round((1-MAIKAEFER_ENCOUNTER_RATE)*1_000_000);
  const rows=[...probability].map(([monsterId,p],i)=>({monsterId,baseWeight:Math.floor(p*budget),remainder:p*budget%1,index:i}));
  const order=[...rows].sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
  const remaining=budget-rows.reduce((n,r)=>n+r.baseWeight,0);
  for(let i=0;i<remaining;i++)order[i].baseWeight++;
  result[theme]=rows.map(({monsterId,baseWeight})=>({monsterId,baseWeight}));
  result[theme].push({monsterId:'maikaefer',baseWeight:1_000_000-budget});
 }
 return result;
}
