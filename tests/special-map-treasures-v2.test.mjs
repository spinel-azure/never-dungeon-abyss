import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSpecialMapV2} from '../js/special-map/generator-v2.js';
import {createV2TreasureLayout,rollV2ArmorChest,prepareV2Treasure,completeV2Treasure} from '../js/special-map/treasures-v2.js';
import {createSpecialMapV2Session,confirmV2Cell,beginV2CellPrompt} from '../js/special-map/session-v2.js';
import {serializeSpecialMapSession,restoreSpecialMapSession} from '../js/special-map/save-session.js';
import {mapOriginalId} from '../data/special-maps.js';
import {EQUIPMENT} from '../data/equipment.js';
import {isV2EncounterCell} from '../js/special-map/encounter-v2.js';
const original={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
function create(){return createSpecialMapV2Session([original],mapOriginalId(original),{scheduleSurvey:()=>null});}
function locate(s,color='red'){const p=s.floors[0].treasures.find(x=>x.color===color);assert.ok(p);s.playerX=p.x;s.playerY=p.y;return p;}
test('independent seeded layouts: all four themes, 1-3 red and one black per floor, excluded features, unchanged blueprint',()=>{
 const counts=new Set();
 for(let seed=0;seed<200;seed++){
  const map=generateSpecialMapV2({ruleset:'special-map-v2',seed,level:100,rarity:'WHITE'}),before=JSON.stringify(map);
  for(const theme of ['green','yellow','crystal','black'])for(const f of map.floors){
   const floor={...f,themeId:theme},a=createV2TreasureLayout(seed,100,floor);
   assert.deepEqual(a,createV2TreasureLayout(seed,91,floor));
   const reds=a.filter(x=>x.color==='red').length;assert.ok(reds>=1&&reds<=3);counts.add(reds);
   assert.equal(a.filter(x=>x.color==='black').length,1);
   assert.equal(new Set(a.map(p=>`${p.x},${p.y}`)).size,a.length);
   for(const p of a)assert.ok(![f.stairsUp,f.stairsDown,f.keyChest,f.bossRoom?.approach,...(f.bossRoom?.cells||[])].some(q=>q&&q.x===p.x&&q.y===p.y));
   assert.deepEqual(createV2TreasureLayout(seed,90,floor),[]);
  }
  assert.equal(JSON.stringify(map),before);
  for(const themeId of ['water','gold','rice','dusk','tender','slate'])assert.deepEqual(createV2TreasureLayout(seed,100,{...map.floors[0],themeId}),[]);
 }
 assert.equal(counts.size,3);
});
test('exact category/enhancement distribution and eight equal pieces for every stage/theme/level',()=>{
 for(const level of [91,99,100])for(const theme of ['green','yellow','crystal','black'])for(const tier of [0,1,2,3]){
  const high=level===100,rare=['green','yellow'].includes(theme),medium=high?(rare?20:25):(rare?35:40),large=high?15:10;
  const counts={};for(let n=0;n<100;n++){const r=rollV2ArmorChest({level,theme,tier},()=> (n+.5)/100);const key=r.kind==='equipment'?'armor':r.itemId;counts[key]=(counts[key]||0)+1;}
  assert.equal(counts.strong_healing_potion_medium,medium);assert.equal(counts.strong_healing_potion_large,large);assert.equal(counts.armor,100-medium-large);
  const ids=new Set(),enh=[0,0,0,0];
  for(let i=0;i<8;i++)for(let n=0;n<100;n++){
   const draws=[.999,(i+.5)/8,(n+.5)/100];const r=rollV2ArmorChest({level,theme,tier},()=>draws.shift());
   const item=EQUIPMENT[r.equipmentId];assert.ok(item);assert.equal(item.minimumReincarnations||0,tier);
   assert.ok(item.allowedJobs.some(j=>(['green','crystal'].includes(theme)?['priest','mage']:['warrior','thief']).includes(j)));
   ids.add(r.equipmentId);enh[r.enhancement]++;
  }
  assert.equal(ids.size,8);assert.deepEqual(enh,(high?[40,30,20,10]:[60,25,10,5]).map(n=>n*8));
 }
});
test('actual prompt/open/save/load, save failure retry, no duplicate reward, unopened and old saves, black connected',()=>{
 const s=create(),p=locate(s);assert.equal(isV2EncounterCell(s),false);
 assert.equal(beginV2CellPrompt(s),'redChest');assert.equal(confirmV2Cell(s,0).openRedChest,true);
 const before=serializeSpecialMapSession(s);
 assert.equal(prepareV2Treasure(s,3,()=>false),false);const reward=structuredClone(s.treasureStates[p.id].reward);
 const replay=restoreSpecialMapSession(create(),before);locate(replay);assert.ok(prepareV2Treasure(replay,3,()=>true));assert.deepEqual(replay.treasureStates[p.id].reward,reward);
 assert.ok(prepareV2Treasure(s,3,()=>true));
 assert.equal(completeV2Treasure(s,p.id,()=>false),false);assert.equal(s.lootBag,null);assert.equal(s.treasureStates[p.id].opened,false);
 let saved;assert.ok(completeV2Treasure(s,p.id,()=>{saved=JSON.parse(JSON.stringify(serializeSpecialMapSession(s)));return true;}));
 const bag=structuredClone(s.lootBag);assert.equal(completeV2Treasure(s,p.id,()=>true),false);assert.deepEqual(s.lootBag,bag);
 const r=restoreSpecialMapSession(create(),saved);locate(r);assert.deepEqual(r.lootBag,bag);assert.equal(r.cells[p.y][p.x].treasure,null);assert.equal(confirmV2Cell(r,0).openRedChest,undefined);
 locate(r,'black');assert.equal(confirmV2Cell(r,0).openRedChest,true);assert.equal(prepareV2Treasure(r,3,()=>true),true);
 const old=serializeSpecialMapSession(create());delete old.treasureStates;assert.deepEqual(restoreSpecialMapSession(create(),old).treasureStates,{});
 const fresh=create();assert.deepEqual(fresh.floors[0].treasures,s.floors[0].treasures);assert.notEqual(fresh.expeditionId,s.expeditionId);assert.deepEqual(fresh.treasureStates,{});
});

test('return settlement identifies chest armor once while preserving abyss loot',async()=>{
 const {settleV2ReturnExperience}=await import('../js/special-map/battle-rewards-v2.js');
 const {createInitialCharacter}=await import('../data/classes.js');
 const s=create(),p=locate(s);s.treasureStates[p.id]={opened:false,reward:{kind:'equipment',equipmentId:'reinc_polarstar_head',slot:'headId',enhancement:3}};
 assert.ok(completeV2Treasure(s,p.id,()=>true));
 const c=createInitialCharacter({name:'QA',job:'mage'});const oldBag=structuredClone(c.lootBag);let result;
 assert.ok(settleV2ReturnExperience(c,s,r=>{result=r;return true;}));
 const gained=result.loot.settled.equipmentResults;assert.equal(gained.length,1);assert.equal(gained[0].enhancement,3);assert.equal(gained[0].equipmentId,'reinc_polarstar_head');assert.equal(gained[0].identified,true);
 assert.deepEqual(result.changes.lootBag,oldBag);assert.equal(settleV2ReturnExperience(c,s,()=>{throw Error('duplicate');}),false);
});

test('walking onto red chest stops movement and prompts before random encounter',async()=>{
 const {actSpecialMap,updateSpecialMotion}=await import('../js/special-map/session.js');
 const s=create(),p=locate(s),dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];
 const d=dirs.findIndex(dir=>!s.cells[p.y][p.x].walls[dir]);
 s.playerX=p.x+dx[d];s.playerY=p.y+dy[d];s.direction=(d+2)%4;
 s.renderState.x=s.playerX+.5;s.renderState.y=s.playerY+.5;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;
 // Production encounter handler itself ignores prompted cells.
 const {isV2EncounterCell}=await import('../js/special-map/encounter-v2.js');
 assert.ok(actSpecialMap(s,'up',0));updateSpecialMotion(s,1000);
 assert.equal(s.playerX,p.x);assert.equal(s.playerY,p.y);assert.equal(s.cellPrompt,'redChest');assert.equal(isV2EncounterCell(s),false);assert.equal(s.onEncounterStep(),false);
 assert.equal(actSpecialMap(s,'up',1100),false);
});
