import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {superbossCharacter,superbossCommand} from '../../tools/simulate-goddess-superboss.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('tests/browser/special-map-resume.mjs','utf8'),scope={};
vm.runInNewContext(source.slice(source.indexOf('const hook='),source.indexOf('\nconst browser='))+';this.hook=hook;',scope);
const hook=scope.hook.replace("...createInitialCharacter({name:'QA',job:'warrior'})",'...window.testCharacter')
 .replace("level:50,rarity:'SILVER'","level:100,rarity:'WHITE',themeOverride:'dusk'")
 .replace('setBgmOptions({enabled:false});','setBattleSpeedMode(\'fast\');setBgmOptions({enabled:false});');
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
const fullBattle=process.env.NDA_UI_ONLY!=='1';
try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nlet previewSaved;
window.superQa={read:()=>structuredClone(battleUi.battle),busy:()=>battleUi.presenting,command:executeCommand,input:handleBattleInput,
 async preview(theme){
  previewSaved??=battleUi.battle;
  const {createGoddessMapBoss}=await import('/data/karte-goddess-bosses.js');const {createEnemyCombatant}=await import('/data/enemies.js');
  const enemy=createEnemyCombatant(createGoddessMapBoss({themeId:theme,level:100}));
  if(theme==='tender')enemy.goddessRuntime={cooldowns:{},uses:{},healPreparation:{remaining:2,damage:1234,startedTurn:1}};
  battleUi.battle={...previewSaved,enemy};renderBattle();
 },restorePreview(){battleUi.battle=previewSaved;previewSaved=null;renderBattle();}};`}));
 await page.goto('http://127.0.0.1:4177');await page.waitForFunction(()=>window.resumeQa);
 await page.evaluate(c=>{window.testCharacter=c;},superbossCharacter());await page.evaluate(()=>resumeQa.setup());
 await page.evaluate(()=>resumeQa.boss());await page.waitForFunction(()=>superQa.read());
 for(let i=0;i<3;i++)await page.evaluate(()=>superQa.command({type:'guard'}));
 await page.waitForFunction(()=>!superQa.busy());
 const before=await page.evaluate(()=>superQa.read());assert.equal(before.enemy.goddessRuntime.moon,3);
 const box=await page.locator('.battle-goddess-forecast').boundingBox(),root=await page.locator('#battleScreen').boundingBox();
 assert.ok(box.x>=root.x&&box.x+box.width<=root.x+root.width+1);assert.ok(box.y>=root.y&&box.y+box.height<=root.y+root.height);
 assert.match(await page.locator('.battle-goddess-forecast').textContent(),/満月.*月蝕/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:join(tmpdir(),`nda-superboss-${width}.png`)});
 for(const theme of ['rice','tender']){
  await page.evaluate(theme=>superQa.preview(theme),theme);
  const label=page.locator('.goddess-hp-label'),bounds=await label.boundingBox();
  assert.ok(bounds.x>=root.x&&bounds.x+bounds.width<=root.x+root.width);
  assert.match(await label.textContent(),theme==='rice'?/250000/:/210000/);
  if(theme==='tender')assert.match(await page.locator('.battle-goddess-forecast').textContent(),/回復準備.*6000/);
 }
 await page.evaluate(()=>superQa.restorePreview());
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.evaluate(()=>resumeQa.load());
 await page.waitForFunction(()=>superQa.read()?.turn===4);
 const resumed=await page.evaluate(()=>superQa.read());
 assert.equal((await page.evaluate(()=>resumeQa.read())).character.hp,resumed.player.hp);
 assert.equal((await page.evaluate(()=>resumeQa.read())).character.sp,resumed.player.sp);
 assert.deepEqual(resumed.enemy.goddessRuntime,before.enemy.goddessRuntime);assert.equal(resumed.enemy.hp,before.enemy.hp);assert.equal(resumed.player.hp,before.player.hp);assert.equal(resumed.player.sp,before.player.sp);assert.deepEqual(resumed.player.inventory,before.player.inventory);
 await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('QA quota','QuotaExceededError');};});
 await page.evaluate(()=>superQa.command({type:'guard'}));assert.equal((await page.evaluate(()=>superQa.read())).turn,4);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});
 await page.evaluate(()=>superQa.command({type:'guard'}));
 assert.equal((await page.evaluate(()=>superQa.read())).enemy.goddessRuntime.moon,0);
 if(width===1280&&fullBattle){
  await page.reload();await page.waitForFunction(()=>window.resumeQa);
  await page.evaluate(c=>{window.testCharacter=c;},superbossCharacter());await page.evaluate(()=>resumeQa.setup());
  await page.evaluate(()=>resumeQa.boss());await page.waitForFunction(()=>superQa.read()?.turn===1);
 }
 // Real HP, real inventory and full production animations. No shortened battle fixture.
 const started=Date.now();let commands=0;
 if(width===1280&&fullBattle){
  while(commands<500){const b=await page.evaluate(()=>superQa.read());if(b.outcome)break;
   await page.evaluate(c=>superQa.command(c),superbossCommand(b,true));commands++;
   if(commands%20===0)console.log('full battle',commands,'turn',b.turn);
  }
 }
 const end=await page.evaluate(()=>superQa.read());
 results.push({width,goddessLayouts:3,moonReload:true,saveFailureRollback:true,errors,fullBattle:width===1280&&fullBattle,commands,elapsedSeconds:(Date.now()-started)/1000,outcome:end.outcome,turn:end.turn,hp:end.player.hp,bossHp:end.enemy.hp});
 assert.deepEqual(errors,[]);
 if(width===1280&&fullBattle){assert.ok(end.outcome);await page.evaluate(()=>superQa.input('confirm'));await page.waitForFunction(()=>!resumeQa.read().battle);}
 console.log(results.at(-1));await page.close();
 }}finally{await browser.close();}
await writeFile(fullBattle?'artifacts/goddess-superboss-browser.json':'artifacts/goddess-superboss-browser-ui.json',JSON.stringify(results,null,2)+'\n');
