import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getSkill} from '../data/skills.js';
import {createInitialCharacter} from '../data/classes.js';
import {createBattleState,resolveBattleRound,resolveMultiBattleRound} from '../combat/battle-engine.js';
import {normalizeEffectDefinition} from '../js/effects/effect-schema.js';
import {prepareBattleSkillEffect} from '../js/battle-skill-presentation.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
for(const [id,duration,parts,popupTime] of [['call_goddess_name',20294,15,19194]]){
 test(`${id} retains supplied parameters and substitutes actual damage`,()=>{
 const skill=getSkill(id),registry=read('data/effects/battle-presentations.json');
 assert.equal(registry[skill.presentationId||skill.id],'data/effects/goddess.json');
 const source=read(registry[id]),normalized=normalizeEffectDefinition(source);
 assert.equal(source.duration,duration);assert.equal(source.parts.length,parts);assert.deepEqual(source.audioTracks,[]);
 for(let i=0;i<parts;i++)for(const [key,value] of Object.entries(source.parts[i]))assert.deepEqual(normalized.parts[i][key],value,`${id}/${i}/${key}`);
 const ready=prepareBattleSkillEffect(source,1234);assert.equal(ready.parts.at(-1).text,'1234');assert.equal(ready.parts.at(-1).start,popupTime);assert.equal(source.parts.at(-1).text,'{damage}');
 });
 test(`${id} real charge action emits registered presentation per actual target`,()=>{
 const c=createInitialCharacter({name:'Effects QA',job:'priest'});c.skillIds.push(id);c.sp=c.maxSp=200;c.int=30;c.agi=99;c.playerCharge={value:100,cooldown:0};
 const enemies=[0,1].map(i=>({id:`dummy_${i}`,name:'DUMMY',hp:999999,maxHp:999999,str:1,int:1,agi:1,dex:1,luc:1,def:0,attack:1,alive:true,statuses:[],statusResistances:{}}));
 const multi=id==='apocalypse';const battle=createBattleState({character:c,enemy:enemies[0],...(multi?{enemies}:{})});
 const result=(multi?resolveMultiBattleRound:resolveBattleRound)({battle,playerCommand:{type:'skill',skillId:id},rng:()=>.5});assert.equal(result.accepted,true);
 const events=result.battle.presentationEvents.filter(e=>e.targetSide==='enemy'&&e.hit&&(e.battlePresentationId||e.playerChargePresentationId)===id);
 assert.equal(events.length,multi?2:1);assert.ok(events.every(e=>e.damage>0));assert.equal(result.battle.player.playerCharge.value,0);
 if(multi)assert.equal(new Set(events.map(e=>e.targetIndex)).size,2);
 });
}
