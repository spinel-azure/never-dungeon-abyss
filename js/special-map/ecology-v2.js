import {streamV1,chooseIndexV1,hash32V1} from './random-v1.js';
import {V2_ECOLOGY_CATALOG,V2_ECOLOGY_POOLS} from './ecology-pools-v2.js';

export const V2_ECOLOGY_REVISION='v2-ecology-candidate-1';
export const V2_MAP_SPECIES=Object.freeze({
  silberkaefer:Object.freeze({id:'silberkaefer',name:'ズィルバーケーファー',level:10,minLevel:10,baseWeight:6,mapExclusive:true,themes:Object.freeze(['crystal','slate','magic'])}),
  maikaefer_koenig:Object.freeze({id:'maikaefer_koenig',name:'マイケーファーケーニヒ',level:60,minLevel:60,baseWeight:1,mapExclusive:true,themes:Object.freeze(['green','crystal','yellow'])}),
});
export const V2_ECOLOGY_SPECIES=Object.freeze({...V2_ECOLOGY_CATALOG,...V2_MAP_SPECIES});
function validate(input) {
  if(!input||input.ruleset!=='special-map-v2'||!Number.isInteger(input.seed)||input.seed<0||input.seed>65535
    ||!Number.isInteger(input.level)||input.level<1||input.level>100||!['WHITE','SILVER','GOLD'].includes(input.rarity)
    ||!Object.hasOwn(V2_ECOLOGY_POOLS,input.themeId))throw RangeError('Invalid V2 ecology input');
}
function rng(input,purpose){return streamV1(input.ruleset,input.seed,JSON.stringify([V2_ECOLOGY_REVISION,input.level,input.rarity,input.themeId,purpose]));}
function pick(next,rows){
  let value=chooseIndexV1(next,rows.reduce((n,r)=>n+r.selectionWeight,0));
  for(const row of rows){if(value<row.selectionWeight)return row;value-=row.selectionWeight;}
  throw Error('Empty V2 ecology pool');
}
export function getV2EcologyCandidates(input,floorIndex=0){
  validate(input);
  if(!Number.isInteger(floorIndex)||floorIndex<0||floorIndex>2)throw RangeError('Invalid floor index');
  const ceiling=Math.max(5,input.level+floorIndex*5),target=input.level+floorIndex*5;
  const rows=V2_ECOLOGY_POOLS[input.themeId].map(row=>({...V2_ECOLOGY_CATALOG[row.id],affinity:row.affinity}));
  for(const species of Object.values(V2_MAP_SPECIES))if(input.level>=species.minLevel)rows.push({...species,affinity:species.themes.includes(input.themeId)?2:1});
  return rows.filter(s=>s.level<=ceiling).map(s=>{
    // Lv eligibility is strict; rarity cannot introduce an over-level species.
    // Preserve a small low-level tail while favoring enemies near the target Lv.
    const strength=s.id==='maikaefer'?10:Math.max(1,30-Math.abs(s.level-target));
    const rare=s.mapExclusive||s.id==='maikaefer';
    const rarity=rare?({WHITE:100,SILVER:110,GOLD:120}[input.rarity]):100;
    // Rare metadata has no combat stats yet. Its Lv is an eligibility marker;
    // retain eligibility at high Lv rather than treating it as obsolete prey.
    const relevance=s.mapExclusive?20+Math.floor((input.level-s.minLevel)/10):strength;
    return {id:s.id,level:s.level,selectionWeight:s.baseWeight*s.affinity*relevance*rarity};
  });
}
function distribute(total,raw){
  const sum=raw.reduce((a,b)=>a+b,0),budget=total-raw.length;
  const result=raw.map(v=>1+Math.floor(v*budget/sum));
  const order=raw.map((_,i)=>i).sort((a,b)=>(raw[b]*budget)%sum-(raw[a]*budget)%sum||a-b);
  for(let left=total-result.reduce((a,b)=>a+b,0),i=0;i<left;i++)result[order[i]]++;
  return result;
}
export function canonicalV2Ecology(ecology){
  return JSON.stringify([ecology.revision,ecology.ruleset,ecology.seed,ecology.level,ecology.rarity,ecology.themeId,
    ecology.dominantSpeciesId,ecology.floors.map(f=>[f.floorIndex,f.species.map(s=>[s.id,s.weight])])]);
}
export function generateV2Ecology(input){
  validate(input);
  const dominantSpeciesId=pick(rng(input,'v2-ecology-dominant'),getV2EcologyCandidates(input,0)).id;
  // A map-wide, species-independent 2% dominance tail; no special seeds.
  const extreme=chooseIndexV1(rng(input,'v2-ecology-dominance'),10000)<200;
  const floors=[];
  for(let floorIndex=0;floorIndex<3;floorIndex++){
    const next=purpose=>rng(input,`v2-ecology-floor-${floorIndex+1}-${purpose}`);
    const count=[3,3,4][floorIndex]+chooseIndexV1(next('species-count'),[2,3,2][floorIndex]);
    const candidates=getV2EcologyCandidates(input,floorIndex);
    const remaining=candidates.filter(s=>s.id!==dominantSpeciesId),selected=[dominantSpeciesId];
    const choose=next('species-pick');
    while(selected.length<count){
      // Encourage turnover without forcefully replacing the shared dominant.
      const weighted=remaining.map(s=>({...s,selectionWeight:s.selectionWeight*(floors.at(-1)?.species.some(p=>p.id===s.id)?1:3)}));
      const id=pick(choose,weighted).id;selected.push(id);remaining.splice(remaining.findIndex(s=>s.id===id),1);
    }
    const weightRng=next('weight');
    const dominantWeight=extreme?7000+chooseIndexV1(weightRng,2601):3500+chooseIndexV1(weightRng,2001);
    // Extra deep-floor species must not dilute danger with a uniform share of
    // weak monsters. Weight stronger selected species more heavily at depth.
    const otherWeights=distribute(10000-dominantWeight,selected.slice(1).map(id=>{
      const tier=Math.max(1,Math.ceil(V2_ECOLOGY_SPECIES[id].level/5));
      return (1+chooseIndexV1(weightRng,100))*(floorIndex===0?1:tier**(floorIndex+1));
    }));
    const species=selected.map((id,i)=>({id,weight:i===0?dominantWeight:otherWeights[i-1]}));
    const rareSpeciesRate=species.filter(s=>V2_ECOLOGY_SPECIES[s.id].mapExclusive||s.id==='maikaefer').reduce((n,s)=>n+s.weight,0);
    const tags=[];
    if(Math.max(...species.map(s=>s.weight))>=7000)tags.push('dominant');
    if(rareSpeciesRate>=2000)tags.push('rare-rich');
    if(species.filter(s=>s.id.includes('kaefer')||s.id==='abyss_crystal_beetle').reduce((n,s)=>n+s.weight,0)>=3000)tags.push('beetle-rich');
    tags.push(count===5?'high-diversity':count===3?'low-diversity':'medium-diversity');
    floors.push({floorIndex,species,rareSpeciesRate,ecologyTags:tags});
  }
  const ecology={revision:V2_ECOLOGY_REVISION,ruleset:input.ruleset,seed:input.seed,level:input.level,rarity:input.rarity,themeId:input.themeId,dominantSpeciesId,floors};
  return {...ecology,fingerprint:hash32V1(canonicalV2Ecology(ecology)).toString(16).padStart(8,'0')};
}
// floorIndex is zero-based; map-level selection is shared, per-floor streams differ.
export function generateV2FloorEcology(input){
  if(!Number.isInteger(input?.floorIndex)||input.floorIndex<0||input.floorIndex>2)throw RangeError('Invalid floor index');
  const map=generateV2Ecology(input);
  return {...map.floors[input.floorIndex],dominantSpeciesId:map.dominantSpeciesId};
}
