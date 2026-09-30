import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePlayerPhysicalAttack as prepare} from '../combat/player-physical-attack.js';
import {createNormalAttack,createSkillAttack} from '../combat/create-attack.js';
import {resolvePhysicalAttack} from '../combat/resolve-physical-attack.js';
import {getSkill} from '../data/skills.js';
import {createInitialCharacter} from '../data/classes.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createEnemyCombatant,getEnemyById} from '../data/enemies.js';
const stats={str:20,dex:20,int:20};
const damage=a=>resolvePhysicalAttack({attacker:stats,defender:{def:40},attack:{...a,unavoidable:true},rng:()=>.5});
test('player level and weapon coefficients apply once to normals and skills',()=>{
 const normal=createNormalAttack({weapon:{id:'test',type:'greatsword',attack:20}});
 assert.equal(damage(normal).totalDamage,25);
 assert.equal(damage(prepare(normal,stats,100)).totalDamage,54);
 const skill=createSkillAttack(getSkill('power_strike'),{weapon:{id:'test',type:'greatsword',attack:20}});
 assert.equal(damage(prepare(skill,stats,100)).totalDamage,84);
 for(const level of [1,10,30,50,100,197]) {
  const attack=prepare(createNormalAttack({weapon:{type:'longsword',attack:20}}),stats,level);
  assert.equal(damage(attack).attackPower,40*(1+(level-1)*.005));
 }
});
test('dagger DEX stays outside level coefficient and inside each hit multiplier',()=>{
 const normal=createNormalAttack({weapon:{type:'dagger',attack:20}});
 const result=damage(prepare(normal,stats,50));
 assert.deepEqual(result.hits.map(h=>h.damage),[12,12]);
 for(const id of ['the_five_star','katzendolch','jormungandr','fulgura']) {
  const a=createNormalAttack({weaponId:id}),b=prepare(a,stats,100);
  assert.equal(b.hitCount,a.hitCount);assert.equal(b.powerPerHit,a.powerPerHit);
  assert.equal(b.defensePenetration,a.defensePenetration);
 }
});
test('explicit ability formulas and oak staff retain their formulas',()=>{
 const oak=createNormalAttack({weaponId:'oak_staff'});
 assert.equal(prepare(oak,stats,197),oak);
 for(const id of ['drachen_fang','acht_streich','call_goddess_name','twilight_flash']) {
  const a=createSkillAttack(getSkill(id),{weaponId:'iron_longsword'});
  assert.equal(prepare(a,stats,197),a);
 }
});
test('actual battle grows player attacks with level while enemy damage is unchanged',()=>{
 const run=level=>{
  const c=createInitialCharacter({name:'test',job:'warrior'});c.level=level;c.hp=c.maxHp=9999;c.skillIds=[];
  const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));enemy.hp=enemy.maxHp=9999;
  const r=resolveBattleRound({battle:createBattleState({character:c,enemy}),playerCommand:{type:'attack'},rng:()=>.5});
  return {dealt:9999-r.battle.enemy.hp,taken:9999-r.battle.player.hp};
 };
 const low=run(1),high=run(100);assert.ok(high.dealt>low.dealt);assert.equal(low.taken,high.taken);
});
