import test from 'node:test';
import assert from 'node:assert/strict';
import {createLionAftermath,rollLionBath,resetLionBathVisits,getLionBathFrame,handleLionBathInput,updateLionBath} from '../js/lion-bath.js';
import {getLeoDoorAccess} from '../data/loewenkoenigin.js';
import {getAdventureChronicle} from '../data/adventure-records.js';
import {getMonsterCompendiumCatalog} from '../data/monster-compendium.js';
test('defeated queen door stays passable even without qualification; new players remain blocked',()=>{
 assert.equal(getLeoDoorAccess({eventFlags:{boss_loewenkoenigin_b1f_defeated:true}}).blocked,false);
 assert.equal(getLeoDoorAccess({}).blocked,true);
});
test('first entry rolls 5 percent, exact boundary is ordinary empty throne',()=>{
 assert.equal(createLionAftermath(1,2,0.049999).rare,true);
 assert.equal(createLionAftermath(1,2,0.05).phase,'empty');
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
 e.phase='bathPrompt';handleLionBathInput(e,'confirm',h,0);assert.equal(e.phase,'bathLoading');
 for(const phase of ['bathLoading','bathReveal','bathExit']){e.phase=phase;for(const a of ['confirm','cancel','confirm'])handleLionBathInput(e,a,h,0);assert.equal(e.phase,phase);}
 e.phase='bathReveal';e.startAt=0;updateLionBath(e,4899,h);assert.equal(seen,0);updateLionBath(e,4900,h);assert.equal(seen,1);assert.equal(e.phase,'bathTalk');
 for(let i=0;i<3;i++)handleLionBathInput(e,'confirm',h,5000);assert.equal(e.phase,'bathExit');updateLionBath(e,6199,h);assert.equal(retreated,0);updateLionBath(e,6200,h);assert.equal(retreated,1);
});
test('cancel prompt and ordinary throne exit; reduced motion reaches unblurred final frame',()=>{
 let n=0;const h={retreat:()=>n++};const e=createLionAftermath(1,2,0);e.phase='bathPrompt';handleLionBathInput(e,'cancel',h,0);handleLionBathInput(createLionAftermath(1,2,1),'confirm',h,0);assert.equal(n,2);
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

test('first/repeat pity boundaries, wins reset and floor resets discard visits',()=>{
 for(const [seen,limit,chance] of [[false,50,.05],[true,200,.005]]){
 resetLionBathVisits();for(let i=1;i<limit;i++)assert.equal(rollLionBath(seen,1),false);assert.equal(rollLionBath(seen,1),true);assert.equal(rollLionBath(seen,1),false);
 resetLionBathVisits();assert.equal(rollLionBath(seen,chance),false);assert.equal(rollLionBath(seen,chance-.000001),true);
 for(let i=1;i<limit;i++)assert.equal(rollLionBath(seen,1),false);resetLionBathVisits();assert.equal(rollLionBath(seen,1),false);
 }
});
test('prompt ignores A/B for 3000ms without queuing, then presents choices',()=>{
 const e=createLionAftermath(0,0,0,false,100);let text='',retreats=0;const h={say:t=>text=t,retreat:()=>retreats++};
 assert.equal(e.phase,'bathPromptLocked');assert.doesNotMatch(e.message,/Aボタン/);
 for(let n=0;n<3000;n+=100){handleLionBathInput(e,'confirm',h,100+n);handleLionBathInput(e,'cancel',h,100+n);updateLionBath(e,100+n,h);}
 assert.equal(e.phase,'bathPromptLocked');assert.equal(retreats,0);updateLionBath(e,3100,h);assert.match(text,/Aボタン：はい/);assert.equal(e.phase,'bathPrompt');handleLionBathInput(e,'cancel',h,3101);assert.equal(retreats,1);
});
