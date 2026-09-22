import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.NDA_TEST_URL||'http://127.0.0.1:4173';
const source=await readFile('js/main.js','utf8');
const menu=await readFile('js/menu.js','utf8');
const hook=`window.deckQa={async setup(){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'Picker QA',job:'priest'});character.deckCost=99;
 const {CARDS}=await import('/data/cards.js');const ids=CARDS.map(c=>c.id);
 character.cards={ownedCardIds:ids,ownedCardCounts:Object.fromEntries(ids.map(id=>[id,3])),deckSlots:[ids[0],ids[1],ids[2],null,null,null]};
 character.lootBagTutorialSeen=true;character.deckTutorialSeen=true;worldLocation='dungeon';
 setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();openDeckEditor();
},cards:()=>JSON.stringify(character.cards)};`;
await mkdir('artifacts/deck-picker-layout',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
 for(const [label,width,height,touch] of [['pc',1920,960,false],['pc-short',1280,720,false],['tablet-portrait',768,1024,true],['tablet-landscape',1024,768,true],['mobile',390,844,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/menu.js',r=>r.fulfill({contentType:'text/javascript',body:menu+'\nwindow.deckInput=handleMenuInput;'}));
 await page.goto(origin);await page.waitForFunction(()=>window.deckQa);await page.evaluate(()=>deckQa.setup());await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-deck-add]').click();
 const check=async()=>{
 const sizes=await page.evaluate(()=>{
 const picker=document.querySelector('[data-deck-picker]'),list=picker.querySelector('[data-deck-picker-list]'),pager=picker.querySelector('.deck-picker-pager');
 const a=picker.getBoundingClientRect(),b=list.getBoundingClientRect(),c=pager.getBoundingClientRect();
 return {pickerTop:a.top,pickerBottom:a.bottom,pagerBottom:c.bottom,listBottom:b.bottom,pagerTop:c.top,overflow:picker.scrollHeight-picker.clientHeight,widthOverflow:picker.scrollWidth-picker.clientWidth};
 });
 assert.ok(sizes.pickerTop>=0,JSON.stringify(sizes));assert.ok(sizes.pagerBottom<=sizes.pickerBottom-1,JSON.stringify(sizes));assert.ok(sizes.listBottom<=sizes.pagerTop+1,JSON.stringify(sizes));assert.ok(sizes.overflow<=2,JSON.stringify(sizes));assert.ok(sizes.widthOverflow<=2,JSON.stringify(sizes));
 };
 await page.screenshot({path:`artifacts/deck-picker-layout/${label}.png`});await check();
 const before=await page.evaluate(()=>deckQa.cards());
 await page.locator('[data-deck-picker-nav="next"]').click();await check();
 for(let i=0;i<5;i++)await page.evaluate(()=>deckInput('down'));
 await page.evaluate(()=>deckInput('confirm'));
 assert.equal(await page.locator('[data-deck-picker]').isVisible(),false);assert.notEqual(await page.evaluate(()=>deckQa.cards()),before);
 await page.locator('[data-deck-add]').click();await check();await page.evaluate(()=>deckInput('cancel'));
 assert.equal(await page.locator('[data-deck-picker]').isVisible(),false);assert.deepEqual(errors,[]);
 results.push({label,passed:true});await context.close();
 }
 await writeFile('artifacts/deck-picker-layout/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
