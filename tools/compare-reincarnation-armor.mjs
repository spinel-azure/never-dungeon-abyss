import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {superbossCharacter,superbossTrial} from './simulate-goddess-superboss.mjs';
import {REINCARNATION_ARMOR as armor,getReincarnationArmorSet} from '../data/reincarnation-armor.js';
import {grantEquipmentInstance,equipInstance} from '../data/equipment-inventory.js';
import {normalizeCharacter} from '../data/classes.js';
import {collectStats} from '../combat/collect-stats.js';
const trials=Number(process.env.NDA_TRIALS||5),rows=[],characters=[];
for(const [job,series] of [['warrior','divinemight'],['thief','shadowless'],['priest','heavenprayer'],['mage','polarstar']]){
 let c=superbossCharacter(job);
 for(const item of Object.values(armor).filter(x=>x.seriesId===series)){
  const g=grantEquipmentInstance(c,item.id,item.slot,{enhancement:3});assert.ok(g.accepted);
  const e=equipInstance(g.character,item.slot,g.instance.instanceId);
  // A two-handed mage staff excludes the book, as in ordinary play.
  if(job==='mage'&&item.slot==='leftArmId'&&!e.accepted){c=g.character;continue;}
  assert.ok(e.accepted,e.reason);c=e.character;
 }
 c=normalizeCharacter(c);c.hp=c.maxHp;c.sp=c.maxSp;
 assert.equal(getReincarnationArmorSet(c)?.id,series);
 assert.ok(!c.temporaryStatBonuses?.def,'No experimental DEF override');
 characters.push({job,stats:collectStats(c),hp:c.maxHp,sp:c.maxSp,equipment:c.equipment,engravings:c.engravingStatBonuses});
 for(const theme of ['rice','dusk','tender'])for(const enabled of [false,true]){
  const character=structuredClone(c);
  // Laboratory ablation ONLY: leave all calculated equipment stats identical,
  // omit one set membership reference. Never normalize/save this synthetic control.
  if(!enabled)character.equippedInstanceIds.headId=null;
  assert.deepEqual(collectStats(character),collectStats(c));
  const runs=Array.from({length:trials},(_,i)=>superbossTrial({theme,job,seed:i+1,aware:true,character,defense90:false}));
  const wins=runs.filter(r=>r.outcome==='victory');
  const avg=(rs,k)=>rs.length?Number((rs.reduce((s,r)=>s+r[k],0)/rs.length).toFixed(2)):null;
  const row={job,theme,enabled,trials,wins:wins.length,meanVictoryTurns:avg(wins,'turns'),meanAllTurns:avg(runs,'turns'),meanPotions:avg(runs,'items'),timeouts:runs.filter(r=>r.outcome==='timeout').length};
  rows.push(row);console.log(JSON.stringify(row));
 }
}
const output=process.env.NDA_REPORT||path.join(tmpdir(),'nda-reincarnation-armor-comparison.json');
writeFileSync(output,JSON.stringify({trials,defense90LaboratoryOverride:false,policy:'Existing superbossCommand, NPC off, fixed seeds, set-only ablation with unchanged stats',characters,rows},null,2));
console.log(output);
