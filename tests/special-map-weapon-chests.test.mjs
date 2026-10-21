import test from 'node:test';
import assert from 'node:assert/strict';
import {rollV2WeaponChest,rollV2BlackChest,OLD_MAP_WEAPONS,FINAL_MAP_WEAPONS,prepareV2Treasure,completeV2Treasure} from '../js/special-map/treasures-v2.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {serializeSpecialMapSession,restoreSpecialMapSession} from '../js/special-map/save-session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {createInitialCharacter} from '../data/classes.js';
import {getWeapon} from '../data/weapons.js';
import {getEquipmentInstanceDefinition,grantEquipmentInstance} from '../data/equipment-inventory.js';
import {REINCARNATION_WEAPONS} from '../data/reincarnation-weapons.js';
import {settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
function create(){return createSpecialMapV2Session([map],mapOriginalId(map),{scheduleSurvey:()=>null});}
function locate(s){const p=s.floors[0].treasures.find(x=>x.color==='black');s.playerX=p.x;s.playerY=p.y;return p;}
test('black loot probabilities, jobs, tiers and enhancement boundaries for all four themes',()=>{
 for(const level of [91,99,100])for(const theme of ['green','yellow','crystal','black'])for(let tier=0;tier<=3;tier++){
  const counts={item:0,equipment:0};for(let i=0;i<100;i++){let draw=0;const r=rollV2WeaponChest({level,theme,tier},()=>draw++?0:(i+.5)/100);counts[r.kind]++;}
  const rare=['green','yellow'].includes(theme);assert.equal(counts.equipment,level===100?(rare?65:60):(rare?55:50));
  for(const pick of [.1,.9])for(const [e,n] of (level===100?[[0,0],[.4,1],[.7,2],[.9,3]]:[[0,0],[.6,1],[.85,2],[.95,3]])){
   const draws=[.99,pick,e],r=rollV2WeaponChest({level,theme,tier},()=>draws.shift()),w=getWeapon(r.equipmentId);
   assert.equal(r.enhancement,n);assert.equal(w.minimumReincarnations||0,tier);assert.ok(!w.unique);
   const jobs=['green','crystal'].includes(theme)?['priest','mage']:['warrior','thief'];assert.ok(w.allowedJobs.includes(jobs[pick<.5?0:1]));
  }
 }
});
test('gold boundary is exactly 1 percent: old cats at tier0, final cats at tier3; Lv100 only',()=>{
 for(const job of Object.keys(FINAL_MAP_WEAPONS))for(const tier of [0,1,2,3])for(const level of [99,100]){
  const s=create();s.level=level;const chest=locate(s),c=createInitialCharacter({name:'QA',job});
  const a=rollV2BlackChest(s,chest,tier,c,()=>.99,()=>.009999),b=rollV2BlackChest(s,chest,tier,c,()=>.99,()=>.01);
  const eligible=level===100&&[0,3].includes(tier);assert.equal(a.color,eligible?'gold':'black');assert.equal(b.color,'black');
  if(eligible){assert.equal(a.reward.equipmentId,(tier===0?OLD_MAP_WEAPONS:FINAL_MAP_WEAPONS)[job]);assert.equal(a.reward.enhancement,0);}
 }
});
test('every ownership container and a pending chest prevent a duplicate unique reward',()=>{
 for(const tier of [0,3])for(const where of ['equipment','equipmentInventory','warehouse','lootBag','sessionBag','pending']){
  const s=create(),p=locate(s),c=createInitialCharacter({name:'QA',job:'mage'}),id=(tier===0?OLD_MAP_WEAPONS:FINAL_MAP_WEAPONS).mage,instance={equipmentId:id,slot:'rightArmId',enhancement:0};
  if(where==='equipment')c.equipment.rightArmId=id;else if(where==='equipmentInventory')c.equipmentInventory.instances.push(instance);else if(where==='sessionBag')s.lootBag={equipmentInstances:[instance]};else if(where==='pending')s.treasureStates.other={reward:instance};else c[where].equipmentInstances.push(instance);
  assert.equal(rollV2BlackChest(s,p,tier,c,()=>.99,()=>0).color,'black',where);
 }
});
test('black/gold saved result, rollback, resume, opening once and return identification',()=>{
 for(const tier of [0,3]){
  const c=createInitialCharacter({name:'QA',job:'mage'}),s=create(),p=locate(s);
  // Select a deterministic expedition seed whose independent gold roll succeeds.
  let found=false;for(let i=0;i<10000;i++){s.expeditionId='gold-qa-'+i;s.treasureStates={};prepareV2Treasure(s,tier,()=>true,c);if(s.treasureStates[p.id].color==='gold'){found=true;break;}}
  assert.ok(found);const saved=JSON.parse(JSON.stringify(serializeSpecialMapSession(s))),r=restoreSpecialMapSession(create(),saved);locate(r);
  assert.deepEqual(r.treasureStates,s.treasureStates);assert.equal(r.cells[p.y][p.x].treasure,'gold');
  assert.equal(completeV2Treasure(r,p.id,()=>false,c),false);assert.equal(r.treasureStates[p.id].opened,false);assert.equal(r.lootBag,null);
  assert.ok(prepareV2Treasure(r,tier,()=>true,c));assert.ok(completeV2Treasure(r,p.id,()=>true,c));assert.equal(completeV2Treasure(r,p.id,()=>true,c),false);
  let result;assert.ok(settleV2ReturnExperience(c,r,x=>{result=x;return true;}));const item=result.loot.settled.equipmentResults[0];assert.equal(item.equipmentId,(tier===0?OLD_MAP_WEAPONS:FINAL_MAP_WEAPONS).mage);assert.equal(item.enhancement,0);assert.equal(item.identified,true);
 }
});
test('all 48 common prices match armor tiers and final cats remain unsellable',()=>{
 const prices=[[7000,8500,11000,20000],[8000,9500,12000,25000],[9000,11500,13000,30000]];
 for(const w of Object.values(REINCARNATION_WEAPONS))for(let n=0;n<4;n++)assert.equal(getEquipmentInstanceDefinition({equipmentId:w.id,slot:'rightArmId',enhancement:n}).sellPrice,prices[w.minimumReincarnations-1][n]);
 for(const id of Object.values(FINAL_MAP_WEAPONS)){assert.equal(getWeapon(id).sellPrice,0);const g=grantEquipmentInstance(createInitialCharacter({name:'QA',job:'mage'}),id,'rightArmId');assert.equal(grantEquipmentInstance(g.character,id,'rightArmId').reason,'alreadyOwned');}
});
