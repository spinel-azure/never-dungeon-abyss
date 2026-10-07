import {writeFileSync} from 'node:fs';
import {createGoldMapBoss} from '../data/karte-gold-boss.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {bossTestCharacter,bossTestCommand} from './simulate-map-bosses.mjs';
import {f2Random} from './simulate-special-map-f2.mjs';
const stats=[60,70,80,90,100].map(level=>{const b=createGoldMapBoss({themeId:'gold',level});return {level,hp:b.maxHp,sp:b.maxSp,...b.stats,def:b.def,attack:b.attack,exp:b.experienceReward,gold:b.dropGold};});
const rows=[];
for(const level of [60,80,100])for(const job of ['warrior','mage']){
 const trials=[];
 for(let seed=1;seed<=20;seed++){
  let battle=createBattleState({character:bossTestCharacter(level,job),enemy:createEnemyCombatant(createGoldMapBoss({themeId:'gold',level}))});
  let turns=0,heals=0,playerDamage=0,bossDamage=0;const rng=f2Random(seed);
  while(!battle.outcome&&turns<200){const command=bossTestCommand(battle,{ultimates:true});if(command.type==='item')heals++;
   const r=resolveBattleRound({battle,playerCommand:command,rng});if(!r.accepted)throw Error(r.reason);battle=r.battle;turns++;
   for(const e of battle.presentationEvents||[])if(e.type==='attackHit'){if(e.targetSide==='player')playerDamage+=e.actualHpLoss||0;if(e.targetSide==='enemy')bossDamage+=e.actualHpLoss||0;}
  }
  trials.push({outcome:battle.outcome||'timeout',turns,heals,playerDamage,bossDamage});
 }
 const avg=k=>trials.reduce((a,r)=>a+r[k],0)/trials.length;
 rows.push({level,job,trials:20,wins:trials.filter(r=>r.outcome==='victory').length,timeouts:trials.filter(r=>r.outcome==='timeout').length,averageTurns:avg('turns'),maxTurns:Math.max(...trials.map(t=>t.turns)),averageHeals:avg('heals'),averagePlayerDamage:avg('playerDamage'),averageBossDamage:avg('bossDamage'),firstTurnDefeats:trials.filter(r=>r.outcome==='defeat'&&r.turns===1).length});
}
writeFileSync('artifacts/special-map-gold-boss-pacing.json',JSON.stringify({fixture:'Actual battle engine; existing B60/B90 pacing equipment +3; solo warrior/mage, 40 healing potions (20 inherited plus 20 added), learned charge/ultimate skills, 20 deterministic RNG trials each; no inflated stats.',stats,rows},null,2)+'\n');console.table(stats);console.table(rows);
