import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),menu=await readFile('js/menu.js','utf8');
const hook=`window.keyQa={async setup(id){const {grantKeyItem}=await import('/data/key-items.js');document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'QA',job:'mage'});character.keyItems=grantKeyItem({},id).keyItems;character.deckTutorialSeen=true;worldLocation='town';updateCharacterUi();openItemInventory();},owned:()=>JSON.stringify(character.keyItems)};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.qaPad={id:'QA standard pad',index:0,mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.qaPad];});
 await page.route('**/js/main.js*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/menu.js',r=>r.fulfill({contentType:'text/javascript',body:menu+'\nwindow.keyMenuState=()=>({view:menu.view,mode:menu.inventoryMode});'}));
 await page.route('**/js/title-screen.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4177');await page.waitForFunction(()=>window.keyQa);await page.waitForTimeout(200);
 const pad=async n=>{await page.evaluate(n=>qaPad.buttons[n]={pressed:true,touched:true,value:1},n);await page.waitForTimeout(80);await page.evaluate(n=>qaPad.buttons[n]={pressed:false,touched:false,value:0},n);await page.waitForTimeout(80);};
 for(const id of ['stamp_book','queen_necklace']){
  await page.evaluate(id=>keyQa.setup(id),id);await page.locator('[data-inventory-tab="keyItems"]').click();await page.locator('[data-inventory-list] button').first().click();
  const before=await page.evaluate(()=>keyQa.owned());await pad(0);await pad(0);assert.deepEqual(await page.evaluate(()=>keyMenuState()),{view:'inventory',mode:'list'});
  await pad(1);assert.equal((await page.evaluate(()=>keyMenuState())).view,'commands');assert.equal(await page.evaluate(()=>keyQa.owned()),before);
 }
 assert.deepEqual(errors,[]);console.log(width+'px: gamepad A/A/B returns normally for stamp book and other key item');await page.close();
}}finally{await browser.close();}
