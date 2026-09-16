import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const hook=`window.shopQa=()=>{character=syncShopNotifications(createInitialCharacter({name:'商店テスト',job:'mage'})).character;character.highestDungeonDepthReached=70;shopNotificationController.request();};window.aquariusQa=async()=>{
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';firstDungeonTutorialActive=false;deckTutorialActive=false;
 character=createInitialCharacter({name:'水瓶テスト',job:'mage'});character.hp=character.maxHp=1000;character.sp=0;character.maxSp=100;character.cards.deckSlots=['zodiac_aquarius','common_guard_stone'];character.skillIds.push('lightning_bolt');
 setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 const {createBossCombatant}=await import('/data/bosses.js');const e=createBossCombatant('tiefstrom_b76f');e.actions=[{weight:1,action:{id:'wait',actionType:'wait'}}];startBattle(e,{playStartSe:false});};`;
await mkdir('artifacts/aquarius',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:label==='mobile'});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('function canPresentPassiveNotification() {','function canPresentPassiveNotification() { return true;').replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.aqa={use:executeCommand,state:()=>battleUi.battle,idle:()=>!battleUi.presenting};'}));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.aquariusQa);await page.evaluate(()=>aquariusQa());
 assert.equal(await page.locator('#aquariusBarrierStatus').textContent(),'♒100');assert.equal(await page.locator('#sphinxBarrierStatus output').textContent(),'15');
 await page.screenshot({path:`artifacts/aquarius/${label}.png`});
 await page.evaluate(()=>{Math.random=()=>.1;void aqa.use({type:'skill',skillId:'lightning_bolt'});});await page.waitForFunction(()=>aqa.idle());
 assert.equal(await page.evaluate(()=>aqa.state().player.sp),0);
 assert.equal(await page.locator('#aquariusBarrierStatus').textContent(),'♒100');
 assert.equal(await page.locator('.aquarius-barrier-icon').evaluate(el=>getComputedStyle(el).borderTopStyle),'solid');
 await page.evaluate(()=>shopQa());
 await page.waitForFunction(()=>document.querySelector('#shopStockNotification').classList.contains('is-message'));
 assert.equal(await page.locator('.shop-stock-detail').textContent(),'商店に商品が追加されました！');
 assert.equal(await page.locator('#shopStockNotification').evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(255, 98, 110)');
 await page.waitForTimeout(700);
 await page.screenshot({path:`artifacts/aquarius/${label}-shop.png`});
 console.log(label+' double barrier and SP0 cast passed');await page.close();
}}finally{await browser.close();}