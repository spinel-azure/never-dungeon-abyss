// QA hooks are served only in isolated browser contexts; saves and images stay in TEMP.
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const output = await mkdtemp(join(tmpdir(), 'nda-akashic-'));
const main = await readFile('js/main.js', 'utf8');
const battle = await readFile('js/battle.js', 'utf8');
const player = await readFile('js/player.js', 'utf8');
const hook = `window.akashicQa = {
 setup() {
  document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
  character=createInitialCharacter({name:'スピネル',job:'thief'}); character.hp=character.maxHp=10000;
  character.sp=character.maxSp=999; character.eventFlags={ending_story_completed:true,tavern_rumor_018_base_read:true,michaela_restored:true,boss_amayenak_b100f_defeated:true,boss_erzdaemonin_b100f_defeated:true};
  character.eventFlags.boss_b99f_defeated=true;
  for(const id of ['queen_tiara','queen_earring','queen_necklace'])character.keyItems=grantKeyItem(character.keyItems,id).keyItems;
  worldLocation='dungeon';currentDepth=100;closeCampMenu();closeTown();b100GauntletDefeatedThisExploration.clear();
  resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 },
 unlock(){for(const id of B100_GAUNTLET_BOSS_IDS)b100GauntletDefeatedThisExploration.add(id);refreshB100FinalBoss(character.eventFlags,[...b100GauntletDefeatedThisExploration]);},
 start(id){state.overlayEvent=null;Object.assign(state,{gridX:4,gridY:3,x:4.5,y:3.5,anim:null});return beginBossBattle(id);},
 queen(index){window.playerQa.queen(cells.flat().filter(c=>c.fixedEvent)[index].fixedEvent);},
 snapshot:makeSaveSnapshot, restore:restoreSavedState, enter:enterFloorFromTransfer,
 location:()=>worldLocation,
 read:()=>({flags:character.eventFlags,progress:[...b100GauntletDefeatedThisExploration],boss:cells[3][4].bossId}),
 };`;
