import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('js/main.js','utf8');
const hook=`window.wingQa={setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=normalizeCharacter(createInitialCharacter({name:'QA',job:'mage'}));character=grantItemWithOverflow(character,'wing_gift',5).character;character.sp=0;currentDepth=80;worldLocation='dungeon';closeTown();resetDungeon('',null,true);updateCharacterUi();setPlayerInputEnabled(true);},use:()=>useFieldItem('wing_gift'),status:()=>({max:character.maxHp,base:character.wingGiftBaseMaxHp,uses:character.wingGiftUses,sp:character.sp,maxSp:character.maxSp}),save:makeSaveSnapshot,load:restoreGame,home:()=>returnToTown()};`;
await mkdir('artifacts/wing-gift',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){const page=await browser.newPage({viewport:{width,height}});await page.addInitScript(()=>navigator.getGamepads=()=>[]);
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.wingQa);await page.evaluate(()=>wingQa.setup());
assert.equal((await page.evaluate(()=>wingQa.use())).accepted,true);const state=await page.evaluate(()=>wingQa.status());assert.equal(state.uses,1);assert.equal(state.max,Math.floor(state.base*4/5));
assert.equal(await page.locator('#quickHpMax').evaluate(e=>e.classList.contains('vital-max-reduced')),true);
const save=await page.evaluate(()=>wingQa.save());await page.evaluate(s=>wingQa.load(s),save);assert.equal((await page.evaluate(()=>wingQa.status())).uses,1);
await page.screenshot({path:`artifacts/wing-gift/${label}.png`});await page.evaluate(()=>wingQa.home());const after=await page.evaluate(()=>wingQa.status());assert.equal(after.uses,0);assert.equal(after.max,after.base);await page.close();console.log(label,'passed');}}finally{await browser.close();}
