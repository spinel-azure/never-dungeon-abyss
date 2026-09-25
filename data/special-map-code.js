import {hmacSha256} from '../js/save-integrity.js';
import {SPECIAL_MAP_RULESET,validateMapSignature} from './special-maps.js';

export const MAP_CODE_PREFIX='NDA16:';
// Public client-side deterrent, isolated from save protection; not identity proof.
const KEY='NDA::SPECIAL-MAP-CODE::16BIT::2026::V1';
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const tag=bytes=>Uint8Array.from(hmacSha256(KEY,'map-original-v1:'+encode(bytes)).slice(0,16).match(/../g),h=>parseInt(h,16));
export function encodeMapCode(map) {
  if(map.rulesetVersion!==SPECIAL_MAP_RULESET)throw Error('未対応の生成ルール版です。');
  if(!Number.isInteger(map.seed)||map.seed<0||map.seed>65535)throw Error('地図seedが正しくありません。');
  const signature=validateMapSignature(map.discovererName);
  if(!signature.ok)throw Error('発見者署名が正しくありません。');
  const name=signature.value,body=new Uint8Array(5+name.length*2);
  // 0x80 explicitly means Phase 2A provisional rules; 1 remains reserved for V1.
  body.set([1,0x80,map.seed>>>8,map.seed&255,name.length]);
  for(let i=0;i<name.length;i++){body[5+i*2]=name.charCodeAt(i)>>>8;body[6+i*2]=name.charCodeAt(i)&255;}
  const bytes=new Uint8Array(body.length+8);bytes.set(body);bytes.set(tag(body),body.length);
  return MAP_CODE_PREFIX+encode(bytes);
}
export function decodeMapCode(input) {
  const fail=error=>({ok:false,error});
  if(typeof input!=='string'||input.length>512)return fail('地図コードの長さが正しくありません。');
  const code=input.replace(/[ \t\r\n]/g,'');
  if(!code.startsWith(MAP_CODE_PREFIX))return fail('地図コードの接頭辞が正しくありません。NDA16: から始まるコードを入力してください。');
  const payload=code.slice(MAP_CODE_PREFIX.length);
  if(!/^[A-Za-z0-9_-]+$/.test(payload))return fail('地図コードの文字形式が正しくありません。');
  let bytes;
  try {bytes=Uint8Array.from(atob(payload.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-payload.length%4)%4)),c=>c.charCodeAt(0));}catch{return fail('地図コードの長さ・形式が正しくありません。');}
  if(bytes.length<15||bytes.length>21||encode(bytes)!==payload)return fail('地図コードの長さ・形式が正しくありません。');
  if(bytes[0]!==1)return fail('このコード仕様版には対応していません。');
  const length=bytes[4];if(length<1||length>4||bytes.length!==13+length*2)return fail('地図コードのデータ長が正しくありません。');
  const body=bytes.subarray(0,-8),expected=tag(body);let difference=0;
  for(let i=0;i<8;i++)difference|=expected[i]^bytes[body.length+i];
  if(difference)return fail('地図コードの検証に失敗しました。コピーした内容を確認してください。');
  if(bytes[1]!==0x80)return fail('この地図の生成ルール版には対応していません。');
  let name='';for(let i=0;i<length;i++)name+=String.fromCharCode(bytes[5+i*2]*256+bytes[6+i*2]);
  const signature=validateMapSignature(name);
  if(!signature.ok||signature.value!==name)return fail('地図コードの発見者署名が正しくありません。');
  return {ok:true,map:{rulesetVersion:SPECIAL_MAP_RULESET,seed:bytes[2]*256+bytes[3],discovererName:name},code};
}
