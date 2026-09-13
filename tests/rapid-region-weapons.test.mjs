import test from "node:test";
import assert from "node:assert/strict";
import {WEAPONS,getWeapon,getWeaponType} from "../data/weapons.js";
import {createInitialCharacter,normalizeCharacter} from "../data/classes.js";
import {grantEquipmentInstance,equipInstance,getEquipmentInstanceDefinition} from "../data/equipment-inventory.js";
import {addLootEquipment,settleLootBag,grantItem} from "../data/inventory.js";
import {grantCard,setDeckSlot} from "../data/deck.js";
import {rollBlackChestLoot,rollEnemyDrop} from "../data/loot.js";
import {createNormalAttack,createSkillAttack} from "../combat/create-attack.js";
import {resolvePhysicalAttack} from "../combat/resolve-physical-attack.js";
import {createBattleState,resolveBattleRound} from "../combat/battle-engine.js";
import {getSkill} from "../data/skills.js";
import {createEnemyCombatant,getEnemyById} from "../data/enemies.js";
import {buildBoundaryWallMap,cells} from "../js/dungeon.js";
import {getRestoredTreasureType} from "../js/dungeon-save-restore.js";

const specs=[
 ['warrior','current_cleaving_longsword','longsword',[22,23,25,27],'str',[5,5,6,7]],
 ['thief','whirlpool_dagger','dagger',[14,15,16,17],'dex',[5,5,6,7]],
 ['priest','tide_piercing_mace','blunt',[18,19,20,22],'luc',[4,4,5,6]],
 ['mage','deep_current_staff','staff',[6,6,7,7],'int',[11,12,13,14]]
];
function equip(job,id,enhancement=0){
 let c=createInitialCharacter({name:'RAPID QA',job});c.level=100;c=normalizeCharacter(c);
 const grant=grantEquipmentInstance(c,id,'rightArmId',{enhancement});assert.equal(grant.accepted,true);
 const result=equipInstance(grant.character,'rightArmId',grant.instance.instanceId);assert.equal(result.accepted,true);
 return {character:normalizeCharacter(result.character),instance:grant.instance,original:c};
}
function dummy(){const e=createEnemyCombatant(getEnemyById('abyss_rat'));e.hp=e.maxHp=99999;e.isBoss=true;e.def=40;e.actions=[{id:'wait',name:'待機',actionType:'wait',weight:1}];return e;}

for(const [job,id,type,attacks,key,bonuses] of specs){
 test(`${id}: every enhancement matches stats and existing weapon mechanics`,()=>{
  for(let n=0;n<=3;n++){
   const w=getWeapon(id,n),d=getEquipmentInstanceDefinition({equipmentId:id,slot:'rightArmId',enhancement:n});
   assert.equal(w.id,id);assert.equal(w.attack,attacks[n]);assert.equal(d.attack,attacks[n]);assert.equal(w.statBonuses[key],bonuses[n]);assert.deepEqual(d.statBonuses,w.statBonuses);
   assert.equal(w.element,'physical');assert.equal(w.type,type);assert.deepEqual(w.allowedJobs,[job]);assert.equal(Boolean(w.twoHanded),job==='mage');
   assert.equal(d.sellPrice,[5000,6000,7500,10000][n]);assert.equal(w.buyPrice,undefined);assert.equal(w.effects,undefined);
   if(job==='mage')assert.equal(w.statBonuses.maxSp,[5,5,10,15][n]);
   const attack=createNormalAttack({weaponId:id,weaponEnhancement:n}),standard=getWeaponType(type);
   assert.deepEqual([attack.hitCount,attack.powerPerHit,attack.speedModifier],[standard.hitCount,standard.powerPerHit,standard.speedModifier]);
  }
 });
 test(`${id}: job restriction, shield handling and normalized save restore`,()=>{
  const {character:c,instance,original}=equip(job,id,3);
  const left=original.equippedInstanceIds.leftArmId;
  assert.equal(c.equippedInstanceIds.leftArmId,job==='mage'?null:left);
  assert.equal(equipInstance(c,'leftArmId',left).accepted,job!=='mage');
  const other=createInitialCharacter({name:'OTHER',job:job==='warrior'?'priest':'warrior'});
  const grant=grantEquipmentInstance(other,id,'rightArmId');assert.equal(equipInstance(grant.character,'rightArmId',grant.instance.instanceId).accepted,false);
  const saved=normalizeCharacter(JSON.parse(JSON.stringify(c)));
  assert.equal(saved.equippedInstanceIds.rightArmId,instance.instanceId);assert.equal(saved.equipment.weaponId,id);
  assert.equal(getEquipmentInstanceDefinition(saved.equipmentInventory.instances.find(i=>i.instanceId===instance.instanceId)).attack,getWeapon(id,3).attack);
 });
 test(`${id}: flame card and oil use existing physical imbue rules`,()=>{
  for(const mode of ['card','oil']){
   const {character:c}=equip(job,id,3);
   if(mode==='card'){c.cards=grantCard(c.cards,'sr_flame_armament',1,c.deckCost).cards;c.cards=setDeckSlot(c.cards,0,'sr_flame_armament',c.deckCost);}
   else c.inventory=grantItem(c.inventory,'fire_lizard_oil',1).inventory;
   const target=dummy(); target.elementMultipliers.fire=0;
   let battle=createBattleState({character:c,enemy:target});
   if(mode==='oil')battle=resolveBattleRound({battle,playerCommand:{type:'item',itemId:'fire_lizard_oil'},rng:()=>.5}).battle;
   battle=resolveBattleRound({battle,playerCommand:{type:'attack'},rng:()=>.5}).battle;
   const hits=battle.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');assert.ok(hits.length>0);
   assert.ok(hits.every(e=>e.damage===0));
   assert.equal(battle.enemy.hp,battle.enemy.maxHp);
  }
 });
}

