import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {goddessCharacter} from '../../tools/simulate-map-goddesses.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const fixtures=JSON.parse(await readFile('tests/fixtures/special-map-format3-codes.json','utf8'));
const old=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};
vm.runInNewContext(old.slice(old.indexOf('const baseHook='),old.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const hook=scope.hook.replace(/registered:\[decodeMapCode\('[^']+'\)\.map\]/,'registered:[],starterMapsTestGranted:true')
 .replace("worldLocation='town';","character.eventFlags.treliren_met=true;worldLocation='town';")
 .replace('if(!s.motion&&!s.renderState.anim&&!s.transitioning)return;','if(s.battleContext||(!s.motion&&!s.renderState.anim&&!s.transitioning&&!s.surveyPresentationPlaying))return;');
const extra=`window.format3Qa={
 maps:()=>structuredClone(character.specialMaps),active:isBattleActive,input:handleBattleInput,c:()=>character,
 prepare(c){character={...c,specialMaps:character.specialMaps,carriedExperience:777,lootBagTutorialSeen:true};character.npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};updateCharacterUi();setBattleSpeedMode('fast');},
 snapshot(){const s=v2Qa.s();return JSON.stringify({floor:s.currentFloor,x:s.playerX,y:s.playerY,dir:s.direction,torch:s.torchFuel,survey:s.surveyedMasks,key:s.bossKeyFound,unlock:s.bossDoorUnlocked,doors:[...s.openedDoors]});},
 resume(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');window.dispatchEvent(new Event('nda:continue'));},
 async quiet(){v2Qa.s().onEncounterStep=()=>false;const {PERPETUAL_TORCH_CARD_ID}=await import('/data/cards.js');character.cards.deckSlots=[PERPETUAL_TORCH_CARD_ID];},
};`;
const main=(await readFile('js/main.js','utf8')).replace('  async function finishV2Battle(battle,outcome){','  async function finishV2Battle(battle,outcome){ window.goddessLastBattle=structuredClone(battle);');
const output=join(tmpdir(),'nda-goddess-browser');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const width of (process.env.NDA_QA_WIDTHS||'1280,390').split(',').map(Number))for(const fixture of fixtures.filter(f=>f.map.level===100&&f.map.themeOverride!=='gold'&&(!process.env.NDA_QA_THEMES||process.env.NDA_QA_THEMES.split(',').includes(f.map.themeOverride)))){
 const theme=fixture.map.themeOverride,p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(45000);
 const errors=[],loaded=new Set();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===200)loaded.add(new URL(r.url()).pathname);});
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.route('**/js/special-map/goddess-presentation.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/special-map/goddess-presentation.js','utf8')).replace('export async function playGoddessDefeat(root,image){','export async function playGoddessDefeat(root,image){ window.goddessTvOffCount=(window.goddessTvOffCount||0)+1;')}));
 await p.route('**/js/battle.js*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/battle.js','utf8'))+`\nwindow.goddessBattle=()=>structuredClone(battleUi.battle);window.goddessBoost=()=>{if(!battleUi.presenting){battleUi.battle.enemy.hp=1;battleUi.battle.enemy.actions=[{weight:1,action:{id:'qa-wait',actionType:'wait'}}];}};window.goddessCommand=c=>{if(!battleUi.presenting&&!battleUi.battle?.outcome)return executeCommand(c);};`}));
 await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4173');await p.waitForFunction(()=>window.format3Qa);await p.evaluate(()=>v2Qa.setup());
 const press=async name=>{
  const b=p.getByRole('button',{name,exact:true});
  if(await b.evaluate(e=>!!e.closest('#dungeonCommands'))){await b.dispatchEvent('click');}
  else await b.click();
 };
 await p.locator('[data-entrance-command="explorerTent"]').dispatchEvent('click');await press('地図登録');
 await p.getByRole('textbox',{name:'共有コード入力',exact:true}).fill(fixture.code);
 await p.screenshot({path:join(output,`${width}-${theme}-code.png`)});
 await press('地図を登録（A）');
 assert.equal((await p.evaluate(()=>format3Qa.maps())).registered[0].themeOverride,theme);
 assert.match(await p.locator('.explorer-detail').textContent(),new RegExp(fixture.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await p.screenshot({path:join(output,`${width}-${theme}-detail.png`)});
 await press('管理機能を確認（A）');await press('お気に入り OFF');await press('共有コードを表示');
 assert.equal(await p.getByRole('textbox',{name:'共有コード',exact:true}).inputValue(),fixture.code);
 // Reload the actual saved registration, not a pre-registered debug map.
 await p.reload();await p.waitForFunction(()=>window.format3Qa);await p.evaluate(()=>format3Qa.resume());
 await p.waitForSelector('[data-entrance-command="mapExploration"]');await p.evaluate(async()=>{(await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);});
 const saved=await p.evaluate(()=>format3Qa.maps());assert.equal(saved.registered[0].themeOverride,theme);assert.equal(saved.registered[0].favorite,true);
 await p.evaluate(c=>format3Qa.prepare(c),goddessCharacter('warrior',100,'z6'));
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');await press(fixture.name+' ⭐');await press(fixture.name+' ⭐');
 await press('探索する（A）');await press('はい（A／ENTER）');
 await p.waitForFunction(()=>!document.querySelector('#sceneTransitionTitle').hidden);
 assert.match(await p.locator('#sceneTransitionTitle').textContent(),/ENTERING\s+MAP DUNGEON/);
 await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>{v2Qa.input('confirm');return format3Qa.quiet();});
 assert.equal(await p.evaluate(()=>v2Qa.s().generatedMap.themeId),theme);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:join(output,`${width}-${theme}-b1.png`)});
 for(const floor of [1,2]){
  await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.stairsDown));await p.evaluate(()=>v2Qa.input('confirm'));
  await p.waitForFunction(f=>v2Qa.s().currentFloor===f&&!v2Qa.s().transitioning,floor);await p.evaluate(()=>{if(v2Qa.s().renderState.overlayEvent)v2Qa.input('confirm');});
  assert.equal(await p.evaluate(()=>v2Qa.s().generatedMap.themeId),theme);
 }
 await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.keyChest));assert.equal(await p.evaluate(()=>v2Qa.s().cellPrompt),'chest');
 await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().bossKeyFound&&!v2Qa.s().transitioning);
 await p.evaluate(async()=>{const d=v2Qa.s().generatedMap.bossRoom.doorEdge,dir=['N','E','S','W'].indexOf(d.direction);await v2Qa.go({x:d.x+[0,1,0,-1][dir],y:d.y+[-1,0,1,0][dir]});await v2Qa.face((dir+2)%4);v2Qa.input('confirm');await v2Qa.settled();await v2Qa.go(d);});
 assert.equal(await p.evaluate(()=>v2Qa.s().bossDoorUnlocked),true);
 const boss=await p.evaluate(()=>v2Qa.s().getBossRenderState());assert.equal(boss.definition.imageId,fixture.bossId);
 await p.waitForTimeout(400);await p.screenshot({path:join(output,`${width}-${theme}-boss-room.png`)});
 await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.bossRoom.bossCell));
 if(theme==='gold'){await p.waitForFunction(()=>format3Qa.active());await p.waitForFunction(()=>document.querySelector('#battleEnemyImage')?.naturalWidth===600);assert.match(await p.locator('#battleEnemyName').textContent(),/デアグローセ/);}
 else{await p.waitForFunction(()=>format3Qa.active());await p.waitForFunction(()=>document.querySelector('#battleEnemyImage')?.naturalWidth===600);}
 await p.waitForTimeout(1500);await p.screenshot({path:join(output,`${width}-${theme}-boss.png`)});
 for(const n of ['01','02'])assert.ok(loaded.has(`/images/dungeon_effects/${theme}_wall_${n}.webp`));
 assert.ok(loaded.has('/'+boss.definition.image));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const summary=await p.evaluate(()=>({theme:v2Qa.s().ecology.themeId,mapKey:v2Qa.s().mapKey,survey:v2Qa.s().totalSurveyed}));
 assert.equal(summary.theme,theme);assert.deepEqual(errors,[]);
 const before=await p.evaluate(()=>format3Qa.snapshot());
 const initial=await p.evaluate(()=>({exp:format3Qa.c().experience,gold:format3Qa.c().gold}));
 assert.equal(await p.locator('.goddess-battle-circle').evaluate(e=>getComputedStyle(e).opacity),'0.8');
 assert.equal(await p.locator('.goddess-battle-circle').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 assert.equal(await p.evaluate(()=>goddessBattle().enemy.image),boss.definition.image);
 assert.equal(await p.locator('.goddess-battle-circle').evaluate(e=>getComputedStyle(e).animationDuration),'80s');
 let revived=false;
 for(let i=0;i<900&&await p.evaluate(()=>format3Qa.active());i++){
  const b=await p.evaluate(()=>goddessBattle());revived ||= Boolean(b.enemy.goddessRuntime?.reviveUsed);
  if(b.outcome)await p.evaluate(()=>format3Qa.input('confirm'));
  else{await p.evaluate(()=>goddessBoost());await p.evaluate(()=>goddessCommand({type:'attack'}));}
  await p.waitForTimeout(100);
 }
 await p.waitForFunction(()=>!format3Qa.active()&&!v2Qa.s().transitioning);
 assert.equal(await p.evaluate(()=>goddessTvOffCount),1,'final death only, never first revival');
 assert.equal(await p.evaluate(()=>goddessLastBattle.outcome),'victory');assert.equal(revived,theme==='tender');
 assert.equal(await p.evaluate(()=>format3Qa.snapshot()),before);assert.equal(await p.evaluate(()=>v2Qa.s().bossDefeated),true);
 const rewards=await p.evaluate(()=>({exp:v2Qa.s().battleExperience,gold:v2Qa.s().lootBag.gold}));
 assert.equal(rewards.exp,theme==='tender'?30000:25000);assert.equal(rewards.gold,theme==='tender'?6000:5000);
 await p.screenshot({path:join(output,`${width}-${theme}-portal.png`)});
 await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().currentFloor===0&&!v2Qa.s().transitioning);
 await p.evaluate(()=>{if(v2Qa.s().renderState.overlayEvent)v2Qa.input('confirm');});
 assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),rewards.exp);
 await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.stairsUp));await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>!v2Qa.s());
 await p.locator('#lootIdentifyAction').click();await p.getByRole('button',{name:'閉じる',exact:true}).click();
 await p.waitForFunction(()=>!document.querySelector('#experienceSettlementOverlay').hidden);
 await p.screenshot({path:join(output,`${width}-${theme}-settlement.png`)});
 assert.equal(await p.evaluate(()=>format3Qa.c().experience),initial.exp+Math.floor(rewards.exp*1.5));
 assert.equal(await p.evaluate(()=>format3Qa.c().gold),initial.gold+rewards.gold);
 assert.equal(await p.evaluate(()=>format3Qa.c().carriedExperience),777);
 await p.locator('#experienceSettlementOverlay').click();await p.waitForFunction(()=>document.querySelector('#townCommerceTitle')?.textContent==='雇用更新');
 assert.deepEqual(errors,[]);
 results.push({width,theme,code:fixture.code,bossId:fixture.bossId,registration:true,reload:true,favorite:true,keyRoute:true,combat:true,revived,portal:true,settlement:true,renewal:true,integrationFixture:"HP1, wait actions; balance tested separately",...summary});console.log(results.at(-1));await p.close();
}}catch(error){
 for(const c of browser.contexts())for(const p of c.pages()){
  await p.screenshot({path:join(output,'failure.png')});await writeFile(join(output,'failure.txt'),await p.locator('body').innerText());
 }
 throw error;
}finally{await browser.close();await writeFile(join(output,'results.json'),JSON.stringify(results,null,2));console.log(output);}
