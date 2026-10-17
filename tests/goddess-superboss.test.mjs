import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound,resolveBattleOutcome,createEnemyAction,applyCancerDoubleReturn,applyFixedFollowUpDamage} from '../combat/battle-engine.js';
import {applyNpcAfterPlayerAttack} from '../combat/npc-support.js';
import {applyStatusApplications} from '../combat/status-lifecycle.js';
import {superbossCharacter} from '../tools/simulate-goddess-superboss.mjs';
import {goddessState,finishGoddessPlayerOpportunity,recordGoddessInterruptionDamage,goddessForecast} from '../combat/goddess-superboss.js';
import {prepareGoddessAction,executeGoddessUtility,finishGoddessAction,capGoddessDot} from '../combat/karte-goddesses.js';
import {resolveStatusEffect} from '../combat/resolve-status-effect.js';
import {calculateCriticalRate} from '../combat/resolve-physical-attack.js';
import {goddessCheckpoint,restoreGoddessCheckpoint} from '../js/special-map/goddess-checkpoint.js';
const make=(theme='tender')=>createBattleState({character:superbossCharacter(),enemy:createEnemyCombatant(createGoddessMapBoss({themeId:theme,level:100}))});
const round=(b,command={type:'guard'},rng=()=>.5)=>{const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.ok(r.accepted,r.reason);return r.battle;};
const act=(b,a)=>{a=prepareGoddessAction(b,b.enemy,a);executeGoddessUtility(b,b.enemy,a);finishGoddessAction(b,b.enemy);};
const healAction={id:'zelena_breath',name:'若葉の息吹',actionType:'buff',goddessUtility:'heal',cooldown:10};

