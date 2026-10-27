// Read-only laboratory: one command per fresh battle, no balance overrides.
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createPacingCharacter} from './simulate-deep-normal-enemy-battles.mjs';
import {createInitialCharacter,normalizeCharacter,getCharacterClass} from '../data/classes.js';
import {getLevelGrowth} from '../data/growth.js';
import {getSkill,getLevelUnlockedSkillIds} from '../data/skills.js';
import {collectStats} from '../combat/collect-stats.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {getPhysicalReincarnationMultiplier,getSpellReincarnationMultiplier} from '../data/reincarnation.js';
import {f2Random} from './simulate-special-map-f2.mjs';

const characters=[],rows=[];
for(const job of ['warrior','thief','priest','mage'])for(const count of [0,1,2,3])for(const level of [1,197]){
 const initial=createInitialCharacter({name:'SP分析',job});
 // Retained ordinary B80+ gear, identical across reincarnations, no cards or engravings.
 const equipped=createPacingCharacter({job,level:197,band:'B90',withNpcs:false});
 const c=normalizeCharacter({...equipped,level,reincarnationCount:count,cards:initial.cards,engravingStatBonuses:{},
  skillIds:[...getCharacterClass(job).initialSkillIds,...getLevelUnlockedSkillIds(job,level)],playerCharge:{value:100,cooldown:0},statuses:[]});
 c.hp=c.maxHp;c.sp=c.maxSp;
 const b0=createBattleState({character:c,enemy:{id:'dummy',name:'中立標的',hp:1000000,maxHp:1000000,attack:0,str:0,int:0,agi:0,dex:0,luc:0,def:30,alive:true,statuses:[],isBoss:true,instantDeathImmune:true}});
 characters.push({job,count,level,baseSp:getLevelGrowth(job,level,count).sp,maxSp:c.maxSp,maxHp:c.maxHp,stats:collectStats(c),equipment:c.equipment,skillIds:c.skillIds,physicalMultiplier:getPhysicalReincarnationMultiplier(level,count),spellMultiplier:getSpellReincarnationMultiplier(level,count)});
 for(const id of ['normal_attack',...c.skillIds]){
  const s=getSkill(id),normal=id==='normal_attack';
  if(!normal&&!['physicalAttack','spell','healing'].includes(s?.actionType))continue;
  for(const defense of [30,90]){
   let damage=0,healing=0,spSpent=0;
   const samples=50;
   for(let seed=1;seed<=samples;seed++){
    const b=structuredClone(b0);b.enemy.def=defense;
    if(s?.actionType==='healing')b.player.hp=1;
    const before=b.player.sp;
    const r=resolveBattleRound({battle:b,playerCommand:normal?{type:'attack'}:{type:'skill',skillId:id},rng:f2Random(seed)});
    assert.ok(r.accepted,`${job}/${count}/${level}/${id}: ${r.reason}`);
    for(const e of r.battle.presentationEvents||[]){
     if(e.type==='attackHit'&&e.actorSide==='player'&&e.targetSide==='enemy')damage+=e.damage||0;
     if(e.type==='healing'&&e.actorSide==='player'&&e.targetSide==='player')healing+=e.amount||0;
    }
    spSpent+=before-r.battle.player.sp;
   }
   const cost=normal?0:getEffectiveSpCost(s,b0.player);
   rows.push({job,count,level,id,name:s?.name||'通常攻撃',defense,samples,cost,meanSpSpent:spSpent/samples,damage:+(damage/samples).toFixed(2),healing:+(healing/samples).toFixed(2),charge:!!s?.chargeSkill,ultimate:!!s?.ultimateChargeSkill,
    uses:cost&&!s?.chargeSkill?Math.floor(c.maxSp/cost):null,proposedCost:s?.chargeSkill?null:cost*(count+1),proposedUses:cost&&!s?.chargeSkill?Math.floor(c.maxSp/(cost*(count+1))):null});
  }
 }
}
const catalog=Object.fromEntries(['warrior','thief','priest','mage'].map(job=>[job,[...getCharacterClass(job).initialSkillIds,...getLevelUnlockedSkillIds(job,197)].map(id=>getSkill(id))]));
writeFileSync('artifacts/reincarnation-skill-analysis.json',JSON.stringify({conditions:'50 seeded one-command fresh battles per row; retained ordinary B80+ +3 gear; no cards, engravings or NPCs; neutral synthetic boss DEF30/90 HP1M, other abilities0, no element resistance; charge100 for measuring charge skills separately; healing starts at1HP; all-target damage is for ONE enemy; actual engine including weapon procs; SP cost proposals are arithmetic only, no proposed damage simulation',characters,catalog,rows},null,2)+'\n');
console.log(JSON.stringify({characters:characters.length,rows:rows.length,commands:rows.length*50}));
for(const job of ['warrior','thief','priest','mage'])console.log(job,rows.filter(r=>r.job===job&&r.count===3&&r.defense===30).map(r=>({level:r.level,name:r.name,cost:r.cost,damage:r.damage,heal:r.healing,uses:r.uses,proposedUses:r.proposedUses})));
