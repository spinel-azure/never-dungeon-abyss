import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createInitialCharacter} from '../data/classes.js';
import {createBattleState,resolveMultiBattleRound} from '../combat/battle-engine.js';
import {getAreaPresentationGroup} from '../js/area-skill-presentation.js';
import {prepareAreaSkillEffect} from '../js/battle-skill-presentation.js';
import {normalizeEffectDefinition} from '../js/effects/effect-schema.js';
const registry=JSON.parse(readFileSync('data/effects/battle-presentations.json','utf8'));
for(const id of ['call_goddess_name','fall_the_meteor','apocalypse','walpurgisnacht']) {
 test(id+' groups real all-target hits and preserves each damage/position/font',()=>{
  const c=createInitialCharacter({name:'QA',job:id==='call_goddess_name'?'priest':'mage'});c.skillIds.push(id);c.sp=c.maxSp=999;c.int=30;c.agi=99;c.playerCharge={value:100,cooldown:0};
  const enemies=[0,1,2].map(i=>({id:'dummy'+i,name:'DUMMY',hp:999999,maxHp:999999,str:1,int:1,agi:1,dex:1,luc:1,def:0,attack:1,alive:true,statuses:[],statusResistances:{}}));
  const b=createBattleState({character:c,enemy:enemies[0],enemies});
  const r=resolveMultiBattleRound({battle:b,playerCommand:{type:'skill',skillId:id},rng:()=>.5});assert.equal(r.accepted,true);
  const hits=r.battle.presentationEvents.filter(e=>e.battlePresentationId===id&&e.hit);
  assert.equal(hits.length,3);assert.equal(getAreaPresentationGroup(r.battle.presentationEvents,hits[0]).length,3);assert.deepEqual(hits.map(e=>e.targetIndex),[0,1,2]);
  const def=JSON.parse(readFileSync(registry[id],'utf8'));const targets=hits.map((e,i)=>({targetIndex:e.targetIndex,damage:1000+i*500}));
  const prepared=normalizeEffectDefinition(prepareAreaSkillEffect(def,targets));const popups=prepared.parts.filter(p=>p.type==='popup');
  assert.deepEqual(popups.map(p=>p.text),['1000','1500','2000']);assert.ok(popups.every(p=>p.anchor==='enemy'&&p.fontFamily==='pixel'));assert.equal(new Set(popups.map(p=>p.start)).size,1);
  assert.equal(prepared.parts.filter(p=>p.type!=='popup').length,def.parts.filter(p=>p.type!=='popup').length);
 });
}
test('separate casts, other skills, misses and blocked targets are not merged',()=>{
 const hit={type:'attackHit',targetSide:'enemy',hit:true,areaPresentationGroup:0,battlePresentationId:'walpurgisnacht'};
 const events=[hit,{...hit,targetIndex:1},{...hit,areaPresentationGroup:3},{...hit,battlePresentationId:'other'},{...hit,hit:false},{...hit,bossBarrierBlocked:true}];
 assert.equal(getAreaPresentationGroup(events,hit).length,2);assert.equal(getAreaPresentationGroup(events,events[2]).length,1);assert.deepEqual(getAreaPresentationGroup(events,events[3]),[]);
});
test('Gemini copies receive a separate real cast group and retain half damage',()=>{
 const c=createInitialCharacter({name:'QA',job:'mage'});c.cards.deckSlots=['zodiac_gemini'];c.skillIds.push('walpurgisnacht');c.sp=c.maxSp=999;c.int=30;c.agi=99;
 const enemies=[0,1,2].map(i=>({id:'dummy'+i,name:'DUMMY',hp:999999,maxHp:999999,str:1,int:1,agi:1,dex:1,luc:1,def:0,attack:1,alive:true,statuses:[],actions:[{weight:1,action:{id:'wait',actionType:'wait'}}]}));
 const b=createBattleState({character:c,enemy:enemies[0],enemies});const r=resolveMultiBattleRound({battle:b,playerCommand:{type:'skill',skillId:'walpurgisnacht'},rng:()=>.5});
 const hits=r.battle.presentationEvents.filter(e=>e.battlePresentationId==='walpurgisnacht'&&e.hit);assert.equal(hits.length,6);
 const first=getAreaPresentationGroup(r.battle.presentationEvents,hits[0]),second=getAreaPresentationGroup(r.battle.presentationEvents,hits[3]);assert.equal(first.length,3);assert.equal(second.length,3);assert.notEqual(hits[0].areaPresentationGroup,hits[3].areaPresentationGroup);
 assert.equal(second[0].damage,Math.floor(first[0].damage*.5));assert.equal(r.battle.player.sp,b.player.sp-55);
});
