import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8');
await mkdir('artifacts/initial-town-talk',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844],['small',320,720],['tablet',820,1180]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:label!=='pc',isMobile:label!=='pc'}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',`window.talkQA={set:c=>{character=c;worldLocation='town';setPlayerInputEnabled(true);document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');updateCharacterUi();},open:id=>openTown({facilityId:id,mode:'facilityMenu'}),character:()=>JSON.stringify({cards:character.cards,inventory:character.inventory,eventFlags:character.eventFlags}),tutorial:()=>deckTutorialActive}; document.documentElement.dataset.ndaMainReady = "true";`)}));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:town+`\nwindow.talkState=()=>({pages:town.compactTalk?.pages,index:town.compactTalk?.index,active:townTypewriter.active});window.talkInput=handleTownInput;window.talkOptions=setTownTypewriterOptions;`}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'})); await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.talkQA);await page.evaluate(()=>document.fonts.ready);
 for(const facility of ['inn','library','temple','shop','tavern','guild']){
 await page.evaluate(async id=>{const {createInitialCharacter}=await import('/data/classes.js');talkQA.set(createInitialCharacter({name:'会話確認',job:'warrior'}));talkOptions({enabled:true,speed:'slow'});talkQA.open(id);},facility);
 await page.evaluate(()=>{talkOptions({enabled:false});talkOptions({enabled:true,speed:'slow'});document.querySelector('[data-facility-command="talk"]').click();});
 await page.waitForFunction(()=>talkState().pages?.length);
 const original=await page.evaluate(()=>talkQA.character());
 const pages=await page.evaluate(()=>talkState().pages);
 assert.ok(pages.length);
 for(let i=0;i<pages.length;i++){
  if(await page.evaluate(()=>talkState().active)) await (label==='pc'?page.keyboard.press('KeyX'):page.locator('#buttonA').tap());
  await page.waitForFunction(()=>!talkState().active);
  const result=await page.evaluate(()=>{const b=document.querySelector('.town-talk-body'),h=document.querySelector('.town-talk-hint'),m=b.parentElement;return {overflow:b.scrollHeight>b.clientHeight+1,hint:h.textContent,inside:h.getBoundingClientRect().bottom<=m.getBoundingClientRect().bottom-1};});
  assert.equal(result.overflow,false,facility);assert.equal(result.inside,true,facility);
  assert.equal(result.hint,i<pages.length-1?'＊Aボタンで次へ':'＊Aボタンで閉じる');
  assert.equal(await page.evaluate(()=>talkQA.tutorial()),false);
  await page.evaluate(()=>talkInput('cancel'));
  assert.equal(await page.evaluate(()=>talkState().index),i);
  if(facility==='inn'&&i===0)await page.screenshot({path:`artifacts/initial-town-talk/${label}.png`});
  await (label==='pc'?page.keyboard.press('KeyX'):page.locator('#buttonA').tap());await page.waitForTimeout(30);
 }
 assert.equal(await page.evaluate(()=>talkState().pages),undefined);
 assert.equal(await page.evaluate(()=>talkQA.character()),original);
 if(facility==='inn')assert.equal(await page.evaluate(()=>talkQA.tutorial()),true);
 else {
  await page.evaluate(()=>{talkOptions({enabled:false});document.querySelector('[data-facility-command="talk"]').click();});
  await page.waitForFunction(()=>talkState().pages?.length);
  for(let n=0;n<10 && await page.evaluate(()=>Boolean(talkState().pages));n++){
   assert.equal(await page.evaluate(()=>talkState().active),false);
   await page.keyboard.press('KeyX');
  }
  assert.equal(await page.evaluate(()=>talkState().pages),undefined);
  assert.equal(await page.evaluate(()=>talkQA.character()),original);
 }
 // Reload to clean tutorial and reward animations before the next independent scenario.
 await page.reload();await page.waitForFunction(()=>window.talkQA);await page.evaluate(()=>document.fonts.ready);
 }
 assert.deepEqual(errors,[]);console.log(label+': six facilities, two-line pages, hints, rewards and deferred tutorial passed');await page.close();
}}finally{await browser.close();}








