import {SPECIAL_MAP_V2,UNIDENTIFIED_LIMIT,mapContentId,mapOriginalId,validateMapSignature} from './special-maps.js';
import {createUnidentifiedV2Map} from './special-map-starter.js';
import {NORMAL_MAP_THEMES} from './special-map-themes.js';

export const hasPendingMapReward=state=>state?.bossReward?.status==='pending';
export const MAP_REWARD_PENDING_MESSAGE='未受領の討伐地図報酬があります。探検家テントで受け取ってから、次の地図を探索してください。';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fail=error=>({ok:false,error});
export function isNormalMapRewardBattle(context){
 return context?.source==='special-map-v2-boss'&&NORMAL_MAP_THEMES.includes(context.themeId);
}
function sourceMap(context){return {rulesetVersion:SPECIAL_MAP_V2,seed:context.mapSeed,level:context.mapLevel,rarity:context.rarity};}
function matchesTicket(ticket,context){
 return ticket&&isNormalMapRewardBattle(context)&&ticket.battleUuid===context.battleUuid&&ticket.expeditionId===context.expeditionId&&ticket.contentId===context.contentId&&ticket.mapKey===context.mapKey;
}

// Persist the lottery inputs before combat. A victory resolves these saved inputs;
// neither retries nor normalization consume RNG. No reward is earned by preparation.
export function prepareMapBossReward(state,context,{random=Math.random}={}){
 if(!isNormalMapRewardBattle(context))return fail('この戦闘は次地図報酬の対象外です。');
 if(!uuid(context.battleUuid)||!uuid(context.expeditionId))return fail('戦闘識別情報が正しくありません。');
 if(matchesTicket(state.bossReward,context))return {ok:true,state};
 if(hasPendingMapReward(state))return fail(MAP_REWARD_PENDING_MESSAGE);
 const original=state.registered.find(map=>mapOriginalId(map)===context.mapKey);
 if(!original||original.themeOverride!=null||mapContentId(original)!==context.contentId||mapContentId(sourceMap(context))!==context.contentId)return fail('攻略元の地図を確認できませんでした。');
 if(!validateMapSignature(state.discovererName).ok)return fail('先に探検家テントで地図署名を登録してください。');
 const draw=limit=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid acquisition RNG');return Math.floor(n*limit);};
 let lottery;
 try{
  let seed=draw(65536);
  const occupied=new Set([...state.registered,...state.unidentified].filter(m=>m.rulesetVersion===SPECIAL_MAP_V2).map(m=>m.seed));
  for(let n=0;occupied.has(seed)&&n<65536;n++)seed=(seed+1)&65535;
  if(occupied.has(seed))return fail('次地図のseedを確保できませんでした。');
  lottery={seed,whiteIncrease:1+draw(5),rarityRoll:draw(100)};
 }catch{return fail('地図報酬の抽選情報を用意できませんでした。');}
 const ticket={version:1,status:'prepared',expeditionId:context.expeditionId,battleUuid:context.battleUuid,
  rewardId:`boss-map-${context.battleUuid}`,contentId:context.contentId,mapKey:context.mapKey,
  source:sourceMap(context),discovererName:state.discovererName,lottery};
 return {ok:true,state:{...state,bossReward:ticket}};
}

export function confirmMapBossVictory(state,context){
 const ticket=state.bossReward;
 if(!matchesTicket(ticket,context))return fail('保存済みの戦闘識別情報と一致しません。');
 if(ticket.status!=='prepared')return {ok:true,state,duplicate:true,reward:ticket.map};
 const {seed,whiteIncrease,rarityRoll}=ticket.lottery;
 const increase=ticket.source.rarity==='WHITE'?whiteIncrease:ticket.source.rarity==='SILVER'?10:20;
 const map={...createUnidentifiedV2Map({seed,level:Math.min(100,ticket.source.level+increase),
  rarity:rarityRoll<94?'WHITE':rarityRoll<99?'SILVER':'GOLD',discovererName:ticket.discovererName,discoveryId:ticket.rewardId}),acquisitionMethod:'boss'};
 return {ok:true,reward:map,state:{...state,
  bossClears:{...state.bossClears,[ticket.contentId]:true},
  registered:state.registered.map(m=>mapContentId(m)===ticket.contentId?{...m,cleared:true}:m),
  bossReward:{...ticket,status:'pending',map}}};
}

