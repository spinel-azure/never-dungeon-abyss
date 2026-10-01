import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.normalEntryQa={setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'確認',job:'mage'});character.firstDungeonTutorialSeen=true;setBgmOptions({enabled:false});setSeOptions({enabled:false});worldLocation='town';openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});updateCharacterUi();setPlayerInputEnabled(false);},enter(){void enterDungeonFromTown();},snapshot(){return {depth:currentDepth,world:worldLocation,event:state.overlayEvent?.type,titleHidden:sceneTransitionTitle.hidden,opacity:getComputedStyle(sceneTransition).opacity,text:sceneTransitionTitle.innerText,running:sceneTransitionRunning};}};`;
await mkdir('artifacts/normal-entry-review',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:900}});
await page.addInitScript(()=>navigator.getGamepads=()=>[]);
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.normalEntryQa);await page.evaluate(()=>{normalEntryQa.setup();normalEntryQa.enter();});
await page.waitForTimeout(1000);const during=await page.evaluate(()=>normalEntryQa.snapshot());await page.screenshot({path:'artifacts/normal-entry-review/during.png'});
await page.waitForFunction(()=>!normalEntryQa.snapshot().running);const after=await page.evaluate(()=>normalEntryQa.snapshot());await page.screenshot({path:'artifacts/normal-entry-review/after.png'});
console.log({during,after});await writeFile('artifacts/normal-entry-review/result.json',JSON.stringify({during,after},null,2));
}finally{await browser.close();}
