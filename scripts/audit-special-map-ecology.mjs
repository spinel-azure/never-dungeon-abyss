import {createHash} from 'node:crypto';
import {writeFileSync,readFileSync} from 'node:fs';
import {generateSpecialMapEcology as generateCandidate1} from '../tests/fixtures/special-map-ecology-candidate-1.mjs';
import {streamV1,chooseIndexV1} from '../js/special-map/random-v1.js';
import {generateSpecialMap,specialMapFingerprint,SPECIAL_DUNGEON_V1} from '../js/special-map/generator.js';
import {generateSpecialMapEcology,canonicalEcology,ECOLOGY_REVISION,SPECIES_COUNT_WEIGHTS} from '../js/special-map/ecology.js';
import {ECOLOGY_V1_POOLS} from '../js/special-map/ecology-pools-v1.js';
import {getEnemyById} from '../data/enemies.js';
import {checkEcology} from '../tests/special-map-ecology-helper.mjs';

const start=performance.now(),hash=createHash('sha256'),baselineHash=createHash('sha256');
const baseline=JSON.parse(readFileSync(new URL('../artifacts/special-map-ecology-candidate-1.json',import.meta.url),'utf8'));
const percentage=n=>Number((n/65536*100).toFixed(4));
function requestedCount(seed){
 let roll=chooseIndexV1(streamV1(SPECIAL_DUNGEON_V1,seed,'ecology-species-count'),10000);
 for(let i=0;i<SPECIES_COUNT_WEIGHTS.length;i++){if(roll<SPECIES_COUNT_WEIGHTS[i])return i+1;roll-=SPECIES_COUNT_WEIGHTS[i];}
 throw Error('Invalid count draw');
}
const report={revision:ECOLOGY_REVISION,status:'PROVISIONAL — pending distribution approval',ruleset:SPECIAL_DUNGEON_V1,seeds:65536,
 countWeights:SPECIES_COUNT_WEIGHTS,pools:ECOLOGY_V1_POOLS,
 failures:{generation:0,emptySpecies:0,duplicateMonster:0,invalidMonster:0,outsideTheme:0,weightSum:0,nonPositiveWeight:0,regenerationMismatch:0,identity:0,speciesCount:0,fingerprint:0,candidateSpeciesMismatch:0,candidateIdentityMismatch:0,requestedCountMismatch:0},
 failureExamples:[],counts:{1:0,2:0,3:0,4:0,'5+':0},requestedCounts:{1:0,2:0,3:0,4:0,5:0},countTransitions:{},dominance:{70:0,80:0,90:0,95:0,100:0},themes:{},monsters:{},singleSpecies:[],biasedExamples:[],examples:[],abExamples:[]};
