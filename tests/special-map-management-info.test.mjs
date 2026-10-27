import test from 'node:test';
import assert from 'node:assert/strict';
import {getMapManagementInfo} from '../js/special-map/management-info.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {mapOriginalId,mapContentId,normalizeSpecialMaps} from '../data/special-maps.js';
import {surveyVisitV2} from '../data/special-map-survey-v2.js';
import {getV2BossItemRewards,rollV2Level100Engraving} from '../js/special-map/battle-rewards-v2.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
test('management ecology matches live exploration and independently unlocks historical floors',()=>{
 let masks=['f'.repeat(25),'0'.repeat(25),'f'.repeat(25)];
 for(let i=0;i<99;i++)masks=surveyVisitV2(masks,1,i%10,Math.floor(i/10));
 const original={...map,surveyedMasks:masks},before=JSON.stringify(original),s=createSpecialMapV2Session([original],mapOriginalId(original));
 try{
  const info=getMapManagementInfo(JSON.parse(before));assert.ok(info.area);assert.ok(info.environment);assert.equal(info.bossName,null);
  assert.equal(info.floors[1].count,99);assert.equal(info.floors[1].species,null);
  for(const i of [0,2]){assert.equal(info.floors[i].species.reduce((n,r)=>n+r.weight,0),10000);assert.deepEqual(info.floors[i].species.map(r=>r.weight),s.ecology.floors[i].species.map(r=>r.weight).sort((a,b)=>b-a));}
  assert.equal(JSON.stringify(original),before);
 }finally{s.disposeSurvey();}
});
test('saved boss clear history reveals the boss without requiring current expedition state',()=>{
 const state=normalizeSpecialMaps({registered:[map],bossClears:{[mapContentId(map)]:true}});
 assert.ok(getMapManagementInfo(state.registered[0]).bossName);
 assert.equal(getMapManagementInfo({...map,surveyedMasks:Array(3).fill('f'.repeat(25))}).bossName,null);
});
test('special themes use their real pools and keep undefeated goddess names private',()=>{
 for(const themeOverride of ['gold','rice','dusk','tender']){
  const m={...map,themeOverride,surveyedMasks:Array(3).fill('f'.repeat(25))},s=createSpecialMapV2Session([m],mapOriginalId(m));
  try{const info=getMapManagementInfo(m);assert.equal(info.bossName,null);assert.ok(getMapManagementInfo({...m,cleared:true}).bossName);
   for(let i=0;i<3;i++)assert.deepEqual(info.floors[i].species.map(r=>r.weight),s.ecology.floors[i].species.map(r=>r.weight).sort((a,b)=>b-a));
  }finally{s.disposeSurvey();}
 }
 assert.equal(getMapManagementInfo({...map,themeOverride:'rice',level:99,cleared:true}).bossName,null);
});
test('legacy maps retain their existing management view',()=>{assert.equal(getMapManagementInfo({...map,rulesetVersion:'special-map-v1'}),null);});
test('boss rewards stay private until cleared and match engraving lottery',()=>{
 assert.equal(getMapManagementInfo(map).bossDrops,null);
 assert.ok(getMapManagementInfo({...map,cleared:true}).bossDrops.some(x=>x.includes('未鑑定地図')));
 for(const themeId of ['slate','magic','torture','red','blue','black','gold','rice','dusk','tender']){
  const rewards=getV2BossItemRewards(themeId,100);assert.ok(Math.abs(rewards.reduce((n,r)=>n+r.rate,0)-(['gold','rice','dusk','tender'].includes(themeId)?.2:.25))<1e-9);
  for(let i=0;i<5;i++)assert.ok(rewards.some(r=>r.itemId===rollV2Level100Engraving({source:'special-map-v2-boss',mapLevel:100,themeId,engravingRandomValues:[.1,(i+.5)/5]})));
  assert.deepEqual(getV2BossItemRewards(themeId,99),[]);
 }
});
