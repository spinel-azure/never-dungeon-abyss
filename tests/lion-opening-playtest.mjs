import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fixture,hpItems,canUse,healValue} from './lion-queen-level197-playtest.mjs';
import {createBossCombatant} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {collectStats} from '../combat/collect-stats.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';
import {magicBarrierAmount} from '../combat/aquarius.js';
import {getSkill} from '../data/skills.js';
import {LION_CONFIG as C,LEO_EVENT_RELEASED} from '../data/loewenkoenigin.js';
assert.equal(LEO_EVENT_RELEASED,false);
const z=ids=>ids.split(',').map(id=>'zodiac_'+id);
const mageGear=[['rightArmId','comet_booster',0],['headId','astral_crystal_hat',3],['bodyId','astral_crystal_robe',3],['footId','astral_crystal_shoes',3],['accessoryId','frost_giant_talisman',2]];
const builds=[
 {id:'A',mode:'normal',deck:z('scorpio,libra,sagittarius,taurus,cancer,pisces')},
 {id:'B',mode:'normal',deck:z('capricorn,libra,sagittarius,taurus,cancer,pisces')},
 {id:'C',mode:'physical',deck:z('capricorn,libra,sagittarius,taurus,cancer,pisces')},
 {id:'D',mode:'physical',deck:z('capricorn,libra,sagittarius,gemini,cancer,pisces')},
 {id:'E',mode:'magic',job:'mage',equipment:mageGear,deck:z('capricorn,libra,sagittarius,gemini,aquarius,pisces')}
].map(build=>({...build,character:fixture(build)}));
function choice(b,mode) {
 const p=b.player,e=b.enemy,skill=id=>({type:'skill',skillId:id});
 const affordable=id=>magicBarrierAmount(p)>0&&!getSkill(id).ignoreSpCostReduction||p.sp>=getSkill(id).spCost;
 if(e.reservedEnemyAction)return {type:'guard'};
 if(p.hp<p.maxHp*.4){
  if(p.hp<p.maxHp*.25&&canUse(b,'allheilmittel'))return {type:'item',itemId:'allheilmittel'};
  const items=hpItems.filter(i=>canUse(b,i.id)).sort((a,z)=>healValue(z,p)-healValue(a,p));
  if(items[0])return {type:'item',itemId:items[0].id};
  if(canUse(b,'allheilmittel'))return {type:'item',itemId:'allheilmittel'};
 }
 if(mode==='normal')return {type:'attack'};
 const ready=isPlayerChargeReady(p),ultimateUsed=p.statuses.some(s=>s.id==='charge_ultimate_used');
 if(mode==='physical') {
  if(e.lionOpening&&ready&&p.sp>=100&&!ultimateUsed)return skill('drachen_fang');
  if(ready&&e.lionOpening)return skill('falcon_schnitt');
  // Preserve the ultimate's SP budget; use skills to charge and exploit openings.
  if((!ready||e.lionOpening)&&p.sp>=getSkill('power_strike').spCost+(ultimateUsed?0:100))return skill('power_strike');
  return {type:'attack'};
 }
 if(ready&&!p.statuses.some(s=>s.id==='charge_mana_amplification'))return skill('mana_amplification');
 if(ready&&e.lionOpening&&p.sp>=100&&!ultimateUsed)return skill('apocalypse');
 if(ready&&(e.lionOpening||ultimateUsed))return skill('tunguska');
 if(e.lionOpening&&affordable('fall_the_meteor'))return skill('fall_the_meteor');
 if(affordable('fireball'))return skill('fireball');
 if(canUse(b,'allheilmittel'))return {type:'item',itemId:'allheilmittel'};
 return {type:'attack'};
}
function simulate(build,seed) {
 let random=seed;const rng=()=>((random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296);
 let b=createBattleState({character:build.character,enemy:createBossCombatant('loewenkoenigin_b1f')}),turns=0;
 const metrics={normal:0,physicalSkill:0,spell:0,gemini:0,deathPoison:0,otherDot:0,counter:0,self:0,openingCreated:0,openingUsed:0,openingExtra:0};
 const phaseTurns={1:1},commands={},trace=[];
 while(!b.outcome&&turns<1000){
  const command=choice(b,build.mode),before=b.enemy.hp;
  const r=resolveBattleRound({battle:b,playerCommand:command,rng});assert.equal(r.accepted,true,`${build.id} ${JSON.stringify(command)} ${r.reason}`);
  b=r.battle;turns++;const key=command.itemId||command.skillId||command.type;commands[key]=(commands[key]||0)+1;
  phaseTurns[b.enemy.lionPhase||1]??=turns;
  let measured=0;
  for(const e of b.presentationEvents){
   if(e.lionOpeningCreated)metrics.openingCreated++;
   if(e.type==='lionOpeningEnded'&&e.used)metrics.openingUsed++;
   if(e.targetSide!=='enemy')continue;
   if(e.type==='attackHit'&&e.actorSide==='player'){
    const category=e.geminiCopy?'gemini':command.type==='attack'?'normal':e.actionType==='spell'?'spell':'physicalSkill';
    metrics[category]+=e.actualHpLoss;measured+=e.actualHpLoss;metrics.openingExtra+=e.lionOpeningExtraDamage;
   }else if(e.type==='poisonDamage'||e.type==='bleedingDamage'){
    metrics[e.message.includes('死毒')?'deathPoison':'otherDot']+=e.amount;measured+=e.amount;
   }else if(e.type==='leoHpCost'){metrics.self+=e.amount;measured+=e.amount;}

  }
  // Cancer presentation contains pre-overkill damage; isolate actual HP loss rather than
  // attributing it to player normal/skill damage. No NPC or untracked DOT is equipped.
  const residual=before-b.enemy.hp-measured;assert.ok(residual>=0,`negative damage ledger ${residual}`);if(residual)assert.ok(b.presentationEvents.some(e=>e.type==='cancerCounterDamage'));metrics.counter+=residual;
  if(seed===1)trace.push({turn:turns,command,playerHp:b.player.hp,sp:b.player.sp,enemyHp:b.enemy.hp,log:b.log});
 }
 const used=Object.fromEntries(Object.entries(build.character.inventory.counts).map(([id,n])=>[id,n-(b.player.inventory.counts[id]||0)]));
 const accounted=['normal','physicalSkill','spell','gemini','deathPoison','otherDot','counter','self'].reduce((n,key)=>n+metrics[key],0);
 assert.equal(accounted,100000-b.enemy.hp);
 return {seed,outcome:b.outcome||'limit',turns,enemyHp:b.enemy.hp,playerHp:b.player.hp,metrics,phaseTurns,used,pisces:Number(Boolean(b.piscesUsed)),commands,...(seed===1?{trace}:{})};
}
const count=Number(process.env.LION_SEEDS)||100;
const candidates=[[1,1,1],[2,3,4],[3,4,5],[3,5,6]],original=[...C.openingMultipliers],results=[];
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
try{
 for(const candidate of candidates){
  // Test process only. Restore shared tuning array in finally; source remains 3/4/5.
  C.openingMultipliers.splice(0,3,...candidate);
  for(const build of builds){
   const runs=Array.from({length:count},(_,i)=>simulate(build,i+1)),wins=runs.filter(r=>r.outcome==='victory');
   const summary={candidate,build:build.id,wins:wins.length,runs:count,turnMin:Math.min(...runs.map(r=>r.turns)),turnMax:Math.max(...runs.map(r=>r.turns)),meanTurns:mean(runs.map(r=>r.turns)),meanWinTurns:mean(wins.map(r=>r.turns)),meanItems:mean(runs.map(r=>Object.values(r.used).reduce((a,b)=>a+b,0))),piscesTotal:runs.reduce((a,r)=>a+r.pisces,0),meanMetrics:Object.fromEntries(Object.keys(runs[0].metrics).map(k=>[k,mean(runs.map(r=>r.metrics[k]))])),meanPhaseTurns:Object.fromEntries([2,3].map(p=>[p,mean(runs.map(r=>r.phaseTurns[p]).filter(Number.isFinite))]))};
   results.push({summary,setup:{deck:build.deck,job:build.job||'warrior',equipment:build.equipment||'same as level197 fixture',hp:build.character.hp,sp:build.character.sp,stats:collectStats(build.character)},runs});
   console.log(JSON.stringify(summary));
   await mkdir('artifacts/lion-opening',{recursive:true});await writeFile('artifacts/lion-opening/comparison.json',JSON.stringify({count,results},null,2));
  }
 }
}finally{C.openingMultipliers.splice(0,3,...original);}
