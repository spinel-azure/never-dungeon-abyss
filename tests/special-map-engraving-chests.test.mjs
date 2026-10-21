import test from 'node:test';
import assert from 'node:assert/strict';
import {rollV2RedChest,rollV2ArmorChest,prepareV2Treasure,completeV2Treasure} from '../js/special-map/treasures-v2.js';
import {V2_LEVEL_100_ENGRAVINGS as engravings,settleV2ReturnExperience} from '../js/special-map/battle-rewards-v2.js';
import {createSpecialMapV2Session} from '../js/special-map/session-v2.js';
import {serializeSpecialMapSession,restoreSpecialMapSession} from '../js/special-map/save-session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {createInitialCharacter} from '../data/classes.js';
const map={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
const create=()=>createSpecialMapV2Session([map],mapOriginalId(map),{scheduleSurvey:()=>null});
test('red gold conversion is one percent, all five engravings equal, all tiers and eligible maps',()=>{
 for(const level of [91,99,100])for(const theme of ['green','yellow','crystal','black'])for(const tier of [0,1,2,3]){
  const context={level,theme,tier};
  for(let i=0;i<5;i++){const values=[.009999,(i+.5)/5];const r=rollV2RedChest(context,()=>.99,()=>values.shift());assert.equal(r.color,'gold');assert.equal(r.reward.itemId,engravings[i]);}
  const ordinary=rollV2RedChest(context,()=>.99,()=>.01);assert.deepEqual(ordinary.reward,rollV2ArmorChest(context,()=>.99));assert.notEqual(ordinary.color,'gold');
 }
 assert.throws(()=>rollV2RedChest({level:90,theme:'green'},()=>0,()=>0));
 assert.throws(()=>rollV2RedChest({level:100,theme:'water'},()=>0,()=>0));
});
test('engraving gold persists, rolls back failed save, grants once and settles through normal loot',()=>{
 const s=create(),p=s.floors[0].treasures.find(x=>x.color==='red'),c=createInitialCharacter({name:'QA',job:'thief'});s.playerX=p.x;s.playerY=p.y;
 for(let i=0;i<10000;i++){s.expeditionId='engraving-'+i;s.treasureStates={};prepareV2Treasure(s,0,()=>true,c);if(s.treasureStates[p.id].color==='gold')break;}
 assert.equal(s.treasureStates[p.id].color,'gold');const reward=s.treasureStates[p.id].reward;
 const r=restoreSpecialMapSession(create(),JSON.parse(JSON.stringify(serializeSpecialMapSession(s))));
 assert.equal(r.cells[p.y][p.x].treasure,'gold');assert.deepEqual(r.treasureStates,s.treasureStates);
 assert.equal(completeV2Treasure(r,p.id,()=>false,c),false);assert.equal(r.lootBag,null);assert.equal(r.treasureStates[p.id].opened,false);
 assert.ok(completeV2Treasure(r,p.id,()=>true,c));assert.equal(completeV2Treasure(r,p.id,()=>true,c),false);
 let settled;assert.ok(settleV2ReturnExperience(c,r,x=>{settled=x;return true;}));assert.ok(JSON.stringify(settled).includes(reward.itemId));
 // Already prepared red chests are not rerolled by the update.
 s.treasureStates[p.id]={opened:false,reward:{kind:'item',itemId:'strong_healing_potion_medium',amount:1}};
 assert.ok(prepareV2Treasure(s,3,()=>true,c));assert.equal(s.treasureStates[p.id].reward.itemId,'strong_healing_potion_medium');
});
