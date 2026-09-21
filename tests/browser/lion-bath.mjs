import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),audio=await readFile('js/audio.js','utf8');
const hook=`window.bathQA={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'玉座確認',job:'warrior'});character.eventFlags.boss_loewenkoenigin_b1f_defeated=true;setBgmOptions({enabled:false});setSeOptions({enabled:false});worldLocation='dungeon';currentDepth=1;resetDungeon();updateCharacterUi();},character:()=>character};`;
await mkdir('artifacts/lion-bath',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height,reduced]of [['pc',1280,900,false],['mobile',390,844,false],['reduced',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/audio.js',r=>r.fulfill({contentType:'text/javascript',body:audio+`
window.bathAudioActive=()=>audio.desiredLoops.has('lionBathWater');`}));
 await page.route('**/js/title-screen.js*',async r=>{const source=await readFile('js/title-screen.js','utf8');await r.fulfill({contentType:'text/javascript',body:source.replace('window.addEventListener("keydown", handleTitleKey, true);','// Title bypassed by this QA fixture.')});});
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.bathQA);
 await page.evaluate(async()=>{bathQA.setup();window.lp=await import('/js/player.js');window.ld=await import('/js/dungeon.js');window.cfg=await import('/js/config.js');window.bath=await import('/js/lion-bath.js');lp.setPlayerInputEnabled(true);
 window.enterThrone=rare=>{outer:for(let y=0;y<cfg.MAP_H;y++)for(let x=0;x<cfg.MAP_W;x++)for(let i=0;i<cfg.DIRS.length;i++){const d=cfg.DIRS[i];if(!ld.cells[y][x].specialRoom&&['specialLocked','specialUnlocked'].includes(ld.getDoorKind(x,y,d.key))&&ld.getSpecialRoomAtDoor(x,y,d.key)?.content?.bossId==='loewenkoenigin_b1f'){Object.assign(lp.state,{gridX:x,gridY:y,x:x+.5,y:y+.5,dir:i,anim:null,overlayEvent:null});window.approach={x,y};Math.random=()=>rare?0:.9;lp.openDoorAhead();break outer;}}};enterThrone(false);});
 await page.waitForFunction(()=>!lp.state.anim);await page.evaluate(()=>lp.tryMove(1));
 await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='empty');await page.screenshot({path:`artifacts/lion-bath/${label}-empty.png`});await page.evaluate(()=>lp.handleOverlayEventInput('confirm'));await page.waitForFunction(()=>!lp.state.anim&&!lp.state.overlayEvent);assert.equal(await page.evaluate(()=>lp.state.gridX===approach.x&&lp.state.gridY===approach.y),true);
 // Subsequent entry uses the already unlocked door; movement triggers its content.
 await page.evaluate(()=>{window.startRare=()=>lp.startOverlayEvent(bath.createLionAftermath(approach.x,approach.y,0));startRare();});
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('x');assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'bathPromptLocked');await page.evaluate(()=>document.querySelector('#buttonA').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:42,pointerType:'touch'})));
 await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathPrompt');await page.keyboard.down('x');assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'bathPrompt');await page.keyboard.up('x');await page.evaluate(()=>{const b=document.querySelector('#buttonA');b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:42,pointerType:'touch'}));b.click();});assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'bathPrompt');assert.equal(await page.evaluate(()=>bathAudioActive()),true);await page.keyboard.press('z');await page.waitForFunction(()=>!lp.state.anim);assert.equal(await page.locator('.lion-bath-layer').count(),0);assert.equal(await page.evaluate(()=>bathAudioActive()),false);
 await page.evaluate(()=>{startRare();});await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathPrompt');await page.evaluate(()=>lp.handleOverlayEventInput('confirm'));await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathReveal');
 assert.equal(await page.locator('.lion-bath-layer img').evaluate(e=>e.style.opacity),'0');
 if(!reduced){
 await page.waitForFunction(()=>performance.now()-lp.state.overlayEvent.startAt>=1750);assert.equal(await page.locator('.lion-bath-layer img').evaluate(e=>e.style.opacity),'0');await page.screenshot({path:`artifacts/lion-bath/${label}-black.png`});
 await page.waitForFunction(()=>performance.now()-lp.state.overlayEvent.startAt>=2700);await page.screenshot({path:`artifacts/lion-bath/${label}-blur.png`});
 await page.evaluate(()=>{lp.handleOverlayEventInput('confirm');lp.handleOverlayEventInput('cancel');});assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'bathReveal');}
 await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathTalk');assert.equal(await page.locator('.lion-bath-layer img').evaluate(e=>e.style.filter),'blur(0px)');assert.equal(await page.evaluate(()=>bathQA.character().eventFlags.achievement_lion_bath_seen),true);
 assert.equal(await page.locator('.message').evaluate(e=>e.scrollHeight<=e.clientHeight+1),true);
 await page.screenshot({path:`artifacts/lion-bath/${label}-revealed.png`});
 await page.evaluate(()=>{for(let i=0;i<3;i++)lp.handleOverlayEventInput('confirm');});await page.waitForFunction(()=>!lp.state.overlayEvent&&!lp.state.anim);assert.equal(await page.locator('.lion-bath-layer').count(),0);
 // Re-enter and replace the scene while decode/reveal is in flight (load/return cleanup).
 await page.evaluate(()=>{startRare();});await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathPrompt');await page.evaluate(()=>lp.handleOverlayEventInput('confirm'));await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='bathReveal');assert.equal(await page.locator('.lion-bath-layer img').evaluate(e=>e.style.filter),'blur(28px)');await page.evaluate(()=>bathQA.setup());await page.waitForFunction(()=>!document.querySelector('.lion-bath-layer'));
 assert.deepEqual(errors,[]);console.log(`${label}: defeated door entry/exit, empty throne, cancel, reveal, input lock, achievement, repeat and reset cleanup passed`);await page.close();
}}finally{await browser.close();}