test('B70-B77 weapon order and B78 four jobs use +1/+2/+3 boundaries',()=>{
 for(let depth=70;depth<=77;depth++)assert.equal(rollBlackChestLoot(()=>0,depth).equipmentId,specs[(depth-70)%4][1]);
 for(const [job,id] of specs)for(const [roll,enhancement] of [[0,1],[.699999,1],[.7,2],[.949999,2],[.95,3],[.999999,3]]){
  const reward=rollEnemyDrop({dropProfile:'blackChest',depth:78,job},()=>roll);
  assert.equal(reward.equipmentId,id);assert.equal(reward.enhancement,enhancement);assert.equal(reward.kind,'equipment');
 }
 const counts=[0,0,0,0];for(let i=0;i<1000;i++)counts[rollBlackChestLoot(()=>i/1000,70).enhancement]++;
 assert.deepEqual(counts,[0,700,250,50]);
});

test('mace total penetration is 35/35/40/45%, including standard blunt penetration exactly once',()=>{
 for(let n=0;n<=3;n++){
  const normal=createNormalAttack({weaponId:'tide_piercing_mace',weaponEnhancement:n});
  assert.equal(normal.defensePenetration,[.35,.35,.4,.45][n]);
  const skill=createSkillAttack(getSkill('holy_strike'),{weaponId:'tide_piercing_mace',weaponEnhancement:n});
  assert.equal(skill.defensePenetration,normal.defensePenetration+(getSkill('holy_strike').defensePenetration||0));
  const attacker={str:40,dex:30,luc:1},defender={def:40,agi:1};
  const result=resolvePhysicalAttack({attacker,defender,attack:normal,rng:()=>.5});
  const without=resolvePhysicalAttack({attacker,defender,attack:{...normal,defensePenetration:.25},rng:()=>.5});
  assert.equal(result.defensePenetration,normal.defensePenetration);assert.ok(result.effectiveDefense<without.effectiveDefense);assert.ok(result.totalDamage>without.totalDamage);
  assert.equal(resolvePhysicalAttack({attacker:{...attacker,defensePenetration:.7},defender,attack:skill,rng:()=>.5}).defensePenetration,.75);
 }
});

test('staff SP equipment bonus neither heals on equip nor duplicates after remove/re-equip',()=>{
 const {character:c,original,instance}=equip('mage','deep_current_staff',3);
 assert.equal(c.maxSp-original.maxSp,15);assert.equal(c.sp,original.sp);
 c.sp=c.maxSp;const removed=normalizeCharacter(equipInstance(c,'rightArmId',null).character);
 assert.equal(removed.sp,removed.maxSp);
 const again=normalizeCharacter(equipInstance(removed,'rightArmId',instance.instanceId).character);
 assert.equal(again.sp,removed.sp);assert.equal(again.maxSp,c.maxSp);
});

test('black chest unlock, one-per-floor, neighbors and saved empty cells keep existing rules',()=>{
 for(const depth of [69,70,71,72,73,74,75,76,77,78,79,80])for(const unlocked of [false,true]){
  buildBoundaryWallMap(depth,()=>.5,{blackChestsUnlocked:unlocked,maikaeferNestRoll:1});
  assert.equal(cells.flat().filter(c=>c.treasure==='black').length,unlocked&&depth%10!==9?1:0);
 }
 assert.equal(rollBlackChestLoot(()=>0,69).equipmentId,'abyss_fang');
 assert.equal(rollBlackChestLoot(()=>0,79).kind,'gold');
 assert.equal(rollBlackChestLoot(()=>0,80).equipmentId,'crystal_warhammer');
 assert.equal(getRestoredTreasureType({treasure:null},{depth:78,blackChestsUnlocked:true}),null);
 assert.equal(getRestoredTreasureType({treasure:'black'},{depth:78,blackChestsUnlocked:true}),'black');
});

test('loot settlement and protected saves retain all four weapons and enhancement',async()=>{
 let c=createInitialCharacter({name:'SAVE',job:'warrior'});
 for(const [,id] of specs)c.lootBag=addLootEquipment(c.lootBag,{equipmentId:id,slot:'rightArmId',enhancement:3}).lootBag;
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};globalThis.window={dispatchEvent(){}};globalThis.CustomEvent=class{};
 try{
  const {writeGame,loadGame}=await import('../js/save-data.js');
  const snapshot=character=>({character,player:{gridX:1,gridY:1,dir:0},dungeon:{cells:[[{type:'floor'}]],explored:[[true]]}});
  assert.equal(writeGame(snapshot(c),'auto'),true);c=normalizeCharacter(loadGame('auto').character);assert.equal(c.lootBag.equipmentInstances.length,4);
  c=settleLootBag(c).character;assert.equal(writeGame(snapshot(c),'manual1'),true);
  const saved=normalizeCharacter(loadGame('manual1').character);
  for(const [,id] of specs)assert.equal(saved.equipmentInventory.instances.find(i=>i.equipmentId===id).enhancement,3);
 }finally{delete globalThis.localStorage;delete globalThis.window;delete globalThis.CustomEvent;}
});