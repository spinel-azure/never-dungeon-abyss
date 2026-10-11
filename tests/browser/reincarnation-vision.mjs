import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('js/main.js','utf8');
const old=await readFile('tests/browser/reincarnation.mjs','utf8');
const base=old.match(/const hook = String.raw`([\s\S]*?)`;/)[1];
const extra=`window.visionQa={setup(count,level){reincarnationQa.start();window.disableTitleForVision();character.reincarnationCount=count;character.level=level;},enter(){openTown({registrationRequired:false,facilityId:'temple',mode:'facilityMenu'});},save(){saveGame({slot:'manual1'});},input:dispatchGamepadAction,read:()=>({count:character.reincarnationCount,gold:character.gold,done:character.eventFlags.reincarnation_lumina_completed,active:reincarnationVision.isActive(),scene:sceneTransitionRunning,text:msgEl.textContent,stored:loadGame('auto')})};`;
const main=source.replace('return new Promise(resolve => window.setTimeout(resolve, milliseconds));','return new Promise(resolve => window.setTimeout(resolve, Math.min(milliseconds, 5)));').replace('  document.documentElement.dataset.ndaMainReady = "true";',base+extra+'\n document.documentElement.dataset.ndaMainReady="true";');
const output=await mkdtemp(join(tmpdir(),'nda-reincarnation-vision-'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:label==='mobile'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>navigator.getGamepads=()=>[]);
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main}));
 const title=await readFile('js/title-screen.js','utf8');await p.route('**/js/title-screen.js*',r=>r.fulfill({contentType:'text/javascript',body:title+'\nwindow.disableTitleForVision=()=>{titleOpen=false;};'}));
 await p.goto('http://127.0.0.1:4174');await p.waitForFunction(()=>window.visionQa);
 for(const [count,level] of [[2,197],[3,196],[3,1]]){
  await p.evaluate(([c,l])=>{visionQa.setup(c,l);visionQa.enter();},[count,level]);
  assert.equal(await p.locator('.reincarnation-vision').count(),0);
 }
 await p.evaluate(()=>{visionQa.setup(3,197);visionQa.enter();});
 assert.equal(await p.locator('#message').textContent(),'');
 await p.waitForFunction(()=>visionQa.read().text.includes('＊Aボタンで次へ')&&visionQa.read().active);
 assert.match(await p.locator('.reincarnation-vision img').getAttribute('src'),/25b/);
 assert.equal(await p.locator('.reincarnation-vision img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
 await p.screenshot({path:join(output,label+'.png')});
 const saved=await p.evaluate(()=>visionQa.read());if(label==='mobile'){await p.reload();await p.waitForFunction(()=>window.visionQa);
 await p.locator('[data-title-action="continue"]').click();
 await p.waitForFunction(()=>visionQa.read().active&&visionQa.read().text.includes('＊Aボタンで次へ'));
 assert.equal((await p.evaluate(()=>visionQa.read())).gold,saved.gold);}
 let full='',pages=0;
 while((await p.locator('.reincarnation-vision img').getAttribute('src')).includes('25b')){
  const text=await p.evaluate(()=>visionQa.read().text);full+=text.replace('\n＊Aボタンで次へ','');
  assert.equal(await p.locator('#message').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true);
  if(pages++>10)throw Error('too many pages');
  await p.evaluate(()=>visionQa.input('cancel'));assert.equal(await p.evaluate(()=>visionQa.read().text),text);
  if(label==='mobile')await p.locator('#buttonA').tap();else await p.keyboard.press('x');await p.waitForTimeout(1500);
 }
 assert.match(full,/黄金の稲穂の女神ルミナ「転生QA、聞こえますか/);
 assert.match(full,/あなたに安らぎを与えましょう…。」/);
 await p.waitForFunction(()=>document.querySelector('.reincarnation-vision img')?.getAttribute('src').includes('25c'));
 await p.waitForTimeout(3500);
 assert.match(await p.locator('.reincarnation-vision img').getAttribute('src'),/25c/);
 await p.waitForFunction(()=>visionQa.read().text==='＊Aボタンで次へ');
 assert.match(await p.locator('.reincarnation-vision img').getAttribute('src'),/dungeon_event_25.avif/);
 if(label==='mobile')await p.locator('#buttonA').tap();else await p.keyboard.press('x');
 await p.waitForFunction(()=>visionQa.read().text.includes('私たちはいつでも'));
 await p.waitForTimeout(1500);assert.equal((await p.evaluate(()=>visionQa.read())).active,true);
 await p.waitForFunction(()=>!visionQa.read().active);
 assert.equal((await p.evaluate(()=>visionQa.read())).done,true);
 assert.equal((await p.evaluate(()=>visionQa.read())).stored.character.eventFlags.reincarnation_lumina_completed,true);
 await p.evaluate(()=>{visionQa.enter();visionQa.save();});
 assert.equal(await p.locator('.reincarnation-vision').count(),0);
 await p.reload();await p.waitForFunction(()=>window.visionQa);
 await p.locator('[data-title-action="load-game"]').click();
 assert.equal(await p.locator('[data-load-slot="manual1"] .title-load-medal').count(),2);
 assert.match(await p.locator('[data-load-slot="manual1"] .title-load-medal').nth(1).getAttribute('src'),/medal_04/);
 await p.screenshot({path:join(output,label+'-medals.png')});
 assert.deepEqual(errors,[]);console.log(label+' passed, pages='+pages);await p.close();
}}finally{await browser.close();}console.log(output);
