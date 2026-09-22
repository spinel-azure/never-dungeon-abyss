import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8'),adapter=await readFile('js/battle-skill-presentation.js','utf8');
const hook=`window.spellQa={setup(id){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');
 character=createInitialCharacter({name:'Spell QA',job:'mage'});character.skillIds=[id];character.sp=character.maxSp=200;character.hp=character.maxHp=9999;character.int=30;character.agi=99;character.playerCharge={value:100,cooldown:0};character.deckTutorialSeen=true;
 worldLocation='dungeon';closeCampMenu();closeTown();resetDungeon('',null,true);setBgmOptions({enabled:false});setSeOptions({enabled:false});updateCharacterUi();
 const enemies=[0,1].map(i=>({...createEnemyCombatant(getEnemyById('abyss_rat')),id:'qa_'+i,hp:999999,maxHp:999999,agi:1}));
 startBattle(enemies[0],{playStartSe:false,...(id==='apocalypse'?{enemies}: {})});
}};`;
await mkdir('artifacts/ultimate-spell-effects',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
for(const [label,width,height,touch] of [['pc',1280,900,false],['mobile',390,844,true]]){
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n  document.documentElement.dataset.ndaMainReady = "true";')}));
await page.route('**/js/battle.js',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.battleQa={cast:skillId=>executeCommand({type:"skill",skillId,targetIndex:0}),close:closeBattle};'}));
await page.route('**/js/battle-skill-presentation.js',r=>r.fulfill({contentType:'text/javascript',body:adapter.replace('engine.load(prepareBattleSkillEffect(definition,damage,healing));','engine.load(prepareBattleSkillEffect(definition,damage,healing)); (window.playedEffects ||= []).push({id:definition.id,damage,targetIndex,popup:engine.effect.parts.find(p=>p.type==="popup").text});')}));
await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.spellQa);
for(const id of ['tunguska','apocalypse']){
await page.evaluate(id=>{window.playedEffects=[];spellQa.setup(id);window.castDone=false;battleQa.cast(id).then(()=>window.castDone=true);},id);
await page.waitForFunction(()=>!document.querySelector('#battleSkillEffectCanvas').hidden);await page.waitForTimeout(1200);
const shook=await page.evaluate(()=>[...document.querySelector('#battleScreen').closest('.viewport').children].filter(e=>e.style.translate).length);assert.ok(shook>1,'background and battle surface must shake');
await page.screenshot({path:`artifacts/ultimate-spell-effects/${label}-${id}.png`});
await page.waitForFunction(()=>window.castDone,{},{timeout:45000});
const played=await page.evaluate(()=>window.playedEffects);assert.equal(played.length,id==='apocalypse'?2:1);assert.ok(played.every(e=>e.id===id&&e.damage>0&&e.popup===String(e.damage)));
assert.equal(await page.locator('#battleSkillEffectCanvas').isVisible(),false);assert.equal(await page.evaluate(()=>[...document.querySelector('#battleScreen').closest('.viewport').children].some(e=>e.style.translate)),false);
results.push({label,id,played});await page.evaluate(()=>battleQa.close());
}
await page.evaluate(()=>{spellQa.setup('apocalypse');window.castDone=false;battleQa.cast('apocalypse').then(()=>window.castDone=true);});
await page.waitForFunction(()=>!document.querySelector('#battleSkillEffectCanvas').hidden);await page.waitForTimeout(2800);await page.evaluate(()=>battleQa.close());
await page.waitForFunction(()=>window.castDone);
assert.equal(await page.locator('#battleSkillEffectCanvas').isVisible(),false);
assert.equal(await page.evaluate(()=>[...document.querySelector('#battleScreen').closest('.viewport').children].some(e=>e.style.translate)),false);
assert.deepEqual(errors,[]);await context.close();
}
await writeFile('artifacts/ultimate-spell-effects/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
