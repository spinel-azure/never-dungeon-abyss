import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTrelirenFloor,normalizeTrelirenRun,syncIncenseZone,TRELIREN_DEFINITION} from '../data/treliren.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantItemWithOverflow} from '../data/inventory.js';
import {getItem} from '../data/items.js';
import {resolveFieldItemUse} from '../combat/resolve-item-use.js';
import {sellItem} from '../data/commerce.js';
import {setIncenseActive,restorePresence,getPresence,addPresence} from '../js/presence.js';
import {getUnreadTavernRumor,markTavernRumorRead,getPastTavernRumors} from '../data/tavern-rumors.js';
import {buildBoundaryWallMap,cells} from '../js/dungeon.js';
import {placeRoamingEnemyForFloor,getRoamingEnemyNeighbors,getActiveRoamingEnemy,advanceRoamingEnemyForPlayerStep,getRoamingEnemyRenderState,serializeRoamingEnemyState,restoreRoamingEnemyState,canRoamingEnemyOccupyCell} from '../js/roaming-enemies.js';
import {shouldDrawRoamingEnemyMarker} from '../js/minimap.js';
function hero(){const c=createInitialCharacter({name:'QA',job:'mage'});c.eventFlags.tavern_rumor_017_base_read=true;return c;}
test('regional assignment is stable across floors, zones and saved games, with one meeting per expedition',()=>{
 let c=hero();
 prepareTrelirenFloor(c,60,()=>.5);assert.equal(c.trelirenRun.floors[60],64);
 for(const d of [61,62,63,65,69]){assert.deepEqual(prepareTrelirenFloor(c,d,()=>0),[]);assert.equal(c.trelirenRun.floors[60],64);}
 assert.equal(prepareTrelirenFloor(c,64)[0].id,'treliren');
 prepareTrelirenFloor(c,73,()=>.5);assert.equal(c.trelirenRun.floors[70],74);
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));
 assert.equal(prepareTrelirenFloor(c,64,()=>0)[0].id,'treliren');
 c.trelirenRun.encountered=true;
 for(const d of [10,64,74,80])assert.deepEqual(prepareTrelirenFloor(c,d),[]);
 c.trelirenRun=normalizeTrelirenRun();assert.equal(prepareTrelirenFloor(c,60,()=>0)[0].id,'treliren');
});
test('all eight regions exclude boss floors, inaccessible ranges and unread rumor',()=>{
 for(let start=10;start<90;start+=10){
  const c=hero();prepareTrelirenFloor(c,start,()=>.99999);assert.equal(c.trelirenRun.floors[start],start+8);
  assert.deepEqual(prepareTrelirenFloor(c,start+9),[]);
 }
 for(const d of [1,9,90,99,100,101])assert.deepEqual(prepareTrelirenFloor(hero(),d),[]);
 const c=hero();delete c.eventFlags.tavern_rumor_017_base_read;assert.deepEqual(prepareTrelirenFloor(c,10),[]);
});
// A four-cell corridor gives a visible player and a guaranteed patrol step.
// Do not use normal dungeon generation: its internal shuffles use Math.random.
function patrolGrid(){return [Array.from({length:4},(_,x)=>({x,y:0,type:'floor',walls:{N:true,E:x===3,S:true,W:x===0},doors:{},doorKinds:{}}))];}

