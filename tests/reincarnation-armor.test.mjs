import test from 'node:test';
import assert from 'node:assert/strict';
import {REINCARNATION_ARMOR as armor,REINCARNATION_ARMOR_SETS as sets,getReincarnationArmorSet} from '../data/reincarnation-armor.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {grantEquipmentInstance,equipInstance,canEquipInstance,getEquipmentInstanceDefinition} from '../data/equipment-inventory.js';
import {createBattleState,resolveBattleRound,createPlayerAction} from '../combat/battle-engine.js';
import {beginArmorCommand,finishArmorRound,grantArmorBarrier,absorbArmorBarrier,armorDamageMultiplier,syncArmorState} from '../combat/reincarnation-armor.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {resolveSpell} from '../combat/resolve-spell.js';
import {resolvePhysicalAttack} from '../combat/resolve-physical-attack.js';
import {getSkill} from '../data/skills.js';
import {collectStats} from '../combat/collect-stats.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {goddessCheckpoint,restoreGoddessCheckpoint} from '../js/special-map/goddess-checkpoint.js';

export function armorCharacter(seriesId, enhancement=3) {
  const set=sets[seriesId];
  let c=normalizeCharacter({...createInitialCharacter({name:'検証',job:set.job}),reincarnationCount:set.tier,level:100});
  c.equipment.leftArmId=null;c.equippedInstanceIds.leftArmId=null;
  for(const item of Object.values(armor).filter(x=>x.seriesId===seriesId)) {
    const grant=grantEquipmentInstance(c,item.id,item.slot,{enhancement});assert.ok(grant.accepted);
    c=grant.character;
    const result=equipInstance(c,item.slot,grant.instance.instanceId);assert.ok(result.accepted,result.reason);
    c=result.character;
  }
  c=normalizeCharacter(c);
  c.hp=500;c.maxHp=1000;c.sp=1000;c.maxSp=1000;c.baseStats={str:30,int:30,dex:30,agi:30,luc:1};
  c.skillIds=[...new Set([...c.skillIds,'fireball','triage','maximal_triage','apocalypse'])];
  return c;
}
const dummy=()=>({id:'dummy',name:'検証敵',hp:100000,maxHp:100000,alive:true,attack:1,def:0,
  stats:{str:1,int:1,agi:1,dex:1,luc:1},statuses:[],scriptedActionCycle:['待機']});
const battleFor=id=>createBattleState({character:armorCharacter(id),enemy:dummy()});
const run=(battle,type='attack',skillId)=>resolveBattleRound({battle,playerCommand:{type,skillId},rng:()=>.5}).battle;

