import {createServer} from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';
import {resolve,extname,join} from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end(await readFile('tools/aurora-os-preview.html'));return;}const file=resolve('.'+p);if(!file.startsWith(process.cwd()))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.avif':'image/avif','.woff2':'font/woff2','.html':'text/html'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));

const output=await mkdtemp(join(tmpdir(),'nda-aurora-'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,768,390]){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.auroraPreview);
 const before=await p.locator('#stage').boundingBox();await p.locator('#play').click();
 await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='initializing');
 assert.deepEqual(await p.locator('dialog canvas').evaluate(c=>[c.width,c.height]),[960,540]);
 await p.waitForFunction(()=>Number(document.querySelector('dialog canvas')?.dataset.progress)===.95);
 await p.screenshot({path:join(output,width+'-95.png')});
 await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='complete');
 assert.match(await p.locator('dialog canvas').getAttribute('aria-label'),/SYSTEM ONLINE/);
 await p.screenshot({path:join(output,width+'-complete.png')});
 await p.waitForFunction(()=>!auroraPreview.isActive());assert.equal(await p.locator('dialog').count(),0);assert.deepEqual(await p.locator('#stage').boundingBox(),before);
 await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='initializing');
 await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.waitForTimeout(350);assert.equal(await p.locator('dialog canvas').getAttribute('data-phase'),'complete');await p.keyboard.up('Enter');await p.keyboard.press('Enter');await p.waitForFunction(()=>!auroraPreview.isActive());
 // Synthetic gamepad A starts held: release must precede the next activation.
 await p.evaluate(()=>{window.padDown=true;navigator.getGamepads=()=>[{index:0,buttons:[{pressed:padDown}]}];});
 await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='initializing');await p.waitForTimeout(100);assert.equal(await p.locator('dialog canvas').getAttribute('data-phase'),'initializing');
 await p.evaluate(()=>padDown=false);await p.waitForTimeout(60);await p.evaluate(()=>padDown=true);await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='complete');await p.waitForTimeout(350);await p.evaluate(()=>padDown=false);await p.waitForTimeout(60);await p.evaluate(()=>padDown=true);await p.waitForFunction(()=>!auroraPreview.isActive());
 await p.evaluate(()=>padDown=false);await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='initializing');
 if(width===390)await p.locator('dialog canvas').tap();else await p.locator('dialog canvas').click();
 await p.waitForFunction(()=>document.querySelector('dialog canvas')?.dataset.phase==='complete');await p.waitForTimeout(350);
 if(width===390)await p.locator('dialog canvas').tap();else await p.locator('dialog canvas').click();
 await p.waitForFunction(()=>!auroraPreview.isActive());
 await p.evaluate(async()=>{const pending=auroraPreview.play();auroraPreview.dispose();window.aborted=await pending;});assert.equal(await p.evaluate(()=>aborted),false);assert.equal(await p.locator('dialog').count(),0);
 await p.evaluate(async()=>{const {createAuroraBoot}=await import('/js/aurora-boot.js');window.failed=await createAuroraBoot({imageUrl:'/missing.avif'}).play();});assert.equal(await p.evaluate(()=>failed),false);assert.equal(await p.locator('dialog').count(),0);
 assert.deepEqual(errors,[]);console.log(width,'passed');await p.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}console.log(output);
