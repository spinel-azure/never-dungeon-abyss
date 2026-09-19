import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8');
const hook=`window.lqa={setup:()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=1;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'獅子の試練',job:'mage'});character.hp=character.maxHp=10000;character.sp=character.maxSp=1000;character.skillIds.push('lightning_bolt');setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},character:()=>character,access:()=>getCurrentSpecialDoorAccessBlock(),start:()=>beginBossBattle('loewenkoenigin_b1f')};`;
await mkdir('artifacts/lion-queen',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844],['small',320,720]]) {
  if(process.env.LION_QA_PC_ONLY && label!=='pc')continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:label!=='pc'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.lb={state:()=>battleUi.battle,use:executeCommand,idle:()=>!battleUi.presenting,escape:attemptEscape,finish:finishBattle};'}));
  await page.route('**/js/audio.js',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/audio.js','utf8')).replace('export async function playSeToEnd(key) {','export async function playSeToEnd(key) { (window.lsounds ||= []).push(key);')}));
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.lqa);
  await page.evaluate(async()=>{lqa.setup();window.lp=await import('/js/player.js');});
  assert.equal(await page.evaluate(()=>lqa.access().sealed),true);
  await page.evaluate(()=>lp.startBossEvent('loewenkoenigin_b1f',1,1));
  await page.waitForTimeout(600);await page.screenshot({path:`artifacts/lion-queen/${label}-intro.png`});
  await page.evaluate(()=>{lp.handleOverlayEventInput('confirm');lp.handleOverlayEventInput('confirm');});
  await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>lp.state.overlayEvent.phase),'challenge');
  await page.waitForFunction(()=>lb.state()?.enemy.id==='loewenkoenigin_b1f');
  await page.waitForFunction(()=>lb.idle());await page.waitForTimeout(300);
  assert.ok((await page.locator('#battleEnemyImage').getAttribute('src')).endsWith('boss_27.avif'));
  await page.screenshot({path:`artifacts/lion-queen/${label}-form1.png`});
  const fits=await page.evaluate(()=>{
    const frame=document.querySelector('#battleScreen').getBoundingClientRect();
    return ['battleEnemyName','battleBossHpMeter'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom&&e.scrollWidth<=e.clientWidth+1;});
  });assert.ok(fits,label+': boss UI fits');
  for(const [hp,phase,file] of [[50001,2,'boss_27b.avif'],[25001,3,'boss_27c.avif']]) {
    if(phase===3)await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(hp=>{lb.state().enemy.hp=hp;Math.random=()=>.2;void lb.use({type:'skill',skillId:'lightning_bolt'});},hp);
    if(phase===2) {
      await page.locator('.lion-phase-layer').waitFor({state:'attached'});
      assert.ok((await page.locator('#battleEnemyImage').getAttribute('src')).endsWith('boss_27.avif'));
      await page.screenshot({path:`artifacts/lion-queen/${label}-transition.png`});
    }
    await page.waitForFunction(()=>lb.idle());
    assert.equal(await page.locator('.lion-phase-layer').count(),0);
    assert.equal(await page.evaluate(()=>lb.state().enemy.lionPhase),phase);
    assert.ok((await page.locator('#battleEnemyImage').getAttribute('src')).endsWith(file));
    await page.screenshot({path:`artifacts/lion-queen/${label}-form${phase}.png`});
  }
  await page.evaluate(()=>{lb.escape();lb.finish();});
  assert.ok(!await page.evaluate(()=>lqa.character().eventFlags.boss_loewenkoenigin_b1f_defeated));
  await page.evaluate(()=>lqa.start());await page.waitForFunction(()=>lb.idle());
  assert.equal(await page.evaluate(()=>lb.state().enemy.hp),100000);
  await page.evaluate(()=>{lb.state().enemy.hp=1;void lb.use({type:'skill',skillId:'lightning_bolt'});});
  await page.waitForFunction(()=>lb.idle());assert.equal(await page.evaluate(()=>lb.state().outcome),'victory');
  await page.evaluate(()=>lb.finish());await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='victory');
  assert.equal(await page.evaluate(()=>lqa.character().cards.ownedCardCounts.zodiac_leo),1);
  await page.waitForTimeout(500);await page.screenshot({path:`artifacts/lion-queen/${label}-victory.png`});
  await page.evaluate(()=>{window.lsounds=[];lp.handleOverlayEventInput('confirm');});
  await page.waitForFunction(()=>document.querySelector('#cardGetEffect')?.hidden===false);
  await page.screenshot({path:`artifacts/lion-queen/${label}-reward.png`});
  await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='acquired');
  assert.deepEqual(await page.evaluate(()=>lsounds),['itemGet','importantItem']);
  await page.evaluate(()=>lp.handleOverlayEventInput('confirm'));await page.waitForFunction(()=>lp.state.overlayEvent?.phase==='gone');
  await page.screenshot({path:`artifacts/lion-queen/${label}-farewell.png`});
  await page.evaluate(()=>lp.handleOverlayEventInput('confirm'));assert.equal(await page.evaluate(()=>lp.state.overlayEvent),null);
  assert.equal(await page.evaluate(()=>lqa.access().sealed),true);assert.deepEqual(errors,[]);
  console.log(label+': sealed entrance, intro, forms, escape/retry, reward/audio/farewell passed');await page.close();
}}finally{await browser.close();}
