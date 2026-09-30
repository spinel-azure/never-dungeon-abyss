import assert from 'node:assert/strict';import {readFile,mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');const output=await mkdtemp(join(tmpdir(),'nda-area-effects-'));
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8'),presentation=await readFile('js/battle-skill-presentation.js','utf8');
const setup=`window.areaQa={setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'QA',job:'mage'});character.hp=character.maxHp=99999;character.sp=character.maxSp=999;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},start(){const e={...createEnemyCombatant(getEnemyById('will_o_wisp')),hp:999999,maxHp:999999};startBattle(e,{playStartSe:false,enemies:[e,{...e,id:'b'},{...e,id:'c'}]});}};`;
const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{navigator.getGamepads=()=>[];window.areaPlays=[];window.areaImpacts=[];});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',setup+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.areaBattle={close:closeBattle,idle:()=>!battleUi.presenting,read:()=>({hp:battleUi.presentationHp?.enemies,finalHp:battleUi.battle.enemies.map(e=>e.hp)}),cast(id,lethal=false){battleUi.battle.player.statuses=[];battleUi.battle.player.skillIds.push(id);battleUi.battle.player.sp=battleUi.battle.player.maxSp=999;battleUi.battle.player.playerCharge={value:100,cooldown:0};for(const enemy of battleUi.battle.enemies){enemy.race=lethal?'undead':'other';}executeCommand({type:'skill',skillId:id});}};`}));
 await page.route('**/js/battle-skill-presentation.js',r=>r.fulfill({contentType:'text/javascript',body:presentation.replace('engine.load(prepared);','window.areaPlays.push(prepared);engine.load(prepared);window.areaEngine=engine;const screenCallback=engine.onScreen;engine.onScreen=value=>{if(value?.blur>0)window.areaSawBlur=true;if(value?.tv)window.areaSawTv=true;screenCallback?.(value);};').replace('impacted=true;onImpact?.();','impacted=true;onImpact?.();window.areaImpacts.push(window.areaBattle.read());').replace('return await engine.play();','return await engine.play({speed:4});')}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.areaQa);await page.evaluate(()=>areaQa.setup());
 for(const id of ['call_goddess_name','fall_the_meteor','apocalypse','walpurgisnacht']){
 await page.evaluate(()=>{areaPlays.length=0;areaImpacts.length=0;areaQa.start();});await page.evaluate(id=>areaBattle.cast(id,id==='call_goddess_name'),id);
 await page.waitForFunction(()=>areaImpacts.length===1,{},{timeout:30000}).catch(async e=>{console.log(id,await page.evaluate(()=>({plays:areaPlays.length,impacts:areaImpacts,read:areaBattle.read(),text:document.body.innerText.slice(-2000)})),errors);throw e;});
 const result=await page.evaluate(()=>({plays:areaPlays.length,popups:areaPlays[0].parts.filter(p=>p.type==='popup'),impact:areaImpacts[0]}));
 assert.equal(result.plays,1);assert.equal(result.popups.length,3);assert.deepEqual(result.impact.hp,result.impact.finalHp);
 assert.equal(new Set(result.popups.map(p=>p.start)).size,1);
 await page.screenshot({path:join(output,label+'-'+id+'.png')});
 if(id==='call_goddess_name') {
  await page.waitForFunction(()=>areaEngine.time>=20550);
  assert.equal(await page.evaluate(()=>areaEngine.imageCache.has('images/battle_effects/goddess_bg.avif')),true);
  await page.screenshot({path:join(output,label+'-goddess-background.png')});
 }
await page.waitForFunction(()=>areaBattle.idle(),{},{timeout:30000});assert.equal(await page.evaluate(()=>areaPlays.length),1);
 if(id==='call_goddess_name') {
  assert.equal(await page.evaluate(()=>areaSawBlur&&areaSawTv),true);
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[aria-hidden="true"]')].some(e=>e.style.backdropFilter?.startsWith('blur('))),false);
 }

 console.log(label+' '+id+' passed');await page.evaluate(()=>areaBattle.close());
 }
 // Interrupt before impact: the next battle must not receive the previous damage callback.
 await page.evaluate(()=>{areaImpacts.length=0;areaQa.start();areaBattle.cast('apocalypse');});await page.waitForTimeout(200);await page.evaluate(()=>{areaBattle.close();areaQa.start();});await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>areaImpacts.length),0);
 await page.route('**/data/effects/walpurgisnacht.json',r=>r.fulfill({status:404,body:''}));
 await page.reload();await page.waitForFunction(()=>window.areaQa);await page.evaluate(()=>areaQa.setup());await page.evaluate(()=>{areaQa.start();areaBattle.cast('walpurgisnacht');});
 await page.waitForFunction(()=>document.querySelectorAll('.battle-enemy-member .battle-number').length===3);
 assert.equal(await page.evaluate(()=>areaPlays.length),0);await page.waitForFunction(()=>areaBattle.idle());
 assert.ok((await page.evaluate(()=>areaBattle.read())).finalHp.every(hp=>hp<999999));
 assert.deepEqual(errors,[]);console.log(label+' passed');await page.close();
}}finally{await browser.close();}console.log(output);
