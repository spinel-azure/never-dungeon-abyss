import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.v2Qa={
 async setup(){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'V2確認',job:'mage'});
 character.inventory.counts.guiding_torch=20;
 const {normalizeSpecialMaps}=await import('/data/special-maps.js');
 const {decodeMapCode}=await import('/data/special-map-code.js');
 character.specialMaps=normalizeSpecialMaps({discovererName:'スピネ',registered:[decodeMapCode('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta').map]});
 (await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);
 setBgmOptions({enabled:false});setSeOptions({enabled:false});
 worldLocation='town';openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});updateCharacterUi();setPlayerInputEnabled(false);
 },
 s:()=>getSpecialMapContext()?.session,
 input:handleSpecialMapInput,
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),hp:character.hp,sp:character.sp,gold:character.gold,flags:character.eventFlags,keys:character.keyItems,maps:character.specialMaps}),
 save:makeSaveSnapshot,
 refill:()=>useFieldItem('guiding_torch'),
 menu:()=>isMenuOpen(),
 async settled(){for(let i=0;i<300;i++){const s=this.s();if(!s.motion&&!s.renderState.anim&&!s.transitioning)return;await new Promise(r=>setTimeout(r,16));}throw Error('motion timeout');},
 async face(d){while(this.s().direction!==d){this.input('right');await this.settled();}},
 async go(point){
 const s=this.s();if(s.renderState.overlayEvent)this.input('confirm');
 const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0],start=s.playerY*10+s.playerX,end=point.y*10+point.x,q=[start],seen=new Map([[start,[]]]);
 for(const i of q){if(i===end)break;for(let d=0;d<4;d++){const x=i%10,y=Math.floor(i/10),nx=x+dx[d],ny=y+dy[d],j=ny*10+nx;
 if(nx<0||ny<0||nx>=10||ny>=10||s.cells[y][x].walls[dirs[d]]||s.isDoorLocked(x,y,dirs[d])||seen.has(j))continue;seen.set(j,[...seen.get(i),d]);q.push(j);}}
 if(!seen.has(end))throw Error('no walk path');
 for(const d of seen.get(end)){
  if(s.torchFuel<10)this.refill();await this.face(d);
  if(s.cells[s.playerY][s.playerX].doors[dirs[d]]==='closed'){this.input('confirm');await this.settled();}
  const x=s.playerX,y=s.playerY;this.input('up');await this.settled();if(s.playerX===x&&s.playerY===y)throw Error('step blocked');
 }
 },
 status(){const s=this.s();return s?{floor:s.currentFloor,fuel:s.torchFuel,key:s.bossKeyFound,unlocked:s.bossDoorUnlocked,counts:s.floors.map(f=>f.explored.flat().filter(Boolean).length),fp:s.fingerprint,theme:s.generatedMap.themeId,xy:[s.playerX,s.playerY],doors:s.openedDoors.size}:null;}
};`;
await mkdir('artifacts/special-map-v2-entry',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
 const confirm=()=>touch?page.locator('#buttonA').tap():page.keyboard.press('Enter');
 const cancel=()=>touch?page.locator('#buttonB').tap():page.keyboard.press('KeyZ');page.setDefaultTimeout(15000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];window.treasureDraws=0;window.redDoorDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if((img?.src||'').includes('treasure-gold'))window.treasureDraws++;if((img?.src||'').includes('dungeon_door_red'))window.redDoorDraws++;return draw.call(this,img,...args);};});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace("sceneTransitionTitle.querySelector('strong').textContent = 'MAP DUNGEON';","window.v2EntryCount=(window.v2EntryCount||0)+1;sceneTransitionTitle.querySelector('strong').textContent = 'MAP DUNGEON';").replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>v2Qa.setup());
 const before=await page.evaluate(()=>v2Qa.normal());
 await page.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');await page.screenshot({path:`artifacts/special-map-v2-entry/${label}-list.png`});
 await page.getByRole('button',{name:/三層の特殊地図/}).click();await page.getByRole('button',{name:/三層の特殊地図/}).click();
 await page.getByRole('button',{name:'探索する（A）',exact:true}).click();await page.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('#sceneTransition').hidden);
 assert.equal(await page.evaluate(()=>!!v2Qa.s()),false);
 await confirm();await cancel();await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>!!v2Qa.s()),false);
 await page.waitForFunction(()=>!document.querySelector('#sceneTransitionTitle').hidden);
 assert.match(await page.locator('#sceneTransitionTitle').innerText(),/ENTERING\s+MAP DUNGEON/);
 assert.match(await page.locator('#sceneTransitionTitle').evaluate(e=>getComputedStyle(e).fontFamily),/PixelFont/);
 assert.equal(await page.evaluate(()=>!!v2Qa.s()),false);
 await page.waitForTimeout(700);
 const opacity=await page.locator('#sceneTransition').evaluate(e=>Number(getComputedStyle(e).opacity));assert.ok(opacity>0&&opacity<1,'title is visible during fade, before full darkness');
 await page.screenshot({path:`artifacts/special-map-v2-entry/${label}-entering.png`});
 await page.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);
 assert.equal(await page.locator('#depth').textContent(),'B1F');
 assert.equal(await page.locator('#sceneTransitionTitle').evaluate(e=>e.hidden),true);
 assert.equal(await page.evaluate(()=>v2Qa.s().renderState.overlayEvent.overlayMessage),'三層の特殊地図');
 await page.screenshot({path:`artifacts/special-map-v2-entry/${label}-entry.png`});
 await confirm();await page.keyboard.press('ArrowUp');await page.evaluate(()=>v2Qa.settled());
 assert.equal((await page.evaluate(()=>v2Qa.status())).fuel,99);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);results.push({label,opacity,errors,inputRestored:true});await page.close();
}await writeFile('artifacts/v2-entry-matched-browser.json',JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}
