import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {getGoldChestWeaponId,isGoldChestWeaponEligible,rollGoldChestLoot} from '../data/loot.js';
import {addLootEquipment,settleLootBag} from '../data/inventory.js';
import {getWeapon} from '../data/weapons.js';
import {getSkill} from '../data/skills.js';
import {createNormalAttack,createSkillAttack} from '../combat/create-attack.js';
import {resolvePhysicalAttack} from '../combat/resolve-physical-attack.js';
import {createBattleState,resolveMultiBattleRound} from '../combat/battle-engine.js';
const cases=[['warrior','fulgura','golden_rice_sea',['holy','holy','lightning','lightning']],['thief','jormungandr','twilight_dew_rain',['dark','dark','ice','ice']],['priest','cucullus_domini','dominus_lux_aeterna',['holy','holy']]];
const enemy={id:'dummy',name:'DUMMY',hp:999999,maxHp:999999,stats:{str:1,int:1,agi:1,dex:1,luc:1},def:100,attack:1,statuses:[],alive:true};
function hero(job,id){let c=createInitialCharacter({name:'QA',job});c.level=100;c=normalizeCharacter(c);const g=grantEquipmentInstance(c,id,'rightArmId');assert.equal(g.accepted,true);c=normalizeCharacter(equipInstance(g.character,'rightArmId',g.instance.instanceId).character);c.sp=c.maxSp;return c;}
for(const [job,id,skill,elements] of cases){
 test(id+' gold loot, settlement, equip and save/load preserve unlock and prevent duplicate',()=>{
  let c=createInitialCharacter({name:'QA',job});for(let floor=70;floor<=78;floor++)assert.equal(getGoldChestWeaponId(job,floor),id);
  for(const floor of [69,79,80])assert.equal(getGoldChestWeaponId(job,floor),null);
  const drop=rollGoldChestLoot(c,70);assert.equal(drop.equipmentId,id);
  c.lootBag=addLootEquipment(c.lootBag,drop).lootBag;assert.equal(isGoldChestWeaponEligible(c,70),false);
  c=settleLootBag(c).character;assert.equal(isGoldChestWeaponEligible(c,70),false);
  c=hero(job,id);c=normalizeCharacter(JSON.parse(JSON.stringify(c)));
  const b=createBattleState({character:c,enemy});assert.ok(b.player.skillIds.includes(skill));
  const fallback=job==='warrior'?'iron_longsword':job==='thief'?'iron_dagger':'iron_mace';
  const g=grantEquipmentInstance(c,fallback,'rightArmId');c=normalizeCharacter(equipInstance(g.character,'rightArmId',g.instance.instanceId).character);
  assert.ok(!createBattleState({character:c,enemy}).player.skillIds.includes(skill));
 });
 test(id+' real combat uses exact hit count, attributes and SP40 once',()=>{
  const c=hero(job,id),battle=createBattleState({character:c,enemy,enemies:[enemy,{...enemy,id:'dummy2'}]});
  const r=resolveMultiBattleRound({battle,playerCommand:{type:'skill',skillId:skill,targetIndex:0},rng:()=>.5});
  assert.equal(r.accepted,true);assert.equal(r.battle.player.sp,battle.player.sp-40);
  const hits=r.battle.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
  assert.deepEqual(hits.map(h=>h.element),elements);assert.ok(hits.every(h=>h.damage>0));
 });
}
test('mixed hits independently respect immunity, weakness and ice reduction',()=>{
 for(const id of ['fulgura','jormungandr']){
  const attack=createNormalAttack({weaponId:id});attack.unavoidable=true;
  const [a,b]=attack.hitElements;
  const r=resolvePhysicalAttack({attacker:{str:100,dex:0},defender:{elementMultipliers:{[a]:0,[b]:2},iceDamageReduction:.5},attack,rng:()=>.5});
  assert.equal(r.hits.length,2);assert.equal(r.hits[0].damage,0);assert.ok(r.hits[1].damage>0);assert.deepEqual(r.hits.map(h=>h.element),[a,b]);
  const skill=createSkillAttack(getSkill(id==='fulgura'?'golden_rice_sea':'twilight_dew_rain'),{weaponId:id});assert.equal(skill.hitCount,4);assert.equal(skill.powerPerHit,1);
 }
});
test('scepter normal attack ignores all DEF and has two 0.6 hits',()=>{
 const attack=createNormalAttack({weaponId:'cucullus_domini'});assert.equal(attack.hitCount,2);assert.equal(attack.powerPerHit,.6);
 const roll=def=>resolvePhysicalAttack({attacker:{str:100},defender:{def},attack,rng:()=>.5}).totalDamage;
 assert.equal(roll(0),roll(999999));assert.ok(roll(0)>0);
});

test('normal mixed weapon hits preserve innate attributes through oil and trigger second-element reactions',()=>{
 for(const [job,id,elements,reaction] of [['warrior','fulgura',['holy','lightning'],'lightning'],['thief','jormungandr',['dark','ice'],'ice']]){
  const c=hero(job,id);c.statuses=[{id:'weapon_element_imbue',element:'fire',duration:10,active:true}];
  const target={...enemy,def:0,elementMultipliers:{[elements[0]]:0,[elements[1]]:2},elementalReactionTrait:{element:reaction,statusId:'slow',duration:3,regainSuppressionTurns:2}};
  const b=createBattleState({character:c,enemy:target,enemies:[target]});
  const r=resolveMultiBattleRound({battle:b,playerCommand:{type:'attack',targetIndex:0},rng:()=>.5});
  assert.equal(r.accepted,true);
  const hits=r.battle.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
  assert.deepEqual(hits.map(h=>h.element),elements);assert.equal(hits[0].damage,0);assert.ok(hits[1].damage>0);
  assert.ok(r.battle.enemies[0].regainSuppressedTurns>0);
 }
});
