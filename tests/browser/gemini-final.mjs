import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.gqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=44;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'スピネル',job:'thief'});character.keyItems={owned:{gemini_emblem_half:{count:1},gemini_emblem_other_half:{count:1}},acquisitionOrder:['gemini_emblem_half','gemini_emblem_other_half']};character.eventFlags={gemini_first_completed:true,gemini_second_completed:true,gemini_third_completed:true,gemini_fourth_completed:true};setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character};`;
await mkdir('artifacts/gemini-final',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js*',async r=>{const source=await readFile('js/title-screen.js','utf8');await r.fulfill({contentType:'text/javascript',body:source+'\nwindow.closeTitleQA=()=>{titleOpen=false;};'});});
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.gqa);
 await page.evaluate(async()=>{closeTitleQA();gqa.setup();window.gplayer=await import('/js/player.js');});
 await page.evaluate(()=>gplayer.startGeminiFinalEvent(1,1));
 await page.waitForTimeout(1800);await page.screenshot({path:`artifacts/gemini-final/${label}-verified-intro.png`});
 await page.keyboard.press('KeyX');await page.keyboard.press('KeyX');
 await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='finalSlots');
 await page.waitForTimeout(300);await page.screenshot({path:`artifacts/gemini-final/${label}-verified-slots.png`});
 await page.keyboard.press('KeyX');await page.waitForTimeout(300);
 await page.screenshot({path:`artifacts/gemini-final/${label}-verified-pieces.png`});
 await page.keyboard.press('KeyX');await page.keyboard.press('ArrowRight');await page.keyboard.press('KeyX');await page.keyboard.press('ArrowRight');
 assert.deepEqual(await page.evaluate(()=>gplayer.state.overlayEvent.slots),[0,null]);
 await page.waitForTimeout(500);
 await page.screenshot({path:`artifacts/gemini-final/${label}-checked-placed.png`});
 await page.keyboard.press('KeyX');
 await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='finalSpeech');
 await page.screenshot({path:`artifacts/gemini-final/${label}-verified-together.png`});
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='gone');
 assert.equal(await page.evaluate(()=>gqa.character().eventFlags.gemini_final_completed),true);
 assert.equal(await page.evaluate(()=>gqa.character().cards.ownedCardCounts.zodiac_gemini),1);
 await page.screenshot({path:`artifacts/gemini-final/${label}-verified-reward.png`}); assert.deepEqual(errors,[]);console.log(label+' final act passed');await page.close();
}}finally{await browser.close();}


