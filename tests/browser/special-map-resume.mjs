import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.resumeQa={
 async setup(){
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  setBgmOptions({enabled:false});setSeOptions({enabled:false});startNewGame();
  const {normalizeSpecialMaps}=await import('../data/special-maps.js');
  character=normalizeCharacter({...createInitialCharacter({name:'QA',job:'warrior'}),specialMaps:normalizeSpecialMaps({discovererName:'QA',registered:[{rulesetVersion:'special-map-v2',seed:12345,level:50,rarity:'SILVER',discovererName:'QA'}]})});
  openTown({registrationRequired:false,mode:'dungeonEntrance'});
  const registered=character.specialMaps.registered,mapKey=mapOriginalId(registered[0]);
  const c=startSpecialMapExploration({registered,mapKey,message:msgEl,playSe,onExit:()=>openTown({registrationRequired:false,mode:'dungeonEntrance'}),saveSurvey:mask=>transactSpecialMaps({getCharacter:()=>character,setCharacter:next=>{character=next;},save:()=>saveGame()},maps=>updateMapSurvey(maps,mapKey,mask))});
  await c.ready; c.session.renderState.overlayEvent=null;return true;
 },
 session:()=>getSpecialMapContext()?.session,
 read:()=>({character,snapshot:makeSaveSnapshot(),battle:isBattleActive()}),
 save:saveGame,load(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');continueGame('auto');},
 finish:()=>getSpecialMapContext().finish(),
 begin:beginV2Battle,finishBattle:finishV2Battle,
 input:a=>getSpecialMapContext().input(a),
 encounter(){const s=getSpecialMapContext().session; s.cellPrompt=null;s.renderState.overlayEvent=null;
  for(let y=0;y<10;y++)for(let x=0;x<10;x++){
   const f=s.generatedMap;if([f.stairsUp,f.stairsDown,f.keyChest,f.bossRoom?.bossCell].some(p=>p&&p.x===x&&p.y===y))continue;
   s.playerX=x;s.playerY=y;s.renderState.x=x+.5;s.renderState.y=y+.5;s.presence=100;s.onEncounterStep();return;
  }
 },
 boss(){const s=getSpecialMapContext().session;s.currentFloor=2;const p=s.generatedMap.bossRoom.bossCell;
  s.playerX=p.x;s.playerY=p.y;s.renderState.x=p.x+.5;s.renderState.y=p.y+.5;
  s.bossKeyFound=true;s.bossDoorUnlocked=true;s.cellPrompt=null;s.renderState.overlayEvent=null;s.onBossCell();
 },
 winBoss(){const s=getSpecialMapContext().session;return finishV2Battle({explorationContext:s.battleContext,enemy:{id:'qa',experienceReward:321}},'victory');},
 setCharacter:c=>{character=normalizeCharacter({...character,...c});},
 pending:()=>loadGame('auto'),
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.resumeQa);
 await page.evaluate(()=>resumeQa.setup());
 // A real completed turn must autosave even when it reveals no new survey cell.
 const direction=await page.evaluate(()=>{resumeQa.input('right');return resumeQa.session().direction;});
 await page.waitForFunction(d=>resumeQa.pending()?.specialMap?.floors[0].direction===d,direction);
 await page.evaluate(()=>{
  const s=resumeQa.session();s.currentFloor=1;const f=s.floors[1];
  s.playerX=f.generatedMap.stairsUp.x;s.playerY=f.generatedMap.stairsUp.y;s.direction=2;
  s.renderState.x=s.playerX+.5;s.renderState.y=s.playerY+.5;s.renderState.angle=Math.PI/2;
  s.bossKeyFound=true;f.chestOpened=true;s.bossDoorUnlocked=true;
  s.battleExperience=1234;s.lootBag={gold:77,items:{},equipment:[],cards:{}};s.torchFuel=43;s.incenseActive=true;
  resumeQa.save();
 });
 const before=await page.evaluate(()=>resumeQa.pending());
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.locator('[data-title-action="continue"]').click();
 await page.waitForFunction(()=>resumeQa.session());
 const after=await page.evaluate(()=>resumeQa.read().snapshot);
 assert.deepEqual(after.specialMap,before.specialMap);
 assert.equal(after.character.hp,before.character.hp);assert.equal(after.character.sp,before.character.sp);
 assert.equal(await page.locator('.special-map-runtime').count(),1);
 await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>resumeQa.session().direction===3&&!resumeQa.session().motion);
 assert.equal(await page.evaluate(()=>resumeQa.save({slot:'manual1'})),false);
 // Return through the real controller; verify committed state has no expedition.
 await page.evaluate(()=>{const s=resumeQa.session();s.transitioning=false;s.cellPrompt=null;s.currentFloor=0;});
 await page.evaluate(()=>{window.originalSaveSetter=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('QA quota failure');};});
 assert.equal(await page.evaluate(()=>resumeQa.finish()),false);
 assert.equal(await page.evaluate(()=>resumeQa.session().battleExperience),1234);
 await page.evaluate(()=>Storage.prototype.setItem=window.originalSaveSetter);
 assert.equal(await page.evaluate(()=>resumeQa.finish()),true);
 const returned=await page.evaluate(()=>resumeQa.pending());
 assert.equal(returned.specialMap,null);
 assert.equal(returned.character.gold,before.character.gold+77);
 assert.ok(returned.character.experience>before.character.experience);
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.locator('[data-title-action="continue"]').click();
 assert.equal(await page.evaluate(()=>!!resumeQa.session()),false);
 assert.equal((await page.evaluate(()=>resumeQa.read().character)).experience,returned.character.experience);
 // Interrupted normal encounter retains its start character and enemy.
 await page.evaluate(()=>resumeQa.setup());await page.evaluate(()=>resumeQa.encounter());
 await page.waitForFunction(()=>resumeQa.read().battle);
 const combatStart=await page.evaluate(()=>resumeQa.pending());
 await page.evaluate(()=>{resumeQa.setCharacter({hp:1,sp:0});resumeQa.save();});
 assert.equal((await page.evaluate(()=>resumeQa.pending())).character.hp,combatStart.character.hp);
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.locator('[data-title-action="continue"]').click();
 await page.waitForFunction(()=>resumeQa.read().battle);
 assert.equal((await page.evaluate(()=>resumeQa.pending())).specialMap.encounter.speciesId,combatStart.specialMap.encounter.speciesId);
 // A separate page reload clears the prior battle before a new synthetic run.
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.evaluate(()=>resumeQa.setup());
 await page.evaluate(()=>resumeQa.boss());await page.waitForFunction(()=>resumeQa.read().battle);
 const bossStart=await page.evaluate(()=>resumeQa.pending());
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.locator('[data-title-action="continue"]').click();
 await page.waitForFunction(()=>resumeQa.read().battle);
 assert.equal((await page.evaluate(()=>resumeQa.pending())).specialMap.encounter.battleUuid,bossStart.specialMap.encounter.battleUuid);
 await page.evaluate(()=>{window.originalSaveSetter=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('QA quota failure');};});
 await page.evaluate(()=>resumeQa.winBoss());
 assert.equal(await page.evaluate(()=>resumeQa.session().bossDefeated),false);
 assert.equal(await page.evaluate(()=>resumeQa.session().battleExperience),0);
 assert.equal((await page.evaluate(()=>resumeQa.pending())).character.specialMaps.bossReward.status,'prepared');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSaveSetter;resumeQa.session().victoryRetry();});
 const victory=await page.evaluate(()=>resumeQa.pending());
 assert.equal(victory.specialMap.values.bossDefeated,true);assert.equal(victory.specialMap.encounter,null);
 assert.equal(victory.character.specialMaps.bossReward.status,'pending');
 assert.equal(victory.specialMap.values.battleExperience,321);
 await page.reload();await page.waitForFunction(()=>window.resumeQa);await page.locator('[data-title-action="continue"]').click();
 await page.waitForFunction(()=>resumeQa.session());
 assert.equal(await page.evaluate(()=>resumeQa.read().battle),false);
 assert.equal(await page.evaluate(()=>resumeQa.session().bossDefeated),true);
 assert.equal(await page.evaluate(()=>resumeQa.session().battleExperience),321);
 assert.deepEqual(errors,[]);console.log(label+': turn autosave, reload, floor/key/loot/EXP restore, return, interrupted combat, boss reward, failure/retry and no duplicates passed');
 await page.close();
}}finally{await browser.close();}
