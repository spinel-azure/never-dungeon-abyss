import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8');
const hook=`window.uniqueQa={async setup(job,id){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'QA',job});character.level=100;character=normalizeCharacter(character);
 const {grantEquipmentInstance,equipInstance}=await import('/data/equipment-inventory.js');const g=grantEquipmentInstance(character,id,'rightArmId');character=normalizeCharacter(equipInstance(g.character,'rightArmId',g.instance.instanceId).character);character.sp=character.maxSp;character.hp=character.maxHp=99999;character.agi=99;character.deckTutorialSeen=true;
 worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 const enemies=[0,1].map(i=>({...createEnemyCombatant(getEnemyById('abyss_rat')),id:'qa_'+i,hp:999999,maxHp:999999,agi:1}));startBattle(enemies[0],{playStartSe:false,enemies});
}};`;
await mkdir('artifacts/rapid-current-uniques',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.battleQa={cast:skillId=>executeCommand({type:"skill",skillId,targetIndex:0}),close:closeBattle,read:()=>({sp:battleUi.battle.player.sp,events:battleUi.battle.presentationEvents,skills:battleUi.battle.player.skillIds})};'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.uniqueQa);
 for(const [job,id,skill,count] of [['warrior','fulgura','golden_rice_sea',4],['thief','jormungandr','twilight_dew_rain',4],['priest','cucullus_domini','dominus_lux_aeterna',2]]){
  await page.evaluate(args=>uniqueQa.setup(...args),[job,id]);const before=await page.evaluate(()=>battleQa.read());assert.ok(before.skills.includes(skill));
  await page.evaluate(async skill=>{window.castDone=false;battleQa.cast(skill).then(()=>window.castDone=true);},skill);
  await page.waitForFunction(()=>window.castDone,null,{timeout:45000});const after=await page.evaluate(()=>battleQa.read());
  assert.equal(after.sp,before.sp-40);const hits=after.events.filter(e=>e.type==='attackHit'&&e.actorSide==='player');assert.equal(hits.length,count);
  await page.screenshot({path:'artifacts/rapid-current-uniques/'+label+'-'+id+'.png'});await page.evaluate(()=>battleQa.close());
 }
 assert.deepEqual(errors,[]);console.log(label+' all three skills passed');await page.close();
}}finally{await browser.close();}
