import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const old=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8');
const scope={};vm.runInNewContext(old.slice(old.indexOf('const baseHook='),old.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const extra=`window.polishQa={
 c:()=>character,active:isBattleActive, input:handleBattleInput,
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),carried:character.carriedExperience,pending:character.pendingExperienceSettlement,bag:character.lootBag}),
 async chest(){const s=v2Qa.s(),m=await import('/js/special-map/session-v2.js');m.switchV2Floor(s,s.blueprint.links[1].lower);s.renderState.overlayEvent=null;const p=s.generatedMap.keyChest;s.playerX=p.x;s.playerY=p.y;m.beginV2CellPrompt(s);},
 async fight(){const s=v2Qa.s();s.cellPrompt=null;s.renderState.overlayEvent=null;s.level=60;
 const {getEnemyById}=await import('/data/enemies.js');const e=getEnemyById(s.ecology.floors[s.currentFloor].species[0].id);
 const context={source:'special-map-v2',sessionId:s.encounterSessionId,battleId:++s.encounterSequence,mapKey:s.mapKey};s.battleContext=context;s.transitioning=true;
 character.hp=9999;character.maxHp=9999;setBattleSpeedMode('fast');await beginV2Battle(s,{...e,maxHp:1,def:0,attack:1,stats:{...e.stats,AGI:1},actions:[],specialAttack:null,experienceReward:1000,dropGold:20,fixedGoldPerDefeat:true},context);},
 return:()=>getSpecialMapContext().finish(),
 failSave(){this.saved=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('QA storage failure');};},
 restoreSave(){Storage.prototype.setItem=this.saved;},
 protect(){character.carriedExperience=777;character.pendingExperienceSettlement={sentinel:true};character.lootBag={gold:123,items:{},cards:{},equipmentInstances:[]};}
};`;
const main=await readFile('js/main.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
await mkdir('artifacts/special-map-return-polish',{recursive:true});
try{for(const width of [1280,390]){
 const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(45000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',scope.hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/title-screen.js?*',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('js/title-screen.js','utf8'))+'\ntitleOpen=false;'}));
 await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>window.polishQa);await p.evaluate(()=>v2Qa.setup());
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');
 for(let i=0;i<2;i++)await p.getByRole('button',{name:/荒れ果てた晶宮の地図 Lv.50/}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();
 await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);await p.evaluate(()=>{v2Qa.input('confirm');polishQa.protect();});
 const normal=await p.evaluate(()=>polishQa.normal());
 await p.evaluate(()=>v2Qa.input('map'));await p.waitForTimeout(200);
 assert.match(await p.locator('#specialSurveyChip').evaluate(e=>getComputedStyle(e).fontFamily),/GameFont/);
 await p.screenshot({path:'artifacts/special-map-return-polish/map-'+width+'.png'});
 await p.evaluate(()=>{v2Qa.input('map');return polishQa.chest();});
 await p.waitForFunction(()=>document.querySelector('#treasureCanvas').style.visibility==='visible');await p.waitForTimeout(1200);
 await p.screenshot({path:'artifacts/special-map-return-polish/chest-'+width+'.png'});
 await p.evaluate(()=>v2Qa.input('cancel'));await p.waitForFunction(()=>document.querySelector('#treasureCanvas').style.visibility==='hidden');
 await p.evaluate(()=>v2Qa.input('confirm'));assert.equal(await p.evaluate(()=>v2Qa.s().bossKeyFound),false);
 await p.waitForFunction(()=>v2Qa.s().bossKeyFound);
 const exp=await p.evaluate(()=>polishQa.c().experience),gold=await p.evaluate(()=>polishQa.c().gold);
 await p.evaluate(()=>polishQa.fight());
 for(let i=0;i<120&&await p.evaluate(()=>polishQa.active());i++){await p.evaluate(()=>polishQa.input('confirm'));await p.waitForTimeout(200);}
 await p.waitForFunction(()=>!polishQa.active()&&!v2Qa.s().transitioning);
 assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),1000);assert.equal(await p.evaluate(()=>polishQa.c().experience),exp);
 assert.equal(await p.evaluate(()=>polishQa.c().gold),gold);
 await p.evaluate(()=>polishQa.failSave());assert.equal(await p.evaluate(()=>polishQa.return()),false);
 assert.equal(await p.evaluate(()=>v2Qa.s().battleExperience),1000);assert.equal(await p.evaluate(()=>polishQa.c().experience),exp);
 await p.evaluate(()=>polishQa.restoreSave());assert.equal(await p.evaluate(()=>polishQa.return()),true);
 await p.waitForFunction(()=>!document.querySelector('#lootIdentifyOverlay').hidden);
 await p.screenshot({path:'artifacts/special-map-return-polish/loot-'+width+'.png'});
 for(let i=0;i<40&&!await p.locator('#experienceSettlementOverlay').isVisible();i++){await p.locator('#lootIdentifyAction').dispatchEvent('click');await p.waitForTimeout(300);}
 await p.locator('#experienceSettlementOverlay').waitFor({state:'visible'});
 assert.match(await p.locator('#experienceSettlementDetail').textContent(),/地図Lvボーナス.*30％/);
 assert.match(await p.locator('#experienceSettlementDetail').textContent(),/1,300/);
 assert.equal(await p.evaluate(()=>polishQa.c().experience),exp+1300);assert.equal(await p.evaluate(()=>polishQa.c().gold),gold+20);
 assert.equal(await p.evaluate(()=>polishQa.normal()),normal);
 await p.screenshot({path:'artifacts/special-map-return-polish/settlement-'+width+'.png'});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);results.push({width,clonedBattleVictory:true,saveRetry:true,settlement:1300,lotGold:20,chestPreview:true,normalPreserved:true});await p.close();
}}finally{await browser.close();await writeFile('artifacts/special-map-return-polish/browser.json',JSON.stringify(results,null,2));}
