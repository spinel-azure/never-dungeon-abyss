import {createHash} from 'node:crypto';import {writeFileSync} from 'node:fs';
import {selectNormalMapBoss,createNormalMapBoss,NORMAL_KARTE_BOSSES} from '../data/karte-normal-bosses.js';
import {describeV2MapName} from '../data/special-map-names-v2.js';
const counts={},hash=createHash('sha256'),failures={missing:0,special:0,theme:0,repeat:0},examples={},levels=[1,5,10,25,50,60,80,90,100];let cases=0;
for(const level of levels)for(const rarity of ['WHITE','SILVER','GOLD'])for(let seed=0;seed<65536;seed++){
 const themeId=describeV2MapName({rulesetVersion:'special-map-v2',seed,level,rarity}).themeId,input={seed,level,rarity,themeId};
 const boss=selectNormalMapBoss(input);cases++;
 if(!boss)failures.missing++;else{
  if(!NORMAL_KARTE_BOSSES[boss.id])failures.special++;
  if(!boss.themes.includes(themeId))failures.theme++;
  if(selectNormalMapBoss({...input,discovererName:'別人'}).id!==boss.id)failures.repeat++;
  const table=counts[themeId]??={};table[boss.id]=(table[boss.id]||0)+1;
  examples[boss.id]??=input;hash.update(`${level}|${rarity}|${seed}|${themeId}|${boss.id}\n`);
 }
}
const stats=[];
for(const level of [1,25,50,75,100])for(const id of Object.keys(NORMAL_KARTE_BOSSES)){
 const themeId=NORMAL_KARTE_BOSSES[id].themes[0];let boss;
 for(let seed=0;seed<65536;seed++){const b=createNormalMapBoss({seed,level,rarity:'WHITE',themeId});if(b.id===id){boss=b;break;}}
 if(!boss)throw Error('unreachable boss');
 const row={id,level,hp:boss.maxHp,attack:boss.attack,...boss.stats,def:boss.def,exp:boss.experienceReward,gold:boss.dropGold};
 if(Object.entries(row).some(([k,v])=>k!=='id'&&(!Number.isInteger(v)||v<=0||v>20000)))throw Error('invalid stats');stats.push(row);
}
const report={candidate:'F3-A Candidate 1',levels,rarities:['WHITE','SILVER','GOLD'],cases,failures,counts,stats,examples,sha256:hash.digest('hex')};
writeFileSync('artifacts/special-map-boss-candidate-1.json',JSON.stringify(report,null,2)+'\n');console.log({cases,failures,sha256:report.sha256});
if(Object.values(failures).some(Boolean))process.exitCode=1;
