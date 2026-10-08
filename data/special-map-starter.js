import {SPECIAL_MAP_V2,UNIDENTIFIED_LIMIT,validateMapSignature,validV2Parameters} from './special-maps.js';

export const STARTER_MAP_LABEL='はじまりの白地図';
export const unidentifiedMapLabel=map=>map?.acquisitionMethod==='starter'?STARTER_MAP_LABEL:'未鑑定の地図';

// Acquisition only. Appraisal never calls RNG. Future rewards can supply their
// already resolved level/rarity here without introducing a second map schema.
export function createUnidentifiedV2Map({seed,level,rarity,discovererName,discoveryId}){
 const signature=validateMapSignature(discovererName);
 if(!Number.isInteger(seed)||seed<0||seed>65535||!validV2Parameters({level,rarity})||!signature.ok||typeof discoveryId!=='string'||!discoveryId)throw RangeError('Invalid unidentified V2 map');
 return {rulesetVersion:SPECIAL_MAP_V2,seed,level,rarity,discovererName:signature.value,discoveryId};
}
// Production and development entitlements stay independent.
export const grantStarterMaps=(state,options)=>grantInitialBatch(state,'starterMapsGranted',options);
// The development route cannot consume the future production entitlement.
export const grantTestStarterMaps=(state,options)=>grantInitialBatch(state,'starterMapsTestGranted',options);
function grantInitialBatch(state,grantFlag,{random=Math.random,id=()=>crypto.randomUUID()}={}){
 if(state[grantFlag])return {ok:false,error:'はじまりの白地図は受け取り済みです。'};
 if(!validateMapSignature(state.discovererName).ok)return {ok:false,error:'先に地図署名を登録してください。'};
 // All or nothing: no RNG is consumed and no entitlement is lost while full.
 if(state.unidentified.length+3>UNIDENTIFIED_LIMIT)return {ok:false,error:'3枚まとめて渡すので、未鑑定の地図をすべて鑑定してから受け取りに来てね。'};
 const occupied=new Set([...state.unidentified,...state.registered].filter(m=>m.rulesetVersion===SPECIAL_MAP_V2).map(m=>m.seed));
 const draw=limit=>{const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw RangeError('Invalid acquisition random');return Math.floor(value*limit);};
 const batch=[];
 try{for(let i=0;i<3;i++){
  let seed=draw(65536);
  // Finite fallback even with a broken/repeating RNG. At most 10 registered seeds
  // exist, so a free value is guaranteed; no seed-dependent generator exceptions.
  for(let tries=0;occupied.has(seed)&&tries<65536;tries++)seed=(seed+1)&65535;
  if(occupied.has(seed))throw Error('No free seed');occupied.add(seed);
  const map=createUnidentifiedV2Map({seed,level:1+draw(5),rarity:'WHITE',discovererName:state.discovererName,discoveryId:`starter-${id()}-${i}`});
  batch.push({...map,acquisitionMethod:'starter'});
 }}catch{return {ok:false,error:'白地図を用意できませんでした。もう一度お試しください。'};}
 return {ok:true,maps:batch,state:{...state,[grantFlag]:true,unidentified:[...state.unidentified,...batch]}};
}

// Save the exact offer before delivery. Caller retains a failed preparation for retry.
export function prepareFormalStarter(state,options){
 if(state.starterMapsGranted)return {ok:false,error:'白地図は受け取り済みです。'};
 if(state.starterOffer?.length===3)return {ok:true,state,maps:state.starterOffer};
 const batch=grantStarterMaps(state,options);
 return batch.ok?{ok:true,maps:batch.maps,state:{...state,starterOffer:batch.maps}}:batch;
}
export function receiveFormalStarter(state){
 if(state.starterMapsGranted)return {ok:false,error:'白地図は受け取り済みです。'};
 if(state.unidentified.length)return {ok:false,error:'3枚まとめて渡すので、未鑑定の地図をすべて鑑定してから受け取りに来てね。'};
 if(state.starterOffer?.length!==3)return {ok:false,error:'白地図の準備が完了していません。'};
 const {starterOffer,...rest}=state;
 return {ok:true,maps:starterOffer,state:{...rest,starterMapsGranted:true,formalStarterIds:starterOffer.map(m=>m.discoveryId),unidentified:[...starterOffer]}};
}
