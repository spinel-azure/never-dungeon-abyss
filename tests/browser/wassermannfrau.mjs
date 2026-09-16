import {readFile,mkdir} from 'node:fs/promises';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),player=await readFile('js/player.js','utf8'),battle=await readFile('js/battle.js','utf8');
const hook=`window.wqa=async()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=18;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'水瓶テスト',job:'mage'});character.hp=character.maxHp=10000;character.sp=200;character.maxSp=1000;character.skillIds.push('lightning_bolt');setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();};window.waccess=()=>getCurrentSpecialDoorAccessBlock();window.wcharacter=()=>character;window.wstart=()=>beginBossBattle("wassermannfrau_b18f");`;
await mkdir('artifacts/wassermannfrau-ai',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844],['mobile-small',320,720]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:label!=='pc'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player+'\nwindow.wroom=()=>startSpecialRoomContentEvent({type:"eventBoss",bossId:"wassermannfrau_b18f"},1,1);window.wdoor=()=>startSpecialDoorLockEvent(1,1,"E");'}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.wbattle={escape:attemptEscape,finish:finishBattle,state:()=>battleUi.battle,use:executeCommand,idle:()=>!battleUi.presenting,render:renderBattle,spy:()=>{window.wsounds=[];battleUi.playSe=k=>wsounds.push(k);}};'}));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.wqa);await page.evaluate(()=>wqa());
 assert.equal(await page.evaluate(()=>waccess().blocked),false);
 await page.evaluate(()=>wdoor());assert.ok((await page.locator('#message').textContent()).includes('澄んだ水'));
 await page.evaluate(async()=>{(await import('/js/player.js')).handleOverlayEventInput('cancel');});
 assert.equal(await page.evaluate(async()=>Boolean((await import('/js/player.js')).state.overlayEvent)),false);
 await page.evaluate(()=>wroom());await page.waitForTimeout(500);
 assert.ok((await page.locator('#message').textContent()).includes('イマスグ'));
 await page.screenshot({path:`artifacts/wassermannfrau-ai/${label}-event.png`});
 await page.evaluate(async()=>{(await import('/js/player.js')).handleOverlayEventInput('cancel');});
 assert.equal(await page.evaluate(async()=>Boolean((await import('/js/player.js')).state.overlayEvent)),false);
 await page.evaluate(()=>wroom());await page.evaluate(async()=>{(await import('/js/player.js')).handleOverlayEventInput('confirm');});
 await page.waitForFunction(()=>window.wbattle.state()?.enemy.id==='wassermannfrau_b18f');await page.waitForFunction(()=>wbattle.idle());
 assert.equal(await page.locator('#bossMagicBarrierMeter').textContent(),'♒ 1000 / 1000');
 const fits = await page.evaluate(() => {
   const frame = document.querySelector('#battleScreen').getBoundingClientRect();
   return ['battleEnemyName', 'battleBossHpMeter', 'bossMagicBarrierMeter'].every(id => {
     const rect = document.getElementById(id).getBoundingClientRect();
     return rect.top >= frame.top + 3 && rect.bottom <= frame.bottom - 3
       && rect.left >= frame.left + 3 && rect.right <= frame.right - 3;
   });
 });
 assert.ok(fits, `${label}: boss name and both gauges must fit inside the battle frame`);
 assert.ok((await page.locator('#battleEnemyImage').getAttribute('src')).endsWith('boss_26.avif'));
 await page.screenshot({path:`artifacts/wassermannfrau-ai/${label}-barrier.png`});
 await page.evaluate(()=>{const b=wbattle.state();b.enemy.bossMagicBarrier=10;wbattle.spy();Math.random=()=>.1;void wbattle.use({type:'skill',skillId:'lightning_bolt'});});
 await page.locator('.boss-barrier-shatter').waitFor({state:'attached'});
 await page.screenshot({path:`artifacts/wassermannfrau-ai/${label}-shatter.png`});
 await page.waitForFunction(()=>wbattle.idle());assert.equal(await page.locator('.boss-barrier-shatter').count(),0);assert.equal(await page.evaluate(()=>wbattle.state().enemy.hp),4000);assert.equal(await page.evaluate(()=>wsounds.filter(s=>s==='crystalObstacleBreak').length),1);assert.equal(await page.evaluate(()=>wsounds.includes('attackHit')),false);
 assert.equal(await page.locator('#bossMagicBarrierMeter').textContent(),'♒ 0 / 1000');await page.screenshot({path:`artifacts/wassermannfrau-ai/${label}-broken.png`});
 await page.evaluate(()=>{const b=wbattle.state();void wbattle.use({type:'guard'});});await page.waitForFunction(()=>wbattle.idle());assert.ok(await page.evaluate(()=>wbattle.state().enemy.bossMagicBarrier>0));
 await page.evaluate(async()=>{const b=wbattle.state();b.enemy.hp=1900;const {resolveBattleOutcome}=await import('/combat/battle-engine.js');resolveBattleOutcome(b);b.enemy.bossMagicBarrier=900;b.player.sp=400;const {absorbPlayerMagic}=await import('/combat/boss-magic-barrier.js');absorbPlayerMagic(b,b.enemy,b.player,{});});
 assert.equal(await page.evaluate(()=>wbattle.state().enemy.magicReleased),true);
 assert.equal(await page.evaluate(()=>wbattle.state().enemy.reservedEnemyAction.id),'wassermannfrau_tide');
 await page.evaluate(()=>{void wbattle.use({type:'guard'});});await page.waitForFunction(()=>wbattle.idle());
 assert.ok(await page.evaluate(()=>wbattle.state().log.some(s=>s.includes('水瓶の満潮！'))));
 await page.screenshot({path:`artifacts/wassermannfrau-ai/${label}-tide.png`});
 await page.evaluate(()=>{wbattle.escape();});assert.equal(await page.evaluate(()=>wbattle.state().outcome),'escaped');
 await page.evaluate(()=>wbattle.finish());assert.ok(!(await page.evaluate(()=>wcharacter().eventFlags.boss_wassermannfrau_b18f_defeated)));
 await page.evaluate(()=>wstart());await page.waitForFunction(()=>wbattle.idle());assert.equal(await page.evaluate(()=>wbattle.state().enemy.bossMagicBarrier),1000);
 await page.evaluate(()=>{const b=wbattle.state();b.enemy.bossMagicBarrier=0;b.enemy.hp=1;void wbattle.use({type:'skill',skillId:'lightning_bolt'});});await page.waitForFunction(()=>wbattle.idle());
 assert.equal(await page.evaluate(()=>wbattle.state().outcome),'victory');await page.evaluate(()=>wbattle.finish());
 await page.waitForFunction(()=>wcharacter().eventFlags.boss_wassermannfrau_b18f_defeated);
 assert.equal(await page.evaluate(()=>wcharacter().cards.ownedCardCounts.zodiac_aquarius),1);
 assert.deepEqual(errors,[]);console.log(label+' room cancel, boss, gauge, shield break SE and absorption passed');await page.close();
}}finally{await browser.close();}
