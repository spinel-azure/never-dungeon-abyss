// Isolated browser contexts; hooks are injected only into served test modules.
import assert from "node:assert/strict";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("playwright");
const origin=process.env.RAPID_WEAPONS_TEST_URL||"http://127.0.0.1:4179";
const output=path.resolve('artifacts/rapid-region-weapons');
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const player=await readFile(new URL('../../js/player.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const hook=`window.rapidQa={
 setup(job){
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  character=createInitialCharacter({name:'RAPID QA',job});character.level=100;character=normalizeCharacter(character);
  character.eventFlags.black_chests_unlocked=true;character.lootBagTutorialSeen=true;saveEnabled=true;
  currentDepth=78;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);
  setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 },
 startChest(){const cell=cells.flat().find(c=>c.treasure==='black');if(!cell)throw new Error('missing black chest');state.gridX=cell.x;state.gridY=cell.y;cell.treasureTrapId=null;window.rapidStartFloor('black',cell.x,cell.y);},
 state:()=>structuredClone(character),
 async settleEquip(){
  const bag=structuredClone(character.lootBag);const settled=settleLootBag(character);character=normalizeCharacter(settled.character);
  const instance=character.equipmentInventory.instances.at(-1);
  const {equipInstance}=await import('/data/equipment-inventory.js');character=normalizeCharacter(equipInstance(character,'rightArmId',instance.instanceId).character);
  saveGame();continueGame('auto');return instance;
 },
 inventory(){closeCampMenu('test');openItemInventory();},status:openStatusMenu,
 mimic(){closeCampMenu('test');beginMimicBattle();},action:handleBattleInput,
 save:saveGame,load:()=>continueGame('auto')
};`;
await mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
 for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]])for(const [job,id,name] of [['warrior','current_cleaving_longsword','断流の長剣'],['thief','whirlpool_dagger','渦潮の短剣'],['priest','tide_piercing_mace','穿潮のメイス'],['mage','deep_current_staff','深流の大杖']]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player+'\nwindow.rapidStartFloor=startTreasureEvent;'}));
  await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.rapidBattleQa={state:()=>structuredClone(battleUi.battle),idle:()=>!battleUi.presenting,ready:()=>!battleUi.presenting&&!!battleUi.battle?.outcome,weaken(){battleUi.battle.player.hp=battleUi.battle.player.maxHp; for(const enemy of (battleUi.battle.enemies||[battleUi.battle.enemy])){enemy.hp=1;enemy.atk=0;enemy.str=0;enemy.agi=0;} battleUi.battle.enemy.hp=1;}};'}));
  await page.goto(origin);await page.waitForFunction(()=>window.rapidQa);await page.evaluate(job=>rapidQa.setup(job),job);
  await page.evaluate(async()=>{rapidQa.startChest();window.originalRandom=Math.random;Math.random=()=>.98;(await import('/js/player.js')).handleOverlayEventInput('confirm');});
  await page.waitForFunction(()=>rapidQa.state().lootBag.equipmentInstances.length===1);
  await page.evaluate(()=>{Math.random=window.originalRandom;});
  const award=await page.evaluate(()=>rapidQa.state().lootBag.equipmentInstances[0]);assert.equal(award.equipmentId,id);assert.equal(award.enhancement,3);
  const equipped=await page.evaluate(()=>rapidQa.settleEquip());assert.equal(equipped.equipmentId,id);
  const state=await page.evaluate(()=>rapidQa.state());assert.equal(state.equipment.weaponId,id);assert.equal(state.equipment.rightArmEnhancement,3);
  await page.evaluate(()=>rapidQa.inventory());await page.locator('[data-inventory-tab="equipment"]').click();
  const row=page.locator('[data-inventory-list] button').filter({hasText:name});
  // Owned equipment can put the new weapon on a later page.
  while(await row.count()===0){await page.locator('[data-inventory-nav="next"]').click();}
  await row.click();
  const text=await page.locator('[data-inventory-description]').textContent();assert.match(text,/ATK/);
  if(job==='priest')assert.match(text,/DEF貫通 45%/);
  if(job==='mage'){assert.match(text,/MAXSP \+15/);}
  const bounds=await page.locator('[data-inventory-description]').evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth}));
  assert.ok(bounds.sh<=bounds.h+1);assert.ok(bounds.sw<=bounds.w+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,`${label}-${job}-detail.png`)});
  await page.evaluate(()=>rapidQa.status());await page.screenshot({path:path.join(output,`${label}-${job}-status.png`)});
  await page.evaluate(()=>rapidQa.mimic());
  const mimic=await page.evaluate(()=>rapidBattleQa.state().enemy);assert.equal(mimic.depth,78);assert.equal(mimic.job,job);assert.equal(mimic.dropProfile,'blackChest');
  await page.waitForFunction(()=>rapidBattleQa.idle());
  await page.evaluate(()=>{rapidBattleQa.weaken();Math.random=()=>.5;rapidQa.action('confirm');});
  await page.waitForFunction(()=>rapidBattleQa.ready());
  assert.equal(await page.evaluate(()=>rapidBattleQa.state().outcome),'victory');
  await page.evaluate(()=>{Math.random=()=>.98;rapidQa.action('confirm');Math.random=window.originalRandom;});
  await page.waitForFunction(()=>rapidQa.state().lootBag.equipmentInstances.length===1);
  const mimicAward=await page.evaluate(()=>rapidQa.state().lootBag.equipmentInstances[0]);assert.equal(mimicAward.equipmentId,id);assert.equal(mimicAward.enhancement,3);
  assert.deepEqual(errors,[]);results.push({label,job,award,mimicAward,description:text,errors});await context.close();
 }
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({label:r.label,job:r.job,normal:r.award.equipmentId,mimic:r.mimicAward.equipmentId,errors:r.errors})),null,2));
}finally{await browser.close();}