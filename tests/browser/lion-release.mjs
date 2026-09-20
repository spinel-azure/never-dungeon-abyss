import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8'),battle=await readFile('js/battle.js','utf8');
const hook=`window.lrelease={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'獅子の噂',job:'mage'});character.hp=character.maxHp=10000;character.sp=character.maxSp=1000;character.skillIds.push('lightning_bolt');setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character,access:()=>getCurrentSpecialDoorAccessBlock(),enter:()=>{closeTown();worldLocation='dungeon';currentDepth=1;resetDungeon();},bgm:selectBattleBgm};`;
await mkdir('artifacts/lion-release',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height]of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:town+`\nwindow.lt={open:()=>{openTown({facilityId:'tavern',mode:'facilityMenu'});setTownTypewriterOptions({enabled:true,speed:'fast'});activateFacilityService('rumors');},advance:()=>handleTownInput('confirm'),state:()=>({mode:town.mode,typing:townTypewriter.active,index:town.rumorDialogueIndex,text:town.messageEl.textContent,fits:town.messageEl.scrollHeight<=town.messageEl.clientHeight+1})};`}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.lb={state:()=>battleUi.battle,use:executeCommand,idle:()=>!battleUi.presenting,finish:finishBattle};'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.lrelease);
 await page.evaluate(async()=>{
  lrelease.setup();window.lp=await import('/js/player.js');window.ld=await import('/js/dungeon.js');window.cfg=await import('/js/config.js');window.lr=await import('/data/tavern-rumors.js');
  const {CARDS}=await import('/data/cards.js');const c=lrelease.character();c.cards.ownedCardCounts=Object.fromEntries(CARDS.filter(c=>c.rarity==='Z'&&c.id!=='zodiac_leo').map(c=>[c.id,1]));
  for(const r of lr.TAVERN_RUMORS.filter(r=>r.id!=='rumor_016'))for(const p of r.phases)c.eventFlags[p.readFlag]=true;
  lrelease.enter();
 });
 assert.equal(await page.evaluate(()=>lrelease.access().blocked),true);
 await page.evaluate(()=>lt.open());await page.waitForFunction(()=>lt.state().typing);
 assert.equal(await page.evaluate(()=>lrelease.character().eventFlags.tavern_rumor_016_base_read),undefined);
 await page.waitForFunction(()=>!lt.state().typing);assert.equal(await page.evaluate(()=>lt.state().fits),true);await page.screenshot({path:`artifacts/lion-release/${label}-rumor.png`});
 for(let i=0;i<3;i++){await page.evaluate(()=>lt.advance());await page.waitForFunction(()=>!lt.state().typing);}
 assert.equal(await page.evaluate(()=>lrelease.character().eventFlags.tavern_rumor_016_base_read),true);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('facility-talk-message-expanded')),false);
 assert.ok(await page.evaluate(()=>lr.getPastTavernRumors(lrelease.character()).some(r=>r.title==='獅子の咆哮の噂')));
 await page.evaluate(()=>{
  lrelease.enter();lp.setPlayerInputEnabled(true);
  outer:for(let y=0;y<cfg.MAP_H;y++)for(let x=0;x<cfg.MAP_W;x++)for(let i=0;i<cfg.DIRS.length;i++){
   const dir=cfg.DIRS[i];if(!ld.cells[y][x].specialRoom&&ld.getDoorKind(x,y,dir.key)==='specialLocked'&&ld.getSpecialRoomAtDoor(x,y,dir.key)?.content?.bossId==='loewenkoenigin_b1f'){
    Object.assign(lp.state,{gridX:x,gridY:y,x:x+.5,y:y+.5,dir:i,anim:null,overlayEvent:null});lp.openDoorAhead();break outer;
   }
  }
 });
 await page.waitForFunction(()=>lp.state.overlayEvent?.type==='specialDoorAccessConfirm');
 await page.screenshot({path:`artifacts/lion-release/${label}-door.png`});
 await page.evaluate(()=>lp.handleOverlayEventInput('cancel'));assert.equal(await page.evaluate(()=>lp.state.overlayEvent),null);
 await page.evaluate(()=>{lp.openDoorAhead();lp.handleOverlayEventInput('confirm');});
 await page.waitForFunction(()=>lp.state.overlayEvent?.type==='lionEvent');
 assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'intro');
 await page.screenshot({path:`artifacts/lion-release/${label}-intro.png`});
 await page.evaluate(()=>{lp.handleOverlayEventInput('confirm');lp.handleOverlayEventInput('confirm');});
 await page.waitForFunction(()=>lb.state()?.enemy.id==='loewenkoenigin_b1f');await page.waitForFunction(()=>lb.idle());
 assert.equal(await page.evaluate(()=>lrelease.bgm(lb.state().enemy)),'finalBoss');
 await page.evaluate(()=>{lb.state().enemy.hp=1;Math.random=()=>.2;void lb.use({type:'skill',skillId:'lightning_bolt'});});await page.waitForFunction(()=>lb.idle());
 await page.evaluate(()=>lb.finish());await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='victory');
 assert.equal(await page.evaluate(()=>lrelease.character().cards.ownedCardCounts.zodiac_leo),1);
 assert.equal(await page.evaluate(()=>lrelease.access().blocked),false);
 await page.evaluate(()=>{lp.state.overlayEvent=null;lt.open();});await page.waitForFunction(()=>!lt.state().typing);
 for(let i=0;i<3;i++){await page.evaluate(()=>lt.advance());await page.waitForFunction(()=>!lt.state().typing);}
 assert.ok(await page.evaluate(()=>lt.state().text.includes('あなた本当に何者')));
 await page.screenshot({path:`artifacts/lion-release/${label}-followup.png`});
 await page.evaluate(()=>lt.advance());
 assert.ok(await page.evaluate(()=>lr.getPastTavernRumors(lrelease.character()).find(r=>r.id==='rumor_016').description.some(t=>t.includes('あなた本当に何者'))));
 assert.deepEqual(errors,[]);console.log(`${label}: rumor/typewriter/read flag, actual door cancel/entry, intro/battle BGM, victory/follow-up/history passed`);await page.close();
}}finally{await browser.close();}
