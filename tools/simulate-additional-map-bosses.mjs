import {writeFileSync} from 'node:fs';
import {NORMAL_KARTE_BOSSES,selectNormalMapBoss,createNormalMapBoss} from '../data/karte-normal-bosses.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {bossTestCharacter,bossTestCommand} from './simulate-map-bosses.mjs';
import {getItemCount,grantItem} from '../data/inventory.js';
import {f2Random} from './simulate-special-map-f2.mjs';
const rows=[];
for(let n=18;n<=24;n++)for(const level of [1,25,50,100])for(const job of ['warrior','thief','priest','mage']){
 const id=`karte_boss_${String(n).padStart(3,'0')}`,themeId=NORMAL_KARTE_BOSSES[id].themes[0];
 let input;for(let seed=0;seed<65536;seed++){input={seed,level,rarity:'WHITE',themeId};if(selectNormalMapBoss(input).id===id)break;}
 const trials=[];
 for(let i=0;i<5;i++){
  const c=bossTestCharacter(level,job);c.inventory=grantItem(c.inventory,'strong_herbicide',2).inventory;
  let b=createBattleState({character:c,enemy:createEnemyCombatant(createNormalMapBoss(input))}),turns=0;const rng=f2Random(i+1);
  while(!b.outcome&&turns<150){
   let command=bossTestCommand(b);
   if(b.player.battleSkillSealed&&command.type==='skill')command={type:'attack'};
   if(n===22&&b.enemy.hp>500&&getItemCount(b.player.inventory,'strong_herbicide')>0&&!b.enemy.regainSuppressedTurns)command={type:'item',itemId:'strong_herbicide'};
   if(n===23&&(job==='warrior'||job==='thief'||command.type==='attack')){b.outcome='escaped';break;}
   const result=resolveBattleRound({battle:b,playerCommand:command,rng});if(!result.accepted)throw Error(`${id} ${job}: ${result.reason}`);b=result.battle;turns++;
  }
  trials.push({outcome:b.outcome||'timeout',turns});
 }
 rows.push({id,level,job,seed:input.seed,wins:trials.filter(t=>t.outcome==='victory').length,defeats:trials.filter(t=>t.outcome==='defeat').length,escapes:trials.filter(t=>t.outcome==='escaped').length,timeouts:trials.filter(t=>t.outcome==='timeout').length,averageTurns:trials.reduce((s,t)=>s+t.turns,0)/5});
}
writeFileSync('artifacts/additional-bosses/pacing.json',JSON.stringify({trials:rows.length*5,fixture:'Existing bossTestCharacter: initial equipment Lv1, B60/B90 pacing equipment at higher levels (overgeared midlevel); no NPC; 20 strong potions + 2 herbicides; sealed actors use normal attacks; melee-only/exhausted whale actors choose escape. This is a smoke/pacing sample, not average-player balance validation.',rows},null,2)+'\n');
console.log(JSON.stringify({trials:rows.length*5,wins:rows.reduce((s,r)=>s+r.wins,0),defeats:rows.reduce((s,r)=>s+r.defeats,0),escapes:rows.reduce((s,r)=>s+r.escapes,0),timeouts:rows.reduce((s,r)=>s+r.timeouts,0),problemRows:rows.filter(r=>r.timeouts)}));
