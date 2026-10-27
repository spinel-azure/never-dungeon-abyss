// Isolated process-local balance experiment. Production source files are never written.
import {registerHooks} from 'node:module';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const priestRework=process.argv.includes('--priest-rework');
const production=process.argv.includes('--production');
if(production)assert.ok(process.argv.includes('--probe'),'production comparison is probe-only');
if(process.argv.includes('--gentle-holy'))assert.ok(priestRework&&process.argv.includes('--progression'),'gentle-holy is a progression-only priest experiment');
const reduced=process.argv.includes('--reduced')||priestRework;
const candidate=process.argv.includes('--candidate')||reduced||production;
const powerStep=reduced?.25:.5;
const priestSuite=process.argv.includes('--priest-suite');
const variant=priestRework?'priest-rework':reduced?'reduced':candidate?'candidate':'baseline';
const replaceOnce=(source,from,to)=>{assert.equal(source.split(from).length,2,`Hook anchor changed: ${from}`);return source.replace(from,to);};
const hooks=[];
registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);
 if(!url.endsWith('/combat/battle-engine.js')&&!url.endsWith('/combat/sp-cost.js'))return result;
 let source=String(result.source);
 // Reproduce the pre-release baseline and archived candidates after production
 // adoption without multiplying the new production scaling a second time.
 if(!production&&url.endsWith('/combat/battle-engine.js')&&source.includes("  if (actorSide === 'player') action = preparePlayerSkillDamage(action, actor);"))
  source=replaceOnce(source,"  if (actorSide === 'player') action = preparePlayerSkillDamage(action, actor);",'');
 if(!production&&url.endsWith('/combat/sp-cost.js')&&source.includes(' * getSkillSpMultiplier(skill, character)'))
  source=replaceOnce(source,' * getSkillSpMultiplier(skill, character)','');
 if(url.endsWith('/combat/battle-engine.js')){
  if(priestRework&&!production)source=`import {getPhysicalReincarnationMultiplier as laboratoryPhysicalMultiplier} from '../data/reincarnation.js';\n`+source;
  source=replaceOnce(source,'  battle.player.sp -= cost;',`  battle.player.sp -= cost;
  battle.presentationEvents.push({type:'laboratorySpPaid',amount:cost});`);
  if(candidate&&!production)source=replaceOnce(source,'  const result = action.actionType === "spell"',`  const laboratorySkill = getSkill(action.id);
  if (actorSide === 'player' && laboratorySkill?.spCost > 0 && !laboratorySkill.chargeSkill
      && ['spell','physicalAttack'].includes(laboratorySkill.actionType)) {
    ${priestRework?`if(action.id === 'holy_light') action = {...action, intelligenceMultiplier:${process.argv.includes('--gentle-holy')?'1.5 + .5 * Math.min(3,Math.max(0,Number(actor.reincarnationCount)||0))':'3'}};
    if(action.id === 'holy_strike') action = {...action, powerPerHit:(Number(action.powerPerHit)||1)*laboratoryPhysicalMultiplier(actor.level,actor.reincarnationCount)};`:''}
    const factor = 1 + ${powerStep} * Math.min(3, Math.max(0, Number(actor.reincarnationCount) || 0));
    action = action.actionType === 'spell'
      ? {...action, powerMultiplier:(Number(action.powerMultiplier)||1)*factor}
      : {...action, powerPerHit:(Number(action.powerPerHit)||1)*factor};
  }
  const result = action.actionType === "spell"`);
 }else if(candidate&&!production){
  source=replaceOnce(source,'Math.floor(Number(skill?.spCost) || 0)',`Math.floor((Number(skill?.spCost) || 0) * (
    !skill.chargeSkill && ['physicalAttack','spell'].includes(skill.actionType)
    ? 1 + Math.min(3, Math.max(0, Number(character.reincarnationCount)||0)) : 1))`);
 }
 hooks.push(url);return {...result,source};
}});
if(process.argv.includes('--progression')){
 await import('./simulate-reincarnation-skill-progression.mjs');
 process.exit(0);
}
const {superbossCharacter}=await import('./simulate-goddess-superboss.mjs');
const {normalizeCharacter}=await import('../data/classes.js');
const {collectStats}=await import('../combat/collect-stats.js');
const {grantEquipmentInstance,equipInstance}=await import('../data/equipment-inventory.js');
const {getItemCount}=await import('../data/inventory.js');
const {createGoddessMapBoss}=await import('../data/karte-goddess-bosses.js');
const {getV2CombatEnemy}=await import('../data/special-map-enemies.js');
const {createEnemyCombatant}=await import('../data/enemies.js');
const {createBattleState,resolveBattleRound}=await import('../combat/battle-engine.js');
const {getEffectiveSpCost}=await import('../combat/sp-cost.js');
const {getSkill}=await import('../data/skills.js');
const {magicBarrierAmount}=await import('../combat/aquarius.js');
const {isPlayerChargeReady}=await import('../combat/player-charge.js');
const {f2Random}=await import('./simulate-special-map-f2.mjs');
assert.equal(hooks.length,2);
assert.equal(getEffectiveSpCost(getSkill('power_strike'),{reincarnationCount:3}),candidate?20:5);
assert.equal(getEffectiveSpCost(getSkill('apocalypse'),{reincarnationCount:3}),100);
assert.equal(getEffectiveSpCost(getSkill('fireball'),{reincarnationCount:3,statuses:[{id:'charge_mana_spring'}]}),0);

