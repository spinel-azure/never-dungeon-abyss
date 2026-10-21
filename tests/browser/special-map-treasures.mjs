import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(path.join(tmpdir(),'nda-map-chests-'));console.log(output);
const source=await readFile('js/main.js','utf8');
const hook=`window.chestQa={
 async start(tier=3){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 startNewGame();rumorNotificationController.dispose();guildQuestNotificationController.dispose();shopNotificationController.dispose();character=normalizeCharacter({...createInitialCharacter({name:'箱確認',job:'mage'}),reincarnationCount:tier});
 character.inventory.counts.guiding_torch=20;
 const {normalizeSpecialMaps,mapOriginalId}=await import('/data/special-maps.js');
 const map={rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'QA'};
 character.specialMaps=normalizeSpecialMaps({discovererName:'QA',registered:[map]});
 setBgmOptions({enabled:false});setSeOptions({enabled:false});worldLocation='town';
 openTown({registrationRequired:false,mode:'dungeonEntrance'});updateCharacterUi();setPlayerInputEnabled(false);
 const {getSpecialMapHost}=await import('/js/special-map/context.js');
 const host=getSpecialMapHost();host.runEntryTransition=null;const show=host.showTreasure;host.showTreasure=(color,options)=>{window.qaPreviewColor=color;return show(color,options);};const opening=host.playTreasureOpening;host.playTreasureOpening=(color,callback,options)=>{window.qaOpeningColor=color;return opening(color,callback,options);};
 startSpecialMapExploration({registered:character.specialMaps.registered,mapKey:mapOriginalId(character.specialMaps.registered[0]),message:msgEl,playSe,saveSurvey:mask=>transactSpecialMaps({getCharacter:()=>character,setCharacter:c=>{character=c;},save:()=>saveGame()},maps=>updateMapSurvey(maps,mapOriginalId(character.specialMaps.registered[0]),mask)),onExit:()=>{}});
 const s=getSpecialMapContext().session;s.renderState.overlayEvent=null;s.incenseActive=true;
 },
 async at(color){const s=getSpecialMapContext().session;const p=s.floors[s.currentFloor].treasures.find(x=>x.color===color);s.playerX=p.x;s.playerY=p.y;s.renderState.x=p.x+.5;s.renderState.y=p.y+.5;s.renderState.overlayEvent=null;s.cellPrompt=null;const {beginV2CellPrompt}=await import('/js/special-map/session-v2.js');beginV2CellPrompt(s);return p.id;},
 async gold(){const s=getSpecialMapContext().session;await this.at('black');const {prepareV2Treasure}=await import('/js/special-map/treasures-v2.js');for(let i=0;i<10000;i++){s.expeditionId='browser-gold-'+i;s.treasureStates={};prepareV2Treasure(s,character.reincarnationCount,()=>false,character);if(Object.values(s.treasureStates).some(x=>x.color==='gold'))return;}throw Error('No gold seed');},
 input:handleSpecialMapInput,
 state(){const s=getSpecialMapContext().session;return {busy:s.transitioning,states:s.treasureStates,bag:s.lootBag,counts:s.floors.map(f=>f.treasures.length),message:msgEl.textContent};},
 async resume(){const data=makeSaveSnapshot().specialMap;getSpecialMapContext().close();resumeSavedSpecialMap(data);return this.state();}
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
async function freshPage(width,errors){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.chestQa);
 return page;
}
try{for(const width of [1280,390]){
 const errors=[];let page=await freshPage(width,errors);
 await page.evaluate(()=>chestQa.start());await page.waitForTimeout(3500);const id=await page.evaluate(()=>chestQa.at('red'));await page.waitForTimeout(1500);
 await page.screenshot({path:path.join(output,`${width}-red.png`)});
 await page.evaluate(()=>chestQa.input('confirm'));
 await page.waitForFunction(id=>chestQa.state().states[id]?.opened&&!chestQa.state().busy,id,{timeout:30000});
 const opened=await page.evaluate(()=>chestQa.state());assert.ok(opened.bag);
 await page.screenshot({path:path.join(output,`${width}-opened.png`)});
 const resumed=await page.evaluate(()=>chestQa.resume());assert.deepEqual(resumed.bag,opened.bag);assert.deepEqual(resumed.states,opened.states);
 const blackId=await page.evaluate(()=>chestQa.at('black'));await page.waitForFunction(()=>window.qaPreviewColor==='black');await page.screenshot({path:path.join(output,width+'-black-preview.png')});await page.evaluate(()=>chestQa.input('confirm'));
 await page.waitForFunction(id=>chestQa.state().states[id]?.opened&&!chestQa.state().busy,blackId,{timeout:30000});
 assert.match((await page.evaluate(()=>chestQa.state())).message,/ロット袋/);
 await page.screenshot({path:path.join(output,`${width}-black.png`)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const tier of [0,3]){
 await page.close();page=await freshPage(width,errors);await page.evaluate(t=>chestQa.start(t),tier);await page.waitForTimeout(3500);await page.evaluate(()=>chestQa.gold());
 const goldId=await page.evaluate(()=>chestQa.at('black'));await page.evaluate(()=>chestQa.input('confirm'));
 await page.waitForFunction(id=>chestQa.state().states[id]?.opened&&!chestQa.state().busy,goldId,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.qaOpeningColor),'gold');const golden=await page.evaluate(()=>chestQa.state());assert.equal(golden.states[goldId].reward.equipmentId,tier===0?'katzenstab':'katzennova');assert.equal(golden.bag.equipmentInstances.length,1);
 await page.screenshot({path:path.join(output,width+'-gold-tier'+tier+'.png')});
 const restored=await page.evaluate(()=>chestQa.resume());assert.deepEqual(restored.bag,golden.bag);
 }
 assert.deepEqual(errors,[]);console.log(width,'passed',opened.counts);await page.close();
}}finally{await browser.close();}
