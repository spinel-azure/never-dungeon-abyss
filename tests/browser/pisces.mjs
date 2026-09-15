import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
const battle=await readFile(new URL('../../js/battle.js',import.meta.url),'utf8');
const hook=`window.piscesQa={async setup(){
document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active','menu-open');
closeTown();worldLocation='dungeon';firstDungeonTutorialActive=false;deckTutorialActive=false;
character=normalizeCharacter({...createInitialCharacter({name:'双魚テスト',job:'warrior'}),level:197});
character.hp=7;character.maxHp=101;character.sp=37;character.maxSp=100;character.cards.deckSlots=['zodiac_pisces'];
setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
const {createEnemyCombatant,getEnemyById}=await import('/data/enemies.js');
const enemy=createEnemyCombatant(getEnemyById('abyss_rat'));enemy.hp=enemy.maxHp=999999;
enemy.actions=[{weight:1,action:{id:'qa',name:'連続攻撃',actionType:'physicalAttack',unavoidable:true,powerPerHit:1000,hitCount:3,speedModifier:999}}];
startBattle(enemy,{playStartSe:false});}};`;
await mkdir('artifacts/pisces',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:label==='mobile'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
  await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.piscesBattle={use:executeCommand,idle:()=>!battleUi.presenting,state:()=>battleUi.battle,diag:()=>({active:battleUi.active,presenting:battleUi.presenting,mode:battleUi.mode,index:battleUi.selectedIndex,body:document.body.className,message:document.querySelector("#message").textContent,turn:battleUi.battle.turn})};`}));
  await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>window.piscesQa);
  await page.evaluate(()=>piscesQa.setup());
  await page.evaluate(()=>{window.messages=[];new MutationObserver(()=>messages.push(document.querySelector('#message').textContent)).observe(document.querySelector('#message'),{childList:true,subtree:true,characterData:true});void piscesBattle.use({type:'wait'});});
  await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('双魚の加護が、消えかけた命を繋ぎ止めた！'));
  await page.screenshot({path:`artifacts/pisces/${label}-revival.png`});
  await page.waitForFunction(()=>piscesBattle.idle());
  let state=await page.evaluate(()=>({hp:piscesBattle.state().player.hp,max:piscesBattle.state().player.maxHp,sp:piscesBattle.state().player.sp,outcome:piscesBattle.state().outcome,condition:document.querySelector('#piscesStatus').textContent,turn:piscesBattle.state().turn}));
  assert.equal(state.hp,Math.floor(state.max*.5));assert.equal(state.sp,37);assert.equal(state.outcome,null);assert.equal(state.turn,2);assert.match(state.condition,/完全無敵/);
  await page.screenshot({path:`artifacts/pisces/${label}-command.png`});
  const guard=page.locator('#dungeonCommands button').filter({hasText:'防御'});
  if(label==='mobile')await guard.tap();else await guard.evaluate(button=>button.click());

  await page.waitForFunction(()=>piscesBattle.idle() && piscesBattle.state().turn===3, null, {timeout:10000});
  assert.equal(await page.evaluate(()=>piscesBattle.state().player.hp),state.hp);
  assert.equal(await page.locator('#piscesStatus').isVisible(),false);
  assert.deepEqual(errors,[]);console.log(label+' passed: revival, HP, immunity, next command and expiry');
  await context.close();
 }
} finally {await browser.close();}