test('Lv100 candidate HP/DEF/ATK and original lower-level rules remain isolated',()=>{
 for(const [theme,hp,def] of [['rice',250000,65],['dusk',180000,50],['tender',210000,70]]){
  const e=make(theme).enemy;assert.equal(e.hp,hp);assert.equal(e.def,def);assert.equal(e.goddessOffenseMultiplier,10);
  const old=createGoddessMapBoss({themeId:theme,level:99});assert.equal(old.goddessOffenseMultiplier,1.6);assert.equal(old.goddessCandidate,undefined);
 }
 assert.equal(make('rice').enemy.attack,130);
});
test('Lumina boundary stacks phase and power once, heal fixed4000, ultimate never crits',()=>{
 const b=make('rice');b.enemy.hp=125001;assert.equal(prepareGoddessAction(b,b.enemy,{element:'lightning'}).goddessDamageMultiplier,10);
 b.enemy.hp=125000;goddessState(b.enemy).power=3;
 const a=prepareGoddessAction(b,b.enemy,{element:'lightning',goddessUltimate:true});assert.equal(a.goddessDamageMultiplier,13.2);assert.equal(a.criticalBonus,0);assert.equal(calculateCriticalRate({attacker:{dex:90,criticalBonus:1},attack:a}),0);
 act(b,{id:'lumina_heal',name:'豊穣',goddessUtility:'heal',healRatio:.05});assert.equal(b.enemy.hp,129000);
});
test('moon advances completed actions only, starts new and forces Eclipse after a new command',()=>{
 let b=make('dusk');b.enemy.actions=[{weight:1,action:{id:'plain',name:'plain',actionType:'spell',spellPower:1}}];
 for(let moon=1;moon<=3;moon++){b=round(b);assert.equal(b.enemy.goddessRuntime.moon,moon);}
 assert.match(goddessForecast(b.enemy),/満月.*月蝕/);
 const before=b.turn;b=round(b);assert.ok(b.presentationEvents.some(e=>e.actionName==='月蝕'));assert.equal(b.turn,before+1);assert.equal(b.enemy.goddessRuntime.moon,0);
 const skipped=make('dusk');goddessState(skipped.enemy).moon=2;finishGoddessAction(skipped,skipped.enemy);assert.equal(skipped.enemy.goddessRuntime.moon,2);
 for(let i=0;i<20;i++)goddessForecast(skipped.enemy);assert.equal(skipped.enemy.goddessRuntime.moon,2);
});
test('full moon cannot be replaced by drain; drain capped three with four opportunities spacing',()=>{
 let b=make('dusk');b.enemy.actions=[{weight:1,action:{id:'noctia_dew',name:'drain',actionType:'spDrain',spDamage:150}},{weight:.00001,action:{id:'plain',name:'plain',actionType:'spell',spellPower:1}}];
 const drains=[];
 for(let i=0;i<18;i++){const prior=b.player.sp;b=round(b,{type:'guard'},()=>0);if(b.player.sp<prior){drains.push(i);assert.ok(prior-b.player.sp<=150);}}
 assert.equal(drains.length,3);for(let i=1;i<drains.length;i++)assert.ok(drains[i]-drains[i-1]>=4);
});
test('Zelena two command opportunities, threshold includes only measured attack loss, interruption consumes use and rests',()=>{
 const b=make();b.enemy.hp=100000;act(b,healAction);const r=goddessState(b.enemy);
 finishGoddessPlayerOpportunity(b);assert.equal(r.healPreparation.remaining,2);
 b.turn++;recordGoddessInterruptionDamage(b,b.enemy,3000);finishGoddessPlayerOpportunity(b);assert.equal(r.healPreparation.remaining,1);
 b.turn++;recordGoddessInterruptionDamage(b,b.enemy,3000);finishGoddessPlayerOpportunity(b);
 assert.equal(r.healPreparation,undefined);assert.equal(r.uses.zelena_breath,1);assert.equal(r.rest,true);
 act(b,{goddessUtility:'preparedHeal'});assert.equal(b.enemy.hp,100000);assert.equal(r.rest,false);
});
test('unsuccessful preparation expires even on lost opportunities and heals8400 with cleanse',()=>{
 const b=make();b.enemy.hp=100000;act(b,healAction);b.enemy.statuses=[{id:'death_poison'}];
 for(let i=0;i<2;i++){b.turn++;finishGoddessPlayerOpportunity(b);}
 act(b,{goddessUtility:'preparedHeal'});assert.equal(b.enemy.hp,108400);assert.equal(b.enemy.statuses.length,0);
});
test('engine multihit counts one opportunity; barrier actual absorption, no NPC/counter/poison accumulation',()=>{
 let b=make();b.enemy.hp=150000;act(b,healAction);b.turn++;
 b.enemy.bossMagicBarrierMax=250;b.enemy.bossMagicBarrier=250;
 // Faster enemy waits, all hits are still one player command.
 b.enemy.stats.agi=100;b.enemy.actions=[{weight:1,action:healAction}];
 b=round(b,{type:'attack'},()=>.5);
 const p=b.enemy.goddessRuntime.healPreparation;assert.equal(p.remaining,1);
 const hpLoss=b.presentationEvents.filter(e=>e.type==='attackHit'&&e.targetSide==='enemy').reduce((s,e)=>s+(e.actualHpLoss||0),0);
 assert.equal(p.damage,hpLoss+250);
});
test('revival clears pending effects but keeps use counts, once only, poison death revives',()=>{
 const b=make();const r=goddessState(b.enemy);Object.assign(r,{uses:{zelena_breath:2,zelena_bud:2,zelena_barrier:3},regen:2,healPreparation:{remaining:1,damage:4000}});
 b.enemy.hp=0;b.enemy.bossMagicBarrier=250;b.enemy.reservedEnemyAction={id:'x'};b.enemy.statuses=[{id:'death_poison'}];resolveBattleOutcome(b);
 assert.equal(b.enemy.hp,63000);assert.equal(b.outcome,null);assert.equal(r.uses.zelena_breath,2);assert.equal(r.healPreparation,undefined);assert.equal(r.regen,0);assert.equal(b.enemy.bossMagicBarrier,0);assert.equal(b.enemy.statuses.length,0);assert.equal(b.enemy.reservedEnemyAction,undefined);
 b.enemy.hp=0;resolveBattleOutcome(b);assert.equal(b.outcome,'victory');
});
test('all ordinary/guaranteed toxic applications are exactly1%; original minimum untouched elsewhere and caps40/80',()=>{
 for(const statusId of ['deadly_poison','death_poison'])for(const guaranteed of [false,true]){
  const args={attacker:{dex:90,int:90},defender:make().enemy,effect:{statusId,baseRate:1,guaranteed}};
  assert.equal(resolveStatusEffect({...args,rng:()=>.009}).rate,.01);assert.equal(resolveStatusEffect({...args,rng:()=>.011}).success,false);
 }
 assert.equal(resolveStatusEffect({effect:{statusId:'deadly_poison',baseRate:0},rng:()=>.02}).rate,.05);
 assert.deepEqual(capGoddessDot(make().enemy,{deadlyPoisonDamage:9999,deathPoisonDamage:9999}),{deadlyPoisonDamage:40,deathPoisonDamage:80});
});
test('checkpoint JSON roundtrip keeps both actors, preparation, moon and finite uses with new session ID',()=>{
 const b=make();b.explorationContext={battleUuid:'same',sessionId:1};act(b,healAction);goddessState(b.enemy).reviveUsed=true;b.player.playerCharge.value=65;
 const saved=JSON.parse(JSON.stringify(goddessCheckpoint(b,b.explorationContext)));
 const restored=restoreGoddessCheckpoint(saved,{battleUuid:'same',sessionId:2});assert.equal(restored.enemy.goddessRuntime.reviveUsed,true);assert.equal(restored.enemy.goddessRuntime.uses.zelena_breath,1);assert.equal(restored.enemy.goddessRuntime.healPreparation.remaining,2);assert.equal(restored.player.playerCharge.value,65);assert.equal(restored.explorationContext.sessionId,2);
 assert.equal(restoreGoddessCheckpoint(saved,{battleUuid:'wrong'}),null);
});

