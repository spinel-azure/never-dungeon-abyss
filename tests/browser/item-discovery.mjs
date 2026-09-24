import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('js/main.js','utf8');
const hook=`window.discoveryQa={setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'QA',job:'mage'});openLibraryItemCompendium();},grant(){character.keyItems=grantKeyItem(character.keyItems,'kirke_special_birdlime').keyItems;character.keyItems=consumeKeyItem(character.keyItems,'kirke_special_birdlime').keyItems;character=normalizeCharacter(JSON.parse(JSON.stringify(character)));openLibraryItemCompendium();},save:makeSaveSnapshot,load:restoreGame,open:openLibraryItemCompendium};`;
await mkdir('artifacts/item-discovery',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});
  await page.addInitScript(()=>navigator.getGamepads=()=>[]);
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.discoveryQa);
  await page.evaluate(()=>discoveryQa.setup());
  const panel=page.locator('[data-menu-view="itemCompendium"]');
  const row=panel.locator('.item-compendium-list button').first();
  assert.equal(await row.innerText(),'？？？？？？');assert.equal(await row.isDisabled(),true);
  await row.evaluate(el=>el.click());assert.equal(await panel.locator('.item-compendium-detail').count(),0);
  assert.equal(await panel.locator('img').count(),0);
  await page.screenshot({path:'artifacts/item-discovery/'+label+'-locked.png'});
  await page.evaluate(()=>discoveryQa.grant());
  await panel.getByRole('button',{name:'キルケ特製とりもち',exact:true}).click();
  assert.equal(await panel.locator('.item-compendium-name').innerText(),'キルケ特製とりもち');
  const save=await page.evaluate(()=>discoveryQa.save());
  await page.evaluate(s=>{discoveryQa.load(s);discoveryQa.open();},save);
  await panel.getByRole('button',{name:'キルケ特製とりもち',exact:true}).click();
  assert.equal(await panel.locator('.item-compendium-description').count(),1);
  await page.screenshot({path:'artifacts/item-discovery/'+label+'-unlocked.png'});
  await page.close();console.log(label+' passed: locked, obtained, consumed, save/load');
 }
} finally {await browser.close();}
