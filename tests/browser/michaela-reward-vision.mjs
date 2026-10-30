import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const html="<meta charset=\"utf-8\"><style>#host{position:relative;width:100%;aspect-ratio:16/9}#message{height:130px;white-space:pre-wrap}body{margin:0}</style><div id='host'></div><div id='message'></div><button id='buttonA'>A</button><script type='module'>import {createMichaelaRewardVision} from '/js/michaela-reward-vision.js';window.events=[];window.done=null;window.ui=createMichaelaRewardVision({host:document.querySelector('#host'),message:document.querySelector('#message'),playJingle:async key=>events.push(key)});document.querySelector('#buttonA').onclick=()=>ui.handleInput('confirm');ui.play('テスト専用台詞：本番の台詞は未定です。').then(r=>window.done=r);</script>";
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve('.'+p);if(!file.startsWith(process.cwd()))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.avif':'image/avif'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,390]){
 const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.ui);
 assert.match(await p.locator('#message').textContent(),/テスト専用台詞/);assert.equal(await p.locator('.reincarnation-vision').count(),0);
 await p.locator('#buttonA').click();
 for(const name of ['27','27b','27c'])await p.waitForFunction(n=>document.querySelector('.reincarnation-vision img')?.src.endsWith('dungeon_event_'+n+'.avif'),name,{timeout:12000});
 await p.waitForFunction(()=>document.querySelector('#message').textContent==='＊Aボタンで次へ');assert.equal(await p.evaluate(()=>done),null);
 await p.locator('#buttonA').click();await p.waitForFunction(()=>done!==null,{},{timeout:12000});assert.equal(await p.evaluate(()=>done),true);assert.deepEqual(await p.evaluate(()=>events),['goodNight']);
 await p.evaluate(()=>{window.done=null;ui.play('中断テスト').then(r=>window.done=r);ui.dispose();});await p.waitForFunction(()=>done!==null);assert.equal(await p.evaluate(()=>done),false);assert.deepEqual(errors,[]);console.log(width,'passed');await p.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
