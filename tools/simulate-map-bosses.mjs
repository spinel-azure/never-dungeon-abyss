import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createNormalMapBoss} from '../data/karte-normal-bosses.js';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {grantItem,getItemCount} from '../data/inventory.js';
import {isPlayerChargeReady} from '../combat/player-charge.js';
import {getSkill} from '../data/skills.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {f2Random} from './simulate-special-map-f2.mjs';
export function bossTestCharacter(level,job='warrior'){
 let c=level<=10?normalizeCharacter({...createInitialCharacter({name:'BOSS QA',job}),level}):createPacingCharacter({job,level,band:level>=80?'B90':'B60',withNpcs:false});
 c.inventory=grantItem(c.inventory,'strong_healing_potion_small',20).inventory;
 c.hp=c.maxHp;c.sp=c.maxSp;return c;
}
export function bossTestCommand(b,{ultimates=false}={}){
 if(b.player.hp<b.player.maxHp*.45&&getItemCount(b.player.inventory,'strong_healing_potion_small')>0)return {type:'item',itemId:'strong_healing_potion_small'};
 const charge={warrior:'falcon_schnitt',thief:'twin_rapid_strike',priest:'twilight_flash',mage:'tunguska'}[b.player.job];
 const ultimate={warrior:'drachen_fang',thief:'acht_streich',priest:'call_goddess_name',mage:'apocalypse'}[b.player.job];
 if(ultimates&&isPlayerChargeReady(b.player)&&b.player.sp>=100&&b.player.skillIds.includes(ultimate)&&!b.player.statuses.some(s=>(s.id||s.statusId)==='charge_ultimate_used'))return {type:'skill',skillId:ultimate};
 if(isPlayerChargeReady(b.player)&&b.player.skillIds.includes(charge))return {type:'skill',skillId:charge};
 const choices={warrior:['crushing_break','power_strike'],thief:['gale_blades'],priest:['holy_light','holy_strike'],mage:['lightning_bolt','fireball']}[b.player.job]||[];
 for(const id of choices){const s=getSkill(id);if(b.player.skillIds.includes(id)&&getEffectiveSpCost(s,b.player)<=b.player.sp)return {type:'skill',skillId:id};}
 return {type:'attack'};
}
export function runBossTrial(input,job,seed,options){
 const boss=createNormalMapBoss(input),c=bossTestCharacter(input.level,job);
 let b=createBattleState({character:c,enemy:createEnemyCombatant(boss)}),turns=0,damageTaken=0,damageDealt=0;const rng=f2Random(seed);
 while(!b.outcome&&turns<100){
  const result=resolveBattleRound({battle:b,playerCommand:bossTestCommand(b,options),rng});if(!result.accepted)throw Error(result.reason);b=result.battle;turns++;
  for(const e of b.presentationEvents||[])if(e.type==='attackHit'){if(e.targetSide==='player')damageTaken+=e.actualHpLoss||0;if(e.targetSide==='enemy')damageDealt+=e.actualHpLoss||0;}
 }
 return {outcome:b.outcome||'timeout',turns,damageTaken,damageDealt,bossId:boss.id};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=[];for(const level of [1,5,25,50,80,100])for(const job of ['warrior','thief','priest','mage']){
  const trials=Array.from({length:20},(_,i)=>runBossTrial({seed:i,level,rarity:'WHITE',themeId:'crystal'},job,i+1));
  rows.push({level,job,wins:trials.filter(r=>r.outcome==='victory').length,trials:trials.length,averageTurns:trials.reduce((n,r)=>n+r.turns,0)/20,maxTurns:Math.max(...trials.map(r=>r.turns)),averageDamageTaken:trials.reduce((n,r)=>n+r.damageTaken,0)/20,averageDamageDealt:trials.reduce((n,r)=>n+r.damageDealt,0)/20,timeouts:trials.filter(r=>r.outcome==='timeout').length});
 }
 const ultimateRows=[];for(const level of [80,100])for(const job of ['warrior','thief','priest','mage']){
  const trials=Array.from({length:20},(_,i)=>runBossTrial({seed:i,level,rarity:'WHITE',themeId:'crystal'},job,i+1,{ultimates:true}));
  ultimateRows.push({level,job,wins:trials.filter(r=>r.outcome==='victory').length,trials:20,averageTurns:trials.reduce((n,r)=>n+r.turns,0)/20,maxTurns:Math.max(...trials.map(r=>r.turns))});
 }
 writeFileSync('artifacts/special-map-boss-pacing.json',JSON.stringify({fixture:'Lv1/5 initial gear; Lv25/50 B60 pacing gear+3; Lv80/100 B90 pacing gear+3; no NPC; 20 strong healing potions; learned skills only, charge skills enabled. rows exclude ultimate skills; ultimateRows use the already learned Lv80 ultimate once when ready. Mid-level fixture is overgeared and is not an average player claim.',rows,ultimateRows},null,2)+'\n');console.table(rows);console.table(ultimateRows);
}


