import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('js/town.js','utf8');
await mkdir('artifacts/zodiac-transfer',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:source+`\nwindow.zqa=(character,depths)=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');document.body.classList.add('town-active');town.active=true;town.mode="transferCircle";town.root.hidden=false;town.getCharacter=()=>character;town.transferUnlocked=true;renderTransferCircle();renderTransferDestinationList(depths.map(depth=>({depth,label:'B'+depth+'F'})));};`}));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>document.documentElement.dataset.ndaMainReady==='true');
 await page.evaluate(()=>zqa({eventFlags:{gemini_second_completed:true},cards:{deckSlots:['sr_astronomy']}},[10,20,30,40,50]));
 assert.equal(await page.locator('.zodiac-transfer-marker').count(),3);
 for(const icon of await page.locator('.zodiac-transfer-marker').all()){
  const b=await icon.boundingBox();const row=await icon.locator('xpath=../..').boundingBox();assert.ok(b.x>=row.x&&b.x+b.width<=row.x+row.width);
 }
 await page.screenshot({path:`artifacts/zodiac-transfer/${label}-final.png`});
 await page.evaluate(()=>zqa({eventFlags:{gemini_final_completed:true},cards:{deckSlots:['sr_astronomy']},quests:{active:{guild_033:{progress:0}}}},[60,70,80,90,100]));
 assert.equal(await page.locator('.zodiac-transfer-marker').count(),4);
 await page.screenshot({path:`artifacts/zodiac-transfer/${label}-late-final.png`});
 await page.evaluate(()=>zqa({eventFlags:{gemini_event_started:true},cards:{deckSlots:['common_person_detection']}},[10,20,30,40,50]));
 assert.equal(await page.locator('.zodiac-transfer-marker').count(),1);
 await page.evaluate(()=>zqa({cards:{deckSlots:[]}},[10,20,30,40,50]));assert.equal(await page.locator('.zodiac-transfer-marker').count(),0);
 assert.deepEqual(errors,[]);console.log(label+' zodiac markers passed');await page.close();
}}finally{await browser.close();}
