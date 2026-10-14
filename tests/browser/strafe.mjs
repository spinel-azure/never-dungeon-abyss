import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(join(tmpdir(),'nda-strafe-'));
const base=(await readFile('tests/browser/walking-performance.mjs','utf8')).match(/const hook=`([\s\S]*?)`;/)[1];
const hook=base+`window.strafeQa={
 async setup(){await walkQa.setup(0);for(const row of cells)for(const c of row)for(const k of ['N','E','S','W'])c.walls[k]=false;
 Object.assign(state,{gridX:4,gridY:4,x:4.5,y:4.5,dir:0,angle:-Math.PI/2,torchFuel:100});walkQa.enable();virtualStickController.setMode('on');updateCharacterUi();},
 read:()=>({x:state.gridX,y:state.gridY,dir:state.dir,torch:state.torchFuel,anim:!!state.anim}),
 pad:dispatchGamepadAction,
 wall(on){cells[state.gridY][state.gridX].walls.W=on;},
 async map(){worldLocation='town';const {normalizeSpecialMaps}=await import('../data/special-maps.js');character.specialMaps=normalizeSpecialMaps({discovererName:'QA',registered:[{rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'QA'}]});
 const registered=character.specialMaps.registered;const c=startSpecialMapExploration({registered,mapKey:mapOriginalId(registered[0]),message:msgEl,playSe,saveSurvey:()=>({ok:true}),onExit:()=>{}});await c.ready;
 const s=c.session;s.renderState.overlayEvent=null;s.incenseActive=true;s.playerX=4;s.playerY=4;s.direction=0;s.renderState.x=4.5;s.renderState.y=4.5;s.renderState.angle=-Math.PI/2;
 s.cells[4][4].walls.W=false;s.cells[4][3].walls.E=false;return true;},
 mapRead:()=>{const s=getSpecialMapContext().session;return {x:s.playerX,y:s.playerY,dir:s.direction,motion:!!s.motion,torch:s.torchFuel};}
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844],['tablet',820,1180],['tablet-short',768,900]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:label!=='pc'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>navigator.getGamepads=()=>[]);
 const main=await readFile('js/main.js','utf8');await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady="true";')}));
 const player=(await readFile('js/player.js','utf8')).replace('const encounterTriggered = onExplorationStep({','const encounterTriggered = false && onExplorationStep({');await p.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player}));
 const title=await readFile('js/title-screen.js','utf8');await p.route('**/js/title-screen.js*',r=>r.fulfill({contentType:'text/javascript',body:title+'\nwindow.disableTitleForWalking=()=>{titleOpen=false;};'}));
 await p.goto('http://127.0.0.1:4174');await p.waitForFunction(()=>window.strafeQa);await p.evaluate(()=>strafeQa.setup());
 async function key(key){await p.keyboard.press(key);await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');}
 await key('w');assert.deepEqual(await p.evaluate(()=>strafeQa.read()),{x:4,y:3,dir:0,torch:99,anim:false});
 await key('s');await key('a');assert.equal((await p.evaluate(()=>strafeQa.read())).dir,3);await key('d');
 await key('q');assert.deepEqual(await p.evaluate(()=>strafeQa.read()),{x:3,y:4,dir:0,torch:97,anim:false});await key('e');
 await p.evaluate(()=>strafeQa.wall(true));await key('q');assert.equal((await p.evaluate(()=>strafeQa.read())).x,4);await p.evaluate(()=>strafeQa.wall(false));
 await p.evaluate(()=>strafeQa.pad('pageLeft'));await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');assert.equal((await p.evaluate(()=>strafeQa.read())).x,3);
 await p.evaluate(()=>strafeQa.pad('pageRight'));await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');assert.equal((await p.evaluate(()=>strafeQa.read())).x,4);
 if(label!=='pc'){
  assert.equal(await p.locator('#strafeLeft').isVisible(),true);
  await p.locator('#strafeLeft').tap();await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');assert.equal((await p.evaluate(()=>strafeQa.read())).x,3);
  await p.locator('#strafeRight').tap();await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');assert.equal((await p.evaluate(()=>strafeQa.read())).x,4);
  const box=await p.locator('.strafe-controls').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  for(const selector of ['.touch-dpad','#buttonA','#buttonB']){const control=await p.locator(selector).boundingBox();assert.ok(box.y+box.height<=control.y-4,`${label}: strafe overlaps ${selector}`);}
  await p.screenshot({path:join(output,label+'.png')});
 }
 await key('z');const saved=await p.evaluate(()=>strafeQa.read());await key('q');assert.deepEqual(await p.evaluate(()=>strafeQa.read()),saved);await key('z');
 await p.evaluate(()=>strafeQa.map());await key('q');assert.equal((await p.evaluate(()=>strafeQa.mapRead())).x,3);
 await p.evaluate(()=>strafeQa.pad('pageRight'));await p.waitForFunction(()=>!strafeQa.read().anim&&document.querySelector('.special-map-runtime')?.dataset.moving!=='true');const m=await p.evaluate(()=>strafeQa.mapRead());assert.equal(m.x,4);assert.equal(m.dir,0);assert.equal(m.torch,98);
 if(label.startsWith('tablet')){const strafe=await p.locator('.strafe-controls').boundingBox();const message=await p.locator('#message').boundingBox();assert.ok(message.y+message.height<strafe.y);const commands=await p.locator("#dungeonCommands").boundingBox();assert.ok(commands.y+commands.height+4<strafe.y);await p.screenshot({path:join(output,label+'-map.png')});}
 assert.deepEqual(errors,[]);console.log(label+' passed');await p.close();
}}finally{await browser.close();}console.log(output);
