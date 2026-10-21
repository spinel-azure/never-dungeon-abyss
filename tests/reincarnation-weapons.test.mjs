import test from 'node:test';
import assert from 'node:assert/strict';
import {REINCARNATION_WEAPONS as common,FINAL_CAT_WEAPONS as cats} from '../data/reincarnation-weapons.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getLevelGrowth} from '../data/growth.js';
import {grantEquipmentInstance,equipInstance,getEquipmentInstanceDefinition} from '../data/equipment-inventory.js';
import {addLootEquipment,settleLootBag} from '../data/inventory.js';
import {getWeapon} from '../data/weapons.js';
import {getReincarnationArmorSet,REINCARNATION_ARMOR as armor} from '../data/reincarnation-armor.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createNormalAttack,createSkillAttack} from '../combat/create-attack.js';
import {resolvePhysicalAttack} from '../combat/resolve-physical-attack.js';
import {resolveSpell} from '../combat/resolve-spell.js';
import {collectStats} from '../combat/collect-stats.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {getSkill} from '../data/skills.js';
import {resolveHealing} from '../combat/resolve-healing.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {goddessCheckpoint,restoreGoddessCheckpoint} from '../js/special-map/goddess-checkpoint.js';

function character(job,tier=3){return normalizeCharacter({...createInitialCharacter({name:'武器検証',job}),level:100,reincarnationCount:tier});}
function equip(c,id,enhancement=3){const g=grantEquipmentInstance(c,id,'rightArmId',{enhancement});assert.ok(g.accepted,g.reason);const e=equipInstance(g.character,'rightArmId',g.instance.instanceId);assert.ok(e.accepted,e.reason);return normalizeCharacter(e.character);}
function armed(id){const w=getWeapon(id);const c=equip(character(w.allowedJobs[0]),id);c.hp=c.maxHp;c.sp=c.maxSp;return c;}
function dummy(hp=99999){return {id:'dummy',name:'DUMMY',hp,maxHp:hp,sp:0,maxSp:0,stats:{str:1,int:1,agi:1,dex:1,luc:1},def:20,attack:1,statuses:[],alive:true,actions:[{weight:1,action:{id:'wait',actionType:'wait',speedModifier:-99}}]};}
function run(c,command={type:'attack'},rng=()=>.5,enemy=dummy()){const b=c.player?c:createBattleState({character:c,enemy});const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(r.accepted,r.reason);return r.battle;}
const hits=b=>b.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player'&&e.targetSide==='enemy');

