import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(join(tmpdir(),'nda-return-'));
const main=await readFile('js/main.js','utf8');
const hook=`window.returnQa={
 setup({depth=10,carry=10000,card=null,loot=false,guild=0,npc=false}={}) {
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  saveEnabled=false;character=createInitialCharacter({name:'帰還検証',job:'warrior'});
  character.gold=10000;character.carriedExperience=carry;character.guildExperiencePool=guild;
  character.lootBagTutorialSeen=true;character.firstDungeonTutorialSeen=true;
  character.eventFlags={inn_visited:true,transfer_portal_b80f_unlocked:true};
  if(npc) {
   character.npcSystem=registerNpc(character.npcSystem,'alec').system;
   character=hireNpc(character,'alec').character;
  }
  if(card)character.cards.deckSlots=[card];
  if(loot)character.lootBag.gold=10;
  worldLocation='dungeon';currentDepth=depth;resetDungeon('',null,true);
  setBgmOptions({enabled:false});setSeOptions({enabled:false});setTownTypewriterOptions({enabled:false});
  updateCharacterUi();
 },
 return:()=>returnToTown(),defeat:()=>{void completeDungeonDefeat()},
 inn:()=>{openTown({registrationRequired:false,facilityId:'inn',mode:'facilityMenu'});void stayAtInn({fee:1})},
 stable:()=>{openTown({registrationRequired:false,facilityId:'inn',mode:'facilityMenu'});void stayAtInnStable()},
 deep:()=>{currentDepth=80;worldLocation='dungeon';returnToTown()},
 input:dispatchGamepadAction,snapshot:makeSaveSnapshot,restore:(snapshot)=>{
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  setBgmOptions({enabled:false});setSeOptions({enabled:false});saveEnabled=false;
  return restoreGame(snapshot);
 },
 read:()=>({alive:character.alive,hp:character.hp,experience:character.experience,level:character.level,carry:character.carriedExperience,pool:character.guildExperiencePool,pending:character.returnPresentation,transition:sceneTransitionRunning}),
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
 const page=await browser.newPage({viewport:{width,height}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{navigator.getGamepads=()=>[]});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady="true";')}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.returnQa);
 if(!process.env.RETURN_EXTRA) {
 await page.evaluate(()=>{returnQa.setup({loot:true});returnQa.return()});
 await page.locator('#lootIdentifyOverlay').waitFor({state:'visible'});
 assert.equal(await page.locator('#experienceSettlementOverlay').isVisible(),false);
 await page.locator('#lootIdentifyAction').click();
 await page.locator('#lootIdentifyAction').click();
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.match(await page.locator('#experienceSettlementDetail').textContent(),/10,500/);
 assert.equal((await page.evaluate(()=>returnQa.read())).level,1);
 assert.equal(await page.locator('.experience-settlement-notice').isVisible(),true);
 assert.equal(await page.locator('.experience-settlement-prompt').textContent(),'＊Aボタンで次へ');
 await page.evaluate(()=>returnQa.input('cancel'));
 assert.equal(await page.locator('#experienceSettlementOverlay').isVisible(),true);
 const fits=await page.locator('#experienceSettlementOverlay').evaluate(e=>{
  const outer=e.getBoundingClientRect();
  return [...e.children].filter(c=>!c.hidden).every(c=>{const r=c.getBoundingClientRect();return r.top>=outer.top && r.bottom<=outer.bottom && r.left>=outer.left && r.right<=outer.right});
 });
 assert.equal(fits,true,'settlement content fits the main frame');
 await page.screenshot({path:join(output,label+'-settlement.png')});
 await page.evaluate(()=>returnQa.input('confirm'));
 assert.equal(await page.locator('#experienceSettlementOverlay').evaluate(e=>e.classList.contains('is-dismissing')),true);
 await page.waitForFunction(()=>!returnQa.read().pending);
 if(process.env.RETURN_NOTICE_ONLY) {
  await page.evaluate(()=>{returnQa.setup({carry:0});returnQa.return()});
  await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
  assert.equal(await page.locator('.experience-settlement-notice').isVisible(),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>returnQa.input('confirm'));
  await page.waitForFunction(()=>!returnQa.read().pending);
  await page.evaluate(()=>{returnQa.setup({npc:true});returnQa.return()});
  await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
  await page.evaluate(()=>{returnQa.input('confirm');returnQa.input('confirm')});
  await page.waitForFunction(()=>document.querySelector('.is-npc-management')!==null);
  assert.deepEqual(errors,[]);console.log(label+' notice passed');await page.close();continue;
 }
 await page.evaluate(()=>returnQa.deep());
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,10500);
 await page.evaluate(()=>returnQa.input('confirm'));
 await page.waitForFunction(()=>!returnQa.read().pending);
 await page.evaluate(()=>returnQa.inn());
 await page.locator('#levelUpEffect').waitFor({state:'visible',timeout:20000});
 assert.equal(await page.locator('#sceneTransition').evaluate(e=>e.classList.contains('is-black')),true);
 assert.equal(await page.locator('#levelUpEffect').evaluate(e=>e.parentElement.id),'sceneTransition');
 await page.screenshot({path:join(output,label+'-level.png')});
 await page.waitForFunction(()=>!returnQa.read().transition);
 const leveled=await page.evaluate(()=>returnQa.read());assert.ok(leveled.level>1);assert.equal(leveled.experience,10500);
 await page.evaluate(()=>returnQa.inn());await page.waitForFunction(()=>!returnQa.read().transition,{},{timeout:20000});
 assert.equal((await page.evaluate(()=>returnQa.read())).level,leveled.level);
 // Protected death: no loot -> settlement -> prayer. Reload on the settlement screen.
 const {GODDESS_GRACE_CARD_ID}=await import('../../data/cards.js');
 await page.evaluate(card=>{returnQa.setup({card});returnQa.defeat()},GODDESS_GRACE_CARD_ID);
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.match(await page.locator('#experienceSettlementDetail').textContent(),/適用なし/);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,10000);
 await page.evaluate(()=>returnQa.input('confirm'));
 await page.locator('#revivalPrayer').waitFor({state:'visible'});
 await page.waitForFunction(()=>!returnQa.read().pending,{},{timeout:30000});
 await page.evaluate(()=>{returnQa.setup({carry:500});returnQa.defeat()});
 await page.locator('#revivalPrayer').waitFor({state:'visible'});
 assert.equal(await page.locator('#experienceSettlementOverlay').isVisible(),false);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,0);
 await page.waitForFunction(()=>!returnQa.read().pending,{},{timeout:30000});
 // Future guild pool: separate settlement on the black screen, then level-up.
 await page.evaluate(()=>{returnQa.setup({carry:0,guild:1000});returnQa.inn()});
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#experienceSettlementDetail').textContent(),/依頼報酬経験値/);
 assert.doesNotMatch(await page.locator('#experienceSettlementDetail').textContent(),/深層|ヨハンナ/);
 await page.evaluate(()=>returnQa.input('confirm'));
 await page.locator('#levelUpEffect').waitFor({state:'visible'});
 await page.waitForFunction(()=>!returnQa.read().transition);
 assert.equal((await page.evaluate(()=>returnQa.read())).pool,0);

 }
 // Resume already-awarded loot/experience without replaying any award; renewal comes last.
 await page.evaluate(()=>{returnQa.setup({loot:true,npc:true});returnQa.return()});
 await page.locator('#lootIdentifyOverlay').waitFor({state:'visible'});
 let snapshot=await page.evaluate(()=>returnQa.snapshot());
 await page.reload();await page.waitForFunction(()=>window.returnQa);
 assert.equal(await page.evaluate(s=>returnQa.restore(s),snapshot),true);
 await page.locator('#lootIdentifyOverlay').waitFor({state:'visible'});
 assert.equal(await page.locator('#experienceSettlementOverlay').isVisible(),false);
 await page.locator('#lootIdentifyAction').click();await page.locator('#lootIdentifyAction').click();
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 snapshot=await page.evaluate(()=>returnQa.snapshot());
 await page.reload();await page.waitForFunction(()=>window.returnQa);
 assert.equal(await page.evaluate(s=>returnQa.restore(s),snapshot),true);
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.equal(await page.locator('#lootIdentifyOverlay').isVisible(),false);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,10500);
 await page.evaluate(()=>returnQa.input('confirm'));
 await page.waitForFunction(()=>document.querySelector('.is-npc-management')!==null);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,10500);
 // Stable lodging uses the same black-screen growth path.
 await page.evaluate(()=>{returnQa.setup({carry:0,guild:1000});returnQa.stable()});
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible',timeout:20000});
 await page.locator('#experienceSettlementOverlay').click();
 await page.locator('#levelUpEffect').waitFor({state:'visible'});
 assert.equal(await page.locator('#sceneTransition').evaluate(e=>e.classList.contains('is-black')),true);
 await page.waitForFunction(()=>!returnQa.read().transition);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,1000);
 // Death with loot and Mercy: reload before settlement, revival, then renewal.
 const {GODDESS_MERCY_CARD_ID}=await import('../../data/cards.js');
 await page.evaluate(card=>{returnQa.setup({loot:true,npc:true,card});returnQa.defeat()},GODDESS_MERCY_CARD_ID);
 await page.locator('#lootIdentifyOverlay').waitFor({state:'visible'});
 await page.locator('#lootIdentifyAction').click();await page.locator('#lootIdentifyAction').click();
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 snapshot=await page.evaluate(()=>returnQa.snapshot());
 await page.reload();await page.waitForFunction(()=>window.returnQa);
 assert.equal(await page.evaluate(s=>returnQa.restore(s),snapshot),true);
 await page.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.match(await page.locator('#experienceSettlementDetail').textContent(),/女神の慈愛/);
 assert.equal((await page.evaluate(()=>returnQa.read())).alive,false);
 await page.evaluate(()=>returnQa.input('confirm'));
 await page.locator('#revivalPrayer').waitFor({state:'visible'});
 await page.waitForFunction(()=>!returnQa.read().pending,{},{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('.is-npc-management')!==null);
 assert.equal((await page.evaluate(()=>returnQa.read())).experience,10000);
 assert.equal((await page.evaluate(()=>returnQa.read())).alive,true);
 assert.equal((await page.evaluate(()=>returnQa.read())).hp,1);
 assert.deepEqual(errors,[]);console.log(label+' passed');await page.close();
}
console.log(output);
} finally {await browser.close()}
