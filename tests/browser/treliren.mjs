import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8');
const hook=`window.tQa={
 setup(repeat=false){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'探索確認',job:'mage'});
 character.eventFlags.tavern_rumor_017_base_read=true;character.eventFlags.treliren_met=repeat;
 character.highestDungeonDepthReached=10;character.trelirenRun={floors:{10:10},phase:-1};
 currentDepth=10;worldLocation='dungeon';closeTown();setBgmOptions({enabled:false});setSeOptions({enabled:false});
 resetDungeon('',null,true);updateCharacterUi();setPlayerInputEnabled(true);
 },
 preview50(){character.trelirenRun={floors:{50:50},phase:-1};currentDepth=50;resetDungeon('',null,false);},
 async approach(){
 const {getRoamingEnemyNeighbors}=await import('/js/roaming-enemies.js');
 const npc=getActiveRoamingEnemy(),n=getRoamingEnemyNeighbors(cells,npc.x,npc.y)[0];
 state.gridX=n.x;state.gridY=n.y;state.x=n.x+.5;state.y=n.y+.5;
 state.dir=DIRS.findIndex(d=>n.x+d.dx===npc.x&&n.y+d.dy===npc.y);state.angle=DIRS[state.dir].angle;
 explored[npc.y][npc.x]=true;explored[n.y][n.x]=true;updateHud();
 },
 detection(mode){character.cards.deckSlots=mode==='set'?['common_person_detection']:[];character.keyItems=mode==='tiara'?grantKeyItem({},'queen_tiara').keyItems:mode==='medal'?grantKeyItem({},'royal_cat_medal').keyItems:{};character.eventFlags.royal_cat_medal_awarded=mode==='flag';character.cards.ownedCardIds=['common_person_detection'];window.hatDraws=0;},
 walk:()=>manualMove(1),
 contact(){const npc=getActiveRoamingEnemy();state.gridX=npc.x;state.gridY=npc.y;state.x=npc.x+.5;state.y=npc.y+.5;resolveRoamingEnemyForcedMovementContact({x:npc.x,y:npc.y});},
 input:handleOverlayEventInput,
 status:()=>({run:character.trelirenRun,flags:character.eventFlags,count:character.inventory.counts.warding_incense||0,event:state.overlayEvent?.type,npc:serializeRoamingEnemyState()}),
 snapshot:makeSaveSnapshot,load:restoreGame,
 use:()=>useFieldItem('warding_incense'),presence:()=>getPresence(),
 addPresence:async()=>{const p=await import('/js/presence.js');p.addPresence(20);},
 floor:d=>{currentDepth=d;resetDungeon('',null,false);},return:()=>returnToTown(),
 region:()=>character.incenseZone
};`;
await mkdir('artifacts/treliren-controls',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const [label,width,height,touch]of[['pc',1280,900,false],['mobile',390,844,true],['small',320,720,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  // Keep the user's connected controller from steering the automated test.
  navigator.getGamepads=()=>[];
  const fill=CanvasRenderingContext2D.prototype.fillText;window.hatDraws=0;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(text==='👒')window.hatDraws++;return fill.call(this,text,...args);};
  const original=CanvasRenderingContext2D.prototype.drawImage;window.portraitDraws=[];
  CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
   if(/NPC_27[cd]\.avif/.test(img?.src||''))window.portraitDraws.push({src:img.src,args,w:this.canvas.width,h:this.canvas.height});
   return original.call(this,img,...args);
  };
 });
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
 await page.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.tQa);
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>tQa.setup());
 for(const mode of ['none','flag','set','tiara','medal']){
  await page.evaluate(mode=>tQa.detection(mode),mode);await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>hatDraws>0),['set','tiara','medal'].includes(mode),mode);
 }
 await page.screenshot({path:`artifacts/treliren-controls/${label}-unexplored-hat.png`});
 await page.evaluate(()=>tQa.approach());await page.waitForTimeout(700);await page.screenshot({path:`artifacts/treliren-controls/${label}-exploration.png`});await page.evaluate(()=>tQa.walk());await page.waitForSelector('.town-talk-hint');
 assert.equal((await page.evaluate(()=>tQa.status())).event,'trelirenTalk');
 await page.evaluate(()=>tQa.input('cancel'));await page.waitForTimeout(250);
 assert.equal((await page.evaluate(()=>tQa.status())).npc.status,'active');
 assert.equal((await page.evaluate(()=>tQa.status())).run.encountered,false);
 assert.equal((await page.evaluate(()=>tQa.status())).event,undefined);
 await page.evaluate(()=>tQa.contact());
 await page.waitForFunction(()=>portraitDraws.length>0);
 let rewardSave=null,steps=0;
 while((await page.evaluate(()=>tQa.status())).event==='trelirenTalk'&&steps++<45){
  const status=await page.evaluate(()=>tQa.status());
  if(status.run.phase===3&&!rewardSave){
   assert.equal(await page.locator('#itemGetEffect').evaluate(el=>el.hidden),false);
   assert.equal(await page.locator('.town-talk-body').textContent(),'');
   await page.waitForFunction(()=>document.querySelector('.town-talk-hint')?.textContent.includes('A'));
   assert.equal(await page.locator('.town-talk-body').textContent(),'「魔除けのお香」を手に入れた！');
   rewardSave=await page.evaluate(()=>tQa.snapshot());
   assert.equal((await page.evaluate(()=>tQa.status())).count,1);
   await page.evaluate(s=>tQa.load(s),rewardSave);
   await page.evaluate(()=>tQa.input('cancel'));await page.waitForTimeout(250);
   assert.equal((await page.evaluate(()=>tQa.status())).npc.status,'active');
   await page.evaluate(()=>tQa.contact());
   await page.waitForSelector('.town-talk-hint');
   assert.equal((await page.evaluate(()=>tQa.status())).count,1);
  }
  await page.waitForFunction(()=>document.querySelector('.town-talk-hint')?.textContent.includes('A'));
  const fits=await page.evaluate(()=>{const b=document.querySelector('.town-talk-body'),h=document.querySelector('.town-talk-hint');return b.scrollHeight<=b.clientHeight+1&&h.getBoundingClientRect().bottom<=b.parentElement.getBoundingClientRect().bottom;});assert.equal(fits,true);
  if(steps===1)await page.screenshot({path:`artifacts/treliren-controls/${label}-first.png`});
  await (touch?page.locator('#buttonA').tap():page.keyboard.press('KeyX'));
  await page.waitForTimeout(80);
  if(status.run.phase===4)await page.waitForTimeout(520);
 }
 let status=await page.evaluate(()=>tQa.status());assert.equal(status.run.encountered,true);assert.equal(status.flags.treliren_met,true);assert.equal(status.count,1);
 const frames=await page.evaluate(()=>portraitDraws);assert.ok(frames.every(f=>{const[x,y,w,h]=f.args;return y>=-.1&&Math.abs(y+h-f.h)<.1&&w<=f.w+.1;}));
 await page.evaluate(()=>tQa.floor(20));assert.equal((await page.evaluate(()=>tQa.status())).npc,null);
 await page.evaluate(()=>tQa.floor(10));assert.equal((await page.evaluate(()=>tQa.status())).npc,null);
 await page.evaluate(()=>tQa.addPresence());const before=await page.evaluate(()=>tQa.presence());
 assert.equal((await page.evaluate(()=>tQa.use())).accepted,true);
 await page.evaluate(()=>tQa.addPresence());assert.equal(await page.evaluate(()=>tQa.presence()),before);
 assert.equal((await page.evaluate(()=>tQa.use())).accepted,false);
 await page.evaluate(()=>tQa.floor(11));assert.ok(await page.evaluate(()=>tQa.region()));
 await page.evaluate(()=>tQa.floor(20));assert.equal(await page.evaluate(()=>tQa.region()),undefined);
 await page.evaluate(()=>tQa.return());assert.equal((await page.evaluate(()=>tQa.status())).run.encountered,false);
 await page.evaluate(()=>{tQa.setup(true);tQa.contact();});await page.waitForFunction(()=>portraitDraws.some(f=>f.src.includes('NPC_27d.avif')));
 await page.screenshot({path:`artifacts/treliren-controls/${label}-repeat.png`});
 await page.evaluate(()=>tQa.return());await page.waitForTimeout(550);
 assert.equal(await page.locator('.town-compact-talk').count(),0);
 await page.evaluate(()=>{tQa.setup();tQa.preview50();});await page.evaluate(()=>tQa.approach());await page.waitForTimeout(400);
 await page.screenshot({path:`artifacts/treliren-controls/${label}-b50-full-body.png`});
 assert.deepEqual(errors,[]);results.push({label,steps,portraitFrames:frames.length});await page.close();
}await writeFile('artifacts/treliren-controls/results.json',JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}
