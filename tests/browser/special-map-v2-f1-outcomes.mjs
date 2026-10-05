import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
const baseHook="window.v2Qa={\r\n async setup(){\r\n document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');\r\n startNewGame();character=createInitialCharacter({name:'V2確認',job:'mage'});\r\n character.inventory.counts.guiding_torch=20;\r\n const {normalizeSpecialMaps}=await import('/data/special-maps.js');\r\n const {decodeMapCode}=await import('/data/special-map-code.js');\r\n character.specialMaps=normalizeSpecialMaps({discovererName:'スピネ',registered:[decodeMapCode('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta').map]});\r\n (await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);\r\n setBgmOptions({enabled:false});setSeOptions({enabled:false});\r\n worldLocation='town';openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});updateCharacterUi();setPlayerInputEnabled(false);\r\n },\r\n s:()=>getSpecialMapContext()?.session,\r\n input:handleSpecialMapInput,\r\n normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),hp:character.hp,sp:character.sp,gold:character.gold,flags:character.eventFlags,keys:character.keyItems,maps:{...character.specialMaps,registered:character.specialMaps.registered.map(({surveyedMasks,...map})=>map)}}),\r\n save:makeSaveSnapshot,\r\n refill:()=>useFieldItem('guiding_torch'),\r\n menu:()=>isMenuOpen(),\r\n async settled(){for(let i=0;i<300;i++){const s=this.s();if(!s.motion&&!s.renderState.anim&&!s.transitioning)return;await new Promise(r=>setTimeout(r,16));}throw Error('motion timeout');},\r\n async face(d){while(this.s().direction!==d){this.input('right');await this.settled();}},\r\n async go(point){\r\n const s=this.s();if(s.renderState.overlayEvent)this.input('confirm');\r\n const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0],start=s.playerY*10+s.playerX,end=point.y*10+point.x,q=[start],seen=new Map([[start,[]]]);\r\n for(const i of q){if(i===end)break;for(let d=0;d<4;d++){const x=i%10,y=Math.floor(i/10),nx=x+dx[d],ny=y+dy[d],j=ny*10+nx;\r\n if(nx<0||ny<0||nx>=10||ny>=10||s.cells[y][x].walls[dirs[d]]||s.isDoorLocked(x,y,dirs[d])||seen.has(j))continue;seen.set(j,[...seen.get(i),d]);q.push(j);}}\r\n if(!seen.has(end))throw Error('no walk path');\r\n for(const d of seen.get(end)){\r\n  if(s.cellPrompt)this.input('cancel');\r\n  if(s.torchFuel<10)this.refill();await this.face(d);\r\n  if(s.cells[s.playerY][s.playerX].doors[dirs[d]]==='closed'){this.input('confirm');await this.settled();}\r\n  const x=s.playerX,y=s.playerY;this.input('up');await this.settled();if(s.playerX===x&&s.playerY===y)throw Error('step blocked');\r\n }\r\n },\r\n status(){const s=this.s();return s?{floor:s.currentFloor,fuel:s.torchFuel,key:s.bossKeyFound,unlocked:s.bossDoorUnlocked,counts:s.floors.map(f=>f.explored.flat().filter(Boolean).length),fp:s.fingerprint,theme:s.generatedMap.themeId,xy:[s.playerX,s.playerY],doors:s.openedDoors.size}:null;}\r\n};";
const main=(await readFile('js/main.js','utf8')).replace('  async function finishV2Battle(battle,outcome){',"  async function finishV2Battle(battle,outcome){ console.log('OUTCOME',outcome,battle.outcome);");const results=[];
try{for(const width of [1280,390]){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(40000);const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});p.on('console',m=>{if(m.text().startsWith('OUTCOME'))console.log(m.text());});
 const extra=`window.outcomeQa={
 normal:()=>JSON.stringify({currentDepth,highest:character.highestDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),flags:character.eventFlags}),
 snapshot:()=>{const s=v2Qa.s();return JSON.stringify({floor:s.currentFloor,x:s.playerX,y:s.playerY,dir:s.direction,torch:s.torchFuel,masks:s.surveyedMasks,key:s.bossKeyFound,unlock:s.bossDoorUnlocked,doors:[...s.openedDoors]});},
 random:Math.random,prepare(dead=false){Math.random=dead?this.random:()=>.01;character.hp=dead?1:9999;character.maxHp=9999;setBattleSpeedMode('fast');v2Qa.s().presence=99;},
 async step(){const s=v2Qa.s();if(s.cellPrompt)v2Qa.input('cancel');for(let d=0;d<4;d++){if(!s.cells[s.playerY][s.playerX].walls[['N','E','S','W'][d]]){await v2Qa.face(d);v2Qa.input('up');return;}}},
 failSave(){const s=v2Qa.s();this.flush=s.flushSurvey;s.flushSurvey=()=>{s.surveyError='QA storage failure';return false;};},
 restoreSave(){v2Qa.s().flushSurvey=this.flush;},
 active:isBattleActive,
 input:handleBattleInput,
 character:()=>({alive:character.alive,hp:character.hp}),
 masks:()=>character.specialMaps.registered[0].surveyedMasks
};`;
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',baseHook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>window.outcomeQa);await p.evaluate(()=>v2Qa.setup());
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 for(let n=0;n<2;n++)await p.getByRole('button',{name:/荒れ果てた晶宮の地図 Lv.50/}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>v2Qa.input('confirm'));
 const normal=await p.evaluate(()=>outcomeQa.normal());
 const masks=await p.evaluate(()=>[...v2Qa.s().surveyedMasks]);
 await p.evaluate(()=>{v2Qa.s().surveyedMasks=Array(3).fill('f'.repeat(25));});
 for(const expanded of [false,true]){
  if(expanded)await p.evaluate(()=>v2Qa.input('map'));
  await p.waitForFunction(()=>document.querySelector('#specialSurveyChip').textContent==='調査100/100\n総合300/300');
  await p.waitForTimeout(80);
  const bounds=await p.evaluate(async()=>{const {getActiveMinimapBounds}=await import('/js/renderer.js');const c=document.querySelector('.special-map-view'),r=c.getBoundingClientRect(),b=getActiveMinimapBounds(),scale=Math.min(r.width/c.width,r.height/c.height),chip=document.querySelector('#specialSurveyChip').getBoundingClientRect();return {mapBottom:r.top+(r.height-c.height*scale)/2+(b.y+b.h)*scale,top:chip.top,bottom:chip.bottom,viewportBottom:r.bottom,left:chip.left,right:chip.right,width:innerWidth};});
  assert.ok(bounds.top>=bounds.mapBottom);assert.ok(bounds.bottom<=bounds.viewportBottom);assert.ok(bounds.left>=0&&bounds.right<=bounds.width);
  await p.screenshot({path:'artifacts/special-map-v2-f1/survey-'+width+'-'+expanded+'.png'});
 }
 await p.evaluate(m=>{v2Qa.input('map');v2Qa.s().surveyedMasks=m;},masks);
 for(const outcome of ['escape','defeat']){
  await p.evaluate(dead=>outcomeQa.prepare(dead),outcome==='defeat');
  for(let i=0;i<5&&!await p.evaluate(()=>v2Qa.s().battleContext);i++){await p.evaluate(()=>outcomeQa.step());await p.waitForTimeout(250);}
  await p.waitForFunction(()=>outcomeQa.active());
  const before=await p.evaluate(()=>outcomeQa.snapshot());
  await p.waitForTimeout(800);
  await p.screenshot({path:'artifacts/special-map-v2-f1/battle-'+width+'-'+outcome+'.png'});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(outcome==='defeat')await p.evaluate(()=>outcomeQa.failSave());
  for(let i=0;i<80&&await p.evaluate(()=>outcomeQa.active());i++){
   const command=outcome==='escape'?'escape':'guard';const button=p.locator('[data-battle-command="'+command+'"]');
   if(await button.isVisible())await button.dispatchEvent('click');await p.evaluate(()=>outcomeQa.input('confirm'));await p.waitForTimeout(350);
  }
  await p.waitForFunction(()=>!outcomeQa.active());
  if(outcome==='escape'){assert.equal(await p.evaluate(()=>outcomeQa.snapshot()),before);assert.equal(await p.evaluate(()=>outcomeQa.normal()),normal);}
  else{
   await p.waitForFunction(()=>!!v2Qa.s()?.defeatRetry);assert.ok(await p.evaluate(()=>!!v2Qa.s()));assert.equal(await p.evaluate(()=>v2Qa.s().transitioning),true);
   assert.equal(await p.evaluate(()=>outcomeQa.normal()),normal);await p.evaluate(()=>{outcomeQa.restoreSave();v2Qa.input('confirm');});
   await p.waitForFunction(()=>!v2Qa.s());await p.waitForFunction(()=>outcomeQa.character().alive,{},{timeout:60000});
   assert.equal(await p.evaluate(()=>outcomeQa.normal()),normal);assert.ok((await p.evaluate(()=>outcomeQa.masks())).some(m=>m!=='0'.repeat(25)));
  }
 }
 assert.deepEqual(errors,[]);results.push({width,escape:true,defeat:true,saveFailureRetry:true,normalUnchanged:true});console.log(results.at(-1));await p.close();
}}finally{await browser.close();await writeFile('artifacts/special-map-v2-f1/outcomes.json',JSON.stringify(results,null,2));}
