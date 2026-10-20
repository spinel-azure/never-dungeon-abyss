import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8');
const hook=`window.surveyQA={async setup(){const {normalizeSpecialMaps}=await import("/data/special-maps.js");document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'報告確認',job:'thief'});character.eventFlags.tavern_rumor_019_base_read=true;character.specialMaps=normalizeSpecialMaps({discovererName:'QA',starterMapsGranted:true,betaExplanationComplete:true,betaExplorationUnlocked:true,registered:Array.from({length:7},(_,i)=>({rulesetVersion:'special-map-v2',seed:i+1,level:i+1,rarity:'WHITE',discovererName:'QA',surveyedMasks:Array(3).fill('f'.repeat(25))}))});saveEnabled=true;worldLocation='town';setBgmOptions({enabled:false});setSeOptions({enabled:false});openTown({mode:'dungeonEntrance'});updateCharacterUi();},state:()=>structuredClone(character),points:n=>character.specialMaps.stampPoints=n,reports:()=>{character.specialMaps.surveyRewardClaims=Object.fromEntries(Array.from({length:1000},(_,seed)=>[JSON.stringify(['special-map-v2',seed,1,'WHITE']),true]));},reincarnate:n=>character.reincarnationCount=n};`;
const townHook=`window.surveyTown={open:()=>activateEntranceCommand('explorerTent'),input:handleTownInput,typing:()=>townTypewriter.active,finish:completeTownTypewriter,record(){setTownTypewriterOptions({enabled:true,speed:"slow"});delete town.messageEl.dataset.instantText;window.surveyCues=[];town.playSurveyJingle=async key=>{surveyCues.push(key);};town.playSe=key=>surveyCues.push(key);}};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/town.js*',r=>r.fulfill({contentType:'text/javascript',body:town+'\n'+townHook}));
 await page.route('**/js/title-screen.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4177');await page.waitForFunction(()=>window.surveyQA&&window.surveyTown);await page.evaluate(async()=>{await surveyQA.setup();surveyTown.record();surveyTown.open();});
 const press=async action=>{if(width===1280)await page.keyboard.press(({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',confirm:'x',cancel:'z'})[action]);else await page.evaluate(a=>surveyTown.input(a),action);await page.waitForTimeout(40);};
 const finish=()=>page.evaluate(()=>surveyTown.finish());
 if(width===390)await page.getByRole('button',{name:'調査報告',exact:true}).tap();else {await press('down');await press('confirm');}await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>surveyTown.typing()),true);
 await press('confirm');assert.equal((await page.evaluate(()=>surveyQA.state())).keyItems.owned.stamp_book,undefined);
 for(let n=0;n<10&&!(await page.evaluate(()=>surveyQA.state())).keyItems.owned.stamp_book;n++){await finish();await press('confirm');}await page.waitForTimeout(450);assert.ok((await page.evaluate(()=>surveyQA.state())).keyItems.owned.stamp_book);
 assert.equal(await page.locator('.survey-reward-overlay .card-get-title').innerText(),'ITEM GET!!');
 await page.locator('.survey-reward-overlay .item-get-image').evaluate(img=>img.decode());
 await page.waitForTimeout(600);
 if(process.env.SURVEY_SCREENSHOTS==='1')await page.screenshot({path:path.join(tmpdir(),`nda-stamp-book-${width}.png`)});
 await page.waitForTimeout(2700);
 // Finish each wrapped dialogue page using the same input routed for gamepad.
 for(let n=0;n<20 && !(await page.evaluate(()=>surveyQA.state().specialMaps.surveyIntroductionComplete));n++){await finish();await press('confirm');}
 assert.equal(await page.evaluate(()=>surveyQA.state().specialMaps.surveyIntroductionComplete),true);
 assert.deepEqual((await page.evaluate(()=>surveyCues)).filter(k=>['importantItem','battleVictory'].includes(k)),['importantItem','battleVictory']);
 await finish();if(width===390)await page.getByRole('button',{name:'報告',exact:true}).tap();else await press('confirm');await page.waitForTimeout(50);await finish();
 const panel=page.locator('.explorer-preview:visible');assert.equal(await panel.locator('.transfer-destination-list button').count(),5);
 if(process.env.SURVEY_SCREENSHOTS==='1')await page.screenshot({path:path.join(tmpdir(),`nda-survey-${width}.png`)});
 await press('down');await press('down');await press('down');await press('down');await press('down');assert.match(await panel.locator('button.is-selected').innerText(),/ソート/);await press('confirm');
 await press('down');await press('confirm');await finish();await press('confirm');assert.equal(await page.evaluate(()=>surveyQA.state().specialMaps.stampPoints),1);
 for(let n=0;n<10&&!(await page.locator('.survey-reward-overlay').isVisible());n++){await finish();await press('confirm');}await page.waitForTimeout(80);if(process.env.SURVEY_SCREENSHOTS==='1')await page.screenshot({path:path.join(tmpdir(),`nda-stamp-${width}.png`)});await page.waitForTimeout(2400);
 assert.equal(await panel.locator('.transfer-destination-list button').count(),5);assert.ok((await page.evaluate(()=>surveyCues)).includes('surveyStamp'));
 await press('cancel');await finish();await press('right');await press('confirm');await finish();
 // Unaffordable prizes remain selectable through the shared keyboard/gamepad route.
 if(width===390)await panel.getByRole('button',{name:/ツァウバートランク/}).tap();else {await press('down');await press('confirm');}await finish();
 assert.match(await panel.locator('.survey-exchange-detail').innerText(),/25％/);
 await panel.locator('.survey-prize-top img').evaluate(img=>img.decode());
 await press('confirm');await finish();assert.match(await page.locator('body').innerText(),/ポイントが足りない/);
 assert.equal(await page.evaluate(()=>surveyQA.state().specialMaps.stampPoints),1);
 for(let n=0;n<10 && !(await panel.isVisible());n++){await finish();await press('confirm');}
 await press('up');
 await page.evaluate(()=>surveyQA.points(500));await press('left');await press('right');assert.equal(await panel.locator('.transfer-destination-list button').count(),5);
 await finish();await press('confirm');await finish();await press('confirm');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>surveyQA.state().inventory.counts.attracting_incense),1);
 // Keep the cursor after exchange, then select unique shoes on the next page.
 await finish();
 await press('right');await press('down');await press('down');await press('down');await finish();await press('confirm');await finish();
 assert.match(await panel.locator('.survey-exchange-detail').innerText(),/DEF＋5/);
 await panel.locator('.survey-prize-top img').evaluate(img=>img.decode());
 if(process.env.SURVEY_SCREENSHOTS==='1')await page.screenshot({path:path.join(tmpdir(),`nda-exchange-detail-${width}.png`)});
 await press('confirm');await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>surveyQA.state().specialMaps.surveyShoesExchanged),true);assert.equal(await page.evaluate(()=>surveyQA.state().equipmentInventory.instances.find(i=>i.equipmentId==='alveter_schuhe').locked),true);
 if(process.env.SURVEY_SCREENSHOTS==='1')await page.screenshot({path:path.join(tmpdir(),`nda-exchange-${width}.png`)});
 await finish();await panel.getByRole('button',{name:/ハッキングデバイス/}).click();await finish();
 assert.match(await panel.locator('.survey-exchange-detail').innerText(),/転生3回で受領可能/);
 await panel.locator('.survey-prize-top img').evaluate(img=>img.decode());
 await press('confirm');assert.equal((await page.evaluate(()=>surveyQA.state())).keyItems.owned.hacking_device,undefined);
 await page.evaluate(()=>{surveyQA.reincarnate(3);surveyQA.points(1000);surveyQA.reports();});await finish();await press('confirm');await page.waitForTimeout(100);
 assert.ok((await page.evaluate(()=>surveyQA.state())).keyItems.owned.hacking_device);assert.equal(await page.evaluate(()=>surveyQA.state().specialMaps.stampPoints),1000);
 assert.deepEqual(errors,[]);console.log(width+'px report/introduction/exchange passed');await page.close();
}}finally{await browser.close();}
