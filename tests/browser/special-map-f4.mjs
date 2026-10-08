import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {encodeMapCode} from '../../data/special-map-code.js';
import {bossTestCharacter} from '../../tools/simulate-map-bosses.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const output='artifacts/special-map-f4';await mkdir(output,{recursive:true});
const previous=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};
vm.runInNewContext(previous.slice(previous.indexOf('const baseHook='),previous.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const code=encodeMapCode({rulesetVersion:'special-map-v2',seed:12345,level:100,rarity:'WHITE',discovererName:'原作者'});
const hook=scope.hook.replace('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta',code).replace("worldLocation='town';","character.eventFlags.treliren_met=true;worldLocation='town';");
const extra=`window.f4Qa={
 c:()=>character,active:isBattleActive,input:handleBattleInput,
 prepare(c){const maps=character.specialMaps;maps.starterMapsTestGranted=true;maps.registered[0].surveyedMasks=Array(3).fill('f'.repeat(25));
 maps.unidentified=Array.from({length:3},(_,i)=>({rulesetVersion:'special-map-v2',seed:10+i,level:1,rarity:'WHITE',discovererName:'QA',discoveryId:'owned-'+i}));
 character={...c,specialMaps:maps,carriedExperience:777,lootBagTutorialSeen:true,eventFlags:{...c.eventFlags,treliren_met:true}};
 character.lootBag={gold:888,items:{},cards:{},equipmentInstances:[]};
 character.npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};
 updateCharacterUi();setBattleSpeedMode('fast');saveGame();},
 boss(){const s=v2Qa.s();s.onEncounterStep=()=>false;s.renderState.overlayEvent=null;s.cellPrompt=null;s.currentFloor=2;s.bossKeyFound=s.bossDoorUnlocked=true;
 const p=s.generatedMap.bossRoom.bossCell;s.playerX=p.x;s.playerY=p.y;s.onBossCell();},
 duplicate:()=>finishV2Battle(structuredClone(window.f4LastBattle),'victory'),
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),carried:character.carriedExperience,loot:character.lootBag}),
 return:()=>getSpecialMapContext().finish(),
 renewalNo:()=>handleRawTownInput('cancel'),
 resume(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');window.dispatchEvent(new Event('nda:continue'));},
 explorerTest:async()=>{(await import('/js/explorer-preview.js')).setExplorerTestEnabled(true);},
 failSave(on){if(!this.realSet)this.realSet=Storage.prototype.setItem;const original=this.realSet;Storage.prototype.setItem=on?function(k,v){if(k==='nda.save.slot1.current')throw Error('QA quota');return original.call(this,k,v);}:original;}
};`;
const main=(await readFile('js/main.js','utf8'))
 .replace('  async function finishV2Battle(battle,outcome){','  async function finishV2Battle(battle,outcome){window.f4LastBattle=structuredClone(battle);')
 .replace('createEnemyCombatant({...enemyData,image})','createEnemyCombatant({...enemyData,image,...(context.source===\'special-map-v2-boss\'?{hp:1,maxHp:1}:{})})');
const battle=await readFile('js/battle.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const width of [1280,390]){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(30000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.f4Battle=()=>battleUi.battle;window.f4Attack=()=>{if(!battleUi.presenting&&!battleUi.battle?.outcome)return executeCommand({type:"attack"});};'}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4177');await p.waitForFunction(()=>window.f4Qa);
 await p.evaluate(()=>v2Qa.setup());await p.evaluate(c=>f4Qa.prepare(c),bossTestCharacter(100));
 // Desktop command-root mouse-left is deliberately B/cancel; dispatch the
 // selected command on PC, and use an actual touchscreen tap on the mobile run.
 const activateCommand=async name=>{const b=p.getByRole('button',{name,exact:true});if(width===390)await b.tap();else await b.dispatchEvent('click');};
 const enter=async()=>{
  await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
  for(let i=0;i<2;i++)await p.getByRole('button',{name:/の地図 Lv\.100/}).click();
  await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 };
 const returnAndSettle=async()=>{
  await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().currentFloor===0&&!v2Qa.s().transitioning);
  assert.equal(await p.evaluate(()=>f4Qa.return()),true);await p.waitForFunction(()=>!v2Qa.s());
  await p.locator('#lootIdentifyAction').click();await p.getByRole('button',{name:'閉じる',exact:true}).click();
  await p.waitForFunction(()=>!document.querySelector('#experienceSettlementOverlay').hidden);
  await p.locator('#experienceSettlementOverlay').click();
  await p.waitForFunction(()=>document.querySelector('#townCommerceTitle')?.textContent==='雇用更新');
  await p.evaluate(()=>f4Qa.renewalNo());
  await p.waitForFunction(()=>!f4Qa.c().npcSystem.renewal?.pending);
 };
 let firstReward;
 for(let lap=0;lap<2;lap++){
  console.log('Browser F4',width,'lap',lap+1);
  if(lap===1)await p.evaluate(()=>{f4Qa.c().npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};});
  await enter();await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);
  const normal=await p.evaluate(()=>f4Qa.normal());
  await p.evaluate(()=>f4Qa.boss());await p.waitForFunction(()=>f4Qa.active());
  if(lap===0)await p.evaluate(()=>f4Qa.failSave(true));
  for(let n=0;n<150&&await p.evaluate(()=>f4Qa.active());n++){
   await p.evaluate(()=>{if(f4Battle()?.outcome)f4Qa.input('confirm');else f4Attack();});await p.waitForTimeout(100);
  }
  await p.waitForFunction(()=>!f4Qa.active());
  if(lap===0){
   await p.waitForFunction(()=>!!v2Qa.s().victoryRetry);assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.bossReward.status),'prepared');
   await p.evaluate(()=>{f4Qa.failSave(false);v2Qa.input('confirm');});
  }
  await p.waitForFunction(()=>v2Qa.s().bossDefeated&&!v2Qa.s().transitioning);
  const reward=await p.evaluate(()=>f4Qa.c().specialMaps.bossReward);
  assert.equal(reward.status,'pending');assert.equal(reward.map.level,100);assert.equal(reward.map.discovererName,'スピネ');
  if(lap===0)firstReward=reward;else assert.notEqual(reward.rewardId,firstReward.rewardId);
  const exp=await p.evaluate(()=>v2Qa.s().battleExperience);await p.evaluate(()=>f4Qa.duplicate());assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),exp);
  assert.equal(await p.evaluate(()=>f4Qa.normal()),normal);
  await returnAndSettle();assert.equal(await p.evaluate(()=>f4Qa.normal()),normal);
  await enter();assert.equal(await p.evaluate(()=>!!v2Qa.s()),false);assert.match(await p.locator('#message').innerText().catch(()=>p.locator('body').innerText()),/未受領/);
  await p.evaluate(()=>{v2Qa.input('cancel');v2Qa.input('cancel');v2Qa.input('cancel');});
  await p.locator('[data-entrance-command="explorerTent"]').dispatchEvent('click');
  await activateCommand('討伐報酬受領');
  assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.bossReward.status),'pending');
  assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.unidentified.length),3);
  await p.screenshot({path:`${output}/${width}-full-${lap}.png`});
  // Appraise one existing map through the normal UI, then receive the fixed reward.
  await activateCommand('地図鑑定');
  for(let i=0;i<2;i++)await p.getByRole('button',{name:'未鑑定の地図 1',exact:true}).click();
  for(let i=0;i<3;i++)await p.getByRole('button',{name:'確認（A）',exact:true}).click();
  await p.evaluate(()=>{v2Qa.input('cancel');v2Qa.input('cancel');});
  if(lap===0){
   await p.evaluate(()=>f4Qa.failSave(true));await activateCommand('討伐報酬受領');
   assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.unidentified.length),2);assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.bossReward.status),'pending');
   await p.evaluate(()=>f4Qa.failSave(false));
   await p.reload();await p.waitForFunction(()=>window.f4Qa);await p.evaluate(()=>f4Qa.resume());await p.waitForFunction(()=>f4Qa.c()?.specialMaps?.bossReward?.status==='pending');
   // The existing load migration settles our deliberately retained ordinary
   // carried EXP (777). Finish that unrelated presentation before using town UI.
   await p.waitForFunction(()=>!document.querySelector('#experienceSettlementOverlay').hidden);
   await p.locator('#experienceSettlementOverlay').click();
   await p.waitForFunction(()=>document.querySelector('#experienceSettlementOverlay').hidden);
   await p.evaluate(()=>f4Qa.explorerTest());
   assert.deepEqual(await p.evaluate(()=>f4Qa.c().specialMaps.bossReward),reward);
   await p.locator('[data-entrance-command="explorerTent"]').dispatchEvent('click');
  }
  await activateCommand('討伐報酬受領');
  assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.bossReward.status),'received');
  assert.equal(await p.evaluate(()=>f4Qa.c().specialMaps.unidentified.length),3);
  assert.deepEqual(await p.evaluate(id=>f4Qa.c().specialMaps.unidentified.find(m=>m.discoveryId===id),reward.rewardId),reward.map);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('#itemGetEffect:not([hidden]) .item-get-image').waitFor({state:'visible'});
  await p.waitForTimeout(1100);
  await p.screenshot({path:`${output}/${width}-received-${lap}.png`});
  await p.waitForFunction(()=>document.querySelector('#itemGetEffect').hidden);await p.waitForTimeout(100);
  await activateCommand('戻る');
 }
 assert.deepEqual(errors,[]);results.push({width,laps:2,level:100,clonedDuplicate:true,victorySaveRetry:true,receiptSaveRollback:true,pendingReload:true,fullThenAppraised:true,entryBlocked:true,expGoldAndRenewal:true,ordinaryDungeonUnchanged:true,fixture:'HP1 normal boss, direct B3F placement, precompleted survey; production combat/outcome/portal/return/receipt'});
 console.log(results.at(-1));await p.close();
}}catch(error){
 for(const c of browser.contexts())for(const p of c.pages()){await p.screenshot({path:`${output}/failure.png`});await writeFile(`${output}/failure.txt`,await p.locator('body').innerText());}
 throw error;
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify(results,null,2)+'\n');}
