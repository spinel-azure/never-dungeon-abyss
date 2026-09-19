import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const main=await readFile('js/main.js','utf8'),town=await readFile('js/town.js','utf8');
await mkdir('artifacts/b1-survey-99',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [layout,width,height] of [['pc',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/main.js?*',r=>r.fulfill({contentType:'text/javascript',body:main.replace('  document.documentElement.dataset.ndaMainReady = "true";',`window.surveyQA={set:c=>{character=c;document.querySelector('#titleScreen').hidden=true;document.body.classList.remove('title-active');updateCharacterUi();},town:()=>openTown({facilityId:'guild',mode:'facilityMenu'})};\n  document.documentElement.dataset.ndaMainReady = "true";`)}));
 await page.route('**/js/town.js',r=>r.fulfill({contentType:'text/javascript',body:town+`\nwindow.surveyGuild=()=>{openGuildQuestList('report');town.questIndex=QUESTS.findIndex(q=>q.id==='guild_003_b1f_survey');activateSelectedQuest();};`}));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.surveyQA);
 await page.evaluate(async()=>{const q=await import('/data/quests.js'),c=await import('/data/classes.js');let hero=q.acceptQuest(c.createInitialCharacter({name:'調査確認',job:'warrior'}),q.FLOOR_SURVEY_QUEST_ID).character;hero.quests.active[q.FLOOR_SURVEY_QUEST_ID].progress=99;surveyQA.set(c.normalizeCharacter(JSON.parse(JSON.stringify(hero))));const menu=await import('/js/menu.js');menu.openStatusMenu();for(let i=0;i<3;i++)document.querySelector('[data-status-nav="next"]').click();});
 let text=await page.locator('[data-status-quest-content]').textContent();assert.match(text,/99[／/]99/);assert.match(text,/B1Fを99マス踏破する/);assert.match(text,/報告可能/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.screenshot({path:`artifacts/b1-survey-99/${layout}-status.png`});
 await page.evaluate(async()=>{const menu=await import('/js/menu.js');menu.closeCampMenu();surveyQA.town();surveyGuild();});
 text=await page.locator('#guildQuestDetail').textContent();assert.match(text,/99[／/]99/);assert.match(text,/B1Fを99マス踏破する/);
 await page.screenshot({path:`artifacts/b1-survey-99/${layout}-guild.png`});assert.deepEqual(errors,[]);console.log(`${layout}: legacy save 99/99, reportable status and guild objective verified`);await page.close();
}}finally{await browser.close();}
