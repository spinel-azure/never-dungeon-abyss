import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=await readFile('tests/browser/special-map-resume.mjs','utf8'),scope={};
vm.runInNewContext(source.slice(source.indexOf('const hook='),source.indexOf('\nconst browser='))+';this.hook=hook;',scope);
const hook=scope.hook.replace("level:50,rarity:'SILVER'","level:100,rarity:'WHITE',themeOverride:window.introConfig.theme")
 .replace("openTown({registrationRequired:false,mode:'dungeonEntrance'});",`character.reincarnationCount=window.introConfig.count;
 if(window.introConfig.owned)character.keyItems=(await import('/data/key-items.js')).grantKeyItem(character.keyItems,'hacking_device').keyItems;
 character.npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};
 openTown({registrationRequired:false,mode:'dungeonEntrance'});`);
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8');
const output=await mkdtemp(join(tmpdir(),'nda-aurora-integration-'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [width,theme,owned,count] of [[1280,'rice',false,3],[1280,'dusk',true,3],[390,'tender',true,3],[390,'rice',true,2],[768,'gold',true,3]]){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(config=>{window.introConfig=config;window.padDown=false;navigator.getGamepads=()=>[{index:0,buttons:[{pressed:padDown}],axes:[0,0]}];},{theme,owned,count});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+`window.introQa={active:()=>auroraBattleIntro.isActive(),dispatch:dispatchGamepadAction}; document.documentElement.dataset.ndaMainReady = "true";`)}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle.replace('  const character = battleUi.getCharacter();','  window.battleStarts=(window.battleStarts||0)+1;\n  const character = battleUi.getCharacter();')+'\nwindow.introBattle=()=>structuredClone(battleUi.battle);'}));
 await page.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.resumeQa);
 await page.evaluate(()=>resumeQa.setup());await page.evaluate(()=>resumeQa.boss());
 if(theme==='gold'){
  await page.waitForFunction(()=>resumeQa.read().battle);
  assert.equal(await page.locator('dialog.aurora-boot').count(),0);
  assert.equal(await page.evaluate(()=>window.battleStarts),1);
  assert.equal((await page.evaluate(()=>introBattle())).enemy.hackingDeviceApplied,undefined);
  assert.deepEqual(errors,[]);console.log(width,'gold bypass passed');await page.close();continue;
 }
 await page.waitForSelector('dialog canvas[data-phase="initializing"]');
 if(theme==='rice'&&count===3){
  await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.evaluate(()=>resumeQa.load());
  await page.waitForSelector('dialog canvas[data-phase="initializing"]');
  assert.equal(await page.evaluate(()=>window.battleStarts||0),0);
 }
 const initial=await page.evaluate(()=>({c:resumeQa.read().character,turn:introBattle()?.turn,starts:window.battleStarts||0}));
 assert.equal(initial.starts,0);assert.equal(await page.evaluate(()=>resumeQa.read().battle),false);
 await page.evaluate(()=>{for(const a of ['confirm','items','up','status','map'])introQa.dispatch(a);});
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.battleStarts||0),0);
 await page.screenshot({path:join(output,`${width}-${theme}-boot.png`)});
 // Keep Enter held across the boundary. The next log must remain unskipped.
 await page.keyboard.down('Enter');await page.waitForTimeout(350);
 await page.waitForSelector('canvas[data-route]').catch(async e=>{console.log(errors,await page.evaluate(()=>({dialogs:[...document.querySelectorAll('dialog')].map(x=>x.outerHTML),active:introQa.active(),battle:resumeQa.read().battle})));throw e;});await page.keyboard.down('Enter');await page.waitForTimeout(150);
 assert.equal(await page.locator('canvas[data-route]').getAttribute('data-phase'),'typing');await page.keyboard.up('Enter');
 const route=owned&&count===3?'hacking':'normal';assert.equal(await page.locator('canvas[data-route]').getAttribute('data-route'),route);
 const during=await page.evaluate(()=>resumeQa.read().character);
 for(const key of ['hp','sp','npcSystem','inventory','keyItems','cards','playerCharge'])assert.deepEqual(during[key],initial.c[key]);
 if(width===390)await page.locator('canvas[data-route]').tap();else await page.keyboard.press('Space');
 await page.waitForTimeout(350);assert.equal(await page.locator('canvas[data-route]').getAttribute('data-phase'),'complete');
 await page.screenshot({path:join(output,`${width}-${theme}-log.png`)});
 // Physical A edge exits; holding it prevents leakage into the battle.
 await page.evaluate(()=>padDown=true);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.battleStarts||0),0);
 await page.evaluate(()=>padDown=false);await page.waitForFunction(()=>resumeQa.read().battle);
 const b=await page.evaluate(()=>introBattle());assert.equal(await page.evaluate(()=>window.battleStarts),1);
 assert.equal(b.enemy.hp,Math.floor(b.enemy.maxHp*(route==='hacking'?.95:1)));assert.equal(b.turn,1);
 await page.waitForTimeout(350);assert.equal((await page.evaluate(()=>introBattle())).turn,1);
 // The real serialized checkpoint bypasses both animations and retains exact HP.
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.evaluate(()=>resumeQa.load());await page.waitForFunction(()=>resumeQa.read().battle);
 assert.equal(await page.locator('dialog.aurora-boot').count(),0);assert.equal((await page.evaluate(()=>introBattle())).enemy.hp,b.enemy.hp);
 assert.equal(await page.evaluate(()=>window.battleStarts),1);assert.deepEqual(errors,[]);
 console.log(width,theme,route,'passed');await page.close();
}
 // Missing boot artwork must still reach summoning and one start callback.
 const p=await browser.newPage();await p.goto((process.env.NDA_QA_URL||'http://127.0.0.1:4173')+'/tools/aurora-os-preview.html');
 await p.evaluate(async()=>{
  const {createAuroraBoot}=await import('/js/aurora-boot.js'),{createAuroraBattleIntro}=await import('/js/aurora-battle-intro.js');
  window.qaIntro=createAuroraBattleIntro({boot:createAuroraBoot({imageUrl:'/missing-aurora-image.avif',pollGamepad:false})});
  window.starts=0;window.done=null;qaIntro.play({route:'normal',startBattle:()=>++starts}).then(v=>done=v);
 });
 await p.waitForSelector('canvas[data-route="normal"]');assert.equal(await p.evaluate(()=>starts),0);
 await p.keyboard.press('Enter');await p.waitForTimeout(350);
 const rect=await p.locator('canvas[data-route]').boundingBox();await p.mouse.move(rect.x+20,rect.y+20);await p.mouse.down();
 await p.waitForTimeout(1700);assert.equal(await p.evaluate(()=>starts),0,'held pointer must not leak into battle');await p.mouse.up();
 await p.waitForFunction(()=>done!==null);assert.equal(await p.evaluate(()=>starts),1);
 assert.equal(await p.locator('dialog').count(),0);await p.close();console.log('missing image fallback passed');
}finally{await browser.close();}console.log(output);
