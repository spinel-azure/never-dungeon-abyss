import {hmacSha256} from '../js/save-integrity.js';
import {SPECIAL_MAP_RULESET,SPECIAL_MAP_V2,MAP_RARITIES,isV2Map,validV2Parameters,validateMapSignature} from './special-maps.js';

export const MAP_CODE_PREFIX='NDA:';
// Format 1: version, ruleset, uint16-BE seed, name length, UTF-16BE name, tag.
// Format 2: version, ruleset, uint16-BE seed, level, rarity, name length, name, tag.
// Format and ruleset are independent bytes. Only the supported pairs are accepted.
// Rarity bytes 0/1/2 mean WHITE/SILVER/GOLD; both formats use an 8-byte tag.
// Public client-side deterrent, isolated from save protection; not identity proof.
const KEY='NDA::SPECIAL-MAP-CODE::16BIT::2026::V1';
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const tag=bytes=>Uint8Array.from(hmacSha256(bytes[0]===2?'NDA::SPECIAL-MAP-CODE::16BIT::2026::V2':KEY,(bytes[0]===2?'map-original-v2:':'map-original-v1:')+encode(bytes)).slice(0,16).match(/../g),h=>parseInt(h,16));
export function encodeMapCode(map) {
  const v2=isV2Map(map);
  if(v2&&!validV2Parameters(map))throw Error('地図Lv・レアリティが正しくありません。');
  if(!v2&&map.rulesetVersion!==SPECIAL_MAP_RULESET)throw Error('未対応の生成ルール版です。');
  if(!Number.isInteger(map.seed)||map.seed<0||map.seed>65535)throw Error('地図seedが正しくありません。');
  const signature=validateMapSignature(map.discovererName);
  if(!signature.ok)throw Error('発見者署名が正しくありません。');
  const name=signature.value,offset=v2?7:5,body=new Uint8Array(offset+name.length*2);
  // 0x80 explicitly means Phase 2A provisional rules; 1 remains reserved for V1.
  body.set(v2?[2,2,map.seed>>>8,map.seed&255,map.level,MAP_RARITIES.indexOf(map.rarity),name.length]:[1,0x80,map.seed>>>8,map.seed&255,name.length]);
  for(let i=0;i<name.length;i++){body[offset+i*2]=name.charCodeAt(i)>>>8;body[offset+1+i*2]=name.charCodeAt(i)&255;}
  const bytes=new Uint8Array(body.length+8);bytes.set(body);bytes.set(tag(body),body.length);
  return MAP_CODE_PREFIX+encode(bytes);
}
export function decodeMapCode(input) {
  const fail=error=>({ok:false,error});
  if(typeof input!=='string'||input.length>512)return fail('地図コードの長さが正しくありません。');
  const text=input.trim();
  const prefix=/^NDA(?:16)?:/i.exec(text);
  if(!prefix)return fail('地図コードの接頭辞が正しくありません。NDA: から始まるコードを入力してください。');
  // Only the prefix is case-insensitive. Never repair or normalize the payload.
  const payload=text.slice(prefix[0].length);
  const code=MAP_CODE_PREFIX+payload;
  if(!/^[A-Za-z0-9_-]+$/.test(payload))return fail('地図コードの文字形式が正しくありません。');
  let bytes;
  try {bytes=Uint8Array.from(atob(payload.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-payload.length%4)%4)),c=>c.charCodeAt(0));}catch{return fail('地図コードの長さ・形式が正しくありません。');}
  if(bytes.length<15||bytes.length>23||encode(bytes)!==payload)return fail('地図コードの長さ・形式が正しくありません。');
  if(bytes[0]!==1&&bytes[0]!==2)return fail('このコード仕様版には対応していません。');
  const v2=bytes[0]===2,offset=v2?7:5;
  const length=bytes[offset-1];if(length<1||length>4||bytes.length!==offset+8+length*2)return fail('地図コードのデータ長が正しくありません。');
  const body=bytes.subarray(0,-8),expected=tag(body);let difference=0;
  for(let i=0;i<8;i++)difference|=expected[i]^bytes[body.length+i];
  if(difference)return fail('地図コードの検証に失敗しました。コピーした内容を確認してください。');
  if(bytes[1]!==(v2?2:0x80))return fail('この地図の生成ルール版には対応していません。');
  if(v2&&(bytes[4]<1||bytes[4]>100||bytes[5]>2))return fail('地図Lv・レアリティが正しくありません。');
  let name='';for(let i=0;i<length;i++)name+=String.fromCharCode(bytes[offset+i*2]*256+bytes[offset+1+i*2]);
  const signature=validateMapSignature(name);
  if(!signature.ok||signature.value!==name)return fail('地図コードの発見者署名が正しくありません。');
  return {ok:true,map:{rulesetVersion:v2?SPECIAL_MAP_V2:SPECIAL_MAP_RULESET,...(v2?{level:bytes[4],rarity:MAP_RARITIES[bytes[5]]}:{}),seed:bytes[2]*256+bytes[3],discovererName:name},code};
}
