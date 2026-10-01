import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=await mkdtemp(join(tmpdir(),'nda-battle-result-'));
const [main,battle,presentation]=await Promise.all(['js/main.js','js/battle.js','js/battle-skill-presentation.js'].map(p=>readFile(p,'utf8')));
const setup=`window.timingQa={sp:()=>character.sp,setup(){document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');character=createInitialCharacter({name:'QA',job:'mage'});character.hp=character.maxHp=9999;character.sp=character.maxSp=999;worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();},start(){const e={...createEnemyCombatant(getEnemyById('will_o_wisp')),isBoss:true,hp:10000,maxHp:10000,actions:[{weight:1,action:{actionType:'physicalAttack',name:'先制テスト',unavoidable:true,powerMultiplier:0.01,speedModifier:9999}}]};startBattle(e,{playStartSe:false});}};`;
const hook=`window.timingBattle={close:closeBattle,cast(){battleUi.battle.player.skillIds.push('call_goddess_name');battleUi.battle.player.playerCharge={value:100,cooldown:0};void executeCommand({type:'skill',skillId:'call_goddess_name'});},read(){return {hp:battleUi.presentationHp?.enemy??battleUi.battle.enemy.hp,finalHp:battleUi.battle.enemy.hp,message:battleUi.messageEl.textContent,presenting:battleUi.presenting,sp:battleUi.presentationSp,finalSp:battleUi.battle.player.sp,events:battleUi.battle.presentationEvents,meter:document.querySelector('#battleBossHpMeter').getAttribute('aria-valuenow'),numbers:[...document.querySelectorAll('#battleEnemyNumbers .battle-number')].map(n=>n.textContent)};}};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]) {
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{navigator.getGamepads=()=>[];});
    await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',setup+'\n document.documentElement.dataset.ndaMainReady = "true";')}));
    await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\n'+hook}));
    await page.route('**/js/battle-skill-presentation.js',r=>r.fulfill({contentType:'text/javascript',body:presentation.replace('engine.load(prepared);','engine.load(prepared);window.timingEngine=engine;').replace('await engine.play();','await engine.play({speed:4});')}));
    await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.timingQa);
    await page.evaluate(()=>{timingQa.setup();timingQa.start();timingBattle.cast();});
    const selected=await page.evaluate(()=>({state:timingBattle.read(),sp:timingQa.sp()}));
    assert.equal(selected.sp,999);assert.equal(selected.state.sp,999);
    assert.equal(selected.state.meter,'100');assert.deepEqual(selected.state.numbers,[]);
    await page.waitForFunction(()=>window.timingEngine?.time>500).catch(async error=>{console.log(await page.evaluate(()=>({state:timingBattle.read(),engine:window.timingEngine?.time,sp:timingQa.sp()})),errors);throw error;});
    assert.equal(await page.evaluate(()=>timingQa.sp()),899);
    assert.equal(await page.evaluate(()=>timingBattle.read().sp),899);
    await page.waitForFunction(()=>timingEngine.time>=20550);
    const during=await page.evaluate(()=>timingBattle.read());
    assert.equal(during.hp,10000);assert.equal(during.meter,'100');
    assert.deepEqual(during.numbers,[]);assert.doesNotMatch(during.message,/ダメージ|会心/);
    await page.screenshot({path:join(output,label+'-before-result.png')});
    await page.waitForFunction(()=>timingBattle.read().numbers.length===1);
    const impact=await page.evaluate(()=>({state:timingBattle.read(),time:timingEngine.time,duration:timingEngine.effect.duration}));
    assert.equal(impact.time,impact.duration);
    assert.equal(impact.state.hp,impact.state.finalHp);assert.ok(Number(impact.state.meter)<100);
    assert.match(impact.state.message,/ダメージ/);
    assert.ok(impact.state.message.includes(impact.state.numbers[0]));
    await page.screenshot({path:join(output,label+'-result.png')});
    await page.waitForFunction(()=>!timingBattle.read().presenting);
    assert.equal(await page.evaluate(()=>timingQa.sp()),899);
    // Closing during an enemy action must not let the old round alter a new battle.
    await page.evaluate(()=>{timingBattle.close();timingQa.setup();timingQa.start();timingBattle.cast();timingBattle.close();timingQa.setup();timingQa.start();});
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(()=>timingQa.sp()),999);
    assert.equal(await page.evaluate(()=>timingBattle.read().meter),'100');
    assert.deepEqual(errors,[]);await page.close();console.log(label+' result/SP timing passed');
  }
} finally {await browser.close();}
console.log(output);
