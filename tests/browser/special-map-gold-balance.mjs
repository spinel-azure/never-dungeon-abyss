import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
import {bossTestCharacter,bossTestCommand} from '../../tools/simulate-map-bosses.mjs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173/tests/browser/special-map-themes.html');
 const cases=[60,80,100].flatMap(level=>['warrior','mage'].map(job=>({level,job,character:bossTestCharacter(level,job)})));
 const rows=await page.evaluate(async({cases,command})=>{
  const {createBattleState,resolveBattleRound}=await import('/combat/battle-engine.js');
  const {createEnemyCombatant}=await import('/data/enemies.js');
  const {createGoldMapBoss}=await import('/data/karte-gold-boss.js');
  const {getItemCount}=await import('/data/inventory.js');
  const {isPlayerChargeReady}=await import('/combat/player-charge.js');
  const {getSkill}=await import('/data/skills.js');const {getEffectiveSpCost}=await import('/combat/sp-cost.js');
  const choose=eval('('+command+')'),rows=[];
  for(const {level,job,character} of cases){const trials=[];
   for(let seed=1;seed<=20;seed++){
    let n=seed;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    let battle=createBattleState({character,enemy:createEnemyCombatant(createGoldMapBoss({themeId:'gold',level}))});
    let turns=0,heals=0,playerDamage=0,bossDamage=0;
    while(!battle.outcome&&turns<200){const cmd=choose(battle,{ultimates:true});if(cmd.type==='item')heals++;
     const r=resolveBattleRound({battle,playerCommand:cmd,rng});if(!r.accepted)throw Error(r.reason);battle=r.battle;turns++;
     for(const e of battle.presentationEvents||[])if(e.type==='attackHit'){if(e.targetSide==='player')playerDamage+=e.actualHpLoss||0;if(e.targetSide==='enemy')bossDamage+=e.actualHpLoss||0;}
    }
    trials.push({outcome:battle.outcome||'timeout',turns,heals,playerDamage,bossDamage});
   }
   const avg=k=>trials.reduce((n,r)=>n+r[k],0)/20;
   rows.push({level,job,wins:trials.filter(r=>r.outcome==='victory').length,averageTurns:avg('turns'),maxTurns:Math.max(...trials.map(r=>r.turns)),averageHeals:avg('heals'),averagePlayerDamage:avg('playerDamage'),averageBossDamage:avg('bossDamage')});
  }
  return rows;
 },{cases,command:bossTestCommand.toString()});
 console.table(rows);await writeFile(join(tmpdir(),'nda-gold-browser-balance.json'),JSON.stringify(rows,null,2));
}finally{await browser.close();}
