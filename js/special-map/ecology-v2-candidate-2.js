import {generateV2Ecology,getV2EcologyCandidates,canonicalV2Ecology,V2_ECOLOGY_SPECIES,V2_MAP_SPECIES} from './ecology-v2.js';
import {NORMAL_MAP_THEMES,validateSpecialTheme} from '../../data/special-map-themes.js';
import {streamV1,chooseIndexV1,hash32V1} from './random-v1.js';

export const V2_ECOLOGY_CANDIDATE_2='v2-ecology-candidate-2';
const rows=(ids,affinity=3)=>ids.map(id=>({id,affinity}));
export const SPECIAL_ECOLOGY_POOLS=Object.freeze(Object.fromEntries(Object.entries({
 gold:[...rows(['abyss_rat','cave_slime','abyss_rabbit','wandering_dead','poison_slime','vampire_bat','viper'],1),
  {id:'bouncing_coin',affinity:4},{id:'maikaefer',affinity:40},{id:'abyss_crystal_beetle',affinity:12},
  {id:'amethyst_golem',affinity:1},{id:'silberkaefer',affinity:40},{id:'maikaefer_koenig',affinity:80}],
 rice:[...rows(['abyss_rabbit','tanzlichter','junghexe','fire_spirit','abyss_mushroom','prism_moth','abyss_crystal_beetle','amethyst_golem','cassowary','abyss_lizard']),
  {id:'maikaefer',affinity:1},{id:'silberkaefer',affinity:2},{id:'maikaefer_koenig',affinity:1}],
 dusk:[...rows(['wandering_dead','vampire_bat','geistflamme','banshee','wraith','sensenmann','will_o_wisp','schleipnir']),
  {id:'maikaefer',affinity:1},{id:'silberkaefer',affinity:1},{id:'maikaefer_koenig',affinity:1}],
 tender:[...rows(['abyss_rabbit','viper','giant_spider','wasp','poison_toad','abyss_tiger','abyss_panther','abyss_mushroom','prism_moth','abyss_crystal_beetle']),
  {id:'maikaefer',affinity:2},{id:'silberkaefer',affinity:1},{id:'maikaefer_koenig',affinity:2}],
}).map(([id,pool])=>[id,Object.freeze(pool.map(Object.freeze))])));
function validate(input){
 validateSpecialTheme(input?.themeId,input?.level);
 if(input.ruleset!=='special-map-v2'||!Number.isInteger(input.seed)||input.seed<0||input.seed>65535||!['WHITE','SILVER','GOLD'].includes(input.rarity))throw RangeError('Invalid special ecology input');
}
export function getV2Candidate2Candidates(input,floorIndex=0){
 if(NORMAL_MAP_THEMES.includes(input?.themeId))return getV2EcologyCandidates(input,floorIndex);
 validate(input);if(!Number.isInteger(floorIndex)||floorIndex<0||floorIndex>2)throw RangeError('Invalid floor');
 const target=input.level+floorIndex*5;
 return SPECIAL_ECOLOGY_POOLS[input.themeId].filter(r=>{
  const s=V2_ECOLOGY_SPECIES[r.id];return s.level<=Math.max(5,target)&&(!s.mapExclusive||input.level>=s.minLevel);
 }).map(row=>{
  const s=V2_ECOLOGY_SPECIES[row.id],rare=s.mapExclusive||s.id==='maikaefer';
  const relevance=s.mapExclusive?20+Math.floor((input.level-s.minLevel)/10):s.id==='maikaefer'?10:Math.max(1,30-Math.abs(s.level-target));
  return {id:s.id,level:s.level,selectionWeight:s.baseWeight*row.affinity*relevance*(rare?{WHITE:100,SILVER:110,GOLD:120}[input.rarity]:100)};
 });
}
function pick(next,rows){let n=chooseIndexV1(next,rows.reduce((a,r)=>a+r.selectionWeight,0));for(const row of rows){if(n<row.selectionWeight)return row;n-=row.selectionWeight;}throw Error('Empty special ecology pool');}
function distribute(total,raw){
 const sum=raw.reduce((a,b)=>a+b,0),budget=total-raw.length,result=raw.map(n=>1+Math.floor(n*budget/sum));
 const order=raw.map((_,i)=>i).sort((a,b)=>(raw[b]*budget)%sum-(raw[a]*budget)%sum||a-b);
 for(let i=0,left=total-result.reduce((a,b)=>a+b,0);i<left;i++)result[order[i]]++;
 return result;
}
// Normal outputs INCLUDING revision/fingerprint are returned byte-for-byte as C1.
// This compatibility dispatch avoids consuming or renaming any C1 stream.
export function generateV2EcologyCandidate2(input){
 if(NORMAL_MAP_THEMES.includes(input?.themeId))return generateV2Ecology(input);
 validate(input);
 const rng=purpose=>streamV1(input.ruleset,input.seed,JSON.stringify([V2_ECOLOGY_CANDIDATE_2,input.level,input.rarity,input.themeId,purpose]));
 const dominantSpeciesId=pick(rng('dominant'),getV2Candidate2Candidates(input)).id;
 const extreme=chooseIndexV1(rng('dominance'),10000)<200,floors=[];
 for(let floorIndex=0;floorIndex<3;floorIndex++){
  const next=purpose=>rng(`floor-${floorIndex+1}-${purpose}`);
  const count=[3,3,4][floorIndex]+chooseIndexV1(next('species-count'),[2,3,2][floorIndex]);
  const remaining=getV2Candidate2Candidates(input,floorIndex).filter(s=>s.id!==dominantSpeciesId),ids=[dominantSpeciesId],choose=next('species-pick');
  while(ids.length<count){const choice=pick(choose,remaining.map(s=>({...s,selectionWeight:s.selectionWeight*(floors.at(-1)?.species.some(p=>p.id===s.id)?1:3)}))).id;ids.push(choice);remaining.splice(remaining.findIndex(s=>s.id===choice),1);}
  const random=next('weight'),dominantWeight=extreme?7000+chooseIndexV1(random,2601):3500+chooseIndexV1(random,2001);
  const weights=distribute(10000-dominantWeight,ids.slice(1).map(id=>(1+chooseIndexV1(random,100))*(floorIndex===0?1:Math.max(1,Math.ceil(V2_ECOLOGY_SPECIES[id].level/5))**(floorIndex+1))));
  const species=ids.map((id,i)=>({id,weight:i?weights[i-1]:dominantWeight}));
  const rareSpeciesRate=species.filter(s=>V2_MAP_SPECIES[s.id]||s.id==='maikaefer').reduce((n,s)=>n+s.weight,0),ecologyTags=[];
  if(Math.max(...species.map(s=>s.weight))>=7000)ecologyTags.push('dominant');
  if(rareSpeciesRate>=2000)ecologyTags.push('rare-rich');
  if(species.filter(s=>s.id.includes('kaefer')||s.id==='abyss_crystal_beetle').reduce((n,s)=>n+s.weight,0)>=3000)ecologyTags.push('beetle-rich');
  ecologyTags.push(count===5?'high-diversity':count===3?'low-diversity':'medium-diversity');
  floors.push({floorIndex,species,rareSpeciesRate,ecologyTags});
 }
 const e={revision:V2_ECOLOGY_CANDIDATE_2,ruleset:input.ruleset,seed:input.seed,level:input.level,rarity:input.rarity,themeId:input.themeId,dominantSpeciesId,floors};
 return {...e,fingerprint:hash32V1(canonicalV2Ecology(e)).toString(16).padStart(8,'0')};
}
