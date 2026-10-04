import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
let hook=(await readFile('tests/browser/special-map-v2-b.mjs','utf8')).match(/const hook=`([\s\S]*?)`;/)[1];
hook=hook.replace('setSeOptions({enabled:false})','setSeOptions({enabled:true})');
hook+=`window.polishQa={
 async prepare(count){
 const {surveyVisit,EMPTY_SURVEY}=await import('/data/special-map-survey.js');
 const {generateRegisteredSpecialMap}=await import('/js/special-map/generator.js');
 const map=character.specialMaps.registered[0],f=generateRegisteredSpecialMap(map).floors[0],e=f.stairsUp;
 const d=f.walls[e.y*10+e.x].findIndex(v=>!v),p={x:e.x+[0,1,0,-1][d],y:e.y+[-1,0,1,0][d]};
 const masks=[surveyVisit(EMPTY_SURVEY,e.x,e.y),EMPTY_SURVEY,EMPTY_SURVEY];let n=1;
 for(let floor=0;floor<3;floor++)for(let i=0;i<100&&n<count;i++){
 if(floor===0&&(i===e.y*10+e.x||i===p.y*10+p.x))continue;
 masks[floor]=surveyVisit(masks[floor],i%10,Math.floor(i/10));n++;}
 map.surveyedMasks=masks;return p;
 },
 async resume(){(await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');window.dispatchEvent(new Event('nda:continue'));openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});setPlayerInputEnabled(false);setSeOptions({enabled:true});},
 position:()=>{const s=v2Qa.s();return [s.playerX,s.playerY,s.direction];},
 async away(){const s=v2Qa.s(),p={x:s.playerX,y:s.playerY},d=['N','E','S','W'].findIndex(k=>!s.cells[p.y][p.x].walls[k]);if(s.cellPrompt)v2Qa.input('cancel');await v2Qa.go({x:p.x+[0,1,0,-1][d],y:p.y+[-1,0,1,0][d]});return p;}
};`;
const audio=await readFile('js/audio.js','utf8');
const instrumented=audio.replace('export async function playSe(key) {','export async function playSe(key) {\n (window.qaSeCalls??=[]).push(key);')
 .replace('return startSource(key, buffer, policy.priority);','const played=startSource(key, buffer, policy.priority);(window.qaSePlayed??=[]).push({key,url,played});return played;');
