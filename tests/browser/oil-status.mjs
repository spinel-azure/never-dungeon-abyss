import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const hook=`window.oilQa={async setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=normalizeCharacter({...createInitialCharacter({name:'NO_NAME',job:'warrior'}),level:197});character.hp=character.maxHp=9999;character.sp=character.maxSp=9999;character.cards.deckSlots=[];character.inventory={counts:{}};const {grantItem}=await import('/data/inventory.js');for(const id of ['fire_lizard_oil','ice_lizard_oil','lightning_lizard_oil'])character.inventory=grantItem(character.inventory,id,3).inventory;setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();const {createEnemyCombatant,getEnemyById}=await import('/data/enemies.js');const enemy=createEnemyCombatant(getEnemyById('fire_spirit'));enemy.hp=enemy.maxHp=99999;startBattle(enemy,{playStartSe:false});}};`;
await mkdir('artifacts/oil-status',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.oilBattle={use:executeCommand,idle:()=>!battleUi.presenting,escape:attemptEscape,finish:finishBattle,state:()=>battleUi.battle};`}));
await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.oilQa);await page.evaluate(()=>oilQa.setup());
await page.evaluate(()=>{window.oilMessages=[];window.oilObserver=new MutationObserver(()=>oilMessages.push(document.querySelector('#message').textContent));oilObserver.observe(document.querySelector('#message'),{childList:true,subtree:true,characterData:true});void oilBattle.use({type:'item',itemId:'lightning_lizard_oil'});});
await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('雷蜥蜴の油を使用した！'));
assert.equal(await page.locator('#quickWeaponElement').getAttribute('alt'),'雷属性');
await page.screenshot({path:`artifacts/oil-status/${label}-use.png`});await page.waitForFunction(()=>oilBattle.idle());
await page.evaluate(async()=>{const {openBattleItems}=await import('/js/battle.js');openBattleItems();});
const fire=page.locator('[data-item-list] button').filter({hasText:'火蜥蜴の油'}),ice=page.locator('[data-item-list] button').filter({hasText:'氷蜥蜴の油'}),lightning=page.locator('[data-item-list] button').filter({hasText:'雷蜥蜴の油'});
assert.equal(await fire.isDisabled(),false);assert.equal(await ice.isDisabled(),false);assert.equal(await lightning.isDisabled(),true);
assert.equal(await page.locator('#quickWeaponElement').getAttribute('alt'),'雷属性');await page.screenshot({path:`artifacts/oil-status/${label}-items.png`});
await page.locator('[data-item-back]').click();await page.evaluate(()=>oilBattle.escape());await page.evaluate(()=>oilBattle.finish());assert.equal(await page.locator('#quickWeaponElement').isVisible(),false);
assert.deepEqual(errors,[]);console.log(label+' passed');await page.close();
}}finally{await browser.close();}
