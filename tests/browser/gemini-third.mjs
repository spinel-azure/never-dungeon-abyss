import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.gqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=44;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'スピネル',job:'thief'});character.eventFlags={gemini_first_completed:true,gemini_second_completed:true};setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character};`;
await mkdir('artifacts/gemini-third',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.gqa);
 await page.evaluate(async()=>{gqa.setup();window.gplayer=await import('/js/player.js');});
 for(const [sister,count] of [['white',2],['red',3]]) {
  await page.evaluate(s=>gplayer.startGeminiThirdEvent(1,1,s),sister);
  await page.waitForTimeout(1800);
  await page.screenshot({path:`artifacts/gemini-third/${label}-${sister}.png`});
  for(let i=0;i<count;i++)await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
  await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='gone');
  assert.ok((await page.locator('#message').textContent()).includes('姿を消した'));
  await page.screenshot({path:`artifacts/gemini-third/${label}-${sister}-gone.png`});
 }
 assert.equal(await page.evaluate(()=>gqa.character().eventFlags.gemini_third_completed),true);
 assert.deepEqual(errors,[]);console.log(label+' third act passed');await page.close();
}}finally{await browser.close();}
