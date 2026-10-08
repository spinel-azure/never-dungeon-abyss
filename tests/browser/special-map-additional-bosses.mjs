import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {encodeMapCode} from '../../data/special-map-code.js';
import {selectNormalMapBoss} from '../../data/karte-normal-bosses.js';
import {generateSpecialMapV2} from '../../js/special-map/generator-v2.js';
import {bossTestCharacter} from '../../tools/simulate-map-bosses.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const output='artifacts/additional-bosses';await mkdir(output,{recursive:true});
const source=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};
vm.runInNewContext(source.slice(source.indexOf('const baseHook='),source.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const fixtures=new Map();
for(let seed=0;seed<2000&&fixtures.size<7;seed++){
 const map={rulesetVersion:'special-map-v2',seed,level:100,rarity:'WHITE',discovererName:'QA'};
 const themeId=generateSpecialMapV2({...map,ruleset:map.rulesetVersion}).themeId;
 const boss=selectNormalMapBoss({...map,themeId});
 if(Number(boss.id.slice(-3))>=18&&!fixtures.has(boss.id))fixtures.set(boss.id,{map,boss});
}
assert.equal(fixtures.size,7);
const extra=`window.newBossQa={active:isBattleActive,input:handleBattleInput,c:()=>character,
 prepare(c){const maps=character.specialMaps;maps.starterMapsTestGranted=true;maps.registered[0].surveyedMasks=Array(3).fill('f'.repeat(25));
 character={...c,specialMaps:maps,lootBagTutorialSeen:true,eventFlags:{...c.eventFlags,treliren_met:true}};character.cards.deckSlots=['zodiac_aries'];updateCharacterUi();setBattleSpeedMode('fast');saveGame();},
 boss(){const s=v2Qa.s();s.onEncounterStep=()=>false;s.renderState.overlayEvent=null;s.cellPrompt=null;s.currentFloor=2;s.bossKeyFound=s.bossDoorUnlocked=true;const p=s.generatedMap.bossRoom.bossCell;s.playerX=p.x;s.playerY=p.y;s.onBossCell();}
};`;
const main=await readFile('js/main.js','utf8'),battle=await readFile('js/battle.js','utf8'),title=await readFile('js/title-screen.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const width of [1280,390])for(const [id,{map,boss}] of fixtures){
 console.log('New boss browser',width,id);
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(30000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const hook=scope.hook.replace('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta',encodeMapCode(map));
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle+`\nwindow.newBossBattle=()=>battleUi.battle;window.newBossWin=()=>{if(!battleUi.presenting&&!battleUi.battle?.outcome){battleUi.battle.enemy.hp=1;battleUi.battle.enemy.maxHp=1;executeCommand({type:'skill',skillId:'fireball'});}};window.newBossEscape=attemptEscape;`}));
 await p.route('**/js/title-screen.js?*',r=>r.fulfill({contentType:'text/javascript',body:title+'\ntitleOpen=false;'}));
 await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4177');await p.waitForFunction(()=>window.newBossQa);
 await p.evaluate(()=>v2Qa.setup());await p.evaluate(c=>newBossQa.prepare(c),bossTestCharacter(100,'mage'));
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 for(let i=0;i<2;i++)await p.getByRole('button',{name:/の地図 Lv\.100/}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>newBossQa.boss());
 await p.waitForFunction(()=>newBossQa.active()&&document.querySelector('#battleEnemyImage')?.naturalWidth>0);
 await p.waitForFunction(()=>document.querySelector('#battleEnemyName')?.textContent.includes(' Lv.100'));
 assert.equal(await p.locator('#battleEnemyName').textContent(),boss.name+' Lv.100');
 assert.equal(await p.evaluate(()=>newBossBattle().enemy.id),id);
 const size=await p.locator('#battleEnemyImage').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,hsl:img.src.startsWith('data:'),rect:{x:img.getBoundingClientRect().x,width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height}}));
 assert.equal(size.width,id==='karte_boss_023'?900:600);assert.equal(size.height,600);assert.equal(size.hsl,true);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:`${output}/${id}-${width}.png`});
 // Check the actual escape command and production exploration callback, then retry the whale.
 if(id==='karte_boss_023'){
  await p.evaluate(()=>newBossEscape());
  for(let n=0;n<100&&await p.evaluate(()=>newBossQa.active());n++){await p.evaluate(()=>newBossQa.input('confirm'));await p.waitForTimeout(100);}
  await p.waitForFunction(()=>!newBossQa.active()&&!v2Qa.s().transitioning);
  assert.equal(await p.evaluate(()=>v2Qa.s().bossDefeated),false);
  assert.equal(await p.evaluate(()=>newBossQa.c().specialMaps.bossReward.status),'prepared');
  await p.evaluate(()=>newBossQa.boss());await p.waitForFunction(()=>newBossQa.active());
 }
 for(let n=0;n<160&&await p.evaluate(()=>newBossQa.active());n++){
  await p.evaluate(()=>{if(newBossBattle()?.outcome)newBossQa.input('confirm');else newBossWin();});await p.waitForTimeout(100);
 }
 await p.waitForFunction(()=>!newBossQa.active()&&v2Qa.s().bossDefeated&&!v2Qa.s().transitioning);
 assert.equal(await p.evaluate(()=>newBossQa.c().specialMaps.bossReward.status),'pending');
 await p.evaluate(()=>v2Qa.input('confirm'));await p.waitForFunction(()=>v2Qa.s().currentFloor===0&&!v2Qa.s().transitioning);
 assert.deepEqual(errors,[]);results.push({id,width,seed:map.seed,size,victory:true,pendingReward:true,portal:true,escape:id==='karte_boss_023',fixture:'Lv100 mage with Aries; real stats for display, HP1 for shortened victory; direct B3F, surveyed map'});
 await p.close();
}}catch(error){for(const c of browser.contexts())for(const p of c.pages()){await p.screenshot({path:`output-failure.png`});await writeFile(`${output}/failure.txt`,await p.locator('body').innerText());}throw error;}
finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify(results,null,2)+'\n');}
