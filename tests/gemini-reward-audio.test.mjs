import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('js/main.js','utf8');
const body=source.slice(source.indexOf('  function showCardGetEffect('),source.indexOf('  function acquireEventItems('));
test('Gemini follow-up audio runs after popup closes; other card rewards keep their sound',()=>{
 for(const follow of [null,'importantItem']) {
  let timer;const calls=[];
  const effect={hidden:true,classList:{remove(){},add(){}},offsetWidth:1};
  const window={clearTimeout(){},setTimeout(fn,ms){assert.equal(ms,3400);timer=fn;return 1;}};
  const show=new Function('window','getCardById','cardGetEffect','cardGetCanvas','townScreen','document','playSe','drawCardCanvas',`let cardGetTimer;${body};return showCardGetEffect;`)(window,()=>({}),effect,{}, {hidden:false,querySelector:()=>null},{querySelector:()=>null},id=>calls.push([id,effect.hidden]),()=>{});
  show('zodiac_gemini',{afterSeId:follow});assert.equal(effect.hidden,false);assert.deepEqual(calls,[['battleVictory',true]]);
  timer();assert.equal(effect.hidden,true);assert.deepEqual(calls,follow?[['battleVictory',true],['importantItem',true]]:[['battleVictory',true]]);
 }
});
