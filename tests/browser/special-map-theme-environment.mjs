import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';import vm from 'node:vm';import assert from 'node:assert/strict';
import {encodeMapCode} from '../../data/special-map-code.js';
import {generateSpecialMapV2} from '../../js/special-map/generator-v2.js';
import {bossTestCharacter} from '../../tools/simulate-map-bosses.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),output='artifacts/tent-reward-ui';await mkdir(output,{recursive:true});
const previous=await readFile('tests/browser/special-map-v2-f1-outcomes.mjs','utf8'),scope={};vm.runInNewContext(previous.slice(previous.indexOf('const baseHook='),previous.indexOf('\nconst main='))+';this.hook=baseHook;',scope);
const maps=new Map();for(let seed=0;maps.size<4;seed++){const m={rulesetVersion:'special-map-v2',seed,level:50,rarity:'WHITE',discovererName:'QA'},theme=generateSpecialMapV2({...m,ruleset:m.rulesetVersion}).themeId;if(['red','blue','crystal','black'].includes(theme)&&!maps.has(theme))maps.set(theme,m);}
const extra=`window.envQa={c:()=>character,cues:[],
 prepare(c){const maps=character.specialMaps;maps.starterMapsTestGranted=true;maps.registered[0].surveyedMasks=Array(3).fill('f'.repeat(25));character={...c,specialMaps:maps,lootBagTutorialSeen:true,eventFlags:{...c.eventFlags,treliren_met:true},crystalFloorStepCount:2};character.cards.deckSlots=[];character.equipment.footId=null;character.equippedInstanceIds.footId=null;character.inventory.counts.guiding_torch=5;updateCharacterUi();saveGame();},
 normal:()=>JSON.stringify({currentDepth,cells,explored,torch:state.torchFuel,presence:getPresence(),crystal:character.crystalFloorStepCount}),
 async steps(n){const s=v2Qa.s();s.onEncounterStep=()=>false;s.cellPrompt=null;s.renderState.overlayEvent=null;
 const dirs=['N','E','S','W'],dx=[0,1,0,-1],dy=[-1,0,1,0];let from,dir;
 const event=p=>[s.generatedMap.stairsUp,s.generatedMap.stairsDown,s.generatedMap.keyChest,s.generatedMap.bossRoom?.bossCell].some(q=>q&&p.x===q.x&&p.y===q.y);
 for(const row of s.cells)for(const p of row)for(let d=0;d<4;d++){const q={x:p.x+dx[d],y:p.y+dy[d]};if(q.x>=0&&q.x<10&&q.y>=0&&q.y<10&&!p.walls[dirs[d]]&&!s.isDoorLocked(p.x,p.y,dirs[d])&&!event(p)&&!event(q)){from=p;dir=d;break;}}
 s.playerX=from.x;s.playerY=from.y;s.renderState.x=from.x+.5;s.renderState.y=from.y+.5;
 for(let i=0;i<n;i++){s.direction=i%2?(dir+2)%4:dir;s.renderState.angle=s.direction*Math.PI/2-Math.PI/2;v2Qa.input('up');await v2Qa.settled();}
 },
 boot(id){character.equipment.footId=id;character.equippedInstanceIds.footId=null;},
 light(){character.keyItems.owned.lichtbringer=true;},
 torch:()=>useFieldItem('guiding_torch'),
 async stairs(kind){const s=v2Qa.s();s.onEncounterStep=()=>false;s.motion=null;s.transitioning=false;s.cellPrompt=null;s.renderState.overlayEvent=null;
 s.currentFloor=kind==='up'?1:0;const p=kind==='down'?s.generatedMap.stairsDown:s.generatedMap.stairsUp;
 s.playerX=p.x;s.playerY=p.y;s.renderState.x=p.x+.5;s.renderState.y=p.y+.5;},
 async pending(){const {prepareMapBossReward,confirmMapBossVictory}=await import('/data/special-map-rewards.js');const {mapContentId,mapOriginalId}=await import('/data/special-maps.js');const m=character.specialMaps.registered[0];
 const c={source:'special-map-v2-boss',themeId:'red',mapKey:mapOriginalId(m),contentId:mapContentId(m),mapSeed:m.seed,mapLevel:m.level,rarity:m.rarity,expeditionId:crypto.randomUUID(),battleUuid:crypto.randomUUID()};
 character.specialMaps=confirmMapBossVictory(prepareMapBossReward(character.specialMaps,c,{random:()=>.5}).state,c).state;saveGame();},
 failSave(on){if(!this.realSet)this.realSet=Storage.prototype.setItem;const original=this.realSet;Storage.prototype.setItem=on?function(k,v){if(k==='nda.save.slot1.current')throw Error('QA quota');return original.call(this,k,v);}:original;}
};`;
const main=(await readFile('js/main.js','utf8')).replace('if(playSound) playSe(important ? "importantItem" : "itemGet");','if(playSound){window.envQa.cues.push("jingle-start");playSe(important ? "importantItem" : "itemGet");}').replace("showNamedItemGetEffect(['未鑑定地図'],","window.envQa.cues.push('popup');showNamedItemGetEffect(['未鑑定地図'],");
const title=await readFile('js/title-screen.js','utf8'),browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
async function page(width,map){const p=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const hook=scope.hook.replace('NDA:AgIwOTIBAyAgMOsw65QoofYQw8Ta',encodeMapCode(map));
 await p.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+extra+' document.documentElement.dataset.ndaMainReady = "true";')}));
 await p.route('**/js/title-screen.js?*',r=>r.fulfill({contentType:'text/javascript',body:title+'\ntitleOpen=false;'}));await p.goto(process.env.NDA_QA_URL||'http://127.0.0.1:4177');await p.waitForFunction(()=>window.envQa);await p.evaluate(()=>v2Qa.setup());await p.evaluate(c=>envQa.prepare(c),bossTestCharacter(50,'mage'));return {p,errors};}
