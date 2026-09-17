import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.gqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=44;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'スピネル',job:'thief'});character.eventFlags={gemini_first_completed:true,gemini_second_completed:true,gemini_third_completed:true};setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character};`;
await mkdir('artifacts/gemini-fourth',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js*',async r=>{const source=await readFile('js/title-screen.js','utf8');await r.fulfill({contentType:'text/javascript',body:source+'\nwindow.closeTitleQA=()=>{titleOpen=false;};'});});
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.gqa);
 await page.evaluate(async()=>{closeTitleQA();gqa.setup();window.gplayer=await import('/js/player.js');});
 await page.evaluate(()=>gplayer.startGeminiFourthEvent(1,1));
 await page.keyboard.press('KeyX');await page.waitForTimeout(1800);
 await page.screenshot({path:`artifacts/gemini-fourth/${label}-sisters.png`});
 await page.keyboard.press('KeyX');await page.keyboard.press('KeyX');
 assert.equal(await page.evaluate(()=>gplayer.state.overlayEvent.phase),'stoneChoice');
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>gplayer.state.overlayEvent.selection),2);
 await page.screenshot({path:`artifacts/gemini-fourth/${label}-cursor.png`});
 await page.keyboard.press('KeyX');
 assert.equal(await page.evaluate(()=>gqa.character().eventFlags.gemini_fourth_completed),true);
 assert.equal(await page.locator('#itemGetEffect').isVisible(),true);
 await page.keyboard.press('KeyX');await page.keyboard.press('KeyX');
 await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='gone');
 await page.screenshot({path:`artifacts/gemini-fourth/${label}-gone.png`}); assert.deepEqual(errors,[]);console.log(label+' fourth act passed');await page.close();
}}finally{await browser.close();}