test('48 armor definitions, all 192 enhancement values, effects and totals match specification',()=>{
  const specs=[
    ['obsidian',[12,13,16,11],[[3,3,4,5],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
    ['nightcrow',[10,11,15,10],[[5,6,8,10],[5,6,8,10],[4,5,6,8],[5,6,8,10]]],
    ['dawn',[11,11,16,10],[[4,5,6,8],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
    ['eveningstar',[0,14,19,13],[[2,3,4,5],[5,6,8,10],[5,6,8,10],[5,6,8,10]]],
    ['dragonbone',[15,15,19,13],[[5,5,6,7],[10,11,13,15],[10,10,11,12],[10,11,13,15]]],
    ['phantomshade',[13,13,18,12],[[10,11,13,15],[10,11,13,15],[8,9,10,12],[10,11,13,15]]],
    ['sacredradiance',[14,13,19,12],[[8,9,10,12],[10,11,13,15],[10,11,13,15],[10,11,13,15]]],
    ['firmament',[0,17,23,16],[[5,6,7,8],[10,11,13,15],[10,11,13,15],[10,11,13,15]]],
    ['divinemight',[17,18,22,15],[[7,8,9,10],[15,16,18,20],[12,13,14,15],[15,16,18,20]]],
    ['shadowless',[15,16,21,14],[[15,16,18,20],[15,16,18,20],[12,13,14,15],[15,16,18,20]]],
    ['heavenprayer',[16,16,22,14],[[12,13,14,15],[15,16,18,20],[15,16,18,20],[15,16,18,20]]],
    ['polarstar',[0,20,27,19],[[8,8,9,10],[15,16,18,20],[15,16,18,20],[15,16,18,20]]]
  ];
  const keys={warrior:['magicDamageReduction','actionSkipResistance','magicDamageReduction','bleedingResistance'],
    thief:['bleedingResistance','actionSkipResistance','magicDamageReduction','surpriseResistance'],
    priest:['magicDamageReduction','actionSkipResistance','healingMiracleBonus','poisonResistance'],
    mage:['attackSpellDamageBonus','actionSkipResistance','magicDamageReduction','bleedingResistance']};
  const totals=[64,58,60,55,74,68,70,65,84,78,80,75];
  assert.equal(Object.keys(armor).length,48);
  specs.forEach(([id,defs,rates],index)=>{
    const set=sets[id],items=Object.values(armor).filter(x=>x.seriesId===id);
    let total=0;
    items.forEach((item,i)=>{
      assert.equal(item.unique,undefined);assert.equal(item.sellPrice,6000+item.minimumReincarnations*1000);
      assert.equal(item.description,undefined);
      for(let n=0;n<4;n++){
        const expected={def:set.job==='mage'&&i===0?0:defs[i]+n,[keys[set.job][i]]:rates[i][n]/100};
        const extra={warrior:[3,'lightning'],thief:[2,'dark'],priest:[0,'holy'],mage:[3,'earth']}[set.job];
        if(set.tier===3&&i===extra[0])expected[`${extra[1]}DamageReduction`]=[5,6,8,10][n]/100;
        assert.deepEqual(getEquipmentInstanceDefinition({equipmentId:item.id,slot:item.slot,enhancement:n}).statBonuses,expected);
      }
      total+=item.statBonusesByEnhancement[3].def;
    });
    assert.equal(total,totals[index]);
  });
});
test('all jobs and reincarnation gates; regular grant/equip, duplicate ownership and normalized saves',()=>{
  for(const item of Object.values(armor)) for(const job of ['warrior','thief','priest','mage']) for(let n=0;n<=3;n++){
    let c={...createInitialCharacter({name:'検証',job}),reincarnationCount:n};
    const g=grantEquipmentInstance(c,item.id,item.slot);assert.ok(g.accepted);c=g.character;
    const expected=job===item.allowedJobs[0]&&n>=item.minimumReincarnations;
    assert.equal(canEquipInstance(c,g.instance).accepted,expected);
    assert.equal(equipInstance(c,item.slot,g.instance.instanceId).accepted,expected);
    assert.ok(grantEquipmentInstance(c,item.id,item.slot,{enhancement:2}).accepted);
  }
  for(const id of Object.keys(sets)){
    const c=armorCharacter(id);
    assert.equal(getReincarnationArmorSet(normalizeCharacter(JSON.parse(JSON.stringify(c))))?.id,id);
    assert.equal(getReincarnationArmorSet(normalizeCharacter({...c,reincarnationCount:0})),null);
    assert.equal(getReincarnationArmorSet({...c,equippedInstanceIds:{}}),null);
  }
});
test('set requires actual matching slots; mixed enhancements work; mage book excluded',()=>{
  for(const id of Object.keys(sets)){
    const c=armorCharacter(id);
    c.equipmentInventory.instances.forEach((x,i)=>x.enhancement=i%4);
    assert.equal(getReincarnationArmorSet(c)?.id,id);
    c.equippedInstanceIds.leftArmId=null;
    assert.equal(Boolean(getReincarnationArmorSet(c)),sets[id].job==='mage');
    c.equippedInstanceIds.headId=null;
    assert.equal(getReincarnationArmorSet(c),null);
  }
});
test('warrior guard heals once per round, expires after two rounds, no healing after outcome',()=>{
  let b=battleFor('divinemight'); b=run(b,'guard');
  assert.equal(b.player.hp,530);assert.equal(b.player.armorBattle.counterUntil,3);
  const previous=b.player.hp;b.turn=1;finishArmorRound(b);assert.equal(b.player.hp,previous);b.turn=2;
  beginArmorCommand(b,{actionType:'physicalAttack'});
  assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},b.enemy),1.15);
  assert.equal(b.player.armorBattle.counterUntil,0);
  b=battleFor('dragonbone');b=run(b,'guard');b=run(b,'wait');b=run(b,'wait');
  beginArmorCommand(b,{actionType:'physicalAttack'});assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},b.enemy),1);
  b=battleFor('obsidian');b.player.armorBattle.guardTurn=b.turn;b.outcome='victory';finishArmorRound(b);
  assert.equal(b.player.hp,500);assert.equal(b.player.armorBattle,undefined);
});
test('thief first command persists through spells and is shared by hits; target opportunity is per enemy',()=>{
  let b=battleFor('shadowless');b=run(b,'skill','fireball');assert.equal(b.player.armorBattle.firstUsed,false);
  beginArmorCommand(b,{actionType:'physicalAttack'});
  assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},b.enemy),1.3);
  assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},b.enemy),1.3);
  b.enemy.armorOpportunityTurn=b.turn;
  assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},b.enemy),1.2);
  beginArmorCommand(b,{actionType:'physicalAttack'});
  assert.equal(armorDamageMultiplier(b,{actionType:'physicalAttack'},{}),1.1);
});
test('priest actual healing creates capped max-replacement barrier, overflow and expiry',()=>{
  let b=battleFor('heavenprayer');b=run(b,'skill','maximal_triage');
  assert.equal(b.player.hp,1000);assert.equal(b.player.armorBattle.barrier,50);
  const through=absorbArmorBarrier(b,[{damage:20,hit:true},{damage:80,hit:true}]);
  assert.deepEqual(through.map(x=>x.damage),[0,50]);assert.equal(b.player.armorBattle.barrier,0);
  grantArmorBarrier(b,300);grantArmorBarrier(b,100);assert.equal(b.player.armorBattle.barrier,30);
  grantArmorBarrier(b,0);assert.equal(b.player.armorBattle.barrier,30);
  b=run(b,'wait');b=run(b,'wait');b=run(b,'wait');assert.equal(b.player.armorBattle.barrier,0);
  b.player.hp=0;finishArmorRound(b);assert.equal(b.player.armorBattle,undefined);
});
test('mage cycles 3+1, uses same SP cost, preserves pending through non-spells and insufficient SP',()=>{
  for(const id of ['eveningstar','firmament','polarstar']){
    let b=battleFor(id);
    for(let i=0;i<3;i++) b=run(b,'skill','fireball');
    assert.equal(b.player.armorBattle.casts,3);b=run(b,'guard');assert.equal(b.player.armorBattle.casts,3);
    const cost=getEffectiveSpCost(getSkill('fireball'),b.player),before=b.player.sp;
    const resumed=JSON.parse(JSON.stringify(b));
    b=run(resumed,'skill','fireball');
    assert.equal(b.player.sp,before-cost);assert.equal(b.player.armorBattle.casts,0);
    b=run(b,'skill','fireball');assert.equal(b.player.armorBattle.casts,1);
    b.player.armorBattle.casts=3;b.player.sp=0;
    assert.equal(createPlayerAction(b.player,{type:'skill',skillId:'fireball'}).ok,false);
    assert.equal(b.player.armorBattle.casts,3);
    assert.equal(getEffectiveSpCost({...getSkill('apocalypse'),spCost:100},b.player),[80,70,60][sets[id].tier-1]);
  }
});
test('new elemental reductions multiply spell mitigation and apply per physical hit element',()=>{
  for(const element of ['lightning','dark','holy','earth']){
    const defender={def:0,magicDamageReduction:.25,[`${element}DamageReduction`]:.1};
    const spell={actionType:'spell',element,spellPower:1000};
    const s=resolveSpell({attacker:{int:0},defender,spell,rng:()=>.5});
    const base=resolveSpell({attacker:{int:0},defender:{},spell,rng:()=>.5});
    assert.equal(s.totalDamage,Math.floor(base.totalDamage*.675));
    const attack={weaponAttack:1000,hitCount:2,hitElements:[element,'physical'],unavoidable:true};
    const p=resolvePhysicalAttack({attacker:{str:0,luc:0},defender,attack,rng:()=>.5});
    assert.equal(p.hits[0].damage,Math.floor(p.hits[1].damage*.9));
  }
  assert.equal(collectStats(armorCharacter('divinemight')).magicDamageReduction,.25);
  assert.equal(collectStats(armorCharacter('divinemight')).lightningDamageReduction,.1);
});

