import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {getGoldChestWeaponId,isGoldChestWeaponEligible,rollGoldChestLoot} from '../data/loot.js';
import {addLootEquipment,settleLootBag} from '../data/inventory.js';
import {getSkill} from '../data/skills.js';
import {collectStats} from '../combat/collect-stats.js';
import {resolveSpell} from '../combat/resolve-spell.js';
import {createBattleState,resolveMultiBattleRound} from '../combat/battle-engine.js';
import {buildBoundaryWallMap,cells} from '../js/dungeon.js';
import {normalizeEffectDefinition} from '../js/effects/effect-schema.js';
const id='night_banquet_staff';
function hero(weapon=id){
 let c=createInitialCharacter({name:'Night QA',job:'mage'});c.level=100;c=normalizeCharacter(c);
 const g=grantEquipmentInstance(c,weapon,'rightArmId');assert.equal(g.accepted,true);
 c=normalizeCharacter(equipInstance(g.character,'rightArmId',g.instance.instanceId).character);
 c.sp=c.maxSp;c.hp=c.maxHp;return c;
}
const enemy={id:'dummy',name:'DUMMY',hp:999999,maxHp:999999,stats:{str:1,int:1,agi:1,dex:1,luc:1},def:0,attack:1,statuses:[],alive:true};
test('night staff gold replacement has a strict 1% boundary only at B70-78 and requires eligibility',()=>{
 for(let depth=70;depth<=78;depth++){
  assert.equal(getGoldChestWeaponId('mage',depth),id);
  assert.equal(getGoldChestWeaponId('warrior',depth),null);
  for(const [roll,eligible,expected] of [[.009999,true,'gold'],[.01,true,'black'],[0,false,'black']]){
   buildBoundaryWallMap(depth,()=>roll,{blackChestsUnlocked:true,goldWeaponEligible:eligible});
   assert.equal(cells.flat().filter(c=>c.treasure===expected).length,1);
  }
 }
 for(const depth of [69,79,80])assert.equal(getGoldChestWeaponId('mage',depth),null);
 buildBoundaryWallMap(79,()=>0,{blackChestsUnlocked:true,goldWeaponEligible:true});
 assert.equal(cells.flat().some(c=>['black','gold'].includes(c.treasure)&&!c.eventTreasureId),false);
});
test('gold reward survives loot settlement and reload and prevents duplicate ownership',()=>{
 let c=createInitialCharacter({name:'Loot QA',job:'mage'});
 const loot=rollGoldChestLoot(c,70);assert.equal(loot.equipmentId,id);assert.equal(loot.unidentifiedName,'？両手杖');
 c.lootBag=addLootEquipment(c.lootBag,loot).lootBag;
 assert.equal(isGoldChestWeaponEligible(c,70),false);
 c=normalizeCharacter(JSON.parse(JSON.stringify(settleLootBag(c).character)));
 assert.equal(isGoldChestWeaponEligible(c,78),false);
 assert.equal(rollGoldChestLoot(c,70).reason,'alreadyOwned');
 for(const key of ['equipmentInventory','warehouse']){
  const other=createInitialCharacter({name:'Storage',job:'mage'});
  (key==='warehouse'?other.warehouse.equipmentInstances:other.equipmentInventory.instances).push({equipmentId:id,slot:'rightArmId'});
  assert.equal(isGoldChestWeaponEligible(other,70),false);
 }
});
test('equipped staff grants all-target dark spell, consumes SP once and removal revokes it after reload',()=>{
 const c=hero(),battle=createBattleState({character:c,enemy,enemies:[enemy,{...enemy,id:'dummy2'}]});
 assert.ok(battle.player.skillIds.includes('walpurgisnacht'));
 assert.equal(collectStats(battle.player).darkSpellDamageMultiplier,1.5);
 const result=resolveMultiBattleRound({battle,playerCommand:{type:'skill',skillId:'walpurgisnacht'},rng:()=>.5});
 assert.equal(result.accepted,true);assert.equal(result.battle.player.sp,battle.player.sp-55);
 const hits=result.battle.presentationEvents.filter(e=>e.actorSide==='player'&&e.targetSide==='enemy'&&e.hit);
 assert.equal(hits.length,2);assert.ok(hits.every(e=>e.battlePresentationId==='walpurgisnacht'&&e.damage>0));
 const g=grantEquipmentInstance(c,'comet_booster','rightArmId');
 const changed=normalizeCharacter(JSON.parse(JSON.stringify(equipInstance(g.character,'rightArmId',g.instance.instanceId).character)));
 const next=createBattleState({character:changed,enemy});
 assert.equal(next.player.skillIds.includes('walpurgisnacht'),false);
 assert.equal(collectStats(next.player).darkSpellDamageMultiplier,1);
});
test('dark multiplier applies once, respects resistance, and ordinary magic stays between existing staves',()=>{
 const staff=collectStats(hero());
 const comet=collectStats(hero('comet_booster'));
 const cat=collectStats(hero('katzenstab'));
 // Hold INT equal to isolate weapon multipliers from equipment and stat caps.
 for(const c of [staff,comet,cat])c.int=100;
 const damage=(attacker,spell,defender={})=>resolveSpell({attacker,spell,defender,rng:()=>.5}).totalDamage;
 const wal=getSkill('walpurgisnacht'),meteor=getSkill('fall_the_meteor');
 assert.equal(damage(staff,wal),1500);assert.equal(damage(comet,meteor),1200);
 assert.equal(damage(staff,wal,{elementMultipliers:{dark:.5}}),750);
 assert.equal(damage(staff,wal,{elementMultipliers:{dark:0}}),0);
 assert.equal(damage(staff,{...wal,id:'future_dark'}),1500);
 assert.ok(damage(comet,meteor)<damage(staff,meteor));
 assert.ok(damage(staff,meteor)<damage(cat,meteor));
});
test('supplied 80-part effect retains all parameters after normalization',()=>{
 const effect=JSON.parse(readFileSync('data/effects/walpurgisnacht.json','utf8'));
 assert.equal(effect.parts.length,80);assert.equal(effect.duration,5000);
 const normalized=normalizeEffectDefinition(effect);
 for(let i=0;i<effect.parts.length;i++)for(const [key,value]of Object.entries(effect.parts[i]))assert.deepEqual(normalized.parts[i][key],value,key);
 const registry=JSON.parse(readFileSync('data/effects/battle-presentations.json','utf8'));assert.equal(registry.walpurgisnacht,'data/effects/walpurgisnacht.json');
});
