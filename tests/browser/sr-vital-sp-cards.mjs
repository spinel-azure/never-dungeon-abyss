import assert from "node:assert/strict";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("playwright");
const origin=process.env.SR_CARDS_TEST_URL||"http://127.0.0.1:4179";
const output=path.resolve("artifacts/sr-vital-sp-cards");
const main=await readFile(new URL("../../js/main.js",import.meta.url),"utf8");
const playerSource=await readFile(new URL("../../js/player.js",import.meta.url),"utf8");
const hook=`window.srQa={
 setup(){
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  character=createInitialCharacter({name:'SR QA',job:'priest'});character.level=100;character=normalizeCharacter(character);
  character.cards={ownedCardIds:['sr_vital_abundance','sr_spirit_abundance','sr_sp_saver_plus'],ownedCardCounts:{sr_vital_abundance:3,sr_spirit_abundance:3,sr_sp_saver_plus:1},deckSlots:['sr_vital_abundance','sr_spirit_abundance','sr_sp_saver_plus',null,null,null]};
  character=normalizeCharacter(character);character.lootBagTutorialSeen=true;character.deckTutorialSeen=true;
  saveEnabled=true;currentDepth=1;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);
  setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 },
 purpleSetup(){this.setup();character.cards={ownedCardIds:[],ownedCardCounts:{},deckSlots:[null,null,null,null,null,null]};character=normalizeCharacter(character);currentDepth=70;resetDungeon('',null,true);},
 purpleStart(){const cell=cells.flat().find(c=>c.treasure==='purple');if(!cell)throw new Error('no purple chest');state.gridX=cell.x;state.gridY=cell.y;cell.treasureTrapId=null;window.srStartFloor('purple',cell.x,cell.y);},
 settle(){character=normalizeCharacter(settleLootBag(character).character);saveGame();continueGame('auto');return structuredClone(character.cards);},
 state:()=>structuredClone(character),deck:openDeckEditor,gallery:openLibraryCardGallery,status:openStatusMenu,
 async skills(context,sp,combined){
  (await import("/js/skill-overlay.js")).closeSkillOverlay();
  closeCampMenu('test');character.skillIds=['greater_healing'];character.hp=1;character.sp=sp;
  character.cards.ownedCardCounts.common_sp_saver=1;
  character.cards.ownedCardIds=[...new Set([...character.cards.ownedCardIds,'common_sp_saver'])];
  character.cards.deckSlots[3]=combined?'common_sp_saver':null;character=normalizeCharacter(character);
  window.srUsed=null;
  openSkillOverlay({context,character,onUse:async skillId=>{
   if(context==='field'){const result=await useFieldSkill(skillId);window.srUsed={accepted:result.accepted,sp:character.sp};return result;}
   const {createBattleState,resolveBattleRound}=await import('/combat/battle-engine.js');
   const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));enemy.hp=enemy.maxHp=9999;
   const result=resolveBattleRound({battle:createBattleState({character,enemy}),playerCommand:{type:'skill',skillId},rng:()=>0.5});
   window.srUsed={accepted:result.accepted,sp:result.battle.player.sp};return result;
  }});
 }
};`;
await mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
 for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route("**/js/player.js",r=>r.fulfill({contentType:"text/javascript",body:playerSource+"\nwindow.srStartFloor=startTreasureEvent;"}));
  await page.goto(origin);await page.waitForFunction(()=>window.srQa);await page.evaluate(()=>{srQa.setup();srQa.deck();});
  assert.equal(await page.locator('[data-deck-used-cost]').textContent(),'12');
  await page.screenshot({path:path.join(output,`${label}-deck.png`)});
  await page.evaluate(()=>srQa.gallery());
  for(const id of ['sr_vital_abundance','sr_spirit_abundance','sr_sp_saver_plus']){
   await page.screenshot({path:path.join(output,`${label}-${id}-front.png`)});
   await page.locator('[data-card-gallery-stage]').click();await page.waitForTimeout(150);
   await page.screenshot({path:path.join(output,`${label}-${id}-description.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(id!=='sr_sp_saver_plus')await page.evaluate(async()=>{(await import("/js/card-gallery.js")).handleCardGalleryInput("right");});
  }
  await page.evaluate(()=>srQa.status());await page.screenshot({path:path.join(output,`${label}-status.png`)});
  const costs=[];
  for(const mode of ['field','battle'])for(const combined of [false,true]){
   const expected=combined?6:7;
   await page.evaluate(({mode,combined,sp})=>srQa.skills(mode,sp,combined),{mode,combined,sp:expected-1});
   let button=page.locator('[data-skill-id="greater_healing"]');assert.equal(await button.isDisabled(),true);assert.equal(await button.locator('small').textContent(),`SP${expected}`);
   await page.evaluate(({mode,combined,sp})=>srQa.skills(mode,sp,combined),{mode,combined,sp:expected});
   button=page.locator('[data-skill-id="greater_healing"]');assert.equal(await button.isDisabled(),false);assert.equal(await button.locator('small').textContent(),`SP${expected}`);
   await page.screenshot({path:path.join(output,`${label}-${mode}-${combined?'combined':'sr'}-cost.png`)});
   await button.click();await page.waitForFunction(()=>window.srUsed);
   const used=await page.evaluate(()=>window.srUsed);assert.deepEqual(used,{accepted:true,sp:0});costs.push({mode,combined,expected,used});
  }
  const purpleAwards=[];
  for(const [roll,id] of [[.1,'sr_sp_saver_plus'],[.4,'sr_vital_abundance'],[.7,'sr_spirit_abundance'],[.92,'sr_follow_up_plus'],[.98,'sr_ability_boost']]){
   await page.evaluate(()=>srQa.purpleSetup());
   await page.evaluate(async roll=>{srQa.purpleStart();window.srOriginalRandom=Math.random;Math.random=()=>roll;(await import('/js/player.js')).handleOverlayEventInput('confirm');},roll);
   await page.waitForFunction(id=>srQa.state().lootBag.cards[id]===1,id);
   await page.evaluate(()=>{Math.random=window.srOriginalRandom;});
   const cards=await page.evaluate(()=>srQa.settle());assert.equal(cards.ownedCardCounts[id],1);purpleAwards.push(id);
  }
  assert.deepEqual(errors,[]);results.push({label,costs,purpleAwards,errors});await context.close();
 }
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}