test('two-handed weapons remove four-piece sets but preserve mage three-piece set',()=>{
  for(const [id,weapon] of [['divinemight','iron_greatsword'],['polarstar','salamander_staff']]){
    let c=armorCharacter(id);
    const g=grantEquipmentInstance(c,weapon,'rightArmId');assert.ok(g.accepted);
    const e=equipInstance(g.character,'rightArmId',g.instance.instanceId);assert.ok(e.accepted,e.reason);
    c=e.character;assert.equal(c.equippedInstanceIds.leftArmId,null);
    assert.equal(Boolean(getReincarnationArmorSet(c)),id==='polarstar');
  }
  let c=armorCharacter('divinemight');
  const g=grantEquipmentInstance(c,'reinc_dragonbone_head','headId');
  c=equipInstance(g.character,'headId',g.instance.instanceId).character;
  assert.equal(getReincarnationArmorSet(c),null);
});
test('skipped player commands do not heal, consume first strike, or advance spell count; misses do consume',()=>{
  for(const [id,command] of [['divinemight',{type:'guard'}],['shadowless',{type:'attack'}],['polarstar',{type:'skill',skillId:'fireball'}]]){
    let b=battleFor(id);b.player.statuses=[{id:'action_skip',actionSkips:1,active:true}];
    b=resolveBattleRound({battle:b,playerCommand:command,rng:()=>.5}).battle;
    assert.equal(b.player.hp,500);assert.equal(b.player.armorBattle.firstUsed,false);assert.equal(b.player.armorBattle.casts,0);
  }
  let b=battleFor('shadowless');b=resolveBattleRound({battle:b,playerCommand:{type:'attack'},rng:()=>.999999}).battle;
  assert.equal(b.player.armorBattle.firstUsed,true);assert.equal(b.enemy.hp,100000);
});
test('multi-enemy guard recovery is once, all-target spell counts once and skipped enemies count as acted',()=>{
  let b=createBattleState({character:armorCharacter('divinemight'),enemies:[dummy(),dummy(),dummy()]});
  b=run(b,'guard');assert.equal(b.player.hp,530);
  b=createBattleState({character:armorCharacter('polarstar'),enemies:[dummy(),dummy()]});
  b.player.playerCharge={value:100,cooldown:0};
  b.player.armorBattle.casts=3;
  const r=resolveBattleRound({battle:b,playerCommand:{type:'skill',skillId:'apocalypse'},rng:()=>.5});
  assert.ok(r.accepted,r.reason);assert.equal(r.battle.player.sp,940);assert.equal(r.battle.player.armorBattle.casts,0);
  assert.ok(r.battle.enemies.every(e=>e.hp<100000));
  b=battleFor('shadowless');b.enemy.stats.agi=999;b.enemy.statuses=[{id:'action_skip',actionSkips:1,active:true}];
  b=run(b);assert.equal(b.enemy.armorOpportunityTurn,1);
});
test('priest barrier overflow passes through actual battle HP; poison bypasses and no overheal barrier',()=>{
  let b=battleFor('heavenprayer');
  delete b.enemy.scriptedActionCycle;b.enemy.attack=200;
  const control=run(b,'wait');
  b.player.armorBattle.barrier=10;b.player.armorBattle.barrierUntil=3;
  const shielded=run(b,'wait');
  assert.equal(shielded.player.hp,control.player.hp+10);assert.equal(shielded.player.armorBattle.barrier,0);
  b=battleFor('heavenprayer');b.player.armorBattle.barrier=50;b.player.armorBattle.barrierUntil=5;
  b.player.statuses=[{id:'poison',remainingTurns:3,damageMaxHpRate:.02,minimumDamage:1}];
  b=run(b,'wait');assert.ok(b.player.hp<500);assert.equal(b.player.armorBattle.barrier,50);
  b=battleFor('heavenprayer');b.player.hp=b.player.maxHp;b=run(b,'skill','triage');
  assert.equal(b.player.armorBattle.barrier,0);
});
test('real checkpoint roundtrip retains command consumption, barrier and round idempotency',()=>{
  for(const id of ['divinemight','shadowless','heavenprayer','polarstar']){
    let b=createBattleState({character:armorCharacter(id),enemy:createEnemyCombatant(createGoddessMapBoss({themeId:'rice',level:100}))});
    const context={battleUuid:'armor-test'};b.explorationContext=context;
    b.player.armorBattle={...b.player.armorBattle,firstUsed:true,casts:3,barrier:20,barrierUntil:5,counterFrom:2,counterUntil:3,finishedTurn:1};
    const saved=JSON.parse(JSON.stringify(goddessCheckpoint(b,context)));
    const resumed=restoreGoddessCheckpoint(saved,context);
    assert.deepEqual(resumed.player.armorBattle,b.player.armorBattle);
    const hp=resumed.player.hp;finishArmorRound(resumed);assert.equal(resumed.player.hp,hp);
    resumed.player.equippedInstanceIds.headId=null;syncArmorState(resumed.player);assert.equal(resumed.player.armorBattle,undefined);
    assert.equal(createBattleState({character:b.player,enemy:dummy()}).player.armorBattle.firstUsed,false);
  }
});
test('Gemini repeats share the first-strike command bonus; immune spells still advance once',()=>{
  let b=battleFor('shadowless');b.geminiActiveAtStart=true;b.player.skillIds.push('power_strike');
  const control=structuredClone(b);control.player.armorBattle.firstUsed=true;
  const boosted=run(b,'skill','power_strike'),plain=run(control,'skill','power_strike');
  const hits=x=>x.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player');
  assert.equal(hits(boosted).length,2);assert.equal(hits(plain).length,2);
  for(let i=0;i<2;i++)assert.ok(hits(boosted)[i].damage>hits(plain)[i].damage);
  assert.equal(boosted.player.armorBattle.firstUsed,true);
  b=battleFor('polarstar');b.geminiActiveAtStart=true;b.enemy.elementMultipliers={fire:0};
  b=run(b,'skill','fireball');assert.equal(b.enemy.hp,100000);assert.equal(b.player.armorBattle.casts,1);
  b.player.armorBattle.casts=3;
  assert.equal(getEffectiveSpCost({actionType:'spell',spCost:0},b.player),0);
  assert.equal(getEffectiveSpCost({actionType:'spell',spCost:1},b.player),3); // ceil(1 * 4 * 0.6)
  b.player.equipmentStatBonuses.spCostMultiplier=.5;
  assert.equal(getEffectiveSpCost({actionType:'spell',spCost:9},b.player),11); // ceil(9 * 4 * 0.5 * 0.6)
});
test('existing barriers absorb before priest armor barrier and non-set battles gain no armor state',()=>{
  let b=battleFor('heavenprayer');delete b.enemy.scriptedActionCycle;b.enemy.attack=50;
  b.player.armorBattle.barrier=50;b.player.armorBattle.barrierUntil=4;b.sphinxBarrier=10000;
  b=run(b,'wait');assert.equal(b.player.hp,500);assert.equal(b.player.armorBattle.barrier,50);
  const c=createInitialCharacter({name:'旧セーブ',job:'warrior'});
  b=createBattleState({character:c,enemy:dummy()});b=run(b);
  assert.equal(b.player.armorBattle,undefined);assert.equal(b.armorCommand,undefined);
});
