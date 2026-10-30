import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const html=`<style>#host{position:relative;width:100%;aspect-ratio:16/9}#message{height:130px;white-space:pre-wrap}body{margin:0}</style><div id="host"></div><div id="commands"></div><div id="message"></div><button id="buttonA">A</button><script type="module">
import {createSurveyReportUI} from '/js/survey-report-ui.js';
import {createInitialCharacter} from '/data/classes.js';
import {surveyOperation,transactSurvey} from '/data/survey-report.js';
let c=createInitialCharacter({name:'QA',job:'warrior'});c=surveyOperation(surveyOperation(c,'book').character,'intro').character;c.specialMaps.surveyRewardClaims=Object.fromEntries(Array.from({length:1000},(_,seed)=>[JSON.stringify(['special-map-v2',seed,1,'WHITE']),true]));
window.events=[];window.back=false;window.saveOk=true;
window.ui=createSurveyReportUI({host:document.querySelector('#host'),commands:document.querySelector('#commands'),message:document.querySelector('#message'),getCharacter:()=>c,transact:(a,id)=>transactSurvey({getCharacter:()=>c,setCharacter:n=>c=n,save:()=>saveOk},a,id),playSe:()=>{},playJingle:async k=>events.push(k),onBack:()=>window.back=true});window.read=()=>c;document.querySelector('#buttonA').onclick=()=>ui.input('confirm');ui.open('');</script>`;
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve('.'+p);if(!file.startsWith(process.cwd()))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.avif':'image/avif'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const width of [1280,390]){const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.ui);assert.match(await p.locator('#message').textContent(),/1000件/);
for(let i=0;i<10&&!(await p.locator('.reincarnation-vision').count());i++)await p.locator('#buttonA').click();
await p.waitForFunction(()=>document.querySelector('.reincarnation-vision img')?.src.endsWith('dungeon_event_26.avif'));
await p.waitForFunction(()=>document.querySelector('.reincarnation-vision img')?.src.endsWith('dungeon_event_26b.avif'),{},{timeout:12000});
await p.waitForFunction(()=>document.querySelector('.reincarnation-vision img')?.src.endsWith('dungeon_event_26c.avif'),{},{timeout:12000});
await p.waitForFunction(()=>document.querySelector('#message').textContent==='＊Aボタンで次へ');assert.equal(await p.evaluate(()=>!!read().eventFlags.survey_1000_celebration_completed),false);await p.locator('#buttonA').click();await p.waitForFunction(()=>window.back,{},{timeout:12000});assert.deepEqual(await p.evaluate(()=>events),['goodNight']);assert.equal(await p.evaluate(()=>read().eventFlags.survey_1000_celebration_completed),true);await p.evaluate(()=>ui.open(''));assert.equal(await p.locator('.reincarnation-vision').count(),0);assert.deepEqual(errors,[]);console.log(width,'passed');await p.close();}}finally{await browser.close();await new Promise(r=>server.close(r));}
