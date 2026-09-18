import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.lqa=depth=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=depth;firstDungeonTutorialActive=false;deckTutorialActive=false;setBgmOptions({enabled:false});setSeOptions({enabled:false});};`;
await mkdir('artifacts/leo-room',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.lqa);
for(const depth of [1,22]){
await page.evaluate(async depth=>{lqa(depth);const d=await import('/js/dungeon.js');const p=await import('/js/player.js');d.setDoor(2,2,'E','closed','specialLocked');Object.assign(p.state,{gridX:2,gridY:2,x:2.5,y:2.5,dir:1,angle:0,anim:null,overlayEvent:null,autoReturning:false});if(depth===1)p.openDoorAhead();},depth);
await page.waitForTimeout(1000);await page.screenshot({path:`artifacts/leo-room/b${depth}.png`});
}
assert.deepEqual(errors,[]);console.log('B1 Leo / B22 purple render passed');
}finally{await browser.close();}
