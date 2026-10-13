import {readFile,mkdtemp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.gqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=22;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'魅了未経験Lv31',job:'thief'});character.level=31;saveEnabled=true;setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},startNext:()=>startBattle(createEnemyCombatant(getEnemyById('abyss_rat')),{playStartSe:false}),saved:()=>loadGame('auto'),character:()=>character};`;
const output=await mkdtemp((await import('node:os')).tmpdir()+'/nda-gemini-charm-');console.log(output);
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  const battle=await readFile('js/battle.js','utf8');await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.charmBattleQa=()=>battleUi.battle?.player;window.charmVisualQa=(active)=>{battleUi.battle.player.statuses=active?[{id:"charm",remainingTurns:3}]:[];renderBattle();};window.closeCharmQa=closeBattle;'}));
  await page.goto(process.env.GEMINI_CHARM_URL||'http://127.0.0.1:4174');await page.waitForFunction(()=>window.gqa);
  for(const [choice,symbol] of [['confirm','sun']]) {
    await page.evaluate(async()=>{gqa.setup();window.gplayer=await import('/js/player.js');gplayer.startGeminiEvent(1,1);});
    await page.waitForTimeout(400);
    await page.screenshot({path:`${output}/${label}-intro.png`});
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    await page.waitForTimeout(1800);
    await page.screenshot({path:`${output}/${label}-sisters.png`});
    await page.evaluate(()=>{for(let i=0;i<3;i++)gplayer.handleOverlayEventInput('confirm');});
    await page.evaluate(a=>gplayer.handleOverlayEventInput(a),choice);
    await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='opened');
    await page.screenshot({path:`${output}/${label}-${symbol}.png`});
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    assert.equal(await page.evaluate(()=>Boolean(gqa.character().eventFlags.gemini_first_completed)),symbol==='sun');
    assert.equal(await page.evaluate(()=>Boolean(gqa.character().eventFlags.gemini_retry_blocked)),symbol==='moon');
    await page.waitForTimeout(500);
    const inspect=()=>page.evaluate(async()=>{const {isCharmed}=await import('/combat/akashic-phantoms.js');const el=document.getElementById('quickCharm');return {charmed:isCharmed(gqa.character()),saved:isCharmed(gqa.saved()?.character),statuses:gqa.character().statuses,hidden:el.hidden,display:getComputedStyle(el).display,color:getComputedStyle(el).color};});
    const actual=await inspect();assert.equal(actual.charmed,false);assert.equal(actual.saved,false);assert.equal(actual.hidden,true);assert.equal(actual.display,'none');
    // Simulate a stale stylesheet lacking the charm-specific rules.
    const oldCss=(await readFile('css/game-menu.css','utf8')).replace(/\.condition-charm\{[^}]*\}|#quickCharm(?:\[hidden\])?\{[^}]*\}/g,'');
    await page.evaluate(css=>{const link=document.querySelector('link[href*="game-menu.css"]');link.disabled=true;const style=document.createElement('style');style.id='stale-charm-css';style.textContent=css;document.head.append(style);},oldCss);
    const stale=await inspect();assert.equal(stale.charmed,false);assert.equal(stale.hidden,true);assert.equal(stale.display,'none');assert.equal(await page.locator('#quickCharm').textContent(),'');console.log(label,{actual,stale});
    await page.screenshot({path:`${output}/${label}-stale-white-heart.png`});
    await page.evaluate(()=>{document.querySelector('#stale-charm-css').remove();document.querySelector('link[href*="game-menu.css"]').disabled=false;});

    await page.screenshot({path:`${output}/${label}-${symbol}-result.png`});
    if(symbol==='sun') {
      assert.equal(await page.locator('#itemGetItems').textContent(),'「紋様の片割れ」を手に入れた！');
      assert.equal(await page.locator('#itemGetEffect').isVisible(),true);
    }
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));
    await page.waitForFunction(()=>gplayer.state.overlayEvent.phase==='gone');
    assert.ok((await page.locator('#message').textContent()).includes('姉妹の姿はない。迷宮の先でまた会えるだろう。'));
    await page.waitForTimeout(2000);
    await page.screenshot({path:`${output}/${label}-${symbol}-gone.png`});
    await page.evaluate(()=>gplayer.handleOverlayEventInput('confirm'));await page.evaluate(()=>gqa.startNext());
    assert.equal(await page.evaluate(async()=>{const {isCharmed}=await import('/combat/akashic-phantoms.js');const player=charmBattleQa();if(!player)throw new Error("next battle did not start");return isCharmed(player);}),false);
  }
  assert.deepEqual(errors,[]);await page.evaluate(()=>charmVisualQa(true));assert.equal(await page.locator('#quickCharm').textContent(),'♥');assert.equal(await page.locator('#quickCharm').isVisible(),true);await page.evaluate(()=>charmVisualQa(false));assert.equal(await page.locator('#quickCharm').textContent(),'');await page.evaluate(()=>{charmVisualQa(true);closeCharmQa();});assert.equal(await page.locator('#quickCharm').isVisible(),false);console.log(label+' passed Lv31 Gemini result, stale CSS and next non-charmed battle');await page.close();
}}finally{await browser.close();}
