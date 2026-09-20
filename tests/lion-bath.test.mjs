import test from 'node:test';
import assert from 'node:assert/strict';
import {createLionAftermath,getLionBathFrame,handleLionBathInput,updateLionBath} from '../js/lion-bath.js';
import {getLeoDoorAccess} from '../data/loewenkoenigin.js';
import {getAdventureChronicle} from '../data/adventure-records.js';
import {getMonsterCompendiumCatalog} from '../data/monster-compendium.js';
test('defeated queen door stays passable even without qualification; new players remain blocked',()=>{
 assert.equal(getLeoDoorAccess({eventFlags:{boss_loewenkoenigin_b1f_defeated:true}}).blocked,false);
 assert.equal(getLeoDoorAccess({}).blocked,true);
});
test('each entry rolls 0.05 percent, exact boundary is ordinary empty throne',()=>{
 assert.equal(createLionAftermath(1,2,0.00049999).rare,true);
 assert.equal(createLionAftermath(1,2,0.0005).phase,'empty');
 assert.match(createLionAftermath(1,2,1).message,/玉座の間は静まり返り、誰もいないようだ。/);
});
test('timeline holds throne, fades 700ms, blacks out 300ms, blurs 28 to 22 to zero',()=>{
 assert.equal(getLionBathFrame(999).throne,1);assert.equal(getLionBathFrame(1350).throne,.5);
 for(const t of [1700,1850,1999])assert.deepEqual([getLionBathFrame(t).throne,getLionBathFrame(t).opacity],[0,0]);
 assert.equal(getLionBathFrame(2000).blur,28);assert.equal(getLionBathFrame(2400).opacity,.5);assert.equal(getLionBathFrame(2800).blur,22);
 assert.ok(getLionBathFrame(3600).blur>0);assert.deepEqual(getLionBathFrame(4500),{throne:0,opacity:1,blur:0,scale:1});
 assert.deepEqual(getLionBathFrame(4899),getLionBathFrame(4500));
});
test('locked loading/reveal ignores repeated A/B, achievement only after reveal and 400ms hold',()=>{
 const e=createLionAftermath(1,2,0);let seen=0,retreated=0;const h={say:()=>{},markLionBathSeen:()=>seen++,retreat:()=>retreated++};
 handleLionBathInput(e,'confirm',h,0);assert.equal(e.phase,'bathLoading');
 for(const phase of ['bathLoading','bathReveal','bathExit']){e.phase=phase;for(const a of ['confirm','cancel','confirm'])handleLionBathInput(e,a,h,0);assert.equal(e.phase,phase);}
 e.phase='bathReveal';e.startAt=0;updateLionBath(e,4899,h);assert.equal(seen,0);updateLionBath(e,4900,h);assert.equal(seen,1);assert.equal(e.phase,'bathTalk');
 for(let i=0;i<3;i++)handleLionBathInput(e,'confirm',h,5000);assert.equal(e.phase,'bathExit');updateLionBath(e,6199,h);assert.equal(retreated,0);updateLionBath(e,6200,h);assert.equal(retreated,1);
});
test('cancel prompt and ordinary throne exit; reduced motion reaches unblurred final frame',()=>{
 let n=0;const h={retreat:()=>n++};handleLionBathInput(createLionAftermath(1,2,0),'cancel',h,0);handleLionBathInput(createLionAftermath(1,2,1),'confirm',h,0);assert.equal(n,2);
 assert.deepEqual(getLionBathFrame(500,true),{throne:0,opacity:1,blur:0,scale:1});
});
test('five achievements: kill and bath separate, 50 insects, complete public bestiary, item placeholder locked',()=>{
 const c={eventFlags:{maikaefer_defeat_count:49},compendium:{monsters:{}}};const e=id=>getAdventureChronicle(c).find(e=>e.id===id);
 assert.equal(e('maikaeferMaster').achieved,false);c.eventFlags.maikaefer_defeat_count=50;assert.equal(e('maikaeferMaster').achieved,true);
 c.eventFlags.boss_loewenkoenigin_b1f_defeated=true;assert.equal(e('lionQueen').achieved,true);assert.equal(e('lionBath').achieved,false);
 c.eventFlags.achievement_lion_bath_seen=true;assert.equal(e('lionBath').achieved,true);
 assert.equal(e('monsterCompendium').achieved,false);for(const m of getMonsterCompendiumCatalog().filter(m=>!m.hiddenUntilEncounter))c.compendium.monsters[m.id]={defeated:true};assert.equal(e('monsterCompendium').achieved,true);
 assert.equal(e('itemCompendium').achieved,false);assert.equal(e('allAchievements').achieved,false);
});
