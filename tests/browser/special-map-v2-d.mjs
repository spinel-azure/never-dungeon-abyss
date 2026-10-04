import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
// Test save without maps/signature. Even a completed NPC meeting must not unlock maps.
// Enable the existing development gate; grant/appraise/register/entry use its UI.
const hook=`window.starterQa={
 setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');startNewGame();character=createInitialCharacter({name:'白地図確認',job:'mage'});character.eventFlags.treliren_met=true;setBgmOptions({enabled:false});setSeOptions({enabled:false});worldLocation='town';openTown({registrationRequired:false,facilityId:'dungeon',mode:'dungeonEntrance'});updateCharacterUi();setPlayerInputEnabled(false);},
 resume(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');window.dispatchEvent(new Event('nda:continue'));},
 maps:()=>structuredClone(character.specialMaps),
 s:()=>getSpecialMapContext()?.session,
 input:handleSpecialMapInput
};`;
const dir='artifacts/special-map-v2-d';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const identity=m=>({rulesetVersion:m.rulesetVersion,seed:m.seed,level:m.level,rarity:m.rarity,discovererName:m.discovererName});
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});page.setDefaultTimeout(25000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.starterQa);await page.evaluate(()=>starterQa.setup());
 assert.equal(await page.evaluate(async()=> (await import('/js/explorer-preview.js')).isExplorerTestEnabled()),false);
 async function activate(b){
  if(touch){await b.tap();return;}
  if(await b.evaluate(e=>!!e.closest('#dungeonCommands'))){
   for(let n=0;n<12;n++){
    const {target,current}=await b.evaluate(e=>{const a=[...e.parentElement.children];return {target:a.indexOf(e),current:a.findIndex(x=>x.classList.contains('is-selected'))};});
    if(target===current){await page.keyboard.press('KeyX');return;}
    await page.keyboard.press(Math.floor(target/3)!==Math.floor(current/3)?'ArrowDown':'ArrowRight');
   }throw Error('Cannot select ordinary command');
  }else await b.click();
 }
 const press=async name=>activate(page.getByRole('button',{name,exact:true}));
 const confirm=()=>touch?page.locator('#buttonA').tap():page.keyboard.press('KeyX');
 const cancel=()=>touch?page.locator('#buttonB').tap():page.keyboard.press('KeyZ');
 const entry=async command=>activate(page.locator(`[data-entrance-command="${command}"]`));
 const enableTest=async()=>{assert.equal(await page.locator('[data-entrance-command="explorerTent"]').isDisabled(),true);await page.evaluate(async()=>{(await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);});};
 const reload=async()=>{await page.reload();await page.waitForFunction(()=>window.starterQa);await page.evaluate(()=>starterQa.resume());await page.waitForSelector('[data-entrance-command="explorerTent"]');assert.equal((await page.evaluate(()=>starterQa.maps())).starterMapsGranted,undefined);await enableTest();};
 await enableTest();
 await entry('explorerTent');await page.getByRole('textbox',{name:'地図署名',exact:true}).fill('†ルル');await press('署名を登録（A）');
 await press('テスト用3枚を受け取る（A）');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('3 / 3'));
 const acquired=(await page.evaluate(()=>starterQa.maps())).unidentified.map(identity);assert.equal((await page.evaluate(()=>starterQa.maps())).starterMapsGranted,undefined);assert.equal((await page.evaluate(()=>starterQa.maps())).starterMapsTestGranted,true);assert.equal(acquired.length,3);assert.equal(new Set(acquired.map(m=>m.seed)).size,3);
 assert.ok(acquired.every(m=>m.level>=1&&m.level<=5&&m.rarity==='WHITE'&&m.discovererName==='†ルル'));
 await page.screenshot({path:`${dir}/${label}-received.png`});await reload();
 assert.deepEqual((await page.evaluate(()=>starterQa.maps())).unidentified.map(identity),acquired);
 await entry('explorerTent');assert.equal(await page.getByRole('button',{name:'【開発用】白地図を受け取る',exact:true}).count(),0);
 const names=[];
 for(let i=0;i<3;i++){
  await press('地図鑑定');assert.doesNotMatch(await page.locator('.explorer-preview').textContent(),/の地図 Lv\./);
  await press('はじまりの白地図 1');await press('はじまりの白地図 1');
  for(let step=0;step<3;step++)await press('確認（A）');
  const text=await page.locator('.explorer-detail').textContent(),name=await page.locator('.explorer-detail h3').textContent();names.push(name);
  assert.match(text,/白地図/);assert.match(text,/発見者：†ルル/);assert.equal((name.match(/Lv\./g)||[]).length,1);
  await page.screenshot({path:`${dir}/${label}-appraised-${i+1}.png`});
  // Existing appraisal completes registration transactionally; reload after each.
  await reload();const state=await page.evaluate(()=>starterQa.maps());assert.deepEqual(state.registered.map(identity),acquired.slice(0,i+1));assert.deepEqual(state.unidentified.map(identity),acquired.slice(i+1));
  if(i<2)await entry('explorerTent');
 }
 const entered=[];
 for(let i=0;i<3;i++){
  await entry('mapExploration');await press(names[i]);await press(names[i]);await press('探索する（A）');await press('はい（A／ENTER）');
  await page.waitForFunction(()=>!document.querySelector('#sceneTransitionTitle').hidden);assert.match(await page.locator('#sceneTransitionTitle').textContent(),/ENTERING\s+MAP DUNGEON/);
  await page.waitForFunction(()=>starterQa.s()&&!starterQa.s().transitioning);
  const s=await page.evaluate(()=>{const s=starterQa.s();return {seed:s.seed,level:s.level,rarity:s.rarity,theme:s.generatedMap.themeId,banner:s.renderState.overlayEvent?.overlayMessage,floors:s.floors.length,floor:s.currentFloor};});
  assert.equal(s.seed,acquired[i].seed);assert.equal(s.banner,names[i]);assert.equal(s.floors,3);assert.equal(s.floor,0);assert.equal(await page.locator('#depth').textContent(),'B1F');
  const expectedTheme=await page.evaluate(async m=>(await import('/data/special-map-names-v2.js')).describeV2MapName(m).themeId,acquired[i]);assert.equal(s.theme,expectedTheme);
  await page.screenshot({path:`${dir}/${label}-entry-${i+1}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await confirm();await cancel();await page.getByRole('button',{name:'帰還',exact:true}).dispatchEvent('click');await page.waitForFunction(()=>!starterQa.s());entered.push(s);
 }
 // Actual shared-code UI remains canonical; only read state to verify counterpart decoding.
 await entry('explorerTent');await press('地図整理');await press(names[0]);await press(names[0]);await press('管理機能を確認（A）');await press('共有コードを表示');
 const code=await page.getByRole('textbox',{name:'共有コード',exact:true}).inputValue();
 const shared=await page.evaluate(async code=>{const {decodeMapCode}=await import('/data/special-map-code.js');const {describeTestMap}=await import('/data/special-maps.js');const map=decodeMapCode(code).map;return {map,name:describeTestMap(map).name};},code);
 assert.deepEqual(shared.map,acquired[0]);assert.equal(shared.name,names[0]);assert.equal(shared.map.surveyedMasks,undefined);
 assert.deepEqual(errors,[]);results.push({label,width,testMode:true,productionGrantUntouched:true,fixture:'Treliren already met; no initial signature/maps',acquired,names,entered,code,shared,errors});console.log(label,'development grant/appraise/reload/3 entries passed');await page.close();
}}finally{await browser.close();await writeFile(`${dir}/browser.json`,JSON.stringify(results,null,2)+'\n');}
