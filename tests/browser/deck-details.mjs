import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.NDA_TEST_URL||'http://127.0.0.1:4173';
const source=await readFile('js/main.js','utf8');
const menu=await readFile('js/menu.js','utf8');
const hook=`window.deckQa={setup(){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'Deck QA',job:'priest'});character.deckCost=99;
 character.cards={ownedCardIds:['super_rare_max_hp_up','sr_spirit_abundance','sr_sp_saver_plus'],ownedCardCounts:{super_rare_max_hp_up:1,sr_spirit_abundance:1,sr_sp_saver_plus:1},deckSlots:['super_rare_max_hp_up','sr_spirit_abundance','sr_sp_saver_plus',null,null,null]};
 character.lootBagTutorialSeen=true;character.deckTutorialSeen=true;worldLocation='dungeon';
 setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();openDeckEditor();
},cards:()=>JSON.stringify(character.cards)};`;
await mkdir('artifacts/deck-details',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{
 for(const [label,width,height,touch,motion] of [['pc',1280,900,false,'no-preference'],['mobile',390,844,true,'no-preference'],['narrow',320,720,true,'reduce']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:motion});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/menu.js',r=>r.fulfill({contentType:'text/javascript',body:menu+'\nwindow.deckMenuQa={input:handleMenuInput,readonly(){menu.deckEditable=false;renderDeck();},view:()=>menu.view};'}));
 await page.goto(origin);await page.waitForFunction(()=>window.deckQa);await page.evaluate(()=>deckQa.setup());
 await page.evaluate(()=>document.fonts.ready);
 const before=await page.evaluate(()=>deckQa.cards());
 await page.locator('[data-deck-slot="1"]').click();
 await page.screenshot({path:`artifacts/deck-details/${label}-deck.png`});
 assert.ok(await page.locator('.deck-slot-name').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=13));
 await page.locator('[data-deck-inspect]').click();
 const canvas=page.locator('[data-card-gallery-canvas]');
 assert.match(await canvas.getAttribute('aria-label'),/精神充実/);
 if(touch)await canvas.tap();else await canvas.click();
 await page.waitForTimeout(550);assert.match(await canvas.getAttribute('aria-label'),/詳細面/);
 await page.screenshot({path:`artifacts/deck-details/${label}-back.png`});
 await page.evaluate(()=>deckMenuQa.input('cancel'));
 assert.equal(await page.evaluate(()=>deckMenuQa.view()),'deck');
 assert.equal(await page.locator('[data-deck-slot="1"]').evaluate(el=>el.classList.contains('is-selected')),true);
 assert.equal(await page.evaluate(()=>deckQa.cards()),before);
 await page.locator('[data-deck-add]').click();assert.equal(await page.locator('[data-deck-picker]').isVisible(),true);
 await page.evaluate(()=>deckMenuQa.input('cancel'));
 await page.evaluate(()=>deckMenuQa.readonly());
 await page.evaluate(()=>deckMenuQa.input('confirm'));
 assert.equal(await page.evaluate(()=>deckMenuQa.view()),'cardGallery');
 await page.evaluate(()=>deckMenuQa.input('confirm'));await page.waitForTimeout(550);
 assert.match(await canvas.getAttribute('aria-label'),/詳細面/);
 await page.evaluate(()=>deckMenuQa.input('cancel'));
 await page.locator('[data-deck-slot="3"]').click();assert.equal(await page.locator('[data-deck-inspect]').isDisabled(),true);
 assert.equal(await page.evaluate(()=>deckQa.cards()),before);
 await page.evaluate(async()=>{(await import('/js/menu.js')).openLibraryCardGallery();});
 await page.evaluate(()=>deckMenuQa.input('cancel'));
 assert.equal(await page.evaluate(()=>deckMenuQa.view()),'dungeon');
 assert.deepEqual(errors,[]);results.push({label,passed:true});await context.close();
 }
 await writeFile('artifacts/deck-details/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
