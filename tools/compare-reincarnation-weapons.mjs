import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {superbossCharacter,superbossTrial} from './simulate-goddess-superboss.mjs';
import {bossTestCommand} from './simulate-map-bosses.mjs';
import {REINCARNATION_ARMOR as armor} from '../data/reincarnation-armor.js';
import {REINCARNATION_WEAPONS as common} from '../data/reincarnation-weapons.js';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {normalizeCharacter} from '../data/classes.js';
import {getItemCount} from '../data/inventory.js';
import {collectStats} from '../combat/collect-stats.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {resolveHealing} from '../combat/resolve-healing.js';
import {getSkill} from '../data/skills.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';

const trials=Number(process.env.NDA_TRIALS||10),rows=[],duels=[],characters=[];
function put(c,id,slot='rightArmId'){
 const owned=c.equipmentInventory.instances.find(x=>x.equipmentId===id);
 const g=owned?{accepted:true,character:c,instance:owned}:grantEquipmentInstance(c,id,slot,{enhancement:3});assert.ok(g.accepted,g.reason);
 const e=equipInstance(g.character,slot,g.instance.instanceId);assert.ok(e.accepted,e.reason);return normalizeCharacter(e.character);
}
function policy(b){
 if(b.enemy.reservedEnemyAction||b.enemy.goddessTheme==='dusk'&&b.enemy.goddessRuntime?.moon===3)return {type:'guard'};
 if(b.player.hp<b.player.maxHp*.60){
  if(b.player.job==='priest'&&!b.player.battleSkillSealed&&b.player.sp>=getEffectiveSpCost(getSkill('maximal_triage'),b.player))return {type:'skill',skillId:'maximal_triage'};
  if(getItemCount(b.player.inventory,'strong_healing_potion_large'))return {type:'item',itemId:'strong_healing_potion_large'};
 }
 return bossTestCommand(b,{ultimates:true});
}
for(const [job,series,old,final] of [['warrior','divinemight','katzbalger','katzregalia'],['thief','shadowless','katzendolch','katzreaper'],['priest','heavenprayer','katzenkolben','katzenbenedia'],['mage','polarstar','katzenstab','katzennova']]){
 let base=superbossCharacter(job);
 // Identical permanent stats, engravings, armor and deck for every weapon in a job.
 for(const a of Object.values(armor).filter(a=>a.seriesId===series&&!(job==='mage'&&a.slot==='leftArmId')))base=put(base,a.id,a.slot);
 const ids=[old,...Object.values(common).filter(w=>w.allowedJobs[0]===job).map(w=>w.id),final];
 for(const id of ids){
  const c=put(structuredClone(base),id);c.hp=c.maxHp;c.sp=c.maxSp;
  assert.ok(!c.temporaryStatBonuses?.def);
  characters.push({job,id,hp:c.maxHp,sp:c.maxSp,stats:collectStats(c),engravings:c.engravingStatBonuses,equipment:c.equipment,deck:c.cards.deckSlots});
  const skills={warrior:['power_strike','crushing_break','drachen_fang'],thief:['quick_strike','gale_blades','acht_streich'],priest:['holy_strike','holy_light','call_goddess_name'],mage:['fireball','lightning_bolt','apocalypse']}[job];
  for(const def of [10,150])for(const skill of ['normal',...skills]){
   const enemy={id:'comparison',name:'比較対象',hp:10000000,maxHp:10000000,sp:0,maxSp:0,attack:1,def,stats:{str:1,int:1,agi:1,dex:1,luc:1},statuses:[],alive:true,actions:[{weight:1,action:{id:'wait',actionType:'wait',speedModifier:-999}}]};
   const b=createBattleState({character:c,enemy});b.player.playerCharge={value:100,cooldown:0};
   const r=resolveBattleRound({battle:b,playerCommand:skill==='normal'?{type:'attack'}:{type:'skill',skillId:skill},rng:()=>.5});assert.ok(r.accepted,`${job}/${skill}: ${r.reason}`);
   const hits=r.battle.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player'&&e.targetSide==='enemy');
   rows.push({job,id,def,skill,hits:hits.map(h=>h.damage),total:hits.reduce((s,h)=>s+h.damage,0),spSpent:c.sp-r.battle.player.sp,healing:job==='priest'?resolveHealing({caster:collectStats(c),target:{...c,hp:0},healing:getSkill('healing_prayer')}).calculatedHealing:null});
  }
  if(![old,`reinc_${series}_weapon`,final].includes(id))continue;
  for(const theme of ['rice','dusk','tender']){
   const runs=Array.from({length:trials},(_,i)=>superbossTrial({theme,job,seed:i+1,character:c,defense90:false,commandPolicy:policy})),wins=runs.filter(r=>r.outcome==='victory');
   const avg=(rs,k)=>rs.length?Number((rs.reduce((s,r)=>s+r[k],0)/rs.length).toFixed(2)):null;
   const row={job,id,theme,trials,wins:wins.length,winTurns:avg(wins,'turns'),allTurns:avg(runs,'turns'),potions:avg(runs,'items'),remainingHp:avg(runs,'playerHp'),remainingSp:avg(runs,'playerSp'),winHp:avg(wins,'playerHp'),winSp:avg(wins,'playerSp'),timeouts:runs.filter(r=>r.outcome==='timeout').length};duels.push(row);console.log(JSON.stringify(row));
  }
 }
}
const output=process.env.NDA_REPORT||path.join(tmpdir(),'nda-reincarnation-weapons-comparison.json');
writeFileSync(output,JSON.stringify({trials,policy:'Lv197/reinc3; same armor/engraving/deck; no NPC; 30 large potions; telegraph guard; below60% priest maximal_triage else potion; bossTestCommand ultimates/charge/main skills; seeds1..N; no experimental DEF override. Single-command rows RNG=.5, no critical/miss/recast, actual rounding and Z/armor effects retained.',characters,rows,duels},null,2));console.log(output);
