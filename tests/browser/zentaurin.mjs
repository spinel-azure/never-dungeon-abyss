import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.ZENTAURIN_TEST_URL||'http://127.0.0.1:4179';
const out=path.resolve('artifacts/zentaurin');await mkdir(out,{recursive:true});
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const audio=await readFile(new URL('../../js/audio.js',import.meta.url),'utf8');
const hook=`window.zqa={
 setup(aries){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'ZENTAURIN QA',job:'mage'});character.level=197;character=normalizeCharacter(character);character.lootBagTutorialSeen=true;character.cards.ownedCardCounts.zodiac_aries=1;character.cards.deckSlots=aries?['zodiac_aries']:[];saveEnabled=true;currentDepth=96;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);state.torchFuel=100;setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},
 async encounter(){const {startBossEvent}=await import('/js/player.js');startBossEvent('zentaurin_b96f',state.gridX,state.gridY);},
 state:()=>structuredClone(character),confirm:()=>handleOverlayEventInput('confirm'),action:handleBattleInput,
 save:saveGame,load:()=>continueGame('auto'),begin:()=>beginBossBattle('zentaurin_b96f'),replay:s=>finishBattleVictory(s),
 gallery(){character.cards={ownedCardIds:['zodiac_sagittarius'],ownedCardCounts:{zodiac_sagittarius:1},deckSlots:['zodiac_sagittarius',null,null,null,null,null]};character.deckTutorialSeen=true;openLibraryCardGallery();}
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/audio.js',r=>r.fulfill({contentType:'text/javascript',body:audio+'\nwindow.zBgm=()=>({key:audio.desiredBgmKey,url:audio.bgmUrls.get(audio.desiredBgmKey)});'}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.zbattle={state:()=>structuredClone(battleUi.battle),idle:()=>!battleUi.presenting,reveal(){battleUi.concealed=false;renderBattle();},escape:attemptEscape,command:executeCommand,snapshot:()=>createBattleCompletionSnapshot(battleUi.battle),weaken(){battleUi.battle.enemy.hp=1;battleUi.battle.player.hp=battleUi.battle.player.maxHp;}};`}));
 await page.goto(origin);await page.waitForFunction(()=>window.zqa);
 for(const aries of (process.env.ZENTAURIN_GALLERY_ONLY ? [] : [false,true])){
  await page.evaluate(aries=>zqa.setup(aries),aries);await page.evaluate(()=>zqa.encounter());
  await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('女性のケンタウロス'));
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(out,`${label}-${aries}-room.png`)});
  if(touch)await page.locator('#buttonA').tap();else await page.evaluate(()=>zqa.confirm());
  assert.match(await page.locator('#message').innerText(),/おもむろに矢を番えた/);
  await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>zbattle.state()),null);
  await page.waitForFunction(()=>zbattle.state()?.enemy?.id==='zentaurin_b96f');
  assert.equal((await page.evaluate(()=>zbattle.state())).player.battleSkillSealed,!aries);
  await page.screenshot({path:path.join(out,`${label}-${aries}-opening.png`)});
  await page.waitForFunction(()=>zbattle.idle());await page.evaluate(()=>zbattle.reveal());
  assert.match((await page.evaluate(()=>zBgm())).url,/battle-of-galfer.mp3$/);
  assert.match(await page.locator('#battleEnemyImage').getAttribute('src'),/boss_24.avif$/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(!aries){await page.locator('[data-battle-command="skills"]').click();assert.match(await page.locator('#message').innerText(),/封印の矢/);}
  await page.screenshot({path:path.join(out,`${label}-${aries}-commands.png`)});
  await page.evaluate(()=>zbattle.escape());assert.equal((await page.evaluate(()=>zbattle.state())).outcome,'escaped');
  await page.evaluate(()=>zqa.action('confirm'));assert.equal((await page.evaluate(()=>zqa.state())).eventFlags.achievement_zentaurin_defeated,undefined);
  await page.evaluate(()=>zqa.encounter());await page.evaluate(()=>zqa.confirm());await page.waitForFunction(()=>zbattle.state()?.enemy?.id==='zentaurin_b96f'&&zbattle.idle());
  assert.equal((await page.evaluate(()=>zbattle.state())).enemy.hp,40000);
  await page.evaluate(()=>{zbattle.weaken();window.zRandom=Math.random;Math.random=()=>.1;});
  await page.evaluate(()=>zbattle.command({type:'attack'}));await page.waitForFunction(()=>zbattle.state()?.outcome==='victory'&&zbattle.idle());
  const snap=await page.evaluate(()=>zbattle.snapshot());await page.evaluate(()=>{Math.random=window.zRandom;zqa.action('confirm');});
  const won=await page.evaluate(()=>zqa.state());assert.equal(won.eventFlags.achievement_zentaurin_defeated,true);
  assert.equal(won.cards.ownedCardCounts.zodiac_sagittarius,1);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${label}-${aries}-reward.png`)});
  await page.evaluate(s=>zqa.replay(s),snap);assert.equal((await page.evaluate(()=>zqa.state())).cards.ownedCardCounts.zodiac_sagittarius,1);
  await page.evaluate(()=>{zqa.save();zqa.load();});assert.equal(await page.evaluate(()=>zqa.begin()),false);
 }
 if(process.env.ZENTAURIN_GALLERY_ONLY)await page.evaluate(()=>zqa.setup(false));
 await page.waitForTimeout(3000);await page.evaluate(()=>zqa.gallery());
 await page.locator('[data-card-gallery-stage]').click();await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(out,`${label}-sagittarius-description.png`)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);results.push({layout:label,errors});await context.close();
}}finally{await browser.close();}
await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
