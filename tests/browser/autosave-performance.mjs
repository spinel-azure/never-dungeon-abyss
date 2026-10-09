// Synthetic saves in isolated Edge storage; real save and backup path. No user save is read.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const read=(variant,path)=>variant==='before'?execFileSync('git',['show',`${process.env.SAVE_BASE_REF||'b8d2e50'}:${path}`],{encoding:'utf8'}):fs.readFileSync(path,'utf8');
(async()=>{const base=fs.readFileSync('tests/browser/walking-performance.mjs','utf8').match(/const hook=`([\s\S]*?)`;/)[1];
const extra=`window.saveQa={enable(value){if(typeof autosaveScheduler!=='undefined')autosaveScheduler.cancel();else{clearTimeout(autosaveTimer);autosaveTimer=0;}saveEnabled=value;},pad(n){character.qaPadding='x'.repeat(n);},save:saveGame,snapshot:makeSaveSnapshot,schedule:scheduleAutosave};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const variant of ['before','after']){let main=read(variant,'js/main.js').replace('  document.documentElement.dataset.ndaMainReady = "true";',base+extra+'\n document.documentElement.dataset.ndaMainReady="true";');
main=main.replace('  function saveGame({','  function profiledSaveGame({').replace('  function scheduleAutosave() {',`  function saveGame(...args){const t=performance.now(),moving=Boolean(state.anim);let ok;try{return ok=profiledSaveGame(...args)}finally{window.qaSaves?.push({ms:performance.now()-t,moving,ok,start:t});}}
 function scheduleAutosave() {`);
let integrity=read(variant,'js/save-integrity.js');
for(const name of ['decodeBase64Utf8','hmacSha256']){integrity=integrity.replace('function '+name+'(', 'function measured_'+name+'(');integrity+=`\nfunction ${name}(...args){const t=performance.now();try{return measured_${name}(...args)}finally{window.qaProfile?.push({name:'${name}',ms:performance.now()-t})}}`;}
// hmac's exported name must remain the existing public API.
integrity=integrity.replace('export function measured_hmacSha256','function measured_hmacSha256').replace('\nfunction hmacSha256(...args)','\nexport function hmacSha256(...args)');
let data=read(variant,'js/save-data.js').replace('function writeValidatedSave(', 'function measured_writeValidatedSave(')+`\nfunction writeValidatedSave(...args){const t=performance.now();try{return measured_writeValidatedSave(...args)}finally{window.qaProfile?.push({name:'validatedWrite',ms:performance.now()-t})}}`;
const title=read(variant,'js/title-screen.js')+'\nwindow.disableTitleForWalking=()=>{titleOpen=false;};';
const player=read(variant,'js/player.js').replace('const encounterTriggered = onExplorationStep({','const encounterTriggered = false && onExplorationStep({');
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];window.qaSaves=[];window.qaProfile=[];window.qaFrames=[];let prev=performance.now();function frame(t){qaFrames.push({at:t,ms:t-prev});prev=t;requestAnimationFrame(frame)}requestAnimationFrame(frame);});
const i=integrity,ts=title;
for(const [path,body] of [['js/main.js?*',main],['js/save-integrity.js',i],['js/save-data.js',data],['js/title-screen.js*',ts],['js/player.js',player]])await page.route('**/'+path,r=>r.fulfill({contentType:'text/javascript',body}));
await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.saveQa);await page.evaluate(()=>walkQa.setup(33));
for(const pad of [0,65536,262144]){const result=await page.evaluate(pad=>{saveQa.pad(pad);saveQa.enable(true);for(let n=0;n<5;n++)saveQa.save();qaSaves=[];qaProfile=[];for(let n=0;n<20;n++){if(!saveQa.save())throw Error('save failed');}saveQa.enable(false);const times=qaSaves.map(s=>s.ms).sort((a,b)=>a-b),profile={};for(const name of ['decodeBase64Utf8','hmacSha256','validatedWrite']){const a=qaProfile.filter(p=>p.name===name);profile[name]={msPerSave:a.reduce((s,p)=>s+p.ms,0)/20,callsPerSave:a.length/20};}return {jsonBytes:new TextEncoder().encode(JSON.stringify(saveQa.snapshot())).length,mean:times.reduce((s,t)=>s+t,0)/20,p95:times[18],max:times.at(-1),profile};},pad);console.log(JSON.stringify({variant,pad,...result}));}
if(true){await page.evaluate(async()=>{await walkQa.setup(33);saveQa.pad(65536);saveQa.enable(true);saveQa.save();});await page.waitForTimeout(600);await page.evaluate(()=>{qaSaves=[];qaFrames=[];walkQa.enable();walkQa.input('up');});await page.waitForFunction(()=>walkQa.read().x===2&&!walkQa.read().anim);await page.waitForTimeout(100);await page.evaluate(()=>walkQa.input('up'));await page.waitForFunction(()=>walkQa.read().x===3&&!walkQa.read().anim);await page.waitForTimeout(600);console.log(JSON.stringify({variant,walking:await page.evaluate(()=>({saves:qaSaves,framesOver25:qaFrames.filter(f=>f.ms>25),position:walkQa.read().x}))}));}
if(variant==='after')assert.ok((await page.evaluate(()=>qaSaves)).every(s=>!s.moving));
await page.evaluate(()=>{qaSaves=[];qaFrames=[];window.heldInput=setInterval(()=>walkQa.input('right'),40);});
await page.waitForTimeout(6800);await page.evaluate(()=>clearInterval(heldInput));await page.waitForTimeout(600);
const held=await page.evaluate(()=>({saves:qaSaves,framesOver25:qaFrames.filter(f=>f.ms>25)}));console.log(JSON.stringify({variant,held}));
if(variant==='after'){assert.ok(held.saves.length>=2);assert.ok(held.saves.every(s=>!s.moving&&s.ok));}
await page.evaluate(()=>saveQa.enable(false));
await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nda:title-options-closed')));
assert.equal(await page.locator('[data-title-action="continue"]').count(),1);
assert.deepEqual(errors,[]);await page.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