export function receiveMapBossReward(state){
 const ticket=state.bossReward;
 if(!hasPendingMapReward(state))return fail('未受領の討伐地図報酬はありません。');
 if(state.unidentified.length>=UNIDENTIFIED_LIMIT)return fail('未鑑定の地図が3枚あります。先に鑑定してから受け取ってください。');
 return {ok:true,map:ticket.map,state:{...state,unidentified:[...state.unidentified,ticket.map],bossReward:{...ticket,status:'received'}}};
}

// Strict schema: persisted originals contain no runtime floors, functions or Sets.
export function normalizeBossReward(input){
 if(!input||input.version!==1||!['prepared','pending','received'].includes(input.status)||!uuid(input.expeditionId)||!uuid(input.battleUuid)||input.rewardId!==`boss-map-${input.battleUuid}`)return null;
 const {source,lottery}=input;
 try{
  createUnidentifiedV2Map({...source,discovererName:input.discovererName,discoveryId:input.rewardId});
  if(source.rulesetVersion!==SPECIAL_MAP_V2||source.themeOverride!=null||input.contentId!==mapContentId(source))return null;
  const key=JSON.parse(input.mapKey);
  if(JSON.stringify(key.slice(0,-1))!==input.contentId||!validateMapSignature(key.at(-1)).ok)return null;
  if(!Number.isInteger(lottery?.seed)||lottery.seed<0||lottery.seed>65535||!Number.isInteger(lottery.whiteIncrease)||lottery.whiteIncrease<1||lottery.whiteIncrease>5||!Number.isInteger(lottery.rarityRoll)||lottery.rarityRoll<0||lottery.rarityRoll>99)return null;
  const clean={version:1,status:input.status,expeditionId:input.expeditionId,battleUuid:input.battleUuid,rewardId:input.rewardId,
   contentId:input.contentId,mapKey:input.mapKey,source:{rulesetVersion:SPECIAL_MAP_V2,seed:source.seed,level:source.level,rarity:source.rarity},discovererName:validateMapSignature(input.discovererName).value,
   lottery:{seed:lottery.seed,whiteIncrease:lottery.whiteIncrease,rarityRoll:lottery.rarityRoll}};
  if(input.status!=='prepared'){
   const map=createUnidentifiedV2Map(input.map);
   const increase=source.rarity==='WHITE'?lottery.whiteIncrease:source.rarity==='SILVER'?10:20;
   if(input.map.rulesetVersion!==SPECIAL_MAP_V2||map.discoveryId!==input.rewardId||map.seed!==lottery.seed||map.level!==Math.min(100,source.level+increase)||map.rarity!==(lottery.rarityRoll<94?'WHITE':lottery.rarityRoll<99?'SILVER':'GOLD')||map.discovererName!==clean.discovererName||input.map.themeOverride!=null)return null;
   clean.map={...map,acquisitionMethod:'boss'};
  }
  return clean;
 }catch{return null;}
}

export function normalizeMapContentHistory(input){
 return Object.fromEntries(Object.entries(input&&typeof input==='object'&&!Array.isArray(input)?input:{}).filter(([key,value])=>{
  if(value!==true)return false;
  try{const [rulesetVersion,seed,level,rarity,themeOverride,...rest]=JSON.parse(key);
   if(rest.length||rulesetVersion!==SPECIAL_MAP_V2)return false;
   createUnidentifiedV2Map({seed,level,rarity,discovererName:'QA',discoveryId:'validation'});
   return (themeOverride===undefined||['gold','rice','dusk','tender'].includes(themeOverride))&&mapContentId({rulesetVersion,seed,level,rarity,themeOverride})===key;
  }catch{return false;}
 }));
}
