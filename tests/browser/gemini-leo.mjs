import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8');
const hook=`window.zqa=async()=>{document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');closeTown();worldLocation='dungeon';currentDepth=18;firstDungeonTutorialActive=false;deckTutorialActive=false;character=createInitialCharacter({name:'カード確認',job:'mage'});character.hp=25;character.maxHp=100;character.sp=character.maxSp=500;character.cards.deckSlots=['zodiac_gemini','zodiac_leo'];character.skillIds.push('fireball');setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();beginBossBattle('wassermannfrau_b18f');};`;
await mkdir('artifacts/gemini-leo',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height},hasTouch:label==='mobile'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.zbattle={state:()=>battleUi.battle,use:executeCommand,idle:()=>!battleUi.presenting};'}));
  await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.zqa);await page.evaluate(()=>zqa());await page.waitForFunction(()=>zbattle.state()&&zbattle.idle());
  await page.evaluate(()=>{const b=zbattle.state();b.enemy.id='qa';b.enemy.name='試験用の敵';b.enemy.bossMagicBarrier=0;b.enemy.actions=[{weight:1,action:{id:'wait',actionType:'wait'}}];});
  for(let i=0;i<2;i++) {
    await page.evaluate(()=>{void zbattle.use({type:'skill',skillId:'fireball'});});await page.waitForFunction(()=>zbattle.idle());
    assert.equal(await page.evaluate(()=>zbattle.state().presentationEvents.filter(e=>e.type==='attackHit'&&e.actorSide==='player').length),2);
  }
  await page.screenshot({path:`artifacts/gemini-leo/${label}-gemini.png`});
  await page.evaluate(()=>{void zbattle.use({type:'attack'});});await page.waitForFunction(()=>zbattle.idle());
  assert.equal(await page.evaluate(()=>zbattle.state().player.hp),22);
  assert.ok((await page.locator('#message').textContent()).includes('HPを3消費'));
  await page.screenshot({path:`artifacts/gemini-leo/${label}-leo.png`});
  assert.deepEqual(errors,[]);console.log(label+' Gemini repeat and Leo HP display passed');await page.close();
}} finally {await browser.close();}
