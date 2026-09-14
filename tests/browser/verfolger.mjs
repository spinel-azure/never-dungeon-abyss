import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.VERFOLGER_TEST_URL||'http://127.0.0.1:4179';
const out=path.resolve('artifacts/verfolger-effects');await mkdir(out,{recursive:true});
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const town=await readFile(new URL('../../js/town.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const renderer=await readFile(new URL('../../js/renderer.js',import.meta.url),'utf8');
const audio=await readFile(new URL('../../js/audio.js',import.meta.url),'utf8');
const hook=`window.vqa={
 setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'VERFOLGER QA',job:'priest'});character.level=100;character=normalizeCharacter(character);character.lootBagTutorialSeen=true;saveEnabled=true;currentDepth=90;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},
 state:()=>structuredClone(character),map:()=>serializeRoamingEnemyState(),
 near(){const e=getActiveRoamingEnemy();for(const row of cells)for(const c of row){if(c.type!=='floor'||c.reserved||c.treasure)continue;for(let dir=0;dir<DIRS.length;dir++){const d=DIRS[dir],n=cells[c.y+d.dy]?.[c.x+d.dx];if(!n||n.type!=='floor'||c.walls[d.key]||c.doors?.[d.key]||n.reserved||n.treasure)continue;state.gridX=c.x;state.gridY=c.y;state.x=c.x+.5;state.y=c.y+.5;state.dir=dir;state.angle=d.angle;state.anim=null;e.x=n.x;e.y=n.y;e.transition=null;state.torchFuel=100;return;}}throw Error('no corridor');},
 contact(){const e=getActiveRoamingEnemy();state.gridX=e.x;state.gridY=e.y;state.x=e.x+.5;state.y=e.y+.5;return resolveRoamingEnemyPlayerStep({x:e.x,y:e.y,now:performance.now()});},
 confirm:()=>handleOverlayEventInput('confirm'), action:handleBattleInput,
 overlay:()=>structuredClone(state.overlayEvent),save:saveGame,load:()=>continueGame('auto'),
 descend:descendFloor,
 regenerate(depth){currentDepth=depth;resetDungeon('',null,true);},
 async rumorSetup({defeated,rumorId}){character=createInitialCharacter({name:'RUMOR QA',job:'priest'});character.highestDungeonDepthReached=90;if(rumorId==='rumor_015')character.quests.active.guild_027={progress:0};if(defeated){if(rumorId==='rumor_013')character=recordVerfolgerDefeat(character,90);else if(rumorId==='rumor_015'){character.eventFlags.johanna_cat_borrow_transition=true;character.eventFlags.sphinx_b69f_peaceful=true;}else character.keyItems={owned:{lichtbringer:{acquiredAt:1,count:1}},acquisitionOrder:['lichtbringer']};}const {getUnreadTavernRumors,markTavernRumorRead}=await import('/data/tavern-rumors.js');for(const r of getUnreadTavernRumors(character))if(r.rumorId!==rumorId)character=markTavernRumorRead(character,r);worldLocation='town';closeCampMenu();openTown({facilityId:'tavern',mode:'facilityMenu'});},
 replay:snapshot=>finishBattleVictory(snapshot)
};`;
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.vDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(String(image?.src||'').endsWith('NPC_event_27.avif'))window.vDraws.push({h:args.at(-1),canvasH:this.canvas.height});return draw.call(this,image,...args);};});
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/renderer.js',r=>r.fulfill({contentType:'text/javascript',body:renderer+'\nwindow.vImage=()=>renderer.characterImages.get("verfolger_revealed")?.complete;window.vRender=()=>({state:renderer.state,roam:renderer.getRoamingEnemyRenderState(),visible: isSpriteCellVisible(1,1)});'}));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:town+'\nwindow.vTown={service:activateFacilityService,input:handleTownInput,state:()=>({mode:town.mode,index:town.rumorDialogueIndex,typing:townTypewriter.active,text:townTypewriter.typingText,message:town.messageEl.textContent})};'}));
 await page.route('**/js/audio.js',r=>r.fulfill({contentType:'text/javascript',body:audio+'\nwindow.vBgm=()=>({key:audio.desiredBgmKey,url:audio.bgmUrls.get(audio.desiredBgmKey)});'}));
 await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.vbattle={state:()=>structuredClone(battleUi.battle),idle:()=>!battleUi.presenting,reveal(){battleUi.concealed=false;renderBattle();},escape:attemptEscape,snapshot:()=>createBattleCompletionSnapshot(battleUi.battle),weaken(){battleUi.battle.enemy.hp=1;battleUi.battle.enemy.stats.agi=0;battleUi.battle.player.hp=battleUi.battle.player.maxHp;}};`}));
 await page.goto(origin);await page.waitForFunction(()=>window.vqa);await page.evaluate(()=>{vqa.setup();vqa.save();vqa.load();vqa.near();});
 assert.equal((await page.evaluate(()=>vBgm())).key,'verfolgerPresence');
 await page.waitForFunction(()=>vDraws.length>0);const draw=await page.evaluate(()=>vDraws.at(-1));assert.ok(draw.h/draw.canvasH<=.601);assert.ok(draw.h/draw.canvasH>=.5);
 await page.screenshot({path:path.join(out,label+'-exploration.png')});
 assert.equal((await page.evaluate(()=>vqa.contact())).handled,true);await page.waitForFunction(()=>vqa.overlay()?.type==='roamingEncounter');
 assert.equal((await page.evaluate(()=>vqa.overlay())).image,'images/bosses/boss_22b.avif');
 await page.waitForFunction(()=>vImage());
 await page.evaluate(()=>vqa.confirm());assert.equal(await page.evaluate(()=>Boolean(vbattle.state())),false);
 await page.screenshot({path:path.join(out,label+'-reveal-start.png')});
 await page.waitForFunction(()=>vqa.overlay()&&performance.now()-vqa.overlay().revealStartedAt>=850);
 await page.screenshot({path:path.join(out,label+'-reveal-mid.png')});
 await page.waitForFunction(()=>vqa.overlay()?.revealComplete);
 await page.screenshot({path:path.join(out,label+'-contact.png')});
 if(touch){await page.locator('#buttonA').tap();}else await page.evaluate(()=>vqa.confirm());
 await page.waitForFunction(()=>vbattle.state()?.enemy?.id==='verfolger'&&vbattle.idle());
 assert.match((await page.evaluate(()=>vBgm())).url,/battle-of-galfer.mp3$/);
 await page.evaluate(()=>vbattle.reveal());
 await page.waitForFunction(()=>{const c=document.querySelector('.battle-enemy-ambient-front');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});
 await page.screenshot({path:path.join(out,label+'-battle.png')});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>{const c=document.querySelector('.battle-enemy-ambient-front');return c&&!c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>vbattle.escape());assert.equal((await page.evaluate(()=>vbattle.state())).outcome,'escaped');await page.evaluate(()=>vqa.action('confirm'));
 assert.equal((await page.evaluate(()=>vBgm())).key,'verfolgerPresence');assert.match((await page.evaluate(()=>vBgm())).url,/chikayoru-mugai-kiki.mp3$/);assert.equal((await page.evaluate(()=>vqa.map())).status,'active');
 assert.equal(await page.locator('.battle-enemy-ambient').count(),0);
 await page.evaluate(()=>vqa.contact());await page.waitForFunction(()=>vqa.overlay()?.revealComplete);await page.evaluate(()=>vqa.confirm());await page.waitForFunction(()=>vbattle.state()?.enemy?.id==='verfolger'&&vbattle.idle());
 assert.equal((await page.evaluate(()=>vbattle.state())).enemy.hp,12000);
 await page.evaluate(()=>{vbattle.weaken();window.vRandom=Math.random;Math.random=()=>.1;vqa.action('confirm');});
 await page.waitForFunction(()=>vbattle.state()?.outcome==='victory'&&vbattle.idle());
 const snapshot=await page.evaluate(()=>vbattle.snapshot());await page.evaluate(()=>{Math.random=window.vRandom;vqa.action('confirm');});
 assert.equal((await page.evaluate(()=>vBgm())).key,'dungeon');
 const c=await page.evaluate(()=>vqa.state());assert.equal(c.eventFlags.achievement_verfolger_defeated,true);assert.equal(c.eventFlags.verfolger_b90_defeated,true);assert.equal(c.lootBag.gold,0);assert.deepEqual(c.lootBag.items,{});assert.deepEqual(c.lootBag.cards,{});assert.equal(c.lootBag.equipmentInstances.length,0);
 assert.ok((await page.locator('body').innerText()).includes('フェルフォルガーは「ギャギャッ！」と耳障りな叫び声を上げながら姿を消した…。'));
 await page.screenshot({path:path.join(out,label+'-victory.png')});
 await page.evaluate(snapshot=>vqa.replay(snapshot),snapshot);const replayed=await page.evaluate(()=>vqa.state());replayed.adventureStats.playTimeSeconds=c.adventureStats.playTimeSeconds;assert.deepEqual(replayed,c);
 await page.evaluate(()=>{vqa.save();vqa.load();});assert.equal((await page.evaluate(()=>vqa.map())).status,'defeated');
 await page.evaluate(()=>vqa.regenerate(90));assert.equal(await page.evaluate(()=>vqa.map()),null);
 await page.evaluate(()=>vqa.descend());assert.equal((await page.evaluate(()=>vBgm())).key,'verfolgerPresence');assert.equal((await page.evaluate(()=>vqa.map())).status,'active');
 await page.evaluate(()=>{vqa.regenerate(99);vqa.save();vqa.load();});assert.equal((await page.evaluate(()=>vBgm())).key,'dungeon');assert.equal(await page.evaluate(()=>vqa.map()),null);
 for(const rumorId of ['rumor_013','rumor_014','rumor_015'])for(const defeated of [false,true]){
  await page.evaluate(args=>vqa.rumorSetup(args),{defeated,rumorId});await page.evaluate(()=>vTown.service('rumors'));
  for(let index=0;index<(defeated?4:3);index++){
   await page.waitForFunction(()=>vTown.state().typing);const t=await page.evaluate(()=>vTown.state());assert.equal(t.index,index);
   if(index===1&&rumorId==='rumor_013')assert.equal(t.text,'ああ。もしも出会っちまったら、「逃げる」のもアリかもな！');
   const flag='tavern_'+rumorId+'_'+(defeated?(rumorId==='rumor_013'?'defeated':rumorId==='rumor_014'?'lichtbringer':'solved'):'base')+'_read';assert.equal(Boolean((await page.evaluate(()=>vqa.state())).eventFlags[flag]),false);
   await page.evaluate(()=>vTown.input('confirm'));await page.waitForFunction(()=>!vTown.state().typing);
   if(index===(defeated?3:2))await page.screenshot({path:path.join(out,label+'-'+rumorId+(defeated?'-followup.png':'-base.png'))});
   await page.evaluate(()=>vTown.input('confirm'));
  }
  const c=await page.evaluate(()=>vqa.state());assert.equal(c.eventFlags['tavern_'+rumorId+'_'+(defeated?(rumorId==='rumor_013'?'defeated':rumorId==='rumor_014'?'lichtbringer':'solved'):'base')+'_read'],true);
  await page.evaluate(()=>vTown.service('past-rumors'));assert.ok((await page.locator('body').innerText()).includes(rumorId==='rumor_013'?'暗闇から忍び寄る追跡者の噂':rumorId==='rumor_014'?'「光もたらすもの」の噂':'ヨハンナの愛猫の噂'));
 }
 assert.deepEqual(errors,[]);results.push({label,draw,bgm:'battle-of-galfer.mp3',presenceBgm:'chikayoru-mugai-kiki.mp3',reveal:true,blood:true,reducedMotion:true,escape:true,victory:true,save:true,noRespawn:true,rumorBase:true,rumorFollowup:true,rumorHistory:true,errors});await context.close();
}await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();}