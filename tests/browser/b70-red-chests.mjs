// Browser QA uses isolated contexts and test hooks injected only into served modules.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("playwright");
const origin=process.env.B70_TEST_URL||"http://127.0.0.1:4179";
const output=path.resolve("artifacts/b70-red-chests");
const main=await readFile(new URL("../../js/main.js",import.meta.url),"utf8");
const player=await readFile(new URL("../../js/player.js",import.meta.url),"utf8");
const hook=`window.b70Qa={
 setup(){
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  character=createInitialCharacter({name:'B70 QA',job:'warrior'});character.level=80;character=normalizeCharacter(character);
  character.lootBagTutorialSeen=true;saveEnabled=true;currentDepth=70;worldLocation='dungeon';
  closeCampMenu();closeTown();resetDungeon('',null,true);
  setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 },
 state:()=>structuredClone(character),save:saveGame,load:()=>continueGame('auto'),
 startFloor(){const cell=cells.flat().find(c=>c.treasure==='red');if(!cell)throw new Error('no B70 chest');state.gridX=cell.x;state.gridY=cell.y;cell.treasureTrapId=null;window.b70StartFloor('red',cell.x,cell.y);},
 victory:finishBattleVictory,
 async settle(){const bag=structuredClone(character.lootBag);const result=settleLootBag(character);character=normalizeCharacter(result.character);showLootIdentification(bag,result,{playBgm:false});completeLootIdentification(pendingLootIdentification);return result;},
 closeIdentification(){handleLootIdentifyInput('confirm');},
 inventory(){closeCampMenu('test');openItemInventory();},sell:sellTownItem,
 restoreOldFloor(){for(const cell of cells.flat()){if(cell.treasure==='red'){cell.treasure=null;cell.treasureTrapId=null;}}saveGame();continueGame('auto');return cells.flat().filter(c=>c.treasure==='red').length;}
};`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{
 for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player+'\nwindow.b70StartFloor=startTreasureEvent;'}));
  await page.goto(origin);await page.waitForFunction(()=>window.b70Qa);
  await page.evaluate(()=>b70Qa.setup());
  const startGold=await page.evaluate(()=>b70Qa.state().gold);
  const awards=[];
  for(const mode of ['floor','drop'])for(const [roll,id] of [[0.1,'strong_healing_potion_medium'],[0.6,'blue_pearl'],[0.85,'crystal_coral'],[0.98,'sunken_kingdom_coin_pouch']]){
   if(mode==='floor') await page.evaluate(()=>b70Qa.setup());
   const before=await page.evaluate(id=>b70Qa.state().lootBag.items[id]||0,id);
   await page.evaluate(async({mode,roll})=>{
    if(mode==='floor')b70Qa.startFloor();
    else{
     const {createBattleState,resolveBattleRound}=await import('/combat/battle-engine.js');
     const {createBattleCompletionSnapshot}=await import('/js/battle.js');
     const {createEnemyCombatant,getEnemyById}=await import('/data/enemies.js');
     const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));enemy.hp=enemy.maxHp=1;
     const battle=resolveBattleRound({battle:createBattleState({character:b70Qa.state(),enemy}),playerCommand:{type:'attack'},rng:()=>0.5}).battle;
     window.b70OriginalRandom=Math.random;Math.random=()=>0.99;
     b70Qa.victory(createBattleCompletionSnapshot(battle));
     Math.random=window.b70OriginalRandom;
    }
    window.b70OriginalRandom=Math.random;Math.random=()=>roll;
    const {handleOverlayEventInput}=await import('/js/player.js');handleOverlayEventInput('confirm');
   },{mode,roll});
   await page.waitForFunction(({id,before})=>(b70Qa.state().lootBag.items[id]||0)===before+1,{id,before});
   await page.evaluate(()=>{Math.random=window.b70OriginalRandom;});
   const state=await page.evaluate(()=>b70Qa.state());
   assert.equal(state.gold,startGold);assert.equal(state.lootBag.gold,0);
   awards.push({mode,id});
  }
  // Last floor award plus every dropped chest supply all three valuables for display and sale.
  await page.evaluate(()=>b70Qa.settle());
  await page.screenshot({path:path.join(output,`${label}-identified.png`)});
  await page.evaluate(()=>{b70Qa.closeIdentification();b70Qa.inventory();});
  for(const [name,id] of [['蒼真珠','blue_pearl'],['水晶珊瑚','crystal_coral'],['沈没王国の金貨袋','sunken_kingdom_coin_pouch']]){
   const row=page.locator('[data-inventory-list] button').filter({hasText:name});
   await row.click();
   const detail=page.locator('[data-inventory-description]');
   assert.match(await detail.textContent(),/《換金アイテム》/);
   const bounds=await detail.evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth}));
   assert.ok(bounds.sh<=bounds.h+1,JSON.stringify(bounds));assert.ok(bounds.sw<=bounds.w+1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,`${label}-${id}.png`)});
  }
  const saved=await page.evaluate(()=>{b70Qa.save();b70Qa.load();return b70Qa.state();});
  for(const id of ['blue_pearl','crystal_coral','sunken_kingdom_coin_pouch'])assert.ok(saved.inventory.counts[id]>0);
  const sales=await page.evaluate(()=>{
   const before=b70Qa.state();const results=['blue_pearl','crystal_coral','sunken_kingdom_coin_pouch'].map(id=>{const sold=b70Qa.sell(id,1);return {id,accepted:sold.accepted,value:sold.value};});
   return {before,after:b70Qa.state(),results};
  });
  assert.deepEqual(sales.results.map(r=>r.value),[5000,10000,20000]);
  assert.ok(sales.results.every(r=>r.accepted));assert.equal(sales.after.gold-sales.before.gold,35000);
  for(const {id} of sales.results) assert.equal(sales.after.inventory.counts[id]||0,sales.before.inventory.counts[id]-1);
  const oldFloor=await page.evaluate(()=>{b70Qa.setup();return b70Qa.restoreOldFloor();});assert.equal(oldFloor,0);
  assert.deepEqual(errors,[]);results.push({label,awards,sales:sales.results,oldFloor,errors});await context.close();
 }
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}