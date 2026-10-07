import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {bossTestCharacter,bossTestCommand} from '../../tools/simulate-map-bosses.mjs';
import {encodeMapCode} from '../../data/special-map-code.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=join(tmpdir(),'nda-v2-qa-polish');await mkdir(output,{recursive:true});
const old=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};
vm.runInNewContext(old.slice(old.indexOf('const baseHook='),old.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const extra=`window.f3Qa={
 active:isBattleActive,input:handleBattleInput,c:()=>character,
 async prepare(c){const maps=character.specialMaps;
  const {generateRegisteredSpecialMap}=await import('/js/special-map/generator.js');
  const blueprint=generateRegisteredSpecialMap(maps.registered[0]);
  maps.registered[0].surveyedMasks=blueprint.floors.map((f,i)=>{const p=i===2?f.bossRoom.bossCell:f.stairsDown,index=p.y*10+p.x,n=Math.floor(index/4);return 'f'.repeat(n)+(15&~(1<<(index%4))).toString(16)+'f'.repeat(24-n);});
  maps.registered[0].favorite=true;character={...c,specialMaps:maps};const {PERPETUAL_TORCH_CARD_ID}=await import('/data/cards.js');character.cards.deckSlots=[PERPETUAL_TORCH_CARD_ID];character.npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};character.lootBagTutorialSeen=true;character.inventory.counts.guiding_torch=99;character.carriedExperience=777;character.lootBag={gold:888,items:{},cards:{},equipmentInstances:[]};updateCharacterUi();setBattleSpeedMode('fast');},
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),carried:character.carriedExperience,loot:character.lootBag}),
 snapshot(){const s=v2Qa.s();return JSON.stringify({floor:s.currentFloor,x:s.playerX,y:s.playerY,dir:s.direction,torch:s.torchFuel,survey:s.surveyedMasks,key:s.bossKeyFound,unlock:s.bossDoorUnlocked,doors:[...s.openedDoors]});},
 setupSession(){v2Qa.s().onEncounterStep=()=>false;},
 return:()=>getSpecialMapContext().finish()
};`;
const main=(await readFile('js/main.js','utf8')).replace('  async function finishV2Battle(battle,outcome){','  async function finishV2Battle(battle,outcome){ window.f3LastBattle=structuredClone(battle);'),battle=await readFile('js/battle.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const width of (process.env.NDA_QA_WIDTHS||'1280,390').split(',').map(Number))for(const level of (process.env.NDA_QA_LEVELS||'5,100').split(',').map(Number)){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 const code=encodeMapCode({rulesetVersion:'special-map-v2',seed:12345,level,rarity:'WHITE',discovererName:'QA'});
 const hook=scope.hook.replace('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta',code).replace('if(!s.motion&&!s.renderState.anim&&!s.transitioning)return;','if(s.battleContext||(!s.motion&&!s.renderState.anim&&!s.transitioning&&!s.surveyPresentationPlaying))return;');
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.f3Battle=()=>structuredClone(battleUi.battle);window.f3Command=c=>{if(!battleUi.presenting&&!battleUi.battle?.outcome)return executeCommand(c);};'}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4173');await p.waitForFunction(()=>window.f3Qa);await p.evaluate(()=>v2Qa.setup());
 await p.evaluate(c=>f3Qa.prepare(c),bossTestCharacter(level,'warrior'));
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 for(let i=0;i<2;i++)await p.getByRole('button',{name:new RegExp('の地図 Lv\\.'+level)}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();assert.match(await p.locator('.explorer-detail').textContent(),/★/);await p.screenshot({path:join(output,`${width}-confirm.png`)});await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>{v2Qa.input('confirm');f3Qa.setupSession();});
 const normal=await p.evaluate(()=>f3Qa.normal()),initial=await p.evaluate(()=>({exp:f3Qa.c().experience,gold:f3Qa.c().gold}));
 for(const floor of [1,2]){
  const walking=p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.stairsDown));await p.waitForFunction(()=>v2Qa.s().surveyPresentationPlaying);
  assert.equal(await p.evaluate(()=>v2Qa.s().renderState.overlayEvent.overlayMessage),'調査100マス達成！');
  await p.screenshot({path:join(output,`${width}-${level}-survey-${floor}.png`)});await walking;await p.evaluate(()=>v2Qa.input('confirm'));
  await p.waitForFunction(f=>v2Qa.s().currentFloor===f&&!v2Qa.s().transitioning,floor);await p.evaluate(()=>{if(v2Qa.s().renderState.overlayEvent)v2Qa.input('confirm');});
 }
 await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.keyChest));assert.equal(await p.evaluate(()=>v2Qa.s().cellPrompt),'chest');
 await p.screenshot({path:join(output,`${width}-${level}-chest.png`)});await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().keyAcquisitionPlaying);await p.waitForFunction(()=>!document.querySelector('#itemGetEffect').hidden);assert.match(await p.locator('#itemGetItems img').getAttribute('src'),/red_rust_key.avif/);await p.waitForTimeout(1100);await p.screenshot({path:join(output,`${width}-key-popup.png`)});await p.waitForFunction(()=>v2Qa.s().bossKeyFound&&!v2Qa.s().transitioning);
 await p.evaluate(async()=>{const d=v2Qa.s().generatedMap.bossRoom.doorEdge,dir=['N','E','S','W'].indexOf(d.direction),outside={x:d.x+[0,1,0,-1][dir],y:d.y+[-1,0,1,0][dir]};await v2Qa.go(outside);await v2Qa.face((dir+2)%4);v2Qa.input('confirm');await v2Qa.settled();});
 assert.equal(await p.evaluate(()=>v2Qa.s().bossDoorUnlocked),true);
 await p.evaluate(async()=>{await v2Qa.go(v2Qa.s().generatedMap.bossRoom.doorEdge);await v2Qa.face(0);});await p.waitForTimeout(300);await p.screenshot({path:join(output,`${width}-boss-room.png`)});
 const bossWalk=p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.bossRoom.bossCell));await p.waitForFunction(()=>v2Qa.s().surveyPresentationPlaying);
 assert.equal(await p.evaluate(()=>v2Qa.s().renderState.overlayEvent.overlayMessage),'地図調査完了！');assert.equal(await p.evaluate(()=>f3Qa.active()),false);
 await p.screenshot({path:join(output,`${width}-${level}-survey-complete.png`)});await bossWalk;await p.waitForFunction(()=>f3Qa.active());
 assert.equal(await p.evaluate(()=>v2Qa.s().torchFuel),100);const before=await p.evaluate(()=>f3Qa.snapshot()),state=await p.evaluate(()=>f3Battle());assert.equal(state.explorationContext.source,'special-map-v2-boss');assert.equal(state.enemy.isBoss,true);
 await p.waitForFunction(()=>document.querySelector('#battleEnemyImage')?.naturalWidth===600);assert.match(state.enemy.image,/^data:image\/png/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const box=await p.locator('#battleEnemyName').boundingBox(),root=await p.locator('#battleScreen').boundingBox();assert.ok(box.y>=root.y&&box.x>=root.x&&box.x+box.width<=root.x+root.width);
 await p.screenshot({path:join(output,`${width}-${level}-battle.png`)});
 if(width===390){await p.setViewportSize({width:1280,height:900});await p.screenshot({path:join(output,`1280-${level}-battle-resized.png`)});await p.setViewportSize({width,height:900});}
 for(let i=0;i<1200&&await p.evaluate(()=>f3Qa.active());i++){
  const b=await p.evaluate(()=>f3Battle());if(b.outcome)await p.evaluate(()=>f3Qa.input('confirm'));else await p.evaluate(c=>f3Command(c),bossTestCommand(b));await p.waitForTimeout(100);
 }
 await p.waitForFunction(()=>!f3Qa.active()&&!v2Qa.s().transitioning);assert.equal(await p.evaluate(()=>f3LastBattle.outcome),'victory');
 assert.equal(await p.evaluate(()=>f3Qa.snapshot()),before);assert.equal(await p.evaluate(()=>f3Qa.normal()),normal);assert.equal(await p.evaluate(()=>v2Qa.s().bossDefeated),true);
 const rewards=await p.evaluate(()=>({exp:v2Qa.s().battleExperience,gold:v2Qa.s().lootBag.gold}));assert.ok(rewards.exp>0&&rewards.gold>0);assert.equal(await p.evaluate(()=>f3Qa.c().experience),initial.exp);
 await p.evaluate(()=>v2Qa.s().onBossCell());assert.equal(await p.evaluate(()=>f3Qa.active()),false);
 await p.screenshot({path:join(output,`${width}-${level}-resume.png`)});
 await p.evaluate(()=>v2Qa.input('status'));assert.match(await p.locator('.nde-experience').textContent(),new RegExp('\\+'+rewards.exp));await p.screenshot({path:join(output,`${width}-exp-status.png`)});await p.evaluate(()=>{v2Qa.input('cancel');v2Qa.input('cancel');});
 await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().currentFloor===0&&!v2Qa.s().transitioning);assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),rewards.exp);assert.equal(await p.evaluate(()=>v2Qa.s().bossDefeated),true);await p.evaluate(()=>{if(v2Qa.s().renderState.overlayEvent)v2Qa.input('confirm');});
 await p.evaluate(()=>v2Qa.go(v2Qa.s().generatedMap.stairsUp));await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>!v2Qa.s());
 await p.waitForTimeout(1000);await p.screenshot({path:join(output,`${width}-${level}-return.png`)});
 await p.locator('#lootIdentifyAction').click();await p.getByRole('button',{name:'閉じる',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#experienceSettlementOverlay').hidden);
 assert.match(await p.locator('#experienceSettlementDetail').textContent(),/地図Lvボーナス/);
 await p.screenshot({path:join(output,`${width}-${level}-settlement.png`)});
 assert.equal(await p.evaluate(()=>f3Qa.c().experience),initial.exp+rewards.exp+Math.floor(rewards.exp*level/200));assert.equal(await p.evaluate(()=>f3Qa.c().gold),initial.gold+rewards.gold);
 assert.equal(await p.evaluate(()=>f3Qa.normal()),normal);await p.locator('#experienceSettlementOverlay').click();await p.waitForFunction(()=>document.querySelector('#townCommerceTitle')?.textContent==='雇用更新');await p.screenshot({path:join(output,`${width}-renewal.png`)});assert.deepEqual(errors,[]);
 results.push({width,level,boss:state.enemy.id,turns:await p.evaluate(()=>f3LastBattle.turn),rewards,variant:true,keyRoute:true,returnSettlement:true,normalUnchanged:true});console.log(results.at(-1));await p.close();
}}finally{await browser.close();await writeFile(join(output,'results.json'),JSON.stringify(results,null,2));console.log(output);}
