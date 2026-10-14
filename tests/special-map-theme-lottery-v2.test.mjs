import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseWeightedThemeV2,V2_THEME_WEIGHT_TABLE,V2_GOLD_LEVEL_100_THEME_WEIGHTS,resolveV2AppraisalTheme,selectV2NormalTheme,v2ThemeWeightsForLevel} from '../data/special-map-theme-lottery-v2.js';

test('V2 normal theme table exactly matches every Excel level band',()=>{
 const expected=[
  [1,10,{slate:50,magic:30,torture:10,red:5,blue:5}],
  [11,20,{magic:50,torture:30,red:10,blue:5,green:5}],
  [21,30,{magic:10,torture:50,red:25,blue:10,green:5}],
  [31,40,{torture:10,red:50,blue:25,green:10,yellow:5}],
  [41,50,{red:10,blue:50,green:25,yellow:10,water:5}],
  [51,60,{blue:10,green:50,yellow:25,water:10,crystal:5}],
  [61,70,{green:10,yellow:50,water:25,crystal:10,black:5}],
  [71,80,{green:5,yellow:10,water:50,crystal:25,black:10}],
  [81,90,{green:5,yellow:5,water:10,crystal:50,black:30}],
  [91,99,{green:5,yellow:5,water:10,crystal:30,black:50}],
  [100,100,{slate:1,magic:1,torture:1,red:1,blue:1,green:5,yellow:5,water:10,crystal:30,black:45}],
 ];
 assert.deepEqual(V2_THEME_WEIGHT_TABLE.map(({min,max,weights})=>[min,max,{...weights}]),expected);
 for(const [, ,weights] of expected)assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),100);
 assert.throws(()=>v2ThemeWeightsForLevel(0));assert.throws(()=>v2ThemeWeightsForLevel(101));
});

test('weighted choices use exact integer boundaries',()=>{
 assert.deepEqual(Array.from({length:100},(_,roll)=>chooseWeightedThemeV2({slate:50,magic:30,torture:10,red:5,blue:5},roll)).reduce((counts,id)=>(counts[id]=(counts[id]??0)+1,counts),{}),{slate:50,magic:30,torture:10,red:5,blue:5});
 assert.deepEqual(Array.from({length:100},(_,roll)=>chooseWeightedThemeV2(V2_GOLD_LEVEL_100_THEME_WEIGHTS,roll)).reduce((counts,id)=>(counts[id]=(counts[id]??0)+1,counts),{}),{gold:4,rice:32,dusk:32,tender:32});
 assert.throws(()=>chooseWeightedThemeV2({slate:99},99));
});

test('theme selection stays deterministic while following the selected level band',()=>{
 const base={ruleset:'special-map-v2',seed:12345};
 assert.equal(selectV2NormalTheme({...base,level:1}),'torture');
 assert.equal(selectV2NormalTheme({...base,level:61}),'crystal');
 assert.equal(selectV2NormalTheme({...base,level:100}),'black');
 assert.equal(selectV2NormalTheme({...base,level:100}),selectV2NormalTheme({...base,level:100}));
});

test('only an unidentified Lv100 GOLD map resolves to a stable special theme at appraisal',()=>{
 const base={rulesetVersion:'special-map-v2',seed:9,level:100,rarity:'GOLD',discovererName:'A'};
 assert.deepEqual(resolveV2AppraisalTheme(base),{...base,themeOverride:'gold'});
 assert.deepEqual(resolveV2AppraisalTheme({...base,seed:0}),{...base,seed:0,themeOverride:'tender'});
 for(const change of [{level:99},{rarity:'SILVER'},{themeOverride:'rice'}])assert.deepEqual(resolveV2AppraisalTheme({...base,...change}),{...base,...change});
});
