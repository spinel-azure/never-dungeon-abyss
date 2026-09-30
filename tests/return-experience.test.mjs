import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCharacter, normalizeCharacter } from '../data/classes.js';
import { settleReturnExperience, resolveInnStay, resolveInnStableStay, resolveDungeonDefeat, awardBattleExperience } from '../js/character-services.js';
import { createDepthReturnSettlement } from '../data/experience-settlement.js';
import { GODDESS_GRACE_CARD_ID, GODDESS_MERCY_CARD_ID } from '../data/cards.js';
const fresh = () => createInitialCharacter({name:'帰還検証',job:'warrior'});
const commit = (c, floor, options) => Object.assign(c, settleReturnExperience(c,floor,options).changes);
test('shallow return then empty deep return cannot reprice experience, including reload',()=>{
 let c=fresh(); Object.assign(c,awardBattleExperience(c,10000)); commit(c,10);
 assert.equal(c.experience,10500);assert.equal(c.level,1);assert.equal(c.carriedExperience,0);
 c=normalizeCharacter(JSON.parse(JSON.stringify(c)));assert.equal(c.level,1);
 commit(c,80);assert.equal(c.experience,10500);
 Object.assign(c,awardBattleExperience(c,100));commit(c,80);assert.equal(c.experience,10640);
 const inn=resolveInnStay(c);assert.equal(inn.gainedExperience,0);assert.ok(inn.changes.level>1);
 Object.assign(c,inn.changes);assert.equal(resolveInnStay(c).levelsGained,0);
});
test('defeat loses only expedition carry; protection commits once without depth or Johanna bonus',()=>{
 for(const card of [null,GODDESS_GRACE_CARD_ID,GODDESS_MERCY_CARD_ID]) {
  const c=fresh();c.experience=1000;c.carriedExperience=500;c.guildExperiencePool=300;
  c.cards.deckSlots=card?[card]:[];c.eventFlags.johanna_bonus_unlocked=true;
  Object.assign(c,resolveDungeonDefeat(c,{preserveExperience:Boolean(card)}));
  const r=settleReturnExperience(c,0);Object.assign(c,r.changes);
  assert.equal(c.experience,card?1500:1000);assert.equal(c.guildExperiencePool,300);
  assert.equal(r.settlement.depthBonusExp,0);assert.equal(r.settlement.johannaBonusExp,0);
  commit(c,0);assert.equal(c.experience,card?1500:1000);assert.equal(c.level,1);
 }
});
test('legacy pending return migrates once at its stored rate; quest flags survive',()=>{
 let c=fresh();c.carriedExperience=10000;c.eventFlags.johanna_bonus_unlocked=true;
 c.pendingExperienceSettlement=createDepthReturnSettlement(c,10);
 c.pendingExperienceSettlement.johannaBonusExp=1000;c.pendingExperienceSettlement.finalSettlementExp=11500;
 c=normalizeCharacter(c);commit(c,80,{legacy:true});assert.equal(c.experience,10500);
 assert.equal(c.eventFlags.johanna_bonus_unlocked,true);commit(c,80,{legacy:true});assert.equal(c.experience,10500);
});
test('guild pool is separate from depth returns and consumed exactly once by either lodging',()=>{
 for(const stay of [resolveInnStay,resolveInnStableStay]) {
  let c=fresh();c.carriedExperience=100;c.guildExperiencePool=1000;
  commit(c,100);assert.equal(c.experience,150);assert.equal(c.guildExperiencePool,1000);
  c=normalizeCharacter(JSON.parse(JSON.stringify(c)));const r=stay(c);
  assert.equal(r.guildExperience,1000);assert.equal(r.changes.experience,1150);
  assert.equal(r.changes.guildExperiencePool,0);Object.assign(c,r.changes);
  assert.equal(stay(c).gainedExperience,0);
 }
});
test('deferred temple revival leaves the character dead during return settlement',()=>{
 const c=fresh();c.carriedExperience=500;c.statuses=[{statusId:'poison'}];
 Object.assign(c,resolveDungeonDefeat(c,{preserveExperience:true,deferRevival:true}));
 assert.equal(c.alive,false);assert.equal(c.hp,0);assert.equal(c.carriedExperience,500);
 assert.deepEqual(c.statuses,[{statusId:'poison'}]);
});
