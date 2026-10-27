// Invoke via compare-reincarnation-skill-candidate.mjs --progression [--priest-rework].
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createInitialCharacter,normalizeCharacter,getCharacterClass} from '../data/classes.js';
import {getSkill,getLevelUnlockedSkillIds} from '../data/skills.js';
import {collectStats} from '../combat/collect-stats.js';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {getEnemyById,createEnemyCombatant} from '../data/enemies.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';
import {grantItem,getItemCount} from '../data/inventory.js';
import {f2Random} from './simulate-special-map-f2.mjs';
const candidate=process.argv.includes('--priest-rework');
const gentle=process.argv.includes('--gentle-holy');
const earlyOnly=process.argv.includes('--early-priest-only');
const goddessOnly=process.argv.includes('--goddess-priest-only');
assert.ok(!(earlyOnly&&goddessOnly));
assert.ok(!gentle||candidate);
assert.ok(process.argv.includes('--progression'),'Use the comparison driver');
for(let n=0;n<=3;n++)assert.equal(getEffectiveSpCost(getSkill('power_strike'),{reincarnationCount:n}),5*(candidate?n+1:1));
const samples=30,series={warrior:['obsidian','dragonbone'],thief:['nightcrow','phantomshade'],priest:['dawn','sacredradiance'],mage:['eveningstar','firmament']};
const stages=[...[1,10,33,34].map(level=>({kind:'fresh',n:0,level})),{kind:'trained-early',n:0,level:34},...[0,1,2].map(n=>({kind:'complete',n,level:197})),...[1,2,3].flatMap(n=>[1,10,34].map(level=>({kind:'restart',n,level})))];
function equip(c,id,slot,enhancement){const g=grantEquipmentInstance(c,id,slot,{enhancement});assert.ok(g.accepted,id);const e=equipInstance(g.character,slot,g.instance.instanceId);assert.ok(e.accepted,id+': '+e.reason);return e.character;}
function make(s,job){
 const init=createInitialCharacter({name:'Progression QA',job});
 let c=s.kind==='fresh'||s.kind==='trained-early'?init:createPacingCharacter({job,level:197,band:'B90',withNpcs:false});
 c=normalizeCharacter({...c,level:s.level,reincarnationCount:s.n,engravingStatBonuses:{},cards:init.cards,skillIds:[...getCharacterClass(job).initialSkillIds,...getLevelUnlockedSkillIds(job,s.level)],statuses:[],playerCharge:{value:0,cooldown:0},inventory:{counts:{}}});
 const tier=s.kind==='restart'?s.n-1:s.kind==='complete'?s.n:0;
 if(tier>0){
  const set=series[job][tier-1];
  for(const slot of ['rightArmId',...(job==='mage'?[]:['leftArmId']),'headId','bodyId','footId'])c=equip(c,`reinc_${set}_${slot==='rightArmId'?'weapon':slot.replace('Id','')}`,slot,3);
 }else if((s.kind==='fresh'||s.kind==='trained-early')&&s.level>=33)c=equip(c,{warrior:'iron_longsword',thief:'iron_dagger',priest:'iron_mace',mage:'oak_staff'}[job],'rightArmId',0);
 if(s.kind==='complete'||s.kind==='restart'){
  const deck=['sagittarius','libra','capricorn','taurus','pisces','cancer'].map(x=>'zodiac_'+x);
  c=normalizeCharacter({...c,cards:{deckSlots:deck,ownedCardCounts:Object.fromEntries(deck.map(x=>[x,1]))}});
 }
 // Retain prior-life trained BASE abilities at restart, not newly capped abilities.
 if(s.kind!=='fresh'){
  const cap=30+20*(s.kind==='restart'?s.n-1:s.n);
  c=normalizeCharacter({...c,engravingStatBonuses:Object.fromEntries(['str','int','agi','dex','luc'].map(k=>[k,Math.max(0,cap-c.baseStats[k])]))});
 }
 c=normalizeCharacter(c);
 const potions=s.kind==='complete'||s.kind==='restart'?30:0;
 if(potions)c.inventory=grantItem(c.inventory,'strong_healing_potion_large',potions).inventory;
 c.hp=c.maxHp;c.sp=c.maxSp;
 assert.ok(s.level>=34||!c.skillIds.includes('holy_light'));
 return c;
}
function enemies(s){
 const ids=s.kind==='complete'?['amethyst_golem','sensenmann']:s.kind==='restart'?['abyss_rat','banshee','amethyst_golem']:s.level===1?['abyss_rat','cave_slime','wandering_dead']:s.level===10?['abyss_rat','poison_slime','viper']:['viper','banshee','fire_lizard'];
 const out=ids.map(id=>({id,enemy:getEnemyById(id)}));
 if(s.kind==='complete'&&s.n>0)for(const theme of ['rice','dusk','tender'])out.push({id:theme,enemy:createGoddessMapBoss({themeId:theme,level:100})});
 return out;
}
function policies(c){return ['normal',...(c.job==='priest'?['holy_strike',...(c.skillIds.includes('holy_light')?['holy_light']:[])]:[c.job==='warrior'?'power_strike':c.job==='mage'?'fireball':c.skillIds.includes('gale_blades')?'gale_blades':'quick_strike'])];}
function command(b,policy){
 const p=b.player,r=b.enemy.goddessRuntime||{};
 if(b.enemy.reservedEnemyAction||b.enemy.goddessTheme==='dusk'&&r.moon===3)return {type:'guard'};
 if(p.hp<p.maxHp*(r.healPreparation?.remaining>0?.35:.6)&&getItemCount(p.inventory,'strong_healing_potion_large'))return {type:'item',itemId:'strong_healing_potion_large'};
 const ultimate={warrior:'drachen_fang',thief:'acht_streich',priest:'call_goddess_name',mage:'apocalypse'}[p.job];
 const charge={warrior:'falcon_schnitt',thief:'twin_rapid_strike',priest:'twilight_flash',mage:'tunguska'}[p.job];
 if(!p.battleSkillSealed&&isPlayerChargeReady(p)){
  if(p.skillIds.includes(ultimate)&&!p.statuses.some(s=>(s.id||s.statusId)==='charge_ultimate_used')&&p.sp>=getEffectiveSpCost(getSkill(ultimate),p))return {type:'skill',skillId:ultimate};
  if(p.skillIds.includes(charge))return {type:'skill',skillId:charge};
 }
 if(policy!=='normal'&&!p.battleSkillSealed&&p.skillIds.includes(policy)&&p.sp>=getEffectiveSpCost(getSkill(policy),p))return {type:'skill',skillId:policy};
 return {type:'attack'};
}
function run(c,enemy,policy,seed){
 let b=createBattleState({character:structuredClone(c),enemy:createEnemyCombatant(enemy)}),turns=0,spPaid=0,skillCommands=0;
 const rng=f2Random(seed),initialItems=getItemCount(c.inventory,'strong_healing_potion_large');
 while(!b.outcome&&turns<500){
  const cmd=command(b,policy);if(cmd.type==='skill'){assert.ok(c.skillIds.includes(cmd.skillId));skillCommands++;}
  const result=resolveBattleRound({battle:b,playerCommand:cmd,rng});assert.ok(result.accepted,result.reason);b=result.battle;turns++;
  for(const event of b.presentationEvents||[])if(event.type==='laboratorySpPaid')spPaid+=event.amount;
 }
 return {seed,outcome:b.outcome||'timeout',turns,spPaid,spEnd:b.player.sp,items:initialItems-getItemCount(b.player.inventory,'strong_healing_potion_large'),skillCommands};
}
function probe(c,policy){
 const damages=[];
 for(let seed=1;seed<=samples;seed++){
  const b=createBattleState({character:structuredClone(c),enemy:{id:'neutral',name:'neutral',hp:1000000,maxHp:1000000,str:1,int:1,dex:1,agi:1,luc:1,def:0,attack:0,statuses:[],alive:true,isBoss:false,instantDeathImmune:true}});
  const result=resolveBattleRound({battle:b,playerCommand:policy==='normal'?{type:'attack'}:{type:'skill',skillId:policy},rng:f2Random(seed)});assert.ok(result.accepted,result.reason);
  damages.push((result.battle.presentationEvents||[]).filter(e=>e.type==='attackHit'&&e.actorSide==='player').reduce((n,e)=>n+e.damage,0));
 }
 return {damage:damages.reduce((a,b)=>a+b,0)/samples,cost:policy==='normal'?0:getEffectiveSpCost(getSkill(policy),c),samples};
}
const rows=[],characters=[],probes=[];
const means=rs=>Object.fromEntries(['turns','spPaid','spEnd','items'].map(k=>[k,rs.length?+(rs.reduce((n,r)=>n+r[k],0)/rs.length).toFixed(2):null]));
for(const s of stages){
 if(goddessOnly&&!(s.kind==='complete'&&s.n>0))continue;
 if(earlyOnly&&!(s.level===34&&s.kind!=='complete'))continue;
 for(const job of ['warrior','thief','priest','mage']){
  if((earlyOnly||goddessOnly)&&job!=='priest')continue;
  const c=make(s,job),id=`${s.kind}-${s.n}-${s.level}-${job}`;
  characters.push({id,...s,job,hp:c.maxHp,sp:c.maxSp,stats:collectStats(c),engravings:c.engravingStatBonuses,equipment:c.equipment,deck:c.cards.deckSlots,skills:c.skillIds});
  for(const policy of policies(c)){
   probes.push({id,policy,...probe(c,policy)});
   for(const target of enemies(s)){
    if(goddessOnly&&!['rice','dusk','tender'].includes(target.id))continue;
    assert.ok(target.enemy,target.id);
    const runs=Array.from({length:samples},(_,i)=>run(c,target.enemy,policy,i+1)),wins=runs.filter(r=>r.outcome==='victory');
    rows.push({id,...s,job,policy,enemy:target.id,wins:wins.length,samples,all:means(runs),victories:means(wins),runs});
   }
  }
 }
 console.log(s.kind,s.n,s.level,'done');
}
writeFileSync(`artifacts/reincarnation-skill-progression-${gentle?'gentle-holy':candidate?'candidate':'baseline'}${earlyOnly?'-early':goddessOnly?'-goddesses':''}.json`,JSON.stringify({candidate,gentle,earlyOnly,goddessOnly,samples,conditions:'Driver hooks; candidate cost1/2/3/4, extra power1/1.25/1.5/1.75 plus priest rework; gentle variant uses holy_light INT1.5/2/2.5/3 instead of fixed3. Fresh: no engravings/cards, initial armor; iron/oak weapon at33+. Trained-early: same equipment with base abilities30. Restart: prior-tier gear+3, prior-life base stat cap engravings and C deck retained, learned skills reset to current level. Complete: current-tier gear and base ability caps, C deck. No NPC/device. Full resources each battle; 500 turn limit. Potions30 only restart/complete. Early normal/paid actions, high charge/ultimate only when learned; no low charge buffs or healing miracles. Probes:30 fresh neutral DEF0 battles, no element/race weakness.',characters,probes,rows},null,2)+'\n');
console.log('rows',rows.length,'battles',rows.length*samples,'probes',probes.length*samples);
