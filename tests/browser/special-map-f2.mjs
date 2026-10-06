import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {F2_MAP_FIXTURES} from '../fixtures/special-map-f2.mjs';
import {f2Character} from '../../tools/simulate-special-map-f2.mjs';
import {getV2CombatEnemy} from '../../data/special-map-enemies.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=join(tmpdir(),'nda-f2-browser');await mkdir(output,{recursive:true});
const old=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};
vm.runInNewContext(old.slice(old.indexOf('const baseHook='),old.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const extra=`window.f2Qa={
 input:handleBattleInput,active:isBattleActive,
 c:()=>character,
 prepare(c){const maps=character.specialMaps;character={...c,specialMaps:maps};character.carriedExperience=777;character.pendingExperienceSettlement={sentinel:true};character.lootBag={gold:888,items:{},cards:{},equipmentInstances:[]};updateCharacterUi();setBattleSpeedMode('fast');},
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),carried:character.carriedExperience,pending:character.pendingExperienceSettlement,loot:character.lootBag}),
 snapshot(){const s=v2Qa.s();return JSON.stringify({floor:s.currentFloor,x:s.playerX,y:s.playerY,dir:s.direction,torch:s.torchFuel,survey:s.surveyedMasks,key:s.bossKeyFound,unlock:s.bossDoorUnlocked,doors:[...s.openedDoors]});},
 async encounter(id,floor){
  const s=v2Qa.s();s.cellPrompt=null;s.renderState.overlayEvent=null;s.currentFloor=floor;
  const {isV2EncounterCell,attachV2Encounters}=await import('/js/special-map/encounter-v2.js');
  for(let i=0;i<100;i++){s.playerX=i%10;s.playerY=Math.floor(i/10);if(isV2EncounterCell(s))break;}
  const pool=s.ecology.floors[floor].species,index=pool.findIndex(row=>row.id===id);if(index<0)throw Error('not in ecology');
  const roll=(pool.slice(0,index).reduce((sum,row)=>sum+row.weight,0)+.5)/10000;
  this.roll=roll;if(!s.f2Injected){attachV2Encounters(s,{random:()=>this.roll,onEncounter:beginV2Battle});s.f2Injected=true;}s.presence=99;
  if(!s.onEncounterStep())throw Error('encounter held');
 },
 heal(){character.hp=character.maxHp;character.sp=character.maxSp;},
 return:()=>getSpecialMapContext().finish(),
 failSave(){this.save=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('F2 save failure');};},
 restoreSave(){Storage.prototype.setItem=this.save;}
};`;
const main=(await readFile('js/main.js','utf8')).replace('  async function finishV2Battle(battle,outcome){','  async function finishV2Battle(battle,outcome){ window.f2LastBattle=structuredClone(battle);'),battle=await readFile('js/battle.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{for(const width of [1280,390])for(const f of F2_MAP_FIXTURES){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const hook=scope.hook.replace('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta',f.code);
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/battle.js*',r=>r.fulfill({contentType:'text/javascript',body:battle+'\nwindow.f2Battle=()=>structuredClone(battleUi.battle);'}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4173');await p.waitForFunction(()=>window.f2Qa);await p.evaluate(()=>v2Qa.setup());
 await p.evaluate(c=>f2Qa.prepare(c),f2Character(f.id));
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 for(let i=0;i<2;i++)await p.getByRole('button',{name:new RegExp(f.name)}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>v2Qa.input('confirm'));
 const normal=await p.evaluate(()=>f2Qa.normal()),initial=await p.evaluate(()=>({exp:f2Qa.c().experience,gold:f2Qa.c().gold})),definition=getV2CombatEnemy(f.id),turns=[];
 for(let n=0;n<3;n++){
  await p.evaluate(({id,floor})=>{f2Qa.heal();return f2Qa.encounter(id,floor);},{id:f.id,floor:n});
  await p.waitForFunction(()=>f2Qa.active());await p.waitForTimeout(800);
  const state=await p.evaluate(()=>f2Battle());assert.equal(state.enemy.id,f.id);assert.equal(state.enemy.hp,definition.maxHp);assert.deepEqual(state.enemy.statuses,[]);assert.equal(state.enemy.isBoss,false);
  assert.equal(state.explorationContext.floorIndex,n);const snapshot=await p.evaluate(()=>f2Qa.snapshot());
  await p.waitForFunction(()=>document.querySelector('#battleEnemyImage')?.naturalWidth===400);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:join(output,`${f.id}-${width}-${n}.png`)});
  for(let i=0;i<400&&await p.evaluate(()=>f2Qa.active());i++){await p.evaluate(()=>f2Qa.input('confirm'));await p.waitForTimeout(150);}
  await p.waitForFunction(()=>!f2Qa.active()&&!v2Qa.s().transitioning);
  const finished=await p.evaluate(()=>f2LastBattle);turns.push(finished.turn||finished.turnCount||null);
  assert.equal(await p.evaluate(()=>f2Qa.snapshot()),snapshot);assert.equal(await p.evaluate(()=>f2Qa.normal()),normal);
  assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),(n+1)*definition.experienceReward);
  assert.equal(await p.evaluate(()=>v2Qa.s().lootBag.gold),(n+1)*definition.dropGold);
  assert.equal(await p.evaluate(()=>f2Qa.c().experience),initial.exp);assert.equal(await p.evaluate(()=>f2Qa.c().gold),initial.gold);
  await p.waitForFunction(()=>!document.querySelector('#specialSurveyChip').hidden&&document.querySelector('#specialSurveyChip').textContent.includes('\n総合'));
  assert.match(await p.locator('#specialSurveyChip').evaluate(e=>getComputedStyle(e).fontFamily),/GameFont/);
  assert.equal(await p.evaluate(()=>v2Qa.s().battleContext),null);
  await p.screenshot({path:join(output,`${f.id}-${width}-${n}-resume.png`)});
 }
 // A real player escape uses the same completion callback but awards nothing.
 await p.evaluate(id=>{f2Qa.heal();return f2Qa.encounter(id,2);},f.id);await p.waitForFunction(()=>f2Qa.active());const position=await p.evaluate(()=>f2Qa.snapshot());
 for(let i=0;i<150&&await p.evaluate(()=>f2Qa.active());i++){
  const b=p.locator('[data-battle-command="escape"]');if(await b.isVisible())await b.dispatchEvent('click');await p.evaluate(()=>f2Qa.input('confirm'));await p.waitForTimeout(180);
 }
 await p.waitForFunction(()=>!f2Qa.active()&&!v2Qa.s().transitioning);assert.equal(await p.evaluate(()=>f2Qa.snapshot()),position);
 assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),3*definition.experienceReward);
 await p.evaluate(()=>f2Qa.failSave());assert.equal(await p.evaluate(()=>f2Qa.return()),false);assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),3*definition.experienceReward);
 await p.evaluate(()=>f2Qa.restoreSave());assert.equal(await p.evaluate(()=>f2Qa.return()),true);
 assert.equal(await p.evaluate(()=>f2Qa.c().experience),initial.exp+3*definition.experienceReward+Math.floor(3*definition.experienceReward*f.level/200));
 assert.equal(await p.evaluate(()=>f2Qa.c().gold),initial.gold+3*definition.dropGold);assert.equal(await p.evaluate(()=>f2Qa.normal()),normal);assert.deepEqual(errors,[]);
 results.push({width,id:f.id,victories:3,turns,escape:true,saveRetry:true,poolExperience:3*definition.experienceReward,gold:3*definition.dropGold,normalUnchanged:true});console.log(results.at(-1));await p.close();
}}finally{await browser.close();await writeFile(join(output,'results.json'),JSON.stringify(results,null,2));console.log(output);}