test('all 48 common weapon patterns match independent ATK, stats, rates and effects tables',()=>{
 const expected=[[48,52,56,60],[58,62,66,70],[68,72,76,80],[28,31,34,37],[35,38,41,44],[42,45,48,51],[38,42,46,50],[48,52,56,60],[58,62,66,70],[8,10,12,14],[12,14,16,18],[16,18,20,22]];
 const offensive=[[.10,.12,.14,.16],[.14,.16,.18,.20],[.18,.20,.22,.25]],crit=[[.02,.03,.04,.05],[.03,.04,.05,.06],[.04,.05,.06,.08]],heal=[[.05,.06,.08,.10],[.08,.10,.12,.15],[.12,.15,.18,.20]];
 assert.equal(Object.keys(common).length,12);
 Object.values(common).forEach((base,i)=>{for(let n=0;n<4;n++){
  const w=getWeapon(base.id,n),job=base.allowedJobs[0],tier=i%3;
  assert.equal(w.attack,expected[i][n]);assert.equal(w.minimumReincarnations,tier+1);assert.ok(!w.unique);
  const key={warrior:'str',thief:'dex',priest:'int',mage:'int'}[job];
  assert.equal(w.statBonuses[key],(job==='mage'?[1,1,2,3]:[0,1,1,2])[n]);
  for(const other of ['str','int','agi','dex','luc'].filter(k=>k!==key))assert.ok(!w.statBonuses[other]);
  assert.equal(w.statBonuses[job==='warrior'||job==='thief'?'baseMaxHpRate':'baseMaxSpRate'],(tier+2+n)/100);
  if(job==='warrior')assert.equal(w.defensePenetration,offensive[tier][n]);
  if(job==='thief'){assert.equal(w.statBonuses.criticalBonus,crit[tier][n]);assert.equal(createNormalAttack({weapon:w}).hitCount,2);assert.equal(createNormalAttack({weapon:w}).powerPerHit,.6);}
  if(job==='priest'){assert.equal(w.statBonuses.healingMiracleBonus,heal[tier][n]);assert.equal(createNormalAttack({weapon:w}).defensePenetration,.25);}
  if(job==='mage')assert.equal(w.statBonuses.attackSpellDamageBonus,offensive[tier][n]);
 }});
});
test('every weapon enforces job/tier at equip commit; mage clears left hand; weapons never form armor sets',()=>{
 for(const w of [...Object.values(common),...Object.values(cats)])for(const job of ['warrior','thief','priest','mage'])for(let n=0;n<4;n++){
  const g=grantEquipmentInstance(character(job,n),w.id,'rightArmId');assert.ok(g.accepted);
  const e=equipInstance(g.character,'rightArmId',g.instance.instanceId),allowed=job===w.allowedJobs[0]&&n>=w.minimumReincarnations;
  assert.equal(e.accepted,allowed,`${w.id}/${job}/${n}`);
  if(allowed){assert.equal(getReincarnationArmorSet(e.character),null);if(job==='mage')assert.equal(e.character.equipment.leftArmId,null);else assert.ok(e.character.equipment.leftArmId);}
 }
});
test('base-growth HP/SP additions are floored once, never compounded and never heal on equip or unequip',()=>{
 for(const w of [...Object.values(common),...Object.values(cats)]){
  const job=w.allowedJobs[0];let c=character(job);c=normalizeCharacter(equipInstance(c,'rightArmId',null).character);
  c.hp=17;c.sp=13;const after=equip(c,w.id),rates=getWeapon(w.id,w.unique?0:3).statBonuses,g=getLevelGrowth(job,100,3);
  assert.equal(after.maxHp-c.maxHp,Math.floor(g.hp*(rates.baseMaxHpRate||0)));assert.equal(after.maxSp-c.maxSp,Math.floor(g.sp*(rates.baseMaxSpRate||0)));
  assert.equal(after.hp,17);assert.equal(after.sp,13);
  assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(after))),normalizeCharacter(after));
  after.hp=after.maxHp;after.sp=after.maxSp;const removed=normalizeCharacter(equipInstance(after,'rightArmId',null).character);
  assert.equal(removed.hp,Math.min(after.hp,c.maxHp));assert.equal(removed.sp,Math.min(after.sp,c.maxSp));
  const instance=removed.equipmentInventory.instances.find(x=>x.equipmentId===w.id);
  const reequipped=normalizeCharacter(equipInstance(removed,'rightArmId',instance.instanceId).character);assert.equal(reequipped.hp,removed.hp);assert.equal(reequipped.sp,removed.sp);
 }
});
test('loot settlement preserves all common enhancements, allows duplicates; final cats fixed and unique in every container',()=>{
 for(const w of Object.values(common))for(let n=0;n<4;n++){
  let c=character(w.allowedJobs[0]);c.lootBag=addLootEquipment(c.lootBag,{equipmentId:w.id,slot:'rightArmId',enhancement:n}).lootBag;
  c=normalizeCharacter(JSON.parse(JSON.stringify(settleLootBag(c).character)));
  const item=c.equipmentInventory.instances.find(x=>x.equipmentId===w.id);assert.equal(item.enhancement,n);assert.equal(getEquipmentInstanceDefinition(item).attack,getWeapon(w.id,n).attack);
  assert.ok(grantEquipmentInstance(c,w.id,'rightArmId',{enhancement:n}).accepted);
 }
 for(const w of Object.values(cats)){
  const g=grantEquipmentInstance(character(w.allowedJobs[0]),w.id,'rightArmId',{enhancement:3});assert.equal(g.instance.enhancement,0);
  for(const where of ['equipment','equipmentInventory','warehouse','lootBag']){
   const c=character(w.allowedJobs[0]),instance={equipmentId:w.id,slot:'rightArmId',enhancement:0};
   if(where==='equipment')c.equipment.rightArmId=w.id;
   else if(where==='equipmentInventory')c.equipmentInventory.instances.push(instance);
   else c[where].equipmentInstances.push(instance);
   assert.equal(grantEquipmentInstance(c,w.id,'rightArmId').reason,'alreadyOwned');
  }
 }
});
test('Regalia repeats only low-HP normals and enhances physical skills exactly once',()=>{
 const c=armed('katzregalia');assert.equal(hits(run(c)).length,1);c.hp=Math.floor(c.maxHp/2);assert.equal(hits(run(c)).length,2);assert.equal(hits(run(c,{type:'attack'},()=>.5,dummy(1))).length,1);
 const boosted=run(c,{type:'skill',skillId:'power_strike'});assert.equal(hits(boosted).length,1);
 assert.ok(hits(boosted)[0].damage>hits(run(c))[0].damage);
});
test('Reaper rolls five hits; explicit skills keep hit count, physical critical multiplier follows standard crit',()=>{
 const weapon=getWeapon('katzreaper'),attack=createNormalAttack({weapon});assert.equal(attack.hitCount,5);assert.equal(attack.powerPerHit,.5);
 assert.equal(createSkillAttack(getSkill('quick_strike'),{weapon}).hitCount,5);assert.equal(createSkillAttack(getSkill('art_sealing_stab'),{weapon}).hitCount,1);
 const args={attacker:{str:30,dex:30,hitBonus:1,criticalBonus:1},defender:{agi:1,def:100},attack,rng:()=>0};
 const a=resolvePhysicalAttack(args),b=resolvePhysicalAttack({...args,attack:{...attack,weapon:{...weapon,physicalCriticalMultiplier:1}}});
 assert.equal(a.criticalRate,.4);assert.equal(a.defensePenetration,.75);a.hits.forEach((h,i)=>assert.equal(h.damage,Math.floor(b.hits[i].damage*1.2)));
});
test('Benedia heals HP/SP once, including finishing hit; misses and skills do not recover; both attack miracles boosted',()=>{
 const c=armed('katzenbenedia');c.hp=10;c.sp=100;
 assert.equal(createNormalAttack({weapon:getWeapon('katzenbenedia')}).defensePenetration,.5);
 for(const enemy of [dummy(),dummy(1)]){const b=run(c,{type:'attack'},()=>.5,enemy);assert.equal(b.player.hp,10+Math.ceil(c.maxHp*.12));assert.equal(b.player.sp,100+Math.ceil(c.maxSp*.02));assert.equal(b.player.armorBattle?.barrier||0,0);}
 const missed=run(c,{type:'attack'},()=>.999999);assert.equal(missed.player.hp,10);assert.equal(missed.player.sp,100);
 const stats=collectStats(c);assert.equal(resolveHealing({caster:stats,target:c,healing:getSkill('healing_prayer')}).calculatedHealing,Math.floor((10+stats.int)*1.5));
 for(const id of ['holy_strike','holy_light']){const b=run(c,{type:'skill',skillId:id});assert.equal(b.player.hp,10);assert.equal(b.player.sp,100-getEffectiveSpCost(getSkill(id),c));assert.ok(hits(b)[0].damage>0);}
});
test('Nova resistance relief preserves immunity/weakness and enemy data; costs and one recast respect Gemini',()=>{
 const c=armed('katzennova'),stats=collectStats(c),spell=getSkill('fireball');
 for(const [from,to] of [[0,0],[.5,.7],[.9,1],[1,1],[1.5,1.5]]){
  const enemy={elementMultipliers:{fire:from}},r=resolveSpell({attacker:stats,defender:enemy,spell,rng:()=>.5});assert.equal(r.elementMultiplier,to);assert.equal(enemy.elementMultipliers.fire,from);
 }
 assert.equal(getEffectiveSpCost({spCost:10,category:'attackSpell'},c),7);assert.equal(getEffectiveSpCost({spCost:10,category:'attackSpell',ignoreSpCostReduction:true},c),10);
 assert.equal(hits(run(c,{type:'skill',skillId:'fireball'},()=>0)).length,2);assert.equal(hits(run(c,{type:'skill',skillId:'fireball'},()=>.4)).length,1);
 c.cards.deckSlots[0]='zodiac_gemini';const b=run(c,{type:'skill',skillId:'fireball'},()=>0);assert.equal(hits(b).length,3);assert.equal(c.sp-b.player.sp,getEffectiveSpCost(spell,c));
});
test('Regalia direct lethal hit survives once; further hits kill; checkpoint preserves use and new battle resets',()=>{
 const c=armed('katzregalia');c.hp=10;
 const enemy=dummy();enemy.attack=99999;enemy.actions=[{weight:1,action:{id:'lethal',actionType:'physicalAttack',weaponAttack:99999,hitCount:1,powerPerHit:1,unavoidable:true}}];
 let b=run(c,{type:'wait'},()=>.5,enemy);assert.equal(b.player.hp,1);assert.equal(b.player.weaponEndureUsed,true);
 b=run(b,{type:'wait'});assert.equal(b.player.hp,0);
 enemy.actions[0].action.hitCount=2;assert.equal(run(c,{type:'wait'},()=>.5,enemy).player.hp,0);
 const savedBattle=createBattleState({character:c,enemy:createEnemyCombatant(createGoddessMapBoss({themeId:'rice',level:100}))}),context={battleUuid:'weapon-test'};savedBattle.explorationContext=context;savedBattle.player.weaponEndureUsed=true;
 const restored=restoreGoddessCheckpoint(JSON.parse(JSON.stringify(goddessCheckpoint(savedBattle,context))),context);assert.equal(restored.player.weaponEndureUsed,true);
 assert.equal(createBattleState({character:restored.player,enemy:dummy()}).player.weaponEndureUsed,false);
});
test('HP/SP weapon addition is outside Taurus/Virgo multipliers; temporary bonuses do not change its basis',()=>{
 for(const id of ['katzregalia','katzennova']){
  const w=getWeapon(id);let c=character(w.allowedJobs[0]);c=normalizeCharacter(equipInstance(c,'rightArmId',null).character);
  c.cards.deckSlots[0]='zodiac_taurus';c.cards.deckSlots[1]='zodiac_virgo';c.temporaryStatBonuses={maxHp:100,maxSp:200};c=normalizeCharacter(c);
  const next=equip(c,id),g=getLevelGrowth(c.job,c.level,c.reincarnationCount);
  assert.equal(next.maxHp-c.maxHp,Math.floor(g.hp*(w.statBonuses.baseMaxHpRate||0)));assert.equal(next.maxSp-c.maxSp,Math.floor(g.sp*(w.statBonuses.baseMaxSpRate||0)));
 }
});
test('Endurance ignores poison, HP1 and barriers; Pisces is not spent on the survived hit',()=>{
 const c=armed('katzregalia');c.hp=10;c.cards.deckSlots[0]='zodiac_pisces';
 const enemy=dummy();enemy.attack=99999;enemy.actions=[{weight:1,action:{id:'lethal',actionType:'physicalAttack',hitCount:1,powerPerHit:1,unavoidable:true}}];
 let b=run(c,{type:'wait'},()=>.5,enemy);assert.equal(b.player.hp,1);assert.ok(!b.piscesUsed);
 b=run(b,{type:'wait'});assert.ok(b.piscesUsed);
 const naked=armed('katzregalia');naked.hp=1;b=run(naked,{type:'wait'},()=>.5,enemy);assert.equal(b.player.hp,0);assert.ok(!b.player.weaponEndureUsed);
 naked.hp=10;b=createBattleState({character:naked,enemy});b.sphinxBarrier=10000000;b=run(b,{type:'wait'});assert.equal(b.player.hp,10);assert.ok(!b.player.weaponEndureUsed);
 b=createBattleState({character:naked,enemy:dummy()});b.player.statuses=[{id:'poison',remainingTurns:3,damageMaxHpRate:.5,minimumDamage:1}];b=run(b,{type:'wait'});assert.ok(!b.player.weaponEndureUsed);
});
test('Nova all-target recast rolls once; no recast after wipe or from charge/ultimate',()=>{
 const c=armed('katzennova');
 let b=createBattleState({character:c,enemies:[dummy(),dummy()]});b=run(b,{type:'skill',skillId:'flame_sweep'},()=>0);assert.equal(hits(b).length,4);
 b=createBattleState({character:c,enemies:[dummy(1),dummy(1)]});b=run(b,{type:'skill',skillId:'flame_sweep'},()=>0);assert.equal(hits(b).length,2);
 for(const id of ['tunguska','apocalypse']){b=createBattleState({character:c,enemy:dummy()});b.player.playerCharge={value:100,cooldown:0};b=run(b,{type:'skill',skillId:id},()=>0);assert.doesNotMatch(b.log.join('\n'),/猫の気まぐれ/);}
});
test('final weapon exact values and armor set exclusion remain correct with actual armor equipped',()=>{
 const expected=[['katzregalia','divinemight',100,{str:3,baseMaxHpRate:.1}],['katzreaper','shadowless',65,{dex:3,agi:2,baseMaxHpRate:.1}],['katzenbenedia','heavenprayer',90,{int:3,luc:2,baseMaxSpRate:.12,healingMiracleMultiplier:1.5,attackMiracleDamageBonus:.3}],['katzennova','polarstar',30,{int:3,baseMaxSpRate:.15,attackSpellDamageBonus:.5,spCostMultiplier:.7,spellResistanceRelief:.2}]];
 for(const [id,series,atk,stats] of expected){
  const w=getWeapon(id);assert.equal(w.attack,atk);assert.deepEqual(w.statBonuses,stats);assert.equal(w.unique,true);
  let c=armed(id);
  for(const a of Object.values(armor).filter(a=>a.seriesId===series&&!(c.job==='mage'&&a.slot==='leftArmId'))){const g=grantEquipmentInstance(c,a.id,a.slot,{enhancement:2});c=equipInstance(g.character,a.slot,g.instance.instanceId).character;}
  assert.equal(getReincarnationArmorSet(c)?.id,series);
  c=equipInstance(c,c.job==='mage'?'headId':'leftArmId',null).character;assert.equal(getReincarnationArmorSet(c),null);
 }
});
