import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8');
const hook=`window.managementQA={setup:async()=>{const {normalizeSpecialMaps}=await import('/data/special-maps.js');document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'スピネル',job:'thief'});character.eventFlags.tavern_rumor_019_base_read=true;character.specialMaps=normalizeSpecialMaps({discovererName:'スピネル',starterMapsGranted:true,betaExplanationComplete:true,betaExplorationUnlocked:true,registered:[{rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'スピネル',cleared:true,surveyedMasks:['f'.repeat(25),'0'.repeat(25),'f'.repeat(25)]}]});saveEnabled=true;worldLocation='town';setBgmOptions({enabled:false});setSeOptions({enabled:false});openTown({mode:'dungeonEntrance'});updateCharacterUi();}};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,820,390]){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/town.js*',r=>r.fulfill({contentType:'text/javascript',body:town+`\nwindow.managementTown={open:()=>activateEntranceCommand('mapExploration'),finish:completeTownTypewriter};`}));
 await page.route('**/js/title-screen.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4177');await page.waitForFunction(()=>window.managementQA&&window.managementTown);
 await page.evaluate(async()=>{await managementQA.setup();managementTown.open();managementTown.finish();});
 for(let i=0;i<2;i++){await page.evaluate(()=>managementTown.finish());await page.locator('.explorer-preview .transfer-destination-list button').first().evaluate(e=>e.click());}
 const info=page.locator('.explorer-map-info');assert.match(await info.innerText(),/B1F/);
 assert.ok(await info.evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:path.join(tmpdir(),`nda-entry-live-${width}.png`)});
 if(width===390){
  assert.ok((await info.boundingBox()).height>500,'phone information area uses viewport height');
  await page.getByRole('button',{name:'B2F',exact:true}).tap();assert.match(await info.innerText(),/この階を100マス/);
  await page.getByRole('button',{name:'B3F',exact:true}).tap();assert.match(await info.innerText(),/B3F/);
  assert.equal(await page.getByRole('button',{name:'探索する（A）',exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'戻る（B）',exact:true}).isVisible(),true);
  await page.setViewportSize({width:390,height:568});
  await page.getByRole('button',{name:'B1F',exact:true}).tap();
  assert.ok(await info.evaluate(e=>e.scrollHeight>e.clientHeight));
  const client=await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:400}]});
  for(let y=380;y>=160;y-=20){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});await page.waitForTimeout(20);}
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(300);
  assert.ok(await info.evaluate(e=>e.scrollTop>0),'small phone supports touch scrolling');
  await page.screenshot({path:path.join(tmpdir(),'nda-entry-live-390-short.png')});
  await page.setViewportSize({width:390,height:900});
 }
 if(width!==390)assert.equal(await page.locator('.explorer-map-floors>section:visible').count(),3);
 await page.getByRole('button',{name:'探索する（A）',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'はい（A／ENTER）',exact:true}).isVisible(),true);
 assert.match(await info.innerText(),/挑戦条件/);
 await page.getByRole('button',{name:'戻る（B）',exact:true}).click();
 assert.deepEqual(errors,[]);console.log(`${width}px entry details passed`);await page.close();
}}finally{await browser.close();}