for(const [theme,pool] of Object.entries(ECOLOGY_V1_POOLS)){
 report.themes[theme]={seeds:0,singleSpecies:0,speciesSum:0,maxWeight:0,maxSeed:null,poolSize:pool.length,requestedCounts:{1:0,2:0,3:0,4:0,5:0},actualCounts:{1:0,2:0,3:0,4:0,5:0},requestedFiveCapped:0};
 for(const {monsterId} of pool)report.monsters[monsterId]??={name:getEnemyById(monsterId)?.name,included:0,maxWeight:0,singleSpecies:0,atLeast90:0,soloSeeds:[],biasedSeeds:[]};
}
for(let seed=0;seed<65536;seed++){
 try{
  const map=generateSpecialMap(SPECIAL_DUNGEON_V1,seed),e=generateSpecialMapEcology(map.ruleset,seed,map);
  const old=generateCandidate1(map.ruleset,seed,map),requested=requestedCount(seed);
  baselineHash.update(canonicalEcology(old)+'\n');
  const issues=checkEcology(e,map);
  if(JSON.stringify(old.species.map(s=>s.monsterId))!==JSON.stringify(e.species.map(s=>s.monsterId)))issues.push('candidateSpeciesMismatch');
  if(old.ruleset!==e.ruleset||old.seed!==e.seed||old.themeId!==e.themeId)issues.push('candidateIdentityMismatch');
  if(e.species.length!==Math.min(requested,ECOLOGY_V1_POOLS[e.themeId].length))issues.push('requestedCountMismatch');
  if(JSON.stringify(e)!==JSON.stringify(generateSpecialMapEcology(map.ruleset,seed,map)))issues.push('regenerationMismatch');
  for(const issue of issues)report.failures[issue]++;
  if(issues.length){report.failureExamples.push({seed,issues});continue;}
  hash.update(canonicalEcology(e)+'\n');
  const count=e.species.length,max=Math.max(...e.species.map(s=>s.weight));
  report.counts[count>=5?'5+':count]++;
  report.requestedCounts[requested]++;
  const transition=`${requested}->${count}`;report.countTransitions[transition]=(report.countTransitions[transition]||0)+1;
  for(const threshold of Object.keys(report.dominance))if(max>=Number(threshold)*100)report.dominance[threshold]++;
  const t=report.themes[e.themeId];t.seeds++;t.speciesSum+=count;if(count===1)t.singleSpecies++;
  t.requestedCounts[requested]++;t.actualCounts[count]++;if(requested===5&&count<5)t.requestedFiveCapped++;
  if(max>t.maxWeight){t.maxWeight=max;t.maxSeed=seed;}
  for(const s of e.species){
   const m=report.monsters[s.monsterId];m.included++;m.maxWeight=Math.max(m.maxWeight,s.weight);
   if(count===1){m.singleSpecies++;m.soloSeeds.push(seed);report.singleSpecies.push({seed,themeId:e.themeId,...s});}
   if(s.weight>=9000){m.atLeast90++;if(count>1&&m.biasedSeeds.length<3){m.biasedSeeds.push(seed);report.biasedExamples.push({seed,themeId:e.themeId,species:e.species,fingerprint:e.fingerprint});}}
  }
  if([0,1,12345,32768,65535].includes(seed))report.examples.push({...e,topologyFingerprint:specialMapFingerprint(map)});
  if([0,1,102,104,640,12345,32768,65535].includes(seed))report.abExamples.push({seed,themeId:e.themeId,candidate1:old.species,candidate2:e.species,candidate1Fingerprint:old.fingerprint,candidate2Fingerprint:e.fingerprint});
 }catch(error){report.failures.generation++;report.failureExamples.push({seed,error:error.message});}
}
for(const t of Object.values(report.themes))t.averageSpecies=t.speciesSum/t.seeds;
report.sha256=hash.digest('hex');report.seconds=(performance.now()-start)/1000;
report.candidate1ReproducedSha256=baselineHash.digest('hex');
if(report.candidate1ReproducedSha256!=='33f521694198da8fd73de895fd844c6042d8c88f364c1465aa3c181968dc20a4'||report.candidate1ReproducedSha256!==baseline.sha256)throw Error('Candidate 1 reproduction differs from archived audit');
report.countPercentages=Object.fromEntries(Object.entries(report.counts).map(([k,n])=>[k,percentage(n)]));
report.dominancePercentages=Object.fromEntries(Object.entries(report.dominance).map(([k,n])=>[k,percentage(n)]));
report.rareMonsters=Object.fromEntries(Object.entries(report.monsters).filter(([id])=>Object.values(ECOLOGY_V1_POOLS).some(pool=>pool.some(s=>s.monsterId===id&&s.baseWeight<=100000))).map(([id,m])=>[id,{...m,lowWeightThemes:Object.fromEntries(Object.entries(ECOLOGY_V1_POOLS).flatMap(([theme,pool])=>pool.filter(s=>s.monsterId===id&&s.baseWeight<=100000).map(s=>[theme,s.baseWeight])))}]));
report.comparison=[['単一種',baseline.counts[1],report.counts[1]],...Object.keys(report.dominance).map(k=>[`${k}%以上`,baseline.dominance[k],report.dominance[k]]),['マイケーファー90%以上',baseline.monsters.maikaefer.atLeast90,report.monsters.maikaefer.atLeast90],['マイケーファー100%',baseline.monsters.maikaefer.singleSpecies,report.monsters.maikaefer.singleSpecies]];
writeFileSync(new URL('../artifacts/special-map-ecology-candidate-2.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
const md=['# 生態系全seed監査：V1候補2（未承認）','',`対象: 正式V1 ${report.seeds.toLocaleString('en-US')} seed。単一種率 ${(report.counts[1]/65536*100).toFixed(4)}%。`,
 '',`暫定 SHA-256: \`${report.sha256}\``, '', '承認済み互換性ハッシュではありません。地形ハッシュとは独立です。', '', '## 健全性', '', ...Object.entries(report.failures).map(([k,v])=>`- ${k}: ${v}`),'','## 生息種数','', '|種数|地図数|','|---|---:|',...Object.entries(report.counts).map(([k,v])=>`|${k}|${v}|`),
 '', '## 最大比率（閾値以上、単一種を含む累積件数）','', '|比率|地図数|','|---|---:|',...Object.entries(report.dominance).map(([k,v])=>`|${k}%|${v}|`),
 '', '## テーマ別','', '|theme|seed数|単一種|平均種数|最大比率|代表seed|','|---|---:|---:|---:|---:|---:|',...Object.entries(report.themes).map(([id,t])=>`|${id}|${t.seeds}|${t.singleSpecies}|${t.averageSpecies.toFixed(4)}|${t.maxWeight/100}%|${t.maxSeed}|`),
 '', '## 魔物別（全テーマ合算）','', '|monsterId / 名前|含有地図数|最大比率|100%|90%以上|100%の全seed|','|---|---:|---:|---:|---:|---|',...Object.entries(report.monsters).map(([id,m])=>`|${id} / ${m.name}|${m.included}|${m.maxWeight/100}%|${m.singleSpecies}|${m.atLeast90}|${m.soloSeeds.join(', ')}|`),
 '', '## 90%以上・複数種の代表例（魔物ごと最大3件）','', '|seed|theme|生態系|','|---:|---|---|',...report.biasedExamples.map(e=>`|${e.seed}|${e.themeId}|${e.species.map(s=>`${s.monsterId} ${(s.weight/100).toFixed(2)}%`).join(' / ')}|`),
 '', '## V1候補プール：明示allowlistとbaseWeight','', '各テーマの合計は1,000,000。算出根拠・除外方針は special-maps-phase3c1.md を参照。','',...Object.entries(ECOLOGY_V1_POOLS).flatMap(([theme,pool])=>[`### ${theme}`,'','|monsterId|名前|baseWeight|','|---|---|---:|',...pool.map(s=>`|${s.monsterId}|${getEnemyById(s.monsterId)?.name}|${s.baseWeight}|`),'']),
 '## 基準seed','', '```json',JSON.stringify(report.examples,null,2),'```',''];
md.push('## Candidate 1 / 2比較','',`Candidate 1再生成SHA-256: \`${report.candidate1ReproducedSha256}\`（保存済み値と一致）。`,
 '', '全65,536 seedで、選出monsterIdの順序・種数・theme・ruleset・seedが一致。',
 '', '|指標|Candidate 1 件数（全seed比）|Candidate 2 件数（全seed比）|','|---|---:|---:|',
 ...report.comparison.map(([label,a,b])=>`|${label}|${a} (${percentage(a)}%)|${b} (${percentage(b)}%)|`),
 '', '## 要求種数 → 実際の種数','', '|種数|要求件数（全seed比）|実際件数（全seed比）|','|---|---:|---:|',
 ...Object.entries(report.requestedCounts).map(([k,n])=>`|${k}|${n} (${percentage(n)}%)|${report.counts[k==='5'?'5+':k]} (${report.countPercentages[k==='5'?'5+':k]}%)|`),
 '', '|theme|候補数|要求5種|要求5種→4種以下|','|---|---:|---:|---:|',
 ...Object.entries(report.themes).map(([id,t])=>`|${id}|${t.poolSize}|${t.requestedCounts[5]}|${t.requestedFiveCapped}|`),
 '', '種数の全遷移・themeごとの要求/実数内訳はJSONのcountTransitions/themesを参照。',
 '', '## 低baseWeight種の統計','', '監査上の抽出条件: いずれかのthemeでbaseWeight ≤ 100,000（初回選出比10%以下）。生成にはこの分類を使用しない。',
 '', '|monsterId|該当theme:baseWeight|含有地図数|100%|90%以上 C1→C2|','|---|---|---:|---:|---:|',
 ...Object.entries(report.rareMonsters).map(([id,m])=>`|${id}|${Object.entries(m.lowWeightThemes).map(([k,v])=>`${k}:${v}`).join(', ')}|${m.included}|${m.singleSpecies}|${baseline.monsters[id].atLeast90} → ${m.atLeast90}|`),
 '', '## 同じseedの比率比較','', '|seed / theme|Candidate 1|Candidate 2|C2 fingerprint|','|---|---|---|---|',
 ...report.abExamples.map(e=>`|${e.seed} / ${e.themeId}|${e.candidate1.map(s=>`${s.monsterId} ${s.weight/100}%`).join(' / ')}|${e.candidate2.map(s=>`${s.monsterId} ${s.weight/100}%`).join(' / ')}|${e.candidate2Fingerprint}|`),'');
writeFileSync(new URL('../docs/special-maps-ecology-audit-candidate-2.md',import.meta.url),md.join('\n'));
console.log(JSON.stringify({failures:report.failures,counts:report.counts,dominance:report.dominance,maikaefer:report.monsters.maikaefer,sha256:report.sha256,seconds:report.seconds},null,2));
if(Object.values(report.failures).some(Boolean))process.exitCode=1;