test('real engine skipped opportunities expire preparation and skipped Noctia keeps moon',()=>{
 let b=make();b.enemy.hp=100000;act(b,healAction);b.turn++;
 for(let i=0;i<2;i++){
  b.player.statuses=[{id:'action_skip',actionSkips:1,remainingTurns:1}];b=round(b);
 }
 if(b.enemy.goddessRuntime.healPreparation)b=round(b);
 assert.equal(b.enemy.goddessRuntime.healPreparation,undefined);assert.equal(b.enemy.goddessRuntime.uses.zelena_breath,1);
 let n=make('dusk');goddessState(n.enemy).moon=2;n.enemy.statuses=[{id:'action_skip',actionSkips:1,remainingTurns:1}];
 n=round(n);assert.equal(n.enemy.goddessRuntime.moon,2);
});
test('guard reduces telegraphed ultimate after x10, fast/slow enemy cannot bypass next command, then rest',()=>{
 for(const speed of [-200,200]){
  let b=make('rice');b.enemy.actions=[{weight:1,action:{id:'prepare',name:'予告',actionType:'prepareAction',speedModifier:speed,reservedAction:{id:'ultimate',name:'大技',actionType:'spell',spellPower:220,element:'lightning',guardable:true,goddessUltimate:true,speedModifier:speed}}}];
  b=round(b);assert.ok(b.enemy.reservedEnemyAction);assert.ok(!b.presentationEvents.some(e=>e.actionName==='大技'));
  const guarded=round(b,{type:'guard'}),exposed=round(b,{type:'wait'});
  const damage=r=>r.presentationEvents.filter(e=>e.type==='attackHit'&&e.targetSide==='player').reduce((s,e)=>s+e.damage,0);
  assert.ok(damage(guarded)<damage(exposed));assert.ok(guarded.presentationEvents.filter(e=>e.actionName==='大技').every(e=>!e.critical));
  const rested=round(guarded);assert.ok(!rested.presentationEvents.some(e=>e.type==='attackHit'&&e.targetSide==='player'));
 }
});
test('NPC, counter and poison do not count; direct player follow-up counts actual HP only',()=>{
 const b=make();b.player=superbossCharacter('warrior','base',true);b.enemy.hp=100000;act(b,healAction);b.turn++;
 b.cancerActiveAtStart=true;
 applyCancerDoubleReturn({battle:b,action:{actionType:'spell'},attacker:b.enemy,defender:b.player,actualHpLoss:1000,rng:()=>0});
 applyNpcAfterPlayerAttack(b,()=>0);assert.equal(b.enemy.goddessRuntime.healPreparation.damage,0);
 b.enemy.hp=100;b.followUpDamageAtStart=500;applyFixedFollowUpDamage(b,b.enemy);assert.equal(b.enemy.goddessRuntime.healPreparation.damage,100);
 let p=make();p.enemy.hp=40;p.enemy.statuses=applyStatusApplications([],[{statusId:'death_poison',success:true}]);
 p.enemy.actions=[{weight:1,action:{id:'idle',name:'idle',actionType:'wait'}}];p=round(p);
 assert.equal(p.enemy.goddessRuntime.reviveUsed,true);assert.equal(p.enemy.hp,63000);assert.equal(p.outcome,null);
});
test('finite healing/regen/barrier tables cannot refill after revival or JSON resume',()=>{
 const b=make();b.enemy.hp=100000;const r=goddessState(b.enemy);r.uses={zelena_breath:2,zelena_bud:2,zelena_barrier:3};
 for(let i=0;i<100;i++)assert.ok(!createEnemyAction(b.enemy,()=>i/100,{battle:b}).goddessUtility);
 b.enemy.hp=0;resolveBattleOutcome(b);const clone=JSON.parse(JSON.stringify(b));
 for(let i=0;i<100;i++)assert.ok(!createEnemyAction(clone.enemy,()=>i/100,{battle:clone}).goddessUtility);
 const l=make('rice');l.enemy.hp=100000;goddessState(l.enemy).uses.lumina_heal=2;
 for(let i=0;i<100;i++)assert.notEqual(createEnemyAction(l.enemy,()=>i/100,{battle:l}).id,'lumina_heal');
});
