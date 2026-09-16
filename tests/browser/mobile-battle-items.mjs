import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
await mkdir('artifacts/mobile-battle-items',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [layout,width,height,size] of [['mobile',390,844,8],['pc',1280,900,12]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:layout==='mobile'});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.goto('http://127.0.0.1:4179');
 await page.evaluate(async layout=>{
  document.querySelector('#titleScreen').hidden=true;document.body.className=`layout-${layout}`;
  const m=await import('/js/item-overlay.js'),{ITEMS}=await import('/data/items.js'),{createInitialCharacter}=await import('/data/classes.js'),{grantItem}=await import('/data/inventory.js');
  const c=createInitialCharacter({name:'QA',job:'warrior'});c.hp=1;
  for(const i of ITEMS.filter(i=>i.usableIn?.includes('battle')&&!i.keyItemId))c.inventory=grantItem(c.inventory,i.id,9).inventory;
  m.configureItemOverlay({root:document.querySelector('#itemOverlay'),messageEl:document.querySelector('#message')});
  window.qa={m,c};m.openItemOverlay({context:'battle',character:c});
 },layout);
 const buttons=page.locator('[data-item-list] button');assert.equal(await buttons.count(),size);
 const result=await page.evaluate(()=>{
  const list=document.querySelector('[data-item-list]').getBoundingClientRect(),back=document.querySelector('[data-item-back]').getBoundingClientRect();
  return [...document.querySelectorAll('[data-item-list] button')].every(b=>{const r=b.getBoundingClientRect();return r.bottom<=list.bottom+1&&r.bottom<=back.top&&r.top>=list.top-1;});
 });if(layout==="mobile")assert.equal(result,true);
 await page.screenshot({path:`artifacts/mobile-battle-items/${layout}.png`});
 const first=await buttons.first().textContent();await page.locator('[data-item-next]').click();assert.notEqual(await buttons.first().textContent(),first);
 await page.locator('[data-item-prev]').click();assert.equal(await buttons.first().textContent(),first);
 await page.evaluate(()=>qa.m.handleItemOverlayInput('right'));
 assert.equal(await buttons.nth(size/2).evaluate(e=>e.classList.contains('is-selected')),true);
 await page.close();console.log(layout+' count, bounds, paging and column navigation passed');
}}finally{await browser.close();}
