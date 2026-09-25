// Phase 2A ownership data. This ruleset is deliberately NOT the future dungeon V1.
export const SPECIAL_MAP_RULESET = 'phase2a-1';
export const UNIDENTIFIED_LIMIT = 3;
export const REGISTERED_LIMIT = 10;

export function validateMapSignature(input) {
  const value = String(input ?? '').trim().normalize('NFC');
  const allowed = /^[A-Za-z0-9\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fd-\u30ff\u3400-\u4dbf\u4e00-\u9fff☆★†・ー!?]{1,4}$/u;
  return allowed.test(value)
    ? {ok:true,value}
    : {ok:false,error:'署名は日本語・英数字・☆ ★ † ・ ー ! ? の1～4文字で入力してください。絵文字・特殊な漢字は使えません。'};
}
export function mapOriginalId(map) {
  return JSON.stringify([map.rulesetVersion,map.seed,map.discovererName]);
}
export function mapContentId(map) { return JSON.stringify([map.rulesetVersion,map.seed]); }
function normalizeOriginal(map) {
  if(!map || !Number.isInteger(map.seed) || map.seed<0 || map.seed>65535 || typeof map.rulesetVersion!=='string' || !map.rulesetVersion) return null;
  const signature=validateMapSignature(map.discovererName);
  if(!signature.ok)return null;
  return {...map,discovererName:signature.value};
}
export function normalizeSpecialMaps(input) {
  const signature=validateMapSignature(input?.discovererName);
  const clean=list=>(Array.isArray(list)?list:[]).map(normalizeOriginal).filter(Boolean);
  const registered=[...new Map(clean(input?.registered).map(map=>[mapOriginalId(map),{...map,id:mapOriginalId(map),acquisitionMethod:map.acquisitionMethod==='shared'?'shared':'discovered'}])).values()].slice(0,REGISTERED_LIMIT);
  const unidentified=clean(input?.unidentified).slice(0,UNIDENTIFIED_LIMIT).map((map,index)=>({...map,discoveryId:typeof map.discoveryId==='string'&&map.discoveryId?map.discoveryId:`legacy-${index}-${mapOriginalId(map)}`}));
  return {dataVersion:1,discovererName:signature.ok?signature.value:'',unidentified,registered};
}
export function describeTestMap(map) {
  if(map.rulesetVersion!==SPECIAL_MAP_RULESET)return null;
  const prefixes=['ざわめく','残された','呪われし','見果てぬ','あらぶる','静寂の'];
  const themes=['甲虫','黄金','奈落','薄明','氷雪','残響'];
  return {name:`${prefixes[map.seed%6]}${themes[Math.floor(map.seed/6)%6]}の地図`,level:1+Math.floor(map.seed/36)%99};
}
export function setMapSignature(state,input) {
  if(state.discovererName)return {ok:false,error:'地図署名は登録済みです。'};
  const result=validateMapSignature(input);
  return result.ok?{ok:true,state:{...state,discovererName:result.value}}:result;
}
export function discoverTestMap(state,{seed=()=>crypto.getRandomValues(new Uint16Array(1))[0],id=()=>crypto.randomUUID()}={}) {
  if(!state.discovererName)return {ok:false,error:'先に探検家テントで地図署名を登録してください。'};
  if(state.unidentified.length>=UNIDENTIFIED_LIMIT)return {ok:false,error:'未鑑定の地図をこれ以上持てません。先に地図を鑑定してください。'};
  const map={seed:seed(),rulesetVersion:SPECIAL_MAP_RULESET,discovererName:state.discovererName,discoveryId:id()};
  if(!normalizeOriginal(map))return {ok:false,error:'地図の発見に失敗しました。'};
  return {ok:true,state:{...state,unidentified:[...state.unidentified,map]},map};
}
export function inspectAppraisal(state,discoveryId) {
  const map=state.unidentified.find(m=>m.discoveryId===discoveryId);
  if(!map)return {ok:false,error:'鑑定する地図が見つかりません。'};
  const existing=state.registered.find(m=>mapOriginalId(m)===mapOriginalId(map));
  if(existing)return {ok:true,map:existing,duplicate:true};
  if(state.registered.length>=REGISTERED_LIMIT)return {ok:false,error:'地図帳がいっぱいです。登録済みの地図を整理してから鑑定してください。'};
  if(!describeTestMap(map))return {ok:false,error:'この生成ルール版の鑑定には対応していません。'};
  return {ok:true,map:{...map,id:mapOriginalId(map),cleared:false,acquisitionMethod:'discovered'},duplicate:false};
}
export function appraiseMap(state,discoveryId) {
  const result=inspectAppraisal(state,discoveryId);
  if(!result.ok)return result;
  return {...result,state:{...state,unidentified:state.unidentified.filter(m=>m.discoveryId!==discoveryId),registered:result.duplicate?state.registered:[...state.registered,result.map]}};
}
export function registerSharedMap(state,original,{confirmSameContent=false}={}) {
  const map=normalizeOriginal(original);
  if(!map || !describeTestMap(map))return {ok:false,error:'この地図は現在のバージョンでは読み込めません。'};
  const existing=state.registered.find(m=>mapOriginalId(m)===mapOriginalId(map));
  if(existing)return {ok:true,state,map:existing,duplicate:true};
  if(state.registered.length>=REGISTERED_LIMIT)return {ok:false,error:'地図帳がいっぱいです。登録済みの地図を整理してから登録してください。'};
  const same=state.registered.find(m=>mapContentId(m)===mapContentId(map));
  if(same&&!confirmSameContent)return {ok:false,needsConfirmation:true,discoverer:same.discovererName};
  const entry={rulesetVersion:map.rulesetVersion,seed:map.seed,discovererName:map.discovererName,id:mapOriginalId(map),cleared:false,favorite:false,memo:'',acquisitionMethod:'shared'};
  return {ok:true,state:{...state,registered:[...state.registered,entry]},map:entry};
}
export function deleteRegisteredMap(state,id) {
  const map=state.registered.find(m=>m.id===id);
  if(!map)return {ok:false,error:'地図が見つかりません。'};
  if(map.favorite)return {ok:false,error:'お気に入り登録を解除してから削除してください。'};
  return {ok:true,state:{...state,registered:state.registered.filter(m=>m.id!==id)}};
}
export function toggleMapFavorite(state,id) {
  if(!state.registered.some(m=>m.id===id))return {ok:false,error:'地図が見つかりません。'};
  return {ok:true,state:{...state,registered:state.registered.map(m=>m.id===id?{...m,favorite:!m.favorite}:m)}};
}

// Publish the entire new character snapshot, then roll back on a failed commit.
// No UI transition consumes a map before this succeeds.
export function transactSpecialMaps({getCharacter,setCharacter,save},operation) {
  const previous=getCharacter();
  if(!previous)return {ok:false,error:'冒険者が登録されていません。'};
  const result=operation(normalizeSpecialMaps(previous.specialMaps));
  if(!result.ok)return result;
  try {
    setCharacter({...previous,specialMaps:result.state});
    if(save())return result;
  } catch {}
  setCharacter(previous);
  return {ok:false,error:'保存に失敗しました。地図は変更していません。空き容量を確認してから、もう一度お試しください。'};
}