try{for(const width of [1280,390]){
 for(const [theme,map] of maps){console.log('Environment',width,theme);const {p,errors}=await page(width,map);
 const normal=await p.evaluate(()=>envQa.normal());
 await p.locator('[data-entrance-command="mapExploration"]').dispatchEvent('click');for(let i=0;i<2;i++)await p.getByRole('button',{name:/の地図 Lv\.50/}).click();
 await p.getByRole('button',{name:'探索する（A）',exact:true}).click();await p.getByRole('button',{name:'はい（A／ENTER）',exact:true}).click();await p.waitForFunction(()=>v2Qa.s()&&!v2Qa.s().transitioning);
 const before=await p.evaluate(()=>({hp:envQa.c().hp,sp:envQa.c().sp}));await p.evaluate(()=>envQa.steps(3));
 const after=await p.evaluate(()=>({hp:envQa.c().hp,sp:envQa.c().sp,torch:v2Qa.s().torchFuel}));
 assert.equal(after.hp,before.hp-(['red','blue'].includes(theme)?3:0));assert.equal(after.sp,before.sp-(theme==='crystal'?1:0));
 if(['red','blue'].includes(theme)){await p.evaluate(id=>envQa.boot(id),theme==='red'?'fireproof_boots':'coldproof_boots');await p.evaluate(()=>envQa.steps(2));assert.equal(await p.evaluate(()=>envQa.c().hp),after.hp);}
 if(theme==='black'){
  assert.equal(after.torch,0);const count=await p.evaluate(()=>envQa.c().inventory.counts.guiding_torch);await p.evaluate(()=>envQa.torch());assert.equal(await p.evaluate(()=>envQa.c().inventory.counts.guiding_torch),count);
  await p.evaluate(()=>envQa.light());await p.waitForTimeout(50);await p.evaluate(()=>envQa.torch());assert.equal(await p.evaluate(()=>v2Qa.s().torchFuel),100);
 }
 assert.equal(await p.evaluate(()=>envQa.normal()),normal);
 if(theme==='red')for(const [kind,file] of [['exit','exit'],['up','up_stairs'],['down','down_stairs']]){
  await p.evaluate(kind=>envQa.stairs(kind),kind);const img=p.locator('.special-map-stair-image');await img.waitFor({state:'visible'});await p.waitForFunction(file=>{const image=document.querySelector('.special-map-stair-image');return image?.getAttribute('src')==='images/dungeon_effects/'+file+'.avif'&&image.complete&&image.naturalWidth>0;},file);
  assert.match(await img.getAttribute('src'),new RegExp('/'+file+'\\.avif$'));
  const bounds=await img.boundingBox(),canvas=await p.locator('.special-map-view').boundingBox();assert.ok(bounds.width>=canvas.width*.7&&bounds.height>=canvas.height*.75);
  assert.ok(Math.abs(bounds.x+bounds.width/2-canvas.x-canvas.width/2)<2);
  await p.screenshot({path:`${output}/${width}-${kind}.png`});
  await p.evaluate(()=>v2Qa.input('map'));await img.waitFor({state:'hidden'});await p.evaluate(()=>v2Qa.input('map'));await img.waitFor({state:'visible'});
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({width,theme,before,after,ordinaryStateUnchanged:true});await p.close();
 }
 console.log('Receipt',width);const {p,errors}=await page(width,maps.get('red'));await p.evaluate(()=>envQa.pending());
 await p.locator('[data-entrance-command="explorerTent"]').dispatchEvent('click');
 const receive=p.getByRole('button',{name:'討伐報酬受領',exact:true});
 assert.equal(await p.getByRole('button',{name:'調査報告',exact:true}).isDisabled(),true);
 assert.equal(await receive.isEnabled(),true);
 await p.screenshot({path:output+'/'+width+'-tent-pending.png'});
 await p.evaluate(()=>envQa.failSave(true));await receive.dispatchEvent('click');assert.deepEqual(await p.evaluate(()=>envQa.cues),[]);assert.equal(await p.evaluate(()=>envQa.c().specialMaps.bossReward.status),'pending');
 await p.evaluate(()=>envQa.failSave(false));if(width===390)await receive.tap();else await receive.dispatchEvent('click');
 await p.locator('#itemGetEffect:not([hidden]) .item-get-image').waitFor({state:'visible'});
 assert.match(await p.locator('#itemGetEffect .item-get-image').getAttribute('src'),/unidentified_map.avif$/);
 assert.deepEqual(await p.evaluate(()=>envQa.cues),['popup','jingle-start']);assert.equal(await p.evaluate(()=>envQa.c().specialMaps.unidentified.length),1);assert.equal(await receive.isDisabled(),true);
 await p.waitForTimeout(1100);await p.screenshot({path:`${output}/${width}-receipt.png`});
 await p.getByRole('button',{name:'戻る',exact:true}).dispatchEvent('click');assert.equal(await p.evaluate(()=>envQa.c().specialMaps.unidentified.length),1);
 await p.waitForFunction(()=>document.querySelector('#itemGetEffect').hidden);await p.waitForTimeout(100);
 assert.deepEqual(errors,[]);results.push({width,receipt:true,saveFailureNoAnimation:true,jingleWithPopup:true});await p.close();
}}catch(error){for(const c of browser.contexts())for(const p of c.pages()){await p.screenshot({path:`${output}/failure.png`});await writeFile(`${output}/failure.txt`,await p.locator('body').innerText());}throw error;}
finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify(results,null,2)+'\n');}
