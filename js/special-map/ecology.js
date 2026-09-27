import {generateSpecialMap} from './generator.js';
import {streamV1,chooseIndexV1,hash32V1} from './random-v1.js';
import {ECOLOGY_V1_POOLS} from './ecology-pools-v1.js';

// Review candidate only. Approval is required before declaring ecology V1 frozen.
export const ECOLOGY_REVISION='v1-candidate-1';
export const ECOLOGY_TOTAL_WEIGHT=10000;
export const SPECIES_COUNT_WEIGHTS=Object.freeze([20,2000,3500,3000,1480]);
export const ECOLOGY_STREAMS=Object.freeze(['ecology-species-count','ecology-species','ecology-weights']);

function weightedIndex(next,weights){
 let roll=chooseIndexV1(next,weights.reduce((n,w)=>n+w,0));
 for(let i=0;i<weights.length;i++){if(roll<weights[i])return i;roll-=weights[i];}
 throw Error('Invalid ecology selection weights');
}

// Positive basis points; largest remainder, ties resolved by selection order.
export function normalizeEcologyWeights(raw){
 if(!Array.isArray(raw)||!raw.length||raw.length>5||raw.some(w=>!Number.isInteger(w)||w<1||w>1000000))throw RangeError('Invalid raw ecology weights');
 const total=raw.reduce((a,b)=>a+b,0),budget=ECOLOGY_TOTAL_WEIGHT-raw.length;
 const numerators=raw.map(w=>w*budget);
 const result=numerators.map(n=>1+Math.floor(n/total));
 const order=raw.map((_,i)=>i).sort((a,b)=>numerators[b]%total-numerators[a]%total||a-b);
 const left=ECOLOGY_TOTAL_WEIGHT-result.reduce((a,b)=>a+b,0);
 for(let i=0;i<left;i++)result[order[i]]++;
 return result;
}

export function canonicalEcology(ecology){
 return JSON.stringify([ecology.revision,ecology.ruleset,ecology.seed,ecology.themeId,ecology.species.map(s=>[s.monsterId,s.weight])]);
}
export function ecologyFingerprint(ecology){return hash32V1(canonicalEcology(ecology)).toString(16).padStart(8,'0');}

export function generateSpecialMapEcology(ruleset,seed,generatedMap){
 if(ruleset!=='special-map-v1'&&ruleset!=='phase2a-1')throw RangeError('Unsupported ecology ruleset');
 // Pure re-generation validates identity/theme; it cannot consume another caller's
 // streams. No Phase 3A primitive or blueprint is modified or extended.
 const map=generateSpecialMap(ruleset,seed);
 if(generatedMap&&(generatedMap.ruleset!==ruleset||generatedMap.seed!==seed||generatedMap.themeId!==map.themeId))throw RangeError('Ecology blueprint identity/theme mismatch');
 const pool=ECOLOGY_V1_POOLS[map.themeId];
 const countRng=streamV1(ruleset,seed,ECOLOGY_STREAMS[0]);
 const speciesRng=streamV1(ruleset,seed,ECOLOGY_STREAMS[1]);
 const weightRng=streamV1(ruleset,seed,ECOLOGY_STREAMS[2]);
 const count=Math.min(pool.length,1+weightedIndex(countRng,SPECIES_COUNT_WEIGHTS));
 const remaining=[...pool],selected=[];
 for(let i=0;i<count;i++)selected.push(remaining.splice(weightedIndex(speciesRng,remaining.map(s=>s.baseWeight)),1)[0]);
 // Cubing a uniform integer permits strong skew without species-specific rules.
 // Maximum numerator is below 1e10: all products remain exact JS integers.
 const weights=normalizeEcologyWeights(selected.map(()=>{const n=1+chooseIndexV1(weightRng,100);return n*n*n;}));
 const ecology={revision:ECOLOGY_REVISION,ruleset,seed,themeId:map.themeId,species:selected.map((s,i)=>({monsterId:s.monsterId,weight:weights[i]}))};
 return {...ecology,fingerprint:ecologyFingerprint(ecology)};
}
