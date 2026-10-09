import test from 'node:test';
import assert from 'node:assert/strict';
import {rgbToHsl,hslToRgb,computeBossVariantAdjustments as compute,applyBossVariantPixels as pixels,createBossVariantCache,prepareBossVariantImage} from '../js/boss-color-variant.js';
const input = {bossId:'karte_boss_001',imagePath:'images/karte_bosses/karte_boss_001.avif',level:87,seed:12345,rarity:'GOLD'};
test('RGB/HSL roundtrips primary, gray and arbitrary colors',()=>{
  for(const rgb of [[0,0,0],[255,255,255],[128,128,128],[255,0,0],[0,255,0],[0,0,255],[12,81,149]]) assert.deepEqual(hslToRgb(...rgbToHsl(...rgb)),rgb);
});
test('deterministic dedicated adjustments vary with seed, level and rarity within safe bounds',()=>{
  assert.deepEqual(compute(input),compute(input));
  assert.ok(Math.abs(compute({...input,level:100}).hueShift)>Math.abs(compute({...input,level:1}).hueShift)+100);
  for(const change of [{seed:1},{level:1},{rarity:'WHITE'},{rarity:'SILVER'}]) assert.notDeepEqual(compute({...input,...change}),compute(input));
  let silver=0,gold=0;
  for(let seed=0;seed<1000;seed++) for(const rarity of ['WHITE','SILVER','GOLD']) {
    const a=compute({...input,seed,rarity,level:seed%100+1});
    assert.ok(Math.abs(a.hueShift)<=180 && a.saturationScale>=.75 && a.saturationScale<=1.4 && Math.abs(a.lightnessOffset)<=.06);
    if(rarity==='SILVER') silver+=a.saturationScale;
    if(rarity==='GOLD') gold+=a.saturationScale;
  }
  assert.ok(silver<1000 && gold>1000);
});
test('preparation waits for decode and preserves original on decode failure',async()=>{
  let decoded=false;
  const image={async decode(){await Promise.resolve();decoded=true;},naturalWidth:0,naturalHeight:0};
  assert.equal(await prepareBossVariantImage({...input,image}),image);assert.equal(decoded,true);
  image.decode=async()=>{throw Error('unavailable');};
  assert.equal(await prepareBossVariantImage({...input,image}),image);
});
test('pixels are deterministic, alpha and transparent RGB/black/grays preserved; low saturation attenuated',()=>{
  const source=new Uint8ClampedArray([92,43,177,0, 0,0,0,255, 12,8,9,128, 128,128,128,128, 255,255,255,255, 130,128,128,255, 210,70,35,128]);
  const a=pixels(source.slice(),compute(input)),b=pixels(source.slice(),compute(input));
  assert.deepEqual(a,b); assert.deepEqual(a.slice(0,20),source.slice(0,20));
  for(let i=3;i<a.length;i+=4) assert.equal(a[i],source[i]);
  assert.ok(Math.abs(a[20]-source[20])<3);
  assert.notDeepEqual(a.slice(24,27),source.slice(24,27));
  assert.deepEqual(pixels(source.slice(),{hueShift:999,saturationScale:999,lightnessOffset:999}),pixels(source.slice(),{hueShift:180,saturationScale:1.4,lightnessOffset:.06}));
});
function harness(fail=false,maxEntries=8) {
  const calls={get:0,put:0,draw:0};
  const cache=createBossVariantCache({maxEntries,createCanvas:()=>({getContext:()=>({
    set imageSmoothingEnabled(v){assert.equal(v,false);},
    drawImage(){calls.draw++;},getImageData(){calls.get++;if(fail)throw Error('tainted');return {data:new Uint8ClampedArray([200,60,20,255])};},
    putImageData(){calls.put++;},
  })})});
  return {cache,calls,options:{...input,image:{naturalWidth:600,naturalHeight:600}}};
}
test('cache hit performs zero canvas operations; clear regenerates; LRU is bounded',()=>{
  const {cache,calls,options}=harness(false,2);
  const first=cache.getBossVariantImage(options);
  assert.notEqual(first,options.image);assert.equal(cache.getBossVariantImage(options),first);
  assert.deepEqual(calls,{get:1,put:1,draw:1});
  cache.getBossVariantImage({...options,seed:2});cache.getBossVariantImage(options);
  cache.getBossVariantImage({...options,seed:3});assert.equal(cache.size,2);
  assert.equal(cache.getBossVariantImage(options),first);
  cache.getBossVariantImage({...options,seed:2});assert.equal(calls.get,4);
  cache.clearBossVariantCache();assert.equal(cache.size,0);
  cache.getBossVariantImage(options);assert.equal(calls.get,5);
});
test('CORS failures are negative cached and invalid or ordinary images always fall back',()=>{
  const {cache,calls,options}=harness(true);
  assert.equal(cache.getBossVariantImage(null),undefined);
  for(let i=0;i<2;i++) assert.equal(cache.getBossVariantImage(options),options.image);
  assert.equal(calls.get,1);assert.equal(calls.put,0);
  for(const change of [{bossId:'ordinary_boss'},{imagePath:'images/bosses/boss_02.avif'},{level:0},{level:101},{level:NaN},{seed:-1},{seed:65536},{rarity:'gold'},{rarity:'UNKNOWN'}]) {
    assert.equal(cache.getBossVariantImage({...options,...change}),options.image);
  }
  assert.equal(calls.get,1);
  const unloaded={naturalWidth:0,naturalHeight:0};assert.equal(cache.getBossVariantImage({...options,image:unloaded}),unloaded);
});
