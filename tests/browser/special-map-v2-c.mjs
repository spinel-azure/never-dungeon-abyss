import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
let hook=(await readFile('tests/browser/special-map-v2-b.mjs','utf8')).match(/const hook=`([\s\S]*?)`;/)[1];
hook=hook.replace('character.inventory.counts.guiding_torch=20;','character.inventory.counts.guiding_torch=100;');
hook+=`window.surveyQa={
 counts:()=>getSpecialMapContext()?.session.surveyedMasks.map(m=>[...m].reduce((n,c)=>n+parseInt(c,16).toString(2).replaceAll('0','').length,0)),
 saved:()=>character.specialMaps.registered[0].surveyedMasks,
 async resume(){(await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');window.dispatchEvent(new Event('nda:continue'));openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});setPlayerInputEnabled(false);},
 async fill(limit=100,exclude){
 const s=v2Qa.s();
 while(s.surveyedCount<limit){
 const q=[{x:s.playerX,y:s.playerY}],seen=new Set([s.playerY*10+s.playerX]);let target;
 for(const p of q){if(!s.surveyView[p.y][p.x]&&!(exclude&&p.x===exclude.x&&p.y===exclude.y)){target=p;break;}
 for(let d=0;d<4;d++){const x=p.x+[0,1,0,-1][d],y=p.y+[-1,0,1,0][d],key=y*10+x;
 if(x<0||y<0||x>=10||y>=10||seen.has(key)||s.cells[p.y][p.x].walls[['N','E','S','W'][d]]||s.isDoorLocked(p.x,p.y,['N','E','S','W'][d])||exclude&&x===exclude.x&&y===exclude.y)continue;
 seen.add(key);q.push({x,y});}}
 if(!target)throw Error('no remaining reachable survey target '+s.surveyedCount);await v2Qa.go(target);
 }
 }
};`;
const dir='artifacts/special-map-v2-survey';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>v2Qa.setup());
 let normal=await page.evaluate(()=>v2Qa.normal());
 const confirm=()=>touch?page.locator('#buttonA').tap():page.keyboard.press('Enter');
 async function enter(){
 await page.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 await page.getByRole('button',{name:/荒れ果てた晶宮の地図 Lv.50/}).click();await page.getByRole('button',{name:/荒れ果てた晶宮の地図 Lv.50/}).click();
 await page.screenshot({path:`${dir}/${label}-detail.png`});
 await page.getByRole('button',{name:'探索する（A）',exact:true}).click();await page.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await page.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await confirm();
 }
 async function stair(down){await page.evaluate(d=>v2Qa.go(d?v2Qa.s().generatedMap.stairsDown:v2Qa.s().generatedMap.stairsUp),down);
 const old=await page.evaluate(()=>v2Qa.status());await confirm();await page.waitForFunction(f=>v2Qa.s().currentFloor!==f&&!v2Qa.s().transitioning,old.floor);
 assert.equal((await page.evaluate(()=>v2Qa.status())).fuel,old.fuel);await confirm();}
 async function leave(){await page.evaluate(()=>{if(v2Qa.s().cellPrompt)v2Qa.input('cancel');v2Qa.input('cancel');});await page.getByRole('button',{name:'帰還',exact:true}).dispatchEvent('click');await page.waitForFunction(()=>!v2Qa.s()).catch(async e=>{console.log('return debug',await page.evaluate(()=>({message:document.querySelector('#message').textContent,error:v2Qa.s()?.surveyError,menu:v2Qa.menu()})));throw e;});}
 await enter();assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),[1,0,0]);
 await page.evaluate(()=>surveyQa.fill(12));await stair(true);await page.evaluate(()=>surveyQa.fill(10));
 const partial=await page.evaluate(()=>surveyQa.counts());await leave();
 await enter();assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),partial);assert.deepEqual((await page.evaluate(()=>v2Qa.status())).counts,[1,0,0]);await leave();assert.equal(await page.evaluate(()=>v2Qa.normal()),normal);
 await page.reload();await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>surveyQa.resume());normal=await page.evaluate(()=>v2Qa.normal());await enter();
 assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),partial);console.log(label,'reload retained',partial);
 await page.evaluate(()=>surveyQa.fill());console.log(label,'B1F 100');await stair(true);await page.evaluate(()=>surveyQa.fill());console.log(label,'B2F 100');await stair(true);
 await page.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.keyChest));await confirm();await page.waitForFunction(()=>v2Qa.s().bossKeyFound&&!v2Qa.s().transitioning);
 await page.evaluate(async()=>{const s=v2Qa.s(),r=s.generatedMap.bossRoom;await v2Qa.go(r.approach);await v2Qa.face(['N','E','S','W'].findIndex((_,d)=>s.playerX+[0,1,0,-1][d]===r.cells[0].x&&s.playerY+[-1,0,1,0][d]===r.cells[0].y));});
 await confirm();await page.evaluate(()=>v2Qa.settled());await page.evaluate(()=>surveyQa.fill(99,v2Qa.s().generatedMap.bossRoom.bossCell));
 assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),[100,100,99]);await page.screenshot({path:`${dir}/${label}-299.png`});
 await page.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.bossRoom.bossCell));
 await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('地図の調査が完了した！'));
 assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),[100,100,100]);await page.screenshot({path:`${dir}/${label}-300.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await leave();await page.reload();await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>surveyQa.resume());normal=await page.evaluate(()=>v2Qa.normal());await enter();
 const reset=await page.evaluate(()=>v2Qa.status());assert.equal(reset.fuel,100);assert.equal(reset.key,false);assert.equal(reset.unlocked,false);assert.deepEqual(reset.counts,[1,0,0]);
 assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),[100,100,100]);assert.doesNotMatch(await page.locator('#message').textContent(),/地図の調査が完了した/);
 for(let floor=0;floor<3;floor++){
 assert.ok(await page.evaluate(()=>v2Qa.s().surveyView.flat().every(Boolean)));
 await page.screenshot({path:`${dir}/${label}-full-B${floor+1}F.png`});if(floor<2)await stair(true);
 }
 await page.evaluate(()=>{v2Qa.s().renderState.torchFuel=0;});await page.waitForTimeout(100);await page.screenshot({path:`${dir}/${label}-dark.png`});
 assert.deepEqual(await page.evaluate(()=>surveyQa.counts()),[100,100,100]);await page.evaluate(()=>v2Qa.refill());assert.equal((await page.evaluate(()=>v2Qa.status())).fuel,100);
 await page.screenshot({path:`${dir}/${label}-relit.png`});
 const finalNormal=await page.evaluate(()=>v2Qa.normal());assert.equal(finalNormal,normal);
 await leave();assert.deepEqual(errors,[]);results.push({label,partial,complete:[100,100,100],reset,normalUnchanged:true,errors});console.log(label,'passed');await page.close();
}await writeFile(`${dir}/browser.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
