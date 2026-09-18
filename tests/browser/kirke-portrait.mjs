import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.kqa=()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=58;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'スピネル',job:'thief'});setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();};`;
await mkdir('artifacts/kirke-portrait',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\nwindow.closeTitleQA=()=>{titleOpen=false;};'}));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.kqa);
 await page.evaluate(async()=>{closeTitleQA();kqa();window.kplayer=await import('/js/player.js');kplayer.configurePlayer({deliverBeeswaxToKirke:()=>({accepted:true,message:'キルケ「わざわざこんな所まで届けさせて悪かったね。お礼にコイツをあげるよ。」\n「蜜蝋の耳栓」を手に入れた！'})});kplayer.startOverlayEvent({type:'kirkeHouse',phase:'house',canDeliver:true,content:{portraitId:'NPC_23'},imageId:'NPC_23',image:'images/npc/NPC_23.avif',imageFit:'cover',showOverlay:true,canCancel:false,message:'＊Aボタン：次へ'});});
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>kplayer.state.overlayEvent.phase==='kirke');
 assert.equal(await page.evaluate(()=>kplayer.state.overlayEvent.imageFit),'containBottom');
 await page.waitForTimeout(1200);await page.screenshot({path:`artifacts/kirke-portrait/${label}.png`});assert.deepEqual(errors,[]);console.log(label+' Kirke portrait passed');await page.close();
}}finally{await browser.close();}
