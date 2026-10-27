import test from 'node:test';
import assert from 'node:assert/strict';
import {rollV2Level100Engraving,V2_LEVEL_100_ENGRAVINGS} from '../js/special-map/battle-rewards-v2.js';
const context={source:'special-map-v2-boss',mapLevel:100};
test('all normal themes have a 25% boundary while special and legacy themes retain 20%',()=>{
 for(const themeId of ['slate','magic','torture','red','blue','green','yellow','water','crystal','black','gold','rice','dusk','tender',undefined]){
  const special=['gold','rice','dusk','tender',undefined].includes(themeId),rate=special?.20:.25;
  assert.ok(rollV2Level100Engraving({...context,themeId,engravingRandomValues:[rate-0.000001,0]}));
  assert.equal(rollV2Level100Engraving({...context,themeId,engravingRandomValues:[rate,0]}),null);
 }
});
for(const [themeId,item] of Object.entries({slate:'strength_engraving',magic:'intelligence_engraving',torture:'agility_engraving',red:'dexterity_engraving',blue:'luck_engraving'}))test(`${themeId}: fixed engraving, 25% and Lv100 boss restriction`,()=>{
 for(const choice of [0,.2,.4,.6,.8,.999999]){
  let hits=0;
  for(let n=0;n<100;n++){
   const c={...context,themeId,engravingRandomValues:[n/100,choice]};
   const result=rollV2Level100Engraving(c,()=>{throw Error('stored roll must be reused');});
   assert.equal(result,n<25?item:null);if(result)hits++;
   assert.equal(rollV2Level100Engraving({...c,mapLevel:99}),null);
   assert.equal(rollV2Level100Engraving({...c,source:'special-map-v2'}),null);
  }
  assert.equal(hits,25);
 }
});
test('all other normal/special themes and old contexts keep random engraving selection',()=>{
 for(const themeId of ['green','yellow','water','crystal','black','gold','rice','dusk','tender',undefined]){
  for(const source of ['special-map-v2-boss','special-map-v2-special-boss']){
   const results=V2_LEVEL_100_ENGRAVINGS.map((_,i)=>rollV2Level100Engraving({...context,source,themeId,engravingRandomValues:[.199999,(i+.1)/5]}));
   assert.deepEqual(results,V2_LEVEL_100_ENGRAVINGS);
   assert.equal(rollV2Level100Engraving({...context,source,themeId,engravingRandomValues:[['green','yellow','water','crystal','black'].includes(themeId)?.25:.2,0]}),null);
  }
 }
});