const dir='artifacts/special-map-v2-c-qa';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});page.setDefaultTimeout(25000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/audio.js*',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>v2Qa.setup());
 const normal=await page.evaluate(()=>v2Qa.normal());
 const confirm=()=>touch?page.locator('#buttonA').tap():page.keyboard.press('Enter');
 const cancel=()=>touch?page.locator('#buttonB').tap():page.keyboard.press('KeyZ');
 async function enter(){
  await page.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
  await page.getByRole('button',{name:/三層の特殊地図/}).click();await page.getByRole('button',{name:/三層の特殊地図/}).click();
  await page.getByRole('button',{name:'探索する（A）',exact:true}).click();await page.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
  await page.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await confirm();
 }
 async function checkLock(kind){
  assert.equal(await page.evaluate(()=>v2Qa.s().cellPrompt),kind);const pos=await page.evaluate(()=>polishQa.position());
  for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])await page.keyboard.press(key);
  await page.getByRole('button',{name:'アイテム',exact:true}).dispatchEvent('click');
  assert.deepEqual(await page.evaluate(()=>polishQa.position()),pos);assert.equal(await page.evaluate(()=>v2Qa.menu()),false);
  await page.screenshot({path:`${dir}/${label}-${kind}-B${(await page.evaluate(()=>v2Qa.status())).floor+1}.png`});
  await cancel();assert.equal(await page.evaluate(()=>v2Qa.s().cellPrompt),null);assert.deepEqual(await page.evaluate(()=>polishQa.position()),pos);
 }
 async function stairs(down){
  await page.evaluate(d=>v2Qa.go(d?v2Qa.s().generatedMap.stairsDown:v2Qa.s().generatedMap.stairsUp),down);
  await checkLock('stairs');const old=await page.evaluate(()=>v2Qa.status());
  await confirm();await page.waitForFunction(f=>v2Qa.s().currentFloor!==f&&!v2Qa.s().transitioning,old.floor);
  if(!touch){await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');}
  else await confirm();
  assert.equal(await page.evaluate(()=>v2Qa.s().currentFloor),old.floor+(down?1:-1));
  assert.equal(await page.evaluate(()=>v2Qa.s().cellPrompt),null);
 }
 async function leave(){if(await page.evaluate(()=>!!v2Qa.s().cellPrompt))await cancel();await cancel();await page.getByRole('button',{name:'帰還',exact:true}).dispatchEvent('click');await page.waitForFunction(()=>!v2Qa.s());}
 await enter();const entrance=await page.evaluate(()=>polishQa.away());await page.evaluate(p=>v2Qa.go(p),entrance);await checkLock('stairs');
 await stairs(true);await stairs(true);
 await page.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.keyChest));await checkLock('chest');
 const chest=await page.evaluate(()=>polishQa.away());await page.evaluate(p=>v2Qa.go(p),chest);assert.equal(await page.evaluate(()=>v2Qa.s().cellPrompt),'chest');
 await confirm();assert.equal(await page.evaluate(()=>v2Qa.s().bossKeyFound),false);
 await page.waitForFunction(()=>document.querySelector('#treasureCanvas').style.visibility==='visible');
 await page.screenshot({path:`${dir}/${label}-three-opening.png`});await cancel();await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>v2Qa.menu()),false);await page.waitForFunction(()=>v2Qa.s().bossKeyFound&&!v2Qa.s().transitioning);
 await page.evaluate(()=>polishQa.away());await page.evaluate(p=>v2Qa.go(p),chest);assert.equal(await page.evaluate(()=>v2Qa.s().cellPrompt),null);
 await stairs(false);await stairs(false);await leave();assert.equal(await page.evaluate(()=>v2Qa.normal()),normal);
 console.log(label,'stairs/chest input and Three.js verified');
 const milestones=[];
 for(const before of [99,199,299]){
  const target=await page.evaluate(n=>polishQa.prepare(n),before);await enter();assert.equal(await page.evaluate(()=>v2Qa.s().totalSurveyed),before);
  await page.evaluate(()=>{window.qaSeCalls=[];window.qaSePlayed=[];});await page.evaluate(p=>v2Qa.go(p),target);
  const expected=before===299?'importantItem':'battleVictory';
  await page.waitForFunction(k=>window.qaSePlayed?.some(x=>x.key===k&&x.played),expected);
  const se=await page.evaluate(()=>({calls:qaSeCalls.filter(k=>['battleVictory','importantItem'].includes(k)),played:qaSePlayed.filter(x=>['battleVictory','importantItem'].includes(x.key))}));
  assert.deepEqual(se.calls,[expected]);assert.equal(await page.evaluate(()=>v2Qa.s().totalSurveyed),before+1);
  if(before===299)assert.match(await page.locator('#message').textContent(),/地図の調査が完了した/);
  await page.screenshot({path:`${dir}/${label}-${before+1}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  milestones.push({before,after:before+1,...se});await leave();await page.reload();await page.waitForFunction(()=>window.v2Qa);await page.evaluate(()=>polishQa.resume());await enter();
  assert.equal(await page.evaluate(()=>v2Qa.s().totalSurveyed),before+1);assert.deepEqual(await page.evaluate(()=>(window.qaSeCalls??[]).filter(k=>['battleVictory','importantItem'].includes(k))),[]);await leave();
 }
 assert.deepEqual(errors,[]);results.push({label,width,stairsAndChest:true,threeJs:true,milestones,errors});await page.close();
}}
finally{await browser.close();await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results,null,2));
