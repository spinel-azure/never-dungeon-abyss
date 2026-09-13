// Isolated contexts and served-module hooks; never changes a user's saves or production APIs.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const origin=process.env.FOLLOW_UP_TEST_URL || "http://127.0.0.1:4179";
const output=path.resolve("artifacts/follow-up-plus");
const source=await readFile(new URL("../../js/main.js",import.meta.url),"utf8");
const hook=`window.followUpQa={
 setup(){
  document.querySelector('#titleScreen').hidden=true;
  document.body.classList.remove('title-active');
  character=createInitialCharacter({name:'FOLLOW UP QA',job:'mage'});
  character.level=40; character=normalizeCharacter(character);
  character.cards={ownedCardIds:['common_follow_up','sr_follow_up_plus'],ownedCardCounts:{common_follow_up:1,sr_follow_up_plus:1},deckSlots:['common_follow_up','sr_follow_up_plus',null,null,null,null]};
  character.lootBagTutorialSeen=true; character.deckTutorialSeen=true;
  saveEnabled=true; currentDepth=1; worldLocation='dungeon';
  closeCampMenu(); closeTown(); resetDungeon('',null,true);
  setBgmOptions({enabled:false});setSeOptions({enabled:false}); updateCharacterUi();
 },
 deck:openDeckEditor, gallery:openLibraryCardGallery,
 victory:finishBattleVictory, state:()=>structuredClone(character), save:saveGame,
 load:()=>continueGame('auto')
};`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
 for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/js/main.js?*',route=>route.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.goto(origin); await page.waitForFunction(()=>window.followUpQa);
  await page.evaluate(()=>{followUpQa.setup();followUpQa.deck();});
  await page.locator('[data-deck-slot="1"]').click();
  assert.match(await page.locator('[data-deck-detail]').textContent(),/\[SR\] 追撃＋.*固定50.*COST 4/);
  assert.equal(await page.locator('[data-deck-used-cost]').textContent(),'5');
  assert.equal(await page.locator('[data-deck-slots] canvas').count(),2);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false);
  await page.screenshot({path:path.join(output,`${label}-deck.png`)});
  await page.locator('[data-deck-add]').click();
  await page.screenshot({path:path.join(output,`${label}-picker.png`)});
  await page.evaluate(()=>followUpQa.gallery());
  await page.locator('[data-card-gallery-filter="SR"]').click();
  await page.screenshot({path:path.join(output,`${label}-front.png`)});
  await page.locator('[data-card-gallery-stage]').click();
  await page.waitForTimeout(600);
  await page.screenshot({path:path.join(output,`${label}-description.png`)});
  const result=await page.evaluate(async()=>{
   followUpQa.setup();
   const {createBattleState,resolveBattleRound}=await import('/combat/battle-engine.js');
   const {createBattleCompletionSnapshot}=await import('/js/battle.js');
   const {createEnemyCombatant,getEnemyById}=await import('/data/enemies.js');
   const {loadGame}=await import('/js/save-data.js');
   const before=followUpQa.state();
   const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));
   enemy.hp=enemy.maxHp=9999;enemy.experienceReward=10;enemy.fixedGoldPerDefeat=true;enemy.dropGold=7;
   enemy.actions=[{id:'wait',name:'待機',actionType:'wait',weight:1}];
   const baseline=resolveBattleRound({battle:createBattleState({character:before,enemy}),playerCommand:{type:'skill',skillId:'fireball'},rng:()=>0.5}).battle;
   const direct=baseline.presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player').reduce((sum,e)=>sum+e.damage,0);
   enemy.hp=enemy.maxHp=direct+55;
   const battle=resolveBattleRound({battle:createBattleState({character:before,enemy}),playerCommand:{type:'skill',skillId:'fireball'},rng:()=>0.5}).battle;
   const snapshot=createBattleCompletionSnapshot(battle);
   followUpQa.victory(snapshot);
   const after=followUpQa.state();
   followUpQa.save();
   const saved=loadGame('auto'); followUpQa.load();
   return {outcome:battle.outcome,follow:battle.presentationEvents.filter(e=>e.type==='followUpDamage').map(e=>e.damage),before,after,saved:saved.character,loaded:followUpQa.state()};
  });
  assert.equal(result.outcome,'victory');assert.deepEqual(result.follow,[60]);
  assert.equal(result.after.compendium.monsters.abyss_rat.defeatCount,1);
  assert.equal(result.after.carriedExperience-result.before.carriedExperience,10);
  assert.equal(result.loaded.carriedExperience,10);
  assert.equal(result.loaded.compendium.monsters.abyss_rat.defeatCount,1);
  assert.equal(result.loaded.lootBag.gold,7);
  assert.equal(result.after.lootBag.gold-result.before.lootBag.gold,7);
  assert.deepEqual(result.saved.cards,result.after.cards);
  assert.deepEqual(result.loaded.cards,result.after.cards);
  assert.equal(result.after.cards.ownedCardCounts.sr_follow_up_plus,1);
  assert.deepEqual(errors,[]);
  results.push({label,errors,result});await context.close();
 }
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(({label,errors,result})=>({label,errors,outcome:result.outcome,follow:result.follow,carriedExperienceBefore:result.before.carriedExperience,carriedExperienceAfter:result.after.carriedExperience,lootBefore:result.before.lootBag,lootAfter:result.after.lootBag})),null,2));
} finally {await browser.close();}