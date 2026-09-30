import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8');
const output=await mkdtemp(join(tmpdir(),'nda-guild-exp-'));
const hook=`window.guildExpQa={setup(ids=[],experience=0){
 document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');closeTown();saveEnabled=false;
 character=createInitialCharacter({name:'依頼経験値',job:'warrior'});character.gold=10000;
 character.quests.completedQuestIds=ids;character.experience=experience;
 character.eventFlags={guild_first_request_unlocked:true,inn_visited:true};worldLocation='town';
 setBgmOptions({enabled:false});setSeOptions({enabled:false});setTownTypewriterOptions({enabled:false});updateCharacterUi();
},read:()=>character,snapshot:makeSaveSnapshot,restore:restoreGame,
inn:()=>{openTown({facilityId:'inn',mode:'facilityMenu'});void stayAtInn({fee:1})},
input:dispatchGamepadAction,ready(id){character.quests.active[id]={progress:999};}};`;
const ui=`window.guildExpUi={ids:QUESTS.map(q=>q.id),open(){openTown({facilityId:'guild',mode:'facilityMenu'})},next(){handleTownInput('confirm')},
 read(){return {text:town.messageEl.textContent,compact:town.compactTalk?{pages:town.compactTalk.pages,index:town.compactTalk.index}:null,overflow:town.messageEl.scrollHeight-town.messageEl.clientHeight}},
 detail(id){openGuildQuestList('accept');town.mode='questAcceptDetail';const q=QUESTS.find(q=>q.id===id);renderQuestDetail(q,getQuestProgress(town.getCharacter(),id));return {text:town.guildQuestDetail.textContent,overflow:town.guildQuestDetail.scrollWidth-town.guildQuestDetail.clientWidth}},
 report(id){town.questIndex=QUESTS.findIndex(q=>q.id===id);town.mode='questReportConfirm';handleQuestInput('confirm')}};`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [label,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>navigator.getGamepads=()=>[]);
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',hook+'\n document.documentElement.dataset.ndaMainReady="true";')}));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:town+'\n'+ui}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.guildExpQa&&window.guildExpUi);
 await page.evaluate(()=>{guildExpQa.setup(guildExpUi.ids);guildExpUi.open()});
 assert.equal(await page.evaluate(()=>guildExpQa.read().guildExperiencePool),456460);
 assert.equal(await page.evaluate(()=>guildExpQa.read().level),1);
 let notice=await page.evaluate(()=>guildExpUi.read());assert.match(notice.compact.pages.join(''),/33件分/);assert.match(notice.compact.pages.join(''),/456,460EXP/);
 for(let i=0;i<notice.compact.pages.length;i++){
  assert.ok((await page.evaluate(()=>guildExpUi.read())).overflow<=1);
  await page.screenshot({path:join(output,`${label}-compensation-${i}.png`)});await page.evaluate(()=>guildExpUi.next());
 }
 await page.evaluate(()=>guildExpUi.open());assert.equal((await page.evaluate(()=>guildExpUi.read())).compact,null);
 const snapshot=await page.evaluate(()=>guildExpQa.snapshot());await page.reload();await page.waitForFunction(()=>window.guildExpQa);
 await page.evaluate(s=>{document.querySelector("#titleScreen").hidden=true;document.body.classList.remove("title-active");guildExpQa.restore(s)},snapshot);await page.evaluate(()=>guildExpUi.open());
 assert.equal(await page.evaluate(()=>guildExpQa.read().guildExperiencePool),456460);assert.equal((await page.evaluate(()=>guildExpUi.read())).compact,null);
 for(const id of await page.evaluate(()=>guildExpUi.ids)){
  const d=await page.evaluate(id=>guildExpUi.detail(id),id);assert.equal(await page.locator('#guildQuestDetail').isVisible(),true);assert.match(d.text,/EXP/);assert.ok(d.overflow<=1);
  if(id==='guild_035')await page.screenshot({path:join(output,label+'-detail035.png')});
 }
 await page.evaluate(()=>{guildExpQa.setup(['guild_001_abyss_rat']);guildExpUi.open()});
 notice=await page.evaluate(()=>guildExpUi.read());for(let i=0;i<notice.compact.pages.length;i++)await page.evaluate(()=>guildExpUi.next());
 await page.evaluate(()=>{guildExpQa.ready('guild_002_cave_slime');guildExpUi.report('guild_002_cave_slime')});
 assert.equal(await page.evaluate(()=>guildExpQa.read().guildExperiencePool),50);
 notice=await page.evaluate(()=>guildExpUi.read());assert.match(notice.compact.pages.join(''),/30EXP/);
 for(let i=0;i<notice.compact.pages.length;i++)await page.evaluate(()=>guildExpUi.next());
 await page.waitForTimeout(3600);
 await page.evaluate(()=>guildExpQa.inn());await page.locator('#experienceSettlementOverlay').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#experienceSettlementDetail').textContent(),/50/);
 await page.evaluate(()=>guildExpQa.input('confirm'));await page.locator('#levelUpEffect').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>guildExpQa.read().guildExperiencePool),0);assert.ok(await page.evaluate(()=>guildExpQa.read().level>1));
 assert.equal(await page.locator('.is-npc-management').count(),0);
 await page.waitForTimeout(5000);
 await page.evaluate(()=>{guildExpQa.setup(['guild_001_abyss_rat'],9999999);guildExpUi.open()});
 notice=await page.evaluate(()=>guildExpUi.read());assert.match(notice.compact.pages.join(''),/規定報酬20EXP/);assert.match(notice.compact.pages.join(''),/0EXPを/);
 assert.equal(await page.evaluate(()=>guildExpQa.read().quests.experienceRewardQuestIds.length),1);
 assert.deepEqual(errors,[]);await page.close();console.log(label+' passed');
}}finally{await browser.close()}console.log(output);
