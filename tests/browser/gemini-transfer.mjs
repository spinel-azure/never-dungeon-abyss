import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const townSource=await readFile('js/town.js','utf8');
await mkdir('artifacts/gemini-transfer',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:townSource+`\nwindow.transferQA=(character)=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');document.body.classList.add('town-active');town.root.hidden=false;town.getCharacter=()=>character;town.transferUnlocked=true;renderTransferCircle();renderTransferDestinationList([10,20,30,40,50].map(depth=>({depth,label:'B'+depth+'F'})));};`}));
  await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>document.documentElement.dataset.ndaMainReady==='true');
  await page.evaluate(()=>transferQA({eventFlags:{gemini_event_started:true},cards:{deckSlots:['common_person_detection']}}));
  assert.equal(await page.locator('.gemini-transfer-marker').count(),1);
  assert.ok((await page.locator('#transferDestinationList button').nth(1).textContent()).includes('B20F'));
  const icon=await page.locator('.gemini-transfer-marker').boundingBox();
  const row=await page.locator('#transferDestinationList button').nth(1).boundingBox();
  assert.ok(icon.x>=row.x && icon.x+icon.width<=row.x+row.width && icon.y>=row.y && icon.y+icon.height<=row.y+row.height);
  await page.screenshot({path:`artifacts/gemini-transfer/${label}-visible.png`});
  await page.evaluate(()=>transferQA({eventFlags:{gemini_event_started:true},cards:{deckSlots:[]}}));
  assert.equal(await page.locator('.gemini-transfer-marker').count(),0);
  for(const flag of ['gemini_first_completed']) {
    await page.evaluate(flag=>transferQA({eventFlags:{gemini_event_started:true,[flag]:true},cards:{deckSlots:['common_person_detection']}}),flag);
    assert.equal(await page.locator('.gemini-transfer-marker').count(),0);
  }
  console.log(label+' transfer marker passed');await page.close();
}}finally{await browser.close();}
