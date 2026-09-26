import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');const source=await readFile('js/main.js','utf8');
const hook=`window.layoutQa={async setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'QA',job:'thief'});character.deckCost=99;const {CARDS}=await import('/data/cards.js');const ids=CARDS.slice(0,6).map(c=>c.id);character.cards={ownedCardIds:ids,ownedCardCounts:Object.fromEntries(ids.map(id=>[id,1])),deckSlots:[ids[0],null,null,null,null,null]};character.deckTutorialSeen=true;worldLocation='dungeon';updateCharacterUi();openDeckEditor();},async bonuses(){const {getWeapon}=await import('/data/weapons.js');return ['fulgura','jormungandr','cucullus_domini'].map(id=>formatEquipmentBonuses(getWeapon(id))).concat(formatEquipmentBonuses({statBonuses:{surpriseResistance:.04}}));}};`;
await mkdir('artifacts/menu-layout-regressions',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['tablet',768,1024],['mobile',390,844]]){const page=await browser.newPage({viewport:{width,height}});await page.addInitScript(()=>navigator.getGamepads=()=>[]);
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.layoutQa);await page.evaluate(()=>layoutQa.setup());
assert.deepEqual(await page.evaluate(()=>layoutQa.bonuses()),['ATK+41 STR+9','ATK+22 DEX+9 AGI+6','ATK+30 INT+9 MAXSP+80','奇襲耐性 +4%']);
await page.locator('[data-deck-add]').click();const row=page.locator('[data-deck-picker-list] button').first();const first=await row.boundingBox();
await page.locator('[data-deck-picker-nav="next"]').click();assert.equal(await page.locator('[data-deck-picker-list] button').count(),2);const last=await row.boundingBox();assert.ok(Math.abs(first.height-last.height)<1,JSON.stringify({first,last}));
const card=await page.locator('[data-deck-picker-list] button').nth(1).boundingBox();assert.ok(Math.abs(card.height-last.height)<1);
const overflow=await page.locator('[data-deck-picker]').evaluate(el=>el.scrollHeight-el.clientHeight);assert.ok(overflow<=2);
await page.screenshot({path:'artifacts/menu-layout-regressions/'+label+'.png'});console.log(label+' passed');await page.close();}}finally{await browser.close();}
