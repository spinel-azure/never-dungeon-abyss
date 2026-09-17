import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.gqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=22;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'スピネル',job:'thief'});setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character};`;
await mkdir('artifacts/gemini-presentation',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.gqa);
  for(const [choice,symbol] of [['confirm','sun'],['cancel','moon']]) {
    await page.evaluate(async()=>{gqa.setup();window.gplayer=await import('/js/player.js');gplayer.startGeminiEvent(1,1);});
    await page.waitForTimeout(400);
    await page.screenshot({path:`artifacts/gemini-presentation/${label}-intro.png`});
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    await page.waitForTimeout(1800);
    await page.screenshot({path:`artifacts/gemini-presentation/${label}-sisters.png`});
    await page.evaluate(()=>{for(let i=0;i<3;i++)gplayer.handleOverlayEventInput('confirm');});
    await page.evaluate(a=>gplayer.handleOverlayEventInput(a),choice);
    await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='opened');
    await page.screenshot({path:`artifacts/gemini-presentation/${label}-${symbol}.png`});
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    assert.equal(await page.evaluate(()=>Boolean(gqa.character().eventFlags.gemini_first_completed)),symbol==='sun');
    assert.equal(await page.evaluate(()=>Boolean(gqa.character().eventFlags.gemini_retry_blocked)),symbol==='moon');
    await page.waitForTimeout(500);
    await page.screenshot({path:`artifacts/gemini-presentation/${label}-${symbol}-result.png`});
    if(symbol==='sun') {
      assert.equal(await page.locator('#itemGetItems').textContent(),'「紋様の片割れ」を手に入れた！');
      assert.equal(await page.locator('#itemGetEffect').isVisible(),true);
    }
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='gone');
    assert.ok((await page.locator('#message').textContent()).includes('姉妹の姿はない。迷宮の先でまた会えるだろう。'));
    await page.waitForTimeout(2000);
    await page.screenshot({path:`artifacts/gemini-presentation/${label}-${symbol}-gone.png`});
  }
  assert.deepEqual(errors,[]);console.log(label+' passed sun/moon, Three.js opening, save flags');await page.close();
}}finally{await browser.close();}