const mainHook = hook.replace('restore:restoreSavedState', 'restore:restoreGame');
const battleHook = `window.akashicBattle={
 close:closeBattle,finish:finishBattle,idle:()=>!battleUi.presenting,
 read:()=>({id:battleUi.battle?.enemy.id,hp:battleUi.battle?.enemy.hp,revived:battleUi.battle?.enemy.causalityUsed,outcome:battleUi.battle?.outcome,charmed:isCharmed(battleUi.battle?.player),turn:battleUi.battle?.turn}),
 charm(){battleUi.battle.player.statuses=[{id:'charm',name:'魅了',remainingTurns:3,active:true,expiresAfterBattle:true}];battleUi.battle.enemy.actions=[{weight:1,action:{actionType:'wait'}}];renderBattle();scheduleCharmRound();},
 kill(){battleUi.battle.player.cards.deckSlots=['zodiac_sagittarius'];battleUi.battle.enemy.hp=1;battleUi.battle.enemy.actions=[{weight:1,action:{actionType:'wait'}}];battleUi.battle.enemy.apocalypseUsed=true;return executeCommand({type:'attack'});},
 apocalypse(){battleUi.battle.enemy.hp=30000;return executeCommand({type:'guard'});},
 defeat(){battleUi.battle.player.hp=0;battleUi.battle.player.alive=false;battleUi.battle.player.cards.deckSlots=[];return executeCommand({type:"wait"});},
 wait:()=>executeCommand({type:'guard'}), input:handleBattleInput};`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 for (const [label,width,height,reduced] of [['pc',1280,900,false],['mobile',390,844,false],['reduced',390,844,true]].filter(([name])=>!process.env.AKASHIC_LAYOUT || process.env.AKASHIC_LAYOUT===name)) {
  const page = await browser.newPage({ viewport:{width,height}, reducedMotion: reduced?'reduce':'no-preference' });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{navigator.getGamepads=()=>[];});
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',mainHook+'\n document.documentElement.dataset.ndaMainReady="true";')}));
  await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\n'+battleHook}));
  await page.route('**/js/player.js',r=>r.fulfill({contentType:'text/javascript',body:player+'\nwindow.playerQa={queen:startFixedFloorEvent,input:handleOverlayEventInput,prelude:(...args)=>{Object.assign(state,{gridX:4,gridY:3,x:4.5,y:3.5,anim:null});startBossEvent(...args);},read:()=>state.overlayEvent};'}));
  await page.goto('http://127.0.0.1:4173'); await page.waitForFunction(()=>window.akashicQa);
  await page.evaluate(()=>akashicQa.setup());
  for(const index of [0,1]) {
   await page.evaluate(i=>akashicQa.queen(i),index);
   await page.waitForTimeout(300);
   while(await page.evaluate(()=>playerQa.read()?.phase!=='fading')) {
    assert.equal(await page.evaluate(()=>{const e=document.getElementById('message');return e.scrollHeight<=e.clientHeight+1;}),true,'warning fits');
    await page.screenshot({path:join(output,`${label}-queen-${index}-${await page.evaluate(()=>playerQa.read().page)}.png`)});
    await page.evaluate(()=>playerQa.input('confirm'));
   }
   // Repeated input must not cancel the fade or unlock movement early.
   await page.evaluate(()=>{playerQa.input('confirm');playerQa.input('cancel');});
   assert.equal(await page.evaluate(()=>playerQa.read()?.phase),'fading');
   await page.waitForFunction(()=>!playerQa.read());
  }
  await page.evaluate(async()=>{
   akashicQa.unlock(); const {state}=await import('/js/player.js');
   Object.assign(state,{gridX:4,gridY:5,x:4.5,y:5.5,dir:0,angle:-Math.PI/2,anim:null,overlayEvent:null});
   window.phantomDrawFilters=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
    if(img?.src?.includes('boss_18.avif'))window.phantomDrawFilters.push(this.filter);
    return draw.call(this,img,...args);
   };
  });
  await page.waitForFunction(()=>phantomDrawFilters.some(f=>f.includes('brightness(0)')));
  assert.ok(await page.evaluate(()=>phantomDrawFilters.every(f=>f.includes('brightness(0)'))));
  await page.screenshot({path:join(output,`${label}-distant-phantom.png`)});
  await page.evaluate(()=>{akashicQa.unlock();playerQa.prelude('erzdaemonin_phantom_b100f',4,4);});
  await page.waitForTimeout(200);await page.screenshot({path:join(output,label+'-prelude.png')});
  while(await page.evaluate(()=>playerQa.read()?.phase!=='battleStarting')) await page.evaluate(()=>playerQa.input('confirm'));
  await page.waitForFunction(()=>akashicBattle.read().id==='erzdaemonin_phantom_b100f');
  assert.equal(await page.locator('.akashic-magic').count(),1);
  assert.ok(await page.evaluate(()=>{const n=document.getElementById('battleEnemyName').getBoundingClientRect(),r=document.querySelector('.battle-screen').getBoundingClientRect();return n.top>=r.top && n.left>=r.left && n.right<=r.right && n.bottom<=r.bottom;}),'Erz title fits');
  await page.evaluate(()=>akashicBattle.charm());
  assert.equal(await page.locator('#quickCharm').isVisible(),true);
  assert.equal(await page.locator('#quickNameCompact').evaluate(e=>getComputedStyle(e).color),'rgb(255, 133, 187)');
  await page.screenshot({path:join(output,label+'-charm.png')});
  await page.evaluate(()=>{akashicBattle.input('cancel');akashicBattle.input('confirm');});
  await page.waitForFunction(()=>!akashicBattle.read().charmed && akashicBattle.idle(),{},{timeout:15000});
  assert.equal(await page.locator('#quickCharm').isVisible(),false);
  await page.evaluate(()=>akashicBattle.kill()); await page.evaluate(()=>akashicBattle.finish());
  await page.waitForFunction(()=>akashicBattle.read().id==='amayenak_phantom_b100f',{},{timeout:15000});
  assert.ok(await page.evaluate(()=>{const n=document.getElementById('battleEnemyName').getBoundingClientRect(),r=document.querySelector('.battle-screen').getBoundingClientRect();return n.top>=r.top && n.left>=r.left && n.right<=r.right && n.bottom<=r.bottom;}),'Amayenak title fits');
  const state=await page.evaluate(()=>akashicQa.read());assert.ok(state.progress.includes('erzdaemonin_phantom_b100f'));assert.equal(state.boss,'amayenak_phantom_b100f');
  // The save between phases restores the undefeated second phantom.
  const snapshot=await page.evaluate(()=>akashicQa.snapshot());
  await page.evaluate(()=>akashicBattle.apocalypse()); await page.evaluate(()=>akashicBattle.wait());
  await page.screenshot({path:join(output,label+'-battle.png')});
  await page.evaluate(()=>akashicBattle.kill());assert.equal(await page.evaluate(()=>akashicBattle.read().revived),true);
  assert.ok(!await page.evaluate(()=>akashicBattle.read().outcome));
  assert.notEqual(await page.locator('#battleEnemyImage').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.evaluate(()=>akashicBattle.kill());await page.evaluate(()=>akashicBattle.finish());
  const done=await page.evaluate(()=>akashicQa.read());assert.equal(done.flags.achievement_amayenak_phantom_defeated,true);assert.equal(done.boss,null);
  assert.equal(await page.locator('.akashic-magic').count(),0);
  await page.evaluate(s=>akashicQa.restore(s),snapshot);assert.equal((await page.evaluate(()=>akashicQa.read())).boss,'amayenak_phantom_b100f');
  assert.equal(await page.evaluate(()=>akashicBattle.read().id),'amayenak_phantom_b100f');
  if(label==='pc') {
  await page.evaluate(()=>akashicBattle.defeat());await page.evaluate(()=>akashicBattle.finish());
  await page.waitForFunction(()=>akashicQa.location()==='town',{},{timeout:20000});
  assert.equal(await page.locator('.akashic-magic').count(),0);assert.equal(await page.locator('#quickCharm').isVisible(),false);
  await page.waitForFunction(()=>!document.body.classList.contains('scene-transition-active'),{},{timeout:20000});
  await page.evaluate(()=>akashicQa.enter(100));
  assert.deepEqual((await page.evaluate(()=>akashicQa.read())).progress,[]);
  await page.evaluate(()=>akashicQa.unlock());assert.equal((await page.evaluate(()=>akashicQa.read())).boss,'erzdaemonin_phantom_b100f');
  } else await page.evaluate(()=>akashicBattle.close());
  assert.deepEqual(errors,[]);console.log(label+' passed');await page.close();
 }
} finally { await browser.close(); }
console.log(output);
