// Synthetic corridor: encounters and disk saves disabled; gamepad uses the action entry point.
// Baseline defaults to the pre-optimization commit; override WALK_BASE_REF when appropriate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const paths=['js/main.js','data/quests.js','data/guild-quest-notifications.js','js/rumor-notification.js'];
const browser=await chromium.launch({channel:'msedge',headless:true});
const hook=`window.walkQa={async setup(count){
 window.disableTitleForWalking();document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');closeTown();saveEnabled=false;
 character=createInitialCharacter({name:'歩行比較',job:'warrior'});character.quests.completedQuestIds=(await import('../data/quests.js')).QUESTS.slice(0,count).map(q=>q.id);
 character.eventFlags.guild_first_request_unlocked=true;character.guildQuestNotifications.notifiedIds=(await import('../data/quests.js')).QUESTS.map(q=>q.id);
 character.lootBagTutorialSeen=true;character.firstDungeonTutorialSeen=true;worldLocation='dungeon';currentDepth=1;resetDungeon('',null,true);
 const d=await import('./dungeon.js');const blank=d.makeCells(10,10);for(let y=0;y<10;y++)for(let x=0;x<10;x++)d.cells[y][x]=blank[y][x];
 for(let x=1;x<9;x++){d.cells[1][x].walls.E=x===8;d.cells[1][x].walls.W=x===1;}
 Object.assign(state,{gridX:1,gridY:1,x:1.5,y:1.5,dir:1,angle:0,anim:null,overlayEvent:null,autoReturning:false});
 setBgmOptions({enabled:false});setSeOptions({enabled:false});setRawPlayerInputEnabled(false);window.walkTimes=[];
},async bench(){const times=[];for(let i=0;i<120;i++){const t=performance.now();handleDungeonStep();handlePersistentStateChanged();await Promise.resolve();if(i>=20)times.push(performance.now()-t)}times.sort((a,b)=>a-b);return {mean:times.reduce((a,b)=>a+b)/times.length,p95:times[95]};},
 enable(){setRawPlayerInputEnabled(true)},input:dispatchGamepadAction,read:()=>({x:state.gridX,anim:state.anim,torch:state.torchFuel,hp:character.hp,enabled:isPlayerInputEnabled(),overlay:state.overlayEvent,transition:sceneTransitionRunning,menu:isMenuOpen(),town:getTownState(),focus:document.activeElement?.tagName})};`;
try{for(const revision of ['before','after']){
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 for(const path of paths){let source=revision==='before'?execFileSync('git',['show',`${process.env.WALK_BASE_REF || "e568d733e261a513c0be447a120ce78f0b321c5f"}:${path}`],{encoding:'utf8'}):await readFile(path,'utf8');if(path==='js/main.js')source=source.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady="true";');await page.route('**/'+path+(path.endsWith('main.js')?'?*':''),r=>r.fulfill({contentType:'text/javascript',body:source}));}
 const player=(await readFile('js/player.js','utf8')).replace('const encounterTriggered = onExplorationStep({','const encounterTriggered = false && onExplorationStep({').replace('hooks.onDungeonStep();','hooks.onDungeonStep();window.walkTimes?.push(performance.now());');
 await page.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player}));
 const title=await readFile('js/title-screen.js','utf8');await page.route('**/js/title-screen.js*',r=>r.fulfill({contentType:'text/javascript',body:title+'\nwindow.disableTitleForWalking=()=>{titleOpen=false;};'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.walkQa);
 for(const count of [0,15,33]){await page.evaluate(n=>walkQa.setup(n),count);console.log(JSON.stringify({revision,count,stepCallbacks:await page.evaluate(()=>walkQa.bench())}));}
 for(const input of ['keyboard','gamepad-action'])for(const held of [false,true]){
  await page.evaluate(()=>walkQa.setup(33));await page.evaluate(()=>walkQa.enable());
  if(held){await page.evaluate(input=>{window.walkTimer=setInterval(()=>input==='keyboard'?window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',code:'ArrowUp',repeat:true})):walkQa.input('up'),40)},input);await page.waitForFunction(()=>walkQa.read().x===7,{},{timeout:7000});await page.evaluate(()=>clearInterval(window.walkTimer));}
  else{for(let i=0;i<6;i++){if(input==='keyboard')await page.keyboard.press('ArrowUp');else await page.evaluate(()=>walkQa.input('up'));await page.waitForFunction(x=>walkQa.read().x===x&&!walkQa.read().anim,i+2,{timeout:4000}).catch(async e=>{console.log(JSON.stringify(await page.evaluate(()=>walkQa.read())));console.log(errors);throw e});}}
  const times=await page.evaluate(()=>walkTimes);const intervals=times.slice(1).map((t,i)=>t-times[i]);console.log(JSON.stringify({revision,input,held,steps:times.length,meanArrivalInterval:intervals.reduce((a,b)=>a+b)/intervals.length}));
  assert.ok(times.length>=6);assert.ok((await page.evaluate(()=>walkQa.read())).torch<100);
 }
 assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close()}
