import {createServer} from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';
import {resolve,extname,join} from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end(await readFile('tools/aurora-os-preview.html'));return;}const file=resolve('.'+p);if(!file.startsWith(process.cwd()))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.avif':'image/avif','.woff2':'font/woff2','.html':'text/html'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));

const output=await mkdtemp(join(tmpdir(),'nda-summoning-'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,768,390]){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.auroraSummoningPreview);await p.clock.install();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
 await p.evaluate(async()=>{const m=await import('/js/aurora-summoning.js');window.timelines={normal:m.createSummoningTimeline('normal'),hacking:m.createSummoningTimeline('hacking')};});
 for(const route of ['normal','hacking']){
  await p.evaluate(r=>{window.outcome=null;auroraSummoningPreview.play({route:r}).then(x=>outcome=x);},route);
  await p.clock.runFor(60);assert.equal(await p.locator('dialog canvas').getAttribute('aria-label'),'> ');
  const timeline=await p.evaluate(r=>timelines[r],route);
  await p.clock.runFor(timeline.branchAt-60+20);
  const common=await p.locator('dialog canvas').getAttribute('aria-label');assert.match(common,/INITIALIZING REPRODUCTION/);assert.doesNotMatch(common,/VERIFIED|WARNING/);
  assert.equal(await p.locator('dialog canvas').getAttribute('data-cursor'),route==='hacking'?'warning':'normal');
  await p.clock.runFor(timeline.completeAt-timeline.branchAt+20);
  const text=await p.locator('dialog canvas').getAttribute('aria-label');assert.match(text,route==='normal'?/SUMMONING SEQUENCE : COMPLETE/:/INTERFERENCE SUCCESSFUL/);
  assert.equal(await p.locator('dialog canvas').getAttribute('data-cursor'),'normal');
  await p.screenshot({path:join(output,width+'-'+route+'.png')});await p.clock.runFor(1400);assert.deepEqual(await p.evaluate(()=>outcome),{route,completed:true});assert.equal(await p.locator('dialog').count(),0);
 }
 // Skip during the common section must retain the selected hacking outcome.
 await p.evaluate(()=>{outcome=null;auroraSummoningPreview.play({route:'hacking'}).then(x=>outcome=x);});await p.clock.runFor(50);
 await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.clock.runFor(350);assert.equal(await p.locator('dialog canvas').getAttribute('data-phase'),'complete');assert.match(await p.locator('dialog canvas').getAttribute('aria-label'),/INTERFERENCE SUCCESSFUL/);
 await p.keyboard.up('Enter');await p.keyboard.press('Enter');await p.clock.runFor(350);assert.deepEqual(await p.evaluate(()=>outcome),{route:'hacking',completed:true});
 // Physical-style A input: a held button at entry must not skip.
 await p.evaluate(()=>{window.padDown=true;navigator.getGamepads=()=>[{index:0,buttons:[{pressed:padDown}]}];outcome=null;auroraSummoningPreview.play({route:'normal'}).then(x=>outcome=x);});await p.clock.runFor(100);assert.equal(await p.locator('dialog canvas').getAttribute('data-phase'),'typing');
 await p.evaluate(()=>padDown=false);await p.clock.runFor(40);await p.evaluate(()=>padDown=true);await p.clock.runFor(350);assert.equal(await p.locator('dialog canvas').getAttribute('data-phase'),'complete');
 await p.evaluate(()=>padDown=false);await p.clock.runFor(40);await p.evaluate(()=>padDown=true);await p.clock.runFor(350);assert.equal(await p.evaluate(()=>outcome.completed),true);
 await p.evaluate(()=>{padDown=false;outcome=null;auroraSummoningPreview.play({route:'hacking'}).then(x=>outcome=x);});await p.clock.runFor(40);
 if(width===390)await p.locator('dialog canvas').tap();else await p.locator('dialog canvas').click();await p.clock.runFor(350);
 if(width===390)await p.locator('dialog canvas').tap();else await p.locator('dialog canvas').click();await p.clock.runFor(350);assert.equal(await p.evaluate(()=>outcome.completed),true);
 await p.evaluate(()=>{outcome=null;auroraSummoningPreview.play().then(x=>outcome=x);auroraSummoningPreview.dispose();});await p.clock.runFor(40);assert.deepEqual(await p.evaluate(()=>outcome),{route:'normal',completed:false});
 await p.evaluate(()=>{window.keysAfter=0;window.addEventListener('keydown',()=>keysAfter++);});await p.keyboard.press('KeyZ');assert.equal(await p.evaluate(()=>keysAfter),1);assert.deepEqual(errors,[]);console.log(width,'passed');await p.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}console.log(output);