test('patrol never chases, alternates foot image on movement, survives reload and obeys marker exploration',t=>{
 const c=hero(),definitions=prepareTrelirenFloor(c,10,()=>0);
 const cells=patrolGrid(),player={x:0,y:0};
 t.mock.method(Math,'random',()=>{throw Error('Patrol fixture must be deterministic');});
 placeRoamingEnemyForFloor({depth:10,grid:cells,player,rng:()=>.4,definitions});
 const npc=getActiveRoamingEnemy();assert.equal(npc.definitionId,'treliren');assert.equal(canRoamingEnemyOccupyCell(cells[npc.y][npc.x]),true);
 assert.deepEqual({x:npc.x,y:npc.y},{x:3,y:0});
 assert.deepEqual(getRoamingEnemyNeighbors(cells,npc.x,npc.y),[{x:2,y:0,dirKey:'W'}]);
 const before=getRoamingEnemyRenderState(0).definition.image;
 const result=advanceRoamingEnemyForPlayerStep({grid:cells,player,now:0,rng:()=>.3});
 assert.equal(result.moved,true);assert.equal(result.contact,false);assert.equal(npc.mode,'patrol');
 assert.deepEqual({x:npc.x,y:npc.y},{x:2,y:0});
 assert.notEqual(getRoamingEnemyRenderState(999).definition.image,before);
 const saved=serializeRoamingEnemyState();
 restoreRoamingEnemyState(saved,{grid:cells,definitions:[TRELIREN_DEFINITION]});
 assert.equal(getActiveRoamingEnemy().stepCount,saved.stepCount);
 assert.equal(shouldDrawRoamingEnemyMarker(saved,[],true),true);
 assert.equal(shouldDrawRoamingEnemyMarker({...saved,definitionId:'verfolger'},[]),false);
 assert.equal(shouldDrawRoamingEnemyMarker({...saved,status:'departed'},[]),false);
 const explored=[];explored[saved.y]=[];explored[saved.y][saved.x]=true;
 assert.equal(shouldDrawRoamingEnemyMarker(saved,explored),false);
});
test('incense fills inventory then warehouse, sells for one without buyback and blocks only presence growth',()=>{
 let c=hero();c=grantItemWithOverflow(c,'warding_incense',101).character;
 assert.equal(c.inventory.counts.warding_incense,99);assert.equal(c.warehouse.itemStacks.filter(s=>s.itemId==='warding_incense').reduce((n,s)=>n+s.count,0),2);
 assert.equal(getItem('warding_incense').sellPrice,1);
 const sold=sellItem(c,'warding_incense');assert.equal(sold.accepted,true);assert.equal(sold.character.itemBuyback.length,0);
 const used=resolveFieldItemUse({character:c,itemId:'warding_incense',context:'dungeon'});assert.equal(used.environment.wardingIncense,true);
 c=used.character;c.incenseZone='Wüsten-Zone';
 assert.equal(resolveFieldItemUse({character:c,itemId:'warding_incense',context:'dungeon'}).accepted,false);
 assert.equal(syncIncenseZone(c,65),true);
 restorePresence(42);setIncenseActive(true);addPresence(99);assert.equal(getPresence(),42);
 assert.equal(syncIncenseZone(c,70),false);setIncenseActive(false);addPresence(1);assert.equal(getPresence(),43);
 c.incenseZone='Wüsten-Zone';assert.equal(syncIncenseZone(c,60,true),false);
});
test('rumor unlocks at B10, switches after meeting and retains titled history',()=>{
 const c=hero();c.eventFlags={tavern_rumor_001_base_read:true,tavern_rumor_002_base_read:true,tavern_rumor_003_base_read:true};
 c.highestDungeonDepthReached=9;assert.equal(getUnreadTavernRumor(c)?.rumorId==='rumor_017',false);
 c.highestDungeonDepthReached=10;const base=getUnreadTavernRumor(c);assert.equal(base.rumorId,'rumor_017');
 const read=markTavernRumorRead(c,base);assert.equal(getUnreadTavernRumor(read),null);
 read.eventFlags.treliren_met=true;const met=getUnreadTavernRumor(read);assert.equal(met.stageId,'met');
 const done=markTavernRumorRead(read,met);assert.equal(getUnreadTavernRumor(done),null);
 assert.equal(getPastTavernRumors(done).find(r=>r.id==='rumor_017').title,'迷宮探検家の噂');
});


test('entrance camp requires a completed meeting and a roll strictly below twenty percent', async()=>{
 const {selectTrelirenEntranceImage:select}=await import('../data/treliren.js');
 const base='images/background/dungeon_01.avif',camp='images/background/dungeon_01b.avif';
 assert.equal(select(null,()=>0),base);
 assert.equal(select({eventFlags:{tavern_rumor_017_base_read:true}},()=>0),base);
 const c={eventFlags:{treliren_met:true}};
 assert.equal(select(c,()=>0),camp);assert.equal(select(c,()=>.199999),camp);
 assert.equal(select(c,()=>.2),base);assert.equal(select(c,()=>.999999),base);
});

test('patrol contact and blocked neighbors are distinct legitimate non-movement outcomes',()=>{
 const grid=patrolGrid();placeRoamingEnemyForFloor({depth:10,grid,player:{x:0,y:0},rng:()=>.4,definitions:[TRELIREN_DEFINITION]});
 const npc=getActiveRoamingEnemy();assert.equal(getRoamingEnemyNeighbors(grid,npc.x,npc.y).length,1);
 const contact=advanceRoamingEnemyForPlayerStep({grid,player:{x:npc.x,y:npc.y},rng:()=>.3});
 assert.equal(contact.moved,false);assert.equal(contact.contact,true);assert.equal(npc.stepCount,0);
 grid[0][3].walls.W=true;grid[0][2].walls.E=true;
 assert.equal(getRoamingEnemyNeighbors(grid,npc.x,npc.y).length,0);
 const blocked=advanceRoamingEnemyForPlayerStep({grid,player:{x:0,y:0},rng:()=>.3});
 assert.equal(blocked.moved,false);assert.equal(blocked.contact,false);assert.equal(npc.stepCount,0);
});