const configs=[...['warrior','thief','priest'].map(job=>({id:job,job})),
 {id:'mage',job:'mage'}, {id:'mage-spring',job:'mage',spring:true},
 {id:'mage-aquarius',job:'mage',aquarius:true}, {id:'mage-aquarius-spring',job:'mage',aquarius:true,spring:true},
 {id:'mage-nova-gemini-aquarius',job:'mage',aquarius:true,nova:true,gemini:true},
 {id:'mage-nova-gemini-aquarius-spring',job:'mage',aquarius:true,nova:true,gemini:true,spring:true}];
if(process.argv.includes('--reference'))configs.splice(0,configs.length,...['warrior','thief','priest','mage'].map(job=>({id:`${job}-normal`,job,normal:true})));
if(priestSuite)configs.splice(0,configs.length,...[false,true].flatMap(enhanced=>['holy_light','holy_strike','normal'].map(skill=>({id:`priest-${enhanced?'benedia-gemini-aquarius-':''}${skill}`,job:'priest',skill,normal:skill==='normal',aquarius:enhanced,gemini:enhanced,benedia:enhanced}))));
function character(config){
 let c=superbossCharacter(config.job);
 const series={warrior:'divinemight',thief:'shadowless',priest:'heavenprayer',mage:'polarstar'}[config.job];
 const deck=['sagittarius','libra','capricorn','taurus','pisces','cancer'];
 if(config.aquarius)deck[5]='aquarius';
 if(config.gemini)deck[3]='gemini';
 const ids=deck.map(id=>'zodiac_'+id);
 c=normalizeCharacter({...c,engravingStatBonuses:{},cards:{ownedCardCounts:Object.fromEntries(ids.map(id=>[id,1])),deckSlots:ids}});
 for(const slot of ['rightArmId',...(config.job==='mage'?[]:['leftArmId']),'headId','bodyId','footId']){
  const id=slot==='rightArmId'?(config.nova?'katzennova':config.benedia?'katzenbenedia':`reinc_${series}_weapon`):`reinc_${series}_${slot.replace('Id','')}`;
  const g=grantEquipmentInstance(c,id,slot,{enhancement:3});assert.ok(g.accepted,`${id} grant`);
  const e=equipInstance(g.character,slot,g.instance.instanceId);assert.ok(e.accepted,`${id} equip: ${e.reason}`);c=e.character;
 }
 c=normalizeCharacter(c);
 const stats=collectStats(c);
 c=normalizeCharacter({...c,engravingStatBonuses:Object.fromEntries(['str','int','agi','dex','luc'].map(k=>[k,Math.max(0,90-stats[k])]))});
 c.hp=c.maxHp;c.sp=c.maxSp;
 for(const stat of ['str','int','agi','dex','luc'])assert.equal(collectStats(c)[stat],90);
 return c;
}
const active=(b,id)=>b.player.statuses.some(s=>(s.id||s.statusId)===id&&s.active!==false);
function command(b,config){
 const r=b.enemy.goddessRuntime||{};
 if(b.enemy.reservedEnemyAction||b.enemy.goddessTheme==='dusk'&&r.moon===3)return {type:'guard'};
 if(b.player.hp<b.player.maxHp*(r.healPreparation?.remaining>0?.35:.60)&&getItemCount(b.player.inventory,'strong_healing_potion_large'))return {type:'item',itemId:'strong_healing_potion_large'};
 if(b.player.battleSkillSealed)return {type:'attack'};
 const ultimate={warrior:'drachen_fang',thief:'acht_streich',priest:'call_goddess_name',mage:'apocalypse'}[config.job];
 const charge={warrior:'falcon_schnitt',thief:'twin_rapid_strike',priest:'twilight_flash',mage:'tunguska'}[config.job];
 if(isPlayerChargeReady(b.player)){
  if(!active(b,'charge_ultimate_used')&&b.player.sp>=getEffectiveSpCost(getSkill(ultimate),b.player))return {type:'skill',skillId:ultimate};
  if(config.spring&&!active(b,'charge_mana_spring')&&magicBarrierAmount(b.player)<=0)return {type:'skill',skillId:'mana_spring'};
  return {type:'skill',skillId:charge};
 }
 if(config.normal)return {type:'attack'};
 const choices=config.skill?[config.skill]:{warrior:['power_strike'],thief:['gale_blades'],priest:['holy_light','holy_strike'],mage:['fireball']}[config.job];
 for(const id of choices){
  const s=getSkill(id);if(!s||!b.player.skillIds.includes(id))continue;
  if(s.element&&(b.enemy.elementMultipliers?.[s.element]??1)<=0)continue;
  if(getEffectiveSpCost(s,b.player)<=b.player.sp)return {type:'skill',skillId:id};
 }
 return {type:'attack'};
}
const enemies=['poison_slime','amethyst_golem','sensenmann'].map(id=>{
 const enemy=getV2CombatEnemy(id,100);assert.ok(enemy,`Unknown enemy ${id}`);return {id,enemy};
});
for(const theme of ['rice','dusk','tender'])enemies.push({id:theme,enemy:createGoddessMapBoss({themeId:theme,level:100})});
function run(c,config,enemy,seed){
 let b=createBattleState({character:structuredClone(c),enemy:createEnemyCombatant(enemy)});
 const rng=f2Random(seed),row={turns:0,spPaid:0,springCommands:0,springAttackCommands:0,barrierAttackCommands:0,actions:{}};
 while(!b.outcome&&row.turns<500){
  const cmd=command(b,config),id=cmd.skillId||cmd.type;
  row.actions[id]=(row.actions[id]||0)+1;
  if(id==='mana_spring')row.springCommands++;
  if(cmd.type==='skill'&&getSkill(id)?.category==='attackSpell'&&!getSkill(id).chargeSkill){
   if(active(b,'charge_mana_spring'))row.springAttackCommands++;
   if(magicBarrierAmount(b.player)>0)row.barrierAttackCommands++;
  }
  const result=resolveBattleRound({battle:b,playerCommand:cmd,rng});assert.ok(result.accepted,`${config.id}: ${result.reason}`);
  b=result.battle;row.turns++;
  for(const event of b.presentationEvents||[])if(event.type==='laboratorySpPaid')row.spPaid+=event.amount;
 }
 return {...row,outcome:b.outcome||'timeout',items:30-getItemCount(b.player.inventory,'strong_healing_potion_large'),spEnd:b.player.sp,enemyHp:b.enemy.hp,piscesUsed:b.piscesUsed};
}
if(process.argv.includes('--probe')){
 const probes=[];
 for(const config of configs.slice(0,4)){
  const c=character(config);
  const skill={warrior:'power_strike',thief:'gale_blades',priest:'holy_light',mage:'fireball'}[config.job];
  const charge={warrior:'falcon_schnitt',thief:'twin_rapid_strike',priest:'twilight_flash',mage:'tunguska'}[config.job];
  for(const id of ['attack',skill,...(config.job==='priest'?['holy_strike']:[]),charge]){
   c.playerCharge={value:100,cooldown:0};
   const enemy={id:'probe',name:'probe',hp:1000000,maxHp:1000000,str:10,int:10,agi:10,dex:10,luc:10,def:0,attack:10,alive:true,statuses:[],isBoss:true,instantDeathImmune:true};
   const b=createBattleState({character:structuredClone(c),enemy});
   const result=resolveBattleRound({battle:b,playerCommand:id==='attack'?{type:'attack'}:{type:'skill',skillId:id},rng:f2Random(42)});
   assert.ok(result.accepted,result.reason);
   const events=result.battle.presentationEvents||[];
   probes.push({job:config.job,id,cost:events.filter(e=>e.type==='laboratorySpPaid').reduce((n,e)=>n+e.amount,0),damage:events.filter(e=>e.type==='attackHit'&&e.actorSide==='player').reduce((n,e)=>n+e.damage,0),enemyDamage:events.filter(e=>e.type==='attackHit'&&e.actorSide==='enemy').reduce((n,e)=>n+e.damage,0)});
  }
 }
 console.log(JSON.stringify(probes));process.exit(0);
}
const trials=Number(process.env.NDA_TRIALS||30),characters=[],rows=[];
const mean=(runs,key)=>runs.length?+(runs.reduce((s,r)=>s+r[key],0)/runs.length).toFixed(2):null;
for(const config of configs){
 const c=character(config);characters.push({...config,maxHp:c.maxHp,maxSp:c.maxSp,stats:collectStats(c),equipment:c.equipment,deck:c.cards.deckSlots,engravings:c.engravingStatBonuses});
 for(const {id,enemy} of enemies){
  const runs=Array.from({length:trials},(_,i)=>({seed:i+1,...run(c,config,enemy,i+1)})),wins=runs.filter(r=>r.outcome==='victory');
  const summarize=rs=>Object.fromEntries(['turns','spPaid','items','spEnd','springCommands','springAttackCommands','barrierAttackCommands'].map(k=>[k,mean(rs,k)]));
  rows.push({config:config.id,enemy:id,wins:wins.length,trials,all:summarize(runs),victories:summarize(wins),runs});
 }
 console.log(config.id,rows.filter(r=>r.config===config.id).map(r=>`${r.enemy} ${r.wins}/${trials} T${r.victories.turns} SP${r.victories.spPaid}`).join(' | '));
}
writeFileSync(`artifacts/reincarnation-skill-${process.argv.includes('--reference')?'normal-reference':variant}${priestSuite?'-priest-suite':''}-battles.json`,JSON.stringify({candidate,variant,priestRework,trials,conditions:{reincarnation:3,level:197,trainedPrimaryStats:90,defense:'actual equipment and card calculation',potions:30,chargeStart:0,npc:false,device:false,limit:500,costMultiplier:candidate?4:1,powerMultiplier:candidate?1+3*powerStep:1,priestFormula:priestRework?'holy_light INT coefficient3 (was0.5); holy_strike also uses existing physical level/reincarnation multiplier; general power multiplier applies once':'unchanged',policy:'Forecast guard; potion below60%, Zelena preparation35%; ultimate then charge; spring replaces charge only when barrier absent and spring inactive; power_strike/gale_blades/holy_light/fireball preferred, or specified suite skill. Reference uses normal attacks instead of paid skills. Full HP/SP reset EACH battle. No SP potions.'},characters,enemies:enemies.map(({id,enemy})=>({id,name:enemy.name,definition:enemy})),rows},null,2)+'\n');
