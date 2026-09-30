import test from 'node:test';
import assert from 'node:assert/strict';
import {GUILD_EXPERIENCE_REWARDS as rewards,grantGuildQuestExperience as grant,formatGuildExperienceReceipt} from '../data/guild-experience.js';
import {QUESTS,reportQuest,normalizeQuestState,getQuestProgress} from '../data/quests.js';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {MAX_EXPERIENCE} from '../data/growth.js';
import {resolveInnStay,resolveInnStableStay,resolveDungeonDefeat,settleReturnExperience} from '../js/character-services.js';
const fresh=()=>createInitialCharacter({name:'EXP',job:'warrior'});
const first='guild_001_abyss_rat',second='guild_002_cave_slime';
const ready=(c,id)=>({...c,quests:{...c.quests,active:{...c.quests.active,[id]:{progress:QUESTS.find(q=>q.id===id).requiredCount}}}});
test('all 33 fixed rewards match requested amounts including 029 and total',()=>{
 const expected=[20,30,50,60,100,200,400,600,800,1200,2000,3000,2500,3500,5000,10000,4000,5000,8000,6000,10000,15000,12000,12000,22000,30000,10000,45000,18000,40000,30000,60000,100000];
 const ordered=[...QUESTS].sort((a,b)=>Number(a.number)-Number(b.number));
 assert.equal(ordered.length,33);assert.deepEqual(ordered.map(q=>q.reward.experience),expected);
 assert.equal(Object.values(rewards).reduce((a,b)=>a+b,0),456460);
 assert.equal(rewards.guild_029,10000);
});
test('normal reporting grants once and failed/repeated reporting leaves state untouched',()=>{
 const c=fresh();assert.equal(reportQuest(c,first).character,c);
 const before=ready(c,first),r=reportQuest(before,first);assert.equal(r.accepted,true);
 assert.equal(r.character.guildExperiencePool,20);assert.equal(r.character.experience,0);assert.equal(r.character.level,1);
 assert.deepEqual(r.character.quests.experienceRewardQuestIds,[first]);assert.equal(before.guildExperiencePool,0);
 assert.equal(reportQuest(r.character,first).character,r.character);
 assert.equal(grant(r.character).character,r.character);
});
test('legacy partial/full compensation uses only reports and survives normalized reload',()=>{
 let c=ready(fresh(),second);c.quests.completedQuestIds=[first];c.eventFlags.boss_b99f_defeated=true;
 let r=grant(c);assert.equal(r.nominal,20);assert.equal(getQuestProgress(r.character,second).readyToReport,true);
 c=normalizeCharacter(JSON.parse(JSON.stringify(r.character)));assert.equal(grant(c).nominal,0);
 const report=reportQuest(c,second);assert.equal(report.character.guildExperiencePool,50);
 c=fresh();c.quests.completedQuestIds=QUESTS.map(q=>q.id);
 const before=structuredClone(c);r=grant(c);assert.equal(r.nominal,456460);assert.equal(r.gained,456460);
 assert.deepEqual(r.character.cards,before.cards);assert.deepEqual(r.character.inventory,before.inventory);
 assert.deepEqual(r.character.eventFlags,before.eventFlags);assert.equal(r.character.gold,before.gold);
 assert.equal(r.ids.length,33);assert.equal(grant(normalizeCharacter(r.character)).nominal,0);
 assert.equal(grant({...r.character,guildExperiencePool:0}).nominal,0,'paid IDs remain authoritative');
});
test('pool has no multipliers, survives defeat and returns, and settles at either lodging once',()=>{
 for(const stay of [resolveInnStay,resolveInnStableStay]){
  let c=ready(fresh(),first);c.eventFlags.johanna_bonus_unlocked=true;c.cards.deckSlots=['common_goddess_grace'];
  c=reportQuest(c,first).character;c.carriedExperience=100;
  Object.assign(c,resolveDungeonDefeat(c));Object.assign(c,settleReturnExperience(c,100).changes);
  assert.equal(c.guildExperiencePool,20);assert.equal(c.level,1);
  const r=stay(c);assert.equal(r.guildExperienceApplied,20);assert.equal(r.changes.experience,20);assert.ok(r.changes.level>1);
  Object.assign(c,r.changes);assert.equal(stay(c).guildExperience,0);assert.equal(grant(c).nominal,0);
 }
});
test('cap receipts distinguish nominal from actual and still mark all reports paid',()=>{
 for(const remaining of [0,7]){
  const c=fresh();c.experience=MAX_EXPERIENCE-remaining;c.quests.completedQuestIds=[first,second];
  const r=grant(c);assert.equal(r.nominal,50);assert.equal(r.gained,remaining);assert.equal(r.ids.length,2);
  assert.match(formatGuildExperienceReceipt(r,{compensation:true}),/規定報酬50EXP/);
  assert.equal(grant(normalizeCharacter(r.character)).nominal,0);
 }
 const c=fresh();c.experience=MAX_EXPERIENCE-10;c.guildExperiencePool=8;c.quests.completedQuestIds=[first];
 const r=grant(c);assert.equal(r.gained,2);
 r.character.experience=MAX_EXPERIENCE;
 const inn=resolveInnStay(r.character);assert.equal(inn.guildExperience,10);assert.equal(inn.guildExperienceApplied,0);assert.equal(inn.changes.guildExperiencePool,0);
});
test('legacy reward IDs default empty and unknown/duplicate IDs cannot grant',()=>{
 assert.deepEqual(normalizeQuestState({}).experienceRewardQuestIds,[]);
 const c=fresh();c.quests.completedQuestIds=[first,first,'guild_022','unknown'];
 assert.equal(grant(c).nominal,20);
});
import {grantEquipmentInstance} from '../data/equipment-inventory.js';
test('035 existing-reward rejection does not pay EXP or mark it paid',()=>{
 let c=fresh();c.eventFlags.ending_story_completed=true;c.quests.active.guild_035={progress:2};
 c=grantEquipmentInstance(c,'kirke_amulet','accessoryId').character;
 const before=structuredClone(c),r=reportQuest(c,'guild_035');
 assert.equal(r.accepted,false);assert.deepEqual(r.character,before);assert.equal(r.character.guildExperiencePool,0);
 assert.equal(r.character.quests.experienceRewardQuestIds.includes('guild_035'),false);
});
test('027 combat and peaceful completion award identical fixed EXP',()=>{
 for(const peaceful of [false,true]){
  const c=fresh();c.quests.active.guild_027={progress:0};
  c.eventFlags={red_door_b69f_unlocked:true,boss_b69f_defeated:true,transfer_portal_b70f_unlocked:true,
   sphinx_b69f_peaceful:peaceful,sphinx_b69f_defeated:!peaceful};
  const r=reportQuest(c,'guild_027');assert.equal(r.accepted,true);assert.equal(r.experienceReward.gained,22000);
 }
});